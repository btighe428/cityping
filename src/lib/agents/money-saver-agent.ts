// src/lib/agents/money-saver-agent.ts
/**
 * MONEY SAVER AGENT
 *
 * Pure data aggregation - no LLM, $0 cost.
 * Combines dining deals and free events
 * into a money-saving digest section.
 */

import { DateTime } from "luxon";
import { prisma } from "../db";
import { getEventsInRange } from "../../config/nyc-knowledge";

// =============================================================================
// TYPES
// =============================================================================

export interface MoneySaverItem {
  title: string;
  category: string;
  detail?: string;
  url?: string;
  icon: string;
}

export interface MoneySaverResult {
  diningDeals: { count: number; topItems: MoneySaverItem[] };
  freeEvents: { count: number; topItems: MoneySaverItem[] };
  totalSavings: number; // total active deals/events
  generatedAt: string;
}

// =============================================================================
// MAIN
// =============================================================================

export async function aggregateMoneySavers(
  today?: DateTime
): Promise<MoneySaverResult> {
  const now = today || DateTime.now().setZone("America/New_York");
  const todayDate = now.toJSDate();
  const weekAhead = now.plus({ days: 7 }).toJSDate();

  // Fetch all data in parallel
  const [diningDeals, freeDbEvents] = await Promise.all([
    fetchDiningDeals(todayDate),
    fetchFreeEvents(todayDate, weekAhead),
  ]);

  // Get free events from knowledge base
  const kbFreeEvents = getEventsInRange(now, now.plus({ days: 7 }), {
    includePremium: false,
  }).filter(e => !e.event.premium);

  const freeKbItems: MoneySaverItem[] = kbFreeEvents.slice(0, 5).map(e => ({
    title: e.event.shortTitle,
    category: "free_event",
    detail: e.date.toFormat("EEE, MMM d"),
    icon: e.event.icon,
  }));

  // Merge free events from DB and KB
  const allFreeItems = [...freeDbEvents, ...freeKbItems];
  const uniqueFree = dedup(allFreeItems).slice(0, 5);

  const totalSavings = diningDeals.length + allFreeItems.length;

  return {
    diningDeals: {
      count: diningDeals.length,
      topItems: diningDeals.slice(0, 3),
    },
    freeEvents: {
      count: allFreeItems.length,
      topItems: uniqueFree.slice(0, 3),
    },
    totalSavings,
    generatedAt: now.toISO()!,
  };
}

// =============================================================================
// DATA FETCHERS
// =============================================================================

async function fetchDiningDeals(today: Date): Promise<MoneySaverItem[]> {
  try {
    const deals = await prisma.diningDeal.findMany({
      where: {
        OR: [
          { endDate: { gte: today } },
          { endDate: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { restaurant: true, title: true, neighborhood: true, url: true, dealType: true },
    });

    return deals.map(d => ({
      title: `${d.restaurant}: ${d.title}`,
      category: "dining_deal",
      detail: d.neighborhood || d.dealType,
      url: d.url,
      icon: "🍽️",
    }));
  } catch {
    return [];
  }
}

async function fetchFreeEvents(today: Date, weekAhead: Date): Promise<MoneySaverItem[]> {
  try {
    // CityEvent doesn't have isFree - use tags or insiderScore as proxy
    const events = await prisma.cityEvent.findMany({
      where: {
        startsAt: { gte: today, lte: weekAhead },
        status: "published",
        tags: { has: "free" },
      },
      orderBy: { startsAt: "asc" },
      take: 10,
      select: { title: true, venue: true, startsAt: true, category: true },
    });

    // Also get free park events
    const parkEvents = await prisma.parkEvent.findMany({
      where: {
        date: { gte: today, lte: weekAhead },
        isFree: true,
      },
      orderBy: { date: "asc" },
      take: 10,
      select: { name: true, parkName: true, date: true },
    });

    const cityItems = events.map(e => ({
      title: e.title,
      category: "free_event",
      detail: e.venue || (e.startsAt ? DateTime.fromJSDate(e.startsAt).toFormat("EEE, MMM d") : undefined),
      icon: "🎟️",
    }));

    const parkItems = parkEvents.map(e => ({
      title: e.name,
      category: "free_event",
      detail: e.parkName || DateTime.fromJSDate(e.date).toFormat("EEE, MMM d"),
      icon: "🌳",
    }));

    return [...cityItems, ...parkItems];
  } catch {
    return [];
  }
}

function dedup(items: MoneySaverItem[]): MoneySaverItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
