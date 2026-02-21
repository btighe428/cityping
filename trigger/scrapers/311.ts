// trigger/scrapers/311.ts
/**
 * 311 Service Alerts Scraper Task
 *
 * Fetches NYC 311 service alerts (water outages, street closures).
 * From NYC Open Data API.
 *
 * Schedule: Every 4 hours
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { sync311Alerts } from "@/lib/scrapers/nyc-311";

export const serviceAlertsTask = schedules.task({
  id: "311-alerts",
  // Every 4 hours
  cron: {
    pattern: "0 */4 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async () => {
    console.log("[311 Alerts] Starting scrape...");

    const result = await sync311Alerts();

    console.log(
      `[311 Alerts] Complete: ${result.created} created, ${result.updated} updated`
    );

    return {
      created: result.created,
      updated: result.updated,
      timestamp: new Date().toISOString(),
    };
  },
});
