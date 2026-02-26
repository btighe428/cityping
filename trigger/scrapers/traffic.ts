// trigger/scrapers/traffic.ts
/**
 * Traffic Score Scraper Task
 *
 * Fetches traffic friction scores for NYC boroughs.
 * Powers premium "best time to leave" feature.
 *
 * Schedule: Every 10 minutes during rush hours (6-10am, 4-8pm ET)
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { syncTrafficScores } from "@/lib/scrapers/traffic";

export const trafficTask = schedules.task({
  id: "traffic",
  // Every 10 minutes during rush hours (timezone = ET, so hours are ET)
  // 6-10 ET = morning rush, 16-20 ET = evening rush
  cron: {
    pattern: "*/10 6-10,16-20 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async () => {
    console.log("[Traffic] Starting score sync...");

    const result = await syncTrafficScores();

    console.log(
      `[Traffic] Complete: ${result.regions} regions updated`
    );

    return {
      regions: result.regions,
      timestamp: new Date().toISOString(),
    };
  },
});
