// src/lib/agents/daily-digest-orchestrator.ts
/**
 * DAILY DIGEST ORCHESTRATOR
 *
 * Coordinates all components to produce the enhanced daily digest with:
 * - THE HORIZON: Proactive alerts from NYC Knowledge Base
 * - THE DEEP DIVE: LLM-clustered story analysis
 * - THE BRIEFING: Quick-hit alerts and news
 * - THE AGENDA: Upcoming events
 *
 * The orchestrator adapts content depth based on day of week:
 * - Weekdays: Lighter clustering (3 clusters)
 * - Weekends: Deeper analysis (5 clusters)
 *
 * Cost: ~$0.01/day total (Horizon + Clustering)
 */

import { DateTime } from "luxon";
import { prisma } from "../db";
import { fetchNYCWeatherForecast } from "../weather";
import {
  generateHorizonAlerts,
  HorizonAlert,
  partitionAlertsByPremium,
} from "./horizon-agent";
import {
  clusterArticles,
  StoryCluster,
  ClusterableArticle,
  prepareClusterForEmail,
  ClusterForEmail,
} from "./clustering-agent";
import {
  selectBestContentV2Semantic,
  ContentSelectionV2Semantic,
} from "./data-quality-agent";
import type { NanoAppSubject } from "./subject-line-nano-app";
import type { ScoredNewsArticle, ScoredAlertEvent } from "./types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Weather data for the digest.
 */
export interface WeatherData {
  temp: number;
  high: number;
  low: number;
  condition: string;
  emoji: string;
  summary: string;
}

/**
 * Complete content for the enhanced daily digest email.
 */
export interface DailyDigestContent {
  // WEATHER - Current NYC conditions
  weather: WeatherData | null;

  // SUBJECT LINE - Generated via nano app
  subjectLine: NanoAppSubject | null;

  // THE HORIZON - Proactive alerts from knowledge base
  horizon: {
    alerts: HorizonAlert[];
    premiumAlerts: HorizonAlert[]; // Gated behind subscription
  };

  // THE DEEP DIVE - Clustered story analysis
  deepDive: {
    clusters: StoryCluster[];
    clustersForEmail: ClusterForEmail[];
    featuredCluster: StoryCluster | null;
  };

  // THE BRIEFING - Quick hits
  briefing: {
    items: BriefingItem[];
  };

  // THE AGENDA - Upcoming events
  agenda: {
    events: AgendaEvent[];
    windowDays: number;
  };

  // Standard content (backwards compatible)
  standardContent: {
    news: ScoredNewsArticle[];
    alerts: ScoredAlertEvent[];
  };

  // Metadata
  meta: DigestMeta;
}

export interface BriefingItem {
  id: string;
  title: string;
  body: string;
  source: string;
  category: string;
  icon?: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  date: DateTime;
  time?: string;
  venue?: string;
  category: string;
  neighborhood?: string;
}

export interface DigestMeta {
  generatedAt: DateTime;
  dayOfWeek: string;
  isWeekend: boolean;
  tokensUsed: number;
  estimatedCost: number;
  processingTimeMs: number;
  errors: string[];
}

