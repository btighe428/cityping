// src/lib/scrapers/traffic.ts
/**
 * Traffic Score Scraper
 *
 * Fetches real-time traffic flow data and calculates friction scores for NYC regions.
 * Uses TomTom Traffic Flow API (free tier: 2,500 calls/day).
 *
 * API: https://developer.tomtom.com/traffic-api/documentation/traffic-flow
 *
 * Friction Score (1-10):
 * 1-2: Smooth sailing - roads clear
 * 3-4: Light traffic - minor delays possible
 * 5-6: Moderate - plan extra time
 * 7-8: Heavy - significant delays
 * 9-10: Gridlock - avoid if possible
 *
 * Premium Feature: "Best time to leave" recommendations
 */

import { z } from "zod";
import { prisma } from "../db";
import { sendScraperAlert } from "../scraper-alerts";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const TomTomFlowSchema = z.object({
  flowSegmentData: z.object({
    frc: z.string(), // Functional Road Class
    currentSpeed: z.number(),
    freeFlowSpeed: z.number(),
    currentTravelTime: z.number(),
    freeFlowTravelTime: z.number(),
    confidence: z.number(),
    roadClosure: z.boolean().optional(),
  }),
});

export interface TrafficScore {
  region: string;
  frictionScore: number;
  label: string;
  currentSpeed: number;
  freeFlowSpeed: number;
  confidence: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const TOMTOM_API_BASE = "https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json";

// NYC regions with representative road segments
// Using major arteries that reflect overall traffic conditions
const NYC_REGIONS: Record<string, { lat: number; lon: number; name: string }> = {
  manhattan_midtown: {
    lat: 40.7549,
    lon: -73.9840,
    name: "Midtown Manhattan",
  },
  manhattan_downtown: {
    lat: 40.7128,
    lon: -74.0060,
    name: "Downtown Manhattan",
  },
  brooklyn: {
    lat: 40.6782,
    lon: -73.9442,
    name: "Brooklyn",
  },
  queens: {
    lat: 40.7282,
    lon: -73.7949,
    name: "Queens",
  },
  bronx: {
    lat: 40.8448,
    lon: -73.8648,
    name: "Bronx",
  },
};

// Friction score labels
const FRICTION_LABELS: Array<{ max: number; label: string }> = [
  { max: 2, label: "Smooth sailing" },
  { max: 4, label: "Light traffic" },
  { max: 6, label: "Moderate" },
  { max: 8, label: "Heavy traffic" },
  { max: 10, label: "Gridlock" },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate friction score from current vs free flow speed
 * Higher friction = slower traffic
 */
function calculateFrictionScore(currentSpeed: number, freeFlowSpeed: number): number {
  if (freeFlowSpeed <= 0) return 5; // Default moderate if no data

  const ratio = currentSpeed / freeFlowSpeed;

  // Convert ratio to 1-10 scale (inverted - lower ratio = higher friction)
  // 1.0 ratio = score 1, 0.5 ratio = score 5, 0.1 ratio = score 10
  const friction = Math.round(10 - ratio * 9);

  return Math.max(1, Math.min(10, friction));
}

/**
 * Get label for friction score
 */
function getFrictionLabel(score: number): string {
  for (const threshold of FRICTION_LABELS) {
    if (score <= threshold.max) {
      return threshold.label;
    }
  }
  return FRICTION_LABELS[FRICTION_LABELS.length - 1].label;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Fetch traffic flow for a location
 */
export async function fetchTrafficFlow(
  lat: number,
  lon: number
): Promise<{ currentSpeed: number; freeFlowSpeed: number; confidence: number } | null> {
  const apiKey = process.env.TOMTOM_API_KEY;

  if (!apiKey) {
    console.warn("[Traffic] TOMTOM_API_KEY not configured");
    return null;
  }

  const url = `${TOMTOM_API_BASE}?point=${lat},${lon}&unit=MPH&key=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "CityPing Premium (cityping.com)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No traffic data for this location (might be pedestrian area)
        return null;
      }
      throw new Error(`TomTom API error: ${response.status}`);
    }

    const data = await response.json();
    const parsed = TomTomFlowSchema.safeParse(data);

    if (!parsed.success) {
      console.warn("[Traffic] TomTom response validation failed:", parsed.error);
      return null;
    }

    const flow = parsed.data.flowSegmentData;

    return {
      currentSpeed: flow.currentSpeed,
      freeFlowSpeed: flow.freeFlowSpeed,
      confidence: flow.confidence,
    };
  } catch (error) {
    console.error(`[Traffic] Error fetching for ${lat},${lon}:`, error);
    return null;
  }
}

/**
 * Fetch traffic scores for all NYC regions
 */
export async function fetchAllTrafficScores(): Promise<TrafficScore[]> {
  const scores: TrafficScore[] = [];

  for (const [regionId, region] of Object.entries(NYC_REGIONS)) {
    const flow = await fetchTrafficFlow(region.lat, region.lon);

    if (flow) {
      const frictionScore = calculateFrictionScore(flow.currentSpeed, flow.freeFlowSpeed);

      scores.push({
        region: regionId,
        frictionScore,
        label: getFrictionLabel(frictionScore),
        currentSpeed: flow.currentSpeed,
        freeFlowSpeed: flow.freeFlowSpeed,
        confidence: flow.confidence,
      });
    } else {
      // Default to moderate if no data
      scores.push({
        region: regionId,
        frictionScore: 5,
        label: "Data unavailable",
        currentSpeed: 0,
        freeFlowSpeed: 0,
        confidence: 0,
      });
    }

    // Small delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return scores;
}

/**
 * Sync traffic scores to database
 */
export async function syncTrafficScores(): Promise<{ regions: number }> {
  console.log("[Traffic] Syncing traffic scores...");

  try {
    const scores = await fetchAllTrafficScores();

    for (const score of scores) {
      await prisma.trafficScore.create({
        data: {
          region: score.region,
          frictionScore: score.frictionScore,
          label: score.label,
          fetchedAt: new Date(),
        },
      });
    }

    console.log(`[Traffic] Synced ${scores.length} regions`);

    return { regions: scores.length };
  } catch (error) {
    console.error("[Traffic] Sync error:", error);
    await sendScraperAlert("traffic", [{
      source: "traffic",
      payload: { regions: Object.keys(NYC_REGIONS) },
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    }]);
    throw error;
  }
}

/**
 * Get current traffic scores (most recent readings)
 */
export async function getCurrentTrafficScores(): Promise<TrafficScore[]> {
  const scores: TrafficScore[] = [];

  for (const regionId of Object.keys(NYC_REGIONS)) {
    const latestScore = await prisma.trafficScore.findFirst({
      where: { region: regionId },
      orderBy: { fetchedAt: "desc" },
    });

    if (latestScore) {
      scores.push({
        region: latestScore.region,
        frictionScore: latestScore.frictionScore,
        label: latestScore.label,
        currentSpeed: 0, // Not stored in DB
        freeFlowSpeed: 0,
        confidence: 0,
      });
    }
  }

  return scores;
}

/**
 * Get overall NYC traffic summary
 */
export async function getNYCTrafficSummary(): Promise<{
  averageScore: number;
  label: string;
  worstRegion: string | null;
  worstScore: number;
}> {
  const scores = await getCurrentTrafficScores();

  if (scores.length === 0) {
    return {
      averageScore: 5,
      label: "Data unavailable",
      worstRegion: null,
      worstScore: 0,
    };
  }

  const averageScore = Math.round(
    scores.reduce((sum, s) => sum + s.frictionScore, 0) / scores.length
  );

  const worst = scores.reduce((max, s) =>
    s.frictionScore > max.frictionScore ? s : max
  );

  return {
    averageScore,
    label: getFrictionLabel(averageScore),
    worstRegion: NYC_REGIONS[worst.region]?.name || worst.region,
    worstScore: worst.frictionScore,
  };
}

/**
 * Get congestion pricing info based on current time
 */
export async function getCongestionPricingInfo(): Promise<{
  rate: number;
  period: string;
  isActive: boolean;
}> {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;

  // MTA Congestion Relief Zone pricing
  // Peak weekday (5am-9am, 4pm-8pm): $9.00
  // Off-peak weekday: $2.25
  // Weekend/holiday: $2.25
  // Overnight (9pm-5am): $2.25

  let rate: number;
  let period: string;

  if (hour >= 21 || hour < 5) {
    // Overnight
    rate = 2.25;
    period = "overnight";
  } else if (isWeekend) {
    rate = 2.25;
    period = "weekend";
  } else if ((hour >= 5 && hour < 9) || (hour >= 16 && hour < 20)) {
    // Peak hours
    rate = 9.0;
    period = "peak";
  } else {
    rate = 2.25;
    period = "off-peak";
  }

  return {
    rate,
    period,
    isActive: true, // CRZ is always active for passenger vehicles
  };
}

/**
 * Format traffic summary for digest
 */
export function formatTrafficForDigest(summary: {
  averageScore: number;
  label: string;
  worstRegion: string | null;
  worstScore: number;
}): string {
  let message = `Traffic: ${summary.label}`;

  if (summary.worstRegion && summary.worstScore >= 7) {
    message += ` (${summary.worstRegion} especially slow)`;
  }

  return message;
}
