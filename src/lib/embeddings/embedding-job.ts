/**
 * EMBEDDING JOB PROCESSOR
 *
 * Async batch processor for generating embeddings on unembedded content.
 * Called by the /api/jobs/embed-content cron endpoint.
 *
 * Uses raw SQL for pgvector operations since Prisma doesn't natively support
 * the vector type.
 */

import { prisma } from "../db";
import {
  generateEmbeddingsBatch,
  prepareTextForEmbedding,
  estimateEmbeddingCost,
  EMBEDDING_MODEL,
} from "./embedding-service";

export interface EmbeddingJobResult {
  newsProcessed: number;
  alertsProcessed: number;
  totalTokens: number;
  estimatedCost: number;
  errors: string[];
  durationMs: number;
}

/**
 * Process unembedded NewsArticle and AlertEvent records.
 * Generates embeddings in batches and updates the database.
 *
 * @param batchSize - Maximum items to process per content type
 * @returns Job result with statistics
 */
export async function processUnembeddedContent(
  batchSize: number = 100
): Promise<EmbeddingJobResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let newsProcessed = 0;
  let alertsProcessed = 0;
  let totalTokens = 0;

  // Process news articles
  try {
    const result = await processUnembeddedNews(batchSize);
    newsProcessed = result.processed;
    totalTokens += result.tokens;
    if (result.error) errors.push(result.error);
  } catch (err) {
    errors.push(`News embedding error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Process alert events
  try {
    const result = await processUnembeddedAlerts(batchSize);
    alertsProcessed = result.processed;
    totalTokens += result.tokens;
    if (result.error) errors.push(result.error);
  } catch (err) {
    errors.push(`Alert embedding error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    newsProcessed,
    alertsProcessed,
    totalTokens,
    estimatedCost: estimateEmbeddingCost(totalTokens),
    errors,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Process unembedded news articles.
 */
async function processUnembeddedNews(
  batchSize: number
): Promise<{ processed: number; tokens: number; error?: string }> {
  // Find articles without embeddings
  const unembedded = await prisma.newsArticle.findMany({
    where: {
      embeddingAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: batchSize,
    select: {
      id: true,
      title: true,
      snippet: true,
      summary: true,
      source: true,
    },
  });

  if (unembedded.length === 0) {
    return { processed: 0, tokens: 0 };
  }

  console.log(`[EmbeddingJob] Processing ${unembedded.length} news articles`);

  // Prepare texts for embedding
  const texts = unembedded.map((article) =>
    prepareTextForEmbedding(
      article.title,
      article.summary || article.snippet,
      article.source
    )
  );

  // Generate embeddings in batch
  const result = await generateEmbeddingsBatch(texts);

  // Update each article with its embedding using raw SQL
  const now = new Date();
  for (let i = 0; i < unembedded.length; i++) {
    const article = unembedded[i];
    const embedding = result.embeddings[i];

    // Convert embedding array to pgvector format: '[0.1,0.2,...]'
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `UPDATE "news_articles"
       SET embedding = $1::vector,
           embedding_model = $2,
           embedding_at = $3
       WHERE id = $4`,
      vectorStr,
      EMBEDDING_MODEL,
      now,
      article.id
    );
  }

  console.log(`[EmbeddingJob] Updated ${unembedded.length} news articles with embeddings`);

  return {
    processed: unembedded.length,
    tokens: result.totalTokens,
  };
}

/**
 * Process unembedded alert events.
 */
async function processUnembeddedAlerts(
  batchSize: number
): Promise<{ processed: number; tokens: number; error?: string }> {
  // Find alerts without embeddings
  const unembedded = await prisma.alertEvent.findMany({
    where: {
      embeddingAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: batchSize,
    select: {
      id: true,
      title: true,
      body: true,
      source: {
        select: { slug: true },
      },
    },
  });

  if (unembedded.length === 0) {
    return { processed: 0, tokens: 0 };
  }

  console.log(`[EmbeddingJob] Processing ${unembedded.length} alert events`);

  // Prepare texts for embedding
  const texts = unembedded.map((alert) =>
    prepareTextForEmbedding(alert.title, alert.body, alert.source.slug)
  );

  // Generate embeddings in batch
  const result = await generateEmbeddingsBatch(texts);

  // Update each alert with its embedding using raw SQL
  const now = new Date();
  for (let i = 0; i < unembedded.length; i++) {
    const alert = unembedded[i];
    const embedding = result.embeddings[i];

    // Convert embedding array to pgvector format
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `UPDATE "alert_events"
       SET embedding = $1::vector,
           embedding_model = $2,
           embedding_at = $3
       WHERE id = $4`,
      vectorStr,
      EMBEDDING_MODEL,
      now,
      alert.id
    );
  }

  console.log(`[EmbeddingJob] Updated ${unembedded.length} alert events with embeddings`);

  return {
    processed: unembedded.length,
    tokens: result.totalTokens,
  };
}

/**
 * Find semantically similar news articles using pgvector.
 *
 * @param embedding - Query embedding vector
 * @param limit - Maximum results to return
 * @param threshold - Minimum similarity threshold (0-1)
 * @returns Similar articles with similarity scores
 */
export async function findSimilarNews(
  embedding: number[],
  limit: number = 10,
  threshold: number = 0.7
): Promise<Array<{ id: string; title: string; similarity: number }>> {
  const vectorStr = `[${embedding.join(",")}]`;

  // Use cosine distance (1 - similarity) with pgvector's <=> operator
  const results = await prisma.$queryRawUnsafe<
    Array<{ id: string; title: string; distance: number }>
  >(
    `SELECT id, title, (embedding <=> $1::vector) as distance
     FROM "news_articles"
     WHERE embedding IS NOT NULL
       AND (embedding <=> $1::vector) <= $2
     ORDER BY distance ASC
     LIMIT $3`,
    vectorStr,
    1 - threshold, // Convert similarity threshold to distance
    limit
  );

  return results.map((r) => ({
    id: r.id,
    title: r.title,
    similarity: 1 - r.distance, // Convert distance back to similarity
  }));
}

/**
 * Find semantically similar alerts using pgvector.
 */
export async function findSimilarAlerts(
  embedding: number[],
  limit: number = 10,
  threshold: number = 0.7
): Promise<Array<{ id: string; title: string; similarity: number }>> {
  const vectorStr = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRawUnsafe<
    Array<{ id: string; title: string; distance: number }>
  >(
    `SELECT id, title, (embedding <=> $1::vector) as distance
     FROM "alert_events"
     WHERE embedding IS NOT NULL
       AND (embedding <=> $1::vector) <= $2
     ORDER BY distance ASC
     LIMIT $3`,
    vectorStr,
    1 - threshold,
    limit
  );

  return results.map((r) => ({
    id: r.id,
    title: r.title,
    similarity: 1 - r.distance,
  }));
}
