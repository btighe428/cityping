/**
 * Feedback API Endpoint
 *
 * Handles user feedback submissions via email link clicks.
 * Users click thumbs up/down links in digest emails that contain
 * a unique feedback token for verification.
 *
 * GET /api/feedback?token=<feedbackToken>&rating=<up|down>
 *
 * Flow:
 * 1. Validate query parameters (token and rating required)
 * 2. Look up UserEventFeedback by feedbackToken
 * 3. Verify token is not expired (tokenExpiresAt > now)
 * 4. Map rating to FeedbackType enum
 * 5. Update the feedback record with the new feedbackType
 * 6. Redirect to /feedback/thanks with appropriate query params
 *
 * Redirects:
 * - Success: /feedback/thanks?success=true
 * - Expired token: /feedback/thanks?error=expired
 * - Invalid/missing token: /feedback/thanks?error=invalid
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Valid rating values and their corresponding FeedbackType enum values
const RATING_MAP: Record<string, "THUMBS_UP" | "THUMBS_DOWN"> = {
  up: "THUMBS_UP",
  down: "THUMBS_DOWN",
};

/**
 * Constructs the redirect URL for the feedback thanks page.
 */
function buildRedirectUrl(params: { success?: boolean; error?: string }): string {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  if (params.success) {
    return `${baseUrl}/feedback/thanks?success=true`;
  }

  return `${baseUrl}/feedback/thanks?error=${params.error || "invalid"}`;
}

/**
 * GET handler for feedback submissions.
 *
 * Expected query parameters:
 * - token: The unique feedback token from the email link
 * - rating: "up" or "down" (case-insensitive)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const ratingParam = searchParams.get("rating")?.toLowerCase();

  // Validate required parameters
  if (!token || !ratingParam) {
    return NextResponse.redirect(buildRedirectUrl({ error: "invalid" }), 307);
  }

  // Validate rating is a known value
  const feedbackType = RATING_MAP[ratingParam];
  if (!feedbackType) {
    return NextResponse.redirect(buildRedirectUrl({ error: "invalid" }), 307);
  }

  try {
    // Look up the feedback record by token
    const feedbackRecord = await prisma.userEventFeedback.findUnique({
      where: { feedbackToken: token },
    });

    // Token not found
    if (!feedbackRecord) {
      return NextResponse.redirect(buildRedirectUrl({ error: "invalid" }), 307);
    }

    // Check if token is expired (tokenExpiresAt must be > now)
    const now = new Date();
    if (feedbackRecord.tokenExpiresAt <= now) {
      return NextResponse.redirect(buildRedirectUrl({ error: "expired" }), 307);
    }

    // Update the feedback type (upsert pattern - update if exists)
    await prisma.userEventFeedback.update({
      where: { feedbackToken: token },
      data: { feedbackType },
    });

    // Success - redirect to thanks page
    return NextResponse.redirect(buildRedirectUrl({ success: true }), 307);
  } catch (error) {
    // Log error for debugging but don't expose details to user
    console.error("[Feedback API] Error processing feedback:", error);

    // Redirect to generic error on any database/server error
    return NextResponse.redirect(buildRedirectUrl({ error: "invalid" }), 307);
  }
}
