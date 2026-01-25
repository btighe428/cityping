// src/lib/agents/scoring.ts
/**
 * UNIFIED SCORING MODULE
 *
 * Single scoring algorithm used across all agents. Replaces inconsistent
 * scoring approaches that existed in data-quality-agent.ts and content-curator-agent.ts.
 *
 * Scoring dimensions:
 * - Recency (25%): How fresh is the content?
 * - Relevance (30%): How NYC-specific is it?
 * - Impact (30%): How important/urgent is it?
 * - Completeness (15%): Is the data quality good?
 *
 * Usage:
 *   import { scoreContent, categorizeContent, generateDedupKey } from "./scoring";
 *   const scores = scoreContent({ title: "...", publishedAt: new Date(), ... });
 *   const category = categorizeContent(title, body);
 *   const key = generateDedupKey("news", title);
 */

import { DateTime } from "luxon";
import type { ContentScores, ContentCategory } from "./types";

// =============================================================================
// SCORING WEIGHTS
// =============================================================================

const WEIGHTS = {
  recency: 0.25,
  relevance: 0.30,
  impact: 0.30,
  completeness: 0.15,
};

// =============================================================================
// KEYWORD DICTIONARIES
// =============================================================================

/**
 * NYC-specific terms for relevance scoring.
 * Higher weight = more NYC-relevant.
 */
const NYC_TERMS = {
  // Boroughs and regions (high relevance)
  boroughs: [
    "nyc", "new york city", "manhattan", "brooklyn", "queens", "bronx", "staten island",
    "new york", "ny", "new yorker", "new yorkers",
  ],

  // Neighborhoods (high relevance)
  neighborhoods: [
    "harlem", "east harlem", "upper west side", "upper east side", "ues", "uws",
    "midtown", "hell's kitchen", "chelsea", "gramercy", "murray hill",
    "east village", "west village", "greenwich village", "soho", "tribeca", "noho", "nolita",
    "lower east side", "les", "chinatown", "little italy", "financial district", "fidi",
    "battery park", "two bridges", "alphabet city",
    // Brooklyn
    "williamsburg", "greenpoint", "bushwick", "bed-stuy", "bedford-stuyvesant",
    "crown heights", "park slope", "prospect heights", "dumbo", "brooklyn heights",
    "cobble hill", "carroll gardens", "red hook", "sunset park", "bay ridge",
    "flatbush", "ditmas park", "prospect lefferts", "fort greene", "clinton hill",
    "gowanus", "boerum hill", "downtown brooklyn", "brownsville", "east new york",
    // Queens
    "astoria", "long island city", "lic", "sunnyside", "woodside", "jackson heights",
    "flushing", "forest hills", "rego park", "jamaica", "ridgewood", "maspeth",
    // Bronx
    "south bronx", "mott haven", "hunts point", "fordham", "riverdale",
    "kingsbridge", "morris park", "pelham bay", "city island", "highbridge",
  ],

  // Transit (high relevance)
  transit: [
    "mta", "subway", "metro-north", "lirr", "nj transit", "path",
    "bus", "ferry", "nyc ferry", "station", "train", "commute",
    "a train", "b train", "c train", "d train", "e train", "f train", "g train",
    "j train", "l train", "m train", "n train", "q train", "r train", "w train",
    "1 train", "2 train", "3 train", "4 train", "5 train", "6 train", "7 train",
    "service change", "delay", "suspended", "shuttle bus",
  ],

  // NYC landmarks (medium relevance)
  landmarks: [
    "times square", "central park", "wall street", "broadway", "fifth avenue",
    "madison square garden", "msg", "yankee stadium", "citi field", "barclays",
    "empire state", "world trade", "hudson yards", "high line", "prospect park",
    "brooklyn bridge", "george washington bridge", "lincoln tunnel", "holland tunnel",
  ],

  // NYC government (medium relevance)
  government: [
    "mayor", "city council", "nypd", "fdny", "sanitation", "parks dept",
    "department of", "doe", "mta board", "city hall", "borough president",
    "eric adams", "kathy hochul", "nyc gov",
  ],

  // Local sources (credibility boost)
  localSources: [
    "gothamist", "thecity", "the city", "amny", "nypost", "ny post",
    "nydailynews", "daily news", "ny1", "pix11", "abc7ny", "nbc new york",
  ],
};

/**
 * Impact keywords - indicate importance/urgency.
 */
const IMPACT_KEYWORDS = {
  // High impact (urgent, safety, money)
  high: [
    "emergency", "evacuation", "closure", "closed", "suspended", "canceled",
    "free", "deadline", "last day", "last chance", "ends today", "opening",
    "breaking", "urgent", "alert", "warning",
    "shooting", "fire", "explosion", "crash", "death", "killed", "injured",
    "strike", "protest", "riot", "outage", "blackout",
    "billion", "million", "budget", "tax", "rent",
  ],

  // Medium impact (changes, updates)
  medium: [
    "delay", "update", "changes", "starting", "ending", "beginning",
    "sale", "discount", "deal", "percent off", "% off",
    "rain", "snow", "storm", "heat", "cold", "weather",
    "new", "launch", "announce", "reveal",
  ],

  // Policy impact (civic importance)
  civic: [
    "law", "bill", "vote", "election", "policy", "regulation",
    "zoning", "housing", "affordable", "rent stabilized",
    "school", "education", "hospital", "healthcare",
  ],
};

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate recency score based on content age.
 * Score decays over time with configurable curve.
 *
 * @param publishedAt - When the content was published
 * @returns Score 0-100 (100 = just published, 0 = very old)
 */
