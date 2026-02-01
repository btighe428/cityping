/**
 * DEDUPLICATION MODULE
 *
 * Cross-source deduplication for content ingestion.
 * Prevents the same story from appearing multiple times
 * when covered by different sources (NYT, Gothamist, etc.)
 */

export {
  checkCrossSourceDuplicate,
  deduplicateBatch,
  normalizeUrl,
  getUrlSignature,
  generateContentFingerprint,
  type DeduplicationCandidate,
  type DedupCheckResult,
} from "./cross-source-dedup";
