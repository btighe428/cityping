/**
 * Subject Line Nano App Generator
 *
 * Creates information-dense email subject lines that pack 5 scannable bites
 * into a single line. Designed for maximum "inbox glanceability."
 *
 * Format: NYC TODAY [Day, Date] [Weather Emoji] [Temp] [Condition] [Category Emoji] [Alert]: [Specifics]
 *
 * The 5 Bites:
 * 1. TEMPORAL ANCHOR - Day + Date (Friday, Jan 23)
 * 2. WEATHER BITE - Emoji + Temp + Condition (☀️ 34°F sunny)
 * 3. CATEGORY SIGNAL - Emoji indicator (🏠 🚇 🎭 💰 🎪)
 * 4. ALERT HOOK - What's happening (New Lottery, Service Change, Free Event)
 * 5. SPECIFICS - Numbers, location, deadline (709 units, East Harlem, Jan 30)
 *
 * Design Philosophy (Tufte-inspired):
 * - Every character must earn its place
 * - Emojis as visual anchors, not decoration
 * - Numbers > adjectives (709 units, not "lots of units")
 * - Deadlines create urgency
 * - Location grounds the reader
 */

import Anthropic from "@anthropic-ai/sdk";
import { DateTime } from "luxon";
import type { ContentSelection } from "./data-quality-agent";

// =============================================================================
// TYPES
// =============================================================================

export interface WeatherData {
  temp: number;
  condition: string;
  emoji: string;
}

export interface SubjectLineBite {
  category: "housing" | "transit" | "events" | "deals" | "news" | "weather" | "parks";
  emoji: string;
  hook: string;
  specifics: string;
  priority: number; // 1-10, higher = more important
}

export interface NanoAppSubject {
  full: string;          // Complete subject line
  preheader: string;     // Email preview text (extends the story)
  bites: SubjectLineBite[];
  characterCount: number;
}

// =============================================================================
// CATEGORY EMOJIS - Visual anchors for instant recognition
// =============================================================================

const CATEGORY_EMOJI: Record<string, string> = {
  housing: "🏠",
  transit: "🚇",
  events: "🎭",
  deals: "💰",
  news: "📰",
  weather_alert: "⚠️",
  parks: "🌳",
  food: "🍽️",
  museum: "🏛️",
  sale: "🛍️",
  deadline: "⏰",
  free: "🆓",
  new: "✨",
};

const WEATHER_EMOJI: Record<string, string> = {
  clear: "☀️",
  sunny: "☀️",
  "partly cloudy": "⛅",
  cloudy: "☁️",
  overcast: "☁️",
  rain: "🌧️",
  drizzle: "🌧️",
  snow: "❄️",
  thunderstorm: "⛈️",
  fog: "🌫️",
  mist: "🌫️",
  wind: "💨",
  cold: "🥶",
  hot: "🥵",
};

// =============================================================================
// CLAUDE CLIENT
// =============================================================================

const anthropic = new Anthropic();

const NANO_APP_SYSTEM_PROMPT = `You are a subject line engineer creating "nano apps" - information-dense email subject lines that pack 5 scannable bites into ~100 characters.

FORMAT: NYC TODAY [Day, Mon D] [WeatherEmoji] [Temp]°F [condition] [CategoryEmoji] [Hook]: [Specifics]

THE 5 BITES (all required):
1. TEMPORAL: Day + Date (Thu, Jan 23)
2. WEATHER: Emoji + Temp + 1-word condition (☀️ 34°F sunny)
3. CATEGORY: Single emoji signal (🏠 🚇 🎭 💰)
4. HOOK: 2-3 word alert type (New Lottery, Service Change)
5. SPECIFICS: Numbers + Location + Deadline (709 units East Harlem. Jan 30)

RULES:
- Max 120 characters for subject, but aim for ~100
- Numbers ALWAYS beat adjectives (709 units, not "many units")
- Include deadline if exists (Jan 30, not "soon")
- Include price if relevant ($900, not "affordable")
- Location grounds the reader (East Harlem, not "Manhattan")
- One sentence max for specifics
- NO quotes, NO "breaking:", NO clickbait

GOOD EXAMPLES:
"NYC TODAY Thu, Jan 23 ☀️ 34°F sunny 🏠 Housing Lottery: Sendero Verde 709 units East Harlem. 1BR $900. Jan 30"
"NYC TODAY Fri, Jan 24 🌧️ 41°F rain 🚇 A/C/E delays: Signal problems 34th St. Use 1/2/3. ~20min delays"
"NYC TODAY Sat, Jan 25 ⛅ 38°F cloudy 🎭 Free Event: MoMA free entry 4-8pm. Kusama exhibit ends Feb 1"
"NYC TODAY Sun, Jan 26 ❄️ 28°F snow 💰 Sample Sale: Rag & Bone 70% off SoHo. Today only"

BAD EXAMPLES:
"NYC Today: Check out this amazing housing opportunity!" (vague, no specifics)
"Breaking: MTA Alert" (no details, clickbait)
"Weather is nice today" (no numbers, wastes space)`;

