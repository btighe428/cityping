// prisma/seeds/zip-profiles.ts
/**
 * NYC Zip Code Profile Data for User Inference
 *
 * This module provides demographic and infrastructure profiles for NYC zip codes,
 * enabling intelligent default preferences when users sign up with only a zip code.
 *
 * The inference system uses these profiles to:
 * 1. Populate `inferredNeighborhood` on the User model
 * 2. Set `inferredSubwayLines` for transit alert relevance filtering
 * 3. Determine `inferredHasParking` for parking module opt-in defaults
 *
 * Data sources (approximate, for inference purposes):
 * - NYC Planning Department neighborhood tabulations
 * - MTA subway line coverage by zip code
 * - US Census Bureau American Community Survey (median income)
 * - NYC Housing market classifications from HPD and REBNY reports
 *
 * Historical Context:
 * NYC's zip code system follows patterns established in the 1963 Zone Improvement Plan.
 * Manhattan codes (100xx) were among the first assigned nationally. Brooklyn (112xx),
 * Queens (111xx-114xx), Bronx (104xx), and Staten Island (103xx) followed regional
 * postal distribution patterns. These boundaries often align with historical
 * neighborhood development and infrastructure investment patterns, making zip codes
 * a surprisingly effective proxy for lifestyle characteristics in dense urban areas.
 */

/**
 * Parking relevance classification for a zip code area.
 *
 * This enum represents the likelihood that residents in a given zip code
 * own or regularly operate a personal vehicle, based on:
 * - Street parking availability and competition
 * - Garage density and pricing
 * - Transit accessibility (inverse correlation)
 * - Historical car ownership rates
 *
 * Classification thresholds:
 * - high: >40% households own vehicles, significant ASP impact
 * - medium: 20-40% vehicle ownership, mixed transit/driving patterns
 * - low: <20% vehicle ownership, primarily transit-dependent
 */
export type ParkingRelevance = "high" | "medium" | "low";

/**
 * Housing market classification for a zip code area.
 *
 * Determines default preferences for housing lottery and real estate alerts:
 * - rental: Majority renter-occupied, high turnover, lottery alerts relevant
 * - mixed: Balanced ownership/rental, both alert types applicable
 * - ownership: Majority owner-occupied, market rate alerts more relevant
 *
 * Based on Census Bureau tenure data and NYC HPD housing surveys.
 */
export type HousingMarket = "rental" | "mixed" | "ownership";

/**
 * Comprehensive profile for a NYC zip code area.
 *
 * Each profile encapsulates demographic, infrastructure, and lifestyle
 * characteristics used for intelligent default preference inference.
 */
export interface ZipProfile {
  /** 5-digit USPS zip code */
  zipCode: string;

  /** Common neighborhood name(s) for the area */
  neighborhood: string;

  /** NYC borough: Brooklyn, Manhattan, Queens, Bronx, Staten Island */
  borough: "Brooklyn" | "Manhattan" | "Queens" | "Bronx" | "Staten Island";

  /**
   * MTA subway lines serving stations within or adjacent to the zip code.
   * Uses official MTA line designations (1-7, A-Z, L, S variants).
   * Multiple lines indicate transfer hubs or overlapping coverage.
   */
  subwayLines: string[];

  /**
   * Relevance of parking/driving alerts based on vehicle ownership patterns.
   * Inversely correlated with transit accessibility in most cases.
   */
  parkingRelevance: ParkingRelevance;

  /**
   * Predominant housing tenure pattern affecting alert preferences.
   * Rental-heavy areas show higher engagement with housing lottery alerts.
   */
  housingMarket: HousingMarket;

  /**
   * Approximate median household income (USD, annual).
   * Derived from ACS 5-year estimates, rounded for inference purposes.
   * Used for deals/financial product relevance scoring.
   */
  medianIncome: number;
}

/**
 * NYC Zip Code Profiles Database
 *
 * Organized by borough, then by neighborhood clustering.
 * Each entry represents a distinct zip code with its inferred characteristics.
 *
 * Coverage includes:
 * - All major residential areas in the five boroughs
 * - High-density commercial/residential mixed-use zones
 * - Emerging neighborhoods with significant development activity
 *
 * Note: This is not exhaustive of all ~200 NYC zip codes. Additional codes
 * can be added based on user signup patterns and coverage needs.
 */
