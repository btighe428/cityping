// src/lib/premium/one-thing-curator.ts
/**
 * One Thing To Do Today - Daily Event Curator
 *
 * Premium feature that selects ONE interesting, obscure, or unique event
 * for the day. The goal is to surface hidden gems that users wouldn't
 * find on their own.
 *
 * Selection Criteria:
 * 1. High insider score (80+) - unusual or noteworthy
 * 2. Low mainstream visibility - not heavily advertised
 * 3. Time-sensitive - happening today/this week
 * 4. Accessible - free or low cost, reasonable location
 *
 * Uses LLM to generate "insider reason" explaining why it's special.
 */

import { prisma } from "../db";
import Anthropic from "@anthropic-ai/sdk";

// ============================================================================
// TYPES
// ============================================================================

export interface CuratedOneThing {
  eventId: string;
  title: string;
  venue: string | null;
  neighborhood: string | null;
  startsAt: Date | null;
  insiderReason: string;
  category: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Minimum scores for consideration
const MIN_INSIDER_SCORE = 60;
const MIN_SCARCITY_SCORE = 40;

// Categories to prioritize (cultural gems, hidden spots)
const PRIORITY_CATEGORIES = ["culture", "food", "local", "seasonal"];

// Categories to deprioritize (too mainstream)
const DEPRIORITY_CATEGORIES = ["sports"];

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Select and curate today's "One Thing"
 * Called by daily cron at 5 AM
 */
export async function curateOneThing(): Promise<CuratedOneThing | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if we already curated for today
  const existing = await prisma.curatedDailyEvent.findUnique({
    where: { curatedFor: today },
  });

  if (existing) {
    console.log("[OneThing] Already curated for today");
    const event = await prisma.cityEvent.findUnique({
      where: { id: existing.eventId },
    });

    if (event) {
      return {
        eventId: event.id,
        title: event.title,
        venue: event.venue,
        neighborhood: event.neighborhood,
        startsAt: event.startsAt,
        insiderReason: existing.insiderReason,
        category: event.category,
      };
    }
  }

  // Find candidate events happening today
  const candidates = await prisma.cityEvent.findMany({
    where: {
      startsAt: {
        gte: today,
        lt: tomorrow,
      },
      status: { in: ["published", "auto"] },
      insiderScore: { gte: MIN_INSIDER_SCORE },
    },
    orderBy: [
      { insiderScore: "desc" },
      { scarcityScore: "desc" },
    ],
    take: 20,
  });

  if (candidates.length === 0) {
    // Fallback: get highest scoring event this week
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekCandidates = await prisma.cityEvent.findMany({
      where: {
        startsAt: {
          gte: today,
          lt: weekEnd,
        },
        status: { in: ["published", "auto"] },
      },
      orderBy: [
        { insiderScore: "desc" },
        { scarcityScore: "desc" },
      ],
      take: 10,
    });

    if (weekCandidates.length === 0) {
      console.log("[OneThing] No candidate events found");
      return null;
    }

    candidates.push(...weekCandidates);
  }

  // Score and rank candidates
  const scoredCandidates = candidates.map((event) => {
    let score = event.insiderScore + event.scarcityScore;

    // Boost priority categories
    if (PRIORITY_CATEGORIES.includes(event.category)) {
      score += 20;
    }

    // Penalize depriority categories
    if (DEPRIORITY_CATEGORIES.includes(event.category)) {
      score -= 30;
    }

    // Boost events with specific neighborhoods (more local)
    if (event.neighborhood) {
      score += 10;
    }

    // Boost events with insider-friendly times (evening, weekend)
    if (event.startsAt) {
      const hour = event.startsAt.getHours();
      const day = event.startsAt.getDay();
      if (hour >= 17 && hour <= 21) score += 10; // Evening
      if (day === 0 || day === 6) score += 5; // Weekend
    }

    return { event, score };
  });

  // Sort by score
  scoredCandidates.sort((a, b) => b.score - a.score);

  // Select top candidate
  const selected = scoredCandidates[0]?.event;

  if (!selected) {
    console.log("[OneThing] No suitable event found");
    return null;
  }

  // Generate insider reason with LLM
  const insiderReason = await generateInsiderReason(selected);

  // Save curation
  await prisma.curatedDailyEvent.create({
    data: {
      eventId: selected.id,
      curatedFor: today,
      insiderReason,
    },
  });

  console.log(`[OneThing] Curated: "${selected.title}"`);

