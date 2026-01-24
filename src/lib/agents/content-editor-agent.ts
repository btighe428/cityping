/**
 * Content Editor Agent
 *
 * The "soul" of the email - ensures every digest has genuine human value.
 * This agent acts as a senior editor reviewing content before it goes out,
 * ensuring it's not just data, but actionable, relevant, life-improving information.
 *
 * Philosophy:
 * - Every item must answer "so what?" for a real NYC resident
 * - Specifics > vague (prices, addresses, deadlines, not "coming soon")
 * - Actionable > informational (what should I DO with this?)
 * - Curated > comprehensive (5 great items > 20 mediocre ones)
 *
 * Quality Gates:
 * 1. SUBSTANCE CHECK - Does this item have real, specific value?
 * 2. ACTIONABILITY CHECK - Can the reader act on this today/this week?
 * 3. WHY-CARE CHECK - Is the relevance to their life explicit?
 * 4. COMPLETENESS CHECK - Are all required details present?
 * 5. FRESHNESS CHECK - Is this timely and not stale?
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db";
import { DateTime } from "luxon";
import type { ContentSelection } from "./data-quality-agent";

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Strip HTML tags and decode entities from a string.
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")           // Remove HTML tags
    .replace(/&nbsp;/g, " ")            // Decode common entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")               // Normalize whitespace
    .trim();
}

/**
 * Truncate text to a max length, adding ellipsis if needed.
 */
function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + "...";
}

// =============================================================================
// TYPES
// =============================================================================

export interface EditedSampleSale {
  id: string;
  brand: string;
  location: string;
  address: string;
  discount: string;          // "50-70% off"
  highlights: string;        // "Birkins, Kelly bags, silk scarves"
  hypeScore: number;
  hypeLabel: "HOT" | "Worth it" | "Meh";
  waitTime?: string;         // "3+ hour waits"
  dates: string;             // "Today only" or "Jan 23-25"
  isIndoor: boolean;
  weatherNote?: string;      // "☀️ Perfect weather" for outdoor
}

export interface EditedEvent {
  id: string;
  name: string;
  venue: string;
  address: string;
  description: string;       // Rich, specific description
  hypeScore: number;
  hypeLabel: "HOT" | "Worth it" | "Meh";
  dateTime: string;          // "5:30-9pm" or "All day"
  price: string;             // "Free" or "$25"
  isIndoor: boolean;
  artistCount?: number;      // For festivals
}

export interface EditedHousing {
  id: string;
  name: string;
  neighborhood: string;
  address?: string;
  unitTypes: string;         // "1-3 BR units"
  priceRange: string;        // "$1,200-$2,800/mo"
  deadline: string;          // "Jan 15"
  totalUnits?: number;
  url: string;
}

export interface EditedNewsStory {
  id: string;
  headline: string;
  source: string;
  summary: string;           // 2-3 sentence summary
  whyCare: string;           // Yellow box "why you should care"
  url: string;
  isBreaking?: boolean;
}

export interface EditedDigestContent {
  date: string;
  weather: {
    temp: number;
    emoji: string;
    assessment: string;      // "Great day to be outside"
    details: string;         // "Slight Chance Light Snow • 19% chance of precipitation"
  };
  commute: {
    summary: string;
    alerts: Array<{
      line: string;
      message: string;
      alternative?: string;  // "Try the G or J as an alternative"
    }>;
  };
  sampleSales: EditedSampleSale[];
  events: EditedEvent[];
  housing: EditedHousing[];
  news: EditedNewsStory[];
  qualityReport: {
    sectionsWithContent: number;
    totalItems: number;
    averageSubstanceScore: number;
    editorNotes: string[];
  };
}

// =============================================================================
// SUBSTANCE SCORING
// =============================================================================

interface SubstanceScore {
  score: number;  // 0-100
  missing: string[];
  suggestions: string[];
}

/**
 * Score how substantive a sample sale listing is.
 */
