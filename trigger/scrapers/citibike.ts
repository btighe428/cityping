// trigger/scrapers/citibike.ts
/**
 * CitiBike Availability Scraper Task
 *
 * Syncs real-time dock/bike availability from GBFS feed.
 * Powers premium dock alerts for saved home/work stations.
 *
 * Schedule: Every 5 minutes
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { syncCitiBikeStations } from "@/lib/scrapers/citibike";

export const citibikeTask = schedules.task({
  id: "citibike",
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
    console.log("[CitiBike] Starting station sync...");

    const result = await syncCitiBikeStations();

    console.log(
      `[CitiBike] Complete: ${result.updated} stations updated`
    );

    return {
      updated: result.updated,
      timestamp: new Date().toISOString(),
    };
  },
});
