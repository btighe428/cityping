#!/usr/bin/env npx tsx
/**
 * BACKFILL EMBEDDINGS SCRIPT
 *
 * One-time script to generate embeddings for historical NewsArticle and AlertEvent records.
 * Run this after deploying the pgvector migration to backfill existing data.
 *
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts [--batch-size=100] [--news-only] [--alerts-only] [--dry-run]
 *
 * Options:
 *   --batch-size=N   Process N items per batch (default: 100)
 *   --news-only      Only process NewsArticle records
 *   --alerts-only    Only process AlertEvent records
 *   --dry-run        Show what would be processed without making API calls
 *   --limit=N        Maximum total items to process (default: unlimited)
 *
 * Environment:
 *   OPENAI_API_KEY   Required for embedding generation
 *   DATABASE_URL     Postgres connection string
 *
 * Cost Estimate:
 *   ~$0.02 per 1M tokens
 *   Average article: ~500 tokens -> 2000 articles = ~$0.02
 */

import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_TOKENS_PER_INPUT = 8000;

interface BackfillOptions {
  batchSize: number;
  newsOnly: boolean;
  alertsOnly: boolean;
  dryRun: boolean;
  limit: number | null;
}

interface BackfillStats {
  newsProcessed: number;
  alertsProcessed: number;
  totalTokens: number;
  estimatedCost: number;
  errors: string[];
  durationMs: number;
}

function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    batchSize: 100,
    newsOnly: false,
    alertsOnly: false,
    dryRun: false,
    limit: null,
  };

  for (const arg of args) {
    if (arg.startsWith("--batch-size=")) {
      options.batchSize = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--news-only") {
      options.newsOnly = true;
    } else if (arg === "--alerts-only") {
      options.alertsOnly = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.split("=")[1], 10);
    }
  }

  return options;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateToTokenLimit(text: string, maxTokens: number = MAX_TOKENS_PER_INPUT): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars);
}

function prepareTextForEmbedding(
  title: string,
  body?: string | null,
  source?: string | null
): string {
  const parts: string[] = [];
  if (title) parts.push(title.trim());
  if (body) parts.push(body.trim());
  if (source) parts.push(`Source: ${source}`);
  return parts.join("\n\n");
}