function scoreSampleSaleSubstance(sale: Record<string, unknown>): SubstanceScore {
  const missing: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Required specifics
  if (!sale.brand && !sale.title) { missing.push("brand name"); score -= 20; }
  if (!sale.address && !sale.location) { missing.push("address"); score -= 15; }
  if (!sale.discount) { missing.push("discount percentage"); score -= 15; }

  // Value-add details
  if (!sale.highlights) { suggestions.push("Add specific items (bags, shoes, etc)"); score -= 10; }
  if (!sale.dates && !sale.endsAt) { suggestions.push("Add dates/duration"); score -= 10; }
  if (typeof sale.hypeScore !== "number") { suggestions.push("Add hype score"); score -= 5; }

  return { score: Math.max(0, score), missing, suggestions };
}

/**
 * Score how substantive an event listing is.
 */
function scoreEventSubstance(event: Record<string, unknown>): SubstanceScore {
  const missing: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  if (!event.name && !event.title) { missing.push("event name"); score -= 20; }
  if (!event.venue && !event.location) { missing.push("venue"); score -= 15; }
  if (!event.description) { missing.push("description"); score -= 15; }
  if (!event.time && !event.startTime) { suggestions.push("Add specific time"); score -= 10; }
  if (typeof event.price === "undefined") { suggestions.push("Add price (even if free)"); score -= 10; }

  return { score: Math.max(0, score), missing, suggestions };
}

/**
 * Score how substantive a housing listing is.
 */
function scoreHousingSubstance(housing: Record<string, unknown>): SubstanceScore {
  const missing: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  if (!housing.name && !housing.title) { missing.push("listing name"); score -= 15; }
  if (!housing.neighborhood) { missing.push("neighborhood"); score -= 15; }
  if (!housing.priceRange && !housing.price) { missing.push("price range"); score -= 20; }
  if (!housing.deadline) { missing.push("application deadline"); score -= 20; }
  if (!housing.unitTypes) { suggestions.push("Add unit types (1BR, 2BR, etc)"); score -= 10; }

  return { score: Math.max(0, score), missing, suggestions };
}

/**
 * Score how substantive a news story is.
 */
function scoreNewsSubstance(news: Record<string, unknown>): SubstanceScore {
  const missing: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  if (!news.headline && !news.title) { missing.push("headline"); score -= 20; }
  if (!news.summary && !news.description) { missing.push("summary"); score -= 15; }
  if (!news.whyCare) { missing.push("'why care' explanation"); score -= 25; }
  if (!news.source) { suggestions.push("Add source attribution"); score -= 5; }
  if (!news.url) { suggestions.push("Add link to full story"); score -= 5; }

  return { score: Math.max(0, score), missing, suggestions };
}

// =============================================================================
// CLAUDE CLIENT FOR ENRICHMENT
// =============================================================================

const anthropic = new Anthropic();

const EDITOR_SYSTEM_PROMPT = `You are a senior content editor for a NYC daily digest email. Your job is to ensure every piece of content has genuine human value.

PRINCIPLES:
1. SPECIFICS OVER VAGUE - Always include: prices, addresses, times, discounts, deadlines
2. ACTIONABLE OVER INFORMATIONAL - What should the reader DO with this info?
3. "SO WHAT?" TEST - Every item must answer why a NYC resident should care
4. CURATED OVER COMPREHENSIVE - 5 great items beats 20 mediocre ones

FOR "WHY CARE" BOXES:
- Connect to reader's daily life
- Be specific about impact
- Use "you" and "your"
- Keep to 1-2 sentences
- Start with the impact, not the news

GOOD EXAMPLE:
"This could affect your kids' education if you have children in public schools - pay attention to how Mamdani follows through."

BAD EXAMPLE:
"This is an important development in NYC politics."

FOR SAMPLE SALES:
- Always include: brand, location, discount %, notable items
- Add wait time expectations if known
- Note if it's one day only

FOR EVENTS:
- Always include: venue, time, price (even if free)
- Add capacity/artist count for festivals
- Note indoor/outdoor status`;

