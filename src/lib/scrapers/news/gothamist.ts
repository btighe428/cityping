// src/lib/scrapers/news/gothamist.ts
/**
 * Gothamist News Scraper
 *
 * Gothamist is a hyper-local NYC news outlet owned by WNYC (New York Public Radio).
 * Founded in 2003, it covers borough-specific news, transit, housing, and culture.
 * Their RSS feed provides a reliable stream of NYC-focused journalism.
 *
 * RSS Feed: https://gothamist.com/feed
 * Update frequency: Multiple times daily
 */

import { prisma } from "../../db";
import { parseRssFeed, RssItem } from "./rss-parser";

const GOTHAMIST_RSS = "https://gothamist.com/feed";
const SOURCE_ID = "gothamist";

interface GothamistArticle {
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
 * Extract category from Gothamist article URL or tags.
 * Gothamist URLs follow pattern: /news/category/slug
 */
function extractCategory(item: RssItem): string | null {
  // Check URL for category
  const urlMatch = item.link?.match(/gothamist\.com\/([^\/]+)\//);
  if (urlMatch && urlMatch[1] !== "feed") {
    return urlMatch[1];
  }

  // Check categories/tags
  if (item.categories && item.categories.length > 0) {
    return item.categories[0];
  }

  return null;
}

/**
 * Generate stable external ID from URL.
 * Gothamist URLs are stable and unique per article.
 */
function generateExternalId(item: RssItem): string {
  // Use URL path as ID (e.g., "news-mayor-announces-new-transit-plan")
  const urlPath = new URL(item.link || "").pathname;
  return urlPath.replace(/^\//, "").replace(/\//g, "-").substring(0, 200);
}

/**
 * Transform RSS item to our article format.
 */
function transformItem(item: RssItem): GothamistArticle | null {
  if (!item.link || !item.title) {
    return null;
  }

  return {
    externalId: item.guid || generateExternalId(item),
    url: item.link,
    title: item.title,
    snippet: item.description || item.contentSnippet || null,
    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    category: extractCategory(item),
    author: item.creator || item.author || null,
    imageUrl: item.enclosure?.url || item.mediaContent?.url || null,
  };
}

/**
 * Fetch articles from Gothamist RSS feed.
 * Returns last 24 hours of articles.
 */
export async function fetchGothamistArticles(): Promise<GothamistArticle[]> {
  const items = await parseRssFeed(GOTHAMIST_RSS);

  // Filter to last 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return items
    .map(transformItem)
    .filter((article): article is GothamistArticle => {
      return article !== null && article.publishedAt > cutoff;
    });
}

/**
 * Ingest Gothamist articles into database.
 * Uses upsert to avoid duplicates.
 */
export async function ingestGothamistArticles(): Promise<{
  created: number;
  skipped: number;
}> {
  const articles = await fetchGothamistArticles();

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

  console.log(`[Gothamist] Ingested ${created} new articles, skipped ${skipped} existing`);

  return { created, skipped };
}
