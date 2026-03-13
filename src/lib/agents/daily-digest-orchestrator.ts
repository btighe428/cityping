// src/lib/agents/daily-digest-orchestrator.ts
/**
 * UNIFIED DAILY DIGEST ORCHESTRATOR
 *
 * The ONE system that coordinates ALL agents into a complete daily digest:
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                           UNIFIED PIPELINE                                   │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │  Stage 0: WEATHER         → NYC conditions from NWS API                     │
 * │  Stage 1: ROBUSTNESS      → Ensure data freshness, self-heal if needed      │
 * │  Stage 2: DATA QUALITY    → Select & score best content (0-100 scores)      │
 * │  Stage 2.25: CLUSTERING   → LLM groups related stories (GPT-4o)             │
 * │  Stage 2.5: CURATION      → Dedup + "why you should care" (Claude Haiku)    │
 * │  Stage 2.75: PERSONALIZE  → User-specific boosting & filtering              │
 * │  Stage 3: HORIZON         → Proactive alerts from NYC Knowledge Base        │
 * │  Stage 4: SUMMARIZATION   → LLM-generated subject line & content            │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Output: Complete digest with weather, horizon, deep dive, briefing, agenda
 *
 * Cost: ~$0.02/day total across all LLM calls
 */

import { DateTime } from "luxon";
import { prisma } from "../db";
import { fetchNYCWeatherForecast } from "../weather";

// Stage agents
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
  selectBestContentV2,
  selectBestContentV2Semantic,
  type ContentSelectionV2Semantic,
} from "./data-quality-agent";
import { isBlockedContent } from "./scoring";
import { curateContentV2 } from "./content-curator-agent";
import { personalizeContentV2 } from "./personalization-agent";
import { produceHealthReport } from "./robustness-agent";
import type {
  ScoredNewsArticle,
  ScoredAlertEvent,
  ContentSelectionV2,
  CurationResult,
  PersonalizationResult,
  HealthReport,
} from "./types";
import type { NanoAppSubject } from "./subject-line-nano-app";
import { generateWeekendPlan, type WeekendPlan } from "./weekend-planner-agent";
import { aggregateMoneySavers, type MoneySaverResult } from "./money-saver-agent";

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
  hasSnow?: boolean;
  snowSummary?: string | null;
  // 7-day forecast
  forecast?: Array<{
    day: string;      // "Mon", "Tue", etc.
    date: string;     // ISO date
    high: number;
    low: number | null;
    condition: string;
    emoji: string;
    precipChance: number | null;
  }>;
}

/**
 * Complete content for the unified daily digest email.
 */
export interface DailyDigestContent {
  // WEATHER - Current NYC conditions
  weather: WeatherData | null;

  // SUBJECT LINE - Generated subject + preheader
  subjectLine: NanoAppSubject | null;

  // THE HORIZON - Proactive alerts from knowledge base
  horizon: {
    alerts: HorizonAlert[];
    premiumAlerts: HorizonAlert[];
  };

  // THE DEEP DIVE - Clustered story analysis
  deepDive: {
    clusters: StoryCluster[];
    clustersForEmail: ClusterForEmail[];
    featuredCluster: StoryCluster | null;
  };

  // THE BRIEFING - Quick hits with "why you should care"
  briefing: {
    items: BriefingItem[];
  };

  // THE AGENDA - Upcoming events
  agenda: {
    events: AgendaEvent[];
    windowDays: number;
  };

  // PERSONALIZATION - User-specific data (if enabled)
  personalization: {
    userId?: string;
    neighborhood?: string;
    optimalDeliveryTime?: string;
    boostedCount: number;
    filteredCount: number;
  } | null;

  // WEEKEND PLAN - Thu-Sat only
  weekendPlan: WeekendPlan | null;

  // MONEY SAVER - Active deals aggregation
  moneySaver: MoneySaverResult | null;

  // Standard content (for fallback/backwards compatibility)
  standardContent: {
    news: ScoredNewsArticle[];
    alerts: ScoredAlertEvent[];
  };

  // Pipeline metadata
  meta: DigestMeta;
}