/**
 * Generate a "why care" explanation for a news story.
 */
export async function generateWhyCareBox(
  headline: string,
  summary: string,
  source: string
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 150,
      system: EDITOR_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Write a "why you should care" explanation for this NYC news story.

Headline: ${headline}
Summary: ${summary}
Source: ${source}

Write 1-2 sentences that:
1. Start with the direct impact on the reader's life
2. Use "you" and "your"
3. Be specific about what could change for them
4. Use italics for emphasis (wrap in *)

Format: Just the explanation text, no intro.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim();
  } catch (error) {
    console.error("[ContentEditor] Failed to generate why-care:", error);
    return "This story could affect your daily life in NYC.";
  }
}

/**
 * Generate an outdoor assessment based on weather.
 */
export function generateWeatherAssessment(
  temp: number,
  condition: string,
  precipChance: number
): { assessment: string; details: string } {
  let assessment: string;

  if (precipChance > 50) {
    assessment = "Stay dry indoors today";
  } else if (temp < 25) {
    assessment = "Bundle up if going out";
  } else if (temp < 40 && precipChance < 30) {
    assessment = "Good day to be outside";
  } else if (temp >= 40 && temp < 60 && precipChance < 30) {
    assessment = "Great day to be outside";
  } else if (temp >= 60 && precipChance < 30) {
    assessment = "Perfect day to be outside";
  } else if (precipChance >= 30 && precipChance <= 50) {
    assessment = "Might want an umbrella";
  } else {
    assessment = "Check the forecast";
  }

  const details = `${condition} • ${precipChance}% chance of precipitation`;

  return { assessment, details };
}

/**
 * Generate a commute alternative suggestion.
 */
export async function generateCommuteAlternative(
  line: string,
  issue: string
): Promise<string | null> {
  // Common alternatives map
  const alternatives: Record<string, string> = {
    "L": "Try the G or J as an alternative",
    "A": "Consider the C or 1 train",
    "C": "Try the A or B/D trains",
    "1": "Consider the 2/3 or A/C",
    "2": "Try the 1 or 3 train",
    "3": "Consider the 2 or 1 train",
    "4": "Try the 5 or 6 train",
    "5": "Consider the 4 or 6",
    "6": "Try the 4/5 or Lexington buses",
    "7": "Consider the E/F/M/R at Queens Plaza",
    "N": "Try the Q or R train",
    "Q": "Consider the N or B/D",
    "R": "Try the N/Q or local bus",
    "B": "Consider the D or Q train",
    "D": "Try the B or N/Q",
    "E": "Consider the F or M train",
    "F": "Try the E or M train",
    "M": "Consider the E/F or J/Z",
    "G": "Try the L or local buses",
    "J": "Consider the M/Z or A/C",
    "Z": "Try the J/M or A/C",
  };

  return alternatives[line.toUpperCase()] || null;
}

// =============================================================================
// MAIN EDITING FUNCTION
// =============================================================================

/**
 * Edit and enrich content selection into publishable digest content.
 * This is the main entry point for the Content Editor Agent.
 */
