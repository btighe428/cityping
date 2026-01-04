/**
 * Commute Alert Generator Module
 *
 * Generates personalized morning commute alerts by combining:
 * 1. User location data (ZIP code -> station mapping)
 * 2. Active MTA service alerts (real-time disruption data)
 * 3. Fallback route suggestions (intelligent alternatives)
 * 4. AI-generated natural language messaging (Claude Haiku)
 *
 * Historical Context:
 * The NYC subway's complexity creates unique challenges for commuter alerts.
 * Unlike simpler transit systems, a single disruption on the L train can
 * cascade into recommended alternatives across three different legacy networks
 * (IRT, BMT, IND). This module abstracts that complexity into actionable,
 * personalized guidance.
 *
 * Design Philosophy:
 * The alert generation follows a "progressive enhancement" pattern:
 * 1. Base layer: Determine if user is affected (station mapping)
 * 2. Context layer: Identify which specific lines are disrupted
 * 3. Routing layer: Calculate fallback options (static mapping)
 * 4. Presentation layer: Generate human-friendly messaging (AI)
 *
 * Each layer can function independently, allowing graceful degradation:
 * - AI unavailable? Use template-based messaging
 * - Unknown ZIP? Skip personalization
 * - No fallbacks? Still report the disruption
 *
 * Integration Points:
 * - station-mapping.ts: ZIP-to-station mapping
 * - fallback-routes.ts: Alternative route suggestions
 * - Claude Haiku API: Natural language generation
 * - MTA GTFS-RT: Real-time alert data (via mta-subway-alerts.ts)
 *
 * Data Flow:
 * User ZIP -> StationInfo[] -> affectedLines intersection with alerts ->
 * FallbackSuggestions -> AI prompt -> CommuteAlert
 */

import {
  getNearestStations,
  StationInfo,
  ZIP_TO_STATIONS,
} from "./station-mapping";
import {
  getFallbackRoutes,
  FallbackSuggestion,
  getAlternativeLines,
} from "./fallback-routes";

/**
 * Input structure for MTA alerts when generating commute alerts.
 * Simplified from the full SubwayAlert interface for this module's needs.
 *
 * @property id - Unique alert identifier
 * @property routes - Array of affected subway line designations
 * @property headerText - Human-readable alert summary
 * @property isPlannedWork - Whether this is planned work vs real-time disruption
 */
export interface MtaAlertInput {
  id: string;
  routes: string[];
  headerText: string;
  isPlannedWork: boolean;
}

/**
 * Internal station info for commute alerts, combining data from multiple stations.
 * Adapts the station-mapping module's StationInfo to our needs.
 */
interface CommuteStationInfo {
  primary: string;
  lines: string[];
  neighborhood: string;
}

/**
 * Represents a personalized commute alert for a specific user.
 *
 * This interface captures the complete context needed to inform a user
 * about transit disruptions affecting their commute, including:
 * - What's affected (lines, stations)
 * - What to do about it (fallbacks)
 * - How to communicate it (AI-generated copy)
 *
 * @property affectedLines - Deduplicated list of disrupted lines at user's station
 * @property fallbacks - Alternative route suggestions for each affected line
 * @property aiCopy - AI-generated natural language message (2-3 sentences)
 * @property alerts - Original alert data for reference
 * @property neighborhood - User's neighborhood name for personalization
 * @property primaryStation - User's primary subway station name
 * @property hasPlannedWork - Whether any alerts are planned work (vs real-time)
 */
export interface CommuteAlert {
  affectedLines: string[];
  fallbacks: FallbackSuggestion[];
  aiCopy: string;
  alerts: MtaAlertInput[];
  neighborhood: string;
  primaryStation: string;
  hasPlannedWork: boolean;
}

/**
 * ZIP code to neighborhood mapping for user-friendly messaging.
 * Derived from the station-mapping module's coverage areas.
 */
const ZIP_TO_NEIGHBORHOOD: Record<string, string> = {
  // Manhattan
  "10001": "Chelsea",
  "10002": "Lower East Side",
  "10003": "East Village",
  "10011": "Chelsea",
  "10014": "West Village",
  "10016": "Murray Hill",
  "10019": "Midtown West",
  "10022": "Midtown East",
  "10028": "Upper East Side",
  "10036": "Times Square",
  // Brooklyn
  "11201": "Downtown Brooklyn",
  "11211": "Williamsburg",
  "11215": "Park Slope",
  "11217": "Boerum Hill",
  "11238": "Prospect Heights",
  // Queens
  "11101": "Long Island City",
  "11104": "Sunnyside",
  "11372": "Jackson Heights",
  // Bronx
  "10451": "Mott Haven",
  "10452": "Highbridge",
  // Staten Island
  "10301": "St. George",
};

