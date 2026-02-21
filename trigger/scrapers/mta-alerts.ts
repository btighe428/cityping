// trigger/scrapers/mta-alerts.ts
/**
 * MTA Subway Alerts Scraper Task
 *
 * Fetches real-time subway alerts from MTA GTFS-RT API.
 * Critical for commuter notifications.
 *
 * Schedule: Every 5 minutes
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { ingestMtaAlerts } from "@/lib/scrapers/mta";

export const mtaAlertsTask = schedules.task({
  id: "mta-alerts",
  // Every 5 minutes, Eastern Time
  cron: {
    pattern: "*/5 * * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async () => {
    console.log("[MTA Alerts] Starting ingestion...");

    const result = await ingestMtaAlerts();

    console.log(
      `[MTA Alerts] Complete: ${result.created} created, ${result.skipped} skipped, ${result.filtered} filtered`
    );

    return {
      created: result.created,
      skipped: result.skipped,
      filtered: result.filtered,
      bySeverity: result.bySeverity,
    };
  },
});
