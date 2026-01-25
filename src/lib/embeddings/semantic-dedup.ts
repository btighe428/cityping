/**
 * SEMANTIC DEDUPLICATION
 *
 * Hybrid approach combining fast keyword matching with semantic similarity.
 *
 * Two-stage dedup:
 * 1. Fast check: Jaccard similarity on normalized titles
 * 2. Semantic check: Cosine similarity on embeddings >= 0.92
 *
 * This catches:
 * - Exact duplicates (keyword match)
 * - Paraphrased duplicates ("Fire" vs "Blaze")
 * - Syndicated content with different headlines
 */

import { cosineSimilarity } from "./embedding-service";
import { areTitlesSimilar } from "../agents/scoring";

// High threshold for semantic dedup (more conservative than clustering)
export const SEMANTIC_DEDUP_THRESHOLD = 0.92;

export interface DedupableItem {
  id: string;
  title: string;
  embedding?: number[] | null;
  score?: number;
}

export interface DedupResult<T extends DedupableItem> {
  /** Unique items after deduplication */
  unique: T[];
  /** Items identified as duplicates */
  duplicates: Array<{
    item: T;
    duplicateOf: string; // ID of the item this duplicates
    method: "title" | "semantic";
    similarity: number;
  }>;
  /** Statistics */
  stats: {
    totalInput: number;
    uniqueCount: number;
    duplicatesRemoved: number;
    titleDuplicates: number;
    semanticDuplicates: number;
  };
}

/**
 * Deduplicate items using hybrid title + semantic matching.
 *
 * @param items - Items to deduplicate
 * @param options - Dedup configuration
 * @returns Dedup result with unique items and duplicate info
 */
export function deduplicateItems<T extends DedupableItem>(
  items: T[],
  options: {
    titleThreshold?: number;
    semanticThreshold?: number;
    preferHigherScore?: boolean;
  } = {}
): DedupResult<T> {
  const {
    titleThreshold = 0.7,
    semanticThreshold = SEMANTIC_DEDUP_THRESHOLD,
    preferHigherScore = true,
  } = options;

  if (items.length === 0) {
    return {
      unique: [],
      duplicates: [],
      stats: {
        totalInput: 0,
        uniqueCount: 0,
        duplicatesRemoved: 0,
        titleDuplicates: 0,
        semanticDuplicates: 0,
      },
    };
  }

  // Sort by score if preferring higher-scored items
  const sorted = preferHigherScore
    ? [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    : [...items];

  const unique: T[] = [];
  const duplicates: DedupResult<T>["duplicates"] = [];
  let titleDuplicates = 0;
  let semanticDuplicates = 0;

  for (const item of sorted) {
    let isDuplicate = false;
    let duplicateOf = "";
    let method: "title" | "semantic" = "title";
    let similarity = 0;

    // Check against all unique items
    for (const existing of unique) {
      // Stage 1: Fast title check
      if (areTitlesSimilar(item.title, existing.title, titleThreshold)) {
        isDuplicate = true;
        duplicateOf = existing.id;
        method = "title";
        similarity = calculateTitleSimilarity(item.title, existing.title);
        titleDuplicates++;
        break;
      }

      // Stage 2: Semantic check (only if both have embeddings)
      if (item.embedding && existing.embedding) {
        const semanticSim = cosineSimilarity(item.embedding, existing.embedding);
        if (semanticSim >= semanticThreshold) {
          isDuplicate = true;
          duplicateOf = existing.id;
          method = "semantic";
          similarity = semanticSim;
          semanticDuplicates++;
          break;
        }
      }
    }

    if (isDuplicate) {
      duplicates.push({ item, duplicateOf, method, similarity });
    } else {
      unique.push(item);
    }
  }

  return {
    unique,
    duplicates,
    stats: {
      totalInput: items.length,
      uniqueCount: unique.length,
      duplicatesRemoved: duplicates.length,
      titleDuplicates,
      semanticDuplicates,
    },
  };
}

/**
 * Calculate Jaccard similarity between two titles.
 * Used for title-based dedup scoring.
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = normalizeTitle(title1);
  const words2 = normalizeTitle(title2);

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Normalize title for comparison.
 */
function normalizeTitle(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
}

/**
 * Find potential duplicates for a single item.
 * Useful for real-time dedup during ingestion.
 *
 * @param item - Item to check
 * @param corpus - Existing items to check against
 * @param threshold - Similarity threshold
 * @returns Potential duplicate matches
 */
export function findPotentialDuplicates<T extends DedupableItem>(
  item: DedupableItem,
  corpus: T[],
  threshold: number = SEMANTIC_DEDUP_THRESHOLD
): Array<{ item: T; similarity: number; method: "title" | "semantic" }> {
  const matches: Array<{
    item: T;
    similarity: number;
    method: "title" | "semantic";
  }> = [];

  for (const existing of corpus) {
    // Check title similarity
    const titleSim = calculateTitleSimilarity(item.title, existing.title);
    if (titleSim >= 0.7) {
      matches.push({ item: existing, similarity: titleSim, method: "title" });
      continue;
    }

    // Check semantic similarity
    if (item.embedding && existing.embedding) {
      const semanticSim = cosineSimilarity(item.embedding, existing.embedding);
      if (semanticSim >= threshold) {
        matches.push({
          item: existing,
          similarity: semanticSim,
          method: "semantic",
        });
      }
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Check if an item is a duplicate of any existing item.
 * Fast check for use during content ingestion.
 */
export function isDuplicateOf<T extends DedupableItem>(
  item: DedupableItem,
  corpus: T[],
  options: {
    titleThreshold?: number;
    semanticThreshold?: number;
  } = {}
): T | null {
  const { titleThreshold = 0.7, semanticThreshold = SEMANTIC_DEDUP_THRESHOLD } =
    options;

  for (const existing of corpus) {
    // Title check
    if (areTitlesSimilar(item.title, existing.title, titleThreshold)) {
      return existing;
    }

    // Semantic check
    if (item.embedding && existing.embedding) {
      const similarity = cosineSimilarity(item.embedding, existing.embedding);
      if (similarity >= semanticThreshold) {
        return existing;
      }
    }
  }

  return null;
}