export interface BriefingItem {
  id: string;
  title: string;
  body: string;
  source: string;
  category: string;
  icon?: string;
  whyYouShouldCare?: string; // From curation agent
  personalRelevance?: number; // From personalization
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
  stages: {
    weather: { success: boolean; durationMs: number };
    robustness: { success: boolean; health: number; durationMs: number };
    quality: { success: boolean; itemsSelected: number; durationMs: number };
    clustering: { success: boolean; clustersFormed: number; durationMs: number };
    curation: { success: boolean; duplicatesRemoved: number; durationMs: number };
    personalization: { success: boolean; boosted: number; durationMs: number };
    horizon: { success: boolean; alertsGenerated: number; durationMs: number };
  };
}

export interface DigestConfig {
  userId?: string; // For personalization
  isPremium: boolean;
  neighborhoods?: string[];
  today?: DateTime;
  // Feature flags
  skipClustering?: boolean;
  skipHorizon?: boolean;
  skipCuration?: boolean;
  skipPersonalization?: boolean;
  skipRobustness?: boolean;
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Generate complete unified daily digest content.
 *
 * This is the ONE function that produces the full digest with all features.
 */
export async function generateDailyDigest(
  config: DigestConfig
): Promise<DailyDigestContent> {
  const startTime = Date.now();
  const today = config.today || DateTime.now().setZone("America/New_York");
  const dayOfWeek = today.weekday; // 1=Mon, 7=Sun
  const isWeekend = dayOfWeek >= 6;
  const errors: string[] = [];

  // Adapt depth based on day of week (4x expanded)
  const targetClusters = isWeekend ? 20 : 12;
  const agendaWindowDays = getAgendaWindow(dayOfWeek);

  let totalTokens = 0;

  // Initialize stage tracking
  const stages: DigestMeta["stages"] = {
    weather: { success: false, durationMs: 0 },
    robustness: { success: false, health: 0, durationMs: 0 },
    quality: { success: false, itemsSelected: 0, durationMs: 0 },
    clustering: { success: false, clustersFormed: 0, durationMs: 0 },
    curation: { success: false, duplicatesRemoved: 0, durationMs: 0 },
    personalization: { success: false, boosted: 0, durationMs: 0 },
    horizon: { success: false, alertsGenerated: 0, durationMs: 0 },
  };

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         CityPing Unified Daily Digest Orchestrator          ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  ${today.toFormat("EEEE, MMMM d, yyyy 'at' h:mm a ZZZZ").padEnd(56)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // =========================================================================
  // STAGE 0: WEATHER
  // =========================================================================
  console.log("\n[Stage 0] 🌤️  Fetching NYC weather...");
  const weatherStart = Date.now();
  let weather: WeatherData | null = null;

  try {
    const forecast = await fetchNYCWeatherForecast();
    if (forecast && forecast.days && forecast.days.length >= 2) {
      const dayPeriod = forecast.days.find((d) => !d.name.toLowerCase().includes("night"));
      const nightPeriod = forecast.days.find((d) => d.name.toLowerCase().includes("night"));

      const high = dayPeriod?.temperature || forecast.days[0].temperature;
      const low = nightPeriod?.temperature || high - 10;
      const condition = dayPeriod?.shortForecast || forecast.days[0].shortForecast;

      // Build 7-day forecast from NWS data
      // NWS returns periods (day/night pairs), so we need to combine them
      const forecastDays: WeatherData["forecast"] = [];
      const seenDates = new Set<string>();

      for (const period of forecast.days) {
        const date = period.date;
        if (seenDates.has(date)) continue;
        seenDates.add(date);

        // Find day and night periods for this date
        const dayP = forecast.days.find(d => d.date === date && !d.name.toLowerCase().includes("night"));
        const nightP = forecast.days.find(d => d.date === date && d.name.toLowerCase().includes("night"));

        if (dayP || nightP) {
          const dayHigh = dayP?.temperature || nightP?.temperature || 0;
          const dayLow = nightP?.temperature || null;
          const dayCondition = dayP?.shortForecast || nightP?.shortForecast || "";

          forecastDays.push({
            day: period.dayOfWeek.slice(0, 3),
            date,
            high: dayHigh,
            low: dayLow,
            condition: dayCondition,
            emoji: getWeatherEmoji(dayCondition),
            precipChance: dayP?.probabilityOfPrecipitation || nightP?.probabilityOfPrecipitation || null,
          });
        }
      }

      weather = {
        temp: high,
        high,
        low,
        condition,
        emoji: getWeatherEmoji(condition),
        summary: `${high}°/${low}° ${condition}`,
        hasSnow: forecast.hasSignificantSnow,
        snowSummary: forecast.snowSummary,
        forecast: forecastDays.slice(0, 7), // 7 days max
      };
      stages.weather.success = true;
      console.log(`    ✓ ${weather.emoji} ${weather.summary} (${forecastDays.length}-day forecast)`);
    }
  } catch (error) {
    errors.push(`Weather: ${error instanceof Error ? error.message : "Unknown"}`);
    console.log(`    ✗ Weather fetch failed`);
  }
  stages.weather.durationMs = Date.now() - weatherStart;

  // =========================================================================
  // STAGE 1: ROBUSTNESS (optional)
  // =========================================================================
  let healthReport: HealthReport | undefined;

  if (!config.skipRobustness) {
    console.log("\n[Stage 1] 🛡️  Checking data health...");
    const robustnessStart = Date.now();

    try {
      healthReport = await produceHealthReport(true, 50);
      stages.robustness.health = healthReport.overallHealth;
      stages.robustness.success = healthReport.readyForNextStage;
      console.log(`    ✓ System health: ${healthReport.overallHealth}% (${healthReport.status})`);
    } catch (error) {
      errors.push(`Robustness: ${error instanceof Error ? error.message : "Unknown"}`);
      console.log(`    ✗ Health check failed`);
    }
    stages.robustness.durationMs = Date.now() - robustnessStart;
  }

  // =========================================================================
  // STAGE 2: DATA QUALITY - Select best content
  // =========================================================================
  console.log("\n[Stage 2] 📊 Selecting best content...");
  const qualityStart = Date.now();

  let contentResult: ContentSelectionV2Semantic | ContentSelectionV2 | null = null;
  try {
    contentResult = await selectBestContentV2Semantic({
      semanticEnabled: true,
      maxNews: 120,
      maxAlerts: 5,
      minQualityScore: 50,
    });
    stages.quality.itemsSelected = contentResult.news.length + contentResult.alerts.length;
    stages.quality.success = true;
    console.log(`    ✓ Selected ${contentResult.news.length} news, ${contentResult.alerts.length} alerts`);
  } catch (error) {
    errors.push(`Quality: ${error instanceof Error ? error.message : "Unknown"}`);
    console.log(`    ✗ Content selection failed`);
  }
  stages.quality.durationMs = Date.now() - qualityStart;

  const news = contentResult?.news || [];
  const alerts = contentResult?.alerts || [];

  // =========================================================================
  // STAGE 2.25: CLUSTERING - Group related stories
  // =========================================================================
  console.log("\n[Stage 2.25] 🧩 Clustering stories...");
  const clusteringStart = Date.now();

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
      stages.clustering.clustersFormed = clusters.length;
      stages.clustering.success = true;
      console.log(`    ✓ Formed ${clusters.length} story clusters`);
    } catch (error) {
      errors.push(`Clustering: ${error instanceof Error ? error.message : "Unknown"}`);
      console.log(`    ✗ Clustering failed`);
    }
  } else {
    console.log(`    ○ Skipped (${news.length < 4 ? "not enough articles" : "disabled"})`);
  }
  stages.clustering.durationMs = Date.now() - clusteringStart;

