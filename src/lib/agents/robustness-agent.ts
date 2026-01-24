// src/lib/agents/robustness-agent.ts
/**
 * ROBUSTNESS AGENT
 *
 * Ensures data pipelines are bulletproof through:
 * - Automatic retry with exponential backoff
 * - Circuit breaker pattern for failing sources
 * - Data validation at every stage
 * - ACTUAL self-healing (not just logging)
 * - Proactive stale data refresh
 *
 * Philosophy: "Data should never be stale, invalid, or missing.
 * When problems occur, FIX THEM AUTOMATICALLY - don't just report them."
 */

import { prisma } from "../db";
import { DateTime } from "luxon";

// Import scrapers directly for self-healing
import { ingestAllNewsArticles } from "../scrapers/news";
import { ingestMtaAlerts } from "../scrapers/mta";
import { ingestSampleSales } from "../scrapers/sample-sales";
import { ingestHousingLotteries } from "../scrapers/housing-connect";
import { sync311Alerts } from "../scrapers/nyc-311";
import { syncAirQuality } from "../scrapers/air-quality";
import { syncDiningDeals } from "../scrapers/dining-deals";
import { syncParksEvents } from "../scrapers/parks-events";

// =============================================================================
// TYPES
// =============================================================================

export interface SourceHealth {
  sourceId: string;
  name: string;
  status: "healthy" | "degraded" | "failed" | "circuit_open";
  consecutiveFailures: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  lastError: string | null;
  avgResponseTime: number;
  successRate: number; // 0-1
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  dataQualityScore: number; // 0-100
}

export interface PipelineResult {
  sourceId: string;
  success: boolean;
  itemsProcessed: number;
  itemsValid: number;
  itemsInvalid: number;
  duration: number;
  retryCount: number;
  errors: string[];
}

export interface HealingAction {
  type: "refresh_data" | "retry_failed" | "purge_stale" | "alert_admin";
  sourceId: string;
  reason: string;
  executed: boolean;
  success: boolean;
  result?: string;
  duration?: number;
}

// =============================================================================
// DATA SOURCE CONFIGURATION - Maps sources to their refresh functions
// =============================================================================

type RefreshFunction = () => Promise<{ created: number; skipped?: number; errors?: string[] }>;

const DATA_SOURCE_CONFIG: Record<string, {
  name: string;
  refreshFn: RefreshFunction;
  freshnessThresholdHours: number;
  priority: number; // 1 = highest
}> = {
  "news": {
    name: "NYC News",
    refreshFn: async () => {
      const result = await ingestAllNewsArticles();
      return { created: result.total.created, skipped: result.total.skipped };
    },
    freshnessThresholdHours: 12,
    priority: 1,
  },
  "mta": {
    name: "MTA Alerts",
    refreshFn: async () => {
      const result = await ingestMtaAlerts();
      return { created: result.created, skipped: result.skipped };
    },
    freshnessThresholdHours: 1,
    priority: 1,
  },
  "sample-sales": {
    name: "Sample Sales",
    refreshFn: async () => {
      const result = await ingestSampleSales();
      return { created: result.created, skipped: result.skipped };
    },
    freshnessThresholdHours: 24,
    priority: 2,
  },
  "housing": {
    name: "Housing Lotteries",
    refreshFn: async () => {
      const result = await ingestHousingLotteries();
      return { created: result.created, skipped: result.skipped };
    },
    freshnessThresholdHours: 48,
    priority: 3,
  },
  "311": {
    name: "311 Service Alerts",
    refreshFn: async () => {
      const result = await sync311Alerts();
      return { created: result.created, skipped: result.total - result.created };
    },
    freshnessThresholdHours: 4,
    priority: 2,
  },
  "air-quality": {
    name: "Air Quality",
    refreshFn: async () => {
      const result = await syncAirQuality();
      return { created: result.readings, skipped: 0 };
    },
    freshnessThresholdHours: 6,
    priority: 3,
  },
  "dining": {
    name: "Dining Deals",
    refreshFn: async () => {
      const result = await syncDiningDeals();
      return { created: result.created, skipped: result.total - result.created };
    },
    freshnessThresholdHours: 24,
    priority: 3,
  },
  "parks": {
    name: "Parks Events",
    refreshFn: async () => {
      const result = await syncParksEvents();
      return { created: result.created, skipped: result.total - result.created };
    },
    freshnessThresholdHours: 24,
    priority: 3,
  },
};

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

