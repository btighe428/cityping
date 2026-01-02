// src/lib/scrapers/housing-connect.ts
/**
 * Housing Connect Lottery Scraper for NYC Ping
 *
 * This module implements the ingestion pipeline for NYC Housing Connect affordable
 * housing lottery listings, enabling users to receive timely notifications about
 * new housing opportunities matching their income eligibility.
 *
 * Architectural Context:
 * Like the MTA scraper, this follows the "pipes and filters" pattern, transforming
 * external HTML data into internal AlertEvent objects that flow through the matching
 * engine to produce targeted notifications based on income bracket eligibility.
 *
 * Data Flow:
 * 1. fetchHousingLotteries() - Scrape HTML from Housing Connect public page
 * 2. parseHousingLottery() - Extract lottery details from DOM elements
 * 3. ingestHousingLotteries() - Dedup, persist to AlertEvent, trigger matching
 *
 * NYC Housing Connect Context:
 * Housing Connect (housingconnect.nyc.gov) is NYC's centralized portal for
 * affordable housing lottery applications. It replaced the previous paper-based
 * system in 2014 as part of Mayor de Blasio's affordable housing initiative.
 *
 * Income Brackets (AMI - Area Median Income):
 * NYC affordable housing uses AMI percentages to determine eligibility:
 * - Extremely Low Income: 0-30% AMI
 * - Very Low Income: 30-50% AMI
 * - Low Income: 50-80% AMI
 * - Moderate Income: 80-130% AMI
 * - Middle Income: 130-165% AMI
 *
 * The AMI is set annually by HUD (Housing and Urban Development). For 2024,
 * the NYC metro AMI for a family of 3 is approximately $118,200, meaning
 * 50% AMI would be ~$59,100 for housing eligibility purposes.
 *
 * Scraping Strategy:
 * Housing Connect does not provide a public API, necessitating HTML scraping.
 * The scraper uses Cheerio for DOM parsing, which provides jQuery-like syntax
 * for server-side HTML manipulation. The page structure may change, so selectors
 * are documented and designed for easy updates.
 *
 * Rate Limiting:
 * The scraper runs daily at 3am ET (8:00 UTC) to catch new lottery postings.
 * Housing lotteries typically have application windows of 30-60 days, so daily
 * polling is sufficient while being respectful of server resources.
 *
 * Deduplication Strategy:
 * Events are deduplicated using the composite unique index on (sourceId, externalId).
 * The lottery ID from Housing Connect serves as externalId, ensuring each lottery
 * is processed exactly once even if the scraper runs multiple times.
 */

import { prisma } from "../db";
import { matchEventToUsers, MatchableEvent } from "../matching";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

/**
 * Internal representation of a Housing Connect lottery after transformation.
 *
 * This interface bridges the scraped HTML data and our AlertEvent model,
 * extracting only the fields relevant for notification matching.
 *
 * NYC Housing Lottery Context:
 * Each lottery represents a specific affordable housing development with
 * units available at various AMI levels. The application deadline is critical
 * as missing it means waiting potentially years for the next opportunity.
 */
export interface HousingLottery {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  incomeBrackets: string[];
  applicationDeadline: Date;
  url: string;
}

/**
 * Housing Connect public lottery search page URL.
 *
 * This endpoint returns HTML listing all active housing lotteries.
 * The page uses server-side rendering, making it suitable for
 * Cheerio-based scraping without need for JavaScript execution.
 *
 * Note: Housing Connect may implement client-side rendering in future
 * updates, which would require switching to a headless browser solution.
 */
const HOUSING_CONNECT_URL =
  "https://housingconnect.nyc.gov/PublicWeb/search-lotteries";

