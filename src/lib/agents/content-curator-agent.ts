/**
 * CONTENT CURATOR AGENT
 *
 * Stage 2.5 (Extension) of the CityPing multi-agent pipeline.
 *
 * Role: The Editor-in-Chief
 *
 * Responsibilities:
 * - Evaluate and score content relevance for NYC residents
 * - Deduplicate stories across sources (same event, different outlets)
 * - Select top stories based on impact, timeliness, and local relevance
 * - Categorize content into themes (transit, safety, deals, events, civic)
 * - Generate "why you should care" context for each story
 * - Balance content mix (don't send 5 crime stories)
 *
 * Output: CurationResult with deduplication stats
 *
 * Philosophy: A busy New Yorker has 2 minutes. What MUST they know today?
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db";
import { DateTime } from "luxon";

// Import unified types and scoring
import {
  scoreContent,
  categorizeContent as unifyCategorize,
  generateDedupKey as generateDedupKeyV2,
  areTitlesSimilar,
  meetsQualityThreshold,
} from "./scoring";

import type {
  ContentSelectionV2,
  CurationResult as CurationResultV2,
  CurationConfig,
  CuratedContent,
  ScoredNewsArticle,
  ScoredAlertEvent,
  ScoredParkEvent,
  ScoredDiningDeal,
  ContentCategory as ContentCategoryV2,
} from "./types";

import { DEFAULT_CURATION_CONFIG } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface ContentItem {
  id: string;
  type: "news" | "alert" | "event" | "deal" | "civic" | "weather" | "transit";
  source: string;
  title: string;
  summary?: string;
  url?: string;
  publishedAt: Date;
  location?: string;
  neighborhood?: string;
  metadata?: Record<string, unknown>;
}

export interface ScoredContent extends ContentItem {
  relevanceScore: number; // 0-100
  timelinessScore: number; // 0-100
  impactScore: number; // 0-100
  overallScore: number; // 0-100
  category: ContentCategory;
  whyYouShouldCare?: string;
  dedupKey?: string;
}

export type ContentCategory =
  | "breaking"      // Urgent: delays, closures, emergencies
  | "essential"     // Must-know: weather, major transit
  | "money"         // Deals, sales, free stuff
  | "local"         // Neighborhood news
  | "civic"         // Government, policy
  | "culture"       // Events, arts, entertainment
  | "lifestyle";    // Food, health, tips

export interface CurationResult {
  topStories: ScoredContent[];
  byCategory: Record<ContentCategory, ScoredContent[]>;
  dropped: { item: ContentItem; reason: string }[];
  stats: {
    totalInput: number;
    afterDedup: number;
    selected: number;
    avgRelevance: number;
  };
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  /** Maximum stories per category in final output */
  maxPerCategory: 3,
  /** Maximum total stories in digest */
  maxTotal: 12,
  /** Minimum relevance score to include */
  minRelevanceScore: 40,
  /** Hours before content is considered stale */
  staleHours: 48,
  /** Weight for timeliness in overall score */
  timelinessWeight: 0.3,
  /** Weight for impact in overall score */
  impactWeight: 0.4,
  /** Weight for relevance in overall score */
  relevanceWeight: 0.3,
};

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate timeliness score based on age.
 */
function scoreTimeliness(publishedAt: Date): number {
  const now = DateTime.now();
  const published = DateTime.fromJSDate(publishedAt);
  const hoursAgo = now.diff(published, "hours").hours;

  if (hoursAgo < 1) return 100;
  if (hoursAgo < 3) return 95;
  if (hoursAgo < 6) return 85;
  if (hoursAgo < 12) return 70;
  if (hoursAgo < 24) return 50;
  if (hoursAgo < 48) return 30;
  return 10;
}

/**
 * Estimate impact score based on content signals.
 */
function scoreImpact(item: ContentItem): number {
  let score = 50; // Base score

  const title = item.title.toLowerCase();
  const summary = (item.summary || "").toLowerCase();
  const text = `${title} ${summary}`;

  // High impact keywords
  const highImpact = [
    "emergency", "evacuation", "closure", "suspended", "canceled",
    "free", "deadline", "last day", "opening", "new", "breaking",
    "shooting", "fire", "explosion", "crash", "death", "killed",
    "mayor", "governor", "billion", "million", "strike", "protest"
  ];

  const mediumImpact = [
    "delay", "alert", "warning", "update", "changes", "starting",
    "ending", "sale", "discount", "deal", "rain", "snow", "storm"
  ];

  for (const word of highImpact) {
    if (text.includes(word)) score += 15;
  }

  for (const word of mediumImpact) {
    if (text.includes(word)) score += 8;
  }

  // Type-based adjustments
  if (item.type === "alert") score += 20;
  if (item.type === "weather") score += 10;
  if (item.type === "transit") score += 15;

  return Math.min(100, score);
}

