// src/lib/scrapers/dining-deals.ts
/**
 * Dining Deals Scraper
 *
 * Aggregates restaurant deals, openings, and specials from multiple sources:
 * - Eater NY RSS feed (new openings, deals)
 * - The Infatuation NYC RSS feed
 * - NYC Restaurant Week (seasonal, manual tracking)
 *
 * Eater NY RSS: https://ny.eater.com/rss/index.xml
 * Infatuation: https://www.theinfatuation.com/new-york/rss
 */

import { z } from "zod";
import { prisma } from "../db";
import { sendScraperAlert } from "../scraper-alerts";
import crypto from "crypto";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const RssItemSchema = z.object({
  title: z.string(),
  link: z.string(),
  description: z.string().optional(),
  pubDate: z.string().optional(),
  category: z.string().optional(),
  "media:content": z.object({
    url: z.string(),
  }).optional(),
});

export interface DiningDeal {
  externalId: string;
  source: string;
  restaurant: string;
  neighborhood: string | null;
  borough: string | null;
  cuisine: string | null;
  dealType: string;
  title: string;
  description: string | null;
  price: string | null;
  startDate: Date | null;
  endDate: Date | null;
  url: string;
  imageUrl: string | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const RSS_SOURCES = [
  {
    name: "eater",
    url: "https://ny.eater.com/rss/index.xml",
    titlePrefix: "Eater NY",
  },
  {
    name: "infatuation",
    url: "https://www.theinfatuation.com/new-york/rss",
    titlePrefix: "The Infatuation",
  },
];

// Keywords to identify deal types
const DEAL_KEYWORDS = {
  opening: ["now open", "opening", "just opened", "opens", "debut", "first look"],
  deal: ["deal", "discount", "off", "special", "happy hour", "prix fixe"],
  closing: ["closing", "shuttering", "last day", "goodbye"],
  review: ["review", "we tried", "first taste"],
};

// NYC neighborhoods for extraction
const NYC_NEIGHBORHOODS = [
  "Williamsburg", "Bushwick", "Greenpoint", "DUMBO", "Park Slope",
  "Crown Heights", "Bed-Stuy", "Fort Greene", "Carroll Gardens",
  "SoHo", "NoHo", "Tribeca", "Chelsea", "West Village", "East Village",
  "Lower East Side", "Chinatown", "Little Italy", "Nolita", "Flatiron",
  "Midtown", "Hell's Kitchen", "Upper East Side", "Upper West Side",
  "Harlem", "Astoria", "Long Island City", "Jackson Heights", "Flushing",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simple RSS parser (avoids external dependencies)
 */
async function parseRss(url: string): Promise<Array<{
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  category?: string;
  imageUrl?: string;
}>> {
  const response = await fetch(url);
  const text = await response.text();

  const items: Array<{
    title: string;
    link: string;
    description?: string;
    pubDate?: string;
    category?: string;
    imageUrl?: string;
  }> = [];

  // Simple regex-based parsing
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(text)) !== null) {
    const itemXml = match[1];

    const getTag = (tag: string) => {
      const tagMatch = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return tagMatch ? (tagMatch[1] || tagMatch[2])?.trim() : undefined;
    };

    const getAttr = (tag: string, attr: string) => {
      const attrMatch = itemXml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`));
      return attrMatch ? attrMatch[1] : undefined;
    };

    const title = getTag("title");
    const link = getTag("link");

    if (title && link) {
      items.push({
        title,
        link,
        description: getTag("description"),
        pubDate: getTag("pubDate"),
        category: getTag("category"),
        imageUrl: getAttr("media:content", "url") || getAttr("enclosure", "url"),
      });
    }
  }

  return items;
}

/**
 * Extract deal type from title/description
 */
function extractDealType(title: string, description?: string): string {
  const text = `${title} ${description || ""}`.toLowerCase();

  for (const [type, keywords] of Object.entries(DEAL_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return type;
    }
  }

  return "news"; // Default type
}

/**
 * Extract neighborhood from text
 */
function extractNeighborhood(text: string): string | null {
  for (const neighborhood of NYC_NEIGHBORHOODS) {
    if (text.toLowerCase().includes(neighborhood.toLowerCase())) {
      return neighborhood;
    }
  }
  return null;
}

/**
 * Generate hash for dedup
 */
function generateExternalId(url: string): string {
  return crypto.createHash("md5").update(url).digest("hex").substring(0, 16);
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Fetch dining deals from all RSS sources
 */
export async function fetchDiningDeals(): Promise<DiningDeal[]> {
  console.log("[Dining] Fetching dining deals...");

  const allDeals: DiningDeal[] = [];

  for (const source of RSS_SOURCES) {
    try {
      console.log(`[Dining] Fetching from ${source.name}...`);

      const items = await parseRss(source.url);
      console.log(`[Dining] Got ${items.length} items from ${source.name}`);

      for (const item of items) {
        const dealType = extractDealType(item.title, item.description);
        const neighborhood = extractNeighborhood(`${item.title} ${item.description || ""}`);

        // Extract restaurant name (heuristic: first part before " - " or ":")
        let restaurant = item.title;
        const separators = [" - ", ": ", " | "];
        for (const sep of separators) {
          if (item.title.includes(sep)) {
            restaurant = item.title.split(sep)[0].trim();
            break;
          }
        }

        allDeals.push({
          externalId: generateExternalId(item.link),
          source: source.name,
          restaurant,
          neighborhood,
          borough: null, // Could be inferred from neighborhood
          cuisine: item.category || null,
          dealType,
          title: item.title,
          description: item.description?.substring(0, 500) || null,
          price: null, // Could be extracted with more parsing
          startDate: item.pubDate ? new Date(item.pubDate) : null,
          endDate: null,
          url: item.link,
          imageUrl: item.imageUrl || null,
        });
      }
    } catch (error) {
      console.error(`[Dining] Error fetching ${source.name}:`, error);
      await sendScraperAlert("dining-deals", [{
        source: source.name,
        payload: { url: source.url },
        error: `Failed to fetch: ${error instanceof Error ? error.message : "Unknown"}`,
        timestamp: new Date(),
      }]);
    }
  }

  console.log(`[Dining] Total deals fetched: ${allDeals.length}`);
  return allDeals;
}

/**
 * Sync dining deals to database
 */
export async function syncDiningDeals(): Promise<{
  created: number;
  updated: number;
  total: number;
}> {
  const deals = await fetchDiningDeals();

  let created = 0;
  let updated = 0;

  for (const deal of deals) {
    const existing = await prisma.diningDeal.findUnique({
      where: { externalId: deal.externalId },
    });

    if (existing) {
      // Update existing
      await prisma.diningDeal.update({
        where: { externalId: deal.externalId },
        data: {
          title: deal.title,
          description: deal.description,
          fetchedAt: new Date(),
        },
      });
      updated++;
    } else {
      // Create new
      await prisma.diningDeal.create({
        data: {
          externalId: deal.externalId,
          source: deal.source,
          restaurant: deal.restaurant,
          neighborhood: deal.neighborhood,
          borough: deal.borough,
          cuisine: deal.cuisine,
          dealType: deal.dealType,
          title: deal.title,
          description: deal.description,
          price: deal.price,
          startDate: deal.startDate,
          endDate: deal.endDate,
          url: deal.url,
          imageUrl: deal.imageUrl,
        },
      });
      created++;
    }
  }

  console.log(`[Dining] Sync complete: ${created} created, ${updated} updated`);

  return { created, updated, total: deals.length };
}

/**
 * Get recent dining deals for digest
 */
export async function getRecentDiningDeals(limit: number = 5): Promise<DiningDeal[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

  const deals = await prisma.diningDeal.findMany({
    where: {
      isActive: true,
      createdAt: { gte: since },
      dealType: { in: ["opening", "deal"] }, // Focus on openings and deals
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return deals.map((d) => ({
    externalId: d.externalId,
    source: d.source,
    restaurant: d.restaurant,
    neighborhood: d.neighborhood,
    borough: d.borough,
    cuisine: d.cuisine,
    dealType: d.dealType,
    title: d.title,
    description: d.description,
    price: d.price,
    startDate: d.startDate,
    endDate: d.endDate,
    url: d.url,
    imageUrl: d.imageUrl,
  }));
}