  // =========================================================================
  // STAGE 2.5: CURATION - Dedupe + "Why You Should Care"
  // =========================================================================
  console.log("\n[Stage 2.5] ✂️  Curating content...");
  const curationStart = Date.now();

  let curation: CurationResult | undefined;
  if (!config.skipCuration && contentResult) {
    try {
      curation = await curateContentV2(contentResult as ContentSelectionV2, {
        enabled: true,
        generateWhyCare: true,
        maxTotal: 60,
      });
      stages.curation.duplicatesRemoved = curation.stats.duplicatesRemoved;
      stages.curation.success = true;
      console.log(`    ✓ Curated ${curation.stats.selected} items, removed ${curation.stats.duplicatesRemoved} duplicates`);
    } catch (error) {
      errors.push(`Curation: ${error instanceof Error ? error.message : "Unknown"}`);
      console.log(`    ✗ Curation failed`);
    }
  } else {
    console.log(`    ○ Skipped`);
  }
  stages.curation.durationMs = Date.now() - curationStart;

  // =========================================================================
  // STAGE 2.75: PERSONALIZATION
  // =========================================================================
  console.log("\n[Stage 2.75] 👤 Personalizing...");
  const personalizationStart = Date.now();

  let personalization: PersonalizationResult | undefined;
  let personalizationData: DailyDigestContent["personalization"] = null;

