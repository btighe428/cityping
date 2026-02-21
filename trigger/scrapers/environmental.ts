// trigger/scrapers/environmental.ts
/**
 * Environmental Readings Scraper Task
 *
 * Fetches pollen and UV index data from Tomorrow.io/NWS.
 * Powers premium health alerts.
 *
 * Schedule: 3x daily (6am, 12pm, 6pm ET)
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { syncEnvironmentalData } from "@/lib/scrapers/environmental";

export const environmentalTask = schedules.task({
  id: "environmental",
  // 3x daily: 6am, 12pm, 6pm Eastern
  cron: {
    pattern: "0 6,12,18 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
  },
  run: async () => {
    console.log("[Environmental] Starting sync...");

    const result = await syncEnvironmentalData();

    console.log(
      `[Environmental] Complete: pollen=${result.pollen}, uv=${result.uv}`
    );

    return {
      pollen: result.pollen,
      uv: result.uv,
      timestamp: new Date().toISOString(),
    };
  },
});
