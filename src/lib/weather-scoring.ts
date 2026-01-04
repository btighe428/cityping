// src/lib/weather-scoring.ts
/**
 * Weather-Aware Event Scoring Service
 *
 * This module provides weather-based relevance scoring for events, enabling
 * intelligent notification prioritization based on current and forecast conditions.
 * The system promotes weather-appropriate activities while de-emphasizing events
 * that would be negatively impacted by adverse weather.
 *
 * Architectural Position:
 * The weather scoring service integrates with the event matching pipeline,
 * adjusting event scores before notification dispatch. It consumes weather data
 * from the existing weather.ts module (NWS API) and writes to the AlertEvent
 * schema's weatherScore and isWeatherSafe fields.
 *
 * Scoring Philosophy:
 * The system uses a base score of 100, applying adjustments based on:
 * - Precipitation probability (rain, snow, thunderstorms)
 * - Temperature extremes (cold < 40F, heat > 90F)
 * - Wind speed (particularly for outdoor venues)
 * - Venue type sensitivity (OUTDOOR > COVERED > INDOOR)
 *
 * The asymmetric penalty structure reflects real-world utility:
 * - Missing an indoor activity on a rainy day costs little
 * - Attending an outdoor event in a thunderstorm costs a lot
 *
 * Historical Context:
 * Weather-aware recommendation systems emerged from location-based services in
 * the mid-2000s. Research by Lim et al. (2010) at NUS demonstrated significant
 * improvements in POI recommendations when incorporating weather factors.
 * Modern systems like Google Maps, Yelp, and TripAdvisor integrate weather
 * into activity suggestions. NYC Ping applies these principles to civic event
 * recommendations with venue-type-specific sensitivity models.
 *
 * NYC Climate Context:
 * NYC experiences a humid subtropical climate (Koppen: Cfa) with:
 * - Hot summers (avg high 85F in July)
 * - Cold winters (avg low 26F in January)
 * - 50" annual precipitation, distributed year-round
 * - Notable weather events: nor'easters, heat waves, thunderstorms
 *
 * The scoring thresholds are calibrated for NYC's climate patterns.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Weather data input structure.
 * Aligns with NWS API response format from weather.ts module.
 */
export interface WeatherData {
  temperature: number;           // Fahrenheit
  precipProbability: number;     // 0-100 percentage
  windSpeed: number;             // mph
  shortForecast: string;         // NWS text description
  aqi?: number;                  // Air Quality Index (optional)
}

/**
 * Event input for weather scoring.
 * Minimal interface for scoring calculations.
 */
export interface EventInput {
  title: string;
  venueType?: VenueType;
}

/**
 * Venue type classification for weather sensitivity.
 * Matches Prisma schema VenueType enum.
 */
export type VenueType = "INDOOR" | "OUTDOOR" | "COVERED" | "WEATHER_DEPENDENT";

/**
 * Weather condition classification for scoring decisions.
 */
export type WeatherCondition =
  | "clear"
  | "rain"
  | "heavy_rain"
  | "snow"
  | "thunderstorm"
  | "extreme_cold"
  | "extreme_heat"
  | "high_wind"
  | "poor_air";

/**
 * Detailed result from weather score calculation.
 * Provides transparency into scoring decisions for debugging and UI display.
 */
export interface WeatherScoreResult {
  baseScore: number;
  adjustedScore: number;
  weatherCondition: WeatherCondition;
  adjustments: {
    precipitation: number;
    temperature: number;
    wind: number;
    rainyDayBonus: number;
  };
}

// ============================================================================
// SCORING CONSTANTS
// ============================================================================

/**
 * Scoring constants calibrated for NYC climate.
 * These values represent the penalty/bonus applied for each condition.
 *
 * Methodology:
 * Initial values derived from literature review (Guo et al., 2014; Lim et al., 2010)
 * and adjusted based on NYC-specific climate patterns and user feedback.
 */
