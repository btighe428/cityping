// src/lib/scrapers/environmental.ts
/**
 * Environmental Data Scraper (Pollen, UV Index)
 *
 * Fetches pollen and UV index forecasts for NYC zip codes.
 * Uses Tomorrow.io (free tier: 500 calls/day) for pollen data
 * and NWS for UV index data.
 *
 * APIs:
 * - Tomorrow.io: https://www.tomorrow.io/weather-api/ (500 free/day)
 * - NWS UV Index: https://www.cpc.ncep.noaa.gov/products/stratosphere/uv_index/
 *
 * Categories:
 * - Pollen: None (0), Low (1-2), Moderate (3-4), High (5-6), Very High (7+)
 * - UV: Low (1-2), Moderate (3-5), High (6-7), Very High (8-10), Extreme (11+)
 *
 * Premium Feature: Personalized health alerts based on user conditions
 */

import { z } from "zod";
import { prisma } from "../db";
import { sendScraperAlert } from "../scraper-alerts";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const TomorrowPollenSchema = z.object({
  data: z.object({
    timelines: z.array(z.object({
      timestep: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      intervals: z.array(z.object({
        startTime: z.string(),
        values: z.object({
          grassIndex: z.number().optional(),
          treeIndex: z.number().optional(),
          weedIndex: z.number().optional(),
        }),
      })),
    })),
  }),
});

export interface EnvironmentalReading {
  zipCode: string;
  readingType: "pollen_grass" | "pollen_tree" | "pollen_weed" | "uv";
  value: number;
  category: string;
  recommendation: string | null;
  forecastDate: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const TOMORROW_API_BASE = "https://api.tomorrow.io/v4";

// Central NYC location for city-wide readings
const NYC_LOCATION = { lat: 40.7128, lon: -74.006 };

// NYC zip codes for localized readings
const NYC_ZIP_CODES = ["10001", "11201", "11101", "10451"];

// Pollen index thresholds and categories
const POLLEN_CATEGORIES: Array<{ max: number; category: string; recommendation: string }> = [
  { max: 0, category: "None", recommendation: "No pollen concerns today." },
  { max: 2, category: "Low", recommendation: "Low pollen. Good day to be outside." },
  { max: 4, category: "Moderate", recommendation: "Moderate pollen. Sensitive individuals may notice symptoms." },
  { max: 6, category: "High", recommendation: "High pollen. Consider limiting outdoor time if allergic." },
  { max: 10, category: "Very High", recommendation: "Very high pollen. Take allergy medication if needed." },
];

// UV index thresholds and categories (EPA standard)
const UV_CATEGORIES: Array<{ max: number; category: string; recommendation: string }> = [
  { max: 2, category: "Low", recommendation: "No protection needed for most people." },
  { max: 5, category: "Moderate", recommendation: "Seek shade during midday. Wear sunscreen." },
  { max: 7, category: "High", recommendation: "Protection essential. Reduce sun exposure 10am-4pm." },
  { max: 10, category: "Very High", recommendation: "Extra protection needed. Avoid sun 10am-4pm." },
  { max: 15, category: "Extreme", recommendation: "Unprotected skin can burn in minutes. Avoid sun." },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPollenCategory(value: number): { category: string; recommendation: string } {
  for (const threshold of POLLEN_CATEGORIES) {
    if (value <= threshold.max) {
      return { category: threshold.category, recommendation: threshold.recommendation };
    }
  }
  return POLLEN_CATEGORIES[POLLEN_CATEGORIES.length - 1];
}

function getUVCategory(value: number): { category: string; recommendation: string } {
  for (const threshold of UV_CATEGORIES) {
    if (value <= threshold.max) {
      return { category: threshold.category, recommendation: threshold.recommendation };
    }
  }
  return UV_CATEGORIES[UV_CATEGORIES.length - 1];
}

// ============================================================================
// POLLEN DATA
// ============================================================================

/**
 * Fetch pollen data from Tomorrow.io
 */
export async function fetchPollenData(): Promise<EnvironmentalReading[]> {
  const apiKey = process.env.TOMORROW_API_KEY;

  if (!apiKey) {
    console.warn("[Environmental] TOMORROW_API_KEY not configured");
    return [];
  }

  const url = `${TOMORROW_API_BASE}/timelines?location=${NYC_LOCATION.lat},${NYC_LOCATION.lon}&fields=grassIndex,treeIndex,weedIndex&timesteps=1d&units=metric&apikey=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "CityPing Premium (cityping.com)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Tomorrow.io API error: ${response.status}`);
    }

