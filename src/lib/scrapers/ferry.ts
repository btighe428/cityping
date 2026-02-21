// src/lib/scrapers/ferry.ts
/**
 * NYC Ferry & NY Waterway Alerts Scraper
 *
 * This module ingests real-time ferry service alerts for NYC waterways,
 * covering both NYC Ferry (East River, Rockaway, South Brooklyn routes)
 * and NY Waterway (Hudson River crossings).
 *
 * Data Sources:
 * - NYC Ferry: GTFS-RT alerts via nycferry.connexionz.net
 * - NYC Ferry Service Alerts: Google Cloud Function endpoint
 * - NY Waterway: Static GTFS via Transitland (future)
 *
 * Route Coverage:
 * - East River: Wall St/Pier 11 ↔ Brooklyn, Queens, Astoria
 * - South Brooklyn: Bay Ridge, Sunset Park, Red Hook
 * - Rockaway: Beach 108th St service
 * - Soundview: South Bronx connection
 * - Governors Island: Seasonal service
 * - St. George: Staten Island Ferry (via NY Waterway)
 *
 * Architectural Pattern:
 * Following the MTA scraper's "pipes and filters" approach:
 * Fetch → Extract → Validate → Deduplicate → Persist
 */

import { prisma } from "../db";
import { z } from "zod";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * NYC Ferry route definitions for route name mapping
 */
const NYC_FERRY_ROUTES: Record<string, string> = {
  "ER": "East River",
  "RW": "Rockaway",
  "SB": "South Brooklyn",
  "AST": "Astoria",
  "SV": "Soundview",
  "GI": "Governors Island",
  "SR": "St. George",
  "LIC": "Long Island City",
};

/**
 * Internal representation of a ferry alert after transformation
 */
interface FerryAlert {
  externalId: string;
  service: "nyc_ferry" | "ny_waterway";
  alertType: "service_alert" | "delay";
  routeId: string | null;
  routeName: string | null;
  title: string;
  description: string | null;
  severity: "critical" | "major" | "minor" | "info";
  affectedStops: string[];
  startsAt: Date | null;
  endsAt: Date | null;
}

/**
 * Zod schema for validating transformed alerts
 */
