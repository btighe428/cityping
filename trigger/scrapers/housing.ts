// trigger/scrapers/housing.ts
/**
 * Housing Lotteries Scraper Task
 *
 * Fetches NYC affordable housing lottery listings.
 * From NYC Housing Connect / Open Data.
 *
 * Schedule: Daily at 8am ET
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { ingestHousingLotteries } from "@/lib/scrapers/housing-connect";

export const housingTask = schedules.task({
  id: "housing-lotteries",
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
    console.log("[Housing Lotteries] Starting ingestion...");

    const result = await ingestHousingLotteries();

    console.log(
      `[Housing Lotteries] Complete: ${result.created} created, ${result.skipped} skipped`
    );

    return {
      created: result.created,
      skipped: result.skipped,
      timestamp: new Date().toISOString(),
    };
  },
});
