// trigger/scrapers/sample-sales.ts
/**
 * Sample Sales Scraper Task
 *
 * Fetches NYC sample sale listings from various sources.
 * Daily scrape for fashion deal alerts.
 *
 * Schedule: Daily at 8am ET
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { ingestSampleSales } from "@/lib/scrapers/sample-sales";

export const sampleSalesTask = schedules.task({
  id: "sample-sales",
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
    console.log("[Sample Sales] Starting ingestion...");

    const result = await ingestSampleSales();

    console.log(
      `[Sample Sales] Complete: ${result.created} created, ${result.skipped} skipped`
    );

    return {
      created: result.created,
      skipped: result.skipped,
      timestamp: new Date().toISOString(),
    };
  },
});
