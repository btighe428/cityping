// src/app/api/jobs/aggregate-feedback/route.ts
/**
 * Feedback Aggregation Cron Job
 *
 * This endpoint triggers the feedback aggregation pipeline that processes
 * user feedback (thumbs up/down) and updates ZipCodeInferenceWeight records.
 * The aggregated weights are used to personalize event relevance scoring
 * based on neighborhood-level preferences.
 *
 * Architecture:
 * +------------------+     +----------------------+     +------------------------+
 * | Cron Trigger     | --> | This Endpoint        | --> | ZipCodeInferenceWeight |
 * | (Vercel/manual)  |     | (aggregate-feedback) |     | (updated weights)      |
 * +------------------+     +----------------------+     +------------------------+
 *
 * The aggregation algorithm:
 * 1. Queries all UserEventFeedback records with user zip code and event module
 * 2. Groups feedback by (zipCode, moduleId) pairs
 * 3. Counts THUMBS_UP (positive) and THUMBS_DOWN (negative) for each pair
 * 4. Calculates adjustment factor: positive / (positive + negative)
 * 5. Upserts results to ZipCodeInferenceWeight table
 *
 * Adjustment Factor Interpretation:
 * - 1.0 = all positive feedback -> boost events for this zip+module
 * - 0.5 = neutral (equal positive/negative) -> no adjustment
 * - 0.0 = all negative feedback -> suppress events for this zip+module
 *
 * Recommended Schedule:
 * - Daily at 3am ET (08:00 UTC) to avoid peak traffic
 * - Or hourly for more responsive learning (higher DB load)
 *
 * Security:
 * - Requires CRON_SECRET for authentication
 * - Supports x-cron-secret header (Vercel cron convention, preferred)
 * - Also accepts Authorization: Bearer token (backwards compatibility)
 * - In development without CRON_SECRET, requests are allowed for testing
 *
 * Historical Context:
 * This feedback loop pattern is inspired by collaborative filtering systems
 * pioneered by GroupLens (1994) and refined by Netflix and Amazon. The
 * geographic clustering (by zip code) leverages the insight from geodemographic
 * segmentation (PRIZM, 1974) that neighborhood characteristics strongly
 * predict user preferences in urban environments.
 *
 * @module aggregate-feedback
 */

import { NextRequest, NextResponse } from "next/server";
import { runFeedbackAggregation } from "@/lib/feedback-aggregation";

/**
 * Verify cron secret for authorization.
 *
 * Supports two authentication methods for flexibility:
 * 1. x-cron-secret header (Vercel cron convention, preferred)
 * 2. Authorization: Bearer token (backwards compatibility)
 *
 * In development without CRON_SECRET set, requests are allowed for testing.
 *
 * @param request - The incoming NextRequest
 * @returns true if authorized, false otherwise
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // In development without CRON_SECRET, allow requests for testing
  if (!cronSecret) {
    console.warn(
      "[FeedbackAggregation] CRON_SECRET not set - allowing request in development"
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
 * GET handler for feedback aggregation job.
 *
 * Using GET for consistency with existing jobs (send-daily-digest, etc.)
 * and because Vercel cron defaults to GET requests unless POST is specified.
 *
 * Flow:
 * 1. Verify cron secret for authorization
 * 2. Run feedback aggregation pipeline
 * 3. Return summary of aggregated weights
 *
 * Response Format:
 * Success (200):
 * {
 *   success: true,
 *   aggregationCount: 5,      // Number of (zipCode, moduleId) pairs
 *   created: 3,               // New weight records created
 *   updated: 2,               // Existing records updated
 *   aggregations: [...]       // Full aggregation details
 * }
 *
 * Error (401/500):
 * {
 *   error: "message",
 *   details?: "additional context"
 * }
 *
 * @param request - Next.js request object (used for auth headers)
 * @returns JSON response with aggregation results or error
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[FeedbackAggregation] Starting aggregation job...");

    // Run the aggregation pipeline
    const result = await runFeedbackAggregation();

    console.log(
      `[FeedbackAggregation] Completed: ${result.aggregationCount} aggregations, ` +
        `${result.created} created, ${result.updated} updated`
    );

    // Log individual aggregations for debugging/monitoring
    if (result.aggregations.length > 0) {
      console.log(
        "[FeedbackAggregation] Aggregations:",
        JSON.stringify(result.aggregations, null, 2)
      );
    }

    return NextResponse.json({
      success: true,
      aggregationCount: result.aggregationCount,
      created: result.created,
      updated: result.updated,
      aggregations: result.aggregations,
    });
  } catch (error) {
    console.error("[FeedbackAggregation] Job failed:", error);

    return NextResponse.json(
      {
        error: "Aggregation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - alias to GET for flexibility.
 *
 * Some cron systems prefer POST. This ensures the endpoint works
 * regardless of HTTP method configuration.
 *
 * @param request - Next.js request object
 * @returns Same response as GET handler
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
