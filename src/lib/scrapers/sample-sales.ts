// src/lib/scrapers/sample-sales.ts
/**
 * 260 Sample Sale Scraper for NYC Ping
 *
 * This module implements the ingestion pipeline for 260 Sample Sale listings,
 * enabling users to receive timely notifications about designer brand sample
 * sales in Manhattan.
 *
 * Architectural Context:
 * Following the established "pipes and filters" pattern from MTA and Housing Connect
 * scrapers, this module transforms external HTML data into internal AlertEvent objects
 * that flow through the matching engine to produce targeted notifications based on
 * brand preferences.
 *
 * Data Flow:
 * 1. fetch260SampleSales() - Scrape HTML from 260samplesale.com
 * 2. parseDateRange() - Parse date strings like "Jan 15-18, 2026"
 * 3. ingestSampleSales() - Dedup, persist to AlertEvent, trigger matching
 *
 * 260 Sample Sale Context:
 * 260 Sample Sale is one of NYC's premier sample sale operators, founded in 2005.
 * Their flagship location at 260 Fifth Avenue (hence the name) hosts designer brand
 * sales featuring luxury goods at 40-80% off retail. Sample sales are a distinctly
 * NYC phenomenon, originating from the Garment District's tradition of manufacturers
 * selling excess inventory directly to consumers.
 *
 * Historical Context:
 * Sample sales emerged in the 1970s as designers in NYC's Garment District sought
 * to liquidate seasonal inventory and production samples. What began as insider
 * events for industry professionals evolved into a retail phenomenon. The 1990s
 * saw the formalization of sample sale operations, with dedicated venues and
 * professional organizers. Today, sample sales remain a pillar of NYC shopping
 * culture, offering rare access to luxury brands at accessible prices.
 *
 * Brands Commonly Featured:
 * - Contemporary: Theory, Vince, Rag & Bone, Equipment, Joie
 * - Designer: Helmut Lang, Alexander Wang, Derek Lam
 * - Luxury: Proenza Schouler, 3.1 Phillip Lim, Jason Wu
 *
 * Scraping Strategy:
 * The 260 website uses a Shopify-based CMS. The scraper targets the primary sale
 * listing elements using class-based selectors. Note that Shopify themes vary
 * significantly, so selectors may require adjustment based on actual page structure.
 *
 * Rate Limiting:
 * The scraper runs every 4 hours (6 times daily) to catch new sale announcements.
 * Sample sales are typically announced 1-2 weeks in advance, so this frequency
 * balances timeliness with server respect.
 *
 * Deduplication Strategy:
 * Events are deduplicated using a stable ID generated from brand name and date range.
 * Format: `260-${brand-slug}-${dates}` ensures each brand's sale period is unique.
 */

import { prisma } from "../db";
import { matchEventToUsers, MatchableEvent } from "../matching";
import { calculateHypeScoreWithAi } from "../hype-scoring";
import * as cheerio from "cheerio";

/**
 * Internal representation of a 260 Sample Sale after transformation.
 *
 * This interface bridges the scraped HTML data and our AlertEvent model,
 * extracting only the fields relevant for notification matching.
 *
 * Field Semantics:
 * - id: Stable identifier for deduplication (260-brand-dates format)
 * - brand: Designer/brand name hosting the sale
 * - location: Physical address (typically 260 Fifth Ave variations)
 * - startDate: First day of the sale
 * - endDate: Last day of the sale
 * - description: Optional promotional text or details
 * - url: Deep link to sale details page
 */
export interface SampleSale {
  id: string;
  brand: string;
  location: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  url: string;
}

/**
 * 260 Sample Sale website URL.
 *
 * The main page lists current and upcoming sample sales.
 * Note: The actual page structure depends on the Shopify theme in use.
 */
const SAMPLE_SALE_URL = "https://260samplesale.com/";

