// trigger/scrapers/dining.ts
/**
 * Dining Deals Scraper Task
 *
 * Fetches restaurant deals, Restaurant Week, new openings.
 * RSS aggregation from multiple sources.
 *
 * Schedule: Daily at 8am ET
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { syncDiningDeals } from "@/lib/scrapers/dining-deals";

export const diningTask = schedules.task({
  id: "dining-deals",
  // Daily at 8am Eastern
  cron: {
    pattern: "0 8 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 120000,
  },
  run: async () => {
    console.log("[Dining Deals] Starting scrape...");

    const result = await syncDiningDeals();

    console.log(
      `[Dining Deals] Complete: ${result.created} created, ${result.updated} updated`
    );

    return {
      created: result.created,
      updated: result.updated,
      timestamp: new Date().toISOString(),
    };
  },
});
