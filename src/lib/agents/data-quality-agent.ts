/**
 * DATA QUALITY AGENT
 *
 * Stage 2 of the CityPing multi-agent pipeline.
 *
 * Role: The Quality Assurance Director
 *
 * Responsibilities:
 * - Monitor scraper health and success rates
 * - Validate data integrity (no nulls, proper formats, no duplicates)
 * - Detect anomalies (sudden drops in content, unusual patterns)
 * - Score data sources by reliability
 * - Recommend best sources for each content type
 * - Alert on degraded data quality
 * - Auto-heal common issues (retry failed scrapers, clean bad data)
 *
 * Output: ContentSelectionV2 with full Prisma records and scores
 *
 * Philosophy: Bad data is worse than no data. Catch problems before users see them.
 */

import { prisma } from "../db";
import { DateTime } from "luxon";

// Import unified types and scoring
import {
  scoreContent,
  categorizeContent,
  generateDedupKey,
  meetsQualityThreshold,
  QUALITY_THRESHOLDS,
} from "./scoring";

import { DATA_SOURCES as UNIFIED_DATA_SOURCES } from "./data-sources";

import type {
  ContentSelectionV2,
  SelectionConfigV2,
  ScoredNewsArticle,
  ScoredAlertEvent,
  ScoredParkEvent,
  ScoredDiningDeal,
  ContentCategory,
  ContentScores,
} from "./types";

import { DEFAULT_SELECTION_CONFIG } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface DataSource {
  id: string;
  name: string;
  type: "scraper" | "api" | "feed";
  endpoint: string;
  expectedFrequency: "realtime" | "hourly" | "daily" | "weekly";
  minItemsExpected: number;
  criticalForDigest: boolean;
}

export interface SourceHealth {
  sourceId: string;
  sourceName: string;
  status: "healthy" | "degraded" | "failing" | "dead";
  lastSuccess: Date | null;
  lastFailure: Date | null;
  successRate24h: number;
  avgLatencyMs: number;
  itemCount24h: number;
  itemCountTrend: "rising" | "stable" | "falling" | "critical";
  issues: string[];
  recommendations: string[];
}

export interface DataQualityReport {
  timestamp: string;
  overallHealth: "healthy" | "degraded" | "critical";
  sources: SourceHealth[];
  anomalies: Anomaly[];
  duplicateCount: number;
  staleDataCount: number;
  readyForDigest: boolean;
  healingActions: DataQualityHealingAction[];
}

export interface Anomaly {
  type: "volume_drop" | "volume_spike" | "stale_data" | "duplicate_surge" | "error_spike";
  sourceId: string;
  severity: "low" | "medium" | "high";
  description: string;
  detectedAt: Date;
}

export interface DataQualityHealingAction {
  action: "retry_scraper" | "clear_duplicates" | "refresh_cache" | "alert_admin";
  sourceId?: string;
  status: "pending" | "executed" | "failed";
  result?: string;
}

// =============================================================================
// DATA SOURCE REGISTRY
// =============================================================================

export const DATA_SOURCES: DataSource[] = [
  // News Sources
  {
    id: "news_gothamist",
    name: "Gothamist",
    type: "scraper",
    endpoint: "/api/jobs/ingest/news-multi?tier=1",
    expectedFrequency: "hourly",
    minItemsExpected: 5,
    criticalForDigest: true,
  },
  {
    id: "news_thecity",
    name: "THE CITY",
    type: "scraper",
    endpoint: "/api/jobs/ingest/news-multi?tier=1",
    expectedFrequency: "hourly",
    minItemsExpected: 3,
    criticalForDigest: true,
  },
  {
    id: "news_curation",
    name: "AI News Curation",
    type: "api",
    endpoint: "/api/jobs/curate-news",
    expectedFrequency: "daily",
    minItemsExpected: 3,
    criticalForDigest: true,
  },

  // Transit
  {
    id: "mta_alerts",
    name: "MTA Subway Alerts",
    type: "api",
    endpoint: "/api/jobs/ingest/mta-alerts",
    expectedFrequency: "realtime",
    minItemsExpected: 0, // Alerts are event-driven
    criticalForDigest: true,
  },

  // Weather
  {
    id: "weather",
    name: "Weather (Open-Meteo)",
    type: "api",
    endpoint: "external",
    expectedFrequency: "hourly",
    minItemsExpected: 1,
    criticalForDigest: true,
  },

  // Deals & Events
  {
    id: "sample_sales",
    name: "Sample Sales",
    type: "scraper",
    endpoint: "/api/jobs/ingest/sample-sales",
    expectedFrequency: "daily",
    minItemsExpected: 1,
    criticalForDigest: false,
  },
  {
    id: "housing_lottery",
    name: "Housing Lotteries",
    type: "scraper",
    endpoint: "/api/jobs/ingest/housing-lotteries",
    expectedFrequency: "daily",
    minItemsExpected: 0,
    criticalForDigest: false,
  },

  // City Services
  {
    id: "nyc_311",
    name: "NYC 311 Service Alerts",
    type: "scraper",
    endpoint: "/api/jobs/scrape-311",
    expectedFrequency: "hourly",
    minItemsExpected: 0,
    criticalForDigest: false,
  },
  {
    id: "air_quality",
    name: "Air Quality Index",
    type: "api",
    endpoint: "/api/jobs/scrape-air-quality",
    expectedFrequency: "daily",
    minItemsExpected: 1,
    criticalForDigest: false,
  },

  // Events
  {
    id: "parks_events",
    name: "NYC Parks Events",
    type: "scraper",
    endpoint: "/api/jobs/scrape-parks",
    expectedFrequency: "daily",
    minItemsExpected: 5,
    criticalForDigest: false,
  },
  {
    id: "museums",
    name: "Museum Free Days",
    type: "scraper",
    endpoint: "/api/jobs/seed-museums",
    expectedFrequency: "weekly",
    minItemsExpected: 5,
    criticalForDigest: false,
  },
];

