// src/lib/fallback-routes.ts
/**
 * NYC Subway Fallback Routes Module
 *
 * Provides static mapping of alternative subway routes for common service
 * disruptions across the New York City transit system. This module enables
 * intelligent fallback suggestions when primary routes are affected by delays,
 * planned work, or service changes.
 *
 * Historical Context:
 * The NYC Subway's complexity stems from its origins as three competing systems:
 *
 * 1. Interborough Rapid Transit (IRT) - 1904
 *    Numbered lines (1-7) with smaller car dimensions (8'9" width)
 *    Primarily serves Manhattan north-south corridors and Bronx
 *
 * 2. Brooklyn-Manhattan Transit (BMT) - 1908
 *    Lettered lines (J, M, N, Q, R, W, Z) with larger cars (10' width)
 *    Connects Brooklyn and Queens to Manhattan via multiple bridges/tunnels
 *
 * 3. Independent Subway System (IND) - 1932
 *    Lettered lines (A-G) designed as express alternatives to older routes
 *    City-owned from inception, built with 10' wide cars
 *
 * The 1940 unification under city ownership created the modern system but
 * preserved these physical incompatibilities. Understanding which lines share
 * infrastructure is crucial for effective fallback routing:
 *
 * - A/C share 8th Avenue tracks (can substitute for each other)
 * - B/D share 6th Avenue express tracks
 * - 4/5 share Lexington Avenue express tracks
 * - N/Q/R/W share Broadway (Manhattan) tracks
 *
 * Geographic Parallelism:
 * Manhattan's grid layout creates natural north-south redundancy:
 * - 7th Avenue (1/2/3) parallels 8th Avenue (A/C/E) by 1 block
 * - Lexington Avenue (4/5/6) parallels 6th Avenue (B/D/F/M) by 2 blocks
 * - Broadway (N/Q/R/W) runs diagonally, providing crosstown flexibility
 *
 * Key Transfer Hubs:
 * The system's major interchange stations enable cross-network routing:
 * - Times Square-42nd St: 1/2/3/7/N/Q/R/W/S (all three legacy networks)
 * - 14th St-Union Square: 4/5/6/L/N/Q/R/W (east-west crosstown)
 * - Atlantic Ave-Barclays: 2/3/4/5/B/D/N/Q/R (Brooklyn hub)
 * - Court Square: 7/E/M/G (Queens crosstown)
 * - Jackson Heights: 7/E/F/M/R (Queens hub)
 *
 * Architectural Notes:
 * The fallback mappings are structured as a Record<string, FallbackInfo> where:
 * - Key: Primary subway line designation (e.g., "L", "1", "A")
 * - Value: FallbackInfo containing alternatives array and suggested action text
 *
 * The suggestedAction field provides user-facing guidance that accounts for:
 * - Common transfer points relevant to that line's service area
 * - Walking alternatives where subway redundancy is limited
 * - Express/local relationships for partial service disruptions
 *
 * Data Sources:
 * - MTA Service Alerts historical data (2019-2024)
 * - NYC Transit system maps and station interchange documentation
 * - Historical service disruption analyses (L train shutdown planning, 2019)
 */

/**
 * Represents fallback routing information for a single subway line.
 *
 * @property alternatives - Array of subway line designations that can serve as
 *   substitutes during service disruptions. Ordered by relevance/proximity.
 * @property suggestedAction - Human-readable guidance for commuters, including
 *   specific transfer points and route modifications.
 */
export interface FallbackInfo {
  alternatives: string[];
  suggestedAction: string;
}

/**
 * Represents a complete fallback suggestion for a user-facing notification.
 *
 * @property affectedLine - The subway line experiencing service disruption
 * @property alternatives - Array of alternative subway lines
 * @property suggestedAction - User-facing text with specific routing guidance
 */
export interface FallbackSuggestion {
  affectedLine: string;
  alternatives: string[];
  suggestedAction: string;
}

/**
 * Static mapping of fallback routes for all major NYC subway lines.
 *
 * Each entry maps a subway line to its FallbackInfo, containing:
 * - alternatives: Lines that provide similar geographic coverage
 * - suggestedAction: Specific routing guidance for commuters
 *
 * The alternatives are prioritized by:
 * 1. Geographic parallelism (same corridor, different track)
 * 2. Transfer accessibility (shared stations)
 * 3. Similar destination coverage
 *
 * Note: Shuttle lines (S) are excluded as they have no meaningful alternatives
 * and are typically backed by bus service during disruptions.
 */
