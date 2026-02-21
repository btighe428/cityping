// trigger/scrapers/air-quality.ts
/**
 * Air Quality Scraper Task
 *
 * Fetches AQI readings from AirNow API for NYC zip codes.
 * Used for air quality alerts in digests.
 *
 * Schedule: 3x daily (6am, 12pm, 6pm ET)
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { syncAirQuality } from "@/lib/scrapers/air-quality";

export const airQualityTask = schedules.task({
  id: "air-quality",
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
    console.log("[Air Quality] Starting sync...");

    const result = await syncAirQuality();

    console.log(
      `[Air Quality] Complete: ${result.readings} readings, ${result.alerts} alerts`
    );

    return {
      readings: result.readings,
      alerts: result.alerts,
      timestamp: new Date().toISOString(),
    };
  },
});
