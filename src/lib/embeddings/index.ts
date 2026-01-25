/**
 * EMBEDDINGS MODULE
 *
 * Semantic understanding for CityPing content selection.
 * Transforms content selection from keyword-based scoring to
 * vector embeddings and topic clustering.
 *
 * Key capabilities:
 * - Generate embeddings using OpenAI text-embedding-3-small
 * - Cluster related articles into topics (12 "Subway Delay" articles -> 1 topic)
 * - Semantic deduplication (catches "Fire" vs "Blaze" duplicates)
 * - Find semantically similar content across corpus
 *
 * Cost: ~$0.03/month for typical usage (50 news + 100 alerts/day)
 */

// OpenAI client configuration
export {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  MAX_BATCH_SIZE,
  getOpenAIClient,
  estimateTokens,
  truncateToTokenLimit,
} from "./openai-client";

// Core embedding functions
export {
  generateEmbedding,
  generateEmbeddingsBatch,
  cosineSimilarity,
  findMostSimilar,
  prepareTextForEmbedding,
  estimateEmbeddingCost,
  type EmbeddingResult,
  type BatchEmbeddingResult,
} from "./embedding-service";

// Batch processing job
export {
  processUnembeddedContent,
  findSimilarNews,
  findSimilarAlerts,
  type EmbeddingJobResult,
} from "./embedding-job";

// Semantic clustering
export {
  clusterItems,
  selectTopClusters,
  getClusterStats,
  mergeClusters,
  DEFAULT_CLUSTER_THRESHOLD,
  type ClusterableItem,
  type TopicCluster,
  type ClusterStats,
} from "./semantic-clustering";

// Semantic deduplication
export {
  deduplicateItems,
  findPotentialDuplicates,
  isDuplicateOf,
  SEMANTIC_DEDUP_THRESHOLD,
  type DedupableItem,
  type DedupResult,
} from "./semantic-dedup";