/**
 * Fetches and parses sample sales from the 260 Sample Sale website.
 *
 * The function handles:
 * - HTTP request with appropriate headers (user agent for identification)
 * - HTML parsing using Cheerio
 * - Transformation from DOM elements to SampleSale interface
 * - Stable ID generation for deduplication
 *
 * DOM Structure Notes:
 * The actual selectors should be verified against the live page and updated
 * as needed. Common Shopify patterns include:
 * - .sale-listing, .product-card, .collection-item - Sale containers
 * - .sale-brand, .product-title - Brand name elements
 * - .sale-dates, .date-range - Date information
 *
 * IMPORTANT: The selectors below follow the implementation plan. The actual
 * 260samplesale.com page structure should be inspected to determine correct selectors.
 * Shopify themes vary significantly in their class naming conventions.
 *
 * @returns Array of transformed sample sale objects
 * @throws Error if HTTP request fails or response is not OK
 */
export async function fetch260SampleSales(): Promise<SampleSale[]> {
  const response = await fetch(SAMPLE_SALE_URL, {
    headers: {
      "User-Agent": "NYCPing Bot (+https://nycping.com)",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store", // Bypass Next.js cache for fresh data
  });

  if (!response.ok) {
    throw new Error(`260 Sample Sale error: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const sales: SampleSale[] = [];

  // Parse sale listings from page
  // NOTE: These selectors are based on the implementation plan specification.
  // The actual 260samplesale.com page structure may differ and should be verified.
  // Common alternative selectors to try if these don't work:
  // - .product-card, .collection-item, .grid-item
  // - [data-product], [data-collection-item]
  $(".sale-listing").each((_, el) => {
    const $el = $(el);
    const brand = $el.find(".sale-brand").text().trim();
    const location = $el.find(".sale-location").text().trim();
    const dates = $el.find(".sale-dates").text().trim();
    const url = $el.find("a").attr("href") || "";
    const description = $el.find(".sale-description").text().trim();

    // Generate stable ID from brand + dates
    // Format: 260-brand-slug-dates to ensure uniqueness per sale period
    const id = `260-${brand.toLowerCase().replace(/\s+/g, "-")}-${dates.replace(/\s+/g, "-")}`;

    // Parse date range (e.g., "Jan 15-18, 2026")
    const { start, end } = parseDateRange(dates);

    // Only include sales with valid brand and parseable start date
    // Listings without dates (TBD, Coming Soon) are skipped
    if (brand && start) {
      sales.push({
        id,
        brand,
        location,
        startDate: start,
        endDate: end || start, // Single-day sales use same date for start/end
        description: description || undefined,
        url: url.startsWith("http") ? url : `https://260samplesale.com${url}`,
      });
    }
  });

  return sales;
}

/**
 * Parses date range strings commonly used by 260 Sample Sale.
 *
 * Supported Formats:
 * - "Jan 15-18, 2026" - Multi-day sale within same month
 * - "January 15, 2026" - Single day sale
 * - "Mar 5-8 2026" - Without comma before year
 *
 * Implementation Notes:
 * The regex pattern captures:
 * - Month name (abbreviated or full): Jan, January, etc.
 * - Start day: 1-31
 * - Optional end day (after hyphen): 1-31
 * - Year: 4-digit year
 *
 * Edge Cases:
 * - Cross-month ranges (e.g., "Dec 28 - Jan 2") are NOT currently supported
 *   as they require more complex parsing. These are rare for 260 sales.
 * - Invalid strings return { start: null, end: null }
 *
 * @param dateStr - Raw date string from page
 * @returns Object with start and end Date objects, or nulls if parsing fails
 */
export function parseDateRange(dateStr: string): {
  start: Date | null;
  end: Date | null;
} {
  // Handle formats like "Jan 15-18, 2026" or "Jan 15, 2026" or "January 15, 2026"
  // Regex breakdown:
  // ([A-Za-z]+) - Month name (capture group 1)
  // \s+ - Whitespace
  // (\d+) - Start day (capture group 2)
  // (?:-(\d+))? - Optional hyphen and end day (capture group 3)
  // ,?\s* - Optional comma and whitespace
  // (\d{4}) - Year (capture group 4)
  const match = dateStr.match(/([A-Za-z]+)\s+(\d+)(?:-(\d+))?,?\s*(\d{4})/);
  if (!match) return { start: null, end: null };

  const [, month, startDay, endDay, year] = match;

  // Parse start date using JavaScript's Date parsing
  // Date constructor handles month name parsing (Jan, January, etc.)
  const startDate = new Date(`${month} ${startDay}, ${year}`);

  // Validate that parsing produced a valid date
  if (isNaN(startDate.getTime())) {
    return { start: null, end: null };
  }

  // Parse end date if present (multi-day sale)
  const endDate = endDay ? new Date(`${month} ${endDay}, ${year}`) : null;

  return { start: startDate, end: endDate };
}

