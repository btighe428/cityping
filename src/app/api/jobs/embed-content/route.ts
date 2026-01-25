/**
 * EMBED CONTENT JOB
 *
 * Cron job that generates semantic embeddings for unembedded content.
 * Runs every 10 minutes to process new NewsArticle and AlertEvent records.
 *
 * Architecture:
 * - Queries for content without embeddings (embeddingAt IS NULL)
 * - Generates embeddings via OpenAI text-embedding-3-small
 * - Updates records with embedding vectors using raw SQL (pgvector)
 * - Returns processing statistics and estimated cost
 *
 * Cost: ~$0.03/month for typical usage (50 news + 100 alerts/day)
 *
 * Security:
 * - Requires x-cron-secret header (Vercel cron convention)
 * - Also accepts Authorization: Bearer token for backwards compatibility
 * - Scheduled via Vercel cron at *\/10 * * * * (every 10 minutes)
 */

import { NextRequest, NextResponse } from "next/server";
import { processUnembeddedContent } from "@/lib/embeddings";

/**
 * Verify cron secret for authorization.
 *
 * Supports two authentication methods for flexibility:
 * 1. x-cron-secret header (Vercel cron convention, preferred)
 * 2. Authorization: Bearer token (backwards compatibility)
 *
 * In development without CRON_SECRET set, requests are allowed for testing.
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("[Embed Content] CRON_SECRET not set - allowing request in development");
    return process.env.NODE_ENV === "development";
  }

  // Check x-cron-secret header (primary method per Vercel docs)
  const xCronSecret = request.headers.get("x-cron-secret");
  if (xCronSecret === cronSecret) {
    return true;
  }

  // Check Authorization: Bearer token (backwards compatibility)
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

/**
 * GET handler for embedding generation job.
 *
 * Query Parameters:
 * - batchSize: Max items to process per content type (default: 100)
 *
 * Returns:
 * - newsProcessed: Number of news articles embedded
 * - alertsProcessed: Number of alert events embedded
 * - totalTokens: Total OpenAI tokens consumed
 * - estimatedCost: Estimated cost in USD
 * - durationMs: Processing time in milliseconds
 * - errors: Any non-fatal errors encountered
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse batch size from query params
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get("batchSize") || "100", 10);

    console.log(`[Embed Content] Starting embedding job with batchSize=${batchSize}`);

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[Embed Content] OPENAI_API_KEY not set - skipping embedding generation");
      return NextResponse.json({
        newsProcessed: 0,
        alertsProcessed: 0,
        totalTokens: 0,
        estimatedCost: 0,
        durationMs: 0,
        errors: ["OPENAI_API_KEY not configured"],
        skipped: true,
      });
    }

    // Process unembedded content
    const result = await processUnembeddedContent(batchSize);

    console.log(
      `[Embed Content] Completed: ${result.newsProcessed} news, ${result.alertsProcessed} alerts, ` +
        `${result.totalTokens} tokens, $${result.estimatedCost.toFixed(6)} cost, ` +
        `${result.durationMs}ms`
    );

    if (result.errors.length > 0) {
      console.warn(`[Embed Content] Errors: ${result.errors.join("; ")}`);
    }

    return NextResponse.json({
      newsProcessed: result.newsProcessed,
      alertsProcessed: result.alertsProcessed,
      totalTokens: result.totalTokens,
      estimatedCost: result.estimatedCost,
      durationMs: result.durationMs,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[Embed Content] Job failed:", error);
    return NextResponse.json(
      {
        error: "Job failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - alias to GET for flexibility.
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