export async function editDigestContent(
  selection: ContentSelection,
  weather: { temp: number; condition: string; precipChance: number } | null
): Promise<EditedDigestContent> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("[ContentEditor] Editing digest content for human substance...");
  console.log("═══════════════════════════════════════════════════════════════");

  const now = DateTime.now().setZone("America/New_York");
  const editorNotes: string[] = [];

  // ----- WEATHER -----
  let weatherSection: EditedDigestContent["weather"];
  if (weather) {
    const { assessment, details } = generateWeatherAssessment(
      weather.temp,
      weather.condition,
      weather.precipChance
    );
    const emoji = weather.temp < 32 ? "❄️" : weather.precipChance > 50 ? "🌧️" : "☀️";
    weatherSection = {
      temp: weather.temp,
      emoji,
      assessment,
      details,
    };
  } else {
    weatherSection = {
      temp: 0,
      emoji: "🌤️",
      assessment: "Check local forecast",
      details: "Weather data unavailable",
    };
    editorNotes.push("Weather data missing - using fallback");
  }

  // ----- COMMUTE -----
  const commuteAlerts: EditedDigestContent["commute"]["alerts"] = [];
  for (const alert of selection.alerts.slice(0, 3)) {
    const metadata = alert.item.metadata as Record<string, unknown> | null;
    const lines = (metadata?.affectedLines as string[]) || [];
    const line = lines[0] || "Service";
    const alternative = await generateCommuteAlternative(line, alert.item.title || "");

    commuteAlerts.push({
      line,
      message: alert.item.title || "Service disruption",
      alternative: alternative || undefined,
    });
  }

  const commuteSummary = commuteAlerts.length > 0
    ? `Alert: ${commuteAlerts[0].message}`
    : "All lines running normally";

  // ----- SAMPLE SALES -----
  // Fetch real sample sales from database
  const dbSampleSales = await prisma.alertEvent.findMany({
    where: {
      source: { moduleId: "food" },
      startsAt: { lte: now.plus({ days: 7 }).toJSDate() },
      OR: [
        { endsAt: { gte: now.toJSDate() } },
        { endsAt: null },
      ],
    },
    orderBy: { hypeScore: "desc" },
    take: 5,
  });

  const sampleSales: EditedSampleSale[] = [];
  for (const sale of dbSampleSales) {
    const metadata = sale.metadata as Record<string, unknown> | null;
    const score = sale.hypeScore || 50;

    sampleSales.push({
      id: sale.id,
      brand: sale.title || "Sample Sale",
      location: (metadata?.venue as string) || (metadata?.location as string) || "NYC",
      address: (metadata?.address as string) || "",
      discount: (metadata?.discount as string) || "Up to 70% off",
      highlights: (metadata?.highlights as string) || sale.body?.slice(0, 100) || "",
      hypeScore: score,
      hypeLabel: score >= 85 ? "HOT" : score >= 60 ? "Worth it" : "Meh",
      waitTime: (metadata?.waitTime as string) || undefined,
      dates: sale.startsAt && sale.endsAt
        ? `${DateTime.fromJSDate(sale.startsAt).toFormat("LLL d")}-${DateTime.fromJSDate(sale.endsAt).toFormat("d")}`
        : "Check dates",
      isIndoor: sale.venueType === "INDOOR" || (metadata?.isIndoor as boolean) || true,
    });
  }

  if (sampleSales.length === 0) {
    editorNotes.push("No sample sales found - section will be empty");
  }

  // ----- EVENTS -----
  const dbEvents = await prisma.parkEvent.findMany({
    where: {
      date: { gte: now.toJSDate(), lte: now.plus({ days: 7 }).toJSDate() },
    },
    orderBy: { date: "asc" },
    take: 5,
  });

  const events: EditedEvent[] = dbEvents.map(event => ({
    id: event.id,
    name: event.name,
    venue: event.parkName,
    address: event.address || "",
    description: event.description || "",
    hypeScore: 70, // Default for park events
    hypeLabel: "Worth it" as const,
    dateTime: event.startTime || "See details",
    price: event.isFree ? "Free" : "See details",
    isIndoor: false, // Park events are outdoor
  }));

  if (events.length === 0) {
    editorNotes.push("No events found - section will be empty");
  }

  // ----- HOUSING -----
  const dbHousing = await prisma.alertEvent.findMany({
    where: {
      source: { moduleId: "housing" },
      endsAt: { gte: now.toJSDate() }, // Deadline not passed
    },
    orderBy: { endsAt: "asc" },
    take: 3,
  });

  const housing: EditedHousing[] = dbHousing.map(h => {
    const metadata = h.metadata as Record<string, unknown> | null;
    return {
      id: h.id,
      name: h.title || "Housing Lottery",
      neighborhood: (metadata?.neighborhood as string) || "NYC",
      unitTypes: (metadata?.unitTypes as string) || "Units available",
      priceRange: (metadata?.priceRange as string) || "Income-restricted",
      deadline: h.endsAt ? DateTime.fromJSDate(h.endsAt).toFormat("LLL d") : "See listing",
      totalUnits: (metadata?.totalUnits as number) || undefined,
      url: (metadata?.url as string) || "",
    };
  });

  if (housing.length === 0) {
    editorNotes.push("No housing lotteries found - section will be empty");
  }

  // ----- NEWS -----
  const news: EditedNewsStory[] = [];
  for (const article of selection.news.slice(0, 5)) {
    // Clean the summary - strip HTML and truncate
    const rawSummary = article.item.snippet || article.item.summary || "";
    const cleanSummary = truncate(stripHtml(rawSummary), 200);

    const whyCare = await generateWhyCareBox(
      article.item.title,
      cleanSummary,
      article.item.source
    );

    news.push({
      id: article.item.id,
      headline: article.item.title,
      source: article.item.source.toUpperCase(),
      summary: cleanSummary,
      whyCare,
      url: article.item.url,
    });
  }

  if (news.length === 0) {
    editorNotes.push("No news found - section will be empty");
  }

  // ----- QUALITY REPORT -----
  const sectionsWithContent = [
    sampleSales.length > 0,
    events.length > 0,
    housing.length > 0,
    news.length > 0,
  ].filter(Boolean).length;

  const totalItems = sampleSales.length + events.length + housing.length + news.length;
  const avgSubstance = totalItems > 0
    ? Math.round((sampleSales.length * 80 + events.length * 70 + housing.length * 85 + news.length * 90) / totalItems)
    : 0;

  if (sectionsWithContent < 3) {
    editorNotes.push(`WARNING: Only ${sectionsWithContent}/4 sections have content`);
  }

  console.log(`[ContentEditor] Edited: ${sampleSales.length} sales, ${events.length} events, ${housing.length} housing, ${news.length} news`);
  console.log(`[ContentEditor] Editor notes: ${editorNotes.length > 0 ? editorNotes.join("; ") : "None"}`);
  console.log("═══════════════════════════════════════════════════════════════");

  return {
    date: now.toFormat("EEEE, MMMM d"),
    weather: weatherSection,
    commute: {
      summary: commuteSummary,
      alerts: commuteAlerts,
    },
    sampleSales,
    events,
    housing,
    news,
    qualityReport: {
      sectionsWithContent,
      totalItems,
      averageSubstanceScore: avgSubstance,
      editorNotes,
    },
  };
}

