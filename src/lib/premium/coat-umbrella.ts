// src/lib/premium/coat-umbrella.ts
/**
 * Coat & Umbrella Binary Decision Logic
 *
 * Premium feature that answers the daily question: "What should I wear?"
 * Uses NWS weather data to make simple, actionable recommendations.
 *
 * Decision Thresholds (based on NYC norms):
 * - Heavy coat: feels-like < 40°F
 * - Light jacket: feels-like 40-55°F
 * - No coat: feels-like > 55°F
 * - Umbrella: precipitation probability > 40%
 *
 * This is intentionally simple - no ambiguity, just answers.
 */

import { fetchNYCWeatherForecast, DayForecast } from "../weather";

// ============================================================================
// TYPES
// ============================================================================

export type CoatLevel = "heavy" | "light" | "none";

export interface WearDecision {
  coat: CoatLevel;
  umbrella: boolean;
  summary: string;
  details: {
    temperature: number;
    feelsLike: number;
    precipProbability: number;
    conditions: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Temperature thresholds (feels-like in Fahrenheit)
const COAT_THRESHOLDS = {
  heavy: 40, // Below 40°F = heavy coat
  light: 55, // 40-55°F = light jacket
  // Above 55°F = no coat needed
};

// Precipitation probability threshold for umbrella recommendation
const UMBRELLA_THRESHOLD = 40; // 40% chance = bring umbrella

// Wind chill calculation constants
// NWS Wind Chill formula is used when temp <= 50°F and wind > 3 mph
// For simplicity, we use a simplified approximation

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate feels-like temperature
 * Accounts for wind chill (cold) or heat index (hot)
 * Simplified version - NWS sometimes provides this directly
 */
function calculateFeelsLike(temp: number, windSpeed?: number): number {
  if (!windSpeed || windSpeed < 3) {
    return temp;
  }

  if (temp <= 50) {
    // Wind chill formula (simplified)
    // Actual: 35.74 + 0.6215T - 35.75(V^0.16) + 0.4275T(V^0.16)
    // Simplified approximation for typical NYC winds
    const windChill = temp - (windSpeed * 0.5);
    return Math.round(windChill);
  }

  // For warmer temps, wind doesn't cool as much
  return temp;
}

/**
 * Determine coat level based on temperature
 */
function determineCoatLevel(feelsLike: number): CoatLevel {
  if (feelsLike < COAT_THRESHOLDS.heavy) {
    return "heavy";
  }
  if (feelsLike < COAT_THRESHOLDS.light) {
    return "light";
  }
  return "none";
}

/**
 * Determine if umbrella is needed
 */
function needsUmbrella(precipProbability: number | null, forecast: string): boolean {
  // Check probability threshold
  if (precipProbability !== null && precipProbability >= UMBRELLA_THRESHOLD) {
    return true;
  }

  // Check forecast text for rain/precipitation keywords
  const lowerForecast = forecast.toLowerCase();
  const rainKeywords = [
    "rain",
    "shower",
    "thunderstorm",
    "drizzle",
    "precipitation",
    "wet",
  ];

  return rainKeywords.some((keyword) => lowerForecast.includes(keyword));
}

/**
 * Generate human-readable summary
 */
function generateSummary(coat: CoatLevel, umbrella: boolean): string {
  const coatAdvice =
    coat === "heavy"
      ? "Wear a heavy coat"
      : coat === "light"
      ? "Bring a light jacket"
      : "No coat needed";

  const umbrellaAdvice = umbrella ? "Grab an umbrella" : "No umbrella needed";

  // Combine into single sentence
  if (coat === "none" && !umbrella) {
    return "Perfect weather! No coat or umbrella needed.";
  }

  if (coat === "heavy" && umbrella) {
    return "Bundle up and grab an umbrella. It's cold and wet out there.";
  }

  if (coat === "light" && umbrella) {
    return "Light jacket and umbrella today.";
  }

  if (coat === "heavy") {
    return "Wear a heavy coat. No umbrella needed.";
  }

  if (umbrella) {
    return "Grab an umbrella! Otherwise, dress light.";
  }

  return `${coatAdvice}. ${umbrellaAdvice}.`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get today's coat and umbrella decision
 */
export async function getTodaysWearDecision(): Promise<WearDecision | null> {
  const forecast = await fetchNYCWeatherForecast();

  if (!forecast || forecast.days.length === 0) {
    console.warn("[CoatUmbrella] No forecast data available");
    return null;
  }

  // Get today's daytime forecast (first period is typically "Today" or "Tonight")
  // We want the daytime period for the commute
  const todayPeriod = forecast.days.find(
    (d) =>
      !d.name.toLowerCase().includes("night") &&
      !d.name.toLowerCase().includes("overnight")
  );

  if (!todayPeriod) {
    // Fallback to first period
    return makeDecisionFromPeriod(forecast.days[0]);
  }

  return makeDecisionFromPeriod(todayPeriod);
}

/**
 * Make wear decision from a single forecast period
 */
function makeDecisionFromPeriod(period: DayForecast): WearDecision {
  const temp = period.temperature;
  // NWS doesn't always provide feels-like, so we use actual temp
  const feelsLike = calculateFeelsLike(temp);
  const precipProb = period.probabilityOfPrecipitation;

  const coat = determineCoatLevel(feelsLike);
  const umbrella = needsUmbrella(precipProb, period.shortForecast);
  const summary = generateSummary(coat, umbrella);

  return {
    coat,
    umbrella,
    summary,
    details: {
      temperature: temp,
      feelsLike,
      precipProbability: precipProb || 0,
      conditions: period.shortForecast,
    },
  };
}

/**
 * Get tomorrow's wear decision (for evening digest)
 */
export async function getTomorrowsWearDecision(): Promise<WearDecision | null> {
  const forecast = await fetchNYCWeatherForecast();

  if (!forecast || forecast.days.length < 2) {
    console.warn("[CoatUmbrella] No forecast data for tomorrow");
    return null;
  }

  // Find tomorrow's daytime period
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const tomorrowPeriod = forecast.days.find(
    (d) =>
      d.date === tomorrowStr &&
      !d.name.toLowerCase().includes("night") &&
      !d.name.toLowerCase().includes("overnight")
  );

  if (!tomorrowPeriod) {
    // Try to find any tomorrow period
    const anyTomorrow = forecast.days.find((d) => d.date === tomorrowStr);
    if (anyTomorrow) {
      return makeDecisionFromPeriod(anyTomorrow);
    }
    return null;
  }

  return makeDecisionFromPeriod(tomorrowPeriod);
}

/**
 * Format decision for email digest
 */
export function formatWearDecisionForDigest(decision: WearDecision): {
  html: string;
  text: string;
} {
  const coatEmoji =
    decision.coat === "heavy" ? "🧥" : decision.coat === "light" ? "🧤" : "👕";
  const umbrellaEmoji = decision.umbrella ? "☔" : "";

  const emojis = `${coatEmoji}${umbrellaEmoji}`.trim();

  const html = `
    <div style="background-color: #f0f9ff; padding: 12px 16px; border-radius: 8px; margin: 8px 0;">
      <div style="font-size: 20px; margin-bottom: 4px;">${emojis}</div>
      <div style="font-size: 14px; font-weight: 600; color: #1e3a5f;">${decision.summary}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
        ${decision.details.temperature}°F (feels like ${decision.details.feelsLike}°F) • ${decision.details.conditions}
      </div>
    </div>
  `;

  const text = `${emojis} ${decision.summary} (${decision.details.temperature}°F, ${decision.details.conditions})`;

  return { html, text };
}

/**
 * Get a simple one-liner for the digest header
 */
export function getQuickWearLine(decision: WearDecision): string {
  if (decision.coat === "none" && !decision.umbrella) {
    return "Perfect weather - dress light!";
  }

  const parts: string[] = [];

  if (decision.coat === "heavy") {
    parts.push("heavy coat");
  } else if (decision.coat === "light") {
    parts.push("light jacket");
  }

  if (decision.umbrella) {
    parts.push("umbrella");
  }

  return `Bring: ${parts.join(" + ")}`;
}
