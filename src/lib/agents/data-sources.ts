// src/lib/agents/data-sources.ts
/**
 * UNIFIED DATA SOURCE REGISTRY
 *
 * Single source of truth for all CityPing data sources. Replaces duplicate
 * source definitions that were scattered across robustness-agent.ts and
 * data-quality-agent.ts.
 *
 * Each source defines:
 * - Freshness thresholds (how old is "stale"?)
 * - Priority for healing (which sources to fix first)
 * - Refresh functions (how to re-fetch data)
 * - Critical flag (must this source work for digest to send?)
 *
 * Usage:
 *   import { DATA_SOURCES, getDataSource, refreshSource } from "./data-sources";
 *   const newsConfig = getDataSource("news");
 *   await refreshSource("news");
 */

import { prisma } from "../db";
import { DateTime } from "luxon";

import type { DataSourceConfig, SourceFreshness } from "./types";

// Import scrapers for refresh functions
import { ingestAllNewsArticles } from "../scrapers/news";
import { ingestMtaAlerts } from "../scrapers/mta";
import { ingestSampleSales } from "../scrapers/sample-sales";
import { ingestHousingLotteries } from "../scrapers/housing-connect";
import { sync311Alerts } from "../scrapers/nyc-311";
import { syncAirQuality } from "../scrapers/air-quality";
import { syncDiningDeals } from "../scrapers/dining-deals";
import { syncParksEvents } from "../scrapers/parks-events";

// =============================================================================
// DATA SOURCE CONFIGURATION
// =============================================================================

/**
 * Unified data source registry - the canonical list of all CityPing data sources.
 *
 * Priority levels:
 * - 1: Critical for core product (news, transit) - heal first
 * - 2: Important for user value (311, sample sales) - heal second
 * - 3: Nice to have (parks, dining) - heal last
 */
export const DATA_SOURCES: DataSourceConfig[] = [
  {
    id: "news",
    name: "NYC News",
    model: "NewsArticle",
    freshnessThresholdHours: 12,
    priority: 1,
    criticalForDigest: true,
    expectedFrequency: "hourly",
  },
  {
    id: "mta",
    name: "MTA Alerts",
    model: "AlertEvent",
    moduleId: "transit",
    freshnessThresholdHours: 1,
    priority: 1,
    criticalForDigest: true,
    expectedFrequency: "realtime",
  },
  {
    id: "311",
    name: "311 Service Alerts",
    model: "ServiceAlert",
    freshnessThresholdHours: 4,
    priority: 2,
    criticalForDigest: false,
    expectedFrequency: "hourly",
  },
  {
    id: "sample-sales",
    name: "Sample Sales",
    model: "AlertEvent",
    moduleId: "food",
    freshnessThresholdHours: 24,
    priority: 2,
    criticalForDigest: false,
    expectedFrequency: "daily",
  },
  {
    id: "housing",
    name: "Housing Lotteries",
    model: "AlertEvent",
    moduleId: "housing",
    freshnessThresholdHours: 48,
    priority: 3,
    criticalForDigest: false,
    expectedFrequency: "daily",
  },
  {
    id: "air-quality",
    name: "Air Quality",
    model: "AirQualityReading",
    freshnessThresholdHours: 6,
    priority: 3,
    criticalForDigest: false,
    expectedFrequency: "daily",
  },
  {
    id: "dining",
    name: "Dining Deals",
    model: "DiningDeal",
    freshnessThresholdHours: 24,
    priority: 3,
    criticalForDigest: false,
    expectedFrequency: "daily",
  },
  {
    id: "parks",
    name: "Parks Events",
    model: "ParkEvent",
    freshnessThresholdHours: 24,
    priority: 3,
    criticalForDigest: false,
    expectedFrequency: "daily",
  },
];

// =============================================================================
// REFRESH FUNCTIONS
// =============================================================================

type RefreshResult = { created: number; skipped?: number; errors?: string[] };
type RefreshFunction = () => Promise<RefreshResult>;

/**
 * Maps source IDs to their scraper/refresh functions.
 * Each function returns { created, skipped?, errors? }
 */