/**
 * Score local relevance to NYC.
 */
function scoreRelevance(item: ContentItem): number {
  let score = 50;

  const title = item.title.toLowerCase();
  const summary = (item.summary || "").toLowerCase();
  const text = `${title} ${summary}`;

  // NYC-specific terms
  const nycTerms = [
    "nyc", "new york", "manhattan", "brooklyn", "queens", "bronx", "staten island",
    "mta", "subway", "metro-north", "lirr", "bus", "ferry",
    "times square", "central park", "wall street", "broadway",
    "de blasio", "adams", "hochul", "cuomo",
    "nypd", "fdny", "sanitation", "parks dept"
  ];

  // Neighborhood names
  const neighborhoods = [
    "harlem", "soho", "tribeca", "chelsea", "midtown", "upper east", "upper west",
    "lower east", "east village", "west village", "williamsburg", "bushwick",
    "bed-stuy", "crown heights", "park slope", "dumbo", "astoria", "flushing",
    "jackson heights", "long island city", "greenpoint", "cobble hill"
  ];

  for (const term of nycTerms) {
    if (text.includes(term)) score += 10;
  }

  for (const hood of neighborhoods) {
    if (text.includes(hood)) {
      score += 15;
      break;
    }
  }

  // Source credibility for NYC news
  const localSources = ["gothamist", "thecity", "amny", "nypost", "nydailynews", "ny1"];
  if (localSources.includes(item.source.toLowerCase())) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Categorize content item.
 */
function categorize(item: ContentItem): ContentCategory {
  const text = `${item.title} ${item.summary || ""}`.toLowerCase();

  // Breaking/urgent
  if (item.type === "alert" || text.includes("breaking") || text.includes("emergency")) {
    return "breaking";
  }

  // Transit
  if (item.type === "transit" || text.match(/subway|mta|train|bus|delay|suspended/)) {
    return "essential";
  }

  // Weather
  if (item.type === "weather" || text.match(/weather|rain|snow|storm|temperature/)) {
    return "essential";
  }

  // Money/deals
  if (item.type === "deal" || text.match(/free|sale|discount|deal|cheap|save|lottery/)) {
    return "money";
  }

  // Events/culture
  if (item.type === "event" || text.match(/concert|show|festival|museum|exhibit|movie/)) {
    return "culture";
  }

  // Civic
  if (item.type === "civic" || text.match(/mayor|council|vote|law|policy|budget/)) {
    return "civic";
  }

  // Default to local news
  return "local";
}

/**
 * Generate deduplication key for content.
 */
function generateDedupKey(item: ContentItem): string {
  // Extract key entities from title
  const words = item.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3)
    .sort()
    .slice(0, 5)
    .join("-");

  return `${item.type}-${words}`;
}

// =============================================================================
// AI-POWERED CURATION
// =============================================================================

const anthropic = new Anthropic();

/**
 * Use Claude to generate "why you should care" for top stories.
 */
