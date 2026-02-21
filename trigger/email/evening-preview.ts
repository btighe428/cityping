// trigger/email/evening-preview.ts
/**
 * Evening Preview Email Task
 *
 * Sends the evening wind-down email to users with
 * evening delivery preference enabled.
 *
 * Content focuses on:
 * - Tomorrow's weather preview
 * - Tomorrow's "One Thing" event recommendation
 * - Weekend event highlights (Fridays)
 * - Transit alerts for next morning
 *
 * Schedule: 7pm ET daily
 */

import { schedules } from "@trigger.dev/sdk/v3";

export const eveningPreviewTask = schedules.task({
  id: "evening-preview",
  cron: {
    pattern: "0 19 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 30000,
    maxTimeoutInMs: 300000,
  },
  maxDuration: 600,
  run: async () => {
    console.log("[Evening Preview] Starting email send...");

    const { executeTimeSlotJob } = await import("@/lib/email-scheduler");

    const result = await executeTimeSlotJob("evening");

    console.log(
      `[Evening Preview] Complete: ${result.emailsSent} sent, ${result.skipped} skipped, ${result.failed} failed`
    );

    return {
      slot: "evening",
      sent: result.emailsSent,
      skipped: result.skipped,
      failed: result.failed,
      totalUsers: result.totalUsers,
    };
  },
});