  return {
    eventId: selected.id,
    title: selected.title,
    venue: selected.venue,
    neighborhood: selected.neighborhood,
    startsAt: selected.startsAt,
    insiderReason,
    category: selected.category,
  };
}

/**
 * Generate insider reason using LLM
 */
async function generateInsiderReason(event: {
  title: string;
  description: string | null;
  venue: string | null;
  neighborhood: string | null;
  category: string;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback to generic reason
    return generateFallbackReason(event);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a NYC local who knows all the hidden gems. Given this event, write a 1-2 sentence "insider reason" explaining why a savvy New Yorker should go. Be specific, conversational, and avoid generic superlatives. Focus on what makes this unique, surprising, or a rare opportunity.

Event: ${event.title}
${event.description ? `Description: ${event.description.substring(0, 500)}` : ""}
${event.venue ? `Venue: ${event.venue}` : ""}
${event.neighborhood ? `Neighborhood: ${event.neighborhood}` : ""}
Category: ${event.category}

Write ONLY the insider reason, nothing else. Keep it under 100 words.`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0];
    if (text.type === "text") {
      return text.text.trim();
    }

    return generateFallbackReason(event);
  } catch (error) {
    console.error("[OneThing] LLM error:", error);
    return generateFallbackReason(event);
  }
}

/**
 * Generate fallback reason without LLM
 */
function generateFallbackReason(event: {
  title: string;
  venue: string | null;
  neighborhood: string | null;
  category: string;
}): string {
  const reasons: Record<string, string[]> = {
    culture: [
      "A rare chance to experience something off the beaten path.",
      "The kind of event that locals mark their calendars for.",
      "Worth rearranging your schedule for this one.",
    ],
    food: [
      "Foodies in the know will want to be there.",
      "A culinary experience that won't come around often.",
      "The sort of thing you'll be telling friends about.",
    ],
    local: [
      "A true neighborhood gem that flies under the radar.",
      "This is the NYC that tourists never see.",
      "Local flavor at its finest.",
    ],
    seasonal: [
      "A seasonal tradition worth participating in.",
      "One of those once-a-year moments you don't want to miss.",
      "Perfect timing for this time of year.",
    ],
    civic: [
      "A chance to be part of something bigger.",
      "Community at its best.",
      "The kind of civic engagement that makes NYC special.",
    ],
    sports: [
      "For the true fans who appreciate the sport.",
      "A unique opportunity for sports enthusiasts.",
    ],
    transit: [
      "A behind-the-scenes look at how the city moves.",
    ],
    weather: [
      "Make the most of today's conditions.",
    ],
  };

  const categoryReasons = reasons[event.category] || reasons.culture;
  const randomReason =
    categoryReasons[Math.floor(Math.random() * categoryReasons.length)];

  if (event.neighborhood) {
    return `${randomReason} Happening in ${event.neighborhood}.`;
  }

  return randomReason;
}

/**
 * Get today's curated event
 */
export async function getTodaysOneThing(): Promise<CuratedOneThing | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const curated = await prisma.curatedDailyEvent.findUnique({
    where: { curatedFor: today },
  });

  if (!curated) {
    return null;
  }

  const event = await prisma.cityEvent.findUnique({
    where: { id: curated.eventId },
  });

  if (!event) {
    return null;
  }

  return {
    eventId: event.id,
    title: event.title,
    venue: event.venue,
    neighborhood: event.neighborhood,
    startsAt: event.startsAt,
    insiderReason: curated.insiderReason,
    category: event.category,
  };
}

/**
 * Format One Thing for email digest
 */
export function formatOneThingForDigest(oneThing: CuratedOneThing): {
  html: string;
  text: string;
} {
  const timeStr = oneThing.startsAt
    ? oneThing.startsAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })
    : "Today";

  const locationStr = [oneThing.venue, oneThing.neighborhood]
    .filter(Boolean)
    .join(", ");

  const html = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 12px; margin: 12px 0; color: white;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; margin-bottom: 8px;">
        ✨ One Thing To Do Today
      </div>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
        ${oneThing.title}
      </div>
      <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">
        ${timeStr}${locationStr ? ` • ${locationStr}` : ""}
      </div>
      <div style="font-size: 14px; font-style: italic; line-height: 1.4;">
        "${oneThing.insiderReason}"
      </div>
    </div>
  `;

  const text = `
✨ ONE THING TO DO TODAY
${oneThing.title}
${timeStr}${locationStr ? ` • ${locationStr}` : ""}

"${oneThing.insiderReason}"
  `.trim();

  return { html, text };
}
