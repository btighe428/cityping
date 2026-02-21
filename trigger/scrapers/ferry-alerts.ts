// trigger/scrapers/ferry-alerts.ts
/**
 * Ferry Alerts Scraper Task
 *
 * Fetches real-time ferry alerts from NYC Ferry and NY Waterway.
 * Covers East River, Rockaway, South Brooklyn, and Hudson crossings.
 *
 * Schedule: Every 15 minutes
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { ingestFerryAlerts } from "@/lib/scrapers/ferry";

export const ferryAlertsTask = schedules.task({
  id: "ferry-alerts",
  // Every 15 minutes, Eastern Time
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
    console.log("[Ferry Alerts] Starting ingestion...");

    const result = await ingestFerryAlerts();

    console.log(
      `[Ferry Alerts] Complete: ${result.created} created, ${result.skipped} skipped, ${result.deactivated} deactivated`
    );

    return {
      created: result.created,
      skipped: result.skipped,
      deactivated: result.deactivated,
      bySeverity: result.bySeverity,
    };
  },
});
