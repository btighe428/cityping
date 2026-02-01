// src/app/api/jobs/ingest/mta-alerts/route.ts
/**
 * MTA Subway Alerts Ingestion Job
 *
 * This endpoint serves as the cron-triggered entry point for MTA subway alert
 * ingestion. It runs every 2 minutes to capture real-time service changes,
 * enabling NYC Ping users to receive immediate notifications about delays,
 * reroutes, and planned work affecting their subway lines.
 *
 * Polling Frequency Rationale:
 * 2-minute intervals balance timeliness against resource usage:
 * - Service alerts typically persist for 15+ minutes
 * - Rush hour delays are time-sensitive (commuter decision-making)
 * - MTA API updates roughly every 30 seconds
 * - 2-minute polls catch most alerts within acceptable latency
 *
 * For comparison: Transit apps like Citymapper poll every 30-60 seconds.
 * NYC Ping's 2-minute interval reflects notification use case (not navigation).
 *
 * Authentication:
 * Uses the standard Vercel cron authentication pattern:
 * - x-cron-secret header (primary, per Vercel docs)
 * - Authorization: Bearer token (backwards compatibility)
 *
 * HTTP Method:
 * Using GET for Vercel cron compatibility. Vercel cron defaults to GET requests
 * and the job is idempotent (same result regardless of how many times called
 * for the same set of alerts due to deduplication).
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestMtaAlerts } from "@/lib/scrapers/mta";
import { JobMonitor } from "@/lib/job-monitor";

/**
 * Verify cron secret for authorization.
 *
 * Follows the established pattern from send-notifications and send-daily-digest
 * jobs for consistency across the codebase.
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
    console.warn("[MTA Ingestion] CRON_SECRET not set - allowing request in development");
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
 * GET handler for MTA alerts ingestion job.
 *
 * Using GET for Vercel cron compatibility - Vercel cron triggers default to
 * GET requests. The operation is idempotent: running multiple times with the
 * same MTA alerts produces the same result due to externalId deduplication.
 *
 * Response Structure:
 * - created: Number of new alerts ingested
 * - skipped: Number of alerts already in the system (deduplicated)
 *
 * The response helps with monitoring and debugging:
 * - High created counts indicate active service disruptions
 * - Consistent skipped counts indicate stable service
 * - Zero total indicates possible API issues
 *
 * @param request - Next.js request object (used for auth headers)
 * @returns JSON response with ingestion statistics
 */
export async function GET(request: NextRequest) {
  // Verify cron secret before processing
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobMonitor = await JobMonitor.start("ingest-mta-alerts");

  try {
    const result = await ingestMtaAlerts();

    console.log(
      `[MTA Ingestion] Job completed: ${result.created} created, ${result.skipped} skipped, ${result.filtered} low-signal filtered`
    );

    await jobMonitor.success({
      itemsProcessed: result.created,
      metadata: {
        skipped: result.skipped,
        filtered: result.filtered,
        bySeverity: result.bySeverity,
        total: result.created + result.skipped + result.filtered,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    // Log detailed error for debugging
    console.error("[MTA Ingestion] Job failed:", error);
    await jobMonitor.fail(error);

    // Return sanitized error to client
    return NextResponse.json(
      {
        error: "Failed to ingest MTA alerts",
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