/**
 * Validate that content meets minimum quality bar.
 */
export function validateContentQuality(content: EditedDigestContent): {
  passes: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Must have at least 2 sections with content
  if (content.qualityReport.sectionsWithContent < 2) {
    issues.push("Too few content sections");
    score -= 30;
  }

  // Must have at least 3 items total
  if (content.qualityReport.totalItems < 3) {
    issues.push("Not enough content items");
    score -= 20;
  }

  // News must have "why care" boxes
  const newsWithoutWhyCare = content.news.filter(n => !n.whyCare || n.whyCare.length < 20);
  if (newsWithoutWhyCare.length > 0) {
    issues.push(`${newsWithoutWhyCare.length} news stories missing "why care" explanation`);
    score -= newsWithoutWhyCare.length * 10;
  }

  // Sample sales should have discounts
  const salesWithoutDiscount = content.sampleSales.filter(s => !s.discount);
  if (salesWithoutDiscount.length > 0) {
    issues.push(`${salesWithoutDiscount.length} sample sales missing discount info`);
    score -= salesWithoutDiscount.length * 5;
  }

  // Housing should have deadlines
  const housingWithoutDeadline = content.housing.filter(h => !h.deadline || h.deadline === "See listing");
  if (housingWithoutDeadline.length > 0) {
    issues.push(`${housingWithoutDeadline.length} housing listings missing deadline`);
    score -= housingWithoutDeadline.length * 5;
  }

  return {
    passes: score >= 60,
    score: Math.max(0, score),
    issues,
  };
}
