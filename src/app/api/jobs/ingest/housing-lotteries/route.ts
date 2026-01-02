// src/app/api/jobs/ingest/housing-lotteries/route.ts
/**
 * Housing Connect Lottery Ingestion Job
 *
 * This endpoint serves as the cron-triggered entry point for Housing Connect
 * affordable housing lottery ingestion. It runs daily at 3am ET (8:00 UTC) to
 * capture new lottery postings, enabling NYC Ping users to receive timely
 * notifications about housing opportunities matching their income eligibility.
 *
 * Polling Frequency Rationale:
 * Daily polling is appropriate for housing lotteries because:
 * - Lotteries typically have 30-60 day application windows
 * - New listings are posted 1-5 times per week
 * - Early notification provides ample time for application preparation
 * - Respects Housing Connect's server resources
 *
 * For comparison: Housing alert services typically send weekly emails.
 * NYC Ping's daily polling with income-based filtering provides more
 * targeted and timely notifications than broad weekly digests.
 *
 * Authentication:
 * Uses the standard Vercel cron authentication pattern:
 * - x-cron-secret header (primary, per Vercel docs)
 * - Authorization: Bearer token (backwards compatibility)
 *
 * HTTP Method:
 * Using GET for Vercel cron compatibility. Vercel cron defaults to GET requests
 * and the job is idempotent (same result regardless of how many times called
 * for the same set of lotteries due to deduplication by externalId).
 *
 * NYC Affordable Housing Context:
 * New York City has a severe affordable housing shortage, with demand far
 * exceeding supply. Housing Connect processes over 100,000 applications
 * for some popular lotteries. Timely notification is crucial because:
 * - Applications require income documentation gathering
 * - Some lotteries receive 50,000+ applications in the first week
 * - Early application submission can matter for tie-breaking
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestHousingLotteries } from "@/lib/scrapers/housing-connect";

/**
 * Verify cron secret for authorization.
 *
 * Follows the established pattern from MTA alerts and other ingestion jobs
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
      "[Housing Connect] CRON_SECRET not set - allowing request in development"
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
 * GET handler for Housing Connect lottery ingestion job.
 *
 * Using GET for Vercel cron compatibility - Vercel cron triggers default to
 * GET requests. The operation is idempotent: running multiple times with the
 * same active lotteries produces the same result due to externalId deduplication.
 *
 * Response Structure:
 * - created: Number of new lotteries ingested
 * - skipped: Number of lotteries already in the system (deduplicated)
 *
 * The response helps with monitoring and debugging:
 * - High created counts indicate new lottery releases
 * - Consistent skipped counts indicate stable listing state
 * - Zero total may indicate scraping issues or page structure changes
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
    const result = await ingestHousingLotteries();

    console.log(
      `[Housing Connect] Job completed: ${result.created} created, ${result.skipped} skipped`
    );

    return NextResponse.json(result);
  } catch (error) {
    // Log detailed error for debugging
    console.error("[Housing Connect] Job failed:", error);

    // Return sanitized error to client
    return NextResponse.json(
      {
        error: "Failed to ingest housing lotteries",
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
