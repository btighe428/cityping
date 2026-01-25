/**
 * EMBEDDING SERVICE
 *
 * Core functions for generating and comparing text embeddings.
 * Uses OpenAI's text-embedding-3-small model for semantic similarity.
 */

import {
  getOpenAIClient,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  MAX_BATCH_SIZE,
  truncateToTokenLimit,
  estimateTokens,
} from "./openai-client";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokenCount: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  totalTokens: number;
}

/**
 * Generate embedding for a single text.
 *
 * @param text - Text to embed
 * @returns Embedding result with vector and metadata
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const client = getOpenAIClient();
  const truncatedText = truncateToTokenLimit(text);

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedText,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return {
    embedding: response.data[0].embedding,
    model: EMBEDDING_MODEL,
    tokenCount: response.usage.total_tokens,
  };
}

/**
 * Generate embeddings for multiple texts in a single API call.
 * More efficient than individual calls for batch processing.
 *
 * @param texts - Array of texts to embed (max 2048)
 * @returns Batch embedding result with all vectors
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<BatchEmbeddingResult> {
  if (texts.length === 0) {
    return { embeddings: [], model: EMBEDDING_MODEL, totalTokens: 0 };
  }

  if (texts.length > MAX_BATCH_SIZE) {
    throw new Error(
      `Batch size ${texts.length} exceeds maximum ${MAX_BATCH_SIZE}. Split into smaller batches.`
    );
  }

  const client = getOpenAIClient();
  const truncatedTexts = texts.map((t) => truncateToTokenLimit(t));

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedTexts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  // Sort by index to maintain order (API may return out of order)
  const sortedData = response.data.sort((a, b) => a.index - b.index);

  return {
    embeddings: sortedData.map((d) => d.embedding),
    model: EMBEDDING_MODEL,
    totalTokens: response.usage.total_tokens,
  };
}

/**
 * Calculate cosine similarity between two embedding vectors.
 * Returns value in range [-1, 1] where:
 *   1 = identical direction (semantically identical)
 *   0 = orthogonal (unrelated)
 *  -1 = opposite direction (semantically opposite)
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Cosine similarity score
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.length} vs ${b.length}`
    );
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Find the most similar items from a corpus given a query embedding.
 *
 * @param queryEmbedding - The embedding to search for
 * @param corpus - Array of items with embeddings to search
 * @param topK - Number of results to return
 * @returns Top K most similar items with similarity scores
 */
export function findMostSimilar<T extends { embedding: number[] }>(
  queryEmbedding: number[],
  corpus: T[],
  topK: number = 5
): Array<{ item: T; similarity: number }> {
  const scored = corpus.map((item) => ({
    item,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Prepare text for embedding by combining title and body.
 * Applies consistent formatting for news/alert content.
 *
 * @param title - Content title
 * @param body - Content body/snippet (optional)
 * @param source - Source attribution (optional)
 * @returns Formatted text for embedding
 */
export function prepareTextForEmbedding(
  title: string,
  body?: string | null,
  source?: string | null
): string {
  const parts: string[] = [];

  if (title) {
    parts.push(title.trim());
  }

  if (body) {
    parts.push(body.trim());
  }

  if (source) {
    parts.push(`Source: ${source}`);
  }

  return parts.join("\n\n");
}

/**
 * Estimate embedding cost in USD.
 * Based on OpenAI's text-embedding-3-small pricing: $0.02 per 1M tokens
 *
 * @param tokenCount - Number of tokens
 * @returns Estimated cost in USD
 */
export function estimateEmbeddingCost(tokenCount: number): number {
  const costPer1MTokens = 0.02;
  return (tokenCount / 1_000_000) * costPer1MTokens;
}

// Re-export for convenience
export { estimateTokens, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
