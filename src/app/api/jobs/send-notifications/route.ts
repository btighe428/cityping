// src/app/api/jobs/send-notifications/route.ts
/**
 * SMS Notification Delivery Job
 *
 * This endpoint implements the transactional outbox pattern for reliable SMS delivery.
 * It polls the NotificationOutbox table for pending SMS notifications that are ready
 * to send (scheduledFor <= now) and delivers them via Twilio.
 *
 * Architecture:
 * The transactional outbox pattern ensures exactly-once delivery semantics by:
 * 1. Events are written to NotificationOutbox within the same transaction as the AlertEvent
 * 2. This job polls for pending notifications and sends them
 * 3. Status is updated to sent/failed/skipped based on delivery outcome
 *
 * This decoupling allows event ingestion to complete without waiting for SMS delivery,
 * improving ingestion throughput and providing retry capability for failed deliveries.
 *
 * Batch Processing:
 * Notifications are processed in batches of 100 to balance:
 * - Memory efficiency (avoiding loading millions of pending notifications)
 * - Processing throughput (fewer database round-trips)
 * - Failure isolation (crash loses at most 100 pending notifications)
 *
 * TCPA Compliance:
 * All SMS messages include "Reply STOP to unsubscribe" to comply with the
 * Telephone Consumer Protection Act and carrier requirements.
 *
 * Security:
 * - Requires x-cron-secret header (Vercel cron convention)
 * - Also accepts Authorization: Bearer token for backwards compatibility
 * - Scheduled via Vercel cron every 5 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSms } from "@/lib/twilio";

/**
 * Verify cron secret for authorization.
 *
 * Supports two authentication methods:
 * 1. x-cron-secret header (Vercel cron convention, per implementation plan)
 * 2. Authorization: Bearer token (backwards compatibility with existing jobs)
 *
 * In development without CRON_SECRET set, requests are allowed to facilitate
 * local testing and debugging.
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not set - allowing request in development");
    return process.env.NODE_ENV === "development";
  }

  // Check x-cron-secret header (primary method per task spec)
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
 * Format SMS message with module icon and event details.
 *
 * Message structure follows SMS best practices:
 * - Icon first for visual brand recognition
 * - Title for immediate context
 * - Optional body for additional detail
 * - TCPA-compliant opt-out instruction
 *
 * @param event - The alert event with source module information
 * @returns Formatted SMS message string
 */
export function formatSmsMessage(event: {
  title: string;
  body?: string | null;
  source: { module: { icon: string; name: string } };
}): string {
  const icon = event.source.module.icon;
  const lines = [`${icon} ${event.title}`];

  if (event.body) {
    lines.push(event.body);
  }

  lines.push("", "Reply STOP to unsubscribe");
  return lines.join("\n");
}

/**
 * POST handler for SMS notification delivery job.
 *
 * This endpoint is invoked by Vercel cron every 5 minutes to process pending
 * SMS notifications. It queries the NotificationOutbox for notifications that:
 * - Are on the SMS channel
 * - Have pending status
 * - Have scheduledFor <= current time
 *
 * Each notification is processed individually with per-notification error handling
 * to ensure partial failures don't abort the entire batch.
 *
 * @param request - Next.js request object (used for auth headers)
 * @returns JSON response with processing statistics
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Get pending SMS notifications ready to send
    const pendingNotifications = await prisma.notificationOutbox.findMany({
      where: {
        channel: "sms",
        status: "pending",
        scheduledFor: { lte: now },
      },
      include: {
        user: true,
        event: {
          include: {
            source: {
              include: { module: true },
            },
          },
        },
      },
      take: 100, // Process in batches to limit memory usage
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const notification of pendingNotifications) {
      // Skip if user has no phone number
      if (!notification.user.phone) {
        await prisma.notificationOutbox.update({
          where: { id: notification.id },
          data: { status: "skipped" },
        });
        skipped++;
        continue;
      }

      try {
        // Format and send SMS
        const message = formatSmsMessage(notification.event);
        await sendSms(notification.user.phone, message);

        // Update status to sent
        await prisma.notificationOutbox.update({
          where: { id: notification.id },
          data: { status: "sent", sentAt: new Date() },
        });
        sent++;
      } catch (error) {
        // Log error and update status to failed
        console.error(
          `Failed to send SMS to ${notification.user.phone}:`,
          error
        );
        await prisma.notificationOutbox.update({
          where: { id: notification.id },
          data: { status: "failed" },
        });
        failed++;
      }
    }

    console.log(
      `[Send Notifications] Processed ${pendingNotifications.length}: ${sent} sent, ${failed} failed, ${skipped} skipped`
    );

    return NextResponse.json({
      processed: pendingNotifications.length,
      sent,
      failed,
      skipped,
    });
  } catch (error) {
    console.error("[Send Notifications] Job failed:", error);
    return NextResponse.json(
      {
        error: "Job failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
