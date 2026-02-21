// trigger/email/notifications.ts
/**
 * Notification Delivery Task
 *
 * Processes the notification outbox and sends scheduled
 * notifications (SMS for premium, email for all).
 *
 * Handles:
 * - Real-time transit alerts
 * - Breaking news notifications
 * - Event reminders
 * - Premium instant notifications
 *
 * Schedule: Every 10 minutes during waking hours (7am-10pm ET)
 */

import { schedules } from "@trigger.dev/sdk/v3";

export const notificationsTask = schedules.task({
  id: "notifications",
  cron: {
    // Every 10 minutes, 7am-10pm ET
    pattern: "*/10 7-22 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  maxDuration: 300, // 5 minutes
  run: async () => {
    console.log("[Notifications] Processing outbox...");

    const { processNotificationOutbox } = await import("@/lib/notifications/sender");

    const result = await processNotificationOutbox();

    console.log(
      `[Notifications] Complete: ${result.sent} sent, ${result.failed} failed, ${result.pending} pending`
    );

    return {
      sent: result.sent,
      failed: result.failed,
      pending: result.pending,
      byChannel: result.byChannel,
    };
  },
});

// Reminder task (daily reminders, event alerts)
export const remindersTask = schedules.task({
  id: "reminders",
  cron: {
    // Daily at 7pm ET
    pattern: "0 19 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async () => {
    console.log("[Reminders] Processing scheduled reminders...");

    const { sendScheduledReminders } = await import("@/lib/notifications/reminders");

    const result = await sendScheduledReminders();

    console.log(
      `[Reminders] Complete: ${result.sent} sent`
    );

    return {
      sent: result.sent,
      types: result.types,
    };
  },
});
