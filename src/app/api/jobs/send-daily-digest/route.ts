// src/app/api/jobs/send-daily-digest/route.ts
/**
 * PRODUCTION DAILY DIGEST JOB
 *
 * Delivers the enhanced daily digest email to all opted-in users.
 * Uses the multi-agent pipeline for AI-curated content:
 *
 * - THE HORIZON: Proactive alerts from NYC Knowledge Base
 * - THE DEEP DIVE: LLM-clustered story analysis
 * - THE BRIEFING: Quick-hit alerts and news
 * - THE AGENDA: Upcoming events
 *
 * Architecture:
 * 1. Generate enhanced digest content (shared across all users)
 * 2. For each user:
 *    - Fetch pending email notifications
 *    - Merge with enhanced digest content
 *    - Build personalized HTML (premium vs free gating)
 *    - Send via Resend
 *    - Mark notifications as sent
 *
 * Graceful Degradation:
 * - If enhanced digest fails, falls back to standard notification-only digest
 * - Individual section failures don't block the entire digest
 * - Comprehensive error logging for debugging
 *
 * Timing: Scheduled for 7am ET (12:00 UTC) via Vercel cron
 *
 * Security:
 * - Requires x-cron-secret header (Vercel cron convention)
 * - Also accepts Authorization: Bearer token for backwards compatibility
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildDigestHtml,
  buildDigestSubject,
  GroupedEvents,
  EventWithModule,
  FeedbackTokenMap,
  getReferralCode,
} from "@/lib/email-digest";
import { createFeedbackRecord } from "@/lib/feedback";
import {
  generateDailyDigest,
  summarizeDigest,
  isDigestViable,
  DailyDigestContent,
} from "@/lib/agents/daily-digest-orchestrator";
import {
  buildEnhancedDigestHtml,
  buildEnhancedDigestText,
} from "@/lib/email-templates-enhanced";
import { sendEmailTracked, acquireJobLock, releaseJobLock } from "@/lib/email-outbox";
import { JobMonitor } from "@/lib/job-monitor";

// Allow up to 120s for LLM calls (horizon + clustering)
export const maxDuration = 120;

// =============================================================================
// TYPES
// =============================================================================

interface DigestJobResult {
  success: boolean;
  totalUsers: number;
  digestsSent: number;
  skipped: number;
  failed: number;
  mode: "enhanced" | "standard" | "fallback";
  enhancedDigestStats?: {
    horizonAlerts: number;
    deepDiveClusters: number;
    briefingItems: number;
    agendaEvents: number;
    tokensUsed: number;
    estimatedCost: string;
    processingTimeMs: number;
    errors: string[];
  };
  errors: string[];
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Verify cron secret for authorization.
 *
 * Supports two authentication methods:
 * 1. x-cron-secret header (Vercel cron convention, preferred)
 * 2. Authorization: Bearer token (backwards compatibility)
 *
 * In development without CRON_SECRET set, requests are allowed for testing.
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("[DailyDigest] CRON_SECRET not set - allowing in development");
    return process.env.NODE_ENV === "development";
  }

  const xCronSecret = request.headers.get("x-cron-secret");
  if (xCronSecret === cronSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

// =============================================================================
// ENHANCED DIGEST GENERATION
// =============================================================================

/**
 * Generate enhanced digest with graceful degradation.
 *
 * If the full enhanced pipeline fails, returns null and the job
 * falls back to standard notification-only digest.
 */
