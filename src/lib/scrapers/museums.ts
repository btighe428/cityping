// src/lib/scrapers/museums.ts
/**
 * Free Museum Days - Config-Driven Service
 *
 * Unlike other scrapers, museum free days are mostly static and predictable.
 * This module provides a config-driven approach to track free admission days
 * at major NYC museums.
 *
 * Sources:
 * - MoMA: Free Fridays 5:30-9pm
 * - Met: Pay what you wish (always)
 * - Brooklyn Museum: Free 1st Saturdays
 * - Bronx Zoo: Free Wednesdays
 * - AMNH: Pay what you wish (always)
 * - Guggenheim: Pay what you wish Saturdays 5-8pm
 */

import { prisma } from "../db";
import { z } from "zod";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const MuseumFreeDaySchema = z.object({
  museum: z.string(),
  dayOfWeek: z.number().min(0).max(6), // 0=Sun, 6=Sat
  weekOfMonth: z.number().min(1).max(5).nullable(), // 1-5, null = every week
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  notes: z.string().nullable(),
  address: z.string().nullable(),
  url: z.string().nullable(),
});

export type MuseumFreeDayConfig = z.infer<typeof MuseumFreeDaySchema>;

export interface TodaysFreeMuseum {
  museum: string;
  hours: string;
  notes: string | null;
  address: string | null;
  url: string | null;
}

// ============================================================================
// STATIC CONFIG - NYC Museum Free Days
// ============================================================================

