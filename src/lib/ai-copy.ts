// src/lib/ai-copy.ts
/**
 * AI Copy Generation for NYCPing Insider Voice
 *
 * Generates editorial copy with the distinctive NYCPing insider voice:
 * - Local wisdom over generic descriptions
 * - Actionable tips and timing
 * - "Ah-ha" moments that make users feel smarter
 *
 * Falls back to template-based generation when AI API is unavailable.
 *
 * @see docs/plans/2026-01-02-city-pulse-design.md for voice guidelines
 */

import { CityPulseEvent } from "./email-templates-v2";

/**
 * Voice guidelines for the NYCPing insider style
 */
const VOICE_GUIDELINES = `
You are writing for NYCPing, a platform for savvy New Yorkers who want insider knowledge about their city.

VOICE CHARACTERISTICS:
- Confident, knowing tone (like a well-connected local friend)
- Direct and actionable (skip the intro, get to the value)
- Time-sensitive awareness ("signup opens tomorrow", "last weekend")
- Local secrets and tips that make readers feel smarter
- Never tourist-y or generic

NOT THIS (generic):
"Rockefeller Center Christmas Tree Lighting - November 29, 2025"

THIS (insider):
"Rockefeller tree lights up Nov 29. Skip the crowds - the tree stays lit through Jan. Best viewing: weekday 6am, empty plaza, coffee from Joe's across the street."

NOT THIS:
"Free MoMA admission on Fridays"

THIS:
"MoMA is secretly free every Friday 5:30-9pm. Go at 7, most tourists have left, grab a martini at Terrace 5 after."
`;

/**
 * Generate an editor's note for the weekly digest
 *
 * @param events - All events for the week
 * @param actionRequired - Events with deadlines this week
 * @returns A single sentence capturing the week's vibe
 */
export async function generateEditorNote(
  events: CityPulseEvent[],
  actionRequired: CityPulseEvent[]
): Promise<string> {
  // Check if AI API is configured
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      return await generateWithAI("editor_note", { events, actionRequired });
    } catch (error) {
      console.warn("[AI Copy] Falling back to templates:", error);
    }
  }

  // Template-based fallback
  return generateEditorNoteFromTemplates(events, actionRequired);
}

/**
 * Generate insider copy for an event
 *
 * @param event - The event to describe
 * @param existingContext - Any existing insider context (e.g., from evergreen events)
 * @returns Insider-style description
 */
export async function generateEventCopy(
  event: CityPulseEvent,
  existingContext?: string
): Promise<string> {
  // If we already have insider context, use it
  if (existingContext) {
    return existingContext;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      return await generateWithAI("event_copy", { event });
    } catch (error) {
      console.warn("[AI Copy] Falling back to templates:", error);
    }
  }

  // Template-based fallback
  return generateEventCopyFromTemplates(event);
}

/**
 * Generate AI copy using Anthropic Claude API
 */
async function generateWithAI(
  type: "editor_note" | "event_copy",
  context: Record<string, unknown>
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  let prompt: string;

  if (type === "editor_note") {
    const { events, actionRequired } = context as {
      events: CityPulseEvent[];
      actionRequired: CityPulseEvent[];
    };

    const categoryBreakdown = getCategoryBreakdown(events);

    prompt = `${VOICE_GUIDELINES}

Generate a single sentence (max 100 characters) that captures the vibe of this week in NYC.

This week has:
- ${events.length} total events
- ${actionRequired.length} with deadlines
- Categories: ${Object.entries(categoryBreakdown).map(([cat, count]) => `${cat} (${count})`).join(", ")}

Examples of good editor notes:
- "Big week for culture lovers. Museum shows, performances, and a few surprises."
- "Quiet week — perfect for catching up on those museum shows before the crowds hit."
- "Sports fans, clear your calendar. Multiple big games and the playoffs are heating up."
- "Multiple signups and deadlines this week. We've highlighted the ones you shouldn't miss."

Write ONE sentence only:`;
  } else {
    const { event } = context as { event: CityPulseEvent };

    prompt = `${VOICE_GUIDELINES}

Write a one-sentence insider description for this event:

Event: ${event.title}
Category: ${event.category}
${event.venue ? `Venue: ${event.venue}` : ""}
${event.neighborhood ? `Neighborhood: ${event.neighborhood}` : ""}
${event.startsAt ? `Date: ${event.startsAt.toLocaleDateString()}` : ""}
${event.deadlineAt ? `Deadline: ${event.deadlineAt.toLocaleDateString()}` : ""}

Write ONE sentence (max 100 characters) with local insight:`;
  }

  // Use fetch to call Anthropic API directly
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text?.trim();

  if (!content) {
    throw new Error("Empty response from Anthropic API");
  }

  return content;
}

