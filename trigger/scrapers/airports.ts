// trigger/scrapers/airports.ts
/**
 * Airport Delay Scraper Task
 *
 * Fetches flight delay status from FAA for JFK, LGA, EWR.
 * Powers premium airport delay alerts.
 *
 * Schedule: Every 15 minutes
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { syncAirportStatus } from "@/lib/scrapers/faa-airports";

export const airportsTask = schedules.task({
  id: "airports",
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
    console.log("[Airports] Starting delay sync...");

    const result = await syncAirportStatus();

    console.log(
      `[Airports] Complete: ${result.airports} airports updated, ${result.delays} with delays`
    );

    return {
      airports: result.airports,
      delays: result.delays,
      timestamp: new Date().toISOString(),
    };
  },
});