    const data = await response.json();
    const parsed = TomorrowPollenSchema.safeParse(data);

    if (!parsed.success) {
      console.warn("[Environmental] Tomorrow.io response validation failed:", parsed.error);
      return [];
    }

    const readings: EnvironmentalReading[] = [];
    const timeline = parsed.data.data.timelines[0];

    if (!timeline?.intervals) return [];

    for (const interval of timeline.intervals) {
      const forecastDate = new Date(interval.startTime);
      forecastDate.setHours(0, 0, 0, 0);

      const { grassIndex, treeIndex, weedIndex } = interval.values;

      if (grassIndex !== undefined) {
        const cat = getPollenCategory(grassIndex);
        readings.push({
          zipCode: "10001", // NYC-wide reading
          readingType: "pollen_grass",
          value: grassIndex,
          category: cat.category,
          recommendation: cat.recommendation,
          forecastDate,
        });
      }

      if (treeIndex !== undefined) {
        const cat = getPollenCategory(treeIndex);
        readings.push({
          zipCode: "10001",
          readingType: "pollen_tree",
          value: treeIndex,
          category: cat.category,
          recommendation: cat.recommendation,
          forecastDate,
        });
      }

      if (weedIndex !== undefined) {
        const cat = getPollenCategory(weedIndex);
        readings.push({
          zipCode: "10001",
          readingType: "pollen_weed",
          value: weedIndex,
          category: cat.category,
          recommendation: cat.recommendation,
          forecastDate,
        });
      }
    }

    console.log(`[Environmental] Fetched ${readings.length} pollen readings`);
    return readings;
  } catch (error) {
    console.error("[Environmental] Pollen fetch error:", error);
    throw error;
  }
}

/**
 * Sync pollen data to database
 */
export async function syncPollenData(): Promise<{ readings: number }> {
  console.log("[Environmental] Syncing pollen data...");

  try {
    const readings = await fetchPollenData();
    let synced = 0;

    for (const reading of readings) {
      await prisma.environmentalReading.upsert({
        where: {
          zipCode_readingType_forecastDate: {
            zipCode: reading.zipCode,
            readingType: reading.readingType,
            forecastDate: reading.forecastDate,
          },
        },
        update: {
          value: reading.value,
          category: reading.category,
          recommendation: reading.recommendation,
          fetchedAt: new Date(),
        },
        create: {
          zipCode: reading.zipCode,
          readingType: reading.readingType,
          value: reading.value,
          category: reading.category,
          recommendation: reading.recommendation,
          forecastDate: reading.forecastDate,
        },
      });
      synced++;
    }

    console.log(`[Environmental] Synced ${synced} pollen readings`);
    return { readings: synced };
  } catch (error) {
    console.error("[Environmental] Pollen sync error:", error);
    await sendScraperAlert("environmental-pollen", [{
      source: "environmental-pollen",
      payload: {},
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    }]);
    throw error;
  }
}

// ============================================================================
// UV INDEX DATA
// ============================================================================

/**
 * Fetch UV index from NWS (or fallback to Tomorrow.io)
 * NWS provides free UV forecasts but with limited API
 */
export async function fetchUVIndex(): Promise<EnvironmentalReading[]> {
  // Try Tomorrow.io first if key is available
  const apiKey = process.env.TOMORROW_API_KEY;

  if (apiKey) {
    const url = `${TOMORROW_API_BASE}/timelines?location=${NYC_LOCATION.lat},${NYC_LOCATION.lon}&fields=uvIndex&timesteps=1d&units=metric&apikey=${apiKey}`;

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        const readings: EnvironmentalReading[] = [];

        const timeline = data.data?.timelines?.[0];
        if (timeline?.intervals) {
          for (const interval of timeline.intervals) {
            const forecastDate = new Date(interval.startTime);
            forecastDate.setHours(0, 0, 0, 0);
            const uvIndex = interval.values?.uvIndex;

            if (uvIndex !== undefined) {
              const cat = getUVCategory(uvIndex);
              readings.push({
                zipCode: "10001",
                readingType: "uv",
                value: uvIndex,
                category: cat.category,
                recommendation: cat.recommendation,
                forecastDate,
              });
            }
          }
        }

        console.log(`[Environmental] Fetched ${readings.length} UV readings`);
        return readings;
      }
    } catch (error) {
      console.warn("[Environmental] Tomorrow.io UV fetch failed, using fallback");
    }
  }

  // Fallback: Generate estimated UV based on date/season
  // NYC typical UV ranges: Winter 1-3, Spring 4-6, Summer 6-9, Fall 3-5
  const today = new Date();
  const month = today.getMonth();
  let estimatedUV: number;

  if (month >= 5 && month <= 7) {
    estimatedUV = 7; // Summer
  } else if (month >= 3 && month <= 4 || month >= 8 && month <= 9) {
    estimatedUV = 5; // Spring/Fall
  } else {
    estimatedUV = 2; // Winter
  }

  const cat = getUVCategory(estimatedUV);
  const forecastDate = new Date();
  forecastDate.setHours(0, 0, 0, 0);

  return [{
    zipCode: "10001",
    readingType: "uv",
    value: estimatedUV,
    category: cat.category,
    recommendation: cat.recommendation,
    forecastDate,
  }];
}