// =============================================================================
// HEALTH CHECK FUNCTIONS
// =============================================================================

/**
 * Check health of a single data source.
 */
async function checkSourceHealth(source: DataSource): Promise<SourceHealth> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const now = DateTime.now();
  const past24h = now.minus({ hours: 24 }).toJSDate();

  // Get job runs for this source
  const jobRuns = await prisma.jobRun.findMany({
    where: {
      jobName: { contains: source.id.replace("_", "-") },
      startedAt: { gte: past24h },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  const successfulRuns = jobRuns.filter(r => r.status === "success");
  const failedRuns = jobRuns.filter(r => r.status === "failed");
  const successRate = jobRuns.length > 0 ? (successfulRuns.length / jobRuns.length) * 100 : 0;

  const lastSuccess = successfulRuns[0]?.startedAt || null;
  const lastFailure = failedRuns[0]?.startedAt || null;

  // Calculate average latency
  const latencies = jobRuns
    .filter(r => r.durationMs)
    .map(r => r.durationMs!);
  const avgLatencyMs = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;

  // Get item count based on source type
  let itemCount24h = 0;
  try {
    if (source.id.startsWith("news")) {
      itemCount24h = await prisma.newsArticle.count({
        where: { createdAt: { gte: past24h } },
      });
    } else if (source.id === "mta_alerts") {
      itemCount24h = await prisma.alertEvent.count({
        where: {
          createdAt: { gte: past24h },
          source: { moduleId: "transit" },
        },
      });
    } else if (source.id === "park_events") {
      itemCount24h = await prisma.parkEvent.count({
        where: { createdAt: { gte: past24h } },
      });
    } else if (source.id === "dining_deals") {
      itemCount24h = await prisma.diningDeal.count({
        where: { createdAt: { gte: past24h } },
      });
    }
  } catch {
    // Table might not exist
  }

  // Determine item count trend
  let itemCountTrend: SourceHealth["itemCountTrend"] = "stable";
  if (itemCount24h === 0 && source.minItemsExpected > 0) {
    itemCountTrend = "critical";
    issues.push("No items in last 24 hours");
  } else if (itemCount24h < source.minItemsExpected) {
    itemCountTrend = "falling";
    issues.push(`Below expected item count (${itemCount24h}/${source.minItemsExpected})`);
  }

  // Check for staleness
  if (lastSuccess) {
    const hoursSinceSuccess = now.diff(DateTime.fromJSDate(lastSuccess), "hours").hours;
    const expectedHours = {
      realtime: 0.5,
      hourly: 2,
      daily: 26,
      weekly: 170,
    };

    if (hoursSinceSuccess > expectedHours[source.expectedFrequency]) {
      issues.push(`Stale data - last success ${Math.round(hoursSinceSuccess)}h ago`);
      recommendations.push("Trigger manual refresh");
    }
  } else {
    issues.push("No successful runs recorded");
    recommendations.push("Check scraper configuration");
  }

  // Check error rate
  if (successRate < 50) {
    issues.push(`High failure rate (${Math.round(100 - successRate)}%)`);
    recommendations.push("Review error logs and fix scraper");
  }

  // Determine overall status
  let status: SourceHealth["status"] = "healthy";
  if (issues.length >= 3 || successRate < 30) {
    status = "dead";
  } else if (issues.length >= 2 || successRate < 70) {
    status = "failing";
  } else if (issues.length >= 1 || successRate < 90) {
    status = "degraded";
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    status,
    lastSuccess,
    lastFailure,
    successRate24h: Math.round(successRate),
    avgLatencyMs,
    itemCount24h,
    itemCountTrend,
    issues,
    recommendations,
  };
}

// =============================================================================
// ANOMALY DETECTION
// =============================================================================

/**
 * Detect anomalies across all data sources.
 */
async function detectAnomalies(): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];
  const now = DateTime.now();

  // Check for duplicate surge in news
  const recentNews = await prisma.newsArticle.findMany({
    where: { createdAt: { gte: now.minus({ hours: 6 }).toJSDate() } },
    select: { title: true, source: true },
  });

  const titleCounts = new Map<string, number>();
  for (const article of recentNews) {
    const key = article.title.toLowerCase().slice(0, 50);
    titleCounts.set(key, (titleCounts.get(key) || 0) + 1);
  }

  const duplicateCount = Array.from(titleCounts.values()).filter(c => c > 1).length;
  if (duplicateCount > 5) {
    anomalies.push({
      type: "duplicate_surge",
      sourceId: "news",
      severity: duplicateCount > 20 ? "high" : "medium",
      description: `${duplicateCount} duplicate news titles detected`,
      detectedAt: new Date(),
    });
  }

  // Check for volume drops
  const past24h = now.minus({ hours: 24 }).toJSDate();
  const past48h = now.minus({ hours: 48 }).toJSDate();

  const newsCount24h = await prisma.newsArticle.count({
    where: { createdAt: { gte: past24h } },
  });

  const newsCount48h = await prisma.newsArticle.count({
    where: {
      createdAt: { gte: past48h, lt: past24h }
    },
  });

  if (newsCount48h > 0 && newsCount24h < newsCount48h * 0.3) {
    anomalies.push({
      type: "volume_drop",
      sourceId: "news",
      severity: "high",
      description: `News volume dropped ${Math.round((1 - newsCount24h / newsCount48h) * 100)}% vs yesterday`,
      detectedAt: new Date(),
    });
  }

  return anomalies;
}

