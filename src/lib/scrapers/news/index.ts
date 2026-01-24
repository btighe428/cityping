// src/lib/scrapers/news/index.ts
/**
 * NYC News Scrapers - Unified Entry Point
 *
 * Aggregates news from three trusted NYC sources:
 * - Gothamist: WNYC's hyper-local news outlet (since 2003)
 * - THE CITY: Nonprofit investigative journalism (since 2019)
 * - Patch: Neighborhood-level breaking news (since 2007)
 *
 * Together, these sources provide comprehensive NYC coverage from
 * investigative pieces to community updates to breaking news.
 */

import { ingestGothamistArticles } from "./gothamist";
import { ingestTheCityArticles } from "./thecity";
import { ingestPatchArticles } from "./patch";

export { fetchGothamistArticles, ingestGothamistArticles } from "./gothamist";
export { fetchTheCityArticles, ingestTheCityArticles } from "./thecity";
export { fetchPatchArticles, ingestPatchArticles } from "./patch";
export { parseRssFeed, type RssItem } from "./rss-parser";

/**
 * Ingest articles from all news sources.
 *
 * Runs all scrapers in parallel for efficiency. Each scraper handles
 * its own deduplication, so this can be called repeatedly without
 * creating duplicate records.
 *
 * Recommended schedule: 5 AM ET daily (before 7 AM email digest)
 *
 * @returns Aggregate counts of created/skipped articles per source
 */
export async function ingestAllNewsArticles(): Promise<{
  gothamist: { created: number; skipped: number };
  thecity: { created: number; skipped: number };
  patch: { created: number; skipped: number };
  total: { created: number; skipped: number };
}> {
  console.log("[News Scrapers] Starting ingestion from all sources...");

  // Run all scrapers in parallel
  const [gothamist, thecity, patch] = await Promise.all([
    ingestGothamistArticles().catch((error) => {
      console.error("[Gothamist] Scraper failed:", error);
      return { created: 0, skipped: 0 };
    }),
    ingestTheCityArticles().catch((error) => {
      console.error("[THE CITY] Scraper failed:", error);
      return { created: 0, skipped: 0 };
    }),
    ingestPatchArticles().catch((error) => {
      console.error("[Patch] Scraper failed:", error);
      return { created: 0, skipped: 0 };
    }),
  ]);

  const total = {
    created: gothamist.created + thecity.created + patch.created,
    skipped: gothamist.skipped + thecity.skipped + patch.skipped,
  };

  console.log(
    `[News Scrapers] Complete: ${total.created} new articles, ${total.skipped} skipped`
  );

  return { gothamist, thecity, patch, total };
}