export function scoreRecency(publishedAt: Date | null | undefined): number {
  if (!publishedAt) return 30; // Unknown date gets low score

  const now = DateTime.now();
  const published = DateTime.fromJSDate(publishedAt);
  const hoursAgo = now.diff(published, "hours").hours;

  // Decay curve: starts at 100, drops off over 48 hours
  if (hoursAgo < 0) return 100; // Future date (scheduled)
  if (hoursAgo < 1) return 100;
  if (hoursAgo < 3) return 95;
  if (hoursAgo < 6) return 85;
  if (hoursAgo < 12) return 70;
  if (hoursAgo < 24) return 50;
  if (hoursAgo < 48) return 30;
  if (hoursAgo < 72) return 20;
  return 10;
}

/**
 * Calculate relevance score based on NYC-specific content.
 *
 * @param text - Combined title + body/summary text
 * @param source - Source attribution (e.g., "gothamist")
 * @returns Score 0-100 (100 = highly NYC-relevant)
 */
export function scoreRelevance(text: string, source?: string): number {
  const lowerText = text.toLowerCase();
  const lowerSource = (source || "").toLowerCase();
  let score = 40; // Base score

  // Check boroughs (high value)
  for (const term of NYC_TERMS.boroughs) {
    if (lowerText.includes(term)) {
      score += 15;
      break; // Only count once
    }
  }

  // Check neighborhoods (high value)
  for (const hood of NYC_TERMS.neighborhoods) {
    if (lowerText.includes(hood)) {
      score += 20;
      break;
    }
  }

  // Check transit terms (high value for commuters)
  for (const term of NYC_TERMS.transit) {
    if (lowerText.includes(term)) {
      score += 15;
      break;
    }
  }

  // Check landmarks (medium value)
  for (const landmark of NYC_TERMS.landmarks) {
    if (lowerText.includes(landmark)) {
      score += 10;
      break;
    }
  }

  // Check government terms (medium value)
  for (const term of NYC_TERMS.government) {
    if (lowerText.includes(term)) {
      score += 10;
      break;
    }
  }

  // Source credibility bonus
  for (const localSource of NYC_TERMS.localSources) {
    if (lowerSource.includes(localSource) || lowerText.includes(localSource)) {
      score += 10;
      break;
    }
  }

  return Math.min(100, score);
}

/**
 * Calculate impact score based on urgency and importance.
 *
 * @param text - Combined title + body/summary text
 * @param contentType - Type of content (alert, news, event, etc.)
 * @returns Score 0-100 (100 = high impact)
 */
export function scoreImpact(
  text: string,
  contentType?: "news" | "alert" | "event" | "deal" | "civic" | "weather" | "transit" | "housing"
): number {
  const lowerText = text.toLowerCase();
  let score = 40; // Base score

  // Check high-impact keywords
  let highImpactMatches = 0;
  for (const keyword of IMPACT_KEYWORDS.high) {
    if (lowerText.includes(keyword)) {
      highImpactMatches++;
      if (highImpactMatches <= 3) {
        score += 15; // Cap bonus at 3 matches
      }
    }
  }

  // Check medium-impact keywords
  let mediumImpactMatches = 0;
  for (const keyword of IMPACT_KEYWORDS.medium) {
    if (lowerText.includes(keyword)) {
      mediumImpactMatches++;
      if (mediumImpactMatches <= 3) {
        score += 8;
      }
    }
  }

  // Check civic keywords
  for (const keyword of IMPACT_KEYWORDS.civic) {
    if (lowerText.includes(keyword)) {
      score += 5;
      break;
    }
  }

  // Type-based adjustments
  switch (contentType) {
    case "alert":
      score += 20;
      break;
    case "transit":
      score += 15;
      break;
    case "weather":
      score += 10;
      break;
    case "deal":
      score += 5;
      break;
    case "housing":
      score -= 25; // Low relevance - housing lotteries rarely urgent
      break;
    default:
      break;
  }

  return Math.min(100, score);
}

/**
 * Calculate completeness score based on data quality.
 *
 * @param data - Object with optional title, body, url, source fields
 * @returns Score 0-100 (100 = fully complete)
 */
export function scoreCompleteness(data: {
  title?: string | null;
  body?: string | null;
  summary?: string | null;
  url?: string | null;
  source?: string | null;
}): number {
  let score = 0;

  // Title (required, 40 points max)
  if (data.title && data.title.trim().length > 0) {
    score += 25;
    if (data.title.length >= 10) score += 10;
    if (data.title.length >= 30) score += 5;
  }

  // Body or summary (important, 30 points max)
  const content = data.body || data.summary || "";
  if (content.trim().length > 0) {
    score += 15;
    if (content.length >= 50) score += 10;
    if (content.length >= 200) score += 5;
  }

  // URL (nice to have, 15 points)
  if (data.url) {
    try {
      new URL(data.url);
      score += 15;
    } catch {
      score += 5; // Invalid URL but present
    }
  }

  // Source attribution (nice to have, 15 points)
  if (data.source && data.source.trim().length > 0) {
    score += 15;
  }

  return Math.min(100, score);
}

