// src/lib/premium/haiku-events-curator.ts
/**
 * HAIKU-POWERED EVENTS CURATOR
 *
 * Uses Claude Haiku to intelligently decide when to alert users about events.
 * Instead of hardcoded alertDaysBefore arrays, Haiku analyzes each event and
 * determines the optimal alert timing based on:
 * - Event type (parade needs more notice than museum hours)
 * - Scale (citywide vs neighborhood)
 * - Actionability (buy tickets vs just show up)
 * - Seasonal relevance
 * - Traffic/transit impact
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db";
import { DateTime } from "luxon";

// ============================================================================
// TYPES
// ============================================================================

export interface CuratedEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  eventDate: Date;
  venue: string | null;
  neighborhood: string | null;
  icon: string;
  // Haiku-generated fields
  alertDays: number[];
  alertMessage: string;
  importanceScore: number; // 1-10
  insiderTip: string | null;
  transitImpact: "none" | "low" | "moderate" | "high";
}

export interface HaikuEventAnalysis {
  alertDays: number[];
  alertMessage: string;
  importanceScore: number;
  insiderTip: string | null;
  transitImpact: "none" | "low" | "moderate" | "high";
  reasoning: string;
}

// ============================================================================
// HAIKU CLIENT
// ============================================================================

function getHaikuClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[HaikuCurator] ANTHROPIC_API_KEY not configured, using smart defaults");
    return null;
  }
  return new Anthropic({ apiKey });
}

/**
 * Smart rule-based analysis (fallback when no API key)
 */
function getSmartDefaults(event: {
  title: string;
  description: string;
  category: string;
  eventDate: Date;
}): HaikuEventAnalysis {
  const title = event.title.toLowerCase();
  const category = event.category.toLowerCase();

  // Determine alert days based on event type
  let alertDays: number[] = [7, 3, 1];
  let importanceScore = 5;
  let transitImpact: "none" | "low" | "moderate" | "high" = "none";
  let insiderTip: string | null = null;

  // Major parades - early notice, high impact
  if (title.includes("parade") || title.includes("march")) {
    alertDays = [30, 21, 14, 7, 3, 1];
    importanceScore = 8;
    transitImpact = "high";
    insiderTip = "5th Ave parades mean major closures. Plan alternate routes.";
  }
  // Marathons/races
  else if (title.includes("marathon") || title.includes("half") || title.includes("race")) {
    alertDays = [21, 14, 7, 3, 1];
    importanceScore = 9;
    transitImpact = "high";
    insiderTip = "Race day = gridlock. Work from home if possible.";
  }
  // Daylight saving
  else if (title.includes("daylight") || title.includes("clock")) {
    alertDays = [7, 3, 1];
    importanceScore = 7;
    transitImpact = "none";
    insiderTip = "Spring forward = lose an hour. Go to bed early Saturday!";
  }
  // Festivals
  else if (category === "festival" || title.includes("festival")) {
    alertDays = [14, 7, 3, 1];
    importanceScore = 7;
    transitImpact = "moderate";
  }
  // Markets
  else if (category === "market" || title.includes("flea") || title.includes("market")) {
    alertDays = [7, 3, 1];
    importanceScore = 5;
    transitImpact = "low";
    insiderTip = "Get there early for the best finds.";
  }
  // Sports
  else if (category === "sports") {
    alertDays = [7, 3, 1];
    importanceScore = 6;
    transitImpact = "low";
  }
  // Museums
  else if (title.includes("museum") || title.includes("gallery")) {
    alertDays = [3, 1, 0];
    importanceScore = 4;
    transitImpact = "none";
  }

  const eventDate = DateTime.fromJSDate(event.eventDate);
  const alertMessage = `${event.title} is ${eventDate.toFormat("MMMM d")}!`;

  return {
    alertDays,
    alertMessage,
    importanceScore,
    insiderTip,
    transitImpact,
    reasoning: "Smart defaults based on event type and category",
  };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Analyze an event with Haiku and determine optimal alert timing
 */
export async function analyzeEventWithHaiku(event: {
  title: string;
  description: string;
  category: string;
  eventDate: Date;
  venue?: string | null;
  neighborhood?: string | null;
}): Promise<HaikuEventAnalysis> {
  const client = getHaikuClient();

  // Use smart defaults if no API key
  if (!client) {
    return getSmartDefaults(event);
  }

  const prompt = `You are an NYC events expert. Analyze this event and determine the optimal alert timing for a daily email digest.

EVENT:
Title: ${event.title}
Description: ${event.description}
Category: ${event.category}
Date: ${DateTime.fromJSDate(event.eventDate).toFormat("EEEE, MMMM d, yyyy")}
Venue: ${event.venue || "TBD"}
Neighborhood: ${event.neighborhood || "NYC"}

DETERMINE:
1. alertDays: Array of days before the event to alert users. Consider:
   - Major parades/marathons: [30, 21, 14, 7, 3, 1] (early notice for traffic)
   - Ticket-required events: [14, 7, 3, 1] (need time to buy)
   - Free walk-up events: [7, 3, 1] (moderate notice)
   - Daily recurring: [0] (day-of only)
   - Time-sensitive deadlines: [7, 3, 1, 0] (multiple reminders)

2. alertMessage: A brief, actionable 1-2 sentence message for the email digest.

3. importanceScore: 1-10 rating of NYC-relevance:
   - 10: Citywide impact (NYC Marathon, Thanksgiving Parade)
   - 7-9: Major cultural event (Pride, major museum openings)
   - 4-6: Neighborhood event (street fairs, local festivals)
   - 1-3: Niche interest (small gallery opening)

4. insiderTip: One NYC-insider tip that only locals would know (or null if none).

5. transitImpact: How much this affects transit/traffic:
   - "high": Major closures (marathons, parades on 5th Ave)
   - "moderate": Some detours (street fairs, film shoots)
   - "low": Minor impact (concerts, sports games)
   - "none": No transit impact

Respond in this exact JSON format:
{
  "alertDays": [14, 7, 3, 1],
  "alertMessage": "Brief message here",
  "importanceScore": 7,
  "insiderTip": "Tip here or null",
  "transitImpact": "moderate",
  "reasoning": "Brief explanation of your choices"
}`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const analysis = JSON.parse(jsonMatch[0]) as HaikuEventAnalysis;

    console.log(`[HaikuCurator] Analyzed: ${event.title} -> alertDays: [${analysis.alertDays.join(", ")}]`);

    return analysis;
  } catch (error) {
    console.error("[HaikuCurator] Analysis failed:", error);
    // Return sensible defaults
    return {
      alertDays: [7, 3, 1],
      alertMessage: `${event.title} is coming up!`,
      importanceScore: 5,
      insiderTip: null,
      transitImpact: "none",
      reasoning: "Default values due to analysis error",
    };
  }
}

