// trigger/scrapers/news-multi.ts
/**
 * News Multi-Source Ingestion Tasks
 *
 * Fetches news from NYC sources at different frequencies:
 * - Tier 1: Gothamist + THE CITY (4x daily, high priority)
 * - Tier 2: All sources combined (3x daily)
 * - Tier 3: Patch only (3x daily, neighborhood coverage)
 *
 * All scrapers are idempotent — re-running skips already-ingested articles.
 */

import { schedules } from "@trigger.dev/sdk/v3";
import {
  ingestGothamistArticles,
  ingestTheCityArticles,
  ingestPatchArticles,
  ingestAllNewsArticles,
} from "@/lib/scrapers/news";

// Tier 1: High priority sources (4x daily)
export const newsTier1Task = schedules.task({
  id: "news-tier-1",
  cron: {
    pattern: "0 5,11,17,23 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async () => {
    console.log("[News Tier 1] Starting ingestion (Gothamist + THE CITY)...");

    const [gothamist, thecity] = await Promise.all([
      ingestGothamistArticles().catch((e) => {
        console.error("[News Tier 1] Gothamist failed:", e);
        return { created: 0, skipped: 0 };
      }),
      ingestTheCityArticles().catch((e) => {
        console.error("[News Tier 1] THE CITY failed:", e);
        return { created: 0, skipped: 0 };
      }),
    ]);

    const created = gothamist.created + thecity.created;
    const skipped = gothamist.skipped + thecity.skipped;

    console.log(`[News Tier 1] Complete: ${created} created, ${skipped} skipped`);

    return {
      created,
      skipped,
      sources: { gothamist: gothamist.created, thecity: thecity.created },
      timestamp: new Date().toISOString(),
    };
  },
});

// Tier 2: All sources combined (3x daily)
export const newsTier2Task = schedules.task({
  id: "news-tier-2",
  cron: {
    pattern: "0 6,12,18 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async () => {
    console.log("[News Tier 2] Starting full ingestion...");

    const result = await ingestAllNewsArticles();

    console.log(
      `[News Tier 2] Complete: ${result.total.created} created, ${result.total.skipped} skipped`
    );

    return {
      created: result.total.created,
      skipped: result.total.skipped,
      sources: {
        gothamist: result.gothamist.created,
        thecity: result.thecity.created,
        patch: result.patch.created,
      },
      timestamp: new Date().toISOString(),
    };
  },
});

// Tier 3: Patch neighborhood coverage (3x daily)
export const newsTier3Task = schedules.task({
  id: "news-tier-3",
  cron: {
    pattern: "0 7,13,19 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async () => {
    console.log("[News Tier 3] Starting ingestion (Patch)...");

    const result = await ingestPatchArticles();

    console.log(
      `[News Tier 3] Complete: ${result.created} created, ${result.skipped} skipped`
    );

    return {
      created: result.created,
      skipped: result.skipped,
      sources: { patch: result.created },
      timestamp: new Date().toISOString(),
    };
  },
});

// News curation (AI selection) - 3x daily after ingestion
export const newsCurationTask = schedules.task({
  id: "news-curation",
  cron: {
    pattern: "30 6,12,18 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 15000,
    maxTimeoutInMs: 120000,
  },
  run: async () => {
    console.log("[News Curation] Starting AI curation...");

    const { curateFromDatabase } = await import("@/lib/agents/content-curator-agent");
    const result = await curateFromDatabase();

    console.log(
      `[News Curation] Complete: ${result.stats.selected} articles selected`
    );

    return {
      selected: result.stats.selected,
      totalConsidered: result.stats.totalInput,
      timestamp: new Date().toISOString(),
    };
  },
});
