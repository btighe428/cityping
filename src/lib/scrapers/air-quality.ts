// src/lib/scrapers/air-quality.ts
/**
 * Air Quality Scraper
 *
 * Fetches air quality index (AQI) data from AirNow API.
 * Includes current conditions and forecasts for NYC zip codes.
 *
 * API: https://docs.airnowapi.org/
 * Free tier: 500 requests/hour
 *
 * AQI Categories:
 * 0-50: Good (Green)
 * 51-100: Moderate (Yellow)
 * 101-150: Unhealthy for Sensitive Groups (Orange)
 * 151-200: Unhealthy (Red)
 * 201-300: Very Unhealthy (Purple)
 * 301-500: Hazardous (Maroon)
 */

import { z } from "zod";
import { prisma } from "../db";
import { sendScraperAlert } from "../scraper-alerts";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const AirNowForecastSchema = z.object({
  DateForecast: z.string(),
  ReportingArea: z.string(),
  StateCode: z.string(),
  AQI: z.number(),
  Category: z.object({
    Number: z.number(),
    Name: z.string(),
  }),
  ParameterName: z.string().optional(),
  ActionDay: z.boolean().optional(),
});

const AirNowCurrentSchema = z.object({
  DateObserved: z.string(),
  HourObserved: z.number(),
  LocalTimeZone: z.string(),
  ReportingArea: z.string(),
  StateCode: z.string(),
  AQI: z.number(),
  Category: z.object({
    Number: z.number(),
    Name: z.string(),
  }),
  ParameterName: z.string().optional(),
});