// =============================================================================
// BITE EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract the most newsworthy bite from housing data
 */
function extractHousingBite(selection: ContentSelection): SubjectLineBite | null {
  // Housing data would come from AlertEvents with housing module
  // For now, check if there's housing-related news
  const housingNews = selection.news.find(n =>
    n.title.toLowerCase().includes("housing") ||
    n.title.toLowerCase().includes("lottery") ||
    n.title.toLowerCase().includes("affordable") ||
    n.title.toLowerCase().includes("rent")
  );

  if (housingNews) {
    return {
      category: "housing",
      emoji: CATEGORY_EMOJI.housing,
      hook: housingNews.title.includes("lottery") ? "New Lottery" : "Housing",
      specifics: housingNews.title.slice(0, 60),
      priority: 8,
    };
  }

  return null;
}

/**
 * Extract transit bite from MTA alerts
 */
function extractTransitBite(selection: ContentSelection): SubjectLineBite | null {
  if (selection.alerts.length === 0) return null;

  const topAlert = selection.alerts[0];
  // Extract line info from title (e.g., "A/C delays due to...")
  const lineMatch = topAlert.title.match(/^([A-Z0-9/]+)/i);
  const linesStr = lineMatch ? lineMatch[1] : "";

  return {
    category: "transit",
    emoji: CATEGORY_EMOJI.transit,
    hook: linesStr ? `${linesStr} delays` : "Service Alert",
    specifics: topAlert.title?.slice(0, 50) || "Check MTA for details",
    priority: topAlert.score > 80 ? 9 : 6,
  };
}

/**
 * Extract events bite
 */
function extractEventsBite(selection: ContentSelection): SubjectLineBite | null {
  if (selection.events.length === 0) return null;

  const topEvent = selection.events[0];

  return {
    category: "events",
    emoji: CATEGORY_EMOJI.free, // Assume park events are free
    hook: "Free Event",
    specifics: topEvent.name.slice(0, 60),
    priority: 7,
  };
}

/**
 * Extract deals bite from sample sales or dining
 */
function extractDealsBite(selection: ContentSelection): SubjectLineBite | null {
  if (selection.dining.length === 0) return null;

  const topDeal = selection.dining[0];

  return {
    category: "deals",
    emoji: CATEGORY_EMOJI.deals,
    hook: "Deal",
    specifics: topDeal.brand.slice(0, 60),
    priority: 5,
  };
}

/**
 * Extract top news bite
 */