export const FALLBACK_ROUTES: Record<string, FallbackInfo> = {
  // ===========================================================================
  // L TRAIN (14th Street-Canarsie Line)
  // ===========================================================================
  /**
   * The L train is unique as the only line crossing 14th Street in Manhattan
   * and the primary Brooklyn-Manhattan link for Williamsburg/Bushwick.
   * Alternatives focus on parallel Brooklyn routes and Williamsburg Bridge access.
   *
   * Key Transfer Points:
   * - Lorimer St: L/G interchange
   * - Marcy Ave: J/M/Z for Williamsburg Bridge
   * - 14th St-Union Square: 4/5/6/N/Q/R/W
   */
  L: {
    alternatives: ["G", "J", "M", "Z"],
    suggestedAction:
      "Take the G to Court Square, transfer to the 7 or E/M for Manhattan. " +
      "Alternatively, J/M/Z from Marcy Ave crosses the Williamsburg Bridge.",
  },

  // ===========================================================================
  // G TRAIN (Crosstown Line)
  // ===========================================================================
  /**
   * The G is Brooklyn/Queens' only crosstown subway line, connecting
   * neighborhoods without requiring a Manhattan transfer.
   * Alternatives involve bus crosstown or transfers through Manhattan.
   */
  G: {
    alternatives: ["L", "F", "A", "C", "7"],
    suggestedAction:
      "Take the L for east-west Brooklyn transit, or F for similar Queens-Brooklyn coverage. " +
      "The 7 train at Court Square provides crosstown Queens service.",
  },

  // ===========================================================================
  // IRT WEST SIDE (1/2/3 - 7th Avenue Line)
  // ===========================================================================
  /**
   * The 1/2/3 serve Manhattan's west side and extend to the Bronx (2/5) and
   * Brooklyn (2/3). The parallel A/C/E (8th Avenue) is one block west.
   *
   * Key Transfer Points:
   * - Times Square: 1/2/3/7/N/Q/R/W/A/C/E/S
   * - 14th St: 1/2/3/A/C/E/L
   * - Chambers St: 1/2/3/A/C
   */
  "1": {
    alternatives: ["A", "C", "E", "2", "3"],
    suggestedAction:
      "Take the A/C/E via 8th Avenue (one block west). " +
      "For express service, transfer to 2/3 at Chambers, 14th, 72nd, or 96th St.",
  },

  "2": {
    alternatives: ["1", "3", "4", "5", "A", "C"],
    suggestedAction:
      "Use the 1 or 3 for local service on 7th Avenue. " +
      "A/C provides parallel 8th Avenue express service. " +
      "For Bronx destinations, 4/5 serves similar areas via Lexington.",
  },

  "3": {
    alternatives: ["1", "2", "4", "5", "A", "C"],
    suggestedAction:
      "Take the 2 for express service or 1 for local. " +
      "A/C on 8th Avenue provides parallel service one block west.",
  },

  // ===========================================================================
  // IRT EAST SIDE (4/5/6 - Lexington Avenue Line)
  // ===========================================================================
  /**
   * The 4/5/6 are Manhattan's only east side subway lines, making alternatives
   * less direct. The 7 train provides crosstown service at Grand Central,
   * and buses (M15, M101-103) supplement during disruptions.
   *
   * Key Transfer Points:
   * - Grand Central: 4/5/6/7/S
   * - 14th St-Union Square: 4/5/6/L/N/Q/R/W
   * - 59th St: 4/5/6/N/R/W
   */
  "4": {
    alternatives: ["5", "6", "7", "N", "R", "W"],
    suggestedAction:
      "Use the 5 (same express tracks) or 6 (local). " +
      "Take the 7 at Grand Central for crosstown to Times Square. " +
      "N/R/W via 59th St provides Broadway access.",
  },

  "5": {
    alternatives: ["4", "6", "7", "2", "3"],
    suggestedAction:
      "Use the 4 (same express tracks) or 6 (local). " +
      "At Fulton St (Brooklyn), transfer to 2/3 for Brooklyn service. " +
      "7 at Grand Central provides crosstown options.",
  },

  "6": {
    alternatives: ["4", "5", "7", "N", "R", "W", "Q"],
    suggestedAction:
      "Take the 4/5 express for faster service. " +
      "Q train on Second Avenue (UES) provides parallel service. " +
      "7 train at Grand Central for crosstown to west side.",
  },

  // ===========================================================================
  // IND 8TH AVENUE (A/C/E)
  // ===========================================================================
  /**
   * The A/C/E serve 8th Avenue in Manhattan, with the A continuing to Far
   * Rockaway/Lefferts and C to Euclid Ave in Brooklyn. E serves Queens.
   *
   * Key Transfer Points:
   * - 14th St: A/C/E/L
   * - 42nd St-Port Authority: A/C/E/N/Q/R/W/S/1/2/3/7
   * - West 4th St: A/C/E/B/D/F/M
   */
  A: {
    alternatives: ["C", "E", "B", "D", "1", "2", "3"],
    suggestedAction:
      "Take the C (local on same tracks) or B/D via 6th Avenue. " +
      "1/2/3 on 7th Avenue (one block east) provides parallel service.",
  },

  C: {
    alternatives: ["A", "E", "B", "D", "1"],
    suggestedAction:
      "Take the A express or E (same Manhattan stops). " +
      "B/D on 6th Avenue provides similar midtown coverage. " +
      "1 train on 7th Avenue (one block east) for local service.",
  },

  E: {
    alternatives: ["A", "C", "F", "M", "7"],
    suggestedAction:
      "Use the A/C for 8th Avenue Manhattan service. " +
      "F/M via 6th Avenue serves similar Queens destinations. " +
      "7 train at Court Square for Flushing line access.",
  },

  // ===========================================================================
  // IND 6TH AVENUE (B/D/F/M)
  // ===========================================================================
  /**
   * The B/D/F/M share 6th Avenue in Manhattan. B/D run express, F/M local.
   * B and D diverge in the Bronx and Brooklyn; F extends to Coney Island.
   *
   * Key Transfer Points:
   * - 47-50 St Rockefeller Center: B/D/F/M
   * - West 4th St: A/C/E/B/D/F/M
   * - Herald Square: B/D/F/M/N/Q/R/W
   */
  B: {
    alternatives: ["D", "F", "M", "A", "C"],
    suggestedAction:
      "Take the D (same express tracks) or F/M (local). " +
      "A/C on 8th Avenue provides parallel service one block west.",
  },

  D: {
    alternatives: ["B", "F", "M", "N", "Q", "4"],
    suggestedAction:
      "Use the B (same express tracks) or F/M (local) for 6th Avenue. " +
      "N/Q at Herald Square for Broadway service. " +
      "4 train at Atlantic Ave for Bronx destinations.",
  },

  F: {
    alternatives: ["B", "D", "M", "E", "G"],
    suggestedAction:
      "Take B/D express or M (same local tracks) for 6th Avenue. " +
      "E train provides similar Queens coverage via 53rd St tunnel. " +
      "G at Bergen St for Brooklyn crosstown.",
  },

  M: {
    alternatives: ["F", "B", "D", "J", "Z", "E"],
    suggestedAction:
      "Use the F (same local tracks) or B/D express for 6th Avenue. " +
      "J/Z at Delancey-Essex for Brooklyn service via Williamsburg Bridge. " +
      "E at Court Square for Queens access.",
  },

  // ===========================================================================
  // BMT BROADWAY (N/Q/R/W)
  // ===========================================================================
  /**
   * The N/Q/R/W share Broadway tracks in Manhattan. N/Q/W run express,
   * R runs local. All serve Brooklyn via different routes.
   *
   * Key Transfer Points:
   * - Times Square: N/Q/R/W/1/2/3/7/S
   * - Herald Square: N/Q/R/W/B/D/F/M
   * - Union Square: N/Q/R/W/4/5/6/L
   */
  N: {
    alternatives: ["Q", "R", "W", "B", "D"],
    suggestedAction:
      "Take the Q (same express tracks) or R/W for Broadway service. " +
      "B/D at Herald Square provides 6th Avenue express to Brooklyn.",
  },

  Q: {
    alternatives: ["N", "R", "W", "B", "D", "6"],
    suggestedAction:
      "Use the N (same express tracks) or R/W for Broadway. " +
      "6 train at Canal St for Lexington Avenue service. " +
      "B/D at DeKalb Ave for Brooklyn connections.",
  },

  R: {
    alternatives: ["N", "Q", "W", "D", "4", "5"],
    suggestedAction:
      "Take N/Q/W for express Broadway service. " +
      "D at Atlantic Ave for 6th Avenue express. " +
      "4/5 at Borough Hall for Lexington Avenue service.",
  },

  W: {
    alternatives: ["N", "Q", "R", "D"],
    suggestedAction:
      "Use N/Q express or R local on Broadway. " +
      "D at Herald Square for 6th Avenue service to the Bronx.",
  },

  // ===========================================================================
  // BMT NASSAU STREET (J/Z)
  // ===========================================================================
  /**
   * The J/Z serve the Williamsburg Bridge and Jamaica, Queens.
   * They're critical for Southeast Brooklyn and Richmond Hill.
   *
   * Key Transfer Points:
   * - Delancey-Essex: J/Z/F/M
   * - Marcy Ave: J/M/Z (G at nearby Broadway)
   * - Chambers St: J/Z/4/5/6
   */
  J: {
    alternatives: ["Z", "M", "L", "3"],
    suggestedAction:
      "Take the Z (same route, skip-stop pattern) or M at Essex St. " +
      "L at Marcy Ave for Williamsburg-Manhattan service. " +
      "3 at Livonia Ave for Eastern Brooklyn.",
  },

  Z: {
    alternatives: ["J", "M", "L"],
    suggestedAction:
      "Use the J (same route, different stops) or M at Essex St. " +
      "L at Marcy Ave provides Williamsburg Bridge alternative.",
  },

  // ===========================================================================
  // IRT FLUSHING (7 Train)
  // ===========================================================================
  /**
   * The 7 train is Queens' primary east-west line, from Flushing to Hudson Yards.
   * It's the only line serving much of central Queens directly.
   *
   * Key Transfer Points:
   * - Times Square: 7/1/2/3/N/Q/R/W/S
   * - Grand Central: 7/4/5/6/S
   * - Court Square: 7/E/M/G
   * - Jackson Heights: 7/E/F/M/R
   */
  "7": {
    alternatives: ["E", "F", "M", "R", "N", "W"],
    suggestedAction:
      "Take E/F/M/R at Jackson Heights-Roosevelt Ave for Queens Boulevard service. " +
      "N/W at Queensboro Plaza provides Astoria access. " +
      "Court Square transfers to E/M/G for Brooklyn-Queens crosstown.",
  },
};