const circuitState = new Map<string, {
  failures: number;
  lastFailure: Date | null;
  state: "closed" | "open" | "half_open";
  openedAt: Date | null;
}>();

const CIRCUIT_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 5 * 60 * 1000, // 5 minutes
  halfOpenRequests: 1,
};

export function getCircuitState(sourceId: string): "closed" | "open" | "half_open" {
  const circuit = circuitState.get(sourceId);
  if (!circuit) return "closed";

  if (circuit.state === "open" && circuit.openedAt) {
    const elapsed = Date.now() - circuit.openedAt.getTime();
    if (elapsed >= CIRCUIT_CONFIG.resetTimeout) {
      circuit.state = "half_open";
      return "half_open";
    }
  }

  return circuit.state;
}

export function recordSuccess(sourceId: string): void {
  const circuit = circuitState.get(sourceId) || {
    failures: 0,
    lastFailure: null,
    state: "closed" as const,
    openedAt: null,
  };

  circuit.failures = 0;
  circuit.state = "closed";
  circuit.openedAt = null;
  circuitState.set(sourceId, circuit);
}

export function recordFailure(sourceId: string, error: string): void {
  const circuit = circuitState.get(sourceId) || {
    failures: 0,
    lastFailure: null,
    state: "closed" as const,
    openedAt: null,
  };

  circuit.failures++;
  circuit.lastFailure = new Date();

  if (circuit.failures >= CIRCUIT_CONFIG.failureThreshold) {
    circuit.state = "open";
    circuit.openedAt = new Date();
    console.error(`[Robustness] Circuit OPEN for ${sourceId} after ${circuit.failures} failures`);
  }

  circuitState.set(sourceId, circuit);
}

