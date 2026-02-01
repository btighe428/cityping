// src/app/api/jobs/send-daily-pulse/route.ts
/**
 * Daily "NYC Today" Email Job
 *
 * Delivers the morning briefing at 7am ET weekdays.
 * 60-second scan: What matters today, don't miss, tonight, look ahead.
 *
 * Schedule: 0 12 * * 1-5 (weekdays at 12:00 UTC = 7am ET)
 *
 * Features:
 * - Weather-integrated Look Ahead with real NWS forecasts
 * - Event curation with quality filtering (no random health outreach)
 * - Smart description truncation at word boundaries
 * - Module-based event prioritization
 * - Optional orchestrator-enhanced mode with AI curation
 * - FREQUENCY CAP: Skips if daily digest already sent to user
 * - SMART BATCHING: Only sends urgent content to avoid duplication
 *
 * Query parameters:
 * - useOrchestrator=true: Use multi-agent pipeline for content selection
 * - force=true: Send even if daily digest was sent (for urgent alerts)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { nycToday, NYCTodayData, NYCTodayEvent, NYCTodayNewsItem } from "@/lib/email-templates-v2";
import { fetchNYCWeatherForecast } from "@/lib/weather";
import { JobMonitor } from "@/lib/job-monitor";
import { getCuratedNewsForDate } from "@/lib/news-curation";
import { DateTime } from "luxon";
import { orchestrateDigestV2 } from "@/lib/agents/agent-orchestrator";
import type { ContentSelectionV2, ScoredAlertEvent } from "@/lib/agents/types";
import { sendEmailTracked, acquireJobLock, releaseJobLock } from "@/lib/email-outbox";
import { checkEmailFrequencyCap, shouldSkipLowValueDigest } from "@/lib/frequency-cap";
import { MESSAGE_PRIORITY, BATCHING_CONFIG } from "@/lib/delivery-config";

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Event categories to EXCLUDE from "What Matters Today"
 * These are typically low-interest items that dilute the digest quality
 */
const EXCLUDED_EVENT_PATTERNS = [
  /mobile.*unit/i,
  /outreach.*collective/i,
  /tabling/i,
  /health.*screening/i,
  /blood.*drive/i,
  /voter.*registration/i,
  /census/i,
  /flu.*shot/i,
  /vaccine.*clinic/i,
  /covid.*test/i,
];

/**
 * Low-severity transit alert patterns to exclude
 * These create noise without actionable information
 */
const LOW_SEVERITY_TRANSIT_PATTERNS = [
  /elevator.*out of service/i,
  /elevator.*maintenance/i,
  /escalator.*out of service/i,
  /street elevator/i,
  /ada.*elevator/i,
  /board.*front.*train/i,
  /board.*rear.*train/i,
  /exit.*front.*train/i,
  /exit.*rear.*train/i,
  /trains.*run.*slow/i,
  /expect.*delays?\s*\d+\s*min/i,  // Only "expect minor delays" not specific delays
  /minor.*delays?/i,
  /slight.*delays?/i,
];

/**
 * High-priority modules that should appear first in "What Matters Today"
 */
const PRIORITY_MODULES = ["transit", "parking", "weather"];

/**
 * Module display names and icons for better presentation
 */
const MODULE_DISPLAY: Record<string, { icon: string; name: string }> = {
  transit: { icon: "🚇", name: "Transit" },
  parking: { icon: "🚗", name: "Parking" },
  events: { icon: "🎭", name: "Events" },
  housing: { icon: "🏠", name: "Housing" },
  food: { icon: "🍽️", name: "Food" },
  deals: { icon: "💰", name: "Deals" },
  weather: { icon: "🌤️", name: "Weather" },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Smart truncation that respects word boundaries
 * Avoids cutting words mid-way like "Grand Army Plaza Safety Zone Wes..."
 */
function smartTruncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;

  // Find last space before maxLength
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  // If we found a space, truncate there; otherwise truncate at maxLength
  const cutPoint = lastSpace > maxLength * 0.6 ? lastSpace : maxLength;
  return text.slice(0, cutPoint).trim() + "…";
}