/**
 * Calculate overall content score combining all dimensions.
 */
export function scoreContent(data: {
  title?: string | null;
  body?: string | null;
  summary?: string | null;
  url?: string | null;
  source?: string | null;
  publishedAt?: Date | null;
  createdAt?: Date | null;
  contentType?: "news" | "alert" | "event" | "deal" | "civic" | "weather" | "transit" | "housing";
}): ContentScores {
  const text = `${data.title || ""} ${data.body || data.summary || ""}`;
  const publishDate = data.publishedAt || data.createdAt || null;

  const recency = scoreRecency(publishDate);
  const relevance = scoreRelevance(text, data.source || undefined);
  const impact = scoreImpact(text, data.contentType);
  const completeness = scoreCompleteness(data);

  const overall = Math.round(
    recency * WEIGHTS.recency +
    relevance * WEIGHTS.relevance +
    impact * WEIGHTS.impact +
    completeness * WEIGHTS.completeness
  );

  return {
    recency,
    relevance,
    impact,
    completeness,
    overall,
  };
}

// =============================================================================
// CATEGORIZATION
// =============================================================================

/**
 * Categorize content based on keywords and type.
 */
export function categorizeContent(
  title: string,
  body?: string | null,
  contentType?: string
): ContentCategory {
  const text = `${title} ${body || ""}`.toLowerCase();

  // Breaking/urgent - highest priority
  if (
    text.includes("breaking") ||
    text.includes("emergency") ||
    text.includes("evacuation") ||
    text.includes("shooting") ||
    text.includes("explosion") ||
    contentType === "alert"
  ) {
    return "breaking";
  }

  // Essential - transit, weather
  if (
    contentType === "transit" ||
    contentType === "weather" ||
    text.match(/subway|mta|train|bus|delay|suspended|service change/i) ||
    text.match(/weather|rain|snow|storm|temperature|forecast/i)
  ) {
    return "essential";
  }

  // Money - deals, sales, free stuff
  if (
    contentType === "deal" ||
    text.match(/free|sale|discount|deal|cheap|save|lottery|affordable|percent off|% off/i)
  ) {
    return "money";
  }

  // Culture - events, arts, entertainment
  if (
    contentType === "event" ||
    text.match(/concert|show|festival|museum|exhibit|movie|theater|gallery|performance/i)
  ) {
    return "culture";
  }

  // Civic - government, policy
  if (
    contentType === "civic" ||
    text.match(/mayor|council|vote|law|policy|budget|zoning|election|bill/i)
  ) {
    return "civic";
  }

  // Lifestyle - food, health, tips
  if (
    text.match(/restaurant|food|recipe|health|fitness|wellness|tip|guide|how to/i)
  ) {
    return "lifestyle";
  }

  // Default to local news
  return "local";
}

// =============================================================================
// DEDUPLICATION
// =============================================================================

/**
 * Generate a deduplication key for content.
 * Used to identify duplicate stories across sources.
 *
 * @param contentType - Type prefix (news, alert, event, deal)
 * @param title - Content title
 * @returns Normalized dedup key string
 */
export function generateDedupKey(contentType: string, title: string): string {
  // Normalize: lowercase, remove punctuation, extract key words
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3) // Skip short words
    .sort() // Alphabetize for consistency
    .slice(0, 5) // Take top 5 words
    .join("-");

  return `${contentType}-${normalized}`;
}

/**
 * Check if two titles are likely duplicates using fuzzy matching.
 *
 * @param title1 - First title
 * @param title2 - Second title
 * @param threshold - Similarity threshold (0-1, default 0.7)
 * @returns True if titles are likely duplicates
 */
export function areTitlesSimilar(
  title1: string,
  title2: string,
  threshold: number = 0.7
): boolean {
  const key1 = generateDedupKey("", title1);
  const key2 = generateDedupKey("", title2);

  // Simple overlap calculation
  const words1 = new Set(key1.split("-"));
  const words2 = new Set(key2.split("-"));

  if (words1.size === 0 || words2.size === 0) return false;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  const similarity = intersection.size / union.size;
  return similarity >= threshold;
}

// =============================================================================
// SCORING THRESHOLDS
// =============================================================================

/**
 * Default quality thresholds for content selection.
 */
export const QUALITY_THRESHOLDS = {
  /** Minimum score to include in digest */
  minimum: 40,
  /** Score for "good" content */
  good: 60,
  /** Score for "excellent" content (featured) */
  excellent: 80,
};

/**
 * Check if content meets minimum quality threshold.
 */
export function meetsQualityThreshold(
  scores: ContentScores,
  threshold: number = QUALITY_THRESHOLDS.minimum
): boolean {
  return scores.overall >= threshold;
}
