// src/lib/scrapers/mta.ts
/**
 * MTA Subway Alerts Scraper for NYC Ping
 *
 * This module implements the ingestion pipeline for MTA subway service alerts,
 * connecting the external GTFS-RT API to the internal event matching engine.
 *
 * Architectural Context:
 * The scraper follows the "pipes and filters" pattern, transforming external
 * data (MTA GTFS-RT) into internal domain objects (AlertEvent) that flow
 * through the matching engine to produce targeted notifications.
 *
 * Data Flow:
 * 1. fetchMtaAlerts() - Fetch raw alerts from MTA GTFS-RT API
 * 2. extractAffectedLines() - Parse affected subway routes from entities
 * 3. ingestMtaAlerts() - Dedup, persist to AlertEvent, trigger matching
 *
 * MTA GTFS-RT API Context:
 * The Metropolitan Transportation Authority provides General Transit Feed
 * Specification - Realtime (GTFS-RT) data for NYC subway, bus, and rail.
 * Service alerts follow the GTFS-RT Service Alerts specification, which
 * includes informed_entity (affected routes/stops), active_period (timing),
 * and text fields (header, description).
 *
 * Historical Context:
 * GTFS was developed by Google and TriMet (Portland) in 2005 as a standardized
 * format for transit schedule data. GTFS-RT extended this in 2011 for real-time
 * updates. The MTA adopted GTFS-RT in 2015, enabling third-party apps like
 * NYC Ping to provide real-time transit information.
 *
 * Deduplication Strategy:
 * Events are deduplicated using the composite unique index on (sourceId, externalId).
 * The MTA alert ID serves as externalId, ensuring each alert is processed exactly
 * once even if the scraper runs multiple times while the alert is active.
 */

import { prisma } from "../db";
import { matchEventToUsers, MatchableEvent } from "../matching";
import { MtaAlertSchema, MtaAlert } from "../schemas/mta-alert.schema";
import { sendScraperAlert, ScraperError } from "../scraper-alerts";

/**
 * Internal representation of an MTA alert after transformation.
 *
 * This interface bridges the GTFS-RT schema and our AlertEvent model,
 * extracting only the fields relevant for notification matching.
 */
interface MtaAlert {
  id: string;
  header: string;
  description?: string;
  affectedLines: string[];
  activePeriod?: {
    start: number;
    end?: number;
  };
}

/**
 * Valid NYC Subway route IDs for filtering non-subway alerts.
 *
 * NYC Subway routes follow a consistent naming convention:
 * - Numbers 1-7 for IRT (original subway, built 1904-1917)
 * - Letters A-Z for IND/BMT (expanded network, built 1920s-1940s)
 * - SI for Staten Island Railway
 *
 * Express vs Local:
 * Numbers 1-3, 4-6 share tracks (local/express pairs)
 * Letters often share trunk lines (e.g., A/C/E on 8th Ave)
 */
const SUBWAY_ROUTES = new Set([
  "1", "2", "3", "4", "5", "6", "7",
  "A", "B", "C", "D", "E", "F", "G",
  "J", "L", "M", "N", "Q", "R", "S", "W", "Z",
  "SI", // Staten Island Railway
]);

/**
 * MTA GTFS-RT Service Alerts API endpoint.
 *
 * This endpoint provides JSON-formatted service alerts for all MTA services.
 * The API supports filtering by type (alerts, trip_updates, vehicle_positions).
 * We request alerts only for efficiency.
 *
 * Rate Limits:
 * The MTA API has generous rate limits for GTFS-RT feeds. Polling every 2 minutes
 * is well within acceptable usage. Heavy consumers should implement caching.
 */
const MTA_ALERTS_API =
  "https://collector-otp-prod.camsys-apps.com/realtime/gtfsrt/filtered/alerts?type=json";

/**
 * Fetches raw alerts from the MTA GTFS-RT API.
 *
 * The function handles:
 * - HTTP request with appropriate headers
 * - Error handling with graceful degradation
 * - Transformation from GTFS-RT schema to MtaAlert interface
 *
 * GTFS-RT Schema Notes:
 * The GTFS-RT service alerts schema uses Protocol Buffers internally,
 * but the MTA provides a JSON representation for easier consumption.
 * Key fields:
 * - entity[].id - Unique alert identifier
 * - entity[].alert.header_text - Short alert summary
 * - entity[].alert.description_text - Detailed explanation
 * - entity[].alert.informed_entity[] - Affected routes/stops
 * - entity[].alert.active_period[] - When alert is active
 *
 * @returns Array of transformed MTA alerts
 */