/**
 * Fetches and parses housing lotteries from the Housing Connect website.
 *
 * The function handles:
 * - HTTP request with appropriate headers (user agent for identification)
 * - HTML parsing using Cheerio
 * - Transformation from DOM elements to HousingLottery interface
 *
 * DOM Structure Notes (as of 2024):
 * Housing Connect's page structure uses class-based selectors for lottery cards.
 * The actual selectors should be verified against the live page and updated
 * as needed. Common patterns include:
 * - .lottery-card or .listing-card - Container for each lottery
 * - data-lottery-id or data-id - Unique identifier attribute
 * - Various nested elements for name, address, deadline, income brackets
 *
 * IMPORTANT: The selectors below are placeholder approximations. The actual
 * Housing Connect page structure should be inspected to determine correct selectors.
 * The page may use Angular/React components with dynamically generated class names.
 *
 * @returns Array of transformed housing lottery objects
 * @throws Error if HTTP request fails or page structure is unexpected
 */
export async function fetchHousingLotteries(): Promise<HousingLottery[]> {
  const response = await fetch(HOUSING_CONNECT_URL, {
    headers: {
      "User-Agent": "NYCPing Bot (+https://nycping.com)",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store", // Bypass Next.js cache for fresh data
  });

  if (!response.ok) {
    throw new Error(`Housing Connect error: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const lotteries: HousingLottery[] = [];

  // Parse lottery listings from page
  // NOTE: These selectors are based on common patterns and the implementation plan.
  // The actual Housing Connect page structure may differ and should be verified.
  // Common selector patterns to try if these don't work:
  // - .listing-card, .property-card, .lottery-item
  // - [data-lottery-id], [data-listing-id], [data-property-id]
  // - .mat-card (if Angular Material is used)
  $(".lottery-card").each((_, el) => {
    const $el = $(el);

    // Extract lottery ID - critical for deduplication
    // May be in data-lottery-id, data-id, or href parameter
    const id = extractLotteryId($el);

    // Extract lottery details
    const name = $el.find(".lottery-name, .property-name, h3, h4").first().text().trim();
    const address = $el.find(".lottery-address, .property-address, .address").first().text().trim();
    const neighborhood = $el.find(".lottery-neighborhood, .neighborhood, .location").first().text().trim();
    const deadline = $el.find(".lottery-deadline, .deadline, .apply-by").first().text().trim();

    // Extract income brackets (may be multiple elements)
    const brackets: string[] = [];
    $el.find(".income-bracket, .ami-level, .income-level").each((_, b) => {
      const bracket = $(b).text().trim();
      if (bracket) {
        brackets.push(bracket);
      }
    });

    // Only add lotteries with valid ID and name
    if (id && name) {
      lotteries.push({
        id,
        name,
        address,
        neighborhood: normalizeNeighborhood(neighborhood),
        incomeBrackets: brackets,
        applicationDeadline: parseDeadline(deadline),
        url: `https://housingconnect.nyc.gov/PublicWeb/details/${id}`,
      });
    }
  });

  return lotteries;
}

/**
 * Extracts the lottery ID from a lottery card element.
 *
 * Attempts multiple strategies to find the unique identifier:
 * 1. data-lottery-id attribute
 * 2. data-id attribute
 * 3. ID extracted from detail page link
 *
 * @param $el - Cheerio element representing the lottery card
 * @returns Lottery ID string or empty string if not found
 */
function extractLotteryId($el: cheerio.Cheerio<AnyNode>): string {
  // Try data attributes first
  let id = $el.attr("data-lottery-id") || $el.attr("data-id") || "";

  // If no data attribute, try to extract from link href
  if (!id) {
    const href = $el.find("a[href*='details']").attr("href") || "";
    const match = href.match(/details\/([^/?]+)/);
    if (match) {
      id = match[1];
    }
  }

  return id;
}

/**
 * Normalizes neighborhood name for consistent matching.
 *
 * NYC neighborhoods have many name variations:
 * - "Upper West Side" vs "upper west side" vs "UWS"
 * - "Bedford-Stuyvesant" vs "Bed-Stuy" vs "Bed Stuy"
 *
 * This function creates a slug-format identifier for matching.
 *
 * @param neighborhood - Raw neighborhood string from page
 * @returns Lowercase, hyphenated neighborhood identifier
 */
