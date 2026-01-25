/**
 * OPENAI CLIENT SINGLETON
 *
 * Provides a singleton OpenAI client for embedding generation.
 * Uses text-embedding-3-small for cost efficiency (~$0.02/1M tokens).
 */

import OpenAI from "openai";

// Embedding model configuration
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

// Maximum tokens per batch (OpenAI limit is 8191 per input, 2048 inputs per batch)
export const MAX_BATCH_SIZE = 100;
export const MAX_TOKENS_PER_INPUT = 8000;

// Singleton instance
let openaiClient: OpenAI | null = null;

/**
 * Get the singleton OpenAI client.
 * Lazily initializes on first call.
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Estimate token count for a text string.
 * Uses rough heuristic: ~4 characters per token for English text.
 * More accurate than nothing, but OpenAI's tokenizer would be exact.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit.
 * Preserves beginning of text (usually contains most important info).
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number = MAX_TOKENS_PER_INPUT
): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Rough character limit based on token estimate
  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars);
}