export async function fetchMtaAlerts(): Promise<MtaAlert[]> {
  const response = await fetch(MTA_ALERTS_API, {
    headers: {
      "User-Agent": "NYCPing Subway Alerts (nycping.com)",
      Accept: "application/json",
    },
    cache: "no-store", // Bypass Next.js cache for real-time data
  });

  if (!response.ok) {
    throw new Error(`MTA API error: ${response.status}`);
  }

  const data = await response.json();

  // Transform GTFS-RT entities to our internal format
  return (data.entity || [])
    .map((entity: GtfsRtEntity) => {
      const alert = entity.alert;
      if (!alert) return null;

      const affectedLines = extractAffectedLines(alert.informed_entity || []);

      // Skip alerts that don't affect subway lines
      if (affectedLines.length === 0) return null;

      return {
        id: entity.id,
        header:
          alert.header_text?.translation?.[0]?.text || "Service Alert",
        description: alert.description_text?.translation?.[0]?.text,
        affectedLines,
        activePeriod: alert.active_period?.[0],
      };
    })
    .filter((alert: MtaAlert | null): alert is MtaAlert => alert !== null);
}

/**
 * Extracts affected subway lines from GTFS-RT informed_entity array.
 *
 * GTFS-RT informed_entity can specify affected entities at multiple levels:
 * - agency_id (entire agency)
 * - route_id (specific route)
 * - stop_id (specific station)
 * - trip (specific trip)
 *
 * We extract route_id values and filter to valid subway routes,
 * ignoring bus routes, LIRR, Metro-North, etc.
 *
 * @param entities - Array of informed_entity objects from GTFS-RT
 * @returns Deduplicated array of affected subway line identifiers
 */
export function extractAffectedLines(entities: GtfsRtInformedEntity[]): string[] {
  const lines = new Set<string>();

  for (const entity of entities) {
    if (entity.route_id) {
      const routeId = entity.route_id.toUpperCase();
      if (SUBWAY_ROUTES.has(routeId)) {
        lines.add(routeId);
      }
    }
  }

  return Array.from(lines);
}

/**
 * Validates raw alerts against the MtaAlertSchema and separates valid from invalid.
 *
 * This function implements the "partial ingestion" pattern - a resilience strategy
 * that ensures malformed data from upstream sources (MTA GTFS-RT API) doesn't
 * prevent valid alerts from being processed. Invalid alerts are collected for
 * admin notification via the scraper alert system.
 *
 * Architectural Context:
 * In distributed systems, external data sources are inherently unreliable. The
 * MTA's GTFS-RT feed has historically experienced schema drift (e.g., the 2019
 * incident where `header_text` was temporarily renamed to `header`). This
 * validation layer acts as a bulkhead, isolating ingestion failures.
 *
 * The pattern follows the "let it crash" philosophy from Erlang/OTP, but applied
 * to data validation: individual bad records are logged and skipped rather than
 * halting the entire pipeline.
 *
 * @param rawAlerts - Array of raw alert objects from fetchMtaAlerts
 * @returns Object containing validated alerts and validation errors
 */
export function validateAndFilterAlerts(rawAlerts: unknown[]): {
  valid: MtaAlert[];
  errors: ScraperError[];
} {
  const valid: MtaAlert[] = [];
  const errors: ScraperError[] = [];

  for (const raw of rawAlerts) {
    const result = MtaAlertSchema.safeParse(raw);

    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        source: "mta",
        payload: raw,
        error: result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
        timestamp: new Date(),
      });
    }
  }

  return { valid, errors };
}

