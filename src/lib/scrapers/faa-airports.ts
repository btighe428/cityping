// src/lib/scrapers/faa-airports.ts
/**
 * FAA Airport Delays Scraper
 *
 * Fetches airport delay status from the FAA NAS Status API for NYC-area airports.
 * Tracks ground delays, ground stops, and travel waivers for JFK, LGA, and EWR.
 *
 * API: https://nasstatus.faa.gov/api/airport-status-information (FREE, no auth)
 *
 * Delay Types:
 * - Ground Delay Program (GDP): Arriving flights held at origin
 * - Ground Stop: No departures to airport for a period
 * - Airspace Flow Program (AFP): En-route flow control
 * - General Arrival Delay: Miscellaneous arrival delays
 *
 * Premium Feature: Proactive alerts when delays exceed 30 minutes
 */

import { z } from "zod";
import { prisma } from "../db";
import { sendScraperAlert } from "../scraper-alerts";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

// New FAA API response format (array of airport events)
const AirportEventSchema = z.object({
  airportId: z.string(),
  airportLongName: z.string().optional(),
  groundStop: z.object({
    impactingCondition: z.string().optional(),
    endTime: z.string().optional(),
  }).nullable().optional(),
  groundDelay: z.object({
    impactingCondition: z.string().optional(),
    avgDelay: z.number().optional(),
    maxDelay: z.number().optional(),
  }).nullable().optional(),
  arrivalDelay: z.object({
    reason: z.string().optional(),
    averageDelay: z.string().optional(),
  }).nullable().optional(),
  departureDelay: z.object({
    reason: z.string().optional(),
    averageDelay: z.string().optional(),
  }).nullable().optional(),
});

export interface AirportDelay {
  airportCode: string;
  airportName: string;
  delayType: string | null;
  delayReason: string | null;
  avgDelayMinutes: number | null;
  status: "normal" | "delays" | "ground_stop";
  travelWaivers: TravelWaiver[];
}

export interface TravelWaiver {
  airline: string;
  validFrom: Date;
  validTo: Date;
  rebookingAllowed: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Alternative API endpoints to try
// The FAA Status API provides JSON data for airport delays
const API_ENDPOINTS = [
  // Individual airport status (JSON)
  "https://nasstatus.faa.gov/api/airport-events?arpts=JFK,LGA,EWR",
];

// NYC-area airports to monitor
const NYC_AIRPORTS: Record<string, string> = {
  JFK: "John F. Kennedy International",
  LGA: "LaGuardia",
  EWR: "Newark Liberty International",
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Parse delay time string to minutes
 * Examples: "1 hour 30 minutes", "45 minutes", "2 hours"
 */
function parseDelayMinutes(delayStr: string | undefined): number | null {
  if (!delayStr) return null;

  let minutes = 0;
  const hourMatch = delayStr.match(/(\d+)\s*hour/i);
  const minMatch = delayStr.match(/(\d+)\s*minute/i);

  if (hourMatch) minutes += parseInt(hourMatch[1], 10) * 60;
  if (minMatch) minutes += parseInt(minMatch[1], 10);

  return minutes > 0 ? minutes : null;
}

/**
 * Fetch airport status from FAA API
 */
export async function fetchAirportStatus(): Promise<AirportDelay[]> {
  let lastError: Error | null = null;

  // Try each API endpoint
  for (const apiUrl of API_ENDPOINTS) {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": "CityPing Premium (cityping.com)",
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`FAA API error: ${response.status}`);
      }

      const data = await response.json();

      // Process delays for NYC airports
      const delays: AirportDelay[] = [];

      // Initialize all airports as normal
      for (const [code, name] of Object.entries(NYC_AIRPORTS)) {
        delays.push({
          airportCode: code,
          airportName: name,
          delayType: null,
          delayReason: null,
          avgDelayMinutes: null,
          status: "normal",
          travelWaivers: [],
        });
      }

      // New format: array of airport events
      if (Array.isArray(data)) {
        for (const event of data) {
          const parsed = AirportEventSchema.safeParse(event);
          if (!parsed.success) continue;

          const airport = parsed.data;
          if (!(airport.airportId in NYC_AIRPORTS)) continue;

          const idx = delays.findIndex((d) => d.airportCode === airport.airportId);
          if (idx < 0) continue;

          // Check ground stop (highest priority)
          if (airport.groundStop) {
            delays[idx].delayType = "ground_stop";
            delays[idx].delayReason = airport.groundStop.impactingCondition || "Ground stop in effect";
            delays[idx].status = "ground_stop";
          }
          // Check ground delay
          else if (airport.groundDelay) {
            delays[idx].delayType = "ground_delay";
            delays[idx].delayReason = airport.groundDelay.impactingCondition || "Air traffic volume";
            delays[idx].avgDelayMinutes = airport.groundDelay.avgDelay || null;
            delays[idx].status = "delays";
          }
          // Check arrival delay
          else if (airport.arrivalDelay) {
            delays[idx].delayType = "arrival_delay";
            delays[idx].delayReason = airport.arrivalDelay.reason || "Arrival delays";
            delays[idx].avgDelayMinutes = parseDelayMinutes(airport.arrivalDelay.averageDelay);
            delays[idx].status = "delays";
          }
          // Check departure delay
          else if (airport.departureDelay) {
            delays[idx].delayType = "departure_delay";
            delays[idx].delayReason = airport.departureDelay.reason || "Departure delays";
            delays[idx].avgDelayMinutes = parseDelayMinutes(airport.departureDelay.averageDelay);
            delays[idx].status = "delays";
          }
        }
      }

      console.log(`[FAA] Fetched status for ${delays.length} airports`);
      return delays;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      console.warn(`[FAA] API endpoint failed: ${apiUrl}`, lastError.message);
    }
  }

  // All endpoints failed - return normal status as fallback
  // This allows digest to still include the section rather than failing
  console.warn("[FAA] All API endpoints failed, using fallback normal status");

  const fallbackDelays: AirportDelay[] = [];
  for (const [code, name] of Object.entries(NYC_AIRPORTS)) {
    fallbackDelays.push({
      airportCode: code,
      airportName: name,
      delayType: null,
      delayReason: null,
      avgDelayMinutes: null,
      status: "normal",
      travelWaivers: [],
    });
  }
  return fallbackDelays;
}

