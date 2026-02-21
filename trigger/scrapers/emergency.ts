// trigger/scrapers/emergency.ts
/**
 * Emergency Alerts Scraper Task
 *
 * Fetches Notify NYC emergency alerts.
 * High frequency for time-sensitive alerts.
 *
 * Schedule: Every 15 minutes
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { ingestNotifyNYCAlerts } from "@/lib/scrapers/notify-nyc";

export const emergencyTask = schedules.task({
  id: "emergency-alerts",
  // Every 15 minutes
  cron: {
    pattern: "*/15 * * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async () => {
    console.log("[Emergency Alerts] Starting scrape...");

    const result = await ingestNotifyNYCAlerts();

    console.log(
      `[Emergency Alerts] Complete: ${result.created} created, ${result.skipped} skipped`
    );

    return {
      created: result.created,
      skipped: result.skipped,
      timestamp: new Date().toISOString(),
    };
  },
});