async function generateEnhancedDigestSafe(): Promise<{
  digest: DailyDigestContent | null;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    console.log("[DailyDigest] Generating enhanced digest...");
    const startTime = Date.now();

    const digest = await generateDailyDigest({
      userId: "daily-job",
      isPremium: true, // Generate full content, gate per-user later
    });

    const elapsed = Date.now() - startTime;
    console.log(`[DailyDigest] Enhanced digest generated in ${elapsed}ms`);
    console.log(summarizeDigest(digest));

    // Collect any errors from the pipeline
    if (digest.meta.errors.length > 0) {
      errors.push(...digest.meta.errors);
    }

    return { digest, errors };
  } catch (error) {
    const errorMsg = `Enhanced digest generation failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`[DailyDigest] ${errorMsg}`, error);
    errors.push(errorMsg);
    return { digest: null, errors };
  }
}

// =============================================================================
// NOTIFICATION PROCESSING
// =============================================================================

/**
 * Process pending notifications for a user.
 * Returns grouped events and feedback tokens.
 */
async function processPendingNotifications(
  userId: string,
  now: Date
): Promise<{
  pendingNotifications: Array<{
    id: string;
    event: EventWithModule;
  }>;
  groupedEvents: GroupedEvents;
  feedbackTokens: FeedbackTokenMap;
}> {
  // Get pending email notifications
  const pendingNotifications = await prisma.notificationOutbox.findMany({
    where: {
      userId,
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

  // Group events by module
  const groupedEvents: GroupedEvents = {};
  for (const notification of pendingNotifications) {
    const moduleId = notification.event.source.moduleId;
    if (!groupedEvents[moduleId]) {
      groupedEvents[moduleId] = [];
    }
    groupedEvents[moduleId].push(notification.event as EventWithModule);
  }

  // Create feedback tokens for each event
  const feedbackTokens: FeedbackTokenMap = {};
  for (const notification of pendingNotifications) {
    try {
      const { token } = await createFeedbackRecord(userId, notification.event.id);
      feedbackTokens[notification.event.id] = token;
    } catch {
      // Skip if feedback record already exists
    }
  }

  return {
    pendingNotifications: pendingNotifications.map((n) => ({
      id: n.id,
      event: n.event as EventWithModule,
    })),
    groupedEvents,
    feedbackTokens,
  };
}

/**
 * Mark notifications as sent.
 */
async function markNotificationsSent(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;

  await prisma.notificationOutbox.updateMany({
    where: { id: { in: notificationIds } },
    data: { status: "sent", sentAt: new Date() },
  });
}

// =============================================================================
// MAIN JOB HANDLER
// =============================================================================

/**
 * GET handler for daily digest job.
 *
 * Query params:
 * - force=true: Send even if content is minimal
 * - skipEnhanced=true: Skip LLM-powered features (faster, for testing)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Acquire distributed lock to prevent concurrent runs
  const lockId = await acquireJobLock("send-daily-digest", 60);
  if (!lockId) {
    console.log("[DailyDigest] Another instance is already running, skipping");
    return NextResponse.json(
      { success: false, reason: "Another instance is already running" },
      { status: 429 }
    );
  }

  const jobMonitor = await JobMonitor.start("send-daily-digest");

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const skipEnhanced = searchParams.get("skipEnhanced") === "true";

  const result: DigestJobResult = {
    success: false,
    totalUsers: 0,
    digestsSent: 0,
    skipped: 0,
    failed: 0,
    mode: "standard",
    errors: [],
  };

  try {
    const now = new Date();
    // Use today's date for idempotency tracking
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // -------------------------------------------------------------------------
    // 1. Generate Enhanced Digest (shared across all users)
    // -------------------------------------------------------------------------
    let enhancedDigest: DailyDigestContent | null = null;

    if (!skipEnhanced) {
      const { digest, errors } = await generateEnhancedDigestSafe();
      enhancedDigest = digest;
      result.errors.push(...errors);

      if (enhancedDigest && isDigestViable(enhancedDigest)) {
        result.mode = "enhanced";
        result.enhancedDigestStats = {
          horizonAlerts: enhancedDigest.horizon.alerts.length,
          deepDiveClusters: enhancedDigest.deepDive.clusters.length,
          briefingItems: enhancedDigest.briefing.items.length,
          agendaEvents: enhancedDigest.agenda.events.length,
          tokensUsed: enhancedDigest.meta.tokensUsed,
          estimatedCost: `$${enhancedDigest.meta.estimatedCost.toFixed(4)}`,
          processingTimeMs: enhancedDigest.meta.processingTimeMs,
          errors: enhancedDigest.meta.errors,
        };
      } else if (!enhancedDigest) {
        result.mode = "fallback";
        console.warn("[DailyDigest] Enhanced digest failed, using fallback mode");
      }
    }

    // -------------------------------------------------------------------------
    // 2. Query Users to Send To
    // -------------------------------------------------------------------------
    // Get all users (emailOptInAt is required with default, so all users have it)
    // In future: add unsubscribe tracking field to filter out
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        tier: true,
      },
    });

    result.totalUsers = users.length;
    console.log(`[DailyDigest] Processing ${users.length} users`);

    // -------------------------------------------------------------------------
    // 3. Process Each User
    // -------------------------------------------------------------------------
    for (const user of users) {
      try {
        const isPremium = user.tier === "premium";

        // Get pending notifications for this user
        const { pendingNotifications, groupedEvents, feedbackTokens } =
          await processPendingNotifications(user.id, now);

        // Determine if we have content to send
        const hasNotifications = pendingNotifications.length > 0;
        const hasEnhancedContent = enhancedDigest && isDigestViable(enhancedDigest);

        if (!hasNotifications && !hasEnhancedContent && !force) {
          result.skipped++;
          continue;
        }

        // Get referral code for this user
        const referralCode = await getReferralCode(user.id);

        // Build email content
        let html: string;
        let subject: string;

        if (enhancedDigest && result.mode === "enhanced") {
          // Use enhanced digest template
          html = buildEnhancedDigestHtml(enhancedDigest, {
            isPremium,
            referralCode: referralCode || undefined,
          });
          const dateStr = enhancedDigest.meta.generatedAt.toFormat("MMMM d");
          subject = `CityPing Daily - ${dateStr}`;
        } else if (hasNotifications) {
          // Fallback to standard notification digest
          html = buildDigestHtml(
            groupedEvents,
            undefined,
            user.id,
            feedbackTokens,
            referralCode
          );
          subject = buildDigestSubject(pendingNotifications.length);
        } else {
          // No content to send
          result.skipped++;
          continue;
        }

        // Send email with idempotency tracking
        const emailResult = await sendEmailTracked(
          {
            to: user.email,
            subject,
            html,
            text: enhancedDigest ? buildEnhancedDigestText(enhancedDigest) : undefined,
          },
          "daily_digest",
          today,
          {
            userId: user.id,
            mode: result.mode,
            notificationCount: pendingNotifications.length,
          }
        );

        if (emailResult.alreadySent) {
          result.skipped++;
          console.log(`[DailyDigest] Skipped duplicate for ${user.email}`);
        } else if (emailResult.success) {
          // Mark notifications as sent
          await markNotificationsSent(pendingNotifications.map((n) => n.id));
          result.digestsSent++;
          console.log(
            `[DailyDigest] Sent to ${user.email} (${result.mode}, ${
              hasNotifications ? pendingNotifications.length + " notifications" : "enhanced only"
            })`
          );
        } else {
          result.failed++;
          const errorMsg = `Failed to send to ${user.email}: ${emailResult.error}`;
          console.error(`[DailyDigest] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      } catch (error) {
        result.failed++;
        const errorMsg = `Failed to send to ${user.email}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        console.error(`[DailyDigest] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // -------------------------------------------------------------------------
    // 4. Final Summary
    // -------------------------------------------------------------------------
    result.success = result.failed === 0 || result.digestsSent > 0;

    console.log(
      `[DailyDigest] Complete: ${result.digestsSent} sent, ${result.skipped} skipped, ${result.failed} failed (${result.mode} mode)`
    );

    await jobMonitor.success({
      itemsProcessed: result.digestsSent,
      itemsFailed: result.failed,
      metadata: {
        totalUsers: result.totalUsers,
        skipped: result.skipped,
        mode: result.mode,
      },
    });

    await releaseJobLock("send-daily-digest", lockId);
    return NextResponse.json(result);
  } catch (error) {
    const errorMsg = `Job failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`[DailyDigest] ${errorMsg}`, error);
    result.errors.push(errorMsg);
    await jobMonitor.fail(error);
    await releaseJobLock("send-daily-digest", lockId);
    return NextResponse.json(result, { status: 500 });
  }
}

/**
 * POST handler - alias to GET for flexibility.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request);
}
