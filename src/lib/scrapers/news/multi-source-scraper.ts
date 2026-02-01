/**
 * MULTI-SOURCE NEWS SCRAPER
 *
 * Unified scraper that fetches from all configured news sources in parallel.
 * Uses the sources registry for configuration and applies relevance multipliers.
 *
 * Architecture:
 * 1. Load enabled sources from registry
 * 2. Fetch all RSS feeds in parallel (with timeout + error isolation)
 * 3. Transform to unified NewsArticle format
 * 4. Deduplicate across sources (same story from multiple outlets)
 * 5. Apply relevance scoring based on source + content
 * 6. Upsert to database
 */

import { prisma } from "../../db";
import { parseRssFeed, type RssItem } from "./rss-parser";
import {
  getEnabledSources,
  getSourceById,
  type NewsSource,
} from "./sources";
import { DateTime } from "luxon";
import { normalizeUrl, checkCrossSourceDuplicate } from "../../dedup/cross-source-dedup";

// =============================================================================
// TYPES
// =============================================================================

export interface ScrapedArticle {
  source: string;
  sourceId: string;
  externalId: string;
  url: string;
  title: string;
  snippet: string | null;
  publishedAt: Date;
  category: string | null;
  author: string | null;
  imageUrl: string | null;
  relevanceScore: number;
}

export interface ScrapeResult {
  sourceId: string;
  sourceName: string;
  articlesFound: number;
  articlesCreated: number;
  articlesSkipped: number;
  errors: string[];
  durationMs: number;
}

export interface MultiScrapeResult {
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  totalArticlesFound: number;
  totalArticlesCreated: number;
  totalArticlesSkipped: number;
  totalDurationMs: number;
  results: ScrapeResult[];
  errors: string[];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  /** Maximum age of articles to ingest (hours) */
  maxArticleAgeHours: 48,
  /** Timeout per RSS fetch (ms) */
  fetchTimeoutMs: 15000,
  /** Maximum articles per source per run */
  maxArticlesPerSource: 50,
  /** Concurrency limit for parallel fetches */
  concurrencyLimit: 10,
  /** Minimum title length to consider valid */
  minTitleLength: 10,
};

// =============================================================================
// RSS FETCHING
// =============================================================================

/**
 * Fetch and parse RSS feed with timeout.
 * Uses the existing parseRssFeed which handles fetching internally.
 */
async function fetchRssFeedWithTimeout(
  url: string,
  timeoutMs: number
): Promise<RssItem[]> {
  // parseRssFeed already handles fetching, so we just call it directly
  // For timeout, we use Promise.race with a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([
    parseRssFeed(url),
    timeoutPromise,
  ]);
}

// =============================================================================
// CONTENT ANALYSIS FOR RELEVANCE
// =============================================================================

/**
 * Analyze article content for NYC relevance signals.
 */