/**
 * Retrieves alternative subway lines for a given affected line.
 *
 * This function provides O(1) lookup for fallback alternatives, enabling
 * real-time alert processing without database queries.
 *
 * @param line - Subway line designation (e.g., "L", "1", "A")
 * @returns Array of alternative line designations, or empty array if unknown
 *
 * @example
 * // Get alternatives for L train
 * const alts = getAlternativeLines("L");
 * // Returns: ["G", "J", "M", "Z"]
 *
 * @example
 * // Unknown line returns empty array
 * const alts = getAlternativeLines("XYZ");
 * // Returns: []
 */
export function getAlternativeLines(line: string): string[] {
  // Normalize input to uppercase for consistent lookup
  const normalized = line.toUpperCase().trim();

  // Return alternatives or empty array for unknown lines
  const fallbackInfo = FALLBACK_ROUTES[normalized];
  return fallbackInfo?.alternatives ?? [];
}

/**
 * Generates fallback route suggestions for multiple affected subway lines.
 *
 * This function processes an array of affected lines and returns enriched
 * FallbackSuggestion objects suitable for user-facing notifications. It:
 * - Normalizes input to uppercase
 * - Filters out unknown lines
 * - Deduplicates repeated lines
 * - Returns complete suggestion objects with action text
 *
 * The function is designed for integration with the commute alert system,
 * where multiple lines may be affected by a single incident.
 *
 * @param affectedLines - Array of subway line designations experiencing disruption
 * @returns Array of FallbackSuggestion objects with alternatives and guidance
 *
 * @example
 * // Single line affected
 * const suggestions = getFallbackRoutes(["L"]);
 * // Returns: [{ affectedLine: "L", alternatives: ["G","J","M","Z"], suggestedAction: "..." }]
 *
 * @example
 * // Multiple lines affected
 * const suggestions = getFallbackRoutes(["A", "C", "E"]);
 * // Returns array with 3 suggestions
 *
 * @example
 * // Unknown lines filtered out
 * const suggestions = getFallbackRoutes(["L", "XYZ"]);
 * // Returns: [{ affectedLine: "L", ... }] - XYZ ignored
 */
export function getFallbackRoutes(affectedLines: string[]): FallbackSuggestion[] {
  // Handle empty input
  if (!affectedLines || affectedLines.length === 0) {
    return [];
  }

  // Normalize, deduplicate, and filter to known lines
  const seen = new Set<string>();
  const suggestions: FallbackSuggestion[] = [];

  for (const line of affectedLines) {
    // Normalize to uppercase
    const normalized = line.toUpperCase().trim();

    // Skip duplicates
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);

    // Look up fallback info
    const fallbackInfo = FALLBACK_ROUTES[normalized];

    // Skip unknown lines
    if (!fallbackInfo) {
      continue;
    }

    // Build suggestion object
    suggestions.push({
      affectedLine: normalized,
      alternatives: fallbackInfo.alternatives,
      suggestedAction: fallbackInfo.suggestedAction,
    });
  }

  return suggestions;
}
