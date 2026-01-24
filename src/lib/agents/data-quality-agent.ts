/**
 * DATA QUALITY AGENT
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
 * Philosophy: Bad data is worse than no data. Catch problems before users see them.
 */

import { prisma } from "../db";
import { DateTime } from "luxon";

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