/**
 * Check if an event should be excluded based on title/body patterns
 */
function shouldExcludeEvent(event: { title: string; body?: string | null; moduleId?: string }): boolean {
  const textToCheck = `${event.title} ${event.body || ""}`.toLowerCase();

  // Check general exclusion patterns
  if (EXCLUDED_EVENT_PATTERNS.some((pattern) => pattern.test(textToCheck))) {
    return true;
  }

  // Check transit-specific low-severity patterns
  if (event.moduleId === "transit") {
    if (LOW_SEVERITY_TRANSIT_PATTERNS.some((pattern) => pattern.test(textToCheck))) {
      return true;
    }
  }

  return false;
}

/**
 * Get weather emoji based on forecast text
 */
function getWeatherEmoji(forecast: string): string {
  const f = forecast.toLowerCase();
  if (f.includes("snow") || f.includes("flurries")) return "❄️";
  if (f.includes("thunder") || f.includes("storm")) return "⛈️";
  if (f.includes("rain") || f.includes("shower")) return "🌧️";
  if (f.includes("cloud") && f.includes("sun")) return "⛅";
  if (f.includes("cloud") || f.includes("overcast")) return "☁️";
  if (f.includes("fog") || f.includes("mist")) return "🌫️";
  if (f.includes("wind")) return "💨";
  if (f.includes("clear") || f.includes("sunny")) return "☀️";
  return "🌤️";
}

/**
 * Extract location from event body if present
 * Formats: "📍 Location: Details" or just returns the body
 */
function formatEventDescription(body: string | null | undefined, maxLength: number = 120): string | undefined {
  if (!body) return undefined;

  // If body contains location marker, format it nicely
  if (body.includes("📍")) {
    return smartTruncate(body, maxLength);
  }

  return smartTruncate(body, maxLength);
}

/**
 * Score an event for relevance (higher = more relevant)
 * Used to sort events within "What Matters Today"
 */
function scoreEvent(event: {
  title: string;
  source: { moduleId: string };
  hypeScore?: number | null;
  weatherScore?: number | null;
}): number {
  let score = 50; // Base score

  // Priority module bonus
  if (PRIORITY_MODULES.includes(event.source.moduleId)) {
    score += 30;
  }

  // Hype score bonus (for sample sales, events with urgency)
  if (event.hypeScore) {
    score += event.hypeScore * 0.3;
  }

  // Weather score adjustment
  if (event.weatherScore !== null && event.weatherScore !== undefined) {
    score += event.weatherScore * 10;
  }

  // Urgent keywords in title
  const urgentPatterns = [/delay/i, /suspend/i, /close/i, /cancel/i, /alert/i, /deadline/i];
  if (urgentPatterns.some((p) => p.test(event.title))) {
    score += 20;
  }

  return score;
}

// =============================================================================
// ORCHESTRATOR INTEGRATION
// =============================================================================

/**
 * Build NYC Today news items from orchestrator selection.
 * Maps the scored news articles to the email template format with categorization.
 */
function buildNewsFromOrchestrator(selection: ContentSelectionV2): NYCTodayNewsItem[] {
  return selection.news.slice(0, 5).map((article) => {
    // Determine news category based on content scores and category
    let category: NYCTodayNewsItem["category"] = "local";
    if (article.category === "breaking" || article.scores.impact >= 80) {
      category = "breaking";
    } else if (article.category === "essential" || article.scores.relevance >= 75) {
      category = "essential";
    } else if (article.category === "civic") {
      category = "civic";
    } else if (article.category === "culture") {
      category = "culture";
    }

    return {
      id: article.id,
      title: article.title,
      summary: article.summary ?? article.snippet?.slice(0, 200) ?? "",
      source: article.source,
      url: article.url,
      nycAngle: article.nycAngle ?? undefined,
      category,
    };
  });
}

/**
 * Extract module ID from sourceId.
 * AlertEvent.sourceId typically contains the module context.
 */
