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
 *
 * Query parameters:
 * - useOrchestrator=true: Use multi-agent pipeline for content selection
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import { nycToday, NYCTodayData, NYCTodayEvent, NYCTodayNewsItem } from "@/lib/email-templates-v2";
import { fetchNYCWeatherForecast } from "@/lib/weather";
import { JobMonitor } from "@/lib/job-monitor";
import { getCuratedNewsForDate } from "@/lib/news-curation";
import { DateTime } from "luxon";
import { orchestrateDigestV2 } from "@/lib/agents/agent-orchestrator";
import type { ContentSelectionV2 } from "@/lib/agents/types";

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
function shouldExcludeEvent(event: { title: string; body?: string | null }): boolean {
  const textToCheck = `${event.title} ${event.body || ""}`.toLowerCase();
  return EXCLUDED_EVENT_PATTERNS.some((pattern) => pattern.test(textToCheck));
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
 * Maps the scored news articles to the email template format.
 */
function buildNewsFromOrchestrator(selection: ContentSelectionV2): NYCTodayNewsItem[] {
  return selection.news.slice(0, 5).map((article) => ({
    id: article.id,
    title: article.title,
    summary: article.summary ?? article.snippet?.slice(0, 200) ?? "",
    source: article.source,
    url: article.url,
    nycAngle: article.nycAngle ?? undefined,
  }));
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
 * Build "What Matters Today" events from orchestrator selection.
 * Uses scored alerts with category-based formatting.
 */
function buildWhatMattersFromOrchestrator(selection: ContentSelectionV2): NYCTodayEvent[] {
  return selection.alerts.slice(0, 6).map((alert) => {
    const moduleId = getModuleFromSourceId(alert.sourceId);

    return {
      id: alert.id,
      title: alert.title ?? "Alert",
      description: formatEventDescription(alert.body, 120),
      category: moduleId,
      isUrgent: alert.scores.impact >= 70 || ["transit", "weather"].includes(moduleId),
      venue: (alert.metadata as Record<string, unknown>)?.venue as string | undefined,
    };
  });
}

/**
 * Run the full orchestrator-enhanced pulse generation.
 * Uses the multi-agent pipeline for content selection and curation.
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
      maxAlerts: 6,
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

  return {
    news: buildNewsFromOrchestrator(result.selection),
    whatMattersToday: buildWhatMattersFromOrchestrator(result.selection),
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

  // Check for orchestrator mode
  const { searchParams } = new URL(request.url);
  const useOrchestrator = searchParams.get("useOrchestrator") === "true";

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

    // ==========================================================================
    // FETCH DATA IN PARALLEL
    // ==========================================================================

    const [alertEvents, cityEvents, weatherForecast, curatedNews] = await Promise.all([
      // Alert events for today
      prisma.alertEvent.findMany({
        where: {
          startsAt: {
            gte: todayStart,
            lte: todayEnd,
          },
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
    let orchestratorMetrics: { totalDuration: number; avgQuality: number } | undefined;

    if (useOrchestrator) {
      // Use multi-agent pipeline for enhanced content selection
      const orchestratorResult = await runOrchestratorEnhancedPulse(nyNow, weatherForecast);
      newsItems = orchestratorResult.news;
      orchestratorMetrics = {
        totalDuration: orchestratorResult.metrics.totalDuration,
        avgQuality: orchestratorResult.selection.summary.averageQuality,
      };

      // Note: We could also use orchestratorResult.whatMattersToday but
      // the traditional path has more NYC-specific curation logic
      console.log(`[Daily Pulse] Orchestrator enhanced: ${newsItems.length} news items`);
    } else {
      // Traditional path: Use AI-curated news from getCuratedNewsForDate
      newsItems = curatedNews.map((article) => ({
        id: article.id,
        title: article.title,
        summary: article.summary,
        nycAngle: article.nycAngle || undefined,
        source: article.source,
        url: article.url,
      }));
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
    // BUILD "WHAT MATTERS TODAY" WITH QUALITY FILTERING
    // ==========================================================================

    // Filter and score alert events
    const curatedAlertEvents = alertEvents
      .filter((e) => !shouldExcludeEvent({ title: e.title, body: e.body }))
      .map((e) => ({
        ...e,
        relevanceScore: scoreEvent(e),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Build What Matters Today from curated alerts
    const whatMattersToday: NYCTodayEvent[] = curatedAlertEvents.slice(0, 6).map((e) => {
      const moduleDisplay = MODULE_DISPLAY[e.source.moduleId] || { icon: "📌", name: e.source.moduleId };
      return {
        id: e.id,
        title: e.title,
        description: formatEventDescription(e.body, 120),
        category: e.source.moduleId,
        isUrgent: PRIORITY_MODULES.includes(e.source.moduleId) || e.relevanceScore > 80,
        venue: (e.metadata as Record<string, unknown>)?.venue as string | undefined,
      };
    });

    // If we have very few curated events, add weather as a "what matters" item
    if (whatMattersToday.length < 3 && todayWeatherDay) {
      // Add weather alert if significant conditions
      const significantWeather =
        todayWeatherDay.snowAmount.hasSnow ||
        (todayWeatherDay.probabilityOfPrecipitation && todayWeatherDay.probabilityOfPrecipitation > 70) ||
        todayWeatherDay.temperature < 32 ||
        todayWeatherDay.temperature > 90;

      if (significantWeather) {
        whatMattersToday.unshift({
          id: "weather-today",
          title: `${getWeatherEmoji(todayWeatherDay.shortForecast)} ${todayWeatherDay.shortForecast}`,
          description: `High of ${todayWeatherDay.temperature}°${
            todayWeatherDay.snowAmount.hasSnow ? ` — ${todayWeatherDay.snowAmount.description}` : ""
          }`,
          category: "weather",
          isUrgent: todayWeatherDay.snowAmount.hasSnow || todayWeatherDay.temperature < 20,
        });
      }
    }

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
      .filter((e) => !shouldExcludeEvent({ title: e.title, body: e.description }))
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
    // SEND EMAILS
    // ==========================================================================

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const todayData: NYCTodayData = {
          date: nyNow.toJSDate(),
          weather,
          news: newsItems,
          whatMattersToday,
          dontMiss,
          tonightInNYC,
          lookAhead,
          user: {
            neighborhood: user.inferredNeighborhood || undefined,
            tier: user.tier,
          },
        };

        const emailContent = nycToday(todayData);

        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        sent++;
        console.log(`[Daily Pulse] Sent to ${user.email}`);
      } catch (error) {
        console.error(`[Daily Pulse] Failed for ${user.email}:`, error);
        failed++;
      }
    }

    console.log(`[Daily Pulse] Done: ${sent} sent, ${failed} failed`);

    // Mark job as successful
    await jobMonitor.success({
      itemsProcessed: sent,
      itemsFailed: failed,
      metadata: {
        alertEventsTotal: alertEvents.length,
        alertEventsCurated: curatedAlertEvents.length,
        cityEvents: cityEvents.length,
        curatedNews: curatedNews.length,
        weather: weather?.summary || null,
        useOrchestrator,
        orchestratorDuration: orchestratorMetrics?.totalDuration,
      },
    });

    return NextResponse.json({
      date: nyNow.toFormat("yyyy-MM-dd"),
      users: users.length,
      sent,
      failed,
      mode: useOrchestrator ? "orchestrator" : "traditional",
      events: {
        alertEventsTotal: alertEvents.length,
        alertEventsCurated: curatedAlertEvents.length,
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