export const REFRESH_FUNCTIONS: Record<string, RefreshFunction> = {
  "news": async () => {
    const result = await ingestAllNewsArticles();
    return { created: result.total.created, skipped: result.total.skipped };
  },
  "mta": async () => {
    const result = await ingestMtaAlerts();
    return { created: result.created, skipped: result.skipped };
  },
  "sample-sales": async () => {
    const result = await ingestSampleSales();
    return { created: result.created, skipped: result.skipped };
  },
  "housing": async () => {
    const result = await ingestHousingLotteries();
    return { created: result.created, skipped: result.skipped };
  },
  "311": async () => {
    const result = await sync311Alerts();
    return { created: result.created, skipped: result.total - result.created };
  },
  "air-quality": async () => {
    const result = await syncAirQuality();
    return { created: result.readings, skipped: 0 };
  },
  "dining": async () => {
    const result = await syncDiningDeals();
    return { created: result.created, skipped: result.total - result.created };
  },
  "parks": async () => {
    const result = await syncParksEvents();
    return { created: result.created, skipped: result.total - result.created };
  },
};

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Get configuration for a specific data source by ID.
 */
export function getDataSource(sourceId: string): DataSourceConfig | undefined {
  return DATA_SOURCES.find((s) => s.id === sourceId);
}

/**
 * Get all sources marked as critical for digest generation.
 */
export function getCriticalSources(): DataSourceConfig[] {
  return DATA_SOURCES.filter((s) => s.criticalForDigest);
}

/**
 * Get sources sorted by priority (highest priority first).
 */
export function getSourcesByPriority(): DataSourceConfig[] {
  return [...DATA_SOURCES].sort((a, b) => a.priority - b.priority);
}

/**
 * Get sources for a specific priority level.
 */
export function getSourcesAtPriority(priority: 1 | 2 | 3): DataSourceConfig[] {
  return DATA_SOURCES.filter((s) => s.priority === priority);
}

/**
 * Get the refresh function for a source.
 */
export function getRefreshFunction(sourceId: string): RefreshFunction | undefined {
  return REFRESH_FUNCTIONS[sourceId];
}

// =============================================================================
// FRESHNESS CHECK
// =============================================================================

/**
 * Mapping of source IDs to Prisma moduleIds for AlertEvent sources.
 * This handles the mismatch between config IDs and database moduleIds.
 */
const ALERT_MODULE_MAP: Record<string, string> = {
  "mta": "transit",
  "sample-sales": "food",
  "housing": "housing",
};

/**
 * Check freshness status for a single data source.
 */
export async function checkSourceFreshness(sourceId: string): Promise<SourceFreshness | null> {
  const config = getDataSource(sourceId);
  if (!config) return null;

  const now = DateTime.now();

  switch (config.model) {
    case "NewsArticle": {
      const latest = await prisma.newsArticle.findFirst({
        orderBy: { publishedAt: "desc" },
      });
      const count = await prisma.newsArticle.count({
        where: { publishedAt: { gte: now.minus({ hours: 48 }).toJSDate() } },
      });
      const hoursOld = latest
        ? now.diff(DateTime.fromJSDate(latest.publishedAt), "hours").hours
        : null;

      return {
        sourceId,
        name: config.name,
        isStale: hoursOld === null || hoursOld > config.freshnessThresholdHours,
        lastDataAt: latest?.publishedAt || null,
        thresholdHours: config.freshnessThresholdHours,
        hoursOld: hoursOld ? Math.round(hoursOld) : null,
        itemCount: count,
      };
    }

    case "AlertEvent": {
      const moduleId = ALERT_MODULE_MAP[sourceId] || config.moduleId;
      if (!moduleId) return null;

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
      const hoursOld = latest
        ? now.diff(DateTime.fromJSDate(latest.createdAt), "hours").hours
        : null;

      return {
        sourceId,
        name: config.name,
        isStale: hoursOld === null || hoursOld > config.freshnessThresholdHours,
        lastDataAt: latest?.createdAt || null,
        thresholdHours: config.freshnessThresholdHours,
        hoursOld: hoursOld ? Math.round(hoursOld) : null,
        itemCount: count,
      };
    }

    case "ServiceAlert": {
      const latest = await prisma.serviceAlert.findFirst({
        orderBy: { fetchedAt: "desc" },
      });
      const count = await prisma.serviceAlert.count();
      const hoursOld = latest
        ? now.diff(DateTime.fromJSDate(latest.fetchedAt), "hours").hours
        : null;

      return {
        sourceId,
        name: config.name,
        isStale: hoursOld === null || hoursOld > config.freshnessThresholdHours,
        lastDataAt: latest?.fetchedAt || null,
        thresholdHours: config.freshnessThresholdHours,
        hoursOld: hoursOld ? Math.round(hoursOld) : null,
        itemCount: count,
      };
    }

    case "AirQualityReading": {
      const latest = await prisma.airQualityReading.findFirst({
        orderBy: { fetchedAt: "desc" },
      });
      const count = await prisma.airQualityReading.count();
      const hoursOld = latest
        ? now.diff(DateTime.fromJSDate(latest.fetchedAt), "hours").hours
        : null;

      return {
        sourceId,
        name: config.name,
        isStale: hoursOld === null || hoursOld > config.freshnessThresholdHours,
        lastDataAt: latest?.fetchedAt || null,
        thresholdHours: config.freshnessThresholdHours,
        hoursOld: hoursOld ? Math.round(hoursOld) : null,
        itemCount: count,
      };
    }

    case "DiningDeal": {
      const latest = await prisma.diningDeal.findFirst({
        orderBy: { fetchedAt: "desc" },
      });
      const count = await prisma.diningDeal.count();
      const hoursOld = latest
        ? now.diff(DateTime.fromJSDate(latest.fetchedAt), "hours").hours
        : null;

      return {
        sourceId,
        name: config.name,
        isStale: hoursOld === null || hoursOld > config.freshnessThresholdHours,
        lastDataAt: latest?.fetchedAt || null,
        thresholdHours: config.freshnessThresholdHours,
        hoursOld: hoursOld ? Math.round(hoursOld) : null,
        itemCount: count,
      };
    }

    case "ParkEvent": {
      const latest = await prisma.parkEvent.findFirst({
        orderBy: { fetchedAt: "desc" },
      });
      const count = await prisma.parkEvent.count();
      const hoursOld = latest
        ? now.diff(DateTime.fromJSDate(latest.fetchedAt), "hours").hours
        : null;

      return {
        sourceId,
        name: config.name,
        isStale: hoursOld === null || hoursOld > config.freshnessThresholdHours,
        lastDataAt: latest?.fetchedAt || null,
        thresholdHours: config.freshnessThresholdHours,
        hoursOld: hoursOld ? Math.round(hoursOld) : null,
        itemCount: count,
      };
    }

    default:
      return null;
  }
}

