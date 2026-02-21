// trigger/email/morning-digest.ts
/**
 * Morning Digest Email Task
 *
 * Sends the daily morning briefing email to all users
 * with morning delivery preference enabled.
 *
 * Content includes:
 * - Transit status (MTA, ferry)
 * - Weather & coat/umbrella recommendation
 * - Premium sections (traffic, citibike, environmental)
 * - Curated news highlights
 *
 * Schedule: 9am ET daily
 */

import { schedules } from "@trigger.dev/sdk/v3";

export const morningDigestTask = schedules.task({
  id: "morning-digest",
  cron: {
    pattern: "0 9 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 30000,
    maxTimeoutInMs: 300000,
  },
  // Longer timeout for batch email sending
  maxDuration: 600, // 10 minutes
  run: async () => {
    console.log("[Morning Digest] Starting email send...");

    const { executeTimeSlotJob } = await import("@/lib/email-scheduler");

    const result = await executeTimeSlotJob("morning");

    console.log(
      `[Morning Digest] Complete: ${result.emailsSent} sent, ${result.skipped} skipped, ${result.failed} failed`
    );

    return {
      slot: "morning",
      sent: result.emailsSent,
      skipped: result.skipped,
      failed: result.failed,
      totalUsers: result.totalUsers,
    };
  },
});
