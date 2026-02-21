// src/lib/scrapers/citibike.ts
/**
 * CitiBike GBFS Scraper
 *
 * Fetches real-time CitiBike station availability data from the official GBFS feed.
 * GBFS (General Bikeshare Feed Specification) is an open standard for bikeshare data.
 *
 * API: https://gbfs.citibikenyc.com/gbfs/gbfs.json (FREE, no auth required)
 * Rate Limits: None documented, but be respectful (5-min polling is reasonable)
 *
 * Data Flow:
 * 1. Fetch station_information.json (static station metadata)
 * 2. Fetch station_status.json (real-time availability)
 * 3. Merge and upsert to CitiBikeStation table
 *
 * Premium Feature: Dock availability alerts for saved home/work stations
 */

import { z } from "zod";
import { prisma } from "../db";
import { sendScraperAlert } from "../scraper-alerts";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const StationInfoSchema = z.object({
  station_id: z.string(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  capacity: z.number(),
  region_id: z.string().optional(),
});

const StationStatusSchema = z.object({
  station_id: z.string(),
  num_bikes_available: z.number(),
  num_docks_available: z.number(),
  is_installed: z.union([z.boolean(), z.number()]).optional(),
  is_renting: z.union([z.boolean(), z.number()]).optional(),
  is_returning: z.union([z.boolean(), z.number()]).optional(),
  last_reported: z.number(),
});

export interface CitiBikeStation {
  stationId: string;
  name: string;
  lat: number;
  lon: number;
  neighborhood: string | null;
  capacity: number;
  bikesAvailable: number;
  docksAvailable: number;
  lastReportedAt: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const GBFS_BASE = "https://gbfs.citibikenyc.com/gbfs/en";

// Neighborhood mapping based on region_id from GBFS
// These come from the system_regions.json feed
const REGION_TO_NEIGHBORHOOD: Record<string, string> = {
  "70": "Manhattan",
  "71": "Brooklyn",
  "72": "Queens",
  "73": "Bronx",
  "74": "Jersey City",
  "75": "Hoboken",
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Fetch station information (static metadata)
 */
export async function fetchStationInfo(): Promise<Map<string, z.infer<typeof StationInfoSchema>>> {
  const url = `${GBFS_BASE}/station_information.json`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "CityPing Premium (cityping.com)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GBFS station_information error: ${response.status}`);
  }

  const data = await response.json();
  const stations = new Map<string, z.infer<typeof StationInfoSchema>>();

  for (const station of data.data?.stations || []) {
    const parsed = StationInfoSchema.safeParse(station);
    if (parsed.success) {
      stations.set(parsed.data.station_id, parsed.data);
    }
  }

  return stations;
}

/**
 * Fetch station status (real-time availability)
 */
export async function fetchStationStatus(): Promise<Map<string, z.infer<typeof StationStatusSchema>>> {
  const url = `${GBFS_BASE}/station_status.json`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "CityPing Premium (cityping.com)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GBFS station_status error: ${response.status}`);
  }

  const data = await response.json();
  const statuses = new Map<string, z.infer<typeof StationStatusSchema>>();

  for (const status of data.data?.stations || []) {
    const parsed = StationStatusSchema.safeParse(status);
    if (parsed.success) {
      statuses.set(parsed.data.station_id, parsed.data);
    }
  }

  return statuses;
}

/**
 * Sync all CitiBike station data
 */
export async function syncCitiBikeStations(): Promise<{
  stations: number;
  updated: number;
}> {
  console.log("[CitiBike] Syncing station data...");

  try {
    // Fetch both feeds in parallel
    const [stationInfo, stationStatus] = await Promise.all([
      fetchStationInfo(),
      fetchStationStatus(),
    ]);

    // Build batch of stations to upsert
    const stationsToUpsert: Array<{
      stationId: string;
      name: string;
      lat: number;
      lon: number;
      neighborhood: string | null;
      capacity: number;
      bikesAvailable: number;
      docksAvailable: number;
      lastReportedAt: Date;
    }> = [];

    for (const [stationId, info] of stationInfo) {
      const status = stationStatus.get(stationId);
      if (!status) continue;

      // Skip stations that aren't operational
      // API returns 0/1 instead of true/false
      if (status.is_installed === false || status.is_installed === 0 ||
          status.is_renting === false || status.is_renting === 0) {
        continue;
      }

      const neighborhood = info.region_id
        ? REGION_TO_NEIGHBORHOOD[info.region_id] || null
        : null;

      stationsToUpsert.push({
        stationId,
        name: info.name,
        lat: info.lat,
        lon: info.lon,
        neighborhood,
        capacity: info.capacity,
        bikesAvailable: status.num_bikes_available,
        docksAvailable: status.num_docks_available,
        lastReportedAt: new Date(status.last_reported * 1000),
      });
    }

    // Batch upsert in chunks of 100
    const BATCH_SIZE = 100;
    let updated = 0;

    for (let i = 0; i < stationsToUpsert.length; i += BATCH_SIZE) {
      const batch = stationsToUpsert.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(
        batch.map((station) =>
          prisma.citiBikeStation.upsert({
            where: { stationId: station.stationId },
            update: {
              name: station.name,
              lat: station.lat,
              lon: station.lon,
              neighborhood: station.neighborhood,
              capacity: station.capacity,
              bikesAvailable: station.bikesAvailable,
              docksAvailable: station.docksAvailable,
              lastReportedAt: station.lastReportedAt,
              fetchedAt: new Date(),
            },
            create: {
              stationId: station.stationId,
              name: station.name,
              lat: station.lat,
              lon: station.lon,
              neighborhood: station.neighborhood,
              capacity: station.capacity,
              bikesAvailable: station.bikesAvailable,
              docksAvailable: station.docksAvailable,
              lastReportedAt: station.lastReportedAt,
            },
          })
        )
      );

      updated += batch.length;
      console.log(`[CitiBike] Processed ${updated}/${stationsToUpsert.length} stations`);
    }

    console.log(`[CitiBike] Synced ${updated} stations`);

    return { stations: stationInfo.size, updated };
  } catch (error) {
    console.error("[CitiBike] Sync error:", error);
    await sendScraperAlert("citibike", [{
      source: "citibike",
      payload: {},
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    }]);
    throw error;
  }
}

/**
 * Get station status by ID
 */
export async function getStationStatus(stationId: string): Promise<CitiBikeStation | null> {
  const station = await prisma.citiBikeStation.findUnique({
    where: { stationId },
  });

  if (!station) return null;

  return {
    stationId: station.stationId,
    name: station.name,
    lat: station.lat,
    lon: station.lon,
    neighborhood: station.neighborhood,
    capacity: station.capacity,
    bikesAvailable: station.bikesAvailable,
    docksAvailable: station.docksAvailable,
    lastReportedAt: station.lastReportedAt,
  };
}

/**
 * Get stations near a location
 */
export async function getStationsNearLocation(
  lat: number,
  lon: number,
  limit: number = 5
): Promise<CitiBikeStation[]> {
  // Simple Euclidean distance approximation (good enough for NYC scale)
  // For production, consider PostGIS for proper geospatial queries
  const stations = await prisma.citiBikeStation.findMany({
    orderBy: [
      // This is a workaround since Prisma doesn't support computed columns
      // In production, use raw SQL with haversine formula
      { fetchedAt: "desc" },
    ],
    take: limit * 10, // Fetch more and filter
  });

  // Calculate distances and sort
  const withDistances = stations.map((station: { lat: number; lon: number; stationId: string; name: string; neighborhood: string | null; capacity: number; bikesAvailable: number; docksAvailable: number; lastReportedAt: Date }) => ({
    station,
    distance: Math.sqrt(
      Math.pow(station.lat - lat, 2) + Math.pow(station.lon - lon, 2)
    ),
  }));

  withDistances.sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);

  return withDistances.slice(0, limit).map((s: { station: { stationId: string; name: string; lat: number; lon: number; neighborhood: string | null; capacity: number; bikesAvailable: number; docksAvailable: number; lastReportedAt: Date } }) => ({
    stationId: s.station.stationId,
    name: s.station.name,
    lat: s.station.lat,
    lon: s.station.lon,
    neighborhood: s.station.neighborhood,
    capacity: s.station.capacity,
    bikesAvailable: s.station.bikesAvailable,
    docksAvailable: s.station.docksAvailable,
    lastReportedAt: s.station.lastReportedAt,
  }));
}

/**
 * Get dock availability for user's saved stations
 * Used in premium digest to show "5 bikes at your home station"
 */
export async function getUserStationStatus(userId: string): Promise<{
  home: CitiBikeStation | null;
  work: CitiBikeStation | null;
}> {
  const savedLocations = await prisma.userSavedLocation.findMany({
    where: {
      userId,
      locationType: { in: ["citibike_home", "citibike_work"] },
    },
  });

  const result: { home: CitiBikeStation | null; work: CitiBikeStation | null } = {
    home: null,
    work: null,
  };

  for (const location of savedLocations) {
    if (!location.stationId) continue;

    const station = await getStationStatus(location.stationId);
    if (!station) continue;

    if (location.locationType === "citibike_home") {
      result.home = station;
    } else if (location.locationType === "citibike_work") {
      result.work = station;
    }
  }

  return result;
}