const FerryAlertSchema = z.object({
  externalId: z.string().min(1),
  service: z.enum(["nyc_ferry", "ny_waterway"]),
  alertType: z.enum(["service_alert", "delay"]),
  routeId: z.string().nullable(),
  routeName: z.string().nullable(),
  title: z.string().min(1),
  description: z.string().nullable(),
  severity: z.enum(["critical", "major", "minor", "info"]),
  affectedStops: z.array(z.string()),
  startsAt: z.date().nullable(),
  endsAt: z.date().nullable(),
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * NYC Ferry GTFS-RT Alerts endpoint
 * Returns real-time service alerts in GTFS-RT JSON format
 */
const NYC_FERRY_GTFS_RT_ALERTS =
  "https://nycferry.connexionz.net/rtt/public/utility/gtfsrealtime.aspx/alert";

/**
 * NYC Ferry Service Alerts endpoint (alternative/supplementary)
 * Cloud Function providing curated service alerts
 */
const NYC_FERRY_SERVICE_ALERTS =
  "https://us-central1-nyc-ferry.cloudfunctions.net/nycf_service_alerts";

// =============================================================================
// GTFS-RT TYPE DEFINITIONS
// =============================================================================

interface GtfsRtFerryEntity {
  id: string;
  alert?: {
    active_period?: Array<{ start?: number; end?: number }>;
    informed_entity?: Array<{
      agency_id?: string;
      route_id?: string;
      stop_id?: string;
    }>;
    header_text?: {
      translation?: Array<{ text: string; language?: string }>;
    };
    description_text?: {
      translation?: Array<{ text: string; language?: string }>;
    };
    cause?: string;
    effect?: string;
  };
}

interface GtfsRtResponse {
  header?: {
    gtfs_realtime_version?: string;
    timestamp?: number;
  };
  entity?: GtfsRtFerryEntity[];
}

interface ServiceAlertResponse {
  alerts?: Array<{
    id: string;
    title: string;
    description?: string;
    routes?: string[];
    stops?: string[];
    start_time?: string;
    end_time?: string;
    severity?: string;
  }>;
}

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Fetch alerts from NYC Ferry GTFS-RT endpoint
 */
async function fetchNycFerryGtfsAlerts(): Promise<FerryAlert[]> {
  try {
    const response = await fetch(NYC_FERRY_GTFS_RT_ALERTS, {
      headers: {
        "User-Agent": "CityPing Ferry Alerts (cityping.net)",
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[Ferry Scraper] GTFS-RT API error: ${response.status}`);
      return [];
    }

    const data: GtfsRtResponse = await response.json();

    if (!data.entity || data.entity.length === 0) {
      console.log("[Ferry Scraper] No GTFS-RT alerts found");
      return [];
    }

    return data.entity
      .map((entity) => transformGtfsRtAlert(entity))
      .filter((alert): alert is FerryAlert => alert !== null);
  } catch (error) {
    console.error("[Ferry Scraper] GTFS-RT fetch error:", error);
    return [];
  }
}

/**
 * Fetch alerts from NYC Ferry Service Alerts Cloud Function
 */
async function fetchNycFerryServiceAlerts(): Promise<FerryAlert[]> {
  try {
    const response = await fetch(NYC_FERRY_SERVICE_ALERTS, {
      headers: {
        "User-Agent": "CityPing Ferry Alerts (cityping.net)",
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[Ferry Scraper] Service Alerts API error: ${response.status}`);
      return [];
    }

    const data: ServiceAlertResponse = await response.json();

    if (!data.alerts || data.alerts.length === 0) {
      console.log("[Ferry Scraper] No service alerts found");
      return [];
    }

    return data.alerts
      .map((alert) => transformServiceAlert(alert))
      .filter((alert): alert is FerryAlert => alert !== null);
  } catch (error) {
    console.error("[Ferry Scraper] Service Alerts fetch error:", error);
    return [];
  }
}

// =============================================================================
// TRANSFORM FUNCTIONS
// =============================================================================

/**
 * Transform GTFS-RT entity to internal FerryAlert format
 */
function transformGtfsRtAlert(entity: GtfsRtFerryEntity): FerryAlert | null {
  const alert = entity.alert;
  if (!alert) return null;

  const headerText = alert.header_text?.translation?.[0]?.text;
  if (!headerText) return null;

  // Extract route IDs from informed_entity
  const routeIds = (alert.informed_entity || [])
    .filter((e) => e.route_id)
    .map((e) => e.route_id as string);

  const stopIds = (alert.informed_entity || [])
    .filter((e) => e.stop_id)
    .map((e) => e.stop_id as string);

  // Get primary route info
  const primaryRouteId = routeIds[0] || null;
  const primaryRouteName = primaryRouteId
    ? NYC_FERRY_ROUTES[primaryRouteId] || primaryRouteId
    : null;

  // Parse active period
  const activePeriod = alert.active_period?.[0];
  const startsAt = activePeriod?.start
    ? new Date(activePeriod.start * 1000)
    : null;
  const endsAt = activePeriod?.end
    ? new Date(activePeriod.end * 1000)
    : null;

  // Classify severity based on effect
  const severity = classifySeverity(
    headerText,
    alert.description_text?.translation?.[0]?.text,
    alert.effect
  );

  return {
    externalId: `gtfs-${entity.id}`,
    service: "nyc_ferry",
    alertType: "service_alert",
    routeId: primaryRouteId,
    routeName: primaryRouteName,
    title: headerText,
    description: alert.description_text?.translation?.[0]?.text || null,
    severity,
    affectedStops: stopIds,
    startsAt,
    endsAt,
  };
}

/**
 * Transform Service Alert to internal FerryAlert format
 */
function transformServiceAlert(alert: {
  id: string;
  title: string;
  description?: string;
  routes?: string[];
  stops?: string[];
  start_time?: string;
  end_time?: string;
  severity?: string;
}): FerryAlert | null {
  if (!alert.id || !alert.title) return null;

  const primaryRouteId = alert.routes?.[0] || null;
  const primaryRouteName = primaryRouteId
    ? NYC_FERRY_ROUTES[primaryRouteId] || primaryRouteId
    : null;

  const severity = mapSeverityLevel(alert.severity);

  return {
    externalId: `svc-${alert.id}`,
    service: "nyc_ferry",
    alertType: "service_alert",
    routeId: primaryRouteId,
    routeName: primaryRouteName,
    title: alert.title,
    description: alert.description || null,
    severity,
    affectedStops: alert.stops || [],
    startsAt: alert.start_time ? new Date(alert.start_time) : null,
    endsAt: alert.end_time ? new Date(alert.end_time) : null,
  };
}

// =============================================================================
// CLASSIFICATION FUNCTIONS
// =============================================================================

/**
 * Classify severity based on alert content and GTFS-RT effect
 */
function classifySeverity(
  title: string,
  description: string | undefined,
  effect: string | undefined
): "critical" | "major" | "minor" | "info" {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Critical keywords
  if (
    text.includes("cancelled") ||
    text.includes("suspended") ||
    text.includes("no service") ||
    text.includes("emergency") ||
    effect === "NO_SERVICE"
  ) {
    return "critical";
  }

  // Major keywords
  if (
    text.includes("significant delay") ||
    text.includes("major delay") ||
    text.includes("detour") ||
    text.includes("reroute") ||
    effect === "DETOUR" ||
    effect === "SIGNIFICANT_DELAYS"
  ) {
    return "major";
  }

  // Minor keywords
  if (
    text.includes("delay") ||
    text.includes("late") ||
    text.includes("behind schedule") ||
    effect === "REDUCED_SERVICE"
  ) {
    return "minor";
  }

  return "info";
}

/**
 * Map external severity string to internal levels
 */
function mapSeverityLevel(
  severity: string | undefined
): "critical" | "major" | "minor" | "info" {
  if (!severity) return "info";

  const level = severity.toLowerCase();
  if (level === "critical" || level === "severe") return "critical";
  if (level === "major" || level === "warning") return "major";
  if (level === "minor") return "minor";
  return "info";
}

// =============================================================================
// INGESTION PIPELINE
// =============================================================================

/**
 * Main ingestion function - fetches, dedupes, and persists ferry alerts
 */
export async function ingestFerryAlerts(): Promise<{
  created: number;
  skipped: number;
  deactivated: number;
  bySeverity: Record<string, number>;
}> {
  console.log("[Ferry Scraper] Starting ingestion...");

  // Fetch from both sources in parallel
  const [gtfsAlerts, serviceAlerts] = await Promise.all([
    fetchNycFerryGtfsAlerts(),
    fetchNycFerryServiceAlerts(),
  ]);

  // Combine and dedupe by externalId
  const allAlerts = [...gtfsAlerts, ...serviceAlerts];
  const uniqueAlerts = new Map<string, FerryAlert>();
  for (const alert of allAlerts) {
    if (!uniqueAlerts.has(alert.externalId)) {
      uniqueAlerts.set(alert.externalId, alert);
    }
  }

  console.log(
    `[Ferry Scraper] Fetched ${gtfsAlerts.length} GTFS-RT, ${serviceAlerts.length} service alerts (${uniqueAlerts.size} unique)`
  );

  let created = 0;
  let skipped = 0;
  const severityCounts: Record<string, number> = {
    critical: 0,
    major: 0,
    minor: 0,
    info: 0,
  };

  // Track active external IDs for deactivation logic
  const activeExternalIds = new Set<string>();

  for (const alert of uniqueAlerts.values()) {
    // Validate with Zod
    const validation = FerryAlertSchema.safeParse(alert);
    if (!validation.success) {
      console.warn(
        `[Ferry Scraper] Validation failed for ${alert.externalId}:`,
        validation.error.message
      );
      continue;
    }

    severityCounts[alert.severity]++;
    activeExternalIds.add(alert.externalId);

    // Check for existing alert
    const existing = await prisma.ferryAlert.findUnique({
      where: { externalId: alert.externalId },
    });

    if (existing) {
      // Update if changed
      if (
        existing.title !== alert.title ||
        existing.description !== alert.description ||
        existing.severity !== alert.severity
      ) {
        await prisma.ferryAlert.update({
          where: { externalId: alert.externalId },
          data: {
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            affectedStops: alert.affectedStops,
            endsAt: alert.endsAt,
            isActive: true,
            fetchedAt: new Date(),
          },
        });
        console.log(
          `[Ferry Scraper] Updated alert ${alert.externalId}: "${alert.title.substring(0, 50)}..."`
        );
      }
      skipped++;
      continue;
    }

    // Create new alert
    await prisma.ferryAlert.create({
      data: {
        externalId: alert.externalId,
        service: alert.service,
        alertType: alert.alertType,
        routeId: alert.routeId,
        routeName: alert.routeName,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        affectedStops: alert.affectedStops,
        startsAt: alert.startsAt,
        endsAt: alert.endsAt,
        isActive: true,
        fetchedAt: new Date(),
      },
    });

    console.log(
      `[Ferry Scraper] Created ${alert.severity} alert: "${alert.title.substring(0, 50)}..."`
    );
    created++;
  }

  // Deactivate alerts that are no longer in the feed
  const deactivated = await prisma.ferryAlert.updateMany({
    where: {
      isActive: true,
      externalId: { notIn: Array.from(activeExternalIds) },
      fetchedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) }, // Older than 1 hour
    },
    data: { isActive: false },
  });

  console.log(
    `[Ferry Scraper] Complete: ${created} created, ${skipped} skipped, ${deactivated.count} deactivated`
  );
  console.log(
    `[Ferry Scraper] Severity breakdown: critical=${severityCounts.critical}, major=${severityCounts.major}, minor=${severityCounts.minor}, info=${severityCounts.info}`
  );

  return {
    created,
    skipped,
    deactivated: deactivated.count,
    bySeverity: severityCounts,
  };
}

// =============================================================================
// QUERY FUNCTIONS (for email sections)
// =============================================================================

/**
 * Get active ferry alerts for email digest
 */
export async function getActiveFerryAlerts(): Promise<{
  alerts: Array<{
    routeName: string | null;
    title: string;
    description: string | null;
    severity: string;
  }>;
  hasSignificantAlerts: boolean;
}> {
  const alerts = await prisma.ferryAlert.findMany({
    where: {
      isActive: true,
      OR: [
        { endsAt: null },
        { endsAt: { gte: new Date() } },
      ],
    },
    orderBy: [
      { severity: "asc" }, // critical first
      { fetchedAt: "desc" },
    ],
    take: 10,
  });

  // Map severity to sort order for proper ordering
  const severityOrder = { critical: 0, major: 1, minor: 2, info: 3 };
  const sortedAlerts = alerts.sort(
    (a, b) =>
      (severityOrder[a.severity as keyof typeof severityOrder] || 3) -
      (severityOrder[b.severity as keyof typeof severityOrder] || 3)
  );

  const hasSignificantAlerts = alerts.some(
    (a) => a.severity === "critical" || a.severity === "major"
  );

  return {
    alerts: sortedAlerts.map((a) => ({
      routeName: a.routeName,
      title: a.title,
      description: a.description,
      severity: a.severity,
    })),
    hasSignificantAlerts,
  };
}

/**
 * Format ferry alerts for email digest
 */
export function formatFerryAlertsForDigest(
  alerts: Array<{
    routeName: string | null;
    title: string;
    description: string | null;
    severity: string;
  }>
): { html: string; text: string } {
  if (alerts.length === 0) {
    return {
      html: `
        <div style="font-size: 13px; color: #16a34a;">
          <span style="margin-right: 6px;">&#9989;</span> All ferry routes operating normally
        </div>
      `,
      text: "All ferry routes operating normally",
    };
  }

  const getSeverityIndicator = (severity: string) => {
    switch (severity) {
      case "critical":
        return { emoji: "&#128308;", color: "#dc2626" }; // Red circle
      case "major":
        return { emoji: "&#128992;", color: "#f59e0b" }; // Orange circle
      case "minor":
        return { emoji: "&#128993;", color: "#eab308" }; // Yellow circle
      default:
        return { emoji: "&#128309;", color: "#3b82f6" }; // Blue circle
    }
  };

  const alertLines = alerts.map((alert) => {
    const indicator = getSeverityIndicator(alert.severity);
    const routePrefix = alert.routeName ? `[${alert.routeName}] ` : "";
    return {
      html: `
        <div style="margin: 4px 0; font-size: 13px;">
          <span style="color: ${indicator.color}; margin-right: 6px;">${indicator.emoji}</span>
          <strong>${routePrefix}</strong>${alert.title}
        </div>
      `,
      text: `${routePrefix}${alert.title}`,
    };
  });

  return {
    html: alertLines.map((l) => l.html).join(""),
    text: alertLines.map((l) => l.text).join("\n"),
  };
}