/**
 * Template-based editor note generation (fallback)
 * Revised for specificity and clarity
 */
function generateEditorNoteFromTemplates(
  events: CityPulseEvent[],
  actionRequired: CityPulseEvent[]
): string {
  const breakdown = getCategoryBreakdown(events);

  // Pick the best template based on the week's content
  if (actionRequired.length >= 3) {
    return `${actionRequired.length} deadlines this week; review the Action Required section.`;
  }

  if (breakdown.culture > 5) {
    return `${breakdown.culture} cultural events this week; book tickets by Thursday.`;
  }

  if (breakdown.sports > 3) {
    return `${breakdown.sports} major games; expect transit delays near stadiums.`;
  }

  if (breakdown.food > 3) {
    return `${breakdown.food} dining events; reservations open this week.`;
  }

  if (events.length < 10) {
    return "Light week; good time to clear your calendar.";
  }

  if (events.length > 30) {
    return `${events.length} events this week; priorities highlighted below.`;
  }

  return `${events.length} events this week. Review what matters.`;
}

/**
 * Template-based event copy generation (fallback)
 * Revised for specificity and actionable value
 */
function generateEventCopyFromTemplates(event: CityPulseEvent): string {
  const templates: Record<string, string[]> = {
    culture: [
      "Opens Tuesday; weekday mornings are quietest.",
      "Limited run—book by Friday for opening week.",
      "Member preview Thursday; public opens Friday.",
    ],
    sports: [
      "Postseason starts; expect crowds near stadium.",
      "Rivalry game; subway delays likely after 9 PM.",
      "Weekday matinee; best availability for singles.",
    ],
    food: [
      "Reservations open 30 days out; book at midnight.",
      "Walk-ins accepted after 9 PM on weeknights.",
      "Soft opening; full menu launches next week.",
    ],
    civic: [
      "Application closes Friday; decisions in 6 weeks.",
      "Public comment period ends Thursday.",
      "Eligibility expanded; reapply if denied previously.",
    ],
    seasonal: [
      "Peak bloom expected next week; go early.",
      "Last weekend for ice skating at this location.",
      "Holiday markets open; weekdays avoid crowds.",
    ],
    local: [
      "Community board meets Tuesday; agenda online.",
      "Street closure Saturday 8 AM–4 PM.",
      "New route affects this neighborhood starting Monday.",
    ],
    transit: [
      "Weekend service changes; allow extra 20 minutes.",
      "Express running local; check platform signs.",
      "Station closure; use nearby transfer.",
    ],
    weather: [
      "Accumulation expected; ASP may suspend.",
      "High wind advisory; outdoor events may cancel.",
      "Heat index over 100; cooling centers open.",
    ],
  };

  const categoryTemplates = templates[event.category] || templates.local;

  // Select based on event characteristics for consistency
  let index = 0;
  if (event.deadlineAt) index = 0;
  else if (event.venue?.includes("weekend")) index = 1;
  else if (event.isActionRequired) index = 2;
  else index = Math.floor(Math.random() * categoryTemplates.length);

  return categoryTemplates[index];
}

/**
 * Get category breakdown for events
 */
function getCategoryBreakdown(events: CityPulseEvent[]): Record<string, number> {
  const breakdown: Record<string, number> = {};

  for (const event of events) {
    breakdown[event.category] = (breakdown[event.category] || 0) + 1;
  }

  return breakdown;
}

/**
 * Batch generate insider copy for multiple events
 * Useful for initial seeding or refreshing event descriptions
 */
export async function batchGenerateEventCopy(
  events: CityPulseEvent[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const event of events) {
    try {
      const copy = await generateEventCopy(event);
      results.set(event.id, copy);
    } catch (error) {
      console.error(`[AI Copy] Failed to generate copy for ${event.id}:`, error);
      results.set(event.id, generateEventCopyFromTemplates(event));
    }
  }

  return results;
}

export default {
  generateEditorNote,
  generateEventCopy,
  batchGenerateEventCopy,
};
