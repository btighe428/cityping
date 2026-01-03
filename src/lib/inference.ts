// src/lib/inference.ts
/**
 * NYC Ping Zip Code Inference Engine
 *
 * This module implements the intelligent preference inference system that
 * transforms a simple zip code input into a comprehensive set of default
 * user preferences across all six alert modules.
 *
 * The inference engine serves as a critical onboarding optimization:
 * rather than presenting users with a complex preference configuration
 * form, NYC Ping asks only for a zip code and infers sensible defaults
 * based on demographic and infrastructure characteristics of that area.
 *
 * Theoretical Foundation:
 * This approach draws from geodemographic segmentation theory, which
 * posits that "birds of a feather flock together" - residents of a
 * given area tend to share lifestyle characteristics. NYC's unique
 * density amplifies this effect: a Williamsburg resident has markedly
 * different transit patterns than a Staten Island resident, making
 * zip code a surprisingly powerful predictor of alert relevance.
 *
 * The system follows a two-stage process:
 * 1. Profile Inference: Map zip code to ZipProfile using seed data
 * 2. Preference Generation: Transform ZipProfile into ModulePreferences
 *
 * Historical Context:
 * NYC's zip code system (established 1963) predates modern demographic
 * analysis tools but has become deeply correlated with neighborhood
 * identity. The 5-digit codes were designed for mail routing efficiency
 * but have evolved into cultural signifiers - "10001" (Chelsea) carries
 * different connotations than "10314" (Staten Island).
 */

import {
  ZIP_PROFILES,
  DEFAULT_PROFILE,
  ZipProfile,
  ParkingRelevance,
  HousingMarket,
} from "../../prisma/seeds/zip-profiles";

/**
 * Module-specific preference settings structure.
 *
 * Each module has an enabled flag plus module-specific settings.
 * This structure mirrors the UserPreferences schema in Prisma.
 */
export interface ModulePreference<T = Record<string, unknown>> {
  /** Whether this module's alerts are active for the user */
  enabled: boolean;
  /** Module-specific configuration settings */
  settings: T;
}

/**
 * Parking module settings.
 */
export interface ParkingSettings {
  /** Days before ASP rules change to send alerts (0-7) */
  advanceNotice: number;
  /** Whether to include street cleaning alerts */
  streetCleaning: boolean;
}

/**
 * Transit module settings.
 */
export interface TransitSettings {
  /** Subway lines to monitor for service alerts (max 4) */
  subwayLines: string[];
  /** Whether to include weekend schedule changes */
  weekendAlerts: boolean;
  /** Whether to include planned service changes */
  plannedChanges: boolean;
}

/**
 * Housing module settings.
 */
export interface HousingSettings {
  /** Include housing lottery alerts */
  lotteryAlerts: boolean;
  /** Include market-rate rental alerts */
  marketRateAlerts: boolean;
  /** Minimum bedroom count filter (0 = studios included) */
  minBedrooms: number;
  /** Maximum monthly rent filter (0 = no limit) */
  maxRent: number;
}

/**
 * Weather module settings.
 */
export interface WeatherSettings {
  /** Temperature threshold for cold alerts (Fahrenheit) */
  coldThreshold: number;
  /** Temperature threshold for heat alerts (Fahrenheit) */
  heatThreshold: number;
  /** Include precipitation alerts */
  precipAlerts: boolean;
  /** Include air quality alerts */
  airQualityAlerts: boolean;
}

/**
 * Deals module settings.
 */
export interface DealsSettings {
  /** Categories of deals to include */
  categories: string[];
}

/**
 * Events module settings.
 */
export interface EventsSettings {
  /** Event categories to include */
  categories: string[];
  /** Include street closure alerts for events */
  streetClosures: boolean;
}

/**
 * Complete user preferences structure for all six modules.
 */
export interface UserPreferences {
  parking: ModulePreference<ParkingSettings>;
  transit: ModulePreference<TransitSettings>;
  housing: ModulePreference<HousingSettings>;
  weather: ModulePreference<WeatherSettings>;
  deals: ModulePreference<DealsSettings>;
  events: ModulePreference<EventsSettings>;
}

/**
 * Borough-specific default profiles for users who sign up with just a borough.
 */