function extractNewsBite(selection: ContentSelection): SubjectLineBite | null {
  if (selection.news.length === 0) return null;

  const topNews = selection.news[0];

  return {
    category: "news",
    emoji: CATEGORY_EMOJI.news,
    hook: "Top Story",
    specifics: topNews.title.slice(0, 60),
    priority: topNews.score > 85 ? 8 : 6,
  };
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

/**
 * Generate a nano-app subject line with 5 information bites.
 */
export async function generateNanoAppSubject(
  selection: ContentSelection,
  weather: WeatherData
): Promise<NanoAppSubject> {
  const now = DateTime.now().setZone("America/New_York");
  const dayDate = now.toFormat("EEE, LLL d"); // "Thu, Jan 23"

  // Get weather emoji
  const weatherEmoji = WEATHER_EMOJI[weather.condition.toLowerCase()] || "🌤️";
  const weatherBite = `${weatherEmoji} ${weather.temp}°F ${weather.condition.split(" ")[0].toLowerCase()}`;

  // Extract all possible bites
  const allBites: SubjectLineBite[] = [
    extractHousingBite(selection),
    extractTransitBite(selection),
    extractEventsBite(selection),
    extractDealsBite(selection),
    extractNewsBite(selection),
  ].filter((b): b is SubjectLineBite => b !== null);

  // Sort by priority and take the top one for the subject
  allBites.sort((a, b) => b.priority - a.priority);
  const topBite = allBites[0];

  if (!topBite) {
    // Fallback if no content
    const fallbackSubject = `NYC TODAY ${dayDate} ${weatherBite} 📰 Your daily NYC briefing`;
    return {
      full: fallbackSubject,
      preheader: "Check what's happening in your city today",
      bites: [],
      characterCount: fallbackSubject.length,
    };
  }

  // Build context for Claude to generate optimal subject
  const context = {
    dayDate,
    weather: weatherBite,
    topBite,
    allBites: allBites.slice(0, 3),
    newsHeadlines: selection.news.slice(0, 3).map(n => n.title),
    alertCount: selection.alerts.length,
  };

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 200,
      system: NANO_APP_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Generate a nano-app subject line using this data:

Day/Date: ${dayDate}
Weather: ${weatherBite}
Top Category: ${topBite.category}
Top Hook: ${topBite.hook}
Top Specifics: ${topBite.specifics}

Other available bites:
${allBites.slice(1, 3).map(b => `- ${b.emoji} ${b.hook}: ${b.specifics}`).join("\n")}

Top news headlines:
${context.newsHeadlines.join("\n")}

Return ONLY the subject line, nothing else. Max 120 chars.`,
      }],
    });

    const generatedSubject = response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "";

    // Ensure it starts with NYC TODAY
    const finalSubject = generatedSubject.startsWith("NYC TODAY")
      ? generatedSubject
      : `NYC TODAY ${dayDate} ${weatherBite} ${topBite.emoji} ${topBite.hook}: ${topBite.specifics}`;

    // Generate preheader (extends the subject)
    const preheader = allBites.length > 1
      ? `Also: ${allBites[1].emoji} ${allBites[1].hook} • ${allBites.slice(2).map(b => b.emoji).join(" ")}`
      : "Your daily NYC briefing";

    return {
      full: finalSubject.slice(0, 150), // Hard cap
      preheader,
      bites: allBites,
      characterCount: finalSubject.length,
    };

  } catch (error) {
    console.error("[NanoApp] LLM generation failed:", error);

    // Fallback to template-based generation
    const fallbackSubject = `NYC TODAY ${dayDate} ${weatherBite} ${topBite.emoji} ${topBite.hook}: ${topBite.specifics}`;

    return {
      full: fallbackSubject.slice(0, 150),
      preheader: "Your daily NYC briefing",
      bites: allBites,
      characterCount: fallbackSubject.length,
    };
  }
}

/**
 * Generate subject line with explicit weather data fetch.
 * This is the main entry point.
 */
export async function generateSubjectWithWeather(
  selection: ContentSelection,
  weatherOverride?: WeatherData
): Promise<NanoAppSubject> {
  // Use provided weather or fetch from weather API
  let weather = weatherOverride;

  if (!weather) {
    // Default to typical NYC weather if not provided
    // In production, this would call the weather API
    weather = {
      temp: 34,
      condition: "Partly cloudy",
      emoji: "⛅",
    };
  }

  return generateNanoAppSubject(selection, weather);
}

/**
 * Quick template-based subject line (no LLM, faster).
 */
export function generateTemplateSubject(
  weather: WeatherData,
  topItem: { category: string; hook: string; specifics: string }
): string {
  const now = DateTime.now().setZone("America/New_York");
  const dayDate = now.toFormat("EEE, LLL d");
  const weatherEmoji = WEATHER_EMOJI[weather.condition.toLowerCase()] || "🌤️";
  const categoryEmoji = CATEGORY_EMOJI[topItem.category] || "📰";

  return `NYC TODAY ${dayDate} ${weatherEmoji} ${weather.temp}°F ${weather.condition.split(" ")[0].toLowerCase()} ${categoryEmoji} ${topItem.hook}: ${topItem.specifics}`.slice(0, 150);
}