/**
 * Ingests sample sales into the NYC Ping event system.
 *
 * This is the primary entry point called by the cron job. It orchestrates:
 * 1. Fetching fresh sale listings from 260samplesale.com
 * 2. Looking up the 260-sample-sale AlertSource
 * 3. Deduplicating against existing events by externalId
 * 4. Creating new AlertEvent records with brand metadata
 * 5. Triggering the matching engine for each new event
 * 6. Updating the source's lastPolledAt timestamp
 *
 * Transactional Integrity:
 * Each sale is processed independently to ensure partial failures don't
 * affect successful ingestions. The matching engine is called synchronously
 * to maintain causal consistency (event -> match -> queue in one flow).
 *
 * Brand Matching:
 * The metadata.brands array enables future brand-based matching. Users could
 * configure favorite brands in their deals module preferences to receive
 * notifications only for brands they care about.
 *
 * Neighborhood Assignment:
 * All 260 Sample Sales are assigned to "manhattan" neighborhood since their
 * flagship location at 260 Fifth Avenue is in Manhattan (Flatiron District).
 * This enables location-based filtering for users who have neighborhood
 * preferences configured.
 *
 * Performance Considerations:
 * 260 Sample Sale typically has 5-15 active/upcoming sales at any time.
 * Sequential processing is more than adequate for this volume. The 4-hour
 * polling frequency means most runs will skip existing sales (high skip rate).
 *
 * @returns Object with created and skipped counts for monitoring
 */
export async function ingestSampleSales(): Promise<{
  created: number;
  skipped: number;
}> {
  // Look up the 260 Sample Sale alert source configuration
  const source = await prisma.alertSource.findUnique({
    where: { slug: "260-sample-sale" },
    include: { module: true },
  });

  if (!source) {
    throw new Error(
      "260 Sample Sale source not configured - ensure seed data exists"
    );
  }

  // Fetch current sales from 260 Sample Sale
  const sales = await fetch260SampleSales();

  let created = 0;
  let skipped = 0;

  for (const sale of sales) {
    // Check for existing event using composite unique constraint
    // This implements exactly-once semantics for sale processing
    const existing = await prisma.alertEvent.findUnique({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId: sale.id,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Calculate hype score using brand tier, scarcity signals, and AI adjustment
    // This provides urgency scoring for email digest prioritization
    const hypeResult = await calculateHypeScoreWithAi(
      sale.brand,
      sale.description || ""
    );

    // Create new AlertEvent with sample sale metadata and hype scoring
    const event = await prisma.alertEvent.create({
      data: {
        sourceId: source.id,
        externalId: sale.id,
        title: `${sale.brand} Sample Sale`,
        body: `${sale.location}\n${sale.startDate.toLocaleDateString()} - ${sale.endDate.toLocaleDateString()}`,
        startsAt: sale.startDate,
        endsAt: sale.endDate,
        neighborhoods: ["manhattan"], // Most 260 sales are in Manhattan (Flatiron District)
        hypeScore: hypeResult.finalScore,
        hypeFactors: hypeResult.factors,
        metadata: {
          brands: [sale.brand.toLowerCase()],
          location: sale.location,
          url: sale.url,
        },
      },
      include: {
        source: {
          include: { module: true },
        },
      },
    });

    // Trigger the matching engine to queue notifications for eligible users
    // The matching engine can use metadata.brands for brand-based filtering
    // Cast to MatchableEvent since Prisma's JsonValue type doesn't match Record<string, unknown>
    await matchEventToUsers(event as unknown as MatchableEvent & { id: string });
    created++;
  }

  // Update source timestamp for monitoring and debugging
  await prisma.alertSource.update({
    where: { id: source.id },
    data: { lastPolledAt: new Date() },
  });

  console.log(
    `[260 Sample Sale] Ingested ${sales.length} sales: ${created} created, ${skipped} skipped`
  );

  return { created, skipped };
}