// =============================================================================
// AUTO-HEALING
// =============================================================================

/**
 * Attempt to heal common data quality issues.
 */
async function executeHealingActions(
  sources: SourceHealth[]
): Promise<DataQualityHealingAction[]> {
  const actions: DataQualityHealingAction[] = [];

  for (const source of sources) {
    // Retry failing scrapers
    if (source.status === "failing" || source.status === "dead") {
      const dataSource = DATA_SOURCES.find(s => s.id === source.sourceId);
      if (dataSource && dataSource.endpoint !== "external") {
        actions.push({
          action: "retry_scraper",
          sourceId: source.sourceId,
          status: "pending",
        });

        // Actually trigger the scraper
        try {
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";

          await fetch(`${baseUrl}${dataSource.endpoint}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${process.env.CRON_SECRET}`,
              "x-cron-secret": process.env.CRON_SECRET || "",
            },
          });

          actions[actions.length - 1].status = "executed";
          actions[actions.length - 1].result = "Scraper triggered";
        } catch (error) {
          actions[actions.length - 1].status = "failed";
          actions[actions.length - 1].result = error instanceof Error ? error.message : "Unknown error";
        }
      }
    }
  }

  return actions;
}

// =============================================================================
// MAIN QUALITY REPORT
// =============================================================================

/**
 * Generate comprehensive data quality report.
 */
export async function generateDataQualityReport(): Promise<DataQualityReport> {
  console.log("[DataQuality] Generating data quality report...");

  // Check all sources
  const sourceHealthPromises = DATA_SOURCES.map(checkSourceHealth);
  const sources = await Promise.all(sourceHealthPromises);

  // Detect anomalies
  const anomalies = await detectAnomalies();

  // Count duplicates and stale data
  const past24h = DateTime.now().minus({ hours: 24 }).toJSDate();
  const duplicateCount = 0; // Would need actual dedup logic
  const staleDataCount = sources.filter(s => s.status === "dead" || s.itemCountTrend === "critical").length;

  // Check if ready for digest
  const criticalSources = sources.filter(s => {
    const config = DATA_SOURCES.find(d => d.id === s.sourceId);
    return config?.criticalForDigest;
  });
  const readyForDigest = criticalSources.every(s => s.status !== "dead");

  // Determine overall health
  const deadCount = sources.filter(s => s.status === "dead").length;
  const failingCount = sources.filter(s => s.status === "failing").length;

  let overallHealth: DataQualityReport["overallHealth"] = "healthy";
  if (deadCount > 0 || !readyForDigest) {
    overallHealth = "critical";
  } else if (failingCount > 0 || anomalies.some(a => a.severity === "high")) {
    overallHealth = "degraded";
  }

  // Execute healing actions
  const healingActions = await executeHealingActions(sources);

  console.log(`[DataQuality] Report complete: ${overallHealth}`);
  console.log(`[DataQuality] Sources: ${sources.filter(s => s.status === "healthy").length}/${sources.length} healthy`);
  console.log(`[DataQuality] Anomalies: ${anomalies.length}`);
  console.log(`[DataQuality] Ready for digest: ${readyForDigest}`);

  return {
    timestamp: DateTime.now().toISO()!,
    overallHealth,
    sources,
    anomalies,
    duplicateCount,
    staleDataCount,
    readyForDigest,
    healingActions,
  };
}

// =============================================================================
// BEST SOURCE RECOMMENDATION
// =============================================================================

/**
 * Recommend best sources for a given content type.
 */
export function recommendSources(contentType: string): DataSource[] {
  return DATA_SOURCES
    .filter(s => s.id.includes(contentType) || s.name.toLowerCase().includes(contentType))
    .sort((a, b) => {
      // Prioritize critical sources
      if (a.criticalForDigest !== b.criticalForDigest) {
        return a.criticalForDigest ? -1 : 1;
      }
      // Then by expected frequency (more frequent = more reliable)
      const freqOrder = { realtime: 0, hourly: 1, daily: 2, weekly: 3 };
      return freqOrder[a.expectedFrequency] - freqOrder[b.expectedFrequency];
    });
}

// =============================================================================
// COMPATIBILITY EXPORTS (for agent-orchestrator)
// =============================================================================

export interface QualityScore {
  overall: number;
  freshness: number;
  completeness: number;
  accuracy: number;
}