async function generateWhyYouShouldCare(items: ScoredContent[]): Promise<ScoredContent[]> {
  if (items.length === 0) return items;

  const prompt = `You are a NYC local news editor. For each story, write a single punchy sentence (max 15 words) explaining why a busy New Yorker should care. Be specific and actionable.

Stories:
${items.map((item, i) => `${i + 1}. ${item.title}${item.summary ? ` - ${item.summary}` : ""}`).join("\n")}

Respond with JSON array of strings, one per story:
["sentence 1", "sentence 2", ...]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\[[\s\S]*\]/);

    if (match) {
      const reasons = JSON.parse(match[0]) as string[];
      return items.map((item, i) => ({
        ...item,
        whyYouShouldCare: reasons[i] || undefined,
      }));
    }
  } catch (error) {
    console.error("[ContentCurator] Failed to generate why-you-should-care:", error);
  }

  return items;
}

// =============================================================================
// MAIN CURATION FUNCTION
// =============================================================================

/**
 * Curate content from all sources into a digestible selection.
 */
export async function curateContent(items: ContentItem[]): Promise<CurationResult> {
  console.log(`[ContentCurator] Starting curation of ${items.length} items`);

  const dropped: CurationResult["dropped"] = [];
  const now = DateTime.now();

  // Step 1: Filter stale content
  const filtered = items.filter(item => {
    const age = now.diff(DateTime.fromJSDate(item.publishedAt), "hours").hours;
    if (age > CONFIG.staleHours) {
      dropped.push({ item, reason: `Stale (${Math.round(age)}h old)` });
      return false;
    }
    return true;
  });

  console.log(`[ContentCurator] After stale filter: ${filtered.length}`);

  // Step 2: Score all content
  const scored: ScoredContent[] = filtered.map(item => {
    const relevanceScore = scoreRelevance(item);
    const timelinessScore = scoreTimeliness(item.publishedAt);
    const impactScore = scoreImpact(item);

    const overallScore = Math.round(
      relevanceScore * CONFIG.relevanceWeight +
      timelinessScore * CONFIG.timelinessWeight +
      impactScore * CONFIG.impactWeight
    );

    return {
      ...item,
      relevanceScore,
      timelinessScore,
      impactScore,
      overallScore,
      category: categorize(item),
      dedupKey: generateDedupKey(item),
    };
  });

  // Step 3: Filter low relevance
  const relevant = scored.filter(item => {
    if (item.relevanceScore < CONFIG.minRelevanceScore) {
      dropped.push({ item, reason: `Low relevance (${item.relevanceScore})` });
      return false;
    }
    return true;
  });

  console.log(`[ContentCurator] After relevance filter: ${relevant.length}`);

  // Step 4: Deduplicate
  const dedupMap = new Map<string, ScoredContent>();
  for (const item of relevant) {
    const existing = dedupMap.get(item.dedupKey!);
    if (!existing || item.overallScore > existing.overallScore) {
      if (existing) {
        dropped.push({ item: existing, reason: "Duplicate (lower score)" });
      }
      dedupMap.set(item.dedupKey!, item);
    } else {
      dropped.push({ item, reason: "Duplicate (lower score)" });
    }
  }

  const deduped = Array.from(dedupMap.values());
  console.log(`[ContentCurator] After dedup: ${deduped.length}`);

  // Step 5: Sort by overall score
  deduped.sort((a, b) => b.overallScore - a.overallScore);

  // Step 6: Group by category with limits
  const byCategory: Record<ContentCategory, ScoredContent[]> = {
    breaking: [],
    essential: [],
    money: [],
    local: [],
    civic: [],
    culture: [],
    lifestyle: [],
  };

  for (const item of deduped) {
    if (byCategory[item.category].length < CONFIG.maxPerCategory) {
      byCategory[item.category].push(item);
    }
  }

  // Step 7: Select top stories (balanced mix)
  const topStories: ScoredContent[] = [];
  const categoryPriority: ContentCategory[] = [
    "breaking", "essential", "money", "local", "culture", "civic", "lifestyle"
  ];

  // First pass: take top from each category
  for (const category of categoryPriority) {
    if (byCategory[category].length > 0 && topStories.length < CONFIG.maxTotal) {
      topStories.push(byCategory[category][0]);
    }
  }

  // Second pass: fill remaining slots with highest scored
  const remaining = deduped.filter(item => !topStories.includes(item));
  for (const item of remaining) {
    if (topStories.length >= CONFIG.maxTotal) break;
    topStories.push(item);
  }

  // Step 8: Generate "why you should care" for top stories
  const enrichedTopStories = await generateWhyYouShouldCare(topStories.slice(0, 5));
  topStories.splice(0, enrichedTopStories.length, ...enrichedTopStories);

  // Calculate stats
  const avgRelevance = topStories.length > 0
    ? Math.round(topStories.reduce((sum, item) => sum + item.relevanceScore, 0) / topStories.length)
    : 0;

  console.log(`[ContentCurator] Final selection: ${topStories.length} stories`);

  return {
    topStories,
    byCategory,
    dropped,
    stats: {
      totalInput: items.length,
      afterDedup: deduped.length,
      selected: topStories.length,
      avgRelevance,
    },
  };
}

// =============================================================================
// DATABASE INTEGRATION
// =============================================================================

/**
 * Fetch all recent content from database and curate.
 */
export async function curateFromDatabase(): Promise<CurationResult> {
  const since = DateTime.now().minus({ hours: CONFIG.staleHours }).toJSDate();

  // Fetch from all content sources
  const [news, alerts, events] = await Promise.all([
    // News articles
    prisma.newsArticle.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

    // Alert events (MTA, 311, etc)
    prisma.alertEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // Park events (free activities in NYC parks)
    prisma.parkEvent.findMany({
      where: {
        date: {
          gte: new Date(),
          lte: DateTime.now().plus({ days: 7 }).toJSDate(),
        },
      },
      orderBy: { date: "asc" },
      take: 20,
    }),
  ]);

  // Transform to ContentItem format
  const items: ContentItem[] = [
    ...news.map(n => ({
      id: n.id,
      type: "news" as const,
      source: n.source,
      title: n.title,
      summary: n.summary || undefined,
      url: n.url,
      publishedAt: n.publishedAt || n.createdAt,
    })),

    ...alerts.map(a => ({
      id: a.id,
      type: "alert" as const,
      source: a.sourceId || "mta",
      title: a.title,
      summary: a.body || undefined,
      publishedAt: a.createdAt,
    })),

    ...events.map(e => ({
      id: e.id,
      type: "event" as const,
      source: "nyc-parks",
      title: e.name,
      summary: `${e.category || "Event"} at ${e.parkName || "NYC Park"}`,
      publishedAt: e.createdAt,
      location: e.parkName || e.address || undefined,
    })),
  ];

  return curateContent(items);
}

// =============================================================================
// V2 CURATION - Accepts ContentSelectionV2, uses unified scoring
// =============================================================================

type ScoredItem = ScoredNewsArticle | ScoredAlertEvent | ScoredParkEvent | ScoredDiningDeal;

/**
 * Curate content from ContentSelectionV2.
 *
 * This is the Stage 2.5 function for the V2 pipeline.
 *
 * Key improvements:
 * - Accepts pre-scored content from selectBestContentV2
 * - Uses unified scoring (already applied)
 * - Focuses on deduplication and "why you should care" generation
 * - Returns CurationResult with detailed stats
 */
export async function curateContentV2(
  selection: ContentSelectionV2,
  config: Partial<CurationConfig> = {}
): Promise<CurationResultV2> {
  const cfg = { ...DEFAULT_CURATION_CONFIG, ...config };

  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 2.5: CONTENT CURATOR - Curating Selection            │");
  console.log("└──────────────────────────────────────────────────────────────┘");

  const startTime = Date.now();

  // Combine all content from selection (already scored)
  const allContent: ScoredItem[] = [
    ...selection.news,
    ...selection.alerts,
    ...selection.events,
    ...selection.dining,
  ];

  const totalInput = allContent.length;
  console.log(`[Curator] Processing ${totalInput} pre-scored items`);

  const dropped: CurationResultV2["dropped"] = [];

  // Step 1: Additional deduplication across content types
  // (selectBestContentV2 dedupes within types, but not across)
  const dedupMap = new Map<string, ScoredItem>();
  let duplicatesRemoved = 0;

  for (const item of allContent) {
    const key = item.dedupKey;
    const existing = dedupMap.get(key);

    if (existing) {
      // Keep the one with higher score
      if (item.scores.overall > existing.scores.overall) {
        dropped.push({
          item: existing,
          reason: `Duplicate of "${getItemTitle(item)}" (lower score)`,
        });
        dedupMap.set(key, item);
      } else {
        dropped.push({
          item,
          reason: `Duplicate of "${getItemTitle(existing)}" (lower score)`,
        });
      }
      duplicatesRemoved++;
    } else {
      // Check for fuzzy duplicates
      let isFuzzyDupe = false;
      for (const [, existingItem] of dedupMap) {
        if (areTitlesSimilar(getItemTitle(item), getItemTitle(existingItem), 0.8)) {
          if (item.scores.overall > existingItem.scores.overall) {
            dropped.push({
              item: existingItem,
              reason: `Similar to "${getItemTitle(item)}" (lower score)`,
            });
            dedupMap.delete(existingItem.dedupKey);
            dedupMap.set(key, item);
          } else {
            dropped.push({
              item,
              reason: `Similar to "${getItemTitle(existingItem)}" (lower score)`,
            });
          }
          duplicatesRemoved++;
          isFuzzyDupe = true;
          break;
        }
      }
      if (!isFuzzyDupe) {
        dedupMap.set(key, item);
      }
    }
  }

  const afterDedup = dedupMap.size;
  console.log(`[Curator] After dedup: ${afterDedup} items (removed ${duplicatesRemoved} duplicates)`);

  // Step 2: Sort by overall score
  const dedupedItems = Array.from(dedupMap.values());
  dedupedItems.sort((a, b) => b.scores.overall - a.scores.overall);

  // Step 3: Group by category with limits
  const byCategory: Record<ContentCategoryV2, CuratedContent[]> = {
    breaking: [],
    essential: [],
    money: [],
    local: [],
    civic: [],
    culture: [],
    lifestyle: [],
  };

  const maxPerCat = cfg.maxPerCategory || 3;

  for (const item of dedupedItems) {
    if (byCategory[item.category].length < maxPerCat) {
      byCategory[item.category].push({
        item,
        whyYouShouldCare: undefined, // Will be generated below if enabled
      });
    }
  }

  // Step 4: Select top stories with balanced mix
  const curatedContent: CuratedContent[] = [];
  const maxTotal = cfg.maxTotal || 12;
  const categoryPriority: ContentCategoryV2[] = [
    "breaking", "essential", "money", "local", "culture", "civic", "lifestyle"
  ];

  // First pass: take top from each category
  for (const category of categoryPriority) {
    if (byCategory[category].length > 0 && curatedContent.length < maxTotal) {
      curatedContent.push(byCategory[category][0]);
    }
  }

  // Second pass: fill remaining with highest scored
  const alreadySelected = new Set(curatedContent.map(c => c.item.dedupKey));
  for (const item of dedupedItems) {
    if (curatedContent.length >= maxTotal) break;
    if (!alreadySelected.has(item.dedupKey)) {
      curatedContent.push({ item });
      alreadySelected.add(item.dedupKey);
    }
  }

  // Step 5: Generate "why you should care" for top items (if enabled)
  if (cfg.generateWhyCare) {
    const topItems = curatedContent.slice(0, 5);
    console.log(`[Curator] Generating "why you should care" for top ${topItems.length} items`);

    const enriched = await generateWhyYouShouldCareV2(topItems);
    for (let i = 0; i < enriched.length; i++) {
      curatedContent[i] = enriched[i];
    }
  }

  // Calculate stats
  const avgRelevance = curatedContent.length > 0
    ? Math.round(curatedContent.reduce((sum, c) => sum + c.item.scores.relevance, 0) / curatedContent.length)
    : 0;

  const lowQualityFiltered = dropped.filter(d => d.reason.includes("low")).length;

  const duration = Date.now() - startTime;
  console.log(`[Curator] Curated ${curatedContent.length} items in ${duration}ms`);

  return {
    curatedContent,
    byCategory,
    stats: {
      totalInput,
      afterDedup,
      selected: curatedContent.length,
      duplicatesRemoved,
      lowQualityFiltered,
      avgRelevance,
    },
    dropped,
  };
}

/**
 * Get title from any scored item type.
 */
function getItemTitle(item: ScoredItem): string {
  if ("title" in item) return item.title;
  if ("name" in item) return item.name;
  return "Unknown";
}

/**
 * Generate "why you should care" for curated items using Claude.
 */
async function generateWhyYouShouldCareV2(items: CuratedContent[]): Promise<CuratedContent[]> {
  if (items.length === 0) return items;

  const anthropic = new Anthropic();

  const itemSummaries = items.map((c, i) => {
    const title = getItemTitle(c.item);
    const summary = "summary" in c.item ? c.item.summary :
                    "body" in c.item ? c.item.body :
                    "description" in c.item ? c.item.description : "";
    return `${i + 1}. ${title}${summary ? ` - ${summary}` : ""}`;
  }).join("\n");

  const prompt = `You are a NYC local news editor. For each story, write a single punchy sentence (max 15 words) explaining why a busy New Yorker should care. Be specific and actionable.

Stories:
${itemSummaries}

Respond with JSON array of strings, one per story:
["sentence 1", "sentence 2", ...]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\[[\s\S]*\]/);

    if (match) {
      const reasons = JSON.parse(match[0]) as string[];
      return items.map((item, i) => ({
        ...item,
        whyYouShouldCare: reasons[i] || undefined,
      }));
    }
  } catch (error) {
    console.error("[Curator] Failed to generate why-you-should-care:", error);
  }

  return items;
}