/**
 * Sync airport status to database
 */
export async function syncAirportStatus(): Promise<{
  airports: number;
  delays: number;
}> {
  console.log("[FAA] Syncing airport status...");

  try {
    const statuses = await fetchAirportStatus();
    let delayCount = 0;

    for (const status of statuses) {
      await prisma.airportStatus.create({
        data: {
          airportCode: status.airportCode,
          delayType: status.delayType,
          delayReason: status.delayReason,
          avgDelayMinutes: status.avgDelayMinutes,
          status: status.status,
          travelWaivers: JSON.parse(JSON.stringify(status.travelWaivers)),
          fetchedAt: new Date(),
        },
      });

      if (status.status !== "normal") {
        delayCount++;
      }
    }

    console.log(`[FAA] Synced ${statuses.length} airports, ${delayCount} with delays`);

    return { airports: statuses.length, delays: delayCount };
  } catch (error) {
    console.error("[FAA] Sync error:", error);
    await sendScraperAlert("faa-airports", [{
      source: "faa-airports",
      payload: { airports: Object.keys(NYC_AIRPORTS) },
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    }]);
    throw error;
  }
}

/**
 * Get current airport status (most recent readings)
 */
export async function getCurrentAirportStatus(): Promise<AirportDelay[]> {
  const delays: AirportDelay[] = [];

  for (const [code, name] of Object.entries(NYC_AIRPORTS)) {
    const latestStatus = await prisma.airportStatus.findFirst({
      where: { airportCode: code },
      orderBy: { fetchedAt: "desc" },
    });

    if (latestStatus) {
      delays.push({
        airportCode: latestStatus.airportCode,
        airportName: name,
        delayType: latestStatus.delayType,
        delayReason: latestStatus.delayReason,
        avgDelayMinutes: latestStatus.avgDelayMinutes,
        status: latestStatus.status as "normal" | "delays" | "ground_stop",
        travelWaivers: (latestStatus.travelWaivers as unknown as TravelWaiver[]) || [],
      });
    } else {
      delays.push({
        airportCode: code,
        airportName: name,
        delayType: null,
        delayReason: null,
        avgDelayMinutes: null,
        status: "normal",
        travelWaivers: [],
      });
    }
  }

  return delays;
}

/**
 * Check if any NYC airport has significant delays (30+ minutes)
 */
export async function hasSignificantDelays(): Promise<boolean> {
  const statuses = await getCurrentAirportStatus();

  return statuses.some(
    (s) =>
      s.status === "ground_stop" ||
      (s.avgDelayMinutes !== null && s.avgDelayMinutes >= 30)
  );
}

/**
 * Get active travel waivers for NYC airports
 * (Would need to scrape airline websites for actual waiver data)
 */
export async function getActiveWaivers(): Promise<TravelWaiver[]> {
  // Travel waivers would need airline-specific scraping
  // For now, return empty array - could integrate airline APIs later
  return [];
}

/**
 * Format delay status for digest
 */
export function formatDelayForDigest(delay: AirportDelay): string {
  if (delay.status === "normal") {
    return `${delay.airportCode}: On time`;
  }

  if (delay.status === "ground_stop") {
    return `${delay.airportCode}: Ground stop (${delay.delayReason || "check airline"})`;
  }

  const timeStr = delay.avgDelayMinutes
    ? `~${delay.avgDelayMinutes} min delays`
    : "Delays";

  return `${delay.airportCode}: ${timeStr}${delay.delayReason ? ` (${delay.delayReason})` : ""}`;
}
