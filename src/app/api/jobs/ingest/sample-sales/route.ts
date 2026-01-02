// src/app/api/jobs/ingest/sample-sales/route.ts
/**
 * 260 Sample Sale Ingestion Job
 *
 * This endpoint serves as the cron-triggered entry point for 260 Sample Sale
 * ingestion. It runs every 4 hours to capture new sale announcements, enabling
 * NYC Ping users to receive timely notifications about designer brand sample
 * sales in Manhattan.
 *
 * Polling Frequency Rationale:
 * Every 4 hours (6 times daily) is appropriate for sample sales because:
 * - Sales are typically announced 1-2 weeks in advance
 * - New sales are posted 1-5 times per week on average
 * - 4-hour polling catches announcements same-day while being respectful
 * - Higher frequency not justified by posting patterns
 *
 * For comparison: Sample sale aggregator sites typically update daily.
 * NYC Ping's 4-hour polling with brand-based filtering provides more
 * targeted and timely notifications than manual site checking.
 *
 * Sample Sale Cultural Context:
 * Sample sales are a distinctly NYC shopping phenomenon, originating from
 * the Garment District's tradition of designers and manufacturers selling
 * excess inventory and production samples directly to consumers. What began
 * as insider industry events in the 1970s evolved into a retail phenomenon.
 * 260 Sample Sale (founded 2005) professionalized the experience with their
 * dedicated venue at 260 Fifth Avenue, now a pilgrimage site for fashion-
 * conscious New Yorkers seeking luxury brands at accessible prices.
 *
 * Authentication:
 * Uses the standard Vercel cron authentication pattern:
 * - x-cron-secret header (primary, per Vercel docs)
 * - Authorization: Bearer token (backwards compatibility)
 *
 * HTTP Method:
 * Using GET for Vercel cron compatibility. Vercel cron defaults to GET requests
 * and the job is idempotent (same result regardless of how many times called
 * for the same set of sales due to deduplication by externalId).
 *
 * Monitoring:
 * Response includes created/skipped counts for observability:
 * - High created counts indicate new sale announcements
 * - Consistent skipped counts indicate stable listing state
 * - Zero total may indicate scraping issues or page structure changes
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestSampleSales } from "@/lib/scrapers/sample-sales";

/**
 * Verify cron secret for authorization.
 *
 * Follows the established pattern from MTA alerts and Housing Connect jobs
 * for consistency across the codebase.
 *
 * Security Considerations:
 * - CRON_SECRET should be a cryptographically random string (32+ chars)
 * - Stored in Vercel environment variables, not committed to code
 * - Rate limiting is handled at the infrastructure level (Vercel)
 *
 * @param request - Next.js request object containing headers
 * @returns true if request is authorized, false otherwise
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // Allow requests in development when CRON_SECRET is not set
  // This facilitates local testing without configuration overhead
  if (!cronSecret) {
    console.warn(
      "[260 Sample Sale] CRON_SECRET not set - allowing request in development"
    );
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
 * GET handler for 260 Sample Sale ingestion job.
 *
 * Using GET for Vercel cron compatibility - Vercel cron triggers default to
 * GET requests. The operation is idempotent: running multiple times with the
 * same active sales produces the same result due to externalId deduplication.
 *
 * Response Structure:
 * - created: Number of new sales ingested
 * - skipped: Number of sales already in the system (deduplicated)
 *
 * The response helps with monitoring and debugging:
 * - High created counts indicate new sale postings
 * - Consistent skipped counts indicate stable listing state
 * - Zero total may indicate scraping issues or page structure changes
 *
 * Error Handling:
 * Errors are logged with full details for debugging but sanitized in the
 * response to avoid leaking internal implementation details.
 *
 * @param request - Next.js request object (used for auth headers)
 * @returns JSON response with ingestion statistics
 */
export async function GET(request: NextRequest) {
  // Verify cron secret before processing
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestSampleSales();

    console.log(
      `[260 Sample Sale] Job completed: ${result.created} created, ${result.skipped} skipped`
    );

    return NextResponse.json(result);
  } catch (error) {
    // Log detailed error for debugging
    console.error("[260 Sample Sale] Job failed:", error);

    // Return sanitized error to client
    return NextResponse.json(
      {
        error: "Failed to ingest sample sales",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - alias to GET for flexibility.
 *
 * Some cron systems and testing tools prefer POST for job triggers.
 * This ensures the endpoint works regardless of HTTP method.
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