/**
 * Batch analyze multiple events (cost-efficient)
 */
export async function analyzeEventsWithHaiku(events: Array<{
  id: string;
  title: string;
  description: string;
  category: string;
  eventDate: Date;
  venue?: string | null;
  neighborhood?: string | null;
}>): Promise<Map<string, HaikuEventAnalysis>> {
  const results = new Map<string, HaikuEventAnalysis>();

  // Process in batches of 5 to avoid rate limits
  const BATCH_SIZE = 5;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);

    const analyses = await Promise.all(
      batch.map(async (event) => {
        const analysis = await analyzeEventWithHaiku(event);
        return { id: event.id, analysis };
      })
    );

    for (const { id, analysis } of analyses) {
      results.set(id, analysis);
    }

    // Rate limit: wait between batches
    if (i + BATCH_SIZE < events.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return results;
}

/**
 * Generate horizon alerts for today using Haiku-curated events
 */
export async function getHaikuCuratedAlerts(today: DateTime = DateTime.now()): Promise<CuratedEvent[]> {
  // Get events from database that should alert today
  const upcomingEvents = await prisma.cityEvent.findMany({
    where: {
      startsAt: {
        gte: today.toJSDate(),
        lte: today.plus({ days: 45 }).toJSDate(),
      },
      status: "published",
    },
    orderBy: { startsAt: "asc" },
    take: 50,
  });

  if (upcomingEvents.length === 0) {
    console.log("[HaikuCurator] No upcoming events found");
    return [];
  }

  // Check which events need Haiku analysis
  const needsAnalysis = upcomingEvents.filter((e) => {
    // Check if we have cached analysis
    const metadata = e.editorNotes as { haikuAnalysis?: HaikuEventAnalysis } | null;
    return !metadata?.haikuAnalysis;
  });

  if (needsAnalysis.length > 0) {
    console.log(`[HaikuCurator] Analyzing ${needsAnalysis.length} events with Haiku`);

    const analyses = await analyzeEventsWithHaiku(
      needsAnalysis.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description || "",
        category: e.category,
        eventDate: e.startsAt!,
        venue: e.venue,
        neighborhood: e.neighborhood,
      }))
    );

    // Cache analyses in database
    for (const [id, analysis] of analyses) {
      await prisma.cityEvent.update({
        where: { id },
        data: {
          editorNotes: JSON.stringify({ haikuAnalysis: analysis }),
        },
      });
    }
  }

  // Now filter to events that should alert today
  const alerts: CuratedEvent[] = [];
  const todayStart = today.startOf("day");

  for (const event of upcomingEvents) {
    if (!event.startsAt) continue;

    const eventDate = DateTime.fromJSDate(event.startsAt);
    const daysUntil = Math.floor(eventDate.diff(todayStart, "days").days);

    // Get cached analysis
    const metadata = event.editorNotes as { haikuAnalysis?: HaikuEventAnalysis } | null;
    const analysis = metadata?.haikuAnalysis;

    if (!analysis) continue;

    // Check if today is an alert day
    if (analysis.alertDays.includes(daysUntil)) {
      alerts.push({
        id: event.id,
        title: event.title,
        description: event.description || "",
        category: event.category,
        eventDate: event.startsAt,
        venue: event.venue,
        neighborhood: event.neighborhood,
        icon: getCategoryIcon(event.category),
        alertDays: analysis.alertDays,
        alertMessage: analysis.alertMessage,
        importanceScore: analysis.importanceScore,
        insiderTip: analysis.insiderTip,
        transitImpact: analysis.transitImpact,
      });
    }
  }

  // Sort by importance
  alerts.sort((a, b) => b.importanceScore - a.importanceScore);

  console.log(`[HaikuCurator] ${alerts.length} events should alert today`);

  return alerts;
}