export const ZIP_PROFILES: Record<string, ZipProfile> = {
  // ============================================================================
  // BROOKLYN (112xx)
  // Brooklyn's zip codes reflect its evolution from independent city (pre-1898)
  // to NYC's most populous borough. Western codes near Manhattan show higher
  // transit usage; eastern codes trend toward more vehicle dependency.
  // ============================================================================

  "11201": {
    zipCode: "11201",
    neighborhood: "Brooklyn Heights / DUMBO",
    borough: "Brooklyn",
    subwayLines: ["A", "C", "F", "2", "3", "4", "5", "R"],
    parkingRelevance: "low",
    housingMarket: "mixed",
    medianIncome: 135000,
  },

  "11205": {
    zipCode: "11205",
    neighborhood: "Fort Greene / Clinton Hill",
    borough: "Brooklyn",
    subwayLines: ["C", "G", "B", "Q", "R"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 78000,
  },

  "11206": {
    zipCode: "11206",
    neighborhood: "Williamsburg (East) / Bushwick",
    borough: "Brooklyn",
    subwayLines: ["J", "M", "Z", "G", "L"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 52000,
  },

  "11211": {
    zipCode: "11211",
    neighborhood: "Williamsburg (North)",
    borough: "Brooklyn",
    subwayLines: ["L", "G", "J", "M"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 95000,
  },

  "11215": {
    zipCode: "11215",
    neighborhood: "Park Slope",
    borough: "Brooklyn",
    subwayLines: ["F", "G", "R", "D", "N", "2", "3"],
    parkingRelevance: "medium",
    housingMarket: "ownership",
    medianIncome: 142000,
  },

  "11216": {
    zipCode: "11216",
    neighborhood: "Bedford-Stuyvesant",
    borough: "Brooklyn",
    subwayLines: ["A", "C", "G", "S"],
    parkingRelevance: "medium",
    housingMarket: "mixed",
    medianIncome: 62000,
  },

  "11217": {
    zipCode: "11217",
    neighborhood: "Boerum Hill / Gowanus",
    borough: "Brooklyn",
    subwayLines: ["F", "G", "R", "2", "3", "4", "5", "B", "D", "N", "Q"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 115000,
  },

  "11218": {
    zipCode: "11218",
    neighborhood: "Kensington / Windsor Terrace",
    borough: "Brooklyn",
    subwayLines: ["F", "G", "Q", "B"],
    parkingRelevance: "medium",
    housingMarket: "mixed",
    medianIncome: 68000,
  },

  "11219": {
    zipCode: "11219",
    neighborhood: "Borough Park",
    borough: "Brooklyn",
    subwayLines: ["D", "F", "N"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 48000,
  },

  "11220": {
    zipCode: "11220",
    neighborhood: "Sunset Park",
    borough: "Brooklyn",
    subwayLines: ["D", "N", "R"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 55000,
  },

  "11221": {
    zipCode: "11221",
    neighborhood: "Bushwick",
    borough: "Brooklyn",
    subwayLines: ["J", "M", "Z", "L"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 48000,
  },

  "11222": {
    zipCode: "11222",
    neighborhood: "Greenpoint",
    borough: "Brooklyn",
    subwayLines: ["G"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 98000,
  },

  "11225": {
    zipCode: "11225",
    neighborhood: "Crown Heights / Prospect-Lefferts Gardens",
    borough: "Brooklyn",
    subwayLines: ["2", "5", "S", "Q", "B"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 58000,
  },

  "11226": {
    zipCode: "11226",
    neighborhood: "Flatbush",
    borough: "Brooklyn",
    subwayLines: ["2", "5", "Q", "B"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 52000,
  },

  "11231": {
    zipCode: "11231",
    neighborhood: "Carroll Gardens / Red Hook",
    borough: "Brooklyn",
    subwayLines: ["F", "G"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 125000,
  },

  "11232": {
    zipCode: "11232",
    neighborhood: "Sunset Park (Industry City)",
    borough: "Brooklyn",
    subwayLines: ["D", "N", "R"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 45000,
  },

  "11233": {
    zipCode: "11233",
    neighborhood: "Bedford-Stuyvesant (East) / Ocean Hill",
    borough: "Brooklyn",
    subwayLines: ["A", "C", "J", "Z", "L", "3"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 48000,
  },

  "11234": {
    zipCode: "11234",
    neighborhood: "Flatlands / Mill Basin",
    borough: "Brooklyn",
    subwayLines: ["2", "5"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 72000,
  },

  "11235": {
    zipCode: "11235",
    neighborhood: "Brighton Beach / Coney Island",
    borough: "Brooklyn",
    subwayLines: ["B", "Q", "D", "N", "F"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 48000,
  },

  "11236": {
    zipCode: "11236",
    neighborhood: "Canarsie",
    borough: "Brooklyn",
    subwayLines: ["L"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 62000,
  },

  "11237": {
    zipCode: "11237",
    neighborhood: "Bushwick / Ridgewood Border",
    borough: "Brooklyn",
    subwayLines: ["L", "M"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 52000,
  },

  "11238": {
    zipCode: "11238",
    neighborhood: "Prospect Heights / Crown Heights",
    borough: "Brooklyn",
    subwayLines: ["2", "3", "4", "B", "Q", "S"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 85000,
  },

  "11249": {
    zipCode: "11249",
    neighborhood: "Williamsburg (South) / Kent Ave",
    borough: "Brooklyn",
    subwayLines: ["L", "J", "M", "Z"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 125000,
  },

  // ============================================================================
  // MANHATTAN (100xx)
  // Manhattan's zip codes, among the first assigned in the US postal system,
  // follow a rough south-to-north progression. The borough's exceptional transit
  // density results in uniformly low parking relevance except in peripheral areas.
  // ============================================================================

  "10001": {
    zipCode: "10001",
    neighborhood: "Chelsea / Hudson Yards",
    borough: "Manhattan",
    subwayLines: ["A", "C", "E", "1", "2", "3", "7"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 95000,
  },

  "10002": {
    zipCode: "10002",
    neighborhood: "Lower East Side",
    borough: "Manhattan",
    subwayLines: ["F", "J", "M", "Z"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 42000,
  },

  "10003": {
    zipCode: "10003",
    neighborhood: "East Village / Union Square",
    borough: "Manhattan",
    subwayLines: ["4", "5", "6", "L", "N", "Q", "R", "W"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 115000,
  },

  "10004": {
    zipCode: "10004",
    neighborhood: "Financial District (South) / Governors Island",
    borough: "Manhattan",
    subwayLines: ["1", "R", "W", "4", "5"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 155000,
  },

  "10005": {
    zipCode: "10005",
    neighborhood: "Financial District",
    borough: "Manhattan",
    subwayLines: ["2", "3", "4", "5", "J", "Z", "R", "W"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 165000,
  },

  "10006": {
    zipCode: "10006",
    neighborhood: "Financial District (West)",
    borough: "Manhattan",
    subwayLines: ["R", "W", "1", "2", "3", "4", "5"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 145000,
  },

  "10007": {
    zipCode: "10007",
    neighborhood: "Tribeca / City Hall",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "A", "C", "E", "R", "W", "4", "5", "6"],
    parkingRelevance: "low",
    housingMarket: "ownership",
    medianIncome: 225000,
  },

  "10009": {
    zipCode: "10009",
    neighborhood: "East Village (Alphabet City)",
    borough: "Manhattan",
    subwayLines: ["L", "6"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 78000,
  },

  "10010": {
    zipCode: "10010",
    neighborhood: "Gramercy / Flatiron",
    borough: "Manhattan",
    subwayLines: ["6", "L", "N", "R", "W", "4", "5"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 142000,
  },

  "10011": {
    zipCode: "10011",
    neighborhood: "West Village / Chelsea",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "A", "C", "E", "L", "F", "M"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 135000,
  },

  "10012": {
    zipCode: "10012",
    neighborhood: "SoHo / NoHo",
    borough: "Manhattan",
    subwayLines: ["B", "D", "F", "M", "6", "N", "R", "W"],
    parkingRelevance: "low",
    housingMarket: "ownership",
    medianIncome: 165000,
  },

  "10013": {
    zipCode: "10013",
    neighborhood: "Tribeca / Chinatown",
    borough: "Manhattan",
    subwayLines: ["1", "A", "C", "E", "N", "Q", "R", "W", "J", "Z", "6"],
    parkingRelevance: "low",
    housingMarket: "mixed",
    medianIncome: 145000,
  },

  "10014": {
    zipCode: "10014",
    neighborhood: "West Village",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "A", "C", "E", "L"],
    parkingRelevance: "low",
    housingMarket: "ownership",
    medianIncome: 155000,
  },

  "10016": {
    zipCode: "10016",
    neighborhood: "Murray Hill / Kips Bay",
    borough: "Manhattan",
    subwayLines: ["6", "4", "5", "7", "S"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 115000,
  },

  "10017": {
    zipCode: "10017",
    neighborhood: "Grand Central / Tudor City",
    borough: "Manhattan",
    subwayLines: ["4", "5", "6", "7", "S"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 128000,
  },

  "10018": {
    zipCode: "10018",
    neighborhood: "Garment District / Herald Square",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "A", "C", "E", "N", "Q", "R", "W", "B", "D", "F", "M"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 85000,
  },

  "10019": {
    zipCode: "10019",
    neighborhood: "Midtown West / Hell's Kitchen",
    borough: "Manhattan",
    subwayLines: ["A", "C", "E", "B", "D", "1", "N", "Q", "R", "W"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 98000,
  },

  "10021": {
    zipCode: "10021",
    neighborhood: "Upper East Side",
    borough: "Manhattan",
    subwayLines: ["4", "5", "6", "N", "R", "W", "Q"],
    parkingRelevance: "low",
    housingMarket: "ownership",
    medianIncome: 185000,
  },

  "10022": {
    zipCode: "10022",
    neighborhood: "Midtown East / Sutton Place",
    borough: "Manhattan",
    subwayLines: ["4", "5", "6", "E", "M", "N", "R", "W"],
    parkingRelevance: "low",
    housingMarket: "mixed",
    medianIncome: 158000,
  },

  "10023": {
    zipCode: "10023",
    neighborhood: "Upper West Side (Lincoln Center)",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "A", "B", "C", "D"],
    parkingRelevance: "low",
    housingMarket: "ownership",
    medianIncome: 165000,
  },

  "10024": {
    zipCode: "10024",
    neighborhood: "Upper West Side (Natural History Museum)",
    borough: "Manhattan",
    subwayLines: ["1", "B", "C"],
    parkingRelevance: "low",
    housingMarket: "ownership",
    medianIncome: 158000,
  },

  "10025": {
    zipCode: "10025",
    neighborhood: "Upper West Side (Morningside Heights)",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "B", "C"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 98000,
  },

  "10026": {
    zipCode: "10026",
    neighborhood: "Central Harlem",
    borough: "Manhattan",
    subwayLines: ["2", "3", "A", "B", "C", "D"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 52000,
  },

  "10027": {
    zipCode: "10027",
    neighborhood: "Harlem / Columbia University",
    borough: "Manhattan",
    subwayLines: ["1", "A", "B", "C", "D", "2", "3"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 58000,
  },

  "10028": {
    zipCode: "10028",
    neighborhood: "Upper East Side (Yorkville)",
    borough: "Manhattan",
    subwayLines: ["4", "5", "6", "Q"],
    parkingRelevance: "low",
    housingMarket: "ownership",
    medianIncome: 155000,
  },

  "10029": {
    zipCode: "10029",
    neighborhood: "East Harlem (El Barrio)",
    borough: "Manhattan",
    subwayLines: ["6", "4", "5"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 35000,
  },

  "10030": {
    zipCode: "10030",
    neighborhood: "Central Harlem",
    borough: "Manhattan",
    subwayLines: ["2", "3", "A", "B", "C", "D"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 42000,
  },

  "10031": {
    zipCode: "10031",
    neighborhood: "Hamilton Heights / Sugar Hill",
    borough: "Manhattan",
    subwayLines: ["1", "A", "B", "C", "D"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 52000,
  },

  "10032": {
    zipCode: "10032",
    neighborhood: "Washington Heights",
    borough: "Manhattan",
    subwayLines: ["1", "A", "C"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 42000,
  },

  "10033": {
    zipCode: "10033",
    neighborhood: "Washington Heights (North)",
    borough: "Manhattan",
    subwayLines: ["1", "A"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 45000,
  },

  "10034": {
    zipCode: "10034",
    neighborhood: "Inwood",
    borough: "Manhattan",
    subwayLines: ["1", "A"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 48000,
  },

  "10035": {
    zipCode: "10035",
    neighborhood: "East Harlem (North)",
    borough: "Manhattan",
    subwayLines: ["4", "5", "6"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 32000,
  },

  "10036": {
    zipCode: "10036",
    neighborhood: "Times Square / Theater District",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "7", "N", "Q", "R", "W", "S", "A", "C", "E"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 88000,
  },

  "10038": {
    zipCode: "10038",
    neighborhood: "Seaport / Civic Center",
    borough: "Manhattan",
    subwayLines: ["2", "3", "4", "5", "J", "Z", "A", "C"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 125000,
  },

  "10040": {
    zipCode: "10040",
    neighborhood: "Fort George / Hudson Heights",
    borough: "Manhattan",
    subwayLines: ["A"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 42000,
  },

  // ============================================================================
  // QUEENS (111xx - 114xx)
  // Queens' sprawling geography and diverse neighborhoods result in highly
  // variable transit access and parking patterns. Western Queens (near Manhattan)
  // mirrors Manhattan's transit orientation; eastern areas trend suburban.
  // ============================================================================

  "11101": {
    zipCode: "11101",
    neighborhood: "Long Island City",
    borough: "Queens",
    subwayLines: ["7", "E", "M", "G", "N", "W"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 98000,
  },

  "11102": {
    zipCode: "11102",
    neighborhood: "Astoria (North)",
    borough: "Queens",
    subwayLines: ["N", "W"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 72000,
  },

  "11103": {
    zipCode: "11103",
    neighborhood: "Astoria",
    borough: "Queens",
    subwayLines: ["N", "W"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 68000,
  },

  "11104": {
    zipCode: "11104",
    neighborhood: "Sunnyside",
    borough: "Queens",
    subwayLines: ["7"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 65000,
  },

  "11105": {
    zipCode: "11105",
    neighborhood: "Astoria (Ditmars)",
    borough: "Queens",
    subwayLines: ["N", "W"],
    parkingRelevance: "medium",
    housingMarket: "mixed",
    medianIncome: 78000,
  },

  "11106": {
    zipCode: "11106",
    neighborhood: "Astoria (South) / Ravenswood",
    borough: "Queens",
    subwayLines: ["N", "W", "R", "M"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 62000,
  },

  "11109": {
    zipCode: "11109",
    neighborhood: "Long Island City (Hunters Point)",
    borough: "Queens",
    subwayLines: ["7"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 155000,
  },

  "11354": {
    zipCode: "11354",
    neighborhood: "Flushing",
    borough: "Queens",
    subwayLines: ["7"],
    parkingRelevance: "medium",
    housingMarket: "mixed",
    medianIncome: 58000,
  },

  "11355": {
    zipCode: "11355",
    neighborhood: "Flushing (South)",
    borough: "Queens",
    subwayLines: ["7"],
    parkingRelevance: "medium",
    housingMarket: "mixed",
    medianIncome: 52000,
  },

  "11356": {
    zipCode: "11356",
    neighborhood: "College Point",
    borough: "Queens",
    subwayLines: [], // Bus-dependent
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 68000,
  },

  "11358": {
    zipCode: "11358",
    neighborhood: "Auburndale",
    borough: "Queens",
    subwayLines: ["7"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 78000,
  },

  "11368": {
    zipCode: "11368",
    neighborhood: "Corona",
    borough: "Queens",
    subwayLines: ["7"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 48000,
  },

  "11369": {
    zipCode: "11369",
    neighborhood: "East Elmhurst",
    borough: "Queens",
    subwayLines: [], // Near LaGuardia, bus-dependent
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 55000,
  },

  "11372": {
    zipCode: "11372",
    neighborhood: "Jackson Heights",
    borough: "Queens",
    subwayLines: ["7", "E", "F", "M", "R"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 52000,
  },

  "11373": {
    zipCode: "11373",
    neighborhood: "Elmhurst",
    borough: "Queens",
    subwayLines: ["M", "R", "7"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 52000,
  },

  "11374": {
    zipCode: "11374",
    neighborhood: "Rego Park",
    borough: "Queens",
    subwayLines: ["M", "R"],
    parkingRelevance: "medium",
    housingMarket: "mixed",
    medianIncome: 62000,
  },

  "11375": {
    zipCode: "11375",
    neighborhood: "Forest Hills",
    borough: "Queens",
    subwayLines: ["E", "F", "M", "R"],
    parkingRelevance: "medium",
    housingMarket: "mixed",
    medianIncome: 85000,
  },

  "11377": {
    zipCode: "11377",
    neighborhood: "Woodside",
    borough: "Queens",
    subwayLines: ["7", "M", "R"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 58000,
  },

  "11378": {
    zipCode: "11378",
    neighborhood: "Maspeth",
    borough: "Queens",
    subwayLines: ["M"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 72000,
  },

  "11385": {
    zipCode: "11385",
    neighborhood: "Ridgewood",
    borough: "Queens",
    subwayLines: ["L", "M"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 58000,
  },

  "11415": {
    zipCode: "11415",
    neighborhood: "Kew Gardens",
    borough: "Queens",
    subwayLines: ["E", "F"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 68000,
  },

  "11418": {
    zipCode: "11418",
    neighborhood: "Richmond Hill",
    borough: "Queens",
    subwayLines: ["A", "J"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 65000,
  },

  "11419": {
    zipCode: "11419",
    neighborhood: "South Richmond Hill",
    borough: "Queens",
    subwayLines: ["A"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 58000,
  },

  "11432": {
    zipCode: "11432",
    neighborhood: "Jamaica",
    borough: "Queens",
    subwayLines: ["E", "J", "Z", "F"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 52000,
  },

  // ============================================================================
  // BRONX (104xx)
  // The Bronx shows clear transit corridors along subway lines with surrounding
  // areas more vehicle-dependent. Northern Bronx neighborhoods trend suburban
  // with higher parking relevance.
  // ============================================================================

  "10451": {
    zipCode: "10451",
    neighborhood: "South Bronx / Mott Haven",
    borough: "Bronx",
    subwayLines: ["4", "5", "2"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 28000,
  },

  "10452": {
    zipCode: "10452",
    neighborhood: "Highbridge / Concourse",
    borough: "Bronx",
    subwayLines: ["4", "B", "D"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 32000,
  },

  "10453": {
    zipCode: "10453",
    neighborhood: "Morris Heights / University Heights",
    borough: "Bronx",
    subwayLines: ["4", "B", "D"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 28000,
  },

  "10454": {
    zipCode: "10454",
    neighborhood: "Mott Haven / Port Morris",
    borough: "Bronx",
    subwayLines: ["6"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 25000,
  },

  "10455": {
    zipCode: "10455",
    neighborhood: "South Bronx / Longwood",
    borough: "Bronx",
    subwayLines: ["2", "5"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 25000,
  },

  "10456": {
    zipCode: "10456",
    neighborhood: "Morrisania / Claremont",
    borough: "Bronx",
    subwayLines: ["4", "2", "5"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 28000,
  },

  "10457": {
    zipCode: "10457",
    neighborhood: "Tremont",
    borough: "Bronx",
    subwayLines: ["4", "B", "D"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 28000,
  },

  "10458": {
    zipCode: "10458",
    neighborhood: "Belmont / Fordham",
    borough: "Bronx",
    subwayLines: ["4", "B", "D"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 32000,
  },

  "10459": {
    zipCode: "10459",
    neighborhood: "Hunts Point / Longwood",
    borough: "Bronx",
    subwayLines: ["2", "5", "6"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 22000,
  },

  "10460": {
    zipCode: "10460",
    neighborhood: "West Farms / Crotona",
    borough: "Bronx",
    subwayLines: ["2", "5"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 28000,
  },

  "10461": {
    zipCode: "10461",
    neighborhood: "Westchester Square / Morris Park",
    borough: "Bronx",
    subwayLines: ["6"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 52000,
  },

  "10462": {
    zipCode: "10462",
    neighborhood: "Parkchester / Van Nest",
    borough: "Bronx",
    subwayLines: ["6"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 42000,
  },

  "10463": {
    zipCode: "10463",
    neighborhood: "Kingsbridge / Riverdale",
    borough: "Bronx",
    subwayLines: ["1"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 55000,
  },

  "10464": {
    zipCode: "10464",
    neighborhood: "City Island / Pelham Bay",
    borough: "Bronx",
    subwayLines: ["6"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 78000,
  },

  "10465": {
    zipCode: "10465",
    neighborhood: "Throgs Neck / Country Club",
    borough: "Bronx",
    subwayLines: ["6"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 62000,
  },

  "10466": {
    zipCode: "10466",
    neighborhood: "Williamsbridge / Baychester",
    borough: "Bronx",
    subwayLines: ["2", "5"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 52000,
  },

  "10467": {
    zipCode: "10467",
    neighborhood: "Norwood / Bedford Park",
    borough: "Bronx",
    subwayLines: ["4", "B", "D"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 35000,
  },

  "10468": {
    zipCode: "10468",
    neighborhood: "Fordham / University Heights",
    borough: "Bronx",
    subwayLines: ["4", "B", "D"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 32000,
  },

  "10469": {
    zipCode: "10469",
    neighborhood: "Eastchester / Wakefield",
    borough: "Bronx",
    subwayLines: ["2", "5"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 58000,
  },

  "10470": {
    zipCode: "10470",
    neighborhood: "Wakefield / Woodlawn",
    borough: "Bronx",
    subwayLines: ["2", "4"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 52000,
  },

  "10471": {
    zipCode: "10471",
    neighborhood: "Riverdale (North)",
    borough: "Bronx",
    subwayLines: ["1"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 98000,
  },

  "10472": {
    zipCode: "10472",
    neighborhood: "Soundview / Bronx River",
    borough: "Bronx",
    subwayLines: ["6"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 32000,
  },

  "10473": {
    zipCode: "10473",
    neighborhood: "Soundview / Castle Hill",
    borough: "Bronx",
    subwayLines: ["6"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 38000,
  },

  "10474": {
    zipCode: "10474",
    neighborhood: "Hunts Point",
    borough: "Bronx",
    subwayLines: ["6"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 22000,
  },

  "10475": {
    zipCode: "10475",
    neighborhood: "Co-op City",
    borough: "Bronx",
    subwayLines: ["5"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 48000,
  },

  // ============================================================================
  // STATEN ISLAND (103xx)
  // Staten Island's suburban character and limited subway access (SIR only)
  // results in uniformly high parking relevance. The North Shore shows more
  // transit usage via ferry connections.
  // ============================================================================

  "10301": {
    zipCode: "10301",
    neighborhood: "St. George / Stapleton",
    borough: "Staten Island",
    subwayLines: ["SIR"], // Staten Island Railway
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 52000,
  },

  "10302": {
    zipCode: "10302",
    neighborhood: "Port Richmond",
    borough: "Staten Island",
    subwayLines: [], // Bus-dependent
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 48000,
  },

  "10303": {
    zipCode: "10303",
    neighborhood: "Mariners Harbor / Port Ivory",
    borough: "Staten Island",
    subwayLines: [], // Bus-dependent
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 45000,
  },

  "10304": {
    zipCode: "10304",
    neighborhood: "Stapleton / Park Hill",
    borough: "Staten Island",
    subwayLines: ["SIR"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 58000,
  },

  "10305": {
    zipCode: "10305",
    neighborhood: "Rosebank / South Beach",
    borough: "Staten Island",
    subwayLines: ["SIR"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 68000,
  },

  "10306": {
    zipCode: "10306",
    neighborhood: "New Dorp / Midland Beach",
    borough: "Staten Island",
    subwayLines: ["SIR"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 82000,
  },

  "10307": {
    zipCode: "10307",
    neighborhood: "Tottenville",
    borough: "Staten Island",
    subwayLines: ["SIR"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 98000,
  },

  "10308": {
    zipCode: "10308",
    neighborhood: "Great Kills",
    borough: "Staten Island",
    subwayLines: ["SIR"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 88000,
  },

  "10309": {
    zipCode: "10309",
    neighborhood: "Charleston / Pleasant Plains",
    borough: "Staten Island",
    subwayLines: ["SIR"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 95000,
  },

  "10310": {
    zipCode: "10310",
    neighborhood: "West Brighton / Westerleigh",
    borough: "Staten Island",
    subwayLines: [], // Bus-dependent
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 68000,
  },

  "10312": {
    zipCode: "10312",
    neighborhood: "Eltingville / Annadale",
    borough: "Staten Island",
    subwayLines: ["SIR"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 92000,
  },

  "10314": {
    zipCode: "10314",
    neighborhood: "Bull's Head / New Springville",
    borough: "Staten Island",
    subwayLines: [], // Bus-dependent
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 78000,
  },
};

/**
 * Default profile for unknown or unlisted zip codes.
 *
 * Applied when a user provides a zip code not in the ZIP_PROFILES database.
 * Uses conservative defaults optimized for general NYC relevance:
 * - Empty subway lines (no transit-specific filtering)
 * - Medium parking relevance (enables parking alerts by default)
 * - Mixed housing market (enables both rental and ownership alerts)
 * - Median income at NYC overall median (~$70k)
 *
 * The neighborhood and borough are marked as "Unknown" to clearly indicate
 * the inference system lacks specific data for this zip code.
 */
export const DEFAULT_PROFILE: ZipProfile = {
  zipCode: "00000",
  neighborhood: "Unknown Neighborhood",
  borough: "Manhattan", // Default to most common user base
  subwayLines: [],
  parkingRelevance: "medium",
  housingMarket: "mixed",
  medianIncome: 70000,
};

/**
 * Helper function to retrieve a zip profile with fallback to default.
 *
 * @param zipCode - 5-digit USPS zip code string
 * @returns ZipProfile for the specified zip code, or DEFAULT_PROFILE if unknown
 *
 * @example
 * const profile = getZipProfile("11211");
 * // Returns Williamsburg profile
 *
 * const unknown = getZipProfile("99999");
 * // Returns DEFAULT_PROFILE
 */
export function getZipProfile(zipCode: string): ZipProfile {
  return ZIP_PROFILES[zipCode] ?? DEFAULT_PROFILE;
}

/**
 * Determines if a zip profile indicates high parking alert relevance.
 *
 * @param profile - ZipProfile to evaluate
 * @returns true if parkingRelevance is "high" or "medium"
 */
export function hasRelevantParking(profile: ZipProfile): boolean {
  return profile.parkingRelevance === "high" || profile.parkingRelevance === "medium";
}

/**
 * Aggregate statistics for the zip profile database.
 * Useful for monitoring coverage and data quality.
 */
export const ZIP_PROFILE_STATS = {
  totalProfiles: Object.keys(ZIP_PROFILES).length,
  byBorough: {
    Brooklyn: Object.values(ZIP_PROFILES).filter((p) => p.borough === "Brooklyn").length,
    Manhattan: Object.values(ZIP_PROFILES).filter((p) => p.borough === "Manhattan").length,
    Queens: Object.values(ZIP_PROFILES).filter((p) => p.borough === "Queens").length,
    Bronx: Object.values(ZIP_PROFILES).filter((p) => p.borough === "Bronx").length,
    "Staten Island": Object.values(ZIP_PROFILES).filter((p) => p.borough === "Staten Island")
      .length,
  },
} as const;
