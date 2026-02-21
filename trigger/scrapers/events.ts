// trigger/scrapers/events.ts
/**
 * General Events Scraper Task
 *
 * Fetches NYC events from Eventbrite and other sources.
 * 3x daily for event discovery.
 *
 * Schedule: 3x daily (6am, 12pm, 6pm ET)
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { ingestEventbriteEvents } from "@/lib/scrapers/eventbrite-nyc";

export const eventsTask = schedules.task({
  id: "general-events",
  // 3x daily: 6am, 12pm, 6pm Eastern
  cron: {
    pattern: "0 6,12,18 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 120000,
  },
  run: async () => {
    console.log("[General Events] Starting scrape...");

    const result = await ingestEventbriteEvents();

    console.log(
      `[General Events] Complete: ${result.created} created, ${result.skipped} skipped`
    );

    return {
      created: result.created,
      skipped: result.skipped,
      timestamp: new Date().toISOString(),
    };
  },
});
