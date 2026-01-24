/**
 * Data Quality Agent
 *
 * This agent evaluates data sources for quality, relevance, and trustworthiness.
 * It implements a multi-dimensional scoring system to select the best content
 * for the daily digest email.
 *
 * Key Responsibilities:
 * 1. Source Evaluation - Score sources by credibility, freshness, completeness
 * 2. Relevance Scoring - Match content to user interests and location
 * 3. Deduplication - Identify and merge duplicate/similar stories
 * 4. Priority Selection - Select top content for limited email real estate
 *
 * Academic Foundation:
 * - Information Quality (IQ) dimensions: accuracy, completeness, timeliness, consistency
 * - Signal Detection Theory: separating signal (valuable info) from noise
 * - Multi-Criteria Decision Analysis (MCDA) for content ranking
 */

import { prisma } from "../db";
import { DateTime } from "luxon";
import type { NewsArticle, AlertEvent, ServiceAlert, AirQualityReading, DiningDeal, ParkEvent } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface QualityScore {
  overall: number;       // 0-100 composite score
  dimensions: {
    accuracy: number;    // Source credibility, fact-checking indicators
    timeliness: number;  // How fresh/relevant to today
    completeness: number; // All required fields present
    uniqueness: number;  // Not duplicate of other content
    relevance: number;   // Match to NYC/user interests
  };
  flags: string[];       // Quality warnings
}

export interface ScoredContent<T> {
  item: T;
  score: QualityScore;
  rank: number;
}

export interface ContentSelection {
  news: ScoredContent<NewsArticle>[];
  alerts: ScoredContent<AlertEvent>[];
  serviceAlerts: ScoredContent<ServiceAlert>[];
  airQuality: ScoredContent<AirQualityReading>[];
  dining: ScoredContent<DiningDeal>[];
  events: ScoredContent<ParkEvent>[];
  summary: {
    totalEvaluated: number;
    totalSelected: number;
    averageQuality: number;
    topSources: string[];
  };
}

// =============================================================================
// SOURCE CREDIBILITY SCORES (0-100)
// =============================================================================

const SOURCE_CREDIBILITY: Record<string, number> = {
  // News Sources - based on journalistic standards, editorial oversight
  "gothamist": 90,      // WNYC, established journalism standards
  "thecity": 92,        // Nonprofit investigative journalism
  "patch": 70,          // Hyperlocal but variable quality
  "nytimes": 95,        // Paper of record
  "nypost": 65,         // Tabloid, lower editorial standards

  // Official Sources - government data, authoritative
  "mta": 95,            // Official transit authority
  "nyc-311": 90,        // Official city services
  "housing-connect": 95, // Official housing authority
  "nyc-parks": 92,      // Official parks department
  "airnow": 95,         // EPA official air quality data

  // Commercial Sources - may have commercial interests
  "260-sample-sale": 75, // Commercial but specialized
  "timeout": 80,        // Editorial curation
  "eater": 82,          // Vox Media food journalism
  "infatuation": 78,    // Reviews may have bias

  // Default for unknown sources
  "default": 60,
};

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate timeliness score based on content age.
 * Uses exponential decay - newer content scores higher.
 *
 * @param publishedAt - When content was published/created
 * @param halfLifeHours - Hours until score drops to 50%
 */
function scoreTimeliness(publishedAt: Date | null, halfLifeHours: number = 12): number {
  if (!publishedAt) return 20; // Penalize missing dates

  const now = DateTime.now();
  const published = DateTime.fromJSDate(publishedAt);
  const hoursOld = now.diff(published, "hours").hours;

  if (hoursOld < 0) return 100; // Future dates get full score (scheduled content)
  if (hoursOld <= 1) return 100; // Within last hour
  if (hoursOld <= 6) return 95;
  if (hoursOld <= 12) return 85;
  if (hoursOld <= 24) return 70;
  if (hoursOld <= 48) return 50;
  if (hoursOld <= 72) return 30;

  // Exponential decay after 72 hours
  return Math.max(5, Math.round(30 * Math.exp(-hoursOld / (halfLifeHours * 6))));
}

/**
 * Calculate completeness score based on required fields.
 */