function analyzeContentRelevance(title: string, snippet: string | null): number {
  const text = `${title} ${snippet || ""}`.toLowerCase();
  let score = 50; // Base score

  // NYC-specific keywords (boost)
  const nycKeywords = [
    "nyc", "new york", "manhattan", "brooklyn", "queens", "bronx", "staten island",
    "subway", "mta", "metro", "transit", "commute",
    "mayor", "city hall", "city council", "adams",
    "rent", "apartment", "housing", "landlord", "tenant",
    "congestion", "toll", "bridge", "tunnel",
    "nypd", "fdny", "sanitation",
    "times square", "central park", "prospect park",
    "jfk", "laguardia", "newark",
  ];

  for (const keyword of nycKeywords) {
    if (text.includes(keyword)) {
      score += 5;
    }
  }

  // Action-oriented keywords (boost)
  const actionKeywords = [
    "delayed", "suspended", "closed", "opening", "deadline",
    "free", "discount", "sale",
    "warning", "alert", "advisory",
    "new law", "takes effect", "starting",
  ];

  for (const keyword of actionKeywords) {
    if (text.includes(keyword)) {
      score += 3;
    }
  }

  // National/generic keywords (reduce)
  const genericKeywords = [
    "trump", "biden", "congress", "washington",
    "celebrity", "kardashian", "hollywood",
    "stock market", "wall street",
  ];

  for (const keyword of genericKeywords) {
    if (text.includes(keyword) && !text.includes("nyc") && !text.includes("new york")) {
      score -= 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

// =============================================================================
// ARTICLE TRANSFORMATION
// =============================================================================

/**
 * Transform RSS item to ScrapedArticle with relevance scoring.
 */
function transformRssItem(
  item: RssItem,
  source: NewsSource
): ScrapedArticle | null {
  // Validate required fields
  if (!item.title || item.title.length < CONFIG.minTitleLength) {
    return null;
  }
  if (!item.link) {
    return null;
  }

  // Parse publication date
  let publishedAt: Date;
  if (item.pubDate) {
    publishedAt = new Date(item.pubDate);
    if (isNaN(publishedAt.getTime())) {
      publishedAt = new Date();
    }
  } else {
    publishedAt = new Date();
  }

  // Check age
  const cutoff = DateTime.now().minus({ hours: CONFIG.maxArticleAgeHours }).toJSDate();
  if (publishedAt < cutoff) {
    return null;
  }

  // Extract external ID (prefer guid, fall back to URL)
  const externalId = item.guid || item.link;

  // Clean snippet (remove HTML, truncate)
  let snippet = item.description || null;
  if (snippet) {
    snippet = snippet
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
  }

  // Calculate relevance score
  const contentScore = analyzeContentRelevance(item.title, snippet);
  const relevanceScore = Math.round(contentScore * source.relevanceMultiplier);

  return {
    source: source.name,
    sourceId: source.id,
    externalId,
    url: item.link,
    title: item.title.trim(),
    snippet,
    publishedAt,
    category: item.categories?.[0] || null,
    author: item.author || null,
    imageUrl: item.enclosure?.url || null,
    relevanceScore: Math.min(100, relevanceScore),
  };
}

// =============================================================================
// SINGLE SOURCE SCRAPER
// =============================================================================

/**
 * Scrape a single news source.
 */
async function scrapeSingleSource(source: NewsSource): Promise<ScrapeResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let articlesFound = 0;
  let articlesCreated = 0;
  let articlesSkipped = 0;

  try {
    // Fetch RSS feed
    const items = await fetchRssFeedWithTimeout(source.rssUrl, CONFIG.fetchTimeoutMs);
    articlesFound = items.length;

    // Transform and filter
    const articles = items
      .map((item) => transformRssItem(item, source))
      .filter((a): a is ScrapedArticle => a !== null)
      .slice(0, CONFIG.maxArticlesPerSource);

    // Upsert to database with cross-source deduplication
    for (const article of articles) {
      try {
        // First check for cross-source duplicates (same story from different sources)
        const dupCheck = await checkCrossSourceDuplicate({
          title: article.title,
          url: article.url,
          source: article.sourceId,
          snippet: article.snippet,
          externalId: article.externalId,
        }, {
          lookbackHours: 48,
          titleThreshold: 0.75,
        });

        if (dupCheck.isDuplicate) {
          console.log(`[MultiSource:${source.id}] Cross-source duplicate: "${article.title.substring(0, 50)}..." matches ${dupCheck.existingSource} (${dupCheck.matchMethod})`);
          articlesSkipped++;
          continue;
        }

        // Use atomic upsert to prevent race conditions
        const result = await prisma.newsArticle.upsert({
          where: {
            source_externalId: {
              source: article.sourceId,
              externalId: article.externalId,
            },
          },
          update: {
            // Update fields if content changed (handles updates)
            title: article.title,
            snippet: article.snippet,
            url: article.url,
            // normalizedUrl: normalizeUrl(article.url), // TODO: Add after schema migration
            category: article.category,
            author: article.author,
            imageUrl: article.imageUrl,
          },
          create: {
            source: article.sourceId,
            externalId: article.externalId,
            url: article.url,
            // normalizedUrl: normalizeUrl(article.url), // TODO: Add after schema migration
            title: article.title,
            snippet: article.snippet,
            publishedAt: article.publishedAt,
            category: article.category,
            author: article.author,
            imageUrl: article.imageUrl,
          },
          select: {
            id: true,
            createdAt: true,
          },
        });

        // Check if this is newly created by comparing ID to a follow-up check
        // (upsert doesn't return whether it was insert or update)
        // Use a simple heuristic: if createdAt is within last second, it's new
        const isNewlyCreated = (Date.now() - result.createdAt.getTime()) < 2000;
        if (isNewlyCreated) {
          articlesCreated++;
        } else {
          // Article was updated (content changed)
          articlesSkipped++;
        }
      } catch (dbError) {
        const errorMsg = dbError instanceof Error ? dbError.message : String(dbError);
        console.warn(`[MultiSource:${source.id}] Database error for "${article.title.substring(0, 50)}...": ${errorMsg}`);
        errors.push(`DB error: ${errorMsg}`);
        articlesSkipped++;
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(`${source.name}: ${msg}`);
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    articlesFound,
    articlesCreated,
    articlesSkipped,
    errors,
    durationMs: Date.now() - startTime,
  };
}

// =============================================================================
// MULTI-SOURCE ORCHESTRATION
// =============================================================================

/**
 * Chunk array into smaller arrays for controlled concurrency.
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Scrape all enabled news sources with controlled concurrency.
 */
export async function scrapeAllNewsSources(): Promise<MultiScrapeResult> {
  const startTime = Date.now();
  const sources = getEnabledSources();
  const results: ScrapeResult[] = [];
  const errors: string[] = [];

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`[MultiSourceScraper] Starting scrape of ${sources.length} sources`);
  console.log("═══════════════════════════════════════════════════════════════");

  // Process in batches for controlled concurrency
  const batches = chunk(sources, CONFIG.concurrencyLimit);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`[MultiSourceScraper] Batch ${i + 1}/${batches.length}: ${batch.map(s => s.id).join(", ")}`);

    const batchResults = await Promise.allSettled(
      batch.map((source) => scrapeSingleSource(source))
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
        if (result.value.errors.length > 0) {
          errors.push(...result.value.errors);
        }
      } else {
        errors.push(`Batch error: ${result.reason}`);
      }
    }
  }

  // Calculate totals
  const successfulSources = results.filter((r) => r.errors.length === 0).length;
  const failedSources = results.filter((r) => r.errors.length > 0).length;
  const totalArticlesFound = results.reduce((sum, r) => sum + r.articlesFound, 0);
  const totalArticlesCreated = results.reduce((sum, r) => sum + r.articlesCreated, 0);
  const totalArticlesSkipped = results.reduce((sum, r) => sum + r.articlesSkipped, 0);
  const totalDurationMs = Date.now() - startTime;

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`[MultiSourceScraper] Complete in ${(totalDurationMs / 1000).toFixed(2)}s`);
  console.log(`[MultiSourceScraper] Sources: ${successfulSources}/${sources.length} successful`);
  console.log(`[MultiSourceScraper] Articles: ${totalArticlesCreated} created, ${totalArticlesSkipped} skipped`);
  console.log("═══════════════════════════════════════════════════════════════");

  return {
    totalSources: sources.length,
    successfulSources,
    failedSources,
    totalArticlesFound,
    totalArticlesCreated,
    totalArticlesSkipped,
    totalDurationMs,
    results,
    errors,
  };
}