/**
 * Gets station info for a ZIP code, adapting from station-mapping module.
 *
 * @param zipCode - User's ZIP code
 * @returns CommuteStationInfo or null if unknown ZIP
 */
function getStationInfoForZip(zipCode: string): CommuteStationInfo | null {
  const stations = getNearestStations(zipCode);

  if (stations.length === 0) {
    return null;
  }

  // Get primary station (first one, closest)
  const primaryStation = stations[0];

  // Collect all lines from all nearby stations
  const allLines = new Set<string>();
  for (const station of stations) {
    for (const line of station.lines) {
      allLines.add(line.toUpperCase());
    }
  }

  // Get neighborhood from mapping
  const neighborhood = ZIP_TO_NEIGHBORHOOD[zipCode] || "your neighborhood";

  return {
    primary: primaryStation.stationName,
    lines: Array.from(allLines),
    neighborhood,
  };
}

/**
 * Generates a template-based commute alert message.
 *
 * Used as fallback when AI generation is unavailable or fails.
 * The template follows a consistent structure:
 * 1. What's happening (line + status)
 * 2. Where you are (station context)
 * 3. What to do (primary alternative)
 *
 * @param affectedLines - Lines with active disruptions
 * @param station - User's station information
 * @param fallbacks - Available alternative routes
 * @param alerts - Original alert data
 * @returns Template-based alert message string
 */
function generateTemplateCopy(
  affectedLines: string[],
  station: CommuteStationInfo,
  fallbacks: FallbackSuggestion[],
  alerts: MtaAlertInput[]
): string {
  if (affectedLines.length === 0) {
    return "";
  }

  const linesText =
    affectedLines.length === 1
      ? `${affectedLines[0]} train`
      : `${affectedLines.slice(0, -1).join(", ")} and ${affectedLines[affectedLines.length - 1]} trains`;

  // Get the first alert's header for context
  const relevantAlert = alerts.find((a) =>
    a.routes.some((r) => affectedLines.includes(r.toUpperCase()))
  );
  const statusText = relevantAlert?.headerText
    ? relevantAlert.headerText.toLowerCase()
    : "experiencing delays";

  // Get primary alternative
  const primaryFallback = fallbacks[0];
  const altText = primaryFallback
    ? `Try the ${primaryFallback.alternatives.slice(0, 2).join(" or ")} as an alternative.`
    : "Check for shuttle buses or bus alternatives.";

  // Check if planned work
  const isPlanned = alerts.some((a) => a.isPlannedWork);
  const timeContext = isPlanned ? "Heads up for your commute: " : "Alert: ";

  return `${timeContext}The ${linesText} near ${station.primary} ${statusText}. ${altText}`;
}

/**
 * Generates a personalized commute alert for a user based on their location
 * and active MTA service alerts.
 *
 * This is the synchronous version that uses template-based messaging.
 * For AI-enhanced messaging, use generateCommuteAlertWithAi().
 *
 * Algorithm:
 * 1. Look up user's station from ZIP code
 * 2. If unknown ZIP, return null (can't personalize)
 * 3. Find intersection of user's lines with affected lines in alerts
 * 4. If no intersection, return null (user not affected)
 * 5. Get fallback routes for each affected line
 * 6. Generate template-based copy
 * 7. Return complete CommuteAlert object
 *
 * @param zipCode - User's 5-digit ZIP code
 * @param activeAlerts - Array of current MTA service alerts
 * @returns CommuteAlert if user is affected, null otherwise
 *
 * @example
 * // User in Williamsburg with L train delays
 * const alert = generateCommuteAlert("11211", [
 *   { id: "1", routes: ["L"], headerText: "L delays", isPlannedWork: false }
 * ]);
 * // Returns CommuteAlert with L in affectedLines, G/J/M/Z fallbacks
 *
 * @example
 * // User in Williamsburg with 7 train delays (not affected)
 * const alert = generateCommuteAlert("11211", [
 *   { id: "1", routes: ["7"], headerText: "7 delays", isPlannedWork: false }
 * ]);
 * // Returns null
 */
