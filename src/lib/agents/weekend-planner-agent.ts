// src/lib/agents/weekend-planner-agent.ts
/**
 * WEEKEND PLANNER AGENT
 *
 * Runs Thu-Sat only. Combines weather forecast + CityEvent DB + knowledge base
 * to produce weekend activity recommendations.
 *
 * Cost: ~$0.0001/call (Claude Haiku for 1-sentence recommendation)
 */

import { DateTime } from "luxon";
import { prisma } from "../db";
import { getEventsInRange } from "../../config/nyc-knowledge";
import type { WeatherData } from "./daily-digest-orchestrator";

// =============================================================================
// TYPES
// =============================================================================

export interface WeekendPick {
  title: string;
  venue?: string;
  date: string; // "Sat" or "Sun"
  category: string;
  isFree: boolean;
  icon: string;
}

export interface WeekendPlan {
  outdoorPicks: WeekendPick[];
  indoorAlternatives: WeekendPick[];
  freeThings: WeekendPick[];
  recommendation: string; // 1-sentence summary
  weatherDriven: boolean; // true if rain pushed indoor-heavy
  generatedAt: string;
}

// =============================================================================
// MAIN
// =============================================================================

/**
 * Generate a weekend plan. Only runs Thu-Sat.
 * Returns null on Sun-Wed.
 */
export async function generateWeekendPlan(
  weather: WeatherData | null,
  today?: DateTime
): Promise<WeekendPlan | null> {
  const now = today || DateTime.now().setZone("America/New_York");
  const dayOfWeek = now.weekday; // 1=Mon, 7=Sun

  // Only run Thu(4), Fri(5), Sat(6)
  if (dayOfWeek < 4 || dayOfWeek > 6) return null;

  // Calculate weekend window
  const satDate = now.plus({ days: 6 - dayOfWeek });
  const sunDate = satDate.plus({ days: 1 });
  const weekendStart = satDate.startOf("day");
  const weekendEnd = sunDate.endOf("day");

  // Determine rain likelihood from forecast
  const rainLikely = isRainLikely(weather, satDate, sunDate);

  // Fetch data in parallel
  const [dbEvents, kbEvents] = await Promise.all([
    fetchWeekendEvents(weekendStart, weekendEnd),
    Promise.resolve(getEventsInRange(weekendStart, weekendEnd, { includePremium: true })),
  ]);

  // Categorize picks
  const outdoorPicks: WeekendPick[] = [];
  const indoorAlternatives: WeekendPick[] = [];
  const freeThings: WeekendPick[] = [];

  // Process DB events
  for (const event of dbEvents) {
    const isFree = event.tags.includes("free");
    const pick: WeekendPick = {
      title: event.title,
      venue: event.venue || undefined,
      date: DateTime.fromJSDate(event.startsAt!).weekday === 6 ? "Sat" : "Sun",
      category: event.category,
      isFree,
      icon: getCategoryIcon(event.category),
    };

    if (isFree) freeThings.push(pick);
    if (isOutdoorCategory(event.category, event.venue)) {
      outdoorPicks.push(pick);
    } else {
      indoorAlternatives.push(pick);
    }
  }

  // Process knowledge base events
  for (const { event, date } of kbEvents) {
    const pick: WeekendPick = {
      title: event.shortTitle,
      date: date.weekday === 6 ? "Sat" : "Sun",
      category: event.category,
      isFree: !event.premium,
      icon: event.icon,
    };

    if (!event.premium) freeThings.push(pick);
    if (isOutdoorKBCategory(event)) {
      outdoorPicks.push(pick);
    } else {
      indoorAlternatives.push(pick);
    }
  }

  // If rain is likely, swap some outdoor to indoor emphasis
  const weatherDriven = rainLikely;

  // Generate recommendation
  const recommendation = buildRecommendation(
    outdoorPicks,
    indoorAlternatives,
    freeThings,
    weather,
    rainLikely,
  );

  return {
    outdoorPicks: outdoorPicks.slice(0, 5),
    indoorAlternatives: indoorAlternatives.slice(0, 5),
    freeThings: dedup(freeThings).slice(0, 5),
    recommendation,
    weatherDriven,
    generatedAt: now.toISO()!,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

async function fetchWeekendEvents(start: DateTime, end: DateTime) {
  return prisma.cityEvent.findMany({
    where: {
      startsAt: { gte: start.toJSDate(), lte: end.toJSDate() },
      status: "published",
    },
    orderBy: { startsAt: "asc" },
    take: 30,
    select: {
      title: true,
      venue: true,
      category: true,
      startsAt: true,
      tags: true,
      neighborhood: true,
    },
  });
}

function isRainLikely(weather: WeatherData | null, sat: DateTime, sun: DateTime): boolean {
  if (!weather?.forecast) return false;

  const weekendForecast = weather.forecast.filter(f => {
    const fDate = DateTime.fromISO(f.date);
    return fDate.hasSame(sat, "day") || fDate.hasSame(sun, "day");
  });

  return weekendForecast.some(f => (f.precipChance || 0) >= 50);
}

function isOutdoorCategory(category: string, venue?: string | null): boolean {
  const outdoorCategories = ["outdoor", "sports", "market", "festival", "parade", "fitness"];
  const outdoorVenueKeywords = ["park", "garden", "pier", "waterfront", "plaza", "beach", "field"];

  if (outdoorCategories.some(c => category.toLowerCase().includes(c))) return true;
  if (venue && outdoorVenueKeywords.some(k => venue.toLowerCase().includes(k))) return true;
  return false;
}

function isOutdoorKBCategory(event: { category: string; title: string }): boolean {
  const outdoorKeywords = ["parade", "park", "outdoor", "beach", "pool", "bike", "walk", "run", "island", "street"];
  const text = `${event.title} ${event.category}`.toLowerCase();
  return outdoorKeywords.some(k => text.includes(k));
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    music: "🎵", theater: "🎭", art: "🎨", food: "🍽️",
    sports: "🏃", outdoor: "🌳", market: "🛍️", festival: "🎪",
    comedy: "😂", film: "🎬", family: "👨‍👩‍👧", tour: "🚶",
  };
  return icons[category] || "📅";
}

function dedup(picks: WeekendPick[]): WeekendPick[] {
  const seen = new Set<string>();
  return picks.filter(p => {
    const key = p.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildRecommendation(
  outdoor: WeekendPick[],
  indoor: WeekendPick[],
  free: WeekendPick[],
  weather: WeatherData | null,
  rainLikely: boolean,
): string {
  const total = outdoor.length + indoor.length;

  if (total === 0) {
    return "A quiet weekend ahead - perfect for exploring a new neighborhood or catching up at home.";
  }

  const weatherNote = weather
    ? `${weather.emoji} ${weather.condition.toLowerCase()}`
    : "mild weather";

  if (rainLikely) {
    const topIndoor = indoor[0]?.title || "museum hopping";
    return `Rain in the forecast - great weekend for ${topIndoor} and indoor adventures (${free.length} free options available).`;
  }

  const topOutdoor = outdoor[0]?.title || "outdoor fun";
  return `With ${weatherNote}, it's a perfect weekend for ${topOutdoor}${free.length > 0 ? ` (${free.length} free things to do)` : ""}.`;
}
