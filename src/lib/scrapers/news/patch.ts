// src/lib/scrapers/news/patch.ts
/**
 * Patch NYC News Scraper
 *
 * Patch is a hyper-local news network founded in 2007 by AOL, now independently
 * operated. They have multiple NYC-area feeds covering different neighborhoods.
 * Known for breaking local news, police reports, and community announcements.
 *
 * We aggregate from multiple NYC Patch RSS feeds to get comprehensive coverage.
 *
 * Update frequency: Multiple times daily
 */

import { prisma } from "../../db";
import { parseRssFeed, RssItem } from "./rss-parser";

const SOURCE_ID = "patch";

// Patch NYC area RSS feeds - covering major neighborhoods
const PATCH_FEEDS = [
  { url: "https://patch.com/new-york/new-york-city/rss", area: "NYC" },
  { url: "https://patch.com/new-york/upper-west-side/rss", area: "Upper West Side" },
  { url: "https://patch.com/new-york/upper-east-side/rss", area: "Upper East Side" },
  { url: "https://patch.com/new-york/east-village/rss", area: "East Village" },
  { url: "https://patch.com/new-york/chelsea-ny/rss", area: "Chelsea" },
  { url: "https://patch.com/new-york/williamsburg/rss", area: "Williamsburg" },
  { url: "https://patch.com/new-york/park-slope/rss", area: "Park Slope" },
  { url: "https://patch.com/new-york/astoria-long-island-city/rss", area: "Astoria/LIC" },
];

interface PatchArticle {
  externalId: string;
  url: string;
  title: string;
  snippet: string | null;
  publishedAt: Date;
  category: string | null;
  author: string | null;
  imageUrl: string | null;
}

/**
 * Generate stable external ID from URL.
 */
function generateExternalId(item: RssItem): string {
  if (item.guid) {
    // Patch GUIDs are usually the article URL
    return item.guid.replace(/^https?:\/\//, "").replace(/\//g, "-").substring(0, 200);
  }

  const urlPath = new URL(item.link || "").pathname;
  return urlPath.replace(/^\//, "").replace(/\//g, "-").substring(0, 200);
}

/**
 * Extract category from Patch article.
 * Includes the neighborhood as context.
 */
function extractCategory(item: RssItem, area: string): string {
  if (item.categories && item.categories.length > 0) {
    return `${area} - ${item.categories[0]}`;
  }
  return area;
}

/**
 * Transform RSS item to our article format.
 */
function transformItem(item: RssItem, area: string): PatchArticle | null {
  if (!item.link || !item.title) {
    return null;
  }

  return {
    externalId: generateExternalId(item),
    url: item.link,
    title: item.title,
    snippet: item.description || item.contentSnippet || null,
    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    category: extractCategory(item, area),
    author: item.creator || item.author || null,
    imageUrl: item.enclosure?.url || item.mediaContent?.url || null,
  };
}

/**
 * Fetch articles from all Patch NYC feeds.
 * Deduplicates articles that appear in multiple feeds.
 * Returns last 24 hours of articles.
 */
export async function fetchPatchArticles(): Promise<PatchArticle[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const seen = new Set<string>();
  const articles: PatchArticle[] = [];

  // Fetch from all feeds in parallel
  const feedResults = await Promise.allSettled(
    PATCH_FEEDS.map(async (feed) => {
      try {
        const items = await parseRssFeed(feed.url);
        return { items, area: feed.area };
      } catch (error) {
        console.warn(`[Patch] Failed to fetch ${feed.area} feed:`, error);
        return { items: [], area: feed.area };
      }
    })
  );

  for (const result of feedResults) {
    if (result.status !== "fulfilled") continue;

    const { items, area } = result.value;

    for (const item of items) {
      const article = transformItem(item, area);
      if (!article) continue;

      // Skip old articles
      if (article.publishedAt < cutoff) continue;

      // Deduplicate by external ID
      if (seen.has(article.externalId)) continue;
      seen.add(article.externalId);

      articles.push(article);
    }
  }

  return articles;
}

/**
 * Ingest Patch articles into database.
 * Uses upsert to avoid duplicates.
 */
export async function ingestPatchArticles(): Promise<{
  created: number;
  skipped: number;
}> {
  const articles = await fetchPatchArticles();

  let created = 0;
  let skipped = 0;

  for (const article of articles) {
    const existing = await prisma.newsArticle.findUnique({
      where: {
        source_externalId: {
          source: SOURCE_ID,
          externalId: article.externalId,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.newsArticle.create({
      data: {
        source: SOURCE_ID,
        externalId: article.externalId,
        url: article.url,
        title: article.title,
        snippet: article.snippet,
        publishedAt: article.publishedAt,
        category: article.category,
        author: article.author,
        imageUrl: article.imageUrl,
      },
    });

    created++;
  }

  console.log(`[Patch] Ingested ${created} new articles, skipped ${skipped} existing`);

  return { created, skipped };
}