async function backfillNews(
  openai: OpenAI,
  options: BackfillOptions
): Promise<{ processed: number; tokens: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;
  let totalTokens = 0;

  // Count total unembedded news
  const totalCount = await prisma.newsArticle.count({
    where: { embeddingAt: null },
  });

  console.log(`\n📰 News Articles: ${totalCount} unembedded`);

  if (totalCount === 0) {
    console.log("   Nothing to process");
    return { processed: 0, tokens: 0, errors: [] };
  }

  const limit = options.limit ? Math.min(options.limit, totalCount) : totalCount;
  let remaining = limit;

  while (remaining > 0) {
    const batchSize = Math.min(options.batchSize, remaining);

    // Fetch batch
    const batch = await prisma.newsArticle.findMany({
      where: { embeddingAt: null },
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

    if (batch.length === 0) break;

    console.log(`   Processing batch of ${batch.length}... (${processed}/${limit} done)`);

    if (options.dryRun) {
      processed += batch.length;
      remaining -= batch.length;
      continue;
    }

    // Prepare texts
    const texts = batch.map((article) =>
      truncateToTokenLimit(
        prepareTextForEmbedding(
          article.title,
          article.summary || article.snippet,
          article.source
        )
      )
    );

    try {
      // Generate embeddings
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      totalTokens += response.usage.total_tokens;

      // Sort by index to maintain order
      const sortedData = response.data.sort((a, b) => a.index - b.index);

      // Update each article
      const now = new Date();
      for (let i = 0; i < batch.length; i++) {
        const article = batch[i];
        const embedding = sortedData[i].embedding;
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

      processed += batch.length;
      remaining -= batch.length;

      // Rate limiting pause
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`News batch error: ${msg}`);
      console.error(`   Error: ${msg}`);
      // Continue with next batch
      remaining -= batch.length;
    }
  }

  console.log(`   ✅ Processed ${processed} news articles`);
  return { processed, tokens: totalTokens, errors };
}

async function backfillAlerts(
  openai: OpenAI,
  options: BackfillOptions
): Promise<{ processed: number; tokens: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;
  let totalTokens = 0;

  // Count total unembedded alerts
  const totalCount = await prisma.alertEvent.count({
    where: { embeddingAt: null },
  });

  console.log(`\n🚨 Alert Events: ${totalCount} unembedded`);

  if (totalCount === 0) {
    console.log("   Nothing to process");
    return { processed: 0, tokens: 0, errors: [] };
  }

  const limit = options.limit ? Math.min(options.limit, totalCount) : totalCount;
  let remaining = limit;

  while (remaining > 0) {
    const batchSize = Math.min(options.batchSize, remaining);

    // Fetch batch
    const batch = await prisma.alertEvent.findMany({
      where: { embeddingAt: null },
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

    if (batch.length === 0) break;

    console.log(`   Processing batch of ${batch.length}... (${processed}/${limit} done)`);

    if (options.dryRun) {
      processed += batch.length;
      remaining -= batch.length;
      continue;
    }

    // Prepare texts
    const texts = batch.map((alert) =>
      truncateToTokenLimit(
        prepareTextForEmbedding(alert.title, alert.body, alert.source.slug)
      )
    );

    try {
      // Generate embeddings
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      totalTokens += response.usage.total_tokens;

      // Sort by index
      const sortedData = response.data.sort((a, b) => a.index - b.index);

      // Update each alert
      const now = new Date();
      for (let i = 0; i < batch.length; i++) {
        const alert = batch[i];
        const embedding = sortedData[i].embedding;
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

      processed += batch.length;
      remaining -= batch.length;

      // Rate limiting pause
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Alert batch error: ${msg}`);
      console.error(`   Error: ${msg}`);
      remaining -= batch.length;
    }
  }

  console.log(`   ✅ Processed ${processed} alert events`);
  return { processed, tokens: totalTokens, errors };
}

async function main() {
  const options = parseArgs();
  const startTime = Date.now();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           CITYPING EMBEDDING BACKFILL SCRIPT                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nOptions:`);
  console.log(`  Batch size: ${options.batchSize}`);
  console.log(`  News only: ${options.newsOnly}`);
  console.log(`  Alerts only: ${options.alertsOnly}`);
  console.log(`  Dry run: ${options.dryRun}`);
  console.log(`  Limit: ${options.limit || "unlimited"}`);

  if (!process.env.OPENAI_API_KEY && !options.dryRun) {
    console.error("\n❌ OPENAI_API_KEY environment variable is required");
    process.exit(1);
  }

  const openai = options.dryRun
    ? (null as unknown as OpenAI)
    : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stats: BackfillStats = {
    newsProcessed: 0,
    alertsProcessed: 0,
    totalTokens: 0,
    estimatedCost: 0,
    errors: [],
    durationMs: 0,
  };

  try {
    // Process news
    if (!options.alertsOnly) {
      const newsResult = await backfillNews(openai, options);
      stats.newsProcessed = newsResult.processed;
      stats.totalTokens += newsResult.tokens;
      stats.errors.push(...newsResult.errors);
    }

    // Process alerts
    if (!options.newsOnly) {
      const alertsResult = await backfillAlerts(openai, options);
      stats.alertsProcessed = alertsResult.processed;
      stats.totalTokens += alertsResult.tokens;
      stats.errors.push(...alertsResult.errors);
    }

    stats.durationMs = Date.now() - startTime;
    stats.estimatedCost = (stats.totalTokens / 1_000_000) * 0.02;

    console.log("\n" + "═".repeat(64));
    console.log("BACKFILL COMPLETE");
    console.log("═".repeat(64));
    console.log(`  News processed:    ${stats.newsProcessed}`);
    console.log(`  Alerts processed:  ${stats.alertsProcessed}`);
    console.log(`  Total tokens:      ${stats.totalTokens.toLocaleString()}`);
    console.log(`  Estimated cost:    $${stats.estimatedCost.toFixed(4)}`);
    console.log(`  Duration:          ${(stats.durationMs / 1000).toFixed(1)}s`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors (${stats.errors.length}):`);
      stats.errors.forEach((e) => console.log(`    - ${e}`));
    }

    if (options.dryRun) {
      console.log("\n🔍 DRY RUN - No changes were made");
    }
  } catch (err) {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