function getModuleFromSourceId(sourceId: string): string {
  // Source IDs are typically in format like "transit-mta", "food-samplesales", etc.
  const parts = sourceId.split("-");
  return parts[0] || "general";
}

/**
 * Determine if an alert should be considered "breaking" based on scores and content.
 */
function isBreakingAlert(alert: ScoredAlertEvent): boolean {
  const isHighImpact = alert.scores.overall >= 85;
  const isTransitCritical = /suspended|cancelled|significant|severe|emergency/i.test(alert.title);
  return isHighImpact || isTransitCritical;
}

/**
 * Run the full orchestrator-enhanced pulse generation.
 * Uses the multi-agent pipeline for content selection and curation.
 * Returns organized content: breaking, essentials (by module), news.
 */
async function runOrchestratorEnhancedPulse(
  nyNow: DateTime,
  weatherForecast: Awaited<ReturnType<typeof fetchNYCWeatherForecast>>
) {
  console.log("[Daily Pulse] Using orchestrator-enhanced content selection");

  const result = await orchestrateDigestV2({
    autoHeal: true,
    healingThreshold: 50,
    selection: {
      maxNews: 5,
      maxAlerts: 8, // Get more to allow for proper categorization
      maxDeals: 3,
      maxEvents: 4,
      minQualityScore: 40,
      lookbackHours: 24, // Only today's content
    },
    curation: {
      enabled: true,
      generateWhyCare: true,
    },
    skipSummarization: true, // We'll build our own email format
  });

  console.log(`[Daily Pulse] Orchestrator result: ${result.success ? "success" : "failed"}`);
  console.log(`[Daily Pulse] Selected: ${result.selection.summary.totalSelected} items (quality: ${result.selection.summary.averageQuality.toFixed(1)})`);

  if (result.errors.length > 0) {
    console.warn(`[Daily Pulse] Orchestrator errors: ${result.errors.map(e => e.message).join("; ")}`);
  }

  // Organize alerts by urgency and module
  const alerts = result.selection.alerts;
  
  // 1. Breaking: High impact alerts
  const breakingAlerts = alerts
    .filter((a) => isBreakingAlert(a))
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: formatEventDescription(a.body, 120),
      category: getModuleFromSourceId(a.sourceId),
      moduleId: getModuleFromSourceId(a.sourceId),
      isUrgent: true,
    }));

  // 2. Essentials: Grouped by module
  const nonBreakingAlerts = alerts.filter((a) => !breakingAlerts.find((b) => b.id === a.id));
  
  const transitAlerts = nonBreakingAlerts
    .filter((a) => getModuleFromSourceId(a.sourceId) === "transit")
    .slice(0, 4)
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: formatEventDescription(a.body, 100),
      category: "transit",
      moduleId: "transit" as const,
      isUrgent: a.scores.impact >= 70,
    }));

  const parkingAlerts = nonBreakingAlerts
    .filter((a) => getModuleFromSourceId(a.sourceId) === "parking")
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: formatEventDescription(a.body, 100),
      category: "parking",
      moduleId: "parking" as const,
      isUrgent: false,
    }));

  const otherAlerts = nonBreakingAlerts
    .filter((a) => !["transit", "parking"].includes(getModuleFromSourceId(a.sourceId)))
    .filter((a) => a.scores.overall >= 70)
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: formatEventDescription(a.body, 100),
      category: getModuleFromSourceId(a.sourceId),
      moduleId: getModuleFromSourceId(a.sourceId),
      isUrgent: a.scores.impact >= 75,
    }));

  return {
    news: buildNewsFromOrchestrator(result.selection),
    breaking: breakingAlerts,
    essentials: {
      transit: transitAlerts,
      parking: parkingAlerts,
      other: otherAlerts,
    },
    metrics: result.metrics,
    selection: result.selection,
  };
}