/**
 * Check freshness for all data sources.
 */
export async function checkAllSourcesFreshness(): Promise<SourceFreshness[]> {
  const results: SourceFreshness[] = [];

  for (const source of DATA_SOURCES) {
    const freshness = await checkSourceFreshness(source.id);
    if (freshness) {
      results.push(freshness);
    }
  }

  return results;
}

/**
 * Refresh a specific data source by calling its scraper function.
 */
export async function refreshSource(sourceId: string): Promise<RefreshResult | null> {
  const refreshFn = getRefreshFunction(sourceId);
  if (!refreshFn) {
    console.warn(`[DataSources] No refresh function for source: ${sourceId}`);
    return null;
  }

  console.log(`[DataSources] Refreshing source: ${sourceId}`);
  const start = Date.now();

  try {
    const result = await refreshFn();
    const duration = Date.now() - start;
    console.log(
      `[DataSources] Refreshed ${sourceId}: ${result.created} created, ${result.skipped || 0} skipped in ${duration}ms`
    );
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[DataSources] Failed to refresh ${sourceId} in ${duration}ms: ${message}`);
    return { created: 0, errors: [message] };
  }
}

/**
 * Get stale sources sorted by priority (highest priority stale sources first).
 */
export async function getStaleSources(): Promise<SourceFreshness[]> {
  const allFreshness = await checkAllSourcesFreshness();
  const stale = allFreshness.filter((f) => f.isStale);

  // Sort by priority
  return stale.sort((a, b) => {
    const configA = getDataSource(a.sourceId);
    const configB = getDataSource(b.sourceId);
    return (configA?.priority || 99) - (configB?.priority || 99);
  });
}

/**
 * Calculate overall data health percentage based on source freshness.
 */
export function calculateOverallHealth(freshness: SourceFreshness[]): number {
  if (freshness.length === 0) return 0;

  let healthyWeight = 0;
  let totalWeight = 0;

  for (const source of freshness) {
    const config = getDataSource(source.sourceId);
    // Weight by inverse priority (priority 1 = weight 3, priority 3 = weight 1)
    const weight = 4 - (config?.priority || 3);
    totalWeight += weight;

    if (!source.isStale) {
      healthyWeight += weight;
    }
  }

  return Math.round((healthyWeight / totalWeight) * 100);
}