/**
 * Ingests MTA alerts into the NYC Ping event system.
 *
 * This is the primary entry point called by the cron job. It orchestrates:
 * 1. Fetching fresh alerts from MTA API
 * 2. Looking up the mta-subway-alerts AlertSource
 * 3. Deduplicating against existing events
 * 4. Creating new AlertEvent records
 * 5. Triggering the matching engine for each new event
 * 6. Updating the source's lastPolledAt timestamp
 *
 * Transactional Integrity:
 * Each alert is processed independently to ensure partial failures don't
 * affect successful ingestions. The matching engine is called synchronously
 * to maintain causal consistency (event → match → queue in one flow).
 *
 * Performance Considerations:
 * With typical MTA alert volumes (50-200 active alerts), sequential processing
 * is acceptable. For higher volumes, consider batching database operations.
 *
 * @returns Object with created and skipped counts for monitoring
 */
export async function ingestMtaAlerts(): Promise<{
  created: number;
  skipped: number;
}> {
  // Look up the MTA alert source configuration
  const source = await prisma.alertSource.findUnique({
    where: { slug: "mta-subway-alerts" },
    include: { module: true },
  });

  if (!source) {
    throw new Error("MTA alert source not configured - ensure seed data exists");
  }

  // Fetch raw alerts from MTA API
  const rawAlerts = await fetchMtaAlerts();

  // Validate with Zod schema - implements partial ingestion pattern
  // Valid alerts proceed to processing; invalid alerts are collected for alerting
  const { valid: alerts, errors } = validateAndFilterAlerts(rawAlerts);

  // Send admin alert if any validation errors occurred
  // This enables proactive monitoring of upstream schema drift
  if (errors.length > 0) {
    console.warn(
      `[MTA Scraper] ${errors.length} alerts failed validation - sending admin alert`
    );
    await sendScraperAlert("mta", errors);
  }

  let created = 0;
  let skipped = 0;

  // Process only validated alerts
  for (const alert of alerts) {
    // Check for existing event using composite unique constraint
    // This implements exactly-once semantics for alert processing
    const existing = await prisma.alertEvent.findUnique({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId: alert.id,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create new AlertEvent with transit-specific metadata
    const event = await prisma.alertEvent.create({
      data: {
        sourceId: source.id,
        externalId: alert.id,
        title: alert.header,
        body: alert.description,
        startsAt: alert.activePeriod?.start
          ? new Date(alert.activePeriod.start * 1000)
          : null,
        endsAt: alert.activePeriod?.end
          ? new Date(alert.activePeriod.end * 1000)
          : null,
        neighborhoods: [], // MTA alerts are line-based, not neighborhood-based
        metadata: {
          affectedLines: alert.affectedLines,
        },
      },
      include: {
        source: {
          include: { module: true },
        },
      },
    });

    // Trigger the matching engine to queue notifications for relevant users
    // The matching engine uses metadata.affectedLines to filter users
    // who have enabled transit module with overlapping subwayLines preference
    // Cast to MatchableEvent since Prisma's JsonValue type doesn't match Record<string, unknown>
    await matchEventToUsers(event as unknown as MatchableEvent & { id: string });
    created++;
  }

  // Update source timestamp for monitoring and debugging
  await prisma.alertSource.update({
    where: { id: source.id },
    data: { lastPolledAt: new Date() },
  });

  const totalFetched = rawAlerts.length;
  const validationErrors = errors.length;
  console.log(
    `[MTA Scraper] Processed ${totalFetched} alerts: ${alerts.length} valid, ${validationErrors} invalid, ${created} created, ${skipped} skipped`
  );

  return { created, skipped };
}

// ============================================================================
// GTFS-RT Type Definitions
// ============================================================================

/**
 * GTFS-RT Entity - Top-level wrapper in the feed.
 *
 * Each entity represents a single alert, trip update, or vehicle position.
 * For service alerts, the `alert` field contains the alert details.
 */
interface GtfsRtEntity {
  id: string;
  alert?: {
    active_period?: Array<{ start?: number; end?: number }>;
    informed_entity?: GtfsRtInformedEntity[];
    header_text?: {
      translation?: Array<{ text: string; language?: string }>;
    };
    description_text?: {
      translation?: Array<{ text: string; language?: string }>;
    };
  };
}

/**
 * GTFS-RT Informed Entity - Describes what is affected by an alert.
 *
 * The specification allows multiple granularity levels, from entire agencies
 * down to specific trips. For subway alerts, we primarily use route_id.
 */
interface GtfsRtInformedEntity {
  agency_id?: string;
  route_id?: string;
  stop_id?: string;
  trip?: {
    trip_id?: string;
    route_id?: string;
  };
}
