// src/lib/jobs/run-daily-digest.ts
/**
 * Shared Daily Digest Job Logic
 *
 * Extracted from send-daily-digest/route.ts so it can be called from:
 * - Vercel cron route (GET /api/jobs/send-daily-digest)
 * - Trigger.dev morning-digest task
 * - Manual test endpoints
 *
 * Uses the full production pipeline:
 * - AI-curated content (Horizon, Deep Dive, Briefing)
 * - Weather, coat/umbrella, ferry, traffic, CitiBike
 * - Premium sections gated per user tier
 */

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
import { sendEmailTracked } from "@/lib/email-outbox";
import { buildPremiumSections } from "@/lib/premium/email-sections";

// =============================================================================
// TYPES
// =============================================================================

export interface DigestJobResult {
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

export interface DigestJobOptions {
  force?: boolean;
  skipEnhanced?: boolean;
  testUsers?: string[];
}

// =============================================================================
// ENHANCED DIGEST GENERATION
// =============================================================================

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
      isPremium: true,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[DailyDigest] Enhanced digest generated in ${elapsed}ms`);
    console.log(summarizeDigest(digest));

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

  const groupedEvents: GroupedEvents = {};
  for (const notification of pendingNotifications) {
    const moduleId = notification.event.source.moduleId;
    if (!groupedEvents[moduleId]) {
      groupedEvents[moduleId] = [];
    }
    groupedEvents[moduleId].push(notification.event as EventWithModule);
  }

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

async function markNotificationsSent(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;

  await prisma.notificationOutbox.updateMany({
    where: { id: { in: notificationIds } },
    data: { status: "sent", sentAt: new Date() },
  });
}

// =============================================================================
// MAIN JOB
// =============================================================================

export async function runDailyDigestJob(
  opts: DigestJobOptions = {}
): Promise<DigestJobResult> {
  const { force = false, skipEnhanced = false, testUsers } = opts;

  const result: DigestJobResult = {
    success: false,
    totalUsers: 0,
    digestsSent: 0,
    skipped: 0,
    failed: 0,
    mode: "standard",
    errors: [],
  };

  const now = new Date();
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
  const users = await prisma.user.findMany({
    where: testUsers ? { id: { in: testUsers } } : undefined,
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
      const isPremium = true; // All users get premium sections by default

      const { pendingNotifications, groupedEvents, feedbackTokens } =
        await processPendingNotifications(user.id, now);

      const hasNotifications = pendingNotifications.length > 0;
      const hasEnhancedContent = enhancedDigest && isDigestViable(enhancedDigest);

      if (!hasNotifications && !hasEnhancedContent && !force) {
        result.skipped++;
        continue;
      }

      const referralCode = await getReferralCode(user.id);

      let html: string;
      let subject: string;

      if (enhancedDigest && result.mode === "enhanced") {
        // Build premium sections (radar, pollen, satellite, etc.)
        let premiumSections = null;
        try {
          premiumSections = await buildPremiumSections(user.id, isPremium);
        } catch (error) {
          console.warn(`[DailyDigest] Premium sections failed for ${user.email}:`, error);
        }

        html = buildEnhancedDigestHtml(enhancedDigest, {
          isPremium,
          referralCode: referralCode || undefined,
          premiumSections,
        });
        const dateStr = enhancedDigest.meta.generatedAt.toFormat("MMMM d");
        subject = `CityPing Daily - ${dateStr}`;
      } else if (hasNotifications) {
        html = buildDigestHtml(
          groupedEvents,
          undefined,
          user.id,
          feedbackTokens,
          referralCode
        );
        subject = buildDigestSubject(pendingNotifications.length);
      } else {
        result.skipped++;
        continue;
      }

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

  return result;
}