export function generateCommuteAlert(
  zipCode: string,
  activeAlerts: MtaAlertInput[]
): CommuteAlert | null {
  // Step 1: Look up user's station
  const station = getStationInfoForZip(zipCode);

  // Step 2: Unknown ZIP = can't personalize
  if (!station) {
    return null;
  }

  // Step 3: No active alerts = nothing to report
  if (!activeAlerts || activeAlerts.length === 0) {
    return null;
  }

  // Step 4: Find affected lines at user's station
  // Normalize user's lines to uppercase
  const userLines = new Set(station.lines.map((l) => l.toUpperCase()));

  // Collect all affected routes from all alerts, normalized
  const allAffectedRoutes = new Set<string>();
  const relevantAlerts: MtaAlertInput[] = [];

  for (const alert of activeAlerts) {
    // Normalize alert routes
    const normalizedRoutes = alert.routes.map((r) => r.toUpperCase());

    // Check if any of this alert's routes affect the user
    const intersection = normalizedRoutes.filter((r) => userLines.has(r));

    if (intersection.length > 0) {
      intersection.forEach((r) => allAffectedRoutes.add(r));
      relevantAlerts.push(alert);
    }
  }

  // Step 5: If no intersection, user is not affected
  if (allAffectedRoutes.size === 0) {
    return null;
  }

  // Convert to array for consistent ordering
  const affectedLines = Array.from(allAffectedRoutes).sort();

  // Step 6: Get fallback routes for affected lines
  const fallbacks = getFallbackRoutes(affectedLines);

  // Step 7: Check for planned work
  const hasPlannedWork = relevantAlerts.some((a) => a.isPlannedWork);

  // Step 8: Generate template-based copy
  const aiCopy = generateTemplateCopy(
    affectedLines,
    station,
    fallbacks,
    relevantAlerts
  );

  // Step 9: Return complete alert
  return {
    affectedLines,
    fallbacks,
    aiCopy,
    alerts: relevantAlerts,
    neighborhood: station.neighborhood,
    primaryStation: station.primary,
    hasPlannedWork,
  };
}

/**
 * Builds the AI prompt for generating personalized commute alert copy.
 *
 * The prompt is designed to elicit concise, actionable responses from
 * Claude Haiku that:
 * 1. Acknowledge the disruption naturally
 * 2. Provide specific, actionable alternatives
 * 3. Include time context when relevant
 * 4. Match the user's neighborhood context
 *
 * @param station - User's station information
 * @param affectedLines - Lines with disruptions
 * @param fallbacks - Alternative route suggestions
 * @param alerts - Original alert data
 * @returns Formatted prompt string for Claude Haiku
 */
function buildAiPrompt(
  station: CommuteStationInfo,
  affectedLines: string[],
  fallbacks: FallbackSuggestion[],
  alerts: MtaAlertInput[]
): string {
  const linesText = affectedLines.join(", ");

  const alternativesText = fallbacks
    .map(
      (f) =>
        `${f.affectedLine} alternatives: ${f.alternatives.slice(0, 3).join(", ")}`
    )
    .join("\n");

  const alertsText = alerts
    .slice(0, 3)
    .map((a) => `- ${a.routes.join("/")}: ${a.headerText}`)
    .join("\n");

  const hasPlannedWork = alerts.some((a) => a.isPlannedWork);
  const alertType = hasPlannedWork ? "planned work" : "service disruption";

  return `Generate a brief, friendly morning commute alert (2-3 sentences max) for a commuter in ${station.neighborhood}.

Context:
- User's primary station: ${station.primary}
- Affected lines at their station: ${linesText}
- Alert type: ${alertType}

Current alerts:
${alertsText}

Available alternatives:
${alternativesText}

Guidelines:
- Be conversational and helpful, not robotic
- Mention the affected line(s) and the issue briefly
- Suggest the best alternative route specifically for someone at ${station.primary}
- Include approximate extra time if relevant (e.g., "allow 10-15 extra minutes")
- Keep it concise - commuters are busy

Example style:
"Heads up! The L is running with delays this morning. Your quickest option from Williamsburg is the G to Court Square, then the 7 into Manhattan. Allow an extra 15 minutes."

Generate the alert:`;
}

/**
 * Calls Claude Haiku API to generate personalized alert copy.
 *
 * @param prompt - Formatted prompt for the AI
 * @returns Generated alert copy, or null on failure
 */