  if (!config.skipPersonalization && config.userId && contentResult) {
    try {
      personalization = await personalizeContentV2(
        config.userId,
        contentResult as ContentSelectionV2,
        { enabled: true, locationBoosting: true, commuteRelevance: true }
      );
      personalizationData = {
        userId: personalization.userId,
        neighborhood: personalization.userProfile?.neighborhood,
        optimalDeliveryTime: personalization.optimalDeliveryTime?.time,
        boostedCount: personalization.stats.boosted,
        filteredCount: personalization.stats.filtered,
      };
      stages.personalization.boosted = personalization.stats.boosted;
      stages.personalization.success = true;
      console.log(`    ✓ Boosted ${personalization.stats.boosted}, filtered ${personalization.stats.filtered}`);
    } catch (error) {
      errors.push(`Personalization: ${error instanceof Error ? error.message : "Unknown"}`);
      console.log(`    ✗ Personalization failed`);
    }
  } else {
    console.log(`    ○ Skipped (${!config.userId ? "no userId" : "disabled"})`);
  }
  stages.personalization.durationMs = Date.now() - personalizationStart;

  // =========================================================================
  // STAGE 3: HORIZON - Proactive alerts from knowledge base
  // =========================================================================
  console.log("\n[Stage 3] 🔮 Generating horizon alerts...");
  const horizonStart = Date.now();

  let horizonAlerts: HorizonAlert[] = [];
  let premiumAlerts: HorizonAlert[] = [];

  if (!config.skipHorizon) {
    try {
      const horizonResult = await generateHorizonAlerts({
        today,
        includePremium: true,
        maxAlerts: 30,
      });

      totalTokens += horizonResult.tokensUsed;
      errors.push(...horizonResult.errors);

      const partitioned = partitionAlertsByPremium(horizonResult.alerts);
      horizonAlerts = partitioned.free;
      if (config.isPremium) {
        premiumAlerts = partitioned.premium;
      }
      stages.horizon.alertsGenerated = horizonResult.alerts.length;
      stages.horizon.success = true;
      console.log(`    ✓ Generated ${horizonAlerts.length} free, ${premiumAlerts.length} premium alerts`);
    } catch (error) {
      errors.push(`Horizon: ${error instanceof Error ? error.message : "Unknown"}`);
      console.log(`    ✗ Horizon generation failed`);
    }
  } else {
    console.log(`    ○ Skipped`);
  }
  stages.horizon.durationMs = Date.now() - horizonStart;

  // =========================================================================
  // STAGE 3.5: WEEKEND PLANNER (Thu-Sat only)
  // =========================================================================
  let weekendPlan: WeekendPlan | null = null;
  try {
    weekendPlan = await generateWeekendPlan(weather, today);
    if (weekendPlan) {
      console.log(`\n[Stage 3.5] 🗓️  Weekend plan: ${weekendPlan.outdoorPicks.length} outdoor, ${weekendPlan.indoorAlternatives.length} indoor, ${weekendPlan.freeThings.length} free`);
    }
  } catch (error) {
    errors.push(`Weekend: ${error instanceof Error ? error.message : "Unknown"}`);
  }