const BOROUGH_PROFILES: Record<string, ZipProfile> = {
  manhattan: {
    zipCode: "10001",
    neighborhood: "Manhattan",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "A", "C", "E"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 85000,
  },
  brooklyn: {
    zipCode: "11201",
    neighborhood: "Brooklyn",
    borough: "Brooklyn",
    subwayLines: ["2", "3", "4", "5", "A", "C", "F", "G"],
    parkingRelevance: "medium",
    housingMarket: "mixed",
    medianIncome: 65000,
  },
  queens: {
    zipCode: "11101",
    neighborhood: "Queens",
    borough: "Queens",
    subwayLines: ["7", "E", "F", "M", "R", "N", "W"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 70000,
  },
  bronx: {
    zipCode: "10451",
    neighborhood: "The Bronx",
    borough: "Bronx",
    subwayLines: ["2", "4", "5", "6", "B", "D"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 40000,
  },
  staten_island: {
    zipCode: "10301",
    neighborhood: "Staten Island",
    borough: "Staten Island",
    subwayLines: [],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 80000,
  },
};

/**
 * Infers a ZipProfile from a given zip code.
 *
 * This function performs a simple lookup in the ZIP_PROFILES database,
 * returning the DEFAULT_PROFILE for unknown zip codes. The default
 * profile uses conservative settings that enable basic functionality
 * without making strong assumptions about the user's location.
 *
 * @param zipCode - 5-digit USPS zip code string
 * @returns ZipProfile for the specified zip code, or DEFAULT_PROFILE if unknown
 *
 * @example
 * const profile = inferProfileFromZip("11211");
 * // Returns: { zipCode: "11211", neighborhood: "Williamsburg (North)", ... }
 *
 * @example
 * const unknown = inferProfileFromZip("99999");
 * // Returns: DEFAULT_PROFILE with neighborhood "Unknown Neighborhood"
 */
export function inferProfileFromZip(zipCode: string): ZipProfile {
  return ZIP_PROFILES[zipCode] ?? DEFAULT_PROFILE;
}

/**
 * Infers a ZipProfile from a borough name.
 *
 * @param borough - Borough identifier (manhattan, brooklyn, queens, bronx, staten_island)
 * @returns ZipProfile for the specified borough, or DEFAULT_PROFILE if unknown
 */
export function inferProfileFromBorough(borough: string): ZipProfile {
  return BOROUGH_PROFILES[borough] ?? DEFAULT_PROFILE;
}

/**
 * Determines if parking alerts should be enabled based on parking relevance.
 *
 * The heuristic: areas with "high" or "medium" parking relevance benefit
 * from parking alerts, while "low" relevance areas (typically transit-heavy
 * Manhattan neighborhoods) see minimal value from ASP notifications.
 *
 * @param relevance - ParkingRelevance classification
 * @returns true if parking alerts should be enabled by default
 */
function shouldEnableParking(relevance: ParkingRelevance): boolean {
  return relevance === "high" || relevance === "medium";
}

/**
 * Determines if housing alerts should be enabled based on housing market.
 *
 * The heuristic: rental and mixed markets benefit from housing lottery
 * and rental alerts, while ownership-heavy markets have less demand
 * for these notifications (residents are more likely to be homeowners).
 *
 * @param market - HousingMarket classification
 * @returns true if housing alerts should be enabled by default
 */
function shouldEnableHousing(market: HousingMarket): boolean {
  return market === "rental" || market === "mixed";
}

/**
 * Selects the top N subway lines from a profile for transit alerts.
 *
 * When a zip code has access to many subway lines (common in central
 * Manhattan), we limit to 4 lines to prevent notification fatigue.
 * Lines are taken in order from the profile, which typically lists
 * them by proximity/relevance.
 *
 * @param subwayLines - Array of subway line designations
 * @param limit - Maximum number of lines to return (default 4)
 * @returns Array of subway lines, limited to the specified count
 */
function selectTopSubwayLines(subwayLines: string[], limit: number = 4): string[] {
  return subwayLines.slice(0, limit);
}

/**
 * Generates default user preferences from a ZipProfile.
 *
 * This is the core inference function that transforms demographic/infrastructure
 * data into actionable preference settings. The generated preferences follow
 * these principles:
 *
 * 1. **Conservative defaults**: When uncertain, enable rather than disable
 *    (users can easily turn off unwanted alerts, but may miss value if
 *    alerts are disabled by default)
 *
 * 2. **Location-appropriate**: Use parking relevance and housing market
 *    data to make sensible on/off decisions
 *
 * 3. **Manageable scope**: Limit subway lines to prevent overwhelming
 *    users in transit-rich areas
 *
 * 4. **Universal basics**: Always enable weather, deals, and events
 *    as these have broad appeal regardless of location
 *
 * @param profile - ZipProfile to generate preferences from
 * @returns UserPreferences with all six modules configured
 *
 * @example
 * const profile = inferProfileFromZip("11211");
 * const prefs = generateDefaultPreferences(profile);
 * // prefs.parking.enabled = false (low parking relevance)
 * // prefs.transit.enabled = true (has subway lines)
 * // prefs.housing.enabled = true (rental market)
 */
export function generateDefaultPreferences(profile: ZipProfile): UserPreferences {
  const hasSubwayAccess = profile.subwayLines.length > 0;

  return {
    parking: {
      enabled: shouldEnableParking(profile.parkingRelevance),
      settings: {
        advanceNotice: 1, // 1 day advance notice is standard
        streetCleaning: true,
      },
    },

    transit: {
      enabled: hasSubwayAccess,
      settings: {
        subwayLines: selectTopSubwayLines(profile.subwayLines),
        weekendAlerts: true,
        plannedChanges: true,
      },
    },

    housing: {
      enabled: shouldEnableHousing(profile.housingMarket),
      settings: {
        lotteryAlerts: true,
        marketRateAlerts: profile.housingMarket !== "ownership",
        minBedrooms: 0, // Include studios
        maxRent: 0, // No limit by default
      },
    },

    weather: {
      enabled: true, // Weather is universally relevant
      settings: {
        coldThreshold: 32, // Freezing point
        heatThreshold: 90, // Heat advisory threshold
        precipAlerts: true,
        airQualityAlerts: true,
      },
    },

    deals: {
      enabled: true, // Deals have broad appeal
      settings: {
        categories: ["food", "entertainment", "services"],
      },
    },

    events: {
      enabled: true, // Events have broad appeal in NYC
      settings: {
        categories: ["free", "outdoor", "cultural"],
        streetClosures: shouldEnableParking(profile.parkingRelevance), // Only relevant for drivers
      },
    },
  };
}

/**
 * Creates a new user with inferred preferences from their borough or zip code.
 *
 * This async function orchestrates the full user creation flow:
 * 1. Infer profile from borough (or zip code if provided)
 * 2. Generate default preferences
 * 3. Create user record with preferences in database
 *
 * Note: This function requires a Prisma client instance and user data.
 * It's designed to be called from API routes or server actions.
 *
 * @param db - Prisma client instance
 * @param userData - User registration data including borough (required) and optional zipCode
 * @returns Created user record with preferences
 *
 * @example
 * const user = await createUserWithInferredPreferences(prisma, {
 *   email: "user@example.com",
 *   borough: "brooklyn",
 *   phone: "+1234567890",
 * });
 */
export async function createUserWithInferredPreferences(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userData: {
    email: string;
    borough: string;
    zipCode?: string;
    phone?: string;
  }
): Promise<unknown> {
  // Use zip code profile if provided, otherwise use borough profile
  const profile = userData.zipCode
    ? inferProfileFromZip(userData.zipCode)
    : inferProfileFromBorough(userData.borough);
  const preferences = generateDefaultPreferences(profile);

  // Create user with inferred data and module preferences in a transaction
  const user = await db.$transaction(async (tx: typeof db) => {
    // Create the user record
    const newUser = await tx.user.create({
      data: {
        email: userData.email,
        phone: userData.phone,
        zipCode: userData.zipCode || null,
        preferredBorough: userData.borough || null,
        inferredNeighborhood: profile.neighborhood,
        inferredSubwayLines: profile.subwayLines,
        inferredHasParking: shouldEnableParking(profile.parkingRelevance),
      },
    });

    // Create UserModulePreference records for each module
    // Module IDs: parking, transit, events, housing, food (sample sales), deals
    const modulePrefs = [
      { moduleId: "parking", enabled: preferences.parking.enabled, settings: preferences.parking.settings },
      { moduleId: "transit", enabled: preferences.transit.enabled, settings: preferences.transit.settings },
      { moduleId: "housing", enabled: preferences.housing.enabled, settings: preferences.housing.settings },
      { moduleId: "food", enabled: true, settings: { categories: ["fashion", "designer", "accessories"] } }, // Sample sales
      { moduleId: "events", enabled: preferences.events.enabled, settings: preferences.events.settings },
      { moduleId: "deals", enabled: preferences.deals.enabled, settings: preferences.deals.settings },
    ];

    for (const pref of modulePrefs) {
      await tx.userModulePreference.create({
        data: {
          userId: newUser.id,
          moduleId: pref.moduleId,
          enabled: pref.enabled,
          settings: pref.settings,
          isInferred: true,
        },
      });
    }

    return newUser;
  });

  return user;
}

// Re-export types for consumers
export type { ZipProfile, ParkingRelevance, HousingMarket };