// =============================================================================
// CRON SECRET VERIFICATION
// =============================================================================

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }
  const xCronSecret = request.headers.get("x-cron-secret")?.trim();
  if (xCronSecret === cronSecret) return true;
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${cronSecret}`) return true;
  return false;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check for orchestrator mode and force mode
  const { searchParams } = new URL(request.url);
  const useOrchestrator = searchParams.get("useOrchestrator") === "true";
  const force = searchParams.get("force") === "true";

  // Acquire distributed lock to prevent concurrent runs
  const lockId = await acquireJobLock("send-daily-pulse", 60);
  if (!lockId) {
    console.log("[Daily Pulse] Another instance is already running, skipping");
    return NextResponse.json(
      { success: false, reason: "Another instance is already running" },
      { status: 429 }
    );
  }

  // Start job monitoring
  const jobMonitor = await JobMonitor.start("send-daily-pulse");

  try {
    const nyNow = DateTime.now().setZone("America/New_York");
    console.log(`[Daily Pulse] Starting for ${nyNow.toFormat("EEEE, MMMM d")}`);

    // Get all users
    const users = await prisma.user.findMany();
    console.log(`[Daily Pulse] Found ${users.length} users`);

    // Fetch today's date boundaries
    const todayStart = nyNow.startOf("day").toJSDate();
    const todayEnd = nyNow.endOf("day").toJSDate();
    
    // Use today's date for idempotency tracking
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ==========================================================================
    // FETCH DATA IN PARALLEL
    // ==========================================================================

    const [alertEvents, cityEvents, weatherForecast, curatedNews] = await Promise.all([
      // Alert events for today (only active, non-expired alerts)
      prisma.alertEvent.findMany({
        where: {
          AND: [
            {
              OR: [
                // Alerts that start today
                { startsAt: { gte: todayStart, lte: todayEnd } },
                // Alerts that started before today but haven't ended
                {
                  AND: [
                    { startsAt: { lt: todayStart } },
                    {
                      OR: [
                        { endsAt: { gte: todayStart } },
                        { endsAt: null },
                      ],
                    },
                  ],
                },
              ],
            },
            // Filter out expired alerts (ended before now)
            {
              OR: [
                { endsAt: null },
                { endsAt: { gte: nyNow.toJSDate() } },
              ],
            },
          ],
        },
        include: {
          source: { include: { module: true } },
        },
        orderBy: { startsAt: "asc" },
      }),

      // City events for today
      prisma.cityEvent.findMany({
        where: {
          status: { in: ["auto", "published"] },
          startsAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        orderBy: { insiderScore: "desc" },
        take: 20,
      }),

      // Weather forecast
      fetchNYCWeatherForecast(),

      // AI-curated news for today
      getCuratedNewsForDate(nyNow.toJSDate()),
    ]);

    console.log(`[Daily Pulse] Fetched ${alertEvents.length} alert events, ${cityEvents.length} city events`);
    console.log(`[Daily Pulse] Weather data: ${weatherForecast ? "OK" : "FAILED"}`);
    console.log(`[Daily Pulse] Curated news: ${curatedNews.length} stories`);

    // ==========================================================================
    // ORCHESTRATOR OR TRADITIONAL PATH
    // ==========================================================================

    let newsItems: NYCTodayNewsItem[];
    let breakingItems: NYCTodayEvent[] = [];
    let essentials: { transit: NYCTodayEvent[]; parking: NYCTodayEvent[]; other: NYCTodayEvent[] } = { transit: [], parking: [], other: [] };
    let orchestratorMetrics: { totalDuration: number; avgQuality: number } | undefined;
    let orchestratorResult: Awaited<ReturnType<typeof runOrchestratorEnhancedPulse>> | undefined;

    if (useOrchestrator) {
      // Use multi-agent pipeline for enhanced content selection
      orchestratorResult = await runOrchestratorEnhancedPulse(nyNow, weatherForecast);
      newsItems = orchestratorResult.news;
      breakingItems = orchestratorResult.breaking;
      essentials = orchestratorResult.essentials;
      orchestratorMetrics = {
        totalDuration: orchestratorResult.metrics.totalDuration,
        avgQuality: orchestratorResult.selection.summary.averageQuality,
      };

      console.log(`[Daily Pulse] Orchestrator enhanced: ${newsItems.length} news, ${breakingItems.length} breaking, ${essentials.transit.length} transit, ${essentials.parking.length} parking`);
    } else {
      // Traditional path: Use AI-curated news from getCuratedNewsForDate
      newsItems = curatedNews.map((article) => {
        // Categorize news items
        let category: NYCTodayNewsItem["category"] = "local";
        const text = `${article.title} ${article.summary}`.toLowerCase();
        if (/breaking|urgent|emergency/i.test(text)) category = "breaking";
        else if (/transit|mta|subway|delay/i.test(text)) category = "essential";
        else if (/mayor|council|vote|law|policy/i.test(text)) category = "civic";
        else if (/museum|concert|exhibit|festival/i.test(text)) category = "culture";

        return {
          id: article.id,
          title: article.title,
          summary: article.summary,
          nycAngle: article.nycAngle || undefined,
          source: article.source,
          url: article.url,
          category,
        };
      });
    }

    // ==========================================================================
    // PROCESS WEATHER DATA
    // ==========================================================================

    // Get today's weather for header
    const todayDateStr = nyNow.toISODate();
    const todayWeatherDay = weatherForecast?.days.find(
      (d) => d.date === todayDateStr && !d.name.includes("Night")
    );
    const tonightWeather = weatherForecast?.days.find(
      (d) => d.date === todayDateStr && d.name.includes("Night")
    );

    // Format weather for template
    const weather = todayWeatherDay
      ? {
          high: todayWeatherDay.temperature,
          low: tonightWeather?.temperature || todayWeatherDay.temperature - 10,
          icon: getWeatherEmoji(todayWeatherDay.shortForecast),
          summary: todayWeatherDay.shortForecast,
        }
      : undefined;

    // ==========================================================================
    // BUILD "LOOK AHEAD" WITH REAL WEATHER
    // ==========================================================================

    const lookAhead: { day: string; forecast: string; tip?: string }[] = [];

    // Tomorrow
    const tomorrowDate = nyNow.plus({ days: 1 }).toISODate();
    const tomorrowWeather = weatherForecast?.days.find(
      (d) => d.date === tomorrowDate && !d.name.includes("Night")
    );

    if (tomorrowWeather) {
      const tip = tomorrowWeather.snowAmount.hasSnow
        ? "Possible ASP suspension if snow accumulates"
        : tomorrowWeather.probabilityOfPrecipitation && tomorrowWeather.probabilityOfPrecipitation > 50
        ? "Bring an umbrella"
        : undefined;

      lookAhead.push({
        day: nyNow.plus({ days: 1 }).toFormat("EEE"),
        forecast: `${tomorrowWeather.temperature}° ${tomorrowWeather.shortForecast}`,
        tip,
      });
    } else {
      lookAhead.push({
        day: nyNow.plus({ days: 1 }).toFormat("EEE"),
        forecast: "Weather data unavailable",
      });
    }

    // Day after tomorrow
    const dayAfterDate = nyNow.plus({ days: 2 }).toISODate();
    const dayAfterWeather = weatherForecast?.days.find(
      (d) => d.date === dayAfterDate && !d.name.includes("Night")
    );

    if (dayAfterWeather) {
      const tip = dayAfterWeather.snowAmount.hasSnow
        ? `${dayAfterWeather.snowAmount.description || "Snow expected"}`
        : undefined;

      lookAhead.push({
        day: nyNow.plus({ days: 2 }).toFormat("EEE"),
        forecast: `${dayAfterWeather.temperature}° ${dayAfterWeather.shortForecast}`,
        tip,
      });
    } else {
      lookAhead.push({
        day: nyNow.plus({ days: 2 }).toFormat("EEE"),
        forecast: "Weather data unavailable",
      });
    }

    // ==========================================================================
    // ORGANIZE CONTENT BY URGENCY AND MODULE (Traditional path only)
    // New structure: breaking → weather → essentials (by module) → headlines → don't miss → tonight
    // ==========================================================================

    // Only process for traditional path - orchestrator path already has these populated
    if (!useOrchestrator) {
      // Score and categorize all alert events
      const scoredAlertEvents = alertEvents
        .filter((e) => !shouldExcludeEvent({ title: e.title, body: e.body, moduleId: e.source?.moduleId }))
        .map((e) => ({
          ...e,
          relevanceScore: scoreEvent(e),
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      // 1. BREAKING: High-impact items requiring immediate attention
      // Criteria: transit outages, severe weather, emergencies (score > 85)
      breakingItems = scoredAlertEvents
        .filter((e) => {
          const isHighImpact = e.relevanceScore > 85;
          const isTransitCritical = e.source?.moduleId === "transit" && 
            /suspended|cancelled|significant|severe|emergency/i.test(e.title);
          const isWeatherAlert = todayWeatherDay?.snowAmount.hasSnow && e.source?.moduleId === "weather";
          return isHighImpact || isTransitCritical || isWeatherAlert;
        })
        .slice(0, 3)
        .map((e) => ({
          id: e.id,
          title: e.title,
          description: formatEventDescription(e.body, 120),
          category: e.source?.moduleId || "general",
          moduleId: e.source?.moduleId,
          isUrgent: true,
          venue: (e.metadata as Record<string, unknown>)?.venue as string | undefined,
        }));

      // 2. ESSENTIALS: Grouped by module for clear organization
      const transitItems = scoredAlertEvents
        .filter((e) => e.source?.moduleId === "transit")
        .filter((e) => !breakingItems.find((b) => b.id === e.id)) // Exclude breaking
        .slice(0, 4)
        .map((e) => ({
          id: e.id,
          title: e.title,
          description: formatEventDescription(e.body, 100),
          category: "transit",
          moduleId: "transit" as const,
          isUrgent: e.relevanceScore > 75,
          venue: undefined,
        }));

      const parkingItems: NYCTodayEvent[] = scoredAlertEvents
        .filter((e) => e.source?.moduleId === "parking")
        .slice(0, 3)
        .map((e) => ({
          id: e.id,
          title: e.title,
          description: formatEventDescription(e.body, 100),
          category: "parking",
          moduleId: "parking",
          isUrgent: false,
        }));

      // Add weather alert to essentials if significant but not breaking
      if (todayWeatherDay && (
        todayWeatherDay.snowAmount.hasSnow ||
        (todayWeatherDay.probabilityOfPrecipitation && todayWeatherDay.probabilityOfPrecipitation > 60) ||
        todayWeatherDay.temperature < 32 ||
        todayWeatherDay.temperature > 90
      )) {
        const weatherAlert: NYCTodayEvent = {
          id: "weather-today",
          title: `${getWeatherEmoji(todayWeatherDay.shortForecast)} ${todayWeatherDay.shortForecast}`,
          description: `High of ${todayWeatherDay.temperature}°${
            todayWeatherDay.snowAmount.hasSnow ? ` — ${todayWeatherDay.snowAmount.description}` : ""
          }`,
          category: "weather",
          moduleId: "weather",
          isUrgent: todayWeatherDay.snowAmount.hasSnow || todayWeatherDay.temperature < 20,
        };

        if (!breakingItems.find((b) => b.id === "weather-today")) {
          parkingItems.unshift(weatherAlert); // Weather affects parking decisions
        }
      }

      // Other essential items (non-transit, non-parking urgent items)
      const otherEssentialItems = scoredAlertEvents
        .filter((e) => !["transit", "parking"].includes(e.source?.moduleId || ""))
        .filter((e) => !breakingItems.find((b) => b.id === e.id))
        .filter((e) => e.relevanceScore > 70)
        .slice(0, 3)
        .map((e) => ({
          id: e.id,
          title: e.title,
          description: formatEventDescription(e.body, 100),
          category: e.source?.moduleId || "general",
          moduleId: e.source?.moduleId,
          isUrgent: e.relevanceScore > 80,
          venue: (e.metadata as Record<string, unknown>)?.venue as string | undefined,
        }));

      essentials = {
        transit: transitItems,
        parking: parkingItems,
        other: otherEssentialItems,
      };
    }

    console.log(`[Daily Pulse] Content organization: ${breakingItems.length} breaking, ${essentials.transit.length} transit, ${essentials.parking.length} parking, ${essentials.other.length} other`);

    // ==========================================================================
    // BUILD "DON'T MISS" (HIGH-VALUE ITEM WITH DEADLINE)
    // ==========================================================================

    // Find the best "Don't Miss" candidate
    // Priority: Events with deadlines > High insider score > High hype score
    const dontMissEvent =
      cityEvents.find(
        (e) => e.deadlineAt && e.deadlineAt <= todayEnd && e.deadlineAt >= todayStart
      ) ||
      cityEvents.find((e) => e.insiderScore >= 80) ||
      alertEvents.find((e) => e.hypeScore && e.hypeScore >= 70);

    const dontMiss = dontMissEvent
      ? {
          title: dontMissEvent.title,
          description: smartTruncate(
            (dontMissEvent as { description?: string }).description ||
              (dontMissEvent as { body?: string }).body ||
              "Don't miss this one.",
            200
          ),
          ctaUrl: (dontMissEvent as { sourceUrl?: string }).sourceUrl || undefined,
          moduleIcon: MODULE_DISPLAY[(dontMissEvent as { category?: string }).category?.toLowerCase() || "events"]?.icon || "🎯",
        }
      : undefined;

    // ==========================================================================
    // BUILD "TONIGHT IN NYC" (EVENING EVENTS)
    // ==========================================================================

    const tonightInNYC: NYCTodayEvent[] = cityEvents
      .filter((e) => {
        if (!e.startsAt) return false;
        const hour = DateTime.fromJSDate(e.startsAt).hour;
        return hour >= 17; // 5pm or later
      })
      .filter((e) => !shouldExcludeEvent({ title: e.title, body: e.description, moduleId: e.category?.toLowerCase() }))
      .slice(0, 4)
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: smartTruncate(e.description || "", 100),
        category: e.category.toLowerCase(),
        isFree: e.tags?.includes("free") || false,
        venue: e.venue || undefined,
      }));

    // ==========================================================================
    // SEND EMAILS - WITH FREQUENCY CAP CHECKING
    // ==========================================================================

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    let capped = 0;
    let lowValueSkipped = 0;

    // Calculate total content items
    const totalContentItems = newsItems.length + breakingItems.length + 
                              essentials.transit.length + essentials.parking.length + 
                              essentials.other.length + tonightInNYC.length;

    // Skip if insufficient content and not forced
    if (!force && totalContentItems < BATCHING_CONFIG.MIN_DIGEST_ITEMS) {
      console.log(`[Daily Pulse] Skipping: insufficient content (${totalContentItems} items)`);
      await jobMonitor.success({
        itemsProcessed: 0,
        itemsFailed: 0,
        metadata: {
          skipped: users.length,
          reason: 'insufficient_content',
          itemCount: totalContentItems,
        },
      });
      await releaseJobLock("send-daily-pulse", lockId);
      return NextResponse.json({
        success: true,
        skipped: users.length,
        reason: 'insufficient_content',
        itemCount: totalContentItems,
      });
    }

    for (const user of users) {
      try {
        // Check frequency cap - daily_pulse shares cap with daily_digest
        const capCheck = await checkEmailFrequencyCap(user.id, "daily_digest", today);
        
        if (!capCheck.allowed && !force) {
          capped++;
          console.log(`[Daily Pulse] Capped for ${user.email}: ${capCheck.reason}`);
          continue;
        }

        // Check if content is valuable enough for this user
        const skipCheck = await shouldSkipLowValueDigest(user.id, totalContentItems, today);
        if (skipCheck.skip && !force) {
          lowValueSkipped++;
          console.log(`[Daily Pulse] Low value skipped for ${user.email}: ${skipCheck.reason}`);
          continue;
        }

        const todayData: NYCTodayData = {
          date: nyNow.toJSDate(),
          weather: weather ? {
            ...weather,
            precipChance: todayWeatherDay?.probabilityOfPrecipitation || undefined,
            alert: todayWeatherDay?.snowAmount.hasSnow ? "Snow expected" : undefined,
          } : undefined,
          breaking: breakingItems.length > 0 ? breakingItems : undefined,
          news: newsItems,
          essentials,
          dontMiss,
          tonightInNYC: tonightInNYC.length > 0 ? tonightInNYC : undefined,
          lookAhead,
          user: {
            neighborhood: user.inferredNeighborhood || undefined,
            tier: user.tier,
          },
        };

        const emailContent = nycToday(todayData);

        // Send with idempotency tracking
        const result = await sendEmailTracked(
          {
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          },
          "daily_pulse",
          today,
          {
            userId: user.id,
            tier: user.tier,
            useOrchestrator,
          }
        );

        if (result.alreadySent) {
          skipped++;
          console.log(`[Daily Pulse] Skipped duplicate for ${user.email}`);
        } else if (result.success) {
          sent++;
          console.log(`[Daily Pulse] Sent to ${user.email}`);
        } else {
          failed++;
          console.error(`[Daily Pulse] Failed for ${user.email}: ${result.error}`);
        }
      } catch (error) {
        console.error(`[Daily Pulse] Failed for ${user.email}:`, error);
        failed++;
      }
    }

    console.log(`[Daily Pulse] Done: ${sent} sent, ${skipped} skipped, ${failed} failed, ${capped} capped, ${lowValueSkipped} low-value`);

    // Mark job as successful
    // Calculate curated items count
    const curatedItemsCount = breakingItems.length + essentials.transit.length + 
                              essentials.parking.length + essentials.other.length;

    await jobMonitor.success({
      itemsProcessed: sent,
      itemsFailed: failed,
      metadata: {
        skipped,
        capped,
        lowValueSkipped,
        totalContentItems,
        alertEventsTotal: alertEvents.length,
        alertEventsCurated: curatedItemsCount,
        breakingItems: breakingItems.length,
        transitItems: essentials.transit.length,
        parkingItems: essentials.parking.length,
        cityEvents: cityEvents.length,
        curatedNews: curatedNews.length,
        weather: weather?.summary || null,
        useOrchestrator,
        orchestratorDuration: orchestratorMetrics?.totalDuration,
      },
    });

    await releaseJobLock("send-daily-pulse", lockId);

    return NextResponse.json({
      date: nyNow.toFormat("yyyy-MM-dd"),
      users: users.length,
      sent,
      skipped,
      failed,
      capped,
      lowValueSkipped,
      totalContentItems,
      mode: useOrchestrator ? "orchestrator" : "traditional",
      events: {
        alertEventsTotal: alertEvents.length,
        alertEventsCurated: curatedItemsCount,
        breakingItems: breakingItems.length,
        essentials: {
          transit: essentials.transit.length,
          parking: essentials.parking.length,
          other: essentials.other.length,
        },
        cityEvents: cityEvents.length,
      },
      news: {
        count: newsItems.length,
        stories: newsItems.map((n) => ({ title: n.title, source: n.source })),
      },
      weather: weather
        ? {
            high: weather.high,
            low: weather.low,
            summary: weather.summary,
          }
        : null,
      lookAhead,
      ...(orchestratorMetrics && {
        orchestrator: {
          totalDuration: `${(orchestratorMetrics.totalDuration / 1000).toFixed(2)}s`,
          averageQuality: orchestratorMetrics.avgQuality.toFixed(1),
        },
      }),
    });
  } catch (error) {
    console.error("[Daily Pulse] Job failed:", error);
    await jobMonitor.fail(error);
    await releaseJobLock("send-daily-pulse", lockId);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
