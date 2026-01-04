// src/app/api/jobs/send-daily-digest/route.ts
/**
 * Daily Email Digest Job
 *
 * This endpoint delivers consolidated email digests to free-tier users who
 * have opted into email notifications. Unlike premium users who receive
 * instant SMS alerts, free-tier users receive a daily digest summarizing
 * all their pending notifications from the previous 24 hours.
 *
 * Architecture:
 * - Queries for free-tier users with emailOptInAt set
 * - Fetches pending email notifications grouped by module
 * - Creates feedback records with tokens for each event
 * - Builds and sends consolidated HTML digest via Resend
 * - Marks all included notifications as sent
 *
 * Timing Strategy:
 * Scheduled for 7am ET (12:00 UTC) to deliver morning updates when users
 * are planning their day. This creates urgency around the upgrade CTA by
 * showing alerts they "missed" compared to premium SMS users.
 *
 * Feedback Loop Integration (Task 3.4):
 * Each digest email includes thumbs up/down feedback links for every event.
 * These links use secure tokens that:
 * - Are cryptographically random (256-bit entropy)
 * - Expire after 7 days
 * - Enable one-click feedback without login
 * Feedback data aggregates to improve relevance scoring by zip code.
 *
 * Security:
 * - Requires x-cron-secret header (Vercel cron convention)
 * - Also accepts Authorization: Bearer token for backwards compatibility
 * - Scheduled via Vercel cron at 0 12 * * * (daily at 12:00 UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import {
  buildDigestHtml,
  buildDigestSubject,
  GroupedEvents,
  EventWithModule,
  FeedbackTokenMap,
} from "@/lib/email-digest";
import { createFeedbackRecord } from "@/lib/feedback";

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
    console.warn("CRON_SECRET not set - allowing request in development");
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
 * GET handler for daily email digest job.
 *
 * Using GET for consistency with existing jobs (send-reminders) and because
 * Vercel cron defaults to GET requests unless POST is explicitly specified.
 *
 * Flow:
 * 1. Query free-tier users with email opt-in
 * 2. For each user, fetch pending email notifications
 * 3. Group notifications by module
 * 4. Build and send consolidated digest
 * 5. Mark notifications as sent
 * 6. Return statistics
 *
 * @param request - Next.js request object (used for auth headers)
 * @returns JSON response with processing statistics
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Get free tier users
    // All users have emailOptInAt set (required field with default),
    // so we only need to filter by tier
    const freeUsers = await prisma.user.findMany({
      where: {
        tier: "free",
      },
    });

    let digests = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of freeUsers) {
      try {
        // Get pending email notifications for this user that are ready to send
        const pendingNotifications = await prisma.notificationOutbox.findMany({
          where: {
            userId: user.id,
            channel: "email",
            status: "pending",
            scheduledFor: { lte: now },
          },
          include: {
            event: {
              include: {
                source: {
                  include: { module: true },
                },
              },
            },
          },
        });

        // Skip users with no pending notifications
        if (pendingNotifications.length === 0) {
          skipped++;
          continue;
        }

        // Group events by module for organized digest sections
        const byModule: GroupedEvents = {};
        for (const notification of pendingNotifications) {
          const moduleId = notification.event.source.moduleId;
          if (!byModule[moduleId]) {
            byModule[moduleId] = [];
          }
          byModule[moduleId].push(notification.event as EventWithModule);
        }

        // Create feedback records with tokens for each event
        // This enables thumbs up/down voting in the email
        const feedbackTokens: FeedbackTokenMap = {};
        for (const notification of pendingNotifications) {
          try {
            const { token } = await createFeedbackRecord(
              user.id,
              notification.event.id
            );
            feedbackTokens[notification.event.id] = token;
          } catch (feedbackError) {
            // If feedback record already exists (unique constraint), skip silently
            // This can happen if a digest is re-sent or event appears multiple times
            console.log(
              `[Daily Digest] Skipped feedback record for event ${notification.event.id}: ${
                feedbackError instanceof Error ? feedbackError.message : "Unknown error"
              }`
            );
          }
        }

        // Build and send digest email with feedback links
        const html = buildDigestHtml(byModule, undefined, user.id, feedbackTokens);
        const subject = buildDigestSubject(pendingNotifications.length);

        await sendEmail({
          to: user.email,
          subject,
          html,
        });

        // Mark all notifications as sent using updateMany for efficiency
        await prisma.notificationOutbox.updateMany({
          where: {
            id: { in: pendingNotifications.map((n) => n.id) },
          },
          data: {
            status: "sent",
            sentAt: new Date(),
          },
        });

        digests++;
        console.log(
          `[Daily Digest] Sent digest to ${user.email} with ${pendingNotifications.length} events`
        );
      } catch (error) {
        // Log error but continue processing other users
        console.error(`[Daily Digest] Failed to send digest to ${user.email}:`, error);
        failed++;
      }
    }

    console.log(
      `[Daily Digest] Completed: ${freeUsers.length} users, ${digests} digests sent, ${skipped} skipped, ${failed} failed`
    );

    return NextResponse.json({
      users: freeUsers.length,
      digests,
      skipped,
      failed,
    });
  } catch (error) {
    console.error("[Daily Digest] Job failed:", error);
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
 *
 * Some cron systems prefer POST. This ensures the endpoint works
 * regardless of HTTP method configuration.
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