/**
 * Scrape specific sources by ID.
 */
export async function scrapeSourcesByIds(sourceIds: string[]): Promise<MultiScrapeResult> {
  const startTime = Date.now();
  const sources = sourceIds
    .map((id) => getSourceById(id))
    .filter((s): s is NewsSource => s !== undefined && s.enabled);

  if (sources.length === 0) {
    return {
      totalSources: 0,
      successfulSources: 0,
      failedSources: 0,
      totalArticlesFound: 0,
      totalArticlesCreated: 0,
      totalArticlesSkipped: 0,
      totalDurationMs: Date.now() - startTime,
      results: [],
      errors: ["No valid source IDs provided"],
    };
  }

  const results = await Promise.all(sources.map((s) => scrapeSingleSource(s)));

  return {
    totalSources: sources.length,
    successfulSources: results.filter((r) => r.errors.length === 0).length,
    failedSources: results.filter((r) => r.errors.length > 0).length,
    totalArticlesFound: results.reduce((sum, r) => sum + r.articlesFound, 0),
    totalArticlesCreated: results.reduce((sum, r) => sum + r.articlesCreated, 0),
    totalArticlesSkipped: results.reduce((sum, r) => sum + r.articlesSkipped, 0),
    totalDurationMs: Date.now() - startTime,
    results,
    errors: results.flatMap((r) => r.errors),
  };
}

/**
 * Scrape sources by tier.
 */
export async function scrapeSourcesByTier(tier: 1 | 2 | 3): Promise<MultiScrapeResult> {
  const sources = getEnabledSources().filter((s) => s.tier === tier);
  const sourceIds = sources.map((s) => s.id);
  return scrapeSourcesByIds(sourceIds);
}