export interface SelectionConfig {
  maxItems?: number;
  minScore?: number;
  categories?: string[];
  maxNews?: number;
  maxAlerts?: number;
  maxDeals?: number;
  maxEvents?: number;
  minQuality?: number;
  minQualityScore?: number;
  lookbackHours?: number;
}

export interface ContentSelection {
  news: Array<{ id: string; title: string; score: number }>;
  alerts: Array<{ id: string; title: string; score: number }>;
  events: Array<{ id: string; name: string; score: number }>;
  dining: Array<{ id: string; brand: string; score: number }>;
  summary: {
    total: number;
    selected: number;
    totalSelected: number;
    totalEvaluated: number;
    averageQuality: number;
    topSources: string[];
    categories: Record<string, number>;
  };
}

/**
 * Select best content based on quality scores.
 */
export async function selectBestContent(config?: SelectionConfig): Promise<ContentSelection> {
  const report = await generateDataQualityReport();

  // Get content from database
  const now = DateTime.now();
  const past24h = now.minus({ hours: 24 }).toJSDate();

  const [news, alerts, events, dining] = await Promise.all([
    prisma.newsArticle.findMany({
      where: { createdAt: { gte: past24h } },
      orderBy: { createdAt: "desc" },
      take: config?.maxItems || 10,
    }),
    prisma.alertEvent.findMany({
      where: { createdAt: { gte: past24h } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.parkEvent.findMany({
      where: {
        date: {
          gte: new Date(),
          lte: now.plus({ days: 7 }).toJSDate(),
        },
      },
      orderBy: { date: "asc" },
      take: 5,
    }).catch(() => []),
    prisma.diningDeal.findMany({
      where: {
        endDate: { gte: new Date() },
      },
      take: 5,
    }).catch(() => []), // Table might not exist
  ]);

  // Score items (simple scoring based on recency)
  const scoreItem = (createdAt: Date): number => {
    const hours = now.diff(DateTime.fromJSDate(createdAt), "hours").hours;
    return Math.max(0, 100 - hours * 5);
  };

  const totalCount = news.length + alerts.length + events.length + dining.length;

  return {
    news: news.map(n => ({ id: n.id, title: n.title, score: scoreItem(n.createdAt) })),
    alerts: alerts.map(a => ({ id: a.id, title: a.title, score: scoreItem(a.createdAt) })),
    events: events.map(e => ({ id: e.id, name: e.name, score: scoreItem(e.createdAt) })),
    dining: dining.map(d => ({ id: d.id, brand: d.restaurant || d.title || "Deal", score: 80 })),
    summary: {
      total: totalCount,
      selected: totalCount,
      totalSelected: totalCount,
      totalEvaluated: totalCount,
      averageQuality: report.sources.filter(s => s.status === "healthy").length / report.sources.length * 100,
      topSources: report.sources.filter(s => s.status === "healthy").slice(0, 3).map(s => s.sourceName),
      categories: {
        news: news.length,
        alerts: alerts.length,
        events: events.length,
        dining: dining.length,
      },
    },
  };
}

/**
 * Alias for generateDataQualityReport.
 */
export const getDataQualityReport = generateDataQualityReport;

// =============================================================================
// V2 CONTENT SELECTION - Returns full Prisma records with unified scoring
// =============================================================================

/**
 * Select best content using unified scoring algorithm.
 * Returns full Prisma records (not just IDs) with scores and category groupings.
 *
 * This is the main Stage 2 output function for the V2 pipeline.
 *
 * Key improvements over selectBestContent:
 * - Actually enforces maxNews, maxAlerts, maxDeals, maxEvents
 * - Returns full Prisma records for downstream processing
 * - Uses unified scoring algorithm from ./scoring.ts
 * - Groups content by category for curation stage
 */
export async function selectBestContentV2(
  config: SelectionConfigV2 = {}
): Promise<ContentSelectionV2> {
  const cfg = { ...DEFAULT_SELECTION_CONFIG, ...config };
  const now = DateTime.now();
  const lookbackDate = now.minus({ hours: cfg.lookbackHours || 48 }).toJSDate();

  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 2: DATA QUALITY AGENT - Selecting Best Content       │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  console.log(`[DataQuality] Config: maxNews=${cfg.maxNews}, maxAlerts=${cfg.maxAlerts}, maxDeals=${cfg.maxDeals}, maxEvents=${cfg.maxEvents}`);
  console.log(`[DataQuality] Quality threshold: ${cfg.minQualityScore}, Lookback: ${cfg.lookbackHours}h`);

  // Fetch content from database - get more than we need for filtering
  const fetchLimit = Math.max(
    (cfg.maxNews || 5) * 3,
    (cfg.maxAlerts || 3) * 3,
    (cfg.maxDeals || 3) * 3,
    (cfg.maxEvents || 4) * 3,
    50
  );

  const [rawNews, rawAlerts, rawEvents, rawDining] = await Promise.all([
    prisma.newsArticle.findMany({
      where: {
        OR: [
          { publishedAt: { gte: lookbackDate } },
          { createdAt: { gte: lookbackDate } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: fetchLimit,
    }),
    prisma.alertEvent.findMany({
      where: { createdAt: { gte: lookbackDate } },
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
    }),
    prisma.parkEvent.findMany({
      where: {
        date: {
          gte: new Date(),
          lte: now.plus({ days: 7 }).toJSDate(),
        },
      },
      orderBy: { date: "asc" },
      take: fetchLimit,
    }).catch(() => []),
    prisma.diningDeal.findMany({
      where: {
        endDate: { gte: new Date() },
      },
      orderBy: { fetchedAt: "desc" },
      take: fetchLimit,
    }).catch(() => []),
  ]);

  const totalEvaluated = rawNews.length + rawAlerts.length + rawEvents.length + rawDining.length;
  console.log(`[DataQuality] Evaluating ${totalEvaluated} items (${rawNews.length} news, ${rawAlerts.length} alerts, ${rawEvents.length} events, ${rawDining.length} dining)`);

  // Score and filter news articles
  const scoredNews: ScoredNewsArticle[] = rawNews
    .map((article) => {
      const scores = scoreContent({
        title: article.title,
        body: article.summary || article.snippet,
        url: article.url,
        source: article.source,
        publishedAt: article.publishedAt,
        contentType: "news",
      });
      const category = categorizeContent(article.title, article.summary || article.snippet);
      const dedupKey = generateDedupKey("news", article.title);

      return {
        ...article,
        scores,
        category,
        dedupKey,
      };
    })
    .filter((item) => meetsQualityThreshold(item.scores, cfg.minQualityScore))
    .sort((a, b) => b.scores.overall - a.scores.overall);

  // Deduplicate news by dedupKey
  const newsDeduped = deduplicateByKey(scoredNews);
  const selectedNews = newsDeduped.slice(0, cfg.maxNews || 5);

  // Score and filter alerts
  const scoredAlerts: ScoredAlertEvent[] = rawAlerts
    .map((alert) => {
      const scores = scoreContent({
        title: alert.title,
        body: alert.body,
        publishedAt: alert.createdAt,
        contentType: "alert",
      });
      const category = categorizeContent(alert.title, alert.body, "alert");
      const dedupKey = generateDedupKey("alert", alert.title);

      return {
        ...alert,
        scores,
        category,
        dedupKey,
      };
    })
    .filter((item) => meetsQualityThreshold(item.scores, cfg.minQualityScore))
    .sort((a, b) => b.scores.overall - a.scores.overall);

  const alertsDeduped = deduplicateByKey(scoredAlerts);
  const selectedAlerts = alertsDeduped.slice(0, cfg.maxAlerts || 3);

  // Score and filter events
  const scoredEvents: ScoredParkEvent[] = rawEvents
    .map((event) => {
      const scores = scoreContent({
        title: event.name,
        body: event.description,
        publishedAt: event.createdAt,
        contentType: "event",
      });
      const category = categorizeContent(event.name, event.description, "event");
      const dedupKey = generateDedupKey("event", event.name);

      return {
        ...event,
        scores,
        category,
        dedupKey,
      };
    })
    .filter((item) => meetsQualityThreshold(item.scores, cfg.minQualityScore))
    .sort((a, b) => b.scores.overall - a.scores.overall);

  const eventsDeduped = deduplicateByKey(scoredEvents);
  const selectedEvents = eventsDeduped.slice(0, cfg.maxEvents || 4);

  // Score and filter dining deals
  const scoredDining: ScoredDiningDeal[] = rawDining
    .map((deal) => {
      const scores = scoreContent({
        title: deal.title,
        body: deal.description,
        source: deal.restaurant || undefined,
        publishedAt: deal.fetchedAt,
        contentType: "deal",
      });
      const category: ContentCategory = "money";
      const dedupKey = generateDedupKey("deal", deal.title);

      return {
        ...deal,
        scores,
        category,
        dedupKey,
      };
    })
    .filter((item) => meetsQualityThreshold(item.scores, cfg.minQualityScore))
    .sort((a, b) => b.scores.overall - a.scores.overall);

  const diningDeduped = deduplicateByKey(scoredDining);
  const selectedDining = diningDeduped.slice(0, cfg.maxDeals || 3);

  // Build byCategory grouping
  const allSelected = [
    ...selectedNews,
    ...selectedAlerts,
    ...selectedEvents,
    ...selectedDining,
  ];

  const byCategory: Record<ContentCategory, Array<ScoredNewsArticle | ScoredAlertEvent | ScoredParkEvent | ScoredDiningDeal>> = {
    breaking: [],
    essential: [],
    money: [],
    local: [],
    civic: [],
    culture: [],
    lifestyle: [],
  };

  for (const item of allSelected) {
    byCategory[item.category].push(item);
  }

  // Calculate statistics
  const totalSelected = selectedNews.length + selectedAlerts.length + selectedEvents.length + selectedDining.length;
  const avgQuality = totalSelected > 0
    ? allSelected.reduce((sum, item) => sum + item.scores.overall, 0) / totalSelected
    : 0;

  // Determine top sources
  const sourceCountMap = new Map<string, number>();
  for (const article of selectedNews) {
    const count = sourceCountMap.get(article.source) || 0;
    sourceCountMap.set(article.source, count + 1);
  }
  const topSources = Array.from(sourceCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([source]) => source);

  // Category breakdown
  const categoryBreakdown: Record<ContentCategory, number> = {
    breaking: byCategory.breaking.length,
    essential: byCategory.essential.length,
    money: byCategory.money.length,
    local: byCategory.local.length,
    civic: byCategory.civic.length,
    culture: byCategory.culture.length,
    lifestyle: byCategory.lifestyle.length,
  };

  console.log(`[DataQuality] Selected ${totalSelected} items (${selectedNews.length} news, ${selectedAlerts.length} alerts, ${selectedEvents.length} events, ${selectedDining.length} dining)`);
  console.log(`[DataQuality] Average quality: ${avgQuality.toFixed(1)}`);
  console.log(`[DataQuality] Top sources: ${topSources.join(", ") || "none"}`);

  return {
    news: selectedNews,
    alerts: selectedAlerts,
    events: selectedEvents,
    dining: selectedDining,
    byCategory,
    summary: {
      totalEvaluated,
      totalSelected,
      averageQuality: Math.round(avgQuality),
      topSources,
      categoryBreakdown,
    },
    configApplied: cfg,
  };
}

/**
 * Deduplicate items by their dedupKey, keeping highest scored item.
 */
function deduplicateByKey<T extends { dedupKey: string; scores: ContentScores }>(
  items: T[]
): T[] {
  const seen = new Map<string, T>();

  for (const item of items) {
    const existing = seen.get(item.dedupKey);
    if (!existing || item.scores.overall > existing.scores.overall) {
      seen.set(item.dedupKey, item);
    }
  }

  return Array.from(seen.values());
}

// =============================================================================
// V2 SEMANTIC CONTENT SELECTION - Uses vector embeddings and topic clustering
// =============================================================================

import {
  clusterItems,
  selectTopClusters,
  getClusterStats,
  deduplicateItems,
  type TopicCluster,
  type ClusterStats,
} from "../embeddings";

/**
 * Configuration for semantic content selection.
 * Extends SelectionConfigV2 with semantic-specific options.
 */
export interface SemanticSelectionConfig extends SelectionConfigV2 {
  /** Enable semantic clustering and deduplication */
  semanticEnabled: boolean;
  /** Similarity threshold for clustering (default 0.85) */
  clusterSimilarityThreshold?: number;
  /** Similarity threshold for deduplication (default 0.92) */
  dedupSimilarityThreshold?: number;
}

/**
 * Extended content selection result with semantic clustering data.
 */
export interface ContentSelectionV2Semantic extends ContentSelectionV2 {
  /** Topic clusters for news and alerts */
  clusters: {
    news: TopicCluster[];
    alerts: TopicCluster[];
  };
  /** Semantic processing statistics */
  semanticStats: {
    totalClustersFound: number;
    avgClusterSize: number;
    duplicatesRemoved: number;
    newsWithEmbeddings: number;
    alertsWithEmbeddings: number;
  };
}

/**
 * Select best content using semantic understanding.
 *
 * Key improvements over selectBestContentV2:
 * - Groups related articles into topic clusters
 * - Selects representative article from each cluster (not just top N)
 * - Uses vector similarity for deduplication (catches paraphrased duplicates)
 * - Falls back to keyword scoring for items without embeddings
 *
 * @param config - Selection configuration with semantic options
 * @returns Content selection with cluster data
 */
export async function selectBestContentV2Semantic(
  config: SemanticSelectionConfig
): Promise<ContentSelectionV2Semantic> {
  const cfg = {
    ...DEFAULT_SELECTION_CONFIG,
    ...config,
    clusterSimilarityThreshold: config.clusterSimilarityThreshold ?? 0.85,
    dedupSimilarityThreshold: config.dedupSimilarityThreshold ?? 0.92,
  };

  const now = DateTime.now();
  const lookbackDate = now.minus({ hours: cfg.lookbackHours || 48 }).toJSDate();

  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 2: DATA QUALITY AGENT - Semantic Content Selection   │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  console.log(`[DataQuality] Semantic mode: enabled=${cfg.semanticEnabled}`);
  console.log(`[DataQuality] Cluster threshold: ${cfg.clusterSimilarityThreshold}, Dedup threshold: ${cfg.dedupSimilarityThreshold}`);

  // If semantic not enabled, fall back to standard selection
  if (!cfg.semanticEnabled) {
    const standardResult = await selectBestContentV2(config);
    return {
      ...standardResult,
      clusters: { news: [], alerts: [] },
      semanticStats: {
        totalClustersFound: 0,
        avgClusterSize: 0,
        duplicatesRemoved: 0,
        newsWithEmbeddings: 0,
        alertsWithEmbeddings: 0,
      },
    };
  }

  // Fetch content with embeddings using raw SQL for pgvector
  const fetchLimit = Math.max(
    (cfg.maxNews || 5) * 5,
    (cfg.maxAlerts || 3) * 5,
    100
  );

  // Fetch news articles with embeddings
  const rawNewsWithEmbeddings = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      snippet: string | null;
      summary: string | null;
      source: string;
      url: string;
      published_at: Date;
      created_at: Date;
      embedding: string | null; // pgvector returns as string
    }>
  >(
    `SELECT id, title, snippet, summary, source, url, published_at, created_at,
            embedding::text
     FROM "news_articles"
     WHERE (published_at >= $1 OR created_at >= $1)
     ORDER BY published_at DESC
     LIMIT $2`,
    lookbackDate,
    fetchLimit
  );

  // Fetch alert events with embeddings
  const rawAlertsWithEmbeddings = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      body: string | null;
      created_at: Date;
      embedding: string | null;
    }>
  >(
    `SELECT id, title, body, created_at, embedding::text
     FROM "alert_events"
     WHERE created_at >= $1
     ORDER BY created_at DESC
     LIMIT $2`,
    lookbackDate,
    fetchLimit
  );

  // Also fetch events and dining (these don't have embeddings yet)
  const [rawEvents, rawDining] = await Promise.all([
    prisma.parkEvent.findMany({
      where: {
        date: {
          gte: new Date(),
          lte: now.plus({ days: 7 }).toJSDate(),
        },
      },
      orderBy: { date: "asc" },
      take: fetchLimit,
    }).catch(() => []),
    prisma.diningDeal.findMany({
      where: {
        endDate: { gte: new Date() },
      },
      orderBy: { fetchedAt: "desc" },
      take: fetchLimit,
    }).catch(() => []),
  ]);

  // Parse embeddings and score news
  const newsWithEmbeddings = rawNewsWithEmbeddings.filter(n => n.embedding);
  const newsWithoutEmbeddings = rawNewsWithEmbeddings.filter(n => !n.embedding);

  console.log(`[DataQuality] News: ${newsWithEmbeddings.length} with embeddings, ${newsWithoutEmbeddings.length} without`);

  // Score all news articles
  const scoredNews: ScoredNewsArticle[] = rawNewsWithEmbeddings.map((article) => {
    const scores = scoreContent({
      title: article.title,
      body: article.summary || article.snippet,
      url: article.url,
      source: article.source,
      publishedAt: article.published_at,
      contentType: "news",
    });
    const category = categorizeContent(article.title, article.summary || article.snippet);
    const dedupKey = generateDedupKey("news", article.title);

    return {
      id: article.id,
      title: article.title,
      snippet: article.snippet,
      summary: article.summary,
      source: article.source,
      url: article.url,
      publishedAt: article.published_at,
      createdAt: article.created_at,
      // These fields may not be in raw query, set defaults
      externalId: "",
      author: null,
      imageUrl: null,
      nycAngle: null,
      isSelected: false,
      curatedFor: null,
      curatedAt: null,
      embeddingModel: null,
      embeddingAt: null,
      topicClusterId: null,
      scores,
      category,
      dedupKey,
    } as ScoredNewsArticle;
  });

  // Prepare clusterable items for news with embeddings
  const clusterableNews = newsWithEmbeddings.map((article) => {
    const scored = scoredNews.find(s => s.id === article.id)!;
    return {
      id: article.id,
      embedding: parseEmbedding(article.embedding!),
      score: scored.scores.overall,
      title: article.title,
    };
  });

  // Cluster news articles
  const newsClusters = clusterItems(clusterableNews, cfg.clusterSimilarityThreshold);
  const newsClusterStats = getClusterStats(newsClusters);

  console.log(`[DataQuality] News clusters: ${newsClusters.length}, avg size: ${newsClusterStats.avgClusterSize.toFixed(1)}`);

  // Select top news clusters and get representative articles
  const topNewsClusterIds = selectTopClusters(newsClusters, cfg.maxNews || 5);
  const selectedNewsFromClusters = topNewsClusterIds
    .map(id => scoredNews.find(n => n.id === id))
    .filter((n): n is ScoredNewsArticle => n !== undefined);

  // Add any high-scoring news without embeddings (fallback)
  const newsWithoutEmbeddingsScored = scoredNews
    .filter(n => !newsWithEmbeddings.some(e => e.id === n.id))
    .filter(n => meetsQualityThreshold(n.scores, cfg.minQualityScore))
    .slice(0, Math.max(0, (cfg.maxNews || 5) - selectedNewsFromClusters.length));

  const selectedNews = [...selectedNewsFromClusters, ...newsWithoutEmbeddingsScored]
    .slice(0, cfg.maxNews || 5);

  // Score and cluster alerts
  const alertsWithEmbeddings = rawAlertsWithEmbeddings.filter(a => a.embedding);

  const scoredAlerts: ScoredAlertEvent[] = rawAlertsWithEmbeddings.map((alert) => {
    const scores = scoreContent({
      title: alert.title,
      body: alert.body,
      publishedAt: alert.created_at,
      contentType: "alert",
    });
    const category = categorizeContent(alert.title, alert.body, "alert");
    const dedupKey = generateDedupKey("alert", alert.title);

    return {
      id: alert.id,
      title: alert.title,
      body: alert.body,
      createdAt: alert.created_at,
      // Set defaults for fields not in raw query
      sourceId: "",
      externalId: null,
      startsAt: null,
      endsAt: null,
      neighborhoods: [],
      metadata: {},
      expiresAt: null,
      hypeScore: null,
      hypeFactors: null,
      venueType: null,
      weatherScore: null,
      isWeatherSafe: null,
      embeddingModel: null,
      embeddingAt: null,
      topicClusterId: null,
      scores,
      category,
      dedupKey,
    } as ScoredAlertEvent;
  });

  const clusterableAlerts = alertsWithEmbeddings.map((alert) => {
    const scored = scoredAlerts.find(s => s.id === alert.id)!;
    return {
      id: alert.id,
      embedding: parseEmbedding(alert.embedding!),
      score: scored.scores.overall,
      title: alert.title,
    };
  });

  const alertClusters = clusterItems(clusterableAlerts, cfg.clusterSimilarityThreshold);
  const alertClusterStats = getClusterStats(alertClusters);

  console.log(`[DataQuality] Alert clusters: ${alertClusters.length}, avg size: ${alertClusterStats.avgClusterSize.toFixed(1)}`);

  const topAlertClusterIds = selectTopClusters(alertClusters, cfg.maxAlerts || 3);
  const selectedAlerts = topAlertClusterIds
    .map(id => scoredAlerts.find(a => a.id === id))
    .filter((a): a is ScoredAlertEvent => a !== undefined)
    .slice(0, cfg.maxAlerts || 3);

  // Score events and dining (no semantic processing yet)
  const scoredEvents: ScoredParkEvent[] = rawEvents
    .map((event) => {
      const scores = scoreContent({
        title: event.name,
        body: event.description,
        publishedAt: event.createdAt,
        contentType: "event",
      });
      const category = categorizeContent(event.name, event.description, "event");
      const dedupKey = generateDedupKey("event", event.name);

      return { ...event, scores, category, dedupKey };
    })
    .filter((item) => meetsQualityThreshold(item.scores, cfg.minQualityScore))
    .sort((a, b) => b.scores.overall - a.scores.overall);

  const selectedEvents = deduplicateByKey(scoredEvents).slice(0, cfg.maxEvents || 4);

  const scoredDining: ScoredDiningDeal[] = rawDining
    .map((deal) => {
      const scores = scoreContent({
        title: deal.title,
        body: deal.description,
        source: deal.restaurant || undefined,
        publishedAt: deal.fetchedAt,
        contentType: "deal",
      });
      const category: ContentCategory = "money";
      const dedupKey = generateDedupKey("deal", deal.title);

      return { ...deal, scores, category, dedupKey };
    })
    .filter((item) => meetsQualityThreshold(item.scores, cfg.minQualityScore))
    .sort((a, b) => b.scores.overall - a.scores.overall);

  const selectedDining = deduplicateByKey(scoredDining).slice(0, cfg.maxDeals || 3);

  // Build byCategory grouping
  const allSelected = [
    ...selectedNews,
    ...selectedAlerts,
    ...selectedEvents,
    ...selectedDining,
  ];

  const byCategory: Record<ContentCategory, Array<ScoredNewsArticle | ScoredAlertEvent | ScoredParkEvent | ScoredDiningDeal>> = {
    breaking: [],
    essential: [],
    money: [],
    local: [],
    civic: [],
    culture: [],
    lifestyle: [],
  };

  for (const item of allSelected) {
    byCategory[item.category].push(item);
  }

  // Calculate statistics
  const totalSelected = selectedNews.length + selectedAlerts.length + selectedEvents.length + selectedDining.length;
  const totalEvaluated = rawNewsWithEmbeddings.length + rawAlertsWithEmbeddings.length + rawEvents.length + rawDining.length;
  const avgQuality = totalSelected > 0
    ? allSelected.reduce((sum, item) => sum + item.scores.overall, 0) / totalSelected
    : 0;

  const sourceCountMap = new Map<string, number>();
  for (const article of selectedNews) {
    const count = sourceCountMap.get(article.source) || 0;
    sourceCountMap.set(article.source, count + 1);
  }
  const topSources = Array.from(sourceCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([source]) => source);

  const categoryBreakdown: Record<ContentCategory, number> = {
    breaking: byCategory.breaking.length,
    essential: byCategory.essential.length,
    money: byCategory.money.length,
    local: byCategory.local.length,
    civic: byCategory.civic.length,
    culture: byCategory.culture.length,
    lifestyle: byCategory.lifestyle.length,
  };

  // Calculate duplicates removed (items in clusters but not selected)
  const duplicatesRemoved =
    (newsClusterStats.totalItems - newsClusters.length) +
    (alertClusterStats.totalItems - alertClusters.length);

  console.log(`[DataQuality] Selected ${totalSelected} items via semantic clustering`);
  console.log(`[DataQuality] Duplicates removed: ${duplicatesRemoved}`);

  return {
    news: selectedNews,
    alerts: selectedAlerts,
    events: selectedEvents,
    dining: selectedDining,
    byCategory,
    summary: {
      totalEvaluated,
      totalSelected,
      averageQuality: Math.round(avgQuality),
      topSources,
      categoryBreakdown,
    },
    configApplied: cfg,
    clusters: {
      news: newsClusters,
      alerts: alertClusters,
    },
    semanticStats: {
      totalClustersFound: newsClusters.length + alertClusters.length,
      avgClusterSize: (newsClusterStats.avgClusterSize + alertClusterStats.avgClusterSize) / 2,
      duplicatesRemoved,
      newsWithEmbeddings: newsWithEmbeddings.length,
      alertsWithEmbeddings: alertsWithEmbeddings.length,
    },
  };
}

/**
 * Parse pgvector embedding string back to number array.
 * pgvector returns embeddings as "[0.1,0.2,...]" string format.
 */
function parseEmbedding(embeddingStr: string): number[] {
  // Remove brackets and split by comma
  const cleaned = embeddingStr.replace(/^\[|\]$/g, "");
  return cleaned.split(",").map(Number);
}