export function normalizeNeighborhood(neighborhood: string): string {
  return neighborhood
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, ""); // Remove non-alphanumeric except hyphens
}

/**
 * Parses deadline string into Date object.
 *
 * Housing Connect uses various date formats:
 * - "January 15, 2025"
 * - "01/15/2025"
 * - "Apply by January 15, 2025"
 *
 * Falls back to a future date (30 days from now) if parsing fails,
 * ensuring the lottery is still shown to users.
 *
 * @param deadline - Raw deadline string from page
 * @returns Date object representing application deadline
 */
export function parseDeadline(deadline: string): Date {
  // Remove common prefixes
  const cleaned = deadline
    .replace(/apply\s*by\s*/i, "")
    .replace(/deadline:\s*/i, "")
    .trim();

  const parsed = new Date(cleaned);

  // If parsing failed, default to 30 days from now
  if (isNaN(parsed.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback;
  }

  return parsed;
}

/**
 * Ingests housing lotteries into the NYC Ping event system.
 *
 * This is the primary entry point called by the cron job. It orchestrates:
 * 1. Fetching fresh lottery listings from Housing Connect
 * 2. Looking up the housing-connect-lotteries AlertSource
 * 3. Deduplicating against existing events by externalId
 * 4. Creating new AlertEvent records with income bracket metadata
 * 5. Triggering the matching engine for each new event
 * 6. Updating the source's lastPolledAt timestamp
 *
 * Transactional Integrity:
 * Each lottery is processed independently to ensure partial failures don't
 * affect successful ingestions. The matching engine is called synchronously
 * to maintain causal consistency (event -> match -> queue in one flow).
 *
 * Income Bracket Matching:
 * The metadata.incomeBrackets array enables the matching engine to filter
 * users by their housing income bracket preference. Users only receive
 * notifications for lotteries they may be eligible for based on their
 * self-reported income bracket.
 *
 * Performance Considerations:
 * Housing Connect typically has 50-200 active lotteries at any time.
 * Sequential processing is acceptable for this volume. The daily polling
 * frequency means most runs will skip existing lotteries (high skip rate).
 *
 * @returns Object with created and skipped counts for monitoring
 */
export async function ingestHousingLotteries(): Promise<{
  created: number;
  skipped: number;
}> {
  // Look up the Housing Connect alert source configuration
  const source = await prisma.alertSource.findUnique({
    where: { slug: "housing-connect-lotteries" },
    include: { module: true },
  });

  if (!source) {
    throw new Error(
      "Housing Connect source not configured - ensure seed data exists"
    );
  }

  // Fetch current lotteries from Housing Connect
  const lotteries = await fetchHousingLotteries();

  let created = 0;
  let skipped = 0;

  for (const lottery of lotteries) {
    // Check for existing event using composite unique constraint
    // This implements exactly-once semantics for lottery processing
    const existing = await prisma.alertEvent.findUnique({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId: lottery.id,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create new AlertEvent with housing-specific metadata
    const event = await prisma.alertEvent.create({
      data: {
        sourceId: source.id,
        externalId: lottery.id,
        title: `New Housing Lottery: ${lottery.name}`,
        body: `${lottery.address}\nApply by ${lottery.applicationDeadline.toLocaleDateString()}\n${lottery.url}`,
        startsAt: new Date(), // Lottery opens now (when we discover it)
        endsAt: lottery.applicationDeadline,
        neighborhoods: lottery.neighborhood ? [lottery.neighborhood] : [],
        metadata: {
          incomeBrackets: lottery.incomeBrackets,
          address: lottery.address,
          url: lottery.url,
          neighborhood: lottery.neighborhood,
        },
      },
      include: {
        source: {
          include: { module: true },
        },
      },
    });

    // Trigger the matching engine to queue notifications for eligible users
    // The matching engine uses metadata.incomeBrackets to filter users
    // who have enabled housing module with matching incomeBracket preference
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
    `[Housing Connect] Ingested ${lotteries.length} lotteries: ${created} created, ${skipped} skipped`
  );

  return { created, skipped };
}