export interface AirQualityReading {
  zipCode: string;
  aqi: number;
  category: string;
  categoryNumber: number;
  pollutant: string | null;
  color: string;
  forecastDate: Date;
  isAlert: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE = "https://www.airnowapi.org/aq";

// Category colors (EPA standard)
const CATEGORY_COLORS: Record<number, string> = {
  1: "#00E400", // Good - Green
  2: "#FFFF00", // Moderate - Yellow
  3: "#FF7E00", // USG - Orange
  4: "#FF0000", // Unhealthy - Red
  5: "#8F3F97", // Very Unhealthy - Purple
  6: "#7E0023", // Hazardous - Maroon
};

// NYC area zip codes to monitor
const NYC_ZIP_CODES = [
  "10001", // Manhattan - Midtown
  "10013", // Manhattan - Tribeca
  "11201", // Brooklyn - Downtown
  "11211", // Brooklyn - Williamsburg
  "11101", // Queens - LIC
  "10451", // Bronx - South Bronx
  "10301", // Staten Island
];

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Fetch current AQI for a zip code
 */
export async function fetchCurrentAQI(zipCode: string): Promise<AirQualityReading | null> {
  const apiKey = process.env.AIRNOW_API_KEY;

  if (!apiKey) {
    console.warn("[AirQuality] AIRNOW_API_KEY not configured");
    return null;
  }

  const url = `${API_BASE}/observation/zipCode/current/?format=application/json&zipCode=${zipCode}&API_KEY=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`AirNow API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[AirQuality] No current data for ${zipCode}`);
      return null;
    }

    // Get the primary reading (usually PM2.5 or Ozone)
    const parsed = AirNowCurrentSchema.safeParse(data[0]);

    if (!parsed.success) {
      console.warn("[AirQuality] Validation failed:", parsed.error);
      return null;
    }

    const d = parsed.data;

    return {
      zipCode,
      aqi: d.AQI,
      category: d.Category.Name,
      categoryNumber: d.Category.Number,
      pollutant: d.ParameterName || null,
      color: CATEGORY_COLORS[d.Category.Number] || "#808080",
      forecastDate: new Date(),
      isAlert: d.AQI > 100,
    };
  } catch (error) {
    console.error(`[AirQuality] Error fetching for ${zipCode}:`, error);
    return null;
  }
}

/**
 * Fetch AQI forecast for a zip code
 */
export async function fetchAQIForecast(zipCode: string): Promise<AirQualityReading[]> {
  const apiKey = process.env.AIRNOW_API_KEY;

  if (!apiKey) {
    console.warn("[AirQuality] AIRNOW_API_KEY not configured");
    return [];
  }

  const url = `${API_BASE}/forecast/zipCode/?format=application/json&zipCode=${zipCode}&API_KEY=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`AirNow API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    const readings: AirQualityReading[] = [];

    for (const item of data) {
      const parsed = AirNowForecastSchema.safeParse(item);

      if (!parsed.success) continue;

      const d = parsed.data;

      readings.push({
        zipCode,
        aqi: d.AQI,
        category: d.Category.Name,
        categoryNumber: d.Category.Number,
        pollutant: d.ParameterName || null,
        color: CATEGORY_COLORS[d.Category.Number] || "#808080",
        forecastDate: new Date(d.DateForecast),
        isAlert: d.AQI > 100,
      });
    }

    return readings;
  } catch (error) {
    console.error(`[AirQuality] Error fetching forecast for ${zipCode}:`, error);
    return [];
  }
}

/**
 * Fetch and sync air quality for all NYC zip codes
 */
export async function syncAirQuality(): Promise<{
  readings: number;
  alerts: number;
}> {
  console.log("[AirQuality] Syncing air quality data...");

  let totalReadings = 0;
  let totalAlerts = 0;

  try {
    for (const zipCode of NYC_ZIP_CODES) {
      // Fetch forecast (includes today)
      const forecasts = await fetchAQIForecast(zipCode);

      for (const reading of forecasts) {
        // Normalize date to start of day
        const forecastDate = new Date(reading.forecastDate);
        forecastDate.setHours(0, 0, 0, 0);

        await prisma.airQualityReading.upsert({
          where: {
            zipCode_forecastDate: {
              zipCode: reading.zipCode,
              forecastDate,
            },
          },
          update: {
            aqi: reading.aqi,
            category: reading.category,
            pollutant: reading.pollutant,
            color: reading.color,
            isAlert: reading.isAlert,
            fetchedAt: new Date(),
          },
          create: {
            zipCode: reading.zipCode,
            aqi: reading.aqi,
            category: reading.category,
            pollutant: reading.pollutant,
            color: reading.color,
            forecastDate,
            isAlert: reading.isAlert,
          },
        });

        totalReadings++;
        if (reading.isAlert) totalAlerts++;
      }

      // Small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log(`[AirQuality] Synced ${totalReadings} readings, ${totalAlerts} alerts`);

    return { readings: totalReadings, alerts: totalAlerts };
  } catch (error) {
    console.error("[AirQuality] Sync error:", error);
    await sendScraperAlert("air-quality", [{
      source: "air-quality",
      payload: { zipCodes: NYC_ZIP_CODES },
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    }]);
    throw error;
  }
}

/**
 * Get today's air quality for digest
 */
export async function getTodaysAirQuality(): Promise<AirQualityReading | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get reading for central NYC zip
  const reading = await prisma.airQualityReading.findUnique({
    where: {
      zipCode_forecastDate: {
        zipCode: "10001",
        forecastDate: today,
      },
    },
  });

  if (!reading) return null;

  return {
    zipCode: reading.zipCode,
    aqi: reading.aqi,
    category: reading.category,
    categoryNumber: reading.category === "Good" ? 1 : reading.category === "Moderate" ? 2 : 3,
    pollutant: reading.pollutant,
    color: reading.color || "#808080",
    forecastDate: reading.forecastDate,
    isAlert: reading.isAlert,
  };
}

/**
 * Check if there's an active air quality alert
 */
export async function hasActiveAirQualityAlert(): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alertCount = await prisma.airQualityReading.count({
    where: {
      forecastDate: today,
      isAlert: true,
    },
  });

  return alertCount > 0;
}