export interface DigestConfig {
  userId: string;
  isPremium: boolean;
  neighborhoods?: string[];
  today?: DateTime;
  skipClustering?: boolean; // For testing/debugging
  skipHorizon?: boolean;
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Generate complete enhanced daily digest content.
 *
 * @param config - Configuration for this digest run
 * @returns Complete digest content ready for email template
 */
export async function generateDailyDigest(
  config: DigestConfig
): Promise<DailyDigestContent> {
  const startTime = Date.now();
  const today = config.today || DateTime.now();
  const dayOfWeek = today.weekday; // 1=Mon, 7=Sun
  const isWeekend = dayOfWeek >= 6;
  const errors: string[] = [];

  // Adapt depth based on day of week
  const targetClusters = isWeekend ? 5 : 3;
  const agendaWindowDays = getAgendaWindow(dayOfWeek);

  let totalTokens = 0;

  // -------------------------------------------------------------------------
  // 0. WEATHER - Fetch NYC conditions
  // -------------------------------------------------------------------------
  let weather: WeatherData | null = null;
  try {
    const forecast = await fetchNYCWeatherForecast();
    if (forecast && forecast.days && forecast.days.length >= 2) {
      // NWS returns day/night pairs; first is current period, second is next
      const dayPeriod = forecast.days.find((d) => !d.name.toLowerCase().includes("night"));
      const nightPeriod = forecast.days.find((d) => d.name.toLowerCase().includes("night"));

      const high = dayPeriod?.temperature || forecast.days[0].temperature;
      const low = nightPeriod?.temperature || high - 10; // Estimate if missing
      const condition = dayPeriod?.shortForecast || forecast.days[0].shortForecast;

      weather = {
        temp: high,
        high,
        low,
        condition,
        emoji: getWeatherEmoji(condition),
        summary: `${high}°/${low}° ${condition}`,
      };
    } else if (forecast && forecast.days && forecast.days.length > 0) {
      // Fallback: just use first period
      const period = forecast.days[0];
      weather = {
        temp: period.temperature,
        high: period.temperature,
        low: period.temperature - 10,
        condition: period.shortForecast,
        emoji: getWeatherEmoji(period.shortForecast),
        summary: `${period.temperature}° ${period.shortForecast}`,
      };
    }
  } catch (error) {
    errors.push(
      `Weather fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // -------------------------------------------------------------------------
  // 1. THE HORIZON - Proactive alerts from knowledge base
  // -------------------------------------------------------------------------
  let horizonAlerts: HorizonAlert[] = [];
  let premiumAlerts: HorizonAlert[] = [];

  if (!config.skipHorizon) {
    try {
      const horizonResult = await generateHorizonAlerts({
        today,
        includePremium: true, // Get all, filter by subscription later
        maxAlerts: 5,
      });

      totalTokens += horizonResult.tokensUsed;
      errors.push(...horizonResult.errors);

      // Partition by premium status
      const partitioned = partitionAlertsByPremium(horizonResult.alerts);
      horizonAlerts = partitioned.free;

      // Only include premium alerts if user is premium
      if (config.isPremium) {
        premiumAlerts = partitioned.premium;
      }
    } catch (error) {
      errors.push(
        `Horizon generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. CONTENT SELECTION - Get best news and alerts
  // -------------------------------------------------------------------------
  let contentResult: ContentSelectionV2Semantic | null = null;
  try {
    contentResult = await selectBestContentV2Semantic({
      semanticEnabled: true,
      maxNews: 30,
      maxAlerts: 20,
      minQualityScore: 40,
    });
  } catch (error) {
    errors.push(
      `Content selection failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  const news = contentResult?.news || [];
  const alerts = contentResult?.alerts || [];

  // -------------------------------------------------------------------------
  // 3. THE DEEP DIVE - Cluster news articles
  // -------------------------------------------------------------------------
  let clusters: StoryCluster[] = [];
  let clustersForEmail: ClusterForEmail[] = [];
  let unclustered: ClusterableArticle[] = [];

  if (!config.skipClustering && news.length >= 4) {
    try {
      const clusterableArticles: ClusterableArticle[] = news.map((n) => ({
        id: n.id,
        title: n.title,
        summary: n.summary || n.snippet?.slice(0, 200) || "",
        source: n.source || "Unknown",
        publishedAt: n.publishedAt,
        score: n.scores?.overall || 50,
        url: n.url || undefined,
      }));

      const clusterResult = await clusterArticles(clusterableArticles, {
        targetClusters,
        minClusterSize: 2,
      });

      totalTokens += clusterResult.tokensUsed;
      errors.push(...clusterResult.errors);

      clusters = clusterResult.clusters;
      unclustered = clusterResult.unclustered;
      clustersForEmail = clusters.map(prepareClusterForEmail);
    } catch (error) {
      errors.push(
        `Clustering failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 4. THE BRIEFING - Build quick hits from alerts + unclustered news
  // -------------------------------------------------------------------------
  const briefingItems: BriefingItem[] = buildBriefingItems(
    alerts,
    unclustered,
    8 // Max items
  );

  // -------------------------------------------------------------------------
  // 5. THE AGENDA - Upcoming events
  // -------------------------------------------------------------------------
  const agendaEnd = today.plus({ days: agendaWindowDays });
  let agendaEvents: AgendaEvent[] = [];

  try {
    const events = await prisma.cityEvent.findMany({
      where: {
        startsAt: {
          gte: today.toJSDate(),
          lte: agendaEnd.toJSDate(),
        },
        status: "published",
      },
      orderBy: { startsAt: "asc" },
      take: 8,
    });

    agendaEvents = events.map((e) => ({
      id: e.id,
      title: e.title,
      date: DateTime.fromJSDate(e.startsAt!),
      time: e.startsAt
        ? DateTime.fromJSDate(e.startsAt).toFormat("h:mm a")
        : undefined,
      venue: e.venue || undefined,
      category: e.category,
      neighborhood: e.neighborhood || undefined,
    }));
  } catch (error) {
    errors.push(
      `Agenda fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // -------------------------------------------------------------------------
  // 6. SUBJECT LINE - Generate directly
  // -------------------------------------------------------------------------
  let subjectLine: NanoAppSubject | null = null;
  try {
    const dayDate = today.toFormat("EEE, LLL d"); // "Fri, Jan 24"
    const weatherBite = weather
      ? `${weather.emoji} ${weather.high}°F ${weather.condition.split(" ")[0].toLowerCase()}`
      : "";

    // Find the top story hook
    let hook = "";
    let hookEmoji = "📰";

    if (horizonAlerts.length > 0 && horizonAlerts[0].urgency === "high") {
      // Lead with urgent horizon alert
      hook = `${horizonAlerts[0].event.icon} ${horizonAlerts[0].event.shortTitle}: ${horizonAlerts[0].message.slice(0, 40)}`;
      hookEmoji = horizonAlerts[0].event.icon;
    } else if (clusters.length > 0) {
      // Lead with top cluster
      const topCluster = clusters[0];
      hook = `📰 ${topCluster.theme}: ${topCluster.headline.slice(0, 40)}`;
    } else if (alerts.length > 0) {
      // Lead with top alert
      hook = `🔔 ${alerts[0].title.slice(0, 50)}`;
    } else if (news.length > 0) {
      // Lead with top news
      hook = `📰 ${news[0].title.slice(0, 50)}`;
    }

    const full = `NYC TODAY ${dayDate} ${weatherBite} ${hook}`.trim();

    subjectLine = {
      full: full.slice(0, 120), // Max 120 chars
      preheader: clusters.length > 0
        ? `Plus ${clusters.length} story clusters and ${briefingItems.length} quick hits`
        : `${news.length} stories, ${alerts.length} alerts for your day`,
      bites: [],
      characterCount: full.length,
    };
  } catch (error) {
    errors.push(
      `Subject line generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // -------------------------------------------------------------------------
  // Calculate metadata
  // -------------------------------------------------------------------------
  const processingTimeMs = Date.now() - startTime;

  // Cost calculation (GPT-4o: $2.50/1M input, $10/1M output; gpt-4o-mini: $0.15/$0.60)
  // Using rough average of $5/1M tokens
  const estimatedCost = (totalTokens / 1_000_000) * 5;

  return {
    weather,
    subjectLine,
    horizon: {
      alerts: horizonAlerts,
      premiumAlerts,
    },
    deepDive: {
      clusters,
      clustersForEmail,
      featuredCluster: clusters[0] || null,
    },
    briefing: {
      items: briefingItems,
    },
    agenda: {
      events: agendaEvents,
      windowDays: agendaWindowDays,
    },
    standardContent: {
      news,
      alerts,
    },
    meta: {
      generatedAt: today,
      dayOfWeek: today.toFormat("EEEE"),
      isWeekend,
      tokensUsed: totalTokens,
      estimatedCost,
      processingTimeMs,
      errors,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get agenda window based on day of week.
 *
 * Thu-Sat: Show through Sunday (weekend planning)
 * Sun-Wed: Show next 48 hours
 */
function getAgendaWindow(dayOfWeek: number): number {
  switch (dayOfWeek) {
    case 4:
      return 4; // Thu: show Fri-Sun (4 days)
    case 5:
      return 3; // Fri: show Fri-Sun (3 days)
    case 6:
      return 2; // Sat: show Sat-Sun (2 days)
    case 7:
      return 1; // Sun: show Sun (1 day)
    default:
      return 2; // Mon-Wed: 48 hours
  }
}

/**
 * Build briefing items from alerts and unclustered news.
 */
function buildBriefingItems(
  alerts: ScoredAlertEvent[],
  unclustered: ClusterableArticle[],
  maxItems: number
): BriefingItem[] {
  const items: BriefingItem[] = [];

  // Add top alerts
  for (const alert of alerts.slice(0, 5)) {
    // Use category from scoring if available, otherwise derive from sourceId
    const alertCategory = alert.category || "alert";
    items.push({
      id: alert.id,
      title: alert.title,
      body: alert.body || "",
      source: "CityPing",
      category: alertCategory,
      icon: getCategoryIcon(alertCategory),
    });
  }

  // Add unclustered news
  for (const article of unclustered.slice(0, 3)) {
    items.push({
      id: article.id,
      title: article.title,
      body: article.summary,
      source: article.source,
      category: "news",
      icon: "📰",
    });
  }

  return items.slice(0, maxItems);
}

/**
 * Get icon for a category/module.
 */
function getCategoryIcon(moduleId?: string): string {
  const icons: Record<string, string> = {
    parking: "🚗",
    transit: "🚇",
    weather: "🌤️",
    safety: "⚠️",
    civic: "🏛️",
    culture: "🎭",
    education: "🎒",
    housing: "🏠",
    news: "📰",
    alert: "🔔",
  };
  return icons[moduleId || "alert"] || "📌";
}

/**
 * Get weather emoji from condition string.
 */
function getWeatherEmoji(condition: string): string {
  const lower = condition.toLowerCase();
  if (lower.includes("sun") || lower.includes("clear")) return "☀️";
  if (lower.includes("partly")) return "⛅";
  if (lower.includes("cloud") || lower.includes("overcast")) return "☁️";
  if (lower.includes("rain") || lower.includes("drizzle")) return "🌧️";
  if (lower.includes("snow")) return "🌨️";
  if (lower.includes("thunder") || lower.includes("storm")) return "⛈️";
  if (lower.includes("fog") || lower.includes("mist")) return "🌫️";
  if (lower.includes("wind")) return "💨";
  return "🌤️";
}

/**
 * Get a summary of the digest for logging.
 */
export function summarizeDigest(digest: DailyDigestContent): string {
  const { weather, subjectLine, horizon, deepDive, briefing, agenda, meta } = digest;

  return [
    `Daily Digest Summary (${meta.dayOfWeek})`,
    `----------------------------------------`,
    weather ? `Weather: ${weather.emoji} ${weather.summary}` : "Weather: N/A",
    subjectLine ? `Subject: ${subjectLine.full.slice(0, 60)}...` : "Subject: N/A",
    `Horizon: ${horizon.alerts.length} free, ${horizon.premiumAlerts.length} premium`,
    `Deep Dive: ${deepDive.clusters.length} clusters`,
    `Briefing: ${briefing.items.length} items`,
    `Agenda: ${agenda.events.length} events (${agenda.windowDays}-day window)`,
    ``,
    `Tokens: ${meta.tokensUsed}`,
    `Cost: $${meta.estimatedCost.toFixed(4)}`,
    `Time: ${meta.processingTimeMs}ms`,
    meta.errors.length > 0 ? `Errors: ${meta.errors.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Check if digest has enough content to send.
 */
export function isDigestViable(digest: DailyDigestContent): boolean {
  // Must have at least some content in at least one section
  const hasHorizon = digest.horizon.alerts.length > 0;
  const hasDeepDive = digest.deepDive.clusters.length > 0;
  const hasBriefing = digest.briefing.items.length > 0;
  const hasAgenda = digest.agenda.events.length > 0;
  const hasStandardContent =
    digest.standardContent.news.length > 0 ||
    digest.standardContent.alerts.length > 0;

  return hasHorizon || hasDeepDive || hasBriefing || hasAgenda || hasStandardContent;
}

/**
 * Export types for use in email templates.
 */
export type { HorizonAlert, StoryCluster, ClusterForEmail };