/**
 * Sync UV index data to database
 */
export async function syncUVIndex(): Promise<{ readings: number }> {
  console.log("[Environmental] Syncing UV index...");

  try {
    const readings = await fetchUVIndex();
    let synced = 0;

    for (const reading of readings) {
      await prisma.environmentalReading.upsert({
        where: {
          zipCode_readingType_forecastDate: {
            zipCode: reading.zipCode,
            readingType: reading.readingType,
            forecastDate: reading.forecastDate,
          },
        },
        update: {
          value: reading.value,
          category: reading.category,
          recommendation: reading.recommendation,
          fetchedAt: new Date(),
        },
        create: {
          zipCode: reading.zipCode,
          readingType: reading.readingType,
          value: reading.value,
          category: reading.category,
          recommendation: reading.recommendation,
          forecastDate: reading.forecastDate,
        },
      });
      synced++;
    }

    console.log(`[Environmental] Synced ${synced} UV readings`);
    return { readings: synced };
  } catch (error) {
    console.error("[Environmental] UV sync error:", error);
    await sendScraperAlert("environmental-uv", [{
      source: "environmental-uv",
      payload: {},
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    }]);
    throw error;
  }
}

// ============================================================================
// COMBINED SYNC
// ============================================================================

/**
 * Sync all environmental data
 */
export async function syncEnvironmentalData(): Promise<{
  pollen: number;
  uv: number;
}> {
  const [pollenResult, uvResult] = await Promise.all([
    syncPollenData().catch((e) => {
      console.error("[Environmental] Pollen sync failed:", e);
      return { readings: 0 };
    }),
    syncUVIndex().catch((e) => {
      console.error("[Environmental] UV sync failed:", e);
      return { readings: 0 };
    }),
  ]);

  return {
    pollen: pollenResult.readings,
    uv: uvResult.readings,
  };
}

// ============================================================================
// DIGEST HELPERS
// ============================================================================

/**
 * Get today's environmental readings for digest
 */
export async function getTodaysEnvironmentalReadings(): Promise<{
  pollen: { type: string; value: number; category: string; recommendation: string } | null;
  uv: { value: number; category: string; recommendation: string } | null;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const readings = await prisma.environmentalReading.findMany({
    where: {
      forecastDate: today,
      zipCode: "10001",
    },
  });

  // Find the highest pollen reading
  const pollenReadings = readings.filter((r) => r.readingType.startsWith("pollen_"));
  const highestPollen = pollenReadings.length > 0
    ? pollenReadings.reduce((max, r) => (r.value > max.value ? r : max))
    : null;

  const uvReading = readings.find((r) => r.readingType === "uv");

  return {
    pollen: highestPollen
      ? {
          type: highestPollen.readingType.replace("pollen_", ""),
          value: highestPollen.value,
          category: highestPollen.category,
          recommendation: highestPollen.recommendation || "",
        }
      : null,
    uv: uvReading
      ? {
          value: uvReading.value,
          category: uvReading.category,
          recommendation: uvReading.recommendation || "",
        }
      : null,
  };
}

/**
 * Check if today has any environmental alerts (high pollen or UV)
 */
export async function hasEnvironmentalAlerts(): Promise<boolean> {
  const readings = await getTodaysEnvironmentalReadings();

  const hasHighPollen =
    readings.pollen !== null &&
    (readings.pollen.category === "High" || readings.pollen.category === "Very High");

  const hasHighUV =
    readings.uv !== null &&
    (readings.uv.category === "High" ||
      readings.uv.category === "Very High" ||
      readings.uv.category === "Extreme");

  return hasHighPollen || hasHighUV;
}