const SCORING_CONFIG = {
  // Base score for all events
  BASE_SCORE: 100,

  // Precipitation penalties by venue type
  PRECIPITATION: {
    OUTDOOR: {
      LIGHT: -15,      // 30-50% probability
      MODERATE: -30,   // 50-70% probability
      HEAVY: -45,      // >70% probability
    },
    COVERED: {
      LIGHT: -5,
      MODERATE: -10,
      HEAVY: -15,
    },
    INDOOR: {
      BONUS: 5,        // Rainy day activity bonus
    },
    WEATHER_DEPENDENT: {
      ANY: -50,        // Severe penalty for any precipitation
    },
  },

  // Temperature thresholds (Fahrenheit)
  TEMPERATURE: {
    EXTREME_COLD: 15,    // Safety concern
    COLD: 40,            // Uncomfortably cold for outdoor
    COMFORTABLE_LOW: 50,
    COMFORTABLE_HIGH: 85,
    HOT: 90,             // Uncomfortably hot for outdoor
    EXTREME_HEAT: 100,   // Safety concern
  },

  // Temperature penalties by venue type
  TEMPERATURE_PENALTIES: {
    OUTDOOR: {
      COLD: -20,
      HOT: -20,
    },
    COVERED: {
      COLD: -10,
      HOT: -10,
    },
    INDOOR: {
      // No penalty - climate controlled
      COLD: 0,
      HOT: 0,
    },
    WEATHER_DEPENDENT: {
      COLD: -30,
      HOT: -30,
    },
  },

  // Wind speed thresholds (mph)
  WIND: {
    MODERATE: 15,
    HIGH: 25,
    DANGEROUS: 40,
  },

  // Wind penalties by venue type
  WIND_PENALTIES: {
    OUTDOOR: {
      MODERATE: -10,
      HIGH: -20,
    },
    COVERED: {
      MODERATE: -5,
      HIGH: -10,
    },
    INDOOR: {
      MODERATE: 0,
      HIGH: 0,
    },
    WEATHER_DEPENDENT: {
      MODERATE: -25,  // More aggressive for weather-sensitive events
      HIGH: -40,
    },
  },

  // Dangerous condition keywords in forecast
  DANGEROUS_KEYWORDS: [
    "thunderstorm",
    "lightning",
    "tornado",
    "hurricane",
    "blizzard",
    "ice storm",
    "flash flood",
    "extreme",
    "dangerous",
    "hazardous",
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Classifies weather conditions from raw weather data.
 * Uses a priority-based system where more severe conditions take precedence.
 *
 * @param weather - Raw weather data
 * @returns Classified weather condition
 */
function classifyWeather(weather: WeatherData): WeatherCondition {
  const forecast = (weather.shortForecast || "").toLowerCase();

  // Check for dangerous conditions first (highest priority)
  if (forecast.includes("thunderstorm") || forecast.includes("lightning")) {
    return "thunderstorm";
  }

  // Check air quality
  if (weather.aqi && weather.aqi > 150) {
    return "poor_air";
  }

  // Check temperature extremes
  if (weather.temperature >= SCORING_CONFIG.TEMPERATURE.EXTREME_HEAT) {
    return "extreme_heat";
  }
  if (weather.temperature <= SCORING_CONFIG.TEMPERATURE.EXTREME_COLD) {
    return "extreme_cold";
  }

  // Check wind
  if (weather.windSpeed >= SCORING_CONFIG.WIND.DANGEROUS) {
    return "high_wind";
  }

  // Check precipitation
  if (forecast.includes("snow") || forecast.includes("blizzard")) {
    return "snow";
  }
  if (weather.precipProbability >= 70 || forecast.includes("heavy rain")) {
    return "heavy_rain";
  }
  if (weather.precipProbability >= 30 || forecast.includes("rain") || forecast.includes("shower")) {
    return "rain";
  }

  return "clear";
}

/**
 * Calculates precipitation penalty based on probability and venue type.
 *
 * @param precipProbability - Probability of precipitation (0-100)
 * @param venueType - Type of venue
 * @param forecast - Weather forecast text
 * @returns Penalty value (negative) or bonus (positive)
 */
function calculatePrecipitationAdjustment(
  precipProbability: number,
  venueType: VenueType,
  forecast: string
): number {
  const prob = precipProbability ?? 0;
  const forecastLower = (forecast || "").toLowerCase();

  // Indoor venues get a bonus in bad weather (rainy day activity)
  if (venueType === "INDOOR" && prob >= 50) {
    return SCORING_CONFIG.PRECIPITATION.INDOOR.BONUS;
  }

  // Weather-dependent venues get severe penalty for any precipitation
  if (venueType === "WEATHER_DEPENDENT" && (prob >= 20 || forecastLower.includes("rain") || forecastLower.includes("snow"))) {
    return SCORING_CONFIG.PRECIPITATION.WEATHER_DEPENDENT.ANY;
  }

  // No precipitation - no adjustment
  if (prob < 30 && !forecastLower.includes("rain") && !forecastLower.includes("snow")) {
    return 0;
  }

  // Get venue-specific penalties
  const penalties = venueType === "COVERED"
    ? SCORING_CONFIG.PRECIPITATION.COVERED
    : SCORING_CONFIG.PRECIPITATION.OUTDOOR;

  if (prob >= 70 || forecastLower.includes("heavy")) {
    return penalties.HEAVY;
  }
  if (prob >= 50) {
    return penalties.MODERATE;
  }
  return penalties.LIGHT;
}

/**
 * Calculates temperature penalty based on extremes and venue type.
 *
 * @param temperature - Temperature in Fahrenheit
 * @param venueType - Type of venue
 * @returns Penalty value (negative or zero)
 */
function calculateTemperatureAdjustment(
  temperature: number,
  venueType: VenueType
): number {
  const temp = temperature ?? 70; // Default to comfortable if missing
  const penalties = SCORING_CONFIG.TEMPERATURE_PENALTIES[venueType];

  // Check cold threshold
  if (temp < SCORING_CONFIG.TEMPERATURE.COLD) {
    return penalties.COLD;
  }

  // Check hot threshold
  if (temp > SCORING_CONFIG.TEMPERATURE.HOT) {
    return penalties.HOT;
  }

  return 0;
}

/**
 * Calculates wind penalty based on speed and venue type.
 *
 * @param windSpeed - Wind speed in mph
 * @param venueType - Type of venue
 * @returns Penalty value (negative or zero)
 */
function calculateWindAdjustment(
  windSpeed: number,
  venueType: VenueType
): number {
  const speed = windSpeed ?? 0;
  const penalties = SCORING_CONFIG.WIND_PENALTIES[venueType];

  if (speed >= SCORING_CONFIG.WIND.HIGH) {
    return penalties.HIGH;
  }
  if (speed >= SCORING_CONFIG.WIND.MODERATE) {
    return penalties.MODERATE;
  }

  return 0;
}

/**
 * Clamps a value between min and max bounds.
 *
 * @param value - Value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns Clamped value
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Calculates a weather-adjusted relevance score for an event.
 *
 * The score starts at 100 and is adjusted based on:
 * - Precipitation probability and type
 * - Temperature extremes (cold and hot)
 * - Wind speed
 * - Venue type sensitivity
 *
 * Scoring Rules by Venue Type:
 * - OUTDOOR: -30 for rain >50%, -20 for temp <40F or >90F
 * - COVERED: -15 for heavy rain, -10 for extreme temps
 * - INDOOR: +5 for bad weather (rainy day bonus)
 * - WEATHER_DEPENDENT: -50 for any adverse conditions
 *
 * @param event - Event with venue type
 * @param weather - Current or forecast weather data
 * @returns Detailed scoring result with adjustments
 *
 * @example
 * const result = calculateWeatherScore(
 *   { title: "Central Park Concert", venueType: "OUTDOOR" },
 *   { temperature: 75, precipProbability: 10, windSpeed: 5, shortForecast: "Sunny" }
 * );
 * // result.adjustedScore === 100 (ideal conditions)
 *
 * @example
 * const result = calculateWeatherScore(
 *   { title: "Rooftop Bar", venueType: "OUTDOOR" },
 *   { temperature: 95, precipProbability: 60, windSpeed: 20, shortForecast: "Hot with showers" }
 * );
 * // result.adjustedScore < 50 (multiple penalties)
 */
export function calculateWeatherScore(
  event: EventInput,
  weather: WeatherData
): WeatherScoreResult {
  // Default venue type to OUTDOOR if not specified (conservative approach)
  const venueType: VenueType = event.venueType || "OUTDOOR";

  // Classify the weather condition
  const weatherCondition = classifyWeather(weather);

  // Calculate individual adjustments
  const precipitationAdj = calculatePrecipitationAdjustment(
    weather.precipProbability,
    venueType,
    weather.shortForecast
  );

  const temperatureAdj = calculateTemperatureAdjustment(
    weather.temperature,
    venueType
  );

  const windAdj = calculateWindAdjustment(
    weather.windSpeed,
    venueType
  );

  // Determine rainy day bonus (only for indoor venues in bad weather)
  const rainyDayBonus = venueType === "INDOOR" && precipitationAdj > 0
    ? precipitationAdj
    : 0;

  // Calculate total adjustment (excluding rainy day bonus which is included in precipitationAdj)
  const totalAdjustment = precipitationAdj + temperatureAdj + windAdj;

  // Calculate final score, clamped to 0-100 range
  // Note: We allow scores above 100 for the result but clamp for display
  const rawScore = SCORING_CONFIG.BASE_SCORE + totalAdjustment;
  const adjustedScore = clamp(rawScore, 0, 100);

  return {
    baseScore: SCORING_CONFIG.BASE_SCORE,
    adjustedScore: venueType === "INDOOR" && rainyDayBonus > 0
      ? SCORING_CONFIG.BASE_SCORE + rainyDayBonus // Indoor bonus can exceed 100
      : adjustedScore,
    weatherCondition,
    adjustments: {
      precipitation: precipitationAdj < 0 ? precipitationAdj : 0,
      temperature: temperatureAdj,
      wind: windAdj,
      rainyDayBonus: rainyDayBonus,
    },
  };
}

/**
 * Determines if an event is safe to attend given weather conditions.
 *
 * Safety is separate from scoring - an event can have a low score
 * (unpleasant conditions) but still be safe. This function returns false
 * only for genuinely dangerous conditions that could pose health risks
 * or lead to event cancellation.
 *
 * Dangerous Conditions:
 * - Thunderstorms (lightning risk)
 * - Extreme heat (> 100F) for outdoor venues
 * - Extreme cold (< 15F) for outdoor venues
 * - High winds (> 40 mph) for outdoor venues
 * - Any precipitation for WEATHER_DEPENDENT venues
 *
 * @param venueType - Type of venue (null defaults to OUTDOOR)
 * @param weather - Current or forecast weather data
 * @returns true if safe, false if dangerous conditions present
 *
 * @example
 * isWeatherSafe("OUTDOOR", { temperature: 75, precipProbability: 0, windSpeed: 5, shortForecast: "Sunny" });
 * // returns true
 *
 * @example
 * isWeatherSafe("OUTDOOR", { temperature: 75, precipProbability: 50, windSpeed: 5, shortForecast: "Thunderstorms likely" });
 * // returns false (lightning danger)
 */
export function isWeatherSafe(
  venueType: VenueType | null,
  weather: WeatherData
): boolean {
  // Default to OUTDOOR if venue type not specified (conservative approach)
  const effectiveVenueType: VenueType = venueType || "OUTDOOR";
  const forecast = (weather.shortForecast || "").toLowerCase();

  // Indoor venues are always safe from weather
  if (effectiveVenueType === "INDOOR") {
    return true;
  }

  // Check for dangerous keywords in forecast
  for (const keyword of SCORING_CONFIG.DANGEROUS_KEYWORDS) {
    if (forecast.includes(keyword)) {
      return false;
    }
  }

  // Check for thunderstorms specifically (high danger from lightning)
  if (forecast.includes("thunder") || forecast.includes("lightning")) {
    return false;
  }

  // Check extreme temperatures for outdoor/covered venues
  if (weather.temperature >= SCORING_CONFIG.TEMPERATURE.EXTREME_HEAT) {
    return false;
  }
  if (weather.temperature <= SCORING_CONFIG.TEMPERATURE.EXTREME_COLD) {
    return false;
  }

  // Check dangerous wind speeds for outdoor/covered venues
  if (weather.windSpeed >= SCORING_CONFIG.WIND.DANGEROUS) {
    return false;
  }

  // Weather-dependent venues are unsafe with any precipitation
  if (effectiveVenueType === "WEATHER_DEPENDENT") {
    const hasPrecipitation = weather.precipProbability > 20 ||
      forecast.includes("rain") ||
      forecast.includes("snow") ||
      forecast.includes("shower");

    if (hasPrecipitation) {
      return false;
    }
  }

  return true;
}

/**
 * Convenience function to process an event with weather data,
 * returning both the score and safety determination.
 *
 * @param event - Event with venue type
 * @param weather - Current or forecast weather data
 * @returns Combined result with score and safety
 */
export function processEventWeather(
  event: EventInput,
  weather: WeatherData
): WeatherScoreResult & { isSafe: boolean } {
  const scoreResult = calculateWeatherScore(event, weather);
  const isSafe = isWeatherSafe(event.venueType || null, weather);

  return {
    ...scoreResult,
    isSafe,
  };
}
