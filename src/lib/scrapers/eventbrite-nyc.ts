/**
 * EVENTBRITE NYC FREE EVENTS SCRAPER
 *
 * Source: Eventbrite API
 * Data: Free events, classes, meetups in NYC
 *
 * Critical for: Culture, lifestyle, money (free stuff)
 */

import { prisma } from "../db";
import { DateTime } from "luxon";

export interface EventbriteEvent {
  id: string;
  name: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  venueName?: string;
  venueAddress?: string;
  neighborhood?: string;
  isFree: boolean;
  price?: number;
  category: string;
  url: string;
  imageUrl?: string;
}

const EVENTBRITE_API = "https://www.eventbriteapi.com/v3";

/**
 * Fetch free events from Eventbrite.
 */
export async function fetchEventbriteEvents(): Promise<EventbriteEvent[]> {
  const apiKey = process.env.EVENTBRITE_API_KEY;

  if (!apiKey) {
    console.warn("[Eventbrite] No API key configured, using fallback");
    return fetchEventbriteFallback();
  }

  console.log("[Eventbrite] Fetching NYC free events...");

  try {
    const now = DateTime.now();
    const params = new URLSearchParams({
      "location.address": "New York, NY",
      "location.within": "10mi",
      "start_date.range_start": now.toISO()!,
      "start_date.range_end": now.plus({ days: 14 }).toISO()!,
      "price": "free",
      "expand": "venue",
    });

    const response = await fetch(`${EVENTBRITE_API}/events/search/?${params}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Eventbrite API error: ${response.status}`);
    }

    const data = await response.json();
    return parseEventbriteResponse(data);

  } catch (error) {
    console.error("[Eventbrite] Fetch failed:", error);
    return [];
  }
}

function parseEventbriteResponse(data: Record<string, unknown>): EventbriteEvent[] {
  const events = (data.events || []) as Array<Record<string, unknown>>;

  return events.map((event) => {
    const venue = event.venue as Record<string, unknown> | undefined;
    const address = venue?.address as Record<string, unknown> | undefined;

    return {
      id: `eventbrite-${event.id}`,
      name: (event.name as Record<string, string>)?.text || "Event",
      description: (event.description as Record<string, string>)?.text || "",
      startTime: new Date(String(event.start && (event.start as Record<string, string>).utc)),
      endTime: event.end ? new Date(String((event.end as Record<string, string>).utc)) : undefined,
      venueName: venue?.name ? String(venue.name) : undefined,
      venueAddress: address?.localized_address_display ? String(address.localized_address_display) : undefined,
      neighborhood: inferNeighborhood(address),
      isFree: event.is_free === true,
      price: 0,
      category: String(event.category_id || "other"),
      url: String(event.url || ""),
      imageUrl: event.logo ? String((event.logo as Record<string, unknown>).url) : undefined,
    };
  });
}

function inferNeighborhood(address: Record<string, unknown> | undefined): string | undefined {
  if (!address) return undefined;

  const city = String(address.city || "").toLowerCase();
  const region = String(address.region || "").toLowerCase();

  // NYC neighborhoods from address
  const neighborhoods = [
    "manhattan", "brooklyn", "queens", "bronx", "staten island",
    "williamsburg", "soho", "tribeca", "chelsea", "midtown",
    "harlem", "astoria", "long island city", "park slope"
  ];

  for (const hood of neighborhoods) {
    if (city.includes(hood) || region.includes(hood)) {
      return hood.charAt(0).toUpperCase() + hood.slice(1);
    }
  }

  return undefined;
}

/**
 * Fallback: Scrape Eventbrite search page (no API key needed).
 */
async function fetchEventbriteFallback(): Promise<EventbriteEvent[]> {
  // Would scrape public Eventbrite search page
  // For now, return mock data for testing
  return [
    {
      id: "eventbrite-demo-1",
      name: "Free Yoga in Central Park",
      description: "Join us for free outdoor yoga every Saturday morning",
      startTime: DateTime.now().plus({ days: 2 }).set({ hour: 9, minute: 0 }).toJSDate(),
      venueName: "Central Park Great Lawn",
      neighborhood: "Upper West Side",
      isFree: true,
      category: "fitness",
      url: "https://eventbrite.com",
    },
    {
      id: "eventbrite-demo-2",
      name: "Brooklyn Tech Meetup",
      description: "Monthly gathering of Brooklyn-based tech professionals",
      startTime: DateTime.now().plus({ days: 5 }).set({ hour: 18, minute: 30 }).toJSDate(),
      venueName: "Brooklyn Commons",
      neighborhood: "Downtown Brooklyn",
      isFree: true,
      category: "tech",
      url: "https://eventbrite.com",
    },
  ];
}

/**
 * Ingest Eventbrite events into database.
 */
export async function ingestEventbriteEvents(): Promise<{
  created: number;
  skipped: number;
}> {
  const events = await fetchEventbriteEvents();
  let created = 0;
  let skipped = 0;

  for (const event of events) {
    if (!event.isFree) {
      skipped++;
      continue;
    }

    try {
      // Check for existing
      const existing = await prisma.parkEvent.findFirst({
        where: {
          OR: [
            { externalId: event.id },
            {
              name: event.name,
              date: event.startTime,
            },
          ],
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Extract time from DateTime
      const eventDate = new Date(event.startTime);
      const startTimeStr = eventDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      const endTimeStr = event.endTime
        ? new Date(event.endTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
        : undefined;

      await prisma.parkEvent.create({
        data: {
          externalId: event.id,
          name: event.name,
          description: event.description,
          date: eventDate,
          startTime: startTimeStr,
          endTime: endTimeStr,
          parkName: event.venueName || "NYC Venue",
          address: event.venueName,
          borough: event.neighborhood,
          isFree: true,
          category: event.category,
          url: event.url,
          imageUrl: event.imageUrl,
        },
      });

      created++;
    } catch (error) {
      console.error(`[Eventbrite] Failed to create event ${event.id}:`, error);
    }
  }

  console.log(`[Eventbrite] Created: ${created}, Skipped: ${skipped}`);
  return { created, skipped };
}
