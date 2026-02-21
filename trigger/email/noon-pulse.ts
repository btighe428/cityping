// trigger/email/noon-pulse.ts
/**
 * Noon Pulse Email Task
 *
 * Sends the midday pulse email to users with noon
 * delivery preference enabled.
 *
 * Content focuses on:
 * - Updated transit status
 * - Weather updates
 * - Afternoon event highlights
 * - Traffic conditions for evening commute
 *
 * Schedule: 12pm ET daily
 */

import { schedules } from "@trigger.dev/sdk/v3";

export const noonPulseTask = schedules.task({
  id: "noon-pulse",
  cron: {
    pattern: "0 12 * * *",
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
    console.log("[Noon Pulse] Starting email send...");

    const { executeTimeSlotJob } = await import("@/lib/email-scheduler");

    const result = await executeTimeSlotJob("noon");

    console.log(
      `[Noon Pulse] Complete: ${result.emailsSent} sent, ${result.skipped} skipped, ${result.failed} failed`
    );

    return {
      slot: "noon",
      sent: result.emailsSent,
      skipped: result.skipped,
      failed: result.failed,
      totalUsers: result.totalUsers,
    };
  },
});