/**
 * Get category icon
 */
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    culture: "🎭",
    music: "🎵",
    sports: "⚽",
    food: "🍽️",
    art: "🎨",
    film: "🎬",
    comedy: "😂",
    theater: "🎪",
    festival: "🎉",
    parade: "🎊",
    market: "🛍️",
    civic: "🏛️",
    transit: "🚇",
    parking: "🅿️",
    default: "📅",
  };

  return icons[category.toLowerCase()] || icons.default;
}

/**
 * Seed the events database with Haiku-curated NYC events
 */
export async function seedHaikuCuratedEvents(): Promise<{ created: number; analyzed: number }> {
  // Valid categories: culture, sports, food, civic, weather, transit, seasonal, local
  const sampleEvents = [
    {
      title: "St. Patrick's Day Parade",
      description: "World's largest St. Patrick's Day parade on 5th Avenue from 44th to 79th St",
      category: "culture" as const,
      startsAt: new Date("2026-03-17T11:00:00"),
      venue: "5th Avenue",
      neighborhood: "Midtown Manhattan",
    },
    {
      title: "Daylight Saving Time Begins",
      description: "Set clocks forward 1 hour at 2am. You'll lose an hour of sleep!",
      category: "civic" as const,
      startsAt: new Date("2026-03-08T02:00:00"),
      venue: null,
      neighborhood: null,
    },
    {
      title: "NYC Half Marathon",
      description: "13.1 mile race through Manhattan with major road closures",
      category: "sports" as const,
      startsAt: new Date("2026-03-15T07:00:00"),
      venue: "Central Park to South Street Seaport",
      neighborhood: "Manhattan",
    },
    {
      title: "Brooklyn Flea Opening Day",
      description: "Outdoor season begins at the iconic Brooklyn Flea market",
      category: "local" as const,
      startsAt: new Date("2026-04-04T10:00:00"),
      venue: "Dumbo Archway",
      neighborhood: "DUMBO",
    },
    {
      title: "Sakura Matsuri Cherry Blossom Festival",
      description: "Annual celebration of Japanese culture at Brooklyn Botanic Garden",
      category: "culture" as const,
      startsAt: new Date("2026-04-25T10:00:00"),
      venue: "Brooklyn Botanic Garden",
      neighborhood: "Prospect Heights",
    },
    {
      title: "Lunar New Year Parade",
      description: "Celebrate the Year of the Horse with the annual Chinatown parade",
      category: "culture" as const,
      startsAt: new Date("2026-02-22T13:00:00"),
      venue: "Mott Street, Chinatown",
      neighborhood: "Chinatown",
    },
    {
      title: "Restaurant Week Winter 2026",
      description: "Prix-fixe menus at 400+ NYC restaurants. $30 lunch, $45 dinner.",
      category: "food" as const,
      startsAt: new Date("2026-02-23T00:00:00"),
      venue: "Citywide",
      neighborhood: null,
    },
  ];

  let created = 0;
  let analyzed = 0;

  for (const event of sampleEvents) {
    // Check if exists
    const existing = await prisma.cityEvent.findFirst({
      where: { title: event.title },
    });

    if (existing) {
      console.log(`[HaikuCurator] Skipping existing: ${event.title}`);
      continue;
    }

    // Analyze with Haiku
    const analysis = await analyzeEventWithHaiku({
      title: event.title,
      description: event.description,
      category: event.category,
      eventDate: event.startsAt,
      venue: event.venue,
      neighborhood: event.neighborhood,
    });
    analyzed++;

    // Create event (status: auto, review, published, rejected)
    await prisma.cityEvent.create({
      data: {
        title: event.title,
        description: event.description,
        category: event.category,
        startsAt: event.startsAt,
        venue: event.venue,
        neighborhood: event.neighborhood,
        status: "published",
        editorNotes: JSON.stringify({ haikuAnalysis: analysis }),
        sourceType: "haiku-curator",
        sourceName: "CityPing Haiku Curator",
      },
    });
    created++;

    console.log(`[HaikuCurator] Created: ${event.title}`);
  }

  return { created, analyzed };
}