// =============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// =============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  sourceId: string,
  config: Partial<RetryConfig> = {}
): Promise<{ result: T | null; retries: number; error: string | null }> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let retries = 0;

  // Check circuit breaker
  const circuitStatus = getCircuitState(sourceId);
  if (circuitStatus === "open") {
    return {
      result: null,
      retries: 0,
      error: `Circuit breaker OPEN for ${sourceId}`,
    };
  }

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const result = await operation();
      recordSuccess(sourceId);
      return { result, retries, error: null };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retries = attempt;

      if (attempt < cfg.maxRetries) {
        const delay = Math.min(
          cfg.baseDelayMs * Math.pow(cfg.backoffMultiplier, attempt),
          cfg.maxDelayMs
        );
        console.warn(
          `[Robustness] Retry ${attempt + 1}/${cfg.maxRetries} for ${sourceId} in ${delay}ms: ${lastError.message}`
        );
        await sleep(delay);
      }
    }
  }

  recordFailure(sourceId, lastError?.message || "Unknown error");
  return {
    result: null,
    retries,
    error: lastError?.message || "Unknown error",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// DATA VALIDATORS
// =============================================================================

export function validateAlertEvent(event: {
  title?: string | null;
  body?: string | null;
  startsAt?: Date | null;
  metadata?: unknown;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Required fields
  if (!event.title || event.title.trim().length === 0) {
    errors.push("Missing title");
    score -= 30;
  } else if (event.title.length < 5) {
    warnings.push("Title very short");
    score -= 10;
  }

  // Date validation
  if (event.startsAt) {
    const now = DateTime.now();
    const eventDate = DateTime.fromJSDate(event.startsAt);

    if (eventDate < now.minus({ days: 1 })) {
      errors.push("Event date in the past");
      score -= 25;
    }

    if (eventDate > now.plus({ years: 1 })) {
      warnings.push("Event more than 1 year in future");
      score -= 10;
    }
  }

  // Content quality
  if (event.body && event.body.length > 0) {
    if (event.body.length < 20) {
      warnings.push("Body very short");
      score -= 5;
    }
  } else {
    warnings.push("No body content");
    score -= 5;
  }

  // Check for placeholder/test data
  const testPatterns = [/test/i, /lorem ipsum/i, /placeholder/i, /xxx/i, /TODO/i];
  const fullText = `${event.title || ""} ${event.body || ""}`;
  for (const pattern of testPatterns) {
    if (pattern.test(fullText)) {
      errors.push(`Contains test/placeholder content: ${pattern}`);
      score -= 20;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    dataQualityScore: Math.max(0, score),
  };
}

export function validateNewsArticle(article: {
  title?: string | null;
  url?: string | null;
  summary?: string | null;
  source?: string | null;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (!article.title || article.title.trim().length === 0) {
    errors.push("Missing title");
    score -= 30;
  }

  if (!article.url) {
    errors.push("Missing URL");
    score -= 25;
  } else {
    try {
      new URL(article.url);
    } catch {
      errors.push("Invalid URL format");
      score -= 25;
    }
  }

  if (!article.source) {
    warnings.push("Missing source attribution");
    score -= 10;
  }

  if (!article.summary || article.summary.length < 50) {
    warnings.push("Summary too short for quality digest");
    score -= 15;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    dataQualityScore: Math.max(0, score),
  };
}

// =============================================================================
// STALENESS DETECTION
// =============================================================================

export interface DataFreshnessStatus {
  sourceId: string;
  name: string;
  isStale: boolean;
  lastDataAt: Date | null;
  thresholdHours: number;
  hoursOld: number | null;
  itemCount: number;
}

export async function checkDataFreshness(): Promise<DataFreshnessStatus[]> {
  const now = DateTime.now();
  const results: DataFreshnessStatus[] = [];

  // Check NewsArticle freshness
  const latestNews = await prisma.newsArticle.findFirst({
    orderBy: { publishedAt: "desc" },
  });
  const newsCount = await prisma.newsArticle.count({
    where: { publishedAt: { gte: now.minus({ hours: 48 }).toJSDate() } },
  });
  const newsConfig = DATA_SOURCE_CONFIG["news"];
  const newsHoursOld = latestNews ? now.diff(DateTime.fromJSDate(latestNews.publishedAt), "hours").hours : null;
  results.push({
    sourceId: "news",
    name: newsConfig.name,
    isStale: newsHoursOld === null || newsHoursOld > newsConfig.freshnessThresholdHours,
    lastDataAt: latestNews?.publishedAt || null,
    thresholdHours: newsConfig.freshnessThresholdHours,
    hoursOld: newsHoursOld ? Math.round(newsHoursOld) : null,
    itemCount: newsCount,
  });

  // Check each AlertEvent module - map config sourceId to actual Prisma moduleId
  const ALERT_MODULE_MAP: Record<string, string> = {
    "mta": "transit",          // MTA uses moduleId "transit"
    "sample-sales": "food",    // Sample sales uses moduleId "food"
    "housing": "housing",      // Housing uses moduleId "housing"
  };

  for (const [configId, moduleId] of Object.entries(ALERT_MODULE_MAP)) {
    const config = DATA_SOURCE_CONFIG[configId];
    if (!config) continue;

    const latest = await prisma.alertEvent.findFirst({
      where: { source: { moduleId } },
      orderBy: { createdAt: "desc" },
    });
    const count = await prisma.alertEvent.count({
      where: {
        source: { moduleId },
        createdAt: { gte: now.minus({ hours: 48 }).toJSDate() },
      },
    });
    const hoursOld = latest ? now.diff(DateTime.fromJSDate(latest.createdAt), "hours").hours : null;

    results.push({
      sourceId: configId,
      name: config.name,
      isStale: hoursOld === null || hoursOld > config.freshnessThresholdHours,
      lastDataAt: latest?.createdAt || null,
      thresholdHours: config.freshnessThresholdHours,
      hoursOld: hoursOld ? Math.round(hoursOld) : null,
      itemCount: count,
    });
  }

  // Check ServiceAlert (311)
  const latest311 = await prisma.serviceAlert.findFirst({
    orderBy: { fetchedAt: "desc" },
  });
  const count311 = await prisma.serviceAlert.count();
  const config311 = DATA_SOURCE_CONFIG["311"];
  const hours311 = latest311 ? now.diff(DateTime.fromJSDate(latest311.fetchedAt), "hours").hours : null;
  results.push({
    sourceId: "311",
    name: config311.name,
    isStale: hours311 === null || hours311 > config311.freshnessThresholdHours,
    lastDataAt: latest311?.fetchedAt || null,
    thresholdHours: config311.freshnessThresholdHours,
    hoursOld: hours311 ? Math.round(hours311) : null,
    itemCount: count311,
  });

  // Check AirQualityReading
  const latestAQ = await prisma.airQualityReading.findFirst({
    orderBy: { fetchedAt: "desc" },
  });
  const countAQ = await prisma.airQualityReading.count();
  const configAQ = DATA_SOURCE_CONFIG["air-quality"];
  const hoursAQ = latestAQ ? now.diff(DateTime.fromJSDate(latestAQ.fetchedAt), "hours").hours : null;
  results.push({
    sourceId: "air-quality",
    name: configAQ.name,
    isStale: hoursAQ === null || hoursAQ > configAQ.freshnessThresholdHours,
    lastDataAt: latestAQ?.fetchedAt || null,
    thresholdHours: configAQ.freshnessThresholdHours,
    hoursOld: hoursAQ ? Math.round(hoursAQ) : null,
    itemCount: countAQ,
  });

  // Check DiningDeal
  const latestDining = await prisma.diningDeal.findFirst({
    orderBy: { fetchedAt: "desc" },
  });
  const countDining = await prisma.diningDeal.count();
  const configDining = DATA_SOURCE_CONFIG["dining"];
  const hoursDining = latestDining ? now.diff(DateTime.fromJSDate(latestDining.fetchedAt), "hours").hours : null;
  results.push({
    sourceId: "dining",
    name: configDining.name,
    isStale: hoursDining === null || hoursDining > configDining.freshnessThresholdHours,
    lastDataAt: latestDining?.fetchedAt || null,
    thresholdHours: configDining.freshnessThresholdHours,
    hoursOld: hoursDining ? Math.round(hoursDining) : null,
    itemCount: countDining,
  });

  // Check ParkEvent
  const latestPark = await prisma.parkEvent.findFirst({
    orderBy: { fetchedAt: "desc" },
  });
  const countPark = await prisma.parkEvent.count();
  const configPark = DATA_SOURCE_CONFIG["parks"];
  const hoursPark = latestPark ? now.diff(DateTime.fromJSDate(latestPark.fetchedAt), "hours").hours : null;
  results.push({
    sourceId: "parks",
    name: configPark.name,
    isStale: hoursPark === null || hoursPark > configPark.freshnessThresholdHours,
    lastDataAt: latestPark?.fetchedAt || null,
    thresholdHours: configPark.freshnessThresholdHours,
    hoursOld: hoursPark ? Math.round(hoursPark) : null,
    itemCount: countPark,
  });

  return results;
}

// =============================================================================
// SELF-HEALING - ACTUALLY FIXES PROBLEMS (Direct function calls, no HTTP)
// =============================================================================

export async function healStaleData(): Promise<HealingAction[]> {
  const actions: HealingAction[] = [];
  const freshness = await checkDataFreshness();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("[Robustness] SELF-HEALING: Checking data freshness...");
  console.log("═══════════════════════════════════════════════════════════════");

  // Sort by priority (lower = more important)
  const staleSourcesSorted = freshness
    .filter(f => f.isStale)
    .sort((a, b) => {
      const configA = DATA_SOURCE_CONFIG[a.sourceId];
      const configB = DATA_SOURCE_CONFIG[b.sourceId];
      return (configA?.priority || 99) - (configB?.priority || 99);
    });

  if (staleSourcesSorted.length === 0) {
    console.log("[Robustness] All data sources are fresh. No healing needed.");
    return actions;
  }

  console.log(`[Robustness] Found ${staleSourcesSorted.length} stale sources. HEALING NOW...`);

  for (const source of staleSourcesSorted) {
    const config = DATA_SOURCE_CONFIG[source.sourceId];
    if (!config) {
      console.warn(`[Robustness] No config for source ${source.sourceId}, skipping`);
      continue;
    }

    const action: HealingAction = {
      type: "refresh_data",
      sourceId: source.sourceId,
      reason: source.hoursOld
        ? `Data is ${source.hoursOld}h old (threshold: ${source.thresholdHours}h)`
        : `No data exists`,
      executed: true,
      success: false,
    };

    const start = Date.now();
    console.log(`[Robustness] HEALING ${config.name}: ${action.reason}`);

    // Call the refresh function directly
    try {
      const result = await config.refreshFn();
      action.duration = Date.now() - start;
      action.success = true;
      action.result = `Created ${result.created} items${result.skipped ? `, skipped ${result.skipped}` : ""}`;
      console.log(`[Robustness] ✅ ${config.name} refresh completed: ${action.result} in ${action.duration}ms`);
    } catch (error) {
      action.duration = Date.now() - start;
      action.success = false;
      action.result = error instanceof Error ? error.message : String(error);
      console.error(`[Robustness] ❌ ${config.name} refresh FAILED: ${action.result}`);
    }

    actions.push(action);

    // Small delay between refreshes to not overwhelm external APIs
    await sleep(500);
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`[Robustness] HEALING COMPLETE: ${actions.filter(a => a.success).length}/${actions.length} successful`);
  console.log("═══════════════════════════════════════════════════════════════");

  return actions;
}

// =============================================================================
// ENSURE DATA READY - Main entry point for guaranteed fresh data
// =============================================================================

export async function ensureDataReady(): Promise<{
  ready: boolean;
  freshness: DataFreshnessStatus[];
  healingActions: HealingAction[];
  errors: string[];
}> {
  const errors: string[] = [];

  // Step 1: Check freshness
  let freshness = await checkDataFreshness();
  const staleCount = freshness.filter(f => f.isStale).length;

  if (staleCount === 0) {
    return {
      ready: true,
      freshness,
      healingActions: [],
      errors: [],
    };
  }

  // Step 2: Heal stale data
  console.log(`[Robustness] ${staleCount} sources stale. Initiating self-healing...`);
  const healingActions = await healStaleData();

  // Step 3: Re-check freshness after healing
  await sleep(2000); // Brief wait for data to settle
  freshness = await checkDataFreshness();
  const stillStale = freshness.filter(f => f.isStale);

  if (stillStale.length > 0) {
    for (const source of stillStale) {
      errors.push(`${source.name} still stale after healing attempt`);
    }
  }

  return {
    ready: stillStale.length === 0,
    freshness,
    healingActions,
    errors,
  };
}

// =============================================================================
// PIPELINE ORCHESTRATION
// =============================================================================

export async function runPipelineWithRobustness(
  sourceId: string,
  pipeline: () => Promise<{ created: number; skipped: number; errors?: string[] }>
): Promise<PipelineResult> {
  const start = Date.now();

  console.log(`[Robustness] Starting pipeline for ${sourceId}`);

  // Run with retry
  const { result, retries, error } = await withRetry(pipeline, sourceId);

  const duration = Date.now() - start;

  if (!result) {
    // Pipeline failed completely
    console.error(`[Robustness] Pipeline ${sourceId} FAILED after ${retries} retries: ${error}`);

    return {
      sourceId,
      success: false,
      itemsProcessed: 0,
      itemsValid: 0,
      itemsInvalid: 0,
      duration,
      retryCount: retries,
      errors: [error || "Unknown error"],
    };
  }

  console.log(
    `[Robustness] Pipeline ${sourceId} SUCCESS: ${result.created} created, ${result.skipped} skipped in ${duration}ms`
  );

  return {
    sourceId,
    success: true,
    itemsProcessed: result.created + result.skipped,
    itemsValid: result.created,
    itemsInvalid: result.skipped,
    duration,
    retryCount: retries,
    errors: result.errors || [],
  };
}

// =============================================================================
// HEALTH MONITORING
// =============================================================================

export async function getSystemHealth(): Promise<{
  overall: number;  // 0-100 percentage
  status: "healthy" | "degraded" | "critical";
  sources: SourceHealth[];
  recommendations: string[];
}> {
  const sources: SourceHealth[] = [];
  const recommendations: string[] = [];

  // Get all job configs
  const jobConfigs = await prisma.jobConfig.findMany();

  for (const config of jobConfigs) {
    const recentRuns = await prisma.jobRun.findMany({
      where: {
        jobName: config.jobName,
        startedAt: { gte: DateTime.now().minus({ hours: 24 }).toJSDate() },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    const successes = recentRuns.filter(r => r.status === "success");
    const failures = recentRuns.filter(r => r.status === "failed");
    const successRate = recentRuns.length > 0 ? successes.length / recentRuns.length : 0;
    const avgResponseTime = successes.length > 0
      ? successes.reduce((sum, r) => sum + (r.durationMs || 0), 0) / successes.length
      : 0;

    const circuitStatus = getCircuitState(config.jobName);

    let status: SourceHealth["status"] = "healthy";
    if (circuitStatus === "open") {
      status = "circuit_open";
    } else if (successRate < 0.5) {
      status = "failed";
    } else if (successRate < 0.8) {
      status = "degraded";
    }

    sources.push({
      sourceId: config.jobName,
      name: config.displayName,
      status,
      consecutiveFailures: circuitState.get(config.jobName)?.failures || 0,
      lastSuccess: successes[0]?.startedAt || null,
      lastFailure: failures[0]?.startedAt || null,
      lastError: failures[0]?.errorMessage || null,
      avgResponseTime,
      successRate,
    });

    // Generate recommendations
    if (status === "failed") {
      recommendations.push(`${config.jobName}: High failure rate - investigate immediately`);
    } else if (status === "circuit_open") {
      recommendations.push(`${config.jobName}: Circuit breaker open - will auto-retry in 5 minutes`);
    } else if (status === "degraded") {
      recommendations.push(`${config.jobName}: Degraded performance - monitor closely`);
    }
  }

  const failedCount = sources.filter(s => s.status === "failed" || s.status === "circuit_open").length;
  const degradedCount = sources.filter(s => s.status === "degraded").length;
  const healthyCount = sources.filter(s => s.status === "healthy").length;

  let status: "healthy" | "degraded" | "critical" = "healthy";
  if (failedCount > 0) {
    status = "critical";
  } else if (degradedCount > 0) {
    status = "degraded";
  }

  // Calculate overall percentage: healthy=100%, degraded=50%, failed/open=0%
  const total = sources.length || 1;
  const overall = Math.round((healthyCount * 100 + degradedCount * 50) / total);

  return { overall, status, sources, recommendations };
}

export default {
  withRetry,
  validateAlertEvent,
  validateNewsArticle,
  runPipelineWithRobustness,
  getSystemHealth,
  checkDataFreshness,
  healStaleData,
  ensureDataReady,
  getCircuitState,
};
