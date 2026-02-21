// trigger/scrapers/parks.ts
/**
 * Parks Events Scraper Task
 *
 * Fetches NYC Parks calendar events (free outdoor events, fitness).
 * Daily update is sufficient.
 *
 * Schedule: Daily at 7am ET
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { syncParksEvents } from "@/lib/scrapers/parks-events";

export const parksTask = schedules.task({
  id: "parks-events",
  // Daily at 7am Eastern
  cron: {
    pattern: "0 7 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 120000,
  },
  run: async () => {
    console.log("[Parks Events] Starting scrape...");

    const result = await syncParksEvents();

    console.log(
      `[Parks Events] Complete: ${result.created} created, ${result.updated} updated`
    );

    return {
      created: result.created,
      updated: result.updated,
      timestamp: new Date().toISOString(),
    };
  },
});