function scoreCompleteness(item: Record<string, unknown>, requiredFields: string[]): number {
  let present = 0;
  let total = requiredFields.length;

  for (const field of requiredFields) {
    const value = item[field];
    if (value !== null && value !== undefined && value !== "") {
      present++;
    }
  }

  return Math.round((present / total) * 100);
}

/**
 * Calculate uniqueness score using simple text similarity.
 * Compares against other items to detect duplicates.
 */
function scoreUniqueness(text: string, otherTexts: string[]): number {
  if (!text || otherTexts.length === 0) return 100;

  const normalizedText = normalizeForComparison(text);

  let maxSimilarity = 0;
  for (const other of otherTexts) {
    const similarity = calculateJaccardSimilarity(normalizedText, normalizeForComparison(other));
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  // High similarity = low uniqueness
  return Math.round((1 - maxSimilarity) * 100);
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateJaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(" "));
  const setB = new Set(b.split(" "));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Score relevance to NYC and user interests.
 * Looks for geographic and topic signals.
 */
function scoreRelevance(text: string, metadata?: Record<string, unknown>): number {
  let score = 50; // Base score

  const lowerText = text.toLowerCase();

  // NYC geographic signals
  const nycSignals = [
    "new york", "nyc", "manhattan", "brooklyn", "queens", "bronx", "staten island",
    "subway", "mta", "times square", "central park", "east village", "williamsburg",
    "upper west", "upper east", "chelsea", "soho", "tribeca", "harlem", "fidi"
  ];

  for (const signal of nycSignals) {
    if (lowerText.includes(signal)) {
      score += 10;
      break; // Only count once
    }
  }

  // High-interest topics for NYC residents
  const highInterestTopics = [
    "subway delay", "service change", "alternate side", "parking", "rent",
    "apartment", "lease", "eviction", "housing lottery", "affordable housing",
    "traffic alert", "road closure", "snow emergency", "heat advisory",
    "free event", "festival", "concert", "museum", "sample sale"
  ];

  for (const topic of highInterestTopics) {
    if (lowerText.includes(topic)) {
      score += 15;
      break;
    }
  }

  // Boost if metadata indicates high relevance
  if (metadata) {
    if (metadata.borough || metadata.neighborhood) score += 10;
    if (metadata.urgent || metadata.breaking) score += 20;
    if (metadata.verified) score += 5;
  }

  return Math.min(100, score);
}

// =============================================================================
// CONTENT SCORING FUNCTIONS BY TYPE
// =============================================================================

export function scoreNewsArticle(
  article: NewsArticle,
  otherHeadlines: string[]
): QualityScore {
  const flags: string[] = [];

  // Extract source from URL or use default
  const sourceSlug = extractSourceFromUrl(article.url) || "default";
  const accuracy = SOURCE_CREDIBILITY[sourceSlug] || SOURCE_CREDIBILITY.default;

  const timeliness = scoreTimeliness(article.publishedAt);
  if (timeliness < 50) flags.push("stale_content");

  const completeness = scoreCompleteness(
    article as unknown as Record<string, unknown>,
    ["title", "snippet", "url", "publishedAt", "source"]
  );
  if (completeness < 80) flags.push("incomplete_data");

  const uniqueness = scoreUniqueness(article.title, otherHeadlines);
  if (uniqueness < 30) flags.push("potential_duplicate");

  const relevance = scoreRelevance(
    `${article.title} ${article.snippet || article.summary || ""}`
  );

  const overall = Math.round(
    accuracy * 0.2 +
    timeliness * 0.25 +
    completeness * 0.15 +
    uniqueness * 0.15 +
    relevance * 0.25
  );

  return {
    overall,
    dimensions: { accuracy, timeliness, completeness, uniqueness, relevance },
    flags,
  };
}

export function scoreAlertEvent(
  alert: AlertEvent,
  otherTitles: string[]
): QualityScore {
  const flags: string[] = [];

  // MTA alerts are highly credible
  const accuracy = 95;

  // Alerts prioritize current relevance
  const timeliness = alert.endsAt
    ? (DateTime.fromJSDate(alert.endsAt) > DateTime.now() ? 100 : 20)
    : scoreTimeliness(alert.createdAt);
  if (timeliness < 50) flags.push("expired_alert");

  const completeness = scoreCompleteness(
    alert as unknown as Record<string, unknown>,
    ["title", "body", "startsAt"]
  );

  const uniqueness = scoreUniqueness(alert.title || "", otherTitles);
  if (uniqueness < 30) flags.push("duplicate_alert");

  const relevance = scoreRelevance(
    `${alert.title || ""} ${alert.body || ""}`,
    alert.metadata as Record<string, unknown> | undefined
  );

  // Transit alerts are weighted heavily toward timeliness and relevance
  const overall = Math.round(
    accuracy * 0.15 +
    timeliness * 0.35 +
    completeness * 0.1 +
    uniqueness * 0.1 +
    relevance * 0.3
  );

  return {
    overall,
    dimensions: { accuracy, timeliness, completeness, uniqueness, relevance },
    flags,
  };
}

export function scoreDiningDeal(
  deal: DiningDeal,
  otherNames: string[]
): QualityScore {
  const flags: string[] = [];

  const accuracy = 75; // Commercial source

  // Check if deal is still active
  const now = DateTime.now();
  const endDate = deal.endDate ? DateTime.fromJSDate(deal.endDate) : null;
  const timeliness = endDate
    ? (endDate > now ? 90 : 10) // Active deals score high
    : 60; // No end date - medium score
  if (timeliness < 50) flags.push("expired_deal");

  const completeness = scoreCompleteness(
    deal as unknown as Record<string, unknown>,
    ["title", "restaurant", "dealType"]
  );

  const uniqueness = scoreUniqueness(deal.title, otherNames);

  const relevance = scoreRelevance(
    `${deal.title} ${deal.restaurant || ""} ${deal.dealType || ""}`,
    { borough: deal.borough }
  );

  const overall = Math.round(
    accuracy * 0.15 +
    timeliness * 0.3 +
    completeness * 0.15 +
    uniqueness * 0.15 +
    relevance * 0.25
  );

  return {
    overall,
    dimensions: { accuracy, timeliness, completeness, uniqueness, relevance },
    flags,
  };
}

export function scoreParkEvent(
  event: ParkEvent,
  otherNames: string[]
): QualityScore {
  const flags: string[] = [];

  const accuracy = 92; // Official NYC Parks source

  // Events should be upcoming, not past
  const now = DateTime.now();
  const eventDate = DateTime.fromJSDate(event.date);
  let timeliness: number;
  if (eventDate < now) {
    timeliness = 10; // Past event
    flags.push("past_event");
  } else if (eventDate.diff(now, "days").days <= 7) {
    timeliness = 100; // Within a week
  } else if (eventDate.diff(now, "days").days <= 14) {
    timeliness = 80;
  } else {
    timeliness = 60; // Far in future
  }

  const completeness = scoreCompleteness(
    event as unknown as Record<string, unknown>,
    ["name", "description", "date", "parkName"]
  );

  const uniqueness = scoreUniqueness(event.name, otherNames);

  const relevance = scoreRelevance(
    `${event.name} ${event.description || ""}`,
    { borough: event.borough }
  );

  const overall = Math.round(
    accuracy * 0.15 +
    timeliness * 0.3 +
    completeness * 0.15 +
    uniqueness * 0.1 +
    relevance * 0.3
  );

  return {
    overall,
    dimensions: { accuracy, timeliness, completeness, uniqueness, relevance },
    flags,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractSourceFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("gothamist")) return "gothamist";
    if (hostname.includes("thecity")) return "thecity";
    if (hostname.includes("patch")) return "patch";
    if (hostname.includes("nytimes")) return "nytimes";
    if (hostname.includes("nypost")) return "nypost";
    if (hostname.includes("timeout")) return "timeout";
    if (hostname.includes("eater")) return "eater";
    if (hostname.includes("infatuation")) return "infatuation";
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// MAIN CONTENT SELECTION FUNCTION
// =============================================================================

export interface SelectionConfig {
  maxNews?: number;
  maxAlerts?: number;
  maxDeals?: number;
  maxEvents?: number;
  minQualityScore?: number;
  lookbackHours?: number;
}

const DEFAULT_CONFIG: SelectionConfig = {
  maxNews: 5,
  maxAlerts: 3,
  maxDeals: 3,
  maxEvents: 4,
  minQualityScore: 40,
  lookbackHours: 48,
};

/**
 * Select the best content for the daily digest email.
 *
 * This is the main entry point for the Data Quality Agent.
 * It fetches all available content, scores each item,
 * and returns the top-ranked items within the configured limits.
 */
export async function selectBestContent(
  config: SelectionConfig = {}
): Promise<ContentSelection> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const now = DateTime.now();
  const lookbackDate = now.minus({ hours: cfg.lookbackHours! }).toJSDate();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("[DataQuality] Selecting best content for digest...");
  console.log(`[DataQuality] Lookback: ${cfg.lookbackHours}h, MinScore: ${cfg.minQualityScore}`);
  console.log("═══════════════════════════════════════════════════════════════");

  // Fetch all recent content in parallel
  const [newsArticles, alerts, serviceAlerts, airQuality, dining, events] = await Promise.all([
    prisma.newsArticle.findMany({
      where: { publishedAt: { gte: lookbackDate } },
      orderBy: { publishedAt: "desc" },
      take: 50, // Fetch more than needed for scoring
    }),
    prisma.alertEvent.findMany({
      where: { createdAt: { gte: lookbackDate } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.serviceAlert.findMany({
      where: { fetchedAt: { gte: lookbackDate } },
      orderBy: { fetchedAt: "desc" },
      take: 20,
    }),
    prisma.airQualityReading.findMany({
      where: { fetchedAt: { gte: lookbackDate } },
      orderBy: { fetchedAt: "desc" },
      take: 5,
    }),
    prisma.diningDeal.findMany({
      where: { fetchedAt: { gte: lookbackDate } },
      orderBy: { fetchedAt: "desc" },
      take: 20,
    }),
    prisma.parkEvent.findMany({
      where: { date: { gte: now.toJSDate() } }, // Only upcoming events
      orderBy: { date: "asc" },
      take: 20,
    }),
  ]);

  console.log(`[DataQuality] Fetched: ${newsArticles.length} news, ${alerts.length} alerts, ${events.length} events`);

  // Score and rank news articles
  const newsHeadlines = newsArticles.map(a => a.title);
  const scoredNews = newsArticles.map((article, idx) => {
    const otherHeadlines = newsHeadlines.filter((_, i) => i !== idx);
    return {
      item: article,
      score: scoreNewsArticle(article, otherHeadlines),
      rank: 0,
    };
  });

  // Score and rank alerts
  const alertTitles = alerts.map(a => a.title || "");
  const scoredAlerts = alerts.map((alert, idx) => {
    const otherTitles = alertTitles.filter((_, i) => i !== idx);
    return {
      item: alert,
      score: scoreAlertEvent(alert, otherTitles),
      rank: 0,
    };
  });

  // Score dining deals
  const dealNames = dining.map(d => d.title);
  const scoredDining = dining.map((deal, idx) => {
    const otherNames = dealNames.filter((_, i) => i !== idx);
    return {
      item: deal,
      score: scoreDiningDeal(deal, otherNames),
      rank: 0,
    };
  });

  // Score park events
  const eventNames = events.map(e => e.name);
  const scoredEvents = events.map((event, idx) => {
    const otherNames = eventNames.filter((_, i) => i !== idx);
    return {
      item: event,
      score: scoreParkEvent(event, otherNames),
      rank: 0,
    };
  });

  // Score service alerts (simple scoring)
  const scoredServiceAlerts = serviceAlerts.map(alert => ({
    item: alert,
    score: {
      overall: 80,
      dimensions: { accuracy: 90, timeliness: 80, completeness: 70, uniqueness: 80, relevance: 80 },
      flags: [],
    } as QualityScore,
    rank: 0,
  }));

  // Score air quality (simple scoring - usually just latest reading)
  const scoredAirQuality = airQuality.map(reading => ({
    item: reading,
    score: {
      overall: 90,
      dimensions: { accuracy: 95, timeliness: 95, completeness: 90, uniqueness: 100, relevance: 85 },
      flags: [],
    } as QualityScore,
    rank: 0,
  }));

  // Filter by minimum quality score and sort by overall score
  const filterAndRank = <T>(items: ScoredContent<T>[]): ScoredContent<T>[] => {
    return items
      .filter(item => item.score.overall >= cfg.minQualityScore!)
      .sort((a, b) => b.score.overall - a.score.overall)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  };

  const rankedNews = filterAndRank(scoredNews).slice(0, cfg.maxNews);
  const rankedAlerts = filterAndRank(scoredAlerts).slice(0, cfg.maxAlerts);
  const rankedDining = filterAndRank(scoredDining).slice(0, cfg.maxDeals);
  const rankedEvents = filterAndRank(scoredEvents).slice(0, cfg.maxEvents);
  const rankedServiceAlerts = filterAndRank(scoredServiceAlerts).slice(0, 3);
  const rankedAirQuality = filterAndRank(scoredAirQuality).slice(0, 1);

  // Calculate summary statistics
  const allScores = [
    ...rankedNews.map(n => n.score.overall),
    ...rankedAlerts.map(a => a.score.overall),
    ...rankedDining.map(d => d.score.overall),
    ...rankedEvents.map(e => e.score.overall),
  ];
  const avgQuality = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  // Find top contributing sources
  const sourceFreq: Record<string, number> = {};
  for (const n of rankedNews) {
    const src = extractSourceFromUrl(n.item.url) || n.item.source;
    sourceFreq[src] = (sourceFreq[src] || 0) + 1;
  }
  const topSources = Object.entries(sourceFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([src]) => src);

  const totalSelected = rankedNews.length + rankedAlerts.length + rankedDining.length +
    rankedEvents.length + rankedServiceAlerts.length + rankedAirQuality.length;

  console.log(`[DataQuality] Selected ${totalSelected} items, avg quality: ${avgQuality}`);
  console.log(`[DataQuality] Top sources: ${topSources.join(", ")}`);
  console.log("═══════════════════════════════════════════════════════════════");

  return {
    news: rankedNews,
    alerts: rankedAlerts,
    serviceAlerts: rankedServiceAlerts,
    airQuality: rankedAirQuality,
    dining: rankedDining,
    events: rankedEvents,
    summary: {
      totalEvaluated: newsArticles.length + alerts.length + dining.length + events.length,
      totalSelected,
      averageQuality: avgQuality,
      topSources,
    },
  };
}

/**
 * Get a quality report for all data sources.
 * Useful for monitoring and debugging data quality issues.
 */
export async function getDataQualityReport(): Promise<{
  timestamp: string;
  sources: Array<{
    name: string;
    itemCount: number;
    avgQuality: number;
    issues: string[];
  }>;
  recommendations: string[];
}> {
  const selection = await selectBestContent({ minQualityScore: 0 });
  const recommendations: string[] = [];

  // Analyze news quality
  const newsAvg = selection.news.length > 0
    ? Math.round(selection.news.reduce((a, b) => a + b.score.overall, 0) / selection.news.length)
    : 0;
  const newsIssues: string[] = [];
  const duplicateNews = selection.news.filter(n => n.score.flags.includes("potential_duplicate"));
  if (duplicateNews.length > 2) {
    newsIssues.push(`${duplicateNews.length} potential duplicate headlines`);
    recommendations.push("Consider improving news deduplication");
  }

  // Analyze alert quality
  const alertAvg = selection.alerts.length > 0
    ? Math.round(selection.alerts.reduce((a, b) => a + b.score.overall, 0) / selection.alerts.length)
    : 0;
  const alertIssues: string[] = [];
  const expiredAlerts = selection.alerts.filter(a => a.score.flags.includes("expired_alert"));
  if (expiredAlerts.length > 0) {
    alertIssues.push(`${expiredAlerts.length} expired alerts in selection`);
    recommendations.push("Run MTA scraper more frequently");
  }

  // Check for source diversity
  if (selection.summary.topSources.length < 2 && selection.news.length > 3) {
    recommendations.push("Low source diversity - consider adding more news sources");
  }

  // Check overall quality
  if (selection.summary.averageQuality < 60) {
    recommendations.push("Overall content quality is low - check data freshness");
  }

  return {
    timestamp: DateTime.now().toISO()!,
    sources: [
      { name: "News", itemCount: selection.news.length, avgQuality: newsAvg, issues: newsIssues },
      { name: "MTA Alerts", itemCount: selection.alerts.length, avgQuality: alertAvg, issues: alertIssues },
      { name: "Dining", itemCount: selection.dining.length, avgQuality: 75, issues: [] },
      { name: "Events", itemCount: selection.events.length, avgQuality: 80, issues: [] },
    ],
    recommendations,
  };
}
