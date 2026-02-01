/**
 * CROSS-SOURCE DEDUPLICATION SERVICE
 *
 * Prevents the same story from multiple sources (NYT, Gothamist, etc.)
 * from creating duplicate database entries.
 *
 * Uses a 3-stage cascade: URL → Title → Semantic matching
 */

import { prisma } from "../db";
import { areTitlesSimilar, generateDedupKey } from "../agents/scoring";
import { cosineSimilarity } from "../embeddings/embedding-service";

export interface DeduplicationCandidate {
  title: string;
  url: string;
  source: string;
  snippet?: string | null;
  externalId: string;
}

export interface DedupCheckResult {
  isDuplicate: boolean;
  existingArticleId?: string;
  existingSource?: string;
  matchMethod: "none" | "url" | "title" | "semantic" | "fingerprint";
  similarity?: number;
}

// Common tracking params to strip from URLs
const TRACKING_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "fbclid", "gclid", "ref", "source", "campaign", "medium"
];

/**
 * Normalize URL for comparison by:
 * - Removing www prefix
 * - Stripping tracking parameters
 * - Removing trailing slashes
 * - Lowercasing
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove www prefix
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    // Remove tracking params
    const searchParams = new URLSearchParams(parsed.search);
    TRACKING_PARAMS.forEach(p => searchParams.delete(p));
    // Rebuild URL
    const search = searchParams.toString();
    const path = parsed.pathname.replace(/\/$/, ""); // Remove trailing slash
    return `${hostname}${path}${search ? "?" + search : ""}`;
  } catch {
    // Invalid URL - return as-is
    return url.toLowerCase().trim();
  }
}

/**
 * Extract URL signature (domain + canonical path) for matching
 * Same story on different sources often has similar path structures
 */
export function getUrlSignature(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    // Normalize path: remove dates, trailing IDs, etc.
    const path = parsed.pathname
      .replace(/\/\d{4}\/\d{2}\/\d{2}\//g, "/DATE/") // Date slugs
      .replace(/-\d+\.html?$/, ".html") // Numeric ID suffixes
      .replace(/\d{4,}/g, "ID") // Long numeric IDs
      .replace(/\/$/, "");
    return `${hostname}${path}`;
  } catch {
    return null;
  }
}

/**
 * Generate content fingerprint from key entities
 * Catches stories like "5 injured" vs "Five injured in fire"
 */
export function generateContentFingerprint(title: string, snippet?: string | null): string {
  const text = `${title} ${snippet || ""}`.toLowerCase();
  // Extract key entities: numbers, boroughs, transit lines, event types
  const entities = [
    ...(text.match(/\b\d+\b/g) || []), // Numbers
    ...(text.match(/\b(?:queens|brooklyn|bronx|manhattan|staten island)\b/g) || []),
    ...(text.match(/\b(?:mta|subway|train|bus|ferry)\b/g) || []),
    ...(text.match(/\b(?:fire|crash|delay|accident|shooting|arrest|protest)\b/g) || []),
    ...(text.match(/\b[a-z] train\b/g) || []), // Train lines
  ];
  return entities.slice(0, 6).sort().join("|");
}

/**
 * Check if a candidate article is a duplicate of existing content.
 *
 * 3-Stage Cascade:
 * 1. URL matching (exact normalized URL)
 * 2. URL signature matching (same story structure, different sources)
 * 3. Title similarity (fuzzy matching on normalized titles)
 * 4. Content fingerprint (catches rephrased stories)
 */
export async function checkCrossSourceDuplicate(
  candidate: DeduplicationCandidate,
  options: {
    lookbackHours?: number;
    titleThreshold?: number;
  } = {}
): Promise<DedupCheckResult> {
  const { lookbackHours = 48, titleThreshold = 0.75 } = options;

  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const normalizedUrl = normalizeUrl(candidate.url);
  const candidateFingerprint = generateContentFingerprint(candidate.title, candidate.snippet);

  // Stage 1: Exact URL match (fastest)
  // Note: normalizedUrl field will be added in a future schema migration
  const existingByUrl = await prisma.newsArticle.findFirst({
    where: {
      url: { equals: candidate.url, mode: "insensitive" },
      publishedAt: { gte: cutoff },
    },
    select: { id: true, source: true, title: true },
  });

  if (existingByUrl) {
    return {
      isDuplicate: true,
      existingArticleId: existingByUrl.id,
      existingSource: existingByUrl.source,
      matchMethod: "url",
    };
  }

  // Fetch potential matches (recent articles from other sources)
  const potentialMatches = await prisma.newsArticle.findMany({
    where: {
      publishedAt: { gte: cutoff },
      source: { not: candidate.source },
    },
    select: {
      id: true,
      source: true,
      title: true,
      url: true,
      snippet: true,
      externalId: true,
    },
    take: 100, // Limit for query performance
    orderBy: { publishedAt: "desc" },
  });

  // Stage 2: URL signature matching
  const candidateSignature = getUrlSignature(candidate.url);
  if (candidateSignature) {
    for (const existing of potentialMatches) {
      const existingSignature = getUrlSignature(existing.url);
      if (existingSignature && existingSignature === candidateSignature) {
        return {
          isDuplicate: true,
          existingArticleId: existing.id,
          existingSource: existing.source,
          matchMethod: "url",
        };
      }
    }
  }

  // Stage 3: Title similarity
  for (const existing of potentialMatches) {
    if (areTitlesSimilar(candidate.title, existing.title, titleThreshold)) {
      return {
        isDuplicate: true,
        existingArticleId: existing.id,
        existingSource: existing.source,
        matchMethod: "title",
        similarity: calculateTitleSimilarity(candidate.title, existing.title),
      };
    }
  }

  // Stage 4: Content fingerprint (for rephrased stories)
  if (candidateFingerprint.length > 5) {
    for (const existing of potentialMatches) {
      const existingFingerprint = generateContentFingerprint(existing.title, existing.snippet);
      if (existingFingerprint === candidateFingerprint) {
        return {
          isDuplicate: true,
          existingArticleId: existing.id,
          existingSource: existing.source,
          matchMethod: "fingerprint",
        };
      }
    }
  }

  return { isDuplicate: false, matchMethod: "none" };
}

/**
 * Batch deduplicate articles before database insertion.
 * More efficient than checking one-by-one.
 */
export async function deduplicateBatch(
  candidates: DeduplicationCandidate[],
  options?: {
    lookbackHours?: number;
    titleThreshold?: number;
  }
): Promise<{
  unique: DeduplicationCandidate[];
  duplicates: Array<{ candidate: DeduplicationCandidate; matchedExisting: DedupCheckResult }>;
}> {
  const unique: DeduplicationCandidate[] = [];
  const duplicates: Array<{ candidate: DeduplicationCandidate; matchedExisting: DedupCheckResult }> = [];

  for (const candidate of candidates) {
    const result = await checkCrossSourceDuplicate(candidate, options);
    if (result.isDuplicate) {
      duplicates.push({ candidate, matchedExisting: result });
    } else {
      unique.push(candidate);
    }
  }

  return { unique, duplicates };
}

/**
 * Calculate Jaccard similarity between two titles.
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  // Extract significant words (4+ chars)
  const words1 = new Set(title1.toLowerCase().match(/\b\w{4,}\b/g) || []);
  const words2 = new Set(title2.toLowerCase().match(/\b\w{4,}\b/g) || []);

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}
