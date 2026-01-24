// src/lib/scrapers/parks-events.ts
/**
 * NYC Parks Events Scraper
 *
 * Fetches free events from NYC Parks Department calendar.
 * Includes fitness classes, nature walks, sports, arts programs, and tours.
 *
 * Source: NYC Parks Events API / Calendar
 * URL: https://www.nycgovparks.org/events
 *
 * Note: NYC Parks doesn't have a public API, so we scrape the JSON feed
 * that powers their event calendar.
 */

import { z } from "zod";
import { prisma } from "../db";
import { sendScraperAlert } from "../scraper-alerts";
import crypto from "crypto";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const ParksEventSchema = z.object({
  id: z.string().or(z.number()).transform(String),
  title: z.string(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  park_name: z.string().optional().nullable(),
  borough: z.string().optional().nullable(),
  start_date: z.string(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  free: z.boolean().or(z.string()).optional(),
  url: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export interface ParkEvent {
  externalId: string;
  name: string;
  description: string | null;
  parkName: string;
  borough: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  category: string | null;
  isFree: boolean;
  url: string | null;
  imageUrl: string | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// NYC Parks events feed (JSON)
const EVENTS_API_URL = "https://www.nycgovparks.org/events/json";

// Alternative: scrape from calendar page
const EVENTS_CALENDAR_URL = "https://www.nycgovparks.org/events";

// Categories to prioritize
const PRIORITY_CATEGORIES = [
  "Fitness",
  "Nature",
  "Sports",
  "Arts & Culture",
  "Tours",
  "Kids",
  "Seniors",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate stable external ID from event data
 */
function generateExternalId(event: { id: string; title: string; start_date: string }): string {
  const input = `${event.id}-${event.title}-${event.start_date}`;
  return crypto.createHash("md5").update(input).digest("hex").substring(0, 16);
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date {
  // Handle various formats: "2026-01-15", "January 15, 2026", etc.
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date(); // Fallback to today
  }
  return date;
}

/**
 * Normalize borough name
 */
function normalizeBorough(borough: string | null | undefined): string | null {
  if (!borough) return null;

  const normalized = borough.toLowerCase().trim();

  if (normalized.includes("manhattan") || normalized === "m") return "Manhattan";
  if (normalized.includes("brooklyn") || normalized === "b") return "Brooklyn";
  if (normalized.includes("queens") || normalized === "q") return "Queens";
  if (normalized.includes("bronx") || normalized === "x") return "Bronx";
  if (normalized.includes("staten") || normalized === "r") return "Staten Island";

  return borough;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Fetch events from NYC Parks
 */
export async function fetchParksEvents(): Promise<ParkEvent[]> {
  console.log("[Parks] Fetching parks events...");

  try {
    // Try JSON API first
    const response = await fetch(EVENTS_API_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CityPing/1.0 (NYC Events Aggregator)",
      },
    });

    if (!response.ok) {
      throw new Error(`Parks API error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");

    // Check if JSON response
    if (!contentType?.includes("application/json")) {
      console.warn("[Parks] Non-JSON response, falling back to scraping");
      return fetchParksEventsFromCalendar();
    }

    const data = await response.json();

    // Handle different response structures
    const events = Array.isArray(data) ? data : data.events || data.data || [];

    if (!Array.isArray(events)) {
      console.warn("[Parks] Unexpected response structure");
      return [];
    }

    console.log(`[Parks] Received ${events.length} raw events`);

    const parsed: ParkEvent[] = [];
    let validationErrors = 0;

    for (const raw of events) {
      const result = ParksEventSchema.safeParse(raw);

      if (!result.success) {
        validationErrors++;
        continue;
      }

      const e = result.data;

      // Filter to free events only
      const isFree = e.free === true || e.free === "true" || e.free === "Yes";

      parsed.push({
        externalId: generateExternalId({ id: e.id, title: e.title, start_date: e.start_date }),
        name: e.title,
        description: e.description || null,
        parkName: e.park_name || e.location || "NYC Park",
        borough: normalizeBorough(e.borough),
        address: e.location || null,
        latitude: e.latitude || null,
        longitude: e.longitude || null,
        date: parseDate(e.start_date),
        startTime: e.start_time || null,
        endTime: e.end_time || null,
        category: e.category || e.subcategory || null,
        isFree,
        url: e.url || `${EVENTS_CALENDAR_URL}/${e.id}`,
        imageUrl: e.image || null,
      });
    }

    if (validationErrors > 0) {
      console.warn(`[Parks] ${validationErrors} events failed validation`);
    }

    // Filter to next 14 days and free events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const filtered = parsed.filter((e) => {
      const eventDate = new Date(e.date);
      return eventDate >= today && eventDate <= twoWeeks && e.isFree;
    });

    console.log(`[Parks] Processed ${filtered.length} upcoming free events`);
    return filtered;
  } catch (error) {
    console.error("[Parks] Fetch error:", error);
    await sendScraperAlert("parks-events", [{
      source: "parks-events",
      payload: { url: EVENTS_API_URL },
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    }]);

    // Return empty array on error (don't throw, allow digest to continue)
    return [];
  }
}

/**
 * Fallback: scrape events from calendar page
 */
async function fetchParksEventsFromCalendar(): Promise<ParkEvent[]> {
  console.log("[Parks] Falling back to calendar scraping...");

  // This is a simplified fallback - in production, use a proper HTML parser
  // For now, return empty array and log for monitoring
  console.warn("[Parks] Calendar scraping not implemented - returning empty");

  return [];
}

/**
 * Sync parks events to database
 */
export async function syncParksEvents(): Promise<{
  created: number;
  updated: number;
  total: number;
}> {
  const events = await fetchParksEvents();

  let created = 0;
  let updated = 0;

  for (const event of events) {
    const existing = await prisma.parkEvent.findUnique({
      where: { externalId: event.externalId },
    });

    if (existing) {
      // Update existing
      await prisma.parkEvent.update({
        where: { externalId: event.externalId },
        data: {
          name: event.name,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          fetchedAt: new Date(),
        },
      });
      updated++;
    } else {
      // Create new
      await prisma.parkEvent.create({
        data: {
          externalId: event.externalId,
          name: event.name,
          description: event.description,
          parkName: event.parkName,
          borough: event.borough,
          address: event.address,
          latitude: event.latitude,
          longitude: event.longitude,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          category: event.category,
          isFree: event.isFree,
          url: event.url,
          imageUrl: event.imageUrl,
        },
      });
      created++;
    }
  }

  console.log(`[Parks] Sync complete: ${created} created, ${updated} updated`);

  return { created, updated, total: events.length };
}

/**
 * Get upcoming parks events for digest
 */
export async function getUpcomingParksEvents(
  days: number = 3,
  borough?: string
): Promise<ParkEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    isFree: true,
    date: {
      gte: today,
      lte: endDate,
    },
  };

  if (borough) {
    where.borough = borough;
  }

  const events = await prisma.parkEvent.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 10,
  });

  return events.map((e) => ({
    externalId: e.externalId,
    name: e.name,
    description: e.description,
    parkName: e.parkName,
    borough: e.borough,
    address: e.address,
    latitude: e.latitude,
    longitude: e.longitude,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    category: e.category,
    isFree: e.isFree,
    url: e.url,
    imageUrl: e.imageUrl,
  }));
}

/**
 * Get events by category
 */
export async function getParksEventsByCategory(
  category: string,
  days: number = 7
): Promise<ParkEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  const events = await prisma.parkEvent.findMany({
    where: {
      isFree: true,
      category: { contains: category, mode: "insensitive" },
      date: {
        gte: today,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
    take: 10,
  });

  return events.map((e) => ({
    externalId: e.externalId,
    name: e.name,
    description: e.description,
    parkName: e.parkName,
    borough: e.borough,
    address: e.address,
    latitude: e.latitude,
    longitude: e.longitude,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    category: e.category,
    isFree: e.isFree,
    url: e.url,
    imageUrl: e.imageUrl,
  }));
}