async function callClaudeHaiku(prompt: string): Promise<string | null> {
  // Skip AI call in test environment or if no API key
  if (process.env.NODE_ENV === "test") {
    // In test mode, return mock response if fetch is mocked
    // Otherwise return null to trigger fallback
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY || "test-key",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 200,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const text = data.content?.[0]?.text;
      return text || null;
    } catch {
      return null;
    }
  }

  // Production: Call actual API
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[CommuteAlerts] ANTHROPIC_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(
        `[CommuteAlerts] API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      console.error("[CommuteAlerts] Empty response from API");
      return null;
    }

    return text.trim();
  } catch (error) {
    console.error("[CommuteAlerts] Failed to generate AI copy:", error);
    return null;
  }
}

/**
 * Generates a personalized commute alert with AI-enhanced messaging.
 *
 * This async version calls Claude Haiku to generate natural language
 * messaging. Falls back to template-based copy if AI is unavailable.
 *
 * The AI is called only when:
 * 1. User is affected by at least one disruption
 * 2. ANTHROPIC_API_KEY is configured (or in test mode)
 *
 * @param zipCode - User's 5-digit ZIP code
 * @param activeAlerts - Array of current MTA service alerts
 * @returns CommuteAlert with AI-generated copy if user is affected, null otherwise
 *
 * @example
 * const alert = await generateCommuteAlertWithAi("11211", [
 *   { id: "1", routes: ["L"], headerText: "L delays", isPlannedWork: false }
 * ]);
 * // Returns CommuteAlert with natural language aiCopy:
 * // "Heads up! The L is running with delays this morning..."
 */
export async function generateCommuteAlertWithAi(
  zipCode: string,
  activeAlerts: MtaAlertInput[]
): Promise<CommuteAlert | null> {
  // First, generate the base alert
  const baseAlert = generateCommuteAlert(zipCode, activeAlerts);

  // If user is not affected, return null (no AI needed)
  if (!baseAlert) {
    return null;
  }

  // Get station info for AI prompt
  const station = getStationInfoForZip(zipCode);
  if (!station) {
    return baseAlert; // Shouldn't happen, but fallback to template
  }

  // Build AI prompt
  const prompt = buildAiPrompt(
    station,
    baseAlert.affectedLines,
    baseAlert.fallbacks,
    baseAlert.alerts
  );

  // Call Claude Haiku
  const aiCopy = await callClaudeHaiku(prompt);

  // If AI succeeded, update the copy; otherwise keep template
  if (aiCopy) {
    return {
      ...baseAlert,
      aiCopy,
    };
  }

  // Fallback to template copy
  return baseAlert;
}

/**
 * Checks if any active alerts affect a user's commute.
 *
 * Utility function for quick checks without generating full alert details.
 * Useful for filtering users before sending notifications.
 *
 * @param zipCode - User's 5-digit ZIP code
 * @param activeAlerts - Array of current MTA service alerts
 * @returns true if user's station lines are affected by any alert
 */
export function isUserAffected(
  zipCode: string,
  activeAlerts: MtaAlertInput[]
): boolean {
  const station = getStationInfoForZip(zipCode);
  if (!station) {
    return false;
  }

  const userLines = new Set(station.lines.map((l) => l.toUpperCase()));

  return activeAlerts.some((alert) =>
    alert.routes.some((r) => userLines.has(r.toUpperCase()))
  );
}

/**
 * Gets the best alternative line for a user given an affected line.
 *
 * Considers the user's station to find alternatives that are actually
 * accessible from their location.
 *
 * @param zipCode - User's 5-digit ZIP code
 * @param affectedLine - The line experiencing disruption
 * @returns Best alternative line designation, or null if none available
 */
export function getBestAlternativeForUser(
  zipCode: string,
  affectedLine: string
): string | null {
  const station = getStationInfoForZip(zipCode);
  if (!station) {
    return null;
  }

  const alternatives = getAlternativeLines(affectedLine);
  if (alternatives.length === 0) {
    return null;
  }

  // Check if user has direct access to any alternative
  const userLines = new Set(station.lines.map((l) => l.toUpperCase()));
  const directAlternative = alternatives.find((alt) =>
    userLines.has(alt.toUpperCase())
  );

  if (directAlternative) {
    return directAlternative;
  }

  // Otherwise return first alternative (would require transfer)
  return alternatives[0];
}