  // =========================================================================
  // STAGE 3.75: MONEY SAVER (always runs)
  // =========================================================================
  let moneySaver: MoneySaverResult | null = null;
  try {
    moneySaver = await aggregateMoneySavers(today);
    if (moneySaver && moneySaver.totalSavings > 0) {
      console.log(`\n[Stage 3.75] 💰 Money saver: ${moneySaver.totalSavings} active deals`);
    }
  } catch (error) {
    errors.push(`MoneySaver: ${error instanceof Error ? error.message : "Unknown"}`);
  }

  // =========================================================================
  // BUILD BRIEFING ITEMS (max 6 headlines for clean digest)
  // =========================================================================
  const briefingItems = buildBriefingItems(alerts, unclustered, curation, 6);

  // =========================================================================
  // BUILD AGENDA
  // =========================================================================
  const agendaEnd = today.plus({ days: agendaWindowDays });
  let agendaEvents: AgendaEvent[] = [];

  try {
    const events = await prisma.cityEvent.findMany({
      where: {
        startsAt: { gte: today.toJSDate(), lte: agendaEnd.toJSDate() },
        status: "published",
      },
      orderBy: { startsAt: "asc" },
      take: 32,
    });

    agendaEvents = events.map((e) => ({
      id: e.id,
      title: e.title,
      date: DateTime.fromJSDate(e.startsAt!),
      time: e.startsAt ? DateTime.fromJSDate(e.startsAt).toFormat("h:mm a") : undefined,
      venue: e.venue || undefined,
      category: e.category,
      neighborhood: e.neighborhood || undefined,
    }));
  } catch (error) {
    errors.push(`Agenda: ${error instanceof Error ? error.message : "Unknown"}`);
  }

  // =========================================================================
  // BUILD SUBJECT LINE
  // =========================================================================
  const subjectLine = buildSubjectLine(today, weather, horizonAlerts, clusters, news, briefingItems);

