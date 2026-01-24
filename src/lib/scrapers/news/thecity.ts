// src/lib/scrapers/news/thecity.ts
/**
 * THE CITY News Scraper
 *
 * THE CITY is a nonprofit news organization launched in 2019, focused on
 * accountability journalism for New York City. Known for investigative
 * reporting on housing, transit, and local government.
 *
 * RSS Feed: https://www.thecity.nyc/feed/
 * Update frequency: Multiple times daily
 */

import { prisma } from "../../db";
import { parseRssFeed, RssItem } from "./rss-parser";

const THECITY_RSS = "https://www.thecity.nyc/feed/";
const SOURCE_ID = "thecity";

interface TheCityArticle {
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
 * Extract category from THE CITY article.
 * THE CITY uses tags/categories in their RSS.
 */
function extractCategory(item: RssItem): string | null {
  if (item.categories && item.categories.length > 0) {
    // Return first meaningful category
    const meaningful = item.categories.find(c =>
      !["News", "Article", "The City"].includes(c)
    );
    return meaningful || item.categories[0];
  }
  return null;
}

/**
 * Generate stable external ID from URL or GUID.
 */
function generateExternalId(item: RssItem): string {
  if (item.guid) {
    // Clean up GUID if it's a URL
    return item.guid.replace(/^https?:\/\//, "").replace(/\//g, "-").substring(0, 200);
  }

  const urlPath = new URL(item.link || "").pathname;
  return urlPath.replace(/^\//, "").replace(/\//g, "-").substring(0, 200);
}

/**
 * Transform RSS item to our article format.
 */
function transformItem(item: RssItem): TheCityArticle | null {
  if (!item.link || !item.title) {
    return null;
  }

  return {
    externalId: generateExternalId(item),
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
 * Fetch articles from THE CITY RSS feed.
 * Returns last 24 hours of articles.
 */
export async function fetchTheCityArticles(): Promise<TheCityArticle[]> {
  const items = await parseRssFeed(THECITY_RSS);

  // Filter to last 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return items
    .map(transformItem)
    .filter((article): article is TheCityArticle => {
      return article !== null && article.publishedAt > cutoff;
    });
}

/**
 * Ingest THE CITY articles into database.
 * Uses upsert to avoid duplicates.
 */
export async function ingestTheCityArticles(): Promise<{
  created: number;
  skipped: number;
}> {
  const articles = await fetchTheCityArticles();

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

  console.log(`[THE CITY] Ingested ${created} new articles, skipped ${skipped} existing`);

  return { created, skipped };
}