export const NYC_MUSEUM_FREE_DAYS: MuseumFreeDayConfig[] = [
  // MoMA - Free Fridays 5:30-9pm
  {
    museum: "MoMA (Museum of Modern Art)",
    dayOfWeek: 5, // Friday
    weekOfMonth: null, // Every week
    startTime: "17:30",
    endTime: "21:00",
    notes: "Free admission",
    address: "11 W 53rd St, Manhattan",
    url: "https://www.moma.org/visit",
  },
  // Met - Pay what you wish (always, but highlight weekends)
  {
    museum: "The Metropolitan Museum of Art",
    dayOfWeek: 0, // Sunday (highlight day)
    weekOfMonth: null,
    startTime: "10:00",
    endTime: "17:00",
    notes: "Pay what you wish for NY residents",
    address: "1000 5th Ave, Manhattan",
    url: "https://www.metmuseum.org/visit",
  },
  // Brooklyn Museum - Free 1st Saturdays
  {
    museum: "Brooklyn Museum",
    dayOfWeek: 6, // Saturday
    weekOfMonth: 1, // First Saturday only
    startTime: "17:00",
    endTime: "23:00",
    notes: "Free admission + special programming",
    address: "200 Eastern Pkwy, Brooklyn",
    url: "https://www.brooklynmuseum.org/visit/first_saturdays",
  },
  // Bronx Zoo - Free Wednesdays
  {
    museum: "Bronx Zoo",
    dayOfWeek: 3, // Wednesday
    weekOfMonth: null,
    startTime: "10:00",
    endTime: "17:00",
    notes: "Pay what you wish",
    address: "2300 Southern Blvd, Bronx",
    url: "https://bronxzoo.com/plan-your-visit",
  },
  // AMNH - Pay what you wish (always)
  {
    museum: "American Museum of Natural History",
    dayOfWeek: 0, // Sunday (highlight day)
    weekOfMonth: null,
    startTime: "10:00",
    endTime: "17:45",
    notes: "Pay what you wish for NY/NJ/CT residents",
    address: "200 Central Park West, Manhattan",
    url: "https://www.amnh.org/plan-your-visit",
  },
  // Guggenheim - Pay what you wish Saturdays 5-8pm
  {
    museum: "Solomon R. Guggenheim Museum",
    dayOfWeek: 6, // Saturday
    weekOfMonth: null,
    startTime: "17:00",
    endTime: "20:00",
    notes: "Pay what you wish",
    address: "1071 5th Ave, Manhattan",
    url: "https://www.guggenheim.org/plan-your-visit",
  },
  // New Museum - Pay what you wish Thursdays 7-9pm
  {
    museum: "New Museum",
    dayOfWeek: 4, // Thursday
    weekOfMonth: null,
    startTime: "19:00",
    endTime: "21:00",
    notes: "Pay what you wish",
    address: "235 Bowery, Manhattan",
    url: "https://www.newmuseum.org/visit",
  },
  // Whitney - Pay what you wish Fridays 7-10pm
  {
    museum: "Whitney Museum of American Art",
    dayOfWeek: 5, // Friday
    weekOfMonth: null,
    startTime: "19:00",
    endTime: "22:00",
    notes: "Pay what you wish",
    address: "99 Gansevoort St, Manhattan",
    url: "https://whitney.org/visit",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if today is the Nth week of the month
 */
function getWeekOfMonth(date: Date): number {
  const day = date.getDate();
  return Math.ceil(day / 7);
}

/**
 * Format time range for display
 */
function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return "All day";

  const formatTime = (t: string) => {
    const [hours, minutes] = t.split(":").map(Number);
    const ampm = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;
    return minutes === 0 ? `${displayHours}${ampm}` : `${displayHours}:${minutes.toString().padStart(2, "0")}${ampm}`;
  };

  if (!end) return `Starting ${formatTime(start)}`;
  return `${formatTime(start)}-${formatTime(end)}`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get museums that are free today
 */
export function getFreeMueumsToday(date: Date = new Date()): TodaysFreeMuseum[] {
  const dayOfWeek = date.getDay();
  const weekOfMonth = getWeekOfMonth(date);

  const freeToday = NYC_MUSEUM_FREE_DAYS.filter((m) => {
    // Must match day of week
    if (m.dayOfWeek !== dayOfWeek) return false;

    // If weekOfMonth is set, must match
    if (m.weekOfMonth !== null && m.weekOfMonth !== weekOfMonth) return false;

    return true;
  });

  return freeToday.map((m) => ({
    museum: m.museum,
    hours: formatTimeRange(m.startTime, m.endTime),
    notes: m.notes,
    address: m.address,
    url: m.url,
  }));
}

/**
 * Seed database with museum free days (run once or on config update)
 */
export async function seedMuseumFreeDays(): Promise<number> {
  console.log("[Museums] Seeding museum free days...");

  let upserted = 0;

  for (const config of NYC_MUSEUM_FREE_DAYS) {
    // Find existing record
    const existing = await prisma.museumFreeDay.findFirst({
      where: {
        museum: config.museum,
        dayOfWeek: config.dayOfWeek,
        weekOfMonth: config.weekOfMonth ?? null,
      },
    });

    if (existing) {
      // Update existing
      await prisma.museumFreeDay.update({
        where: { id: existing.id },
        data: {
          startTime: config.startTime,
          endTime: config.endTime,
          notes: config.notes,
          address: config.address,
          url: config.url,
          isActive: true,
        },
      });
    } else {
      // Create new
      await prisma.museumFreeDay.create({
        data: {
          museum: config.museum,
          dayOfWeek: config.dayOfWeek,
          weekOfMonth: config.weekOfMonth,
          startTime: config.startTime,
          endTime: config.endTime,
          notes: config.notes,
          address: config.address,
          url: config.url,
          isActive: true,
        },
      });
    }
    upserted++;
  }

  console.log(`[Museums] Seeded ${upserted} museum free days`);
  return upserted;
}

/**
 * Get free museums from database for a specific date
 */
export async function getFreeMuseumsForDate(date: Date = new Date()): Promise<TodaysFreeMuseum[]> {
  const dayOfWeek = date.getDay();
  const weekOfMonth = getWeekOfMonth(date);

  const museums = await prisma.museumFreeDay.findMany({
    where: {
      isActive: true,
      dayOfWeek: dayOfWeek,
      OR: [
        { weekOfMonth: null }, // Every week
        { weekOfMonth: weekOfMonth }, // Specific week
      ],
    },
  });

  return museums.map((m) => ({
    museum: m.museum,
    hours: formatTimeRange(m.startTime, m.endTime),
    notes: m.notes,
    address: m.address,
    url: m.url,
  }));
}