  // =========================================================================
  // CALCULATE METADATA
  // =========================================================================
  const processingTimeMs = Date.now() - startTime;
  const estimatedCost = (totalTokens / 1_000_000) * 5; // $5/1M tokens average

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    DIGEST COMPLETE                           ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Weather: ${weather ? `${weather.emoji} ${weather.summary}` : "N/A"}`.padEnd(63) + "║");
  console.log(`║  Horizon: ${horizonAlerts.length} alerts`.padEnd(63) + "║");
  console.log(`║  Deep Dive: ${clusters.length} clusters`.padEnd(63) + "║");
  console.log(`║  Briefing: ${briefingItems.length} items`.padEnd(63) + "║");
  console.log(`║  Agenda: ${agendaEvents.length} events`.padEnd(63) + "║");
  console.log(`║  Weekend: ${weekendPlan ? `${weekendPlan.outdoorPicks.length + weekendPlan.indoorAlternatives.length} picks` : "N/A (Mon-Wed)"}`.padEnd(63) + "║");
  console.log(`║  Money Saver: ${moneySaver ? `${moneySaver.totalSavings} deals` : "none"}`.padEnd(63) + "║");
  console.log(`║  Tokens: ${totalTokens} (~$${estimatedCost.toFixed(4)})`.padEnd(63) + "║");
  console.log(`║  Time: ${processingTimeMs}ms`.padEnd(63) + "║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  return {
    weather,
    subjectLine,
    horizon: { alerts: horizonAlerts, premiumAlerts },
    deepDive: { clusters, clustersForEmail, featuredCluster: clusters[0] || null },
    briefing: { items: briefingItems },
    agenda: { events: agendaEvents, windowDays: agendaWindowDays },
    personalization: personalizationData,
    weekendPlan,
    moneySaver,
    standardContent: { news, alerts },
    meta: {
      generatedAt: today,
      dayOfWeek: today.toFormat("EEEE"),
      isWeekend,
      tokensUsed: totalTokens,
      estimatedCost,
      processingTimeMs,
      errors,
      stages,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getAgendaWindow(dayOfWeek: number): number {
  switch (dayOfWeek) {
    case 4: return 4; // Thu: show Fri-Sun
    case 5: return 3; // Fri: show Fri-Sun
    case 6: return 2; // Sat: show Sat-Sun
    case 7: return 1; // Sun: show Sun
    default: return 2; // Mon-Wed: 48 hours
  }
}

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

function getCategoryIcon(moduleId?: string): string {
  const icons: Record<string, string> = {
    parking: "🚗", transit: "🚇", weather: "🌤️", safety: "⚠️",
    civic: "🏛️", culture: "🎭", education: "🎒", housing: "🏠",
    news: "📰", alert: "🔔",
  };
  return icons[moduleId || "alert"] || "📌";
}

// Daily ridership estimates by line (source: MTA 2023 data, in thousands)
const SUBWAY_RIDERSHIP: Record<string, number> = {
  "1": 450, "2": 400, "3": 350,
  "4": 500, "5": 450, "6": 550,  // Lex line = highest
  "7": 400,
  "A": 500, "C": 300, "E": 400,
  "B": 250, "D": 350, "F": 400, "M": 200,
  "G": 150,
  "J": 200, "Z": 50,
  "L": 350,
  "N": 300, "Q": 350, "R": 350, "W": 200,
  "S": 100, "SIR": 25,  // Staten Island = lowest
};

/**
 * Extract subway lines mentioned in alert title/body and calculate ridership impact.
 */
function getTransitRidershipScore(title: string, body: string): number {
  const text = `${title} ${body}`.toUpperCase();
  let totalRidership = 0;

  // Match [X] pattern for subway lines
  const lineMatches = text.match(/\[([A-Z0-9]+)\]/g) || [];
  for (const match of lineMatches) {
    const line = match.replace(/[\[\]]/g, "");
    totalRidership += SUBWAY_RIDERSHIP[line] || 0;
  }

  // Also check for written-out lines
  for (const [line, ridership] of Object.entries(SUBWAY_RIDERSHIP)) {
    if (line === "SIR" && text.includes("SIR")) {
      totalRidership += ridership;
    }
  }

  return totalRidership;
}

function buildBriefingItems(
  alerts: ScoredAlertEvent[],
  unclustered: ClusterableArticle[],
  curation: CurationResult | undefined,
  maxItems: number
): BriefingItem[] {
  const items: BriefingItem[] = [];

  // Separate transit alerts from other alerts using content-based detection
  const transitAlerts = alerts.filter(a => {
    const text = `${a.title || ""} ${a.body || ""}`.toLowerCase();
    return a.title?.includes("[") || // Subway line indicator like [A], [1]
           text.includes("train") ||
           text.includes("subway") ||
           text.includes("mta");
  });
  const otherAlerts = alerts.filter(a => !transitAlerts.includes(a));

  // Sort transit alerts by ridership impact (highest first)
  const sortedTransitAlerts = transitAlerts
    .map(alert => ({
      alert,
      ridership: getTransitRidershipScore(alert.title || "", alert.body || ""),
    }))
    .sort((a, b) => b.ridership - a.ridership)
    .slice(0, 2)  // Max 2 transit alerts in tight 6-item briefing
    .map(({ alert }) => alert);

  // Add high-ridership transit alerts with proper structure
  for (const alert of sortedTransitAlerts) {
    if (items.length >= maxItems) break;
    const curatedItem = curation?.curatedContent.find((c) => c.item.id === alert.id);
    items.push({
      id: alert.id,
      title: alert.title,
      body: alert.body || "",
      source: "CityPing",
      category: alert.category || "breaking",
      icon: "🚇",
      whyYouShouldCare: curatedItem?.whyYouShouldCare,
    });
  }

  // Add other (non-transit) alerts - max 2
  for (const alert of otherAlerts.slice(0, 2)) {
    if (items.length >= maxItems) break;
    const curatedItem = curation?.curatedContent.find((c) => c.item.id === alert.id);
    items.push({
      id: alert.id,
      title: alert.title,
      body: alert.body || "",
      source: "CityPing",
      category: alert.category || "alert",
      icon: getCategoryIcon(alert.category),
      whyYouShouldCare: curatedItem?.whyYouShouldCare,
    });
  }

  // Fill remaining slots with top news
  // Skip articles with AI refusal summaries or that fail content quality checks
  const AI_REFUSAL_PREFIXES = ["i cannot provide", "i can't provide", "i'm unable to", "as an ai"];
  for (const article of unclustered) {
    if (items.length >= maxItems) break;
    const summary = article.summary || "";
    const summaryLower = summary.toLowerCase();
    if (AI_REFUSAL_PREFIXES.some(p => summaryLower.startsWith(p))) continue;
    if (isBlockedContent(article.title, summary)) continue;
    const curatedItem = curation?.curatedContent.find((c) => c.item.id === article.id);
    items.push({
      id: article.id,
      title: article.title,
      body: summary,
      source: article.source,
      category: "news",
      icon: "📰",
      whyYouShouldCare: curatedItem?.whyYouShouldCare,
    });
  }

  return items.slice(0, maxItems);
}

function buildSubjectLine(
  today: DateTime,
  weather: WeatherData | null,
  horizonAlerts: HorizonAlert[],
  clusters: StoryCluster[],
  news: ScoredNewsArticle[],
  briefingItems: BriefingItem[]
): NanoAppSubject {
  const dayDate = today.toFormat("EEE, LLL d");
  const weatherBite = weather
    ? `${weather.emoji} ${weather.high}°F ${weather.condition.split(" ")[0].toLowerCase()}`
    : "";

  let hook = "";
  if (horizonAlerts.length > 0 && horizonAlerts[0].urgency === "high") {
    hook = `${horizonAlerts[0].event.icon} ${horizonAlerts[0].event.shortTitle}: ${horizonAlerts[0].message.slice(0, 40)}`;
  } else if (clusters.length > 0) {
    hook = `📰 ${clusters[0].theme}: ${clusters[0].headline.slice(0, 40)}`;
  } else if (news.length > 0) {
    hook = `📰 ${news[0].title.slice(0, 50)}`;
  }

  const full = `NYC TODAY ${dayDate} ${weatherBite} ${hook}`.trim();

  return {
    full: full.slice(0, 120),
    preheader: clusters.length > 0
      ? `Plus ${clusters.length} story clusters and ${briefingItems.length} quick hits`
      : `${news.length} stories for your day`,
    bites: [],
    characterCount: full.length,
  };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export function summarizeDigest(digest: DailyDigestContent): string {
  const { weather, horizon, deepDive, briefing, agenda, meta } = digest;

  return [
    `Daily Digest Summary (${meta.dayOfWeek})`,
    `${"─".repeat(50)}`,
    weather ? `Weather: ${weather.emoji} ${weather.summary}` : "Weather: N/A",
    digest.subjectLine ? `Subject: ${digest.subjectLine.full.slice(0, 60)}...` : "Subject: N/A",
    `Horizon: ${horizon.alerts.length} free, ${horizon.premiumAlerts.length} premium`,
    `Deep Dive: ${deepDive.clusters.length} clusters`,
    `Briefing: ${briefing.items.length} items`,
    `Agenda: ${agenda.events.length} events (${agenda.windowDays}-day window)`,
    digest.weekendPlan ? `Weekend: ${digest.weekendPlan.outdoorPicks.length} outdoor, ${digest.weekendPlan.indoorAlternatives.length} indoor, ${digest.weekendPlan.freeThings.length} free` : "",
    digest.moneySaver ? `Money Saver: ${digest.moneySaver.totalSavings} active deals` : "",
    ``,
    `Tokens: ${meta.tokensUsed} (~$${meta.estimatedCost.toFixed(4)})`,
    `Time: ${meta.processingTimeMs}ms`,
    meta.errors.length > 0 ? `Errors: ${meta.errors.join("; ")}` : "",
  ].filter(Boolean).join("\n");
}

export function isDigestViable(digest: DailyDigestContent): boolean {
  return (
    digest.horizon.alerts.length > 0 ||
    digest.deepDive.clusters.length > 0 ||
    digest.briefing.items.length > 0 ||
    digest.agenda.events.length > 0 ||
    digest.standardContent.news.length > 0
  );
}

export type { HorizonAlert, StoryCluster, ClusterForEmail };
