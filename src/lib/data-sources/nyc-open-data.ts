// src/lib/data-sources/nyc-open-data.ts
/**
 * NYC Open Data (Socrata) API Client
 *
 * This module provides a robust client for accessing NYC's Open Data portal,
 * which hosts hundreds of datasets maintained by city agencies. The portal
 * uses the Socrata Open Data API (SODA), a RESTful API that supports
 * SQL-like queries via SoQL (Socrata Query Language).
 *
 * Historical Context:
 * NYC's Open Data initiative launched in 2012 under Local Law 11, making
 * it one of the first major US cities to mandate open data publishing.
 * The platform now hosts 2,500+ datasets ranging from 311 complaints to
 * restaurant inspections to Parks Department events.
 *
 * API Architecture:
 * - Base URL: data.cityofnewyork.us
 * - Dataset IDs: 4-character alphanumeric codes (e.g., "tvpp-9vvx")
 * - Response format: JSON by default, supports CSV, GeoJSON
 * - Rate limits: 1,000 requests/hour without app token, 10,000 with token
 *
 * Key Datasets for NYCPing:
 * - tvpp-9vvx: NYC Permitted Event Information (CURRENT - updated daily)
 * - erm2-nwe9: 311 Service Requests
 * - i4gi-tjb9: DOT Street Closures
 * - hg8x-zxpr: HPD Housing Developments
 *
 * Note: The old Parks Events dataset (fudw-fgrp) is deprecated and hasn't
 * been updated since 2019. Use tvpp-9vvx for current event data.
 *
 * @see https://dev.socrata.com/docs/queries/
 * @see https://data.cityofnewyork.us/
 */

import { AlertEvent, Prisma } from "@prisma/client";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Raw event structure from NYC Permitted Event Information API (dataset tvpp-9vvx)
 *
 * This dataset contains all permitted events in NYC including:
 * - Parades (Three Kings Day, St. Patrick's Day, Pride, etc.)
 * - Farmers Markets (GrowNYC Greenmarkets)
 * - Street Fairs and Block Parties
 * - Special Events (concerts, festivals)
 * - Film/TV productions
 * - Religious processions
 */
export interface NYCPermittedEventRaw {
  /** Unique event identifier */
  event_id: string;
  /** Event name/title */
  event_name: string;
  /** ISO datetime string for event start */
  start_date_time: string;
  /** ISO datetime string for event end */
  end_date_time: string;
  /** Agency that permitted the event (Parks Department, NYPD, etc.) */
  event_agency?: string;
  /** Event type classification */
  event_type?: string;
  /** Borough: Manhattan, Brooklyn, Queens, Bronx, Staten Island */
  event_borough?: string;
  /** Location description (park name, intersection, etc.) */
  event_location?: string;
  /** Type of street closure if applicable */
  street_closure_type?: string;
  /** Community board number(s) */
  community_board?: string;
  /** Police precinct number(s) */
  police_precinct?: string;
  /** CEMS ID (City Event Management System) */
  cemsid?: string;
}

/**
 * Configuration for Socrata API queries
 */
export interface SocrataQueryConfig {
  /** Dataset identifier (4-character code) */
  datasetId: string;
  /** SoQL WHERE clause for filtering */
  where?: string;
  /** SoQL SELECT fields (default: all) */
  select?: string;
  /** SoQL ORDER BY clause */
  orderBy?: string;
  /** Maximum records to return (default: 1000) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Normalized event structure ready for AlertEvent creation
 */
export interface NormalizedEvent {
  /** External ID for deduplication (format: source-{dataset}-{event_id}) */
  externalId: string;
  /** Event title */
  title: string;
  /** Event description/body */
  body: string | null;
  /** Event start datetime */
  startsAt: Date | null;
  /** Event end datetime */
  endsAt: Date | null;
  /** Neighborhoods/areas relevant to this event */
  neighborhoods: string[];
  /** Additional metadata (category, cost, location, etc.) */
  metadata: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

const SOCRATA_BASE_URL = "https://data.cityofnewyork.us/resource";

/**
 * NYC Open Data dataset identifiers
 *
 * These 4-character codes are stable identifiers assigned when datasets
 * are published. They don't change even when dataset content is updated.
 */
export const DATASETS = {
  /** NYC Permitted Event Information - ACTIVE, updated daily */
  PERMITTED_EVENTS: "tvpp-9vvx",
  /** 311 service requests - can filter for street closures, etc. */
  SERVICE_REQUESTS_311: "erm2-nwe9",
  /** DOT street closures and permits */
  DOT_STREET_CLOSURES: "i4gi-tjb9",
  /** HPD housing development projects */
  HPD_HOUSING: "hg8x-zxpr",
  /** Film permits (for film/TV production events) */
  FILM_PERMITS: "tg4x-b46p",
} as const;

/**
 * Event types to prioritize for NYCPing alerts
 * These are more interesting to users than routine sports permits
 */
export const INTERESTING_EVENT_TYPES = [
  "Parade",
  "Farmers Market",
  "Street Event",
  "Plaza Event",
  "Plaza Partner Event",
  "Block Party",
  "Religious Event", // Often colorful processions
  "Special Event", // Catch-all for concerts, festivals
] as const;

/**
 * Event name patterns that indicate high-value alerts
 * These are the "big" events New Yorkers care about
 */
export const HIGH_VALUE_EVENT_PATTERNS = [
  /marathon/i,
  /parade/i,
  /three kings/i,
  /st\.?\s*patrick/i,
  /pride/i,
  /macy.*thanksgiving/i,
  /new year/i,
  /fourth.*july|july.*fourth|independence day/i,
  /fleet week/i,
  /halloween/i,
  /christmas/i,
  /hanukkah|chanukah/i,
  /diwali/i,
  /lunar new year|chinese new year/i,
  /greenmarket/i,
  /summerstage/i,
  /shakespeare.*park/i,
  /philharmonic/i,
  /met.*opera/i,
];

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * Fetches data from NYC Open Data Socrata API
 *
 * The Socrata API supports SoQL (Socrata Query Language), which provides
 * SQL-like querying capabilities including filtering, sorting, and aggregation.
 *
 * Rate Limits:
 * - Without app token: 1,000 requests/hour
 * - With app token: 10,000 requests/hour
 *
 * We don't use an app token currently as our ingestion frequency (daily)
 * stays well under the anonymous rate limit.
 *
 * @param config - Query configuration
 * @returns Array of records from the dataset
 *
 * @example
 * // Fetch upcoming parades
 * const events = await fetchFromSocrata({
 *   datasetId: DATASETS.PERMITTED_EVENTS,
 *   where: "event_type = 'Parade' AND start_date_time > '2026-01-01'",
 *   orderBy: "start_date_time ASC",
 *   limit: 100
 * });
 */
export async function fetchFromSocrata<T>(config: SocrataQueryConfig): Promise<T[]> {
  const { datasetId, where, select, orderBy, limit = 1000, offset = 0 } = config;

  // Build query parameters
  const params = new URLSearchParams();

  if (select) params.set("$select", select);
  if (where) params.set("$where", where);
  if (orderBy) params.set("$order", orderBy);
  params.set("$limit", limit.toString());
  params.set("$offset", offset.toString());

  const url = `${SOCRATA_BASE_URL}/${datasetId}.json?${params.toString()}`;

  console.log(`[NYC Open Data] Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Socrata API error: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const data = await response.json();
  console.log(`[NYC Open Data] Received ${data.length} records from ${datasetId}`);

  return data as T[];
}

// ============================================================================
// Event Fetchers
// ============================================================================

/**
 * Fetches upcoming permitted events from NYC Open Data
 *
 * The Permitted Events dataset (tvpp-9vvx) contains all events requiring
 * city permits, updated daily. This is the authoritative source for:
 * - Major parades (Three Kings, St. Patrick's, Pride, etc.)
 * - Weekly farmers markets (GrowNYC Greenmarkets)
 * - Street fairs and festivals
 * - Film/TV shoots affecting neighborhoods
 * - Religious processions
 *
 * @param daysAhead - How many days into the future to fetch (default: 90)
 * @returns Raw permitted event data
 */
export async function fetchPermittedEvents(
  daysAhead: number = 90
): Promise<NYCPermittedEventRaw[]> {
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return fetchFromSocrata<NYCPermittedEventRaw>({
    datasetId: DATASETS.PERMITTED_EVENTS,
    where: `start_date_time >= '${today}' AND start_date_time <= '${futureDate}'`,
    orderBy: "start_date_time ASC",
    limit: 1000,
  });
}

/**
 * Fetches only interesting events (parades, farmers markets, etc.)
 *
 * Filters out routine sports permits and focuses on events that:
 * 1. Are culturally significant (parades, festivals)
 * 2. Provide value to residents (farmers markets)
 * 3. May affect travel/parking (street closures)
 *
 * @param daysAhead - Days into the future to fetch
 * @returns Filtered raw events
 */
export async function fetchInterestingEvents(
  daysAhead: number = 90
): Promise<NYCPermittedEventRaw[]> {
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Build SoQL IN clause for event types
  const eventTypesIn = INTERESTING_EVENT_TYPES.map((t) => `'${t}'`).join(",");

  return fetchFromSocrata<NYCPermittedEventRaw>({
    datasetId: DATASETS.PERMITTED_EVENTS,
    where: `start_date_time >= '${today}' AND start_date_time <= '${futureDate}' AND event_type in (${eventTypesIn})`,
    orderBy: "start_date_time ASC",
    limit: 500,
  });
}

/**
 * Fetches events by type
 *
 * @param eventType - Event type to filter by (e.g., "Parade", "Farmers Market")
 * @param daysAhead - Days into the future
 * @returns Filtered raw events
 */
export async function fetchEventsByType(
  eventType: string,
  daysAhead: number = 90
): Promise<NYCPermittedEventRaw[]> {
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return fetchFromSocrata<NYCPermittedEventRaw>({
    datasetId: DATASETS.PERMITTED_EVENTS,
    where: `start_date_time >= '${today}' AND start_date_time <= '${futureDate}' AND event_type = '${eventType}'`,
    orderBy: "start_date_time ASC",
    limit: 500,
  });
}

/**
 * Fetches events by borough
 *
 * @param borough - Borough name (Manhattan, Brooklyn, Queens, Bronx, Staten Island)
 * @param daysAhead - Days into the future
 * @returns Events in the specified borough
 */
export async function fetchEventsByBorough(
  borough: string,
  daysAhead: number = 90
): Promise<NYCPermittedEventRaw[]> {
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Build SoQL IN clause for event types
  const eventTypesIn = INTERESTING_EVENT_TYPES.map((t) => `'${t}'`).join(",");

  return fetchFromSocrata<NYCPermittedEventRaw>({
    datasetId: DATASETS.PERMITTED_EVENTS,
    where: `start_date_time >= '${today}' AND start_date_time <= '${futureDate}' AND event_borough = '${borough}' AND event_type in (${eventTypesIn})`,
    orderBy: "start_date_time ASC",
    limit: 300,
  });
}

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Checks if an event matches high-value patterns
 *
 * @param eventName - Name of the event
 * @returns true if this is a high-value event
 */
export function isHighValueEvent(eventName: string): boolean {
  return HIGH_VALUE_EVENT_PATTERNS.some((pattern) => pattern.test(eventName));
}

/**
 * Normalizes a raw permitted event into NYCPing's AlertEvent format
 *
 * The normalization process:
 * 1. Generates a unique externalId for deduplication
 * 2. Parses datetime strings into proper Date objects
 * 3. Extracts neighborhood from location and borough
 * 4. Determines event importance/priority
 * 5. Structures metadata for display and filtering
 *
 * @param raw - Raw event from Permitted Events API
 * @returns Normalized event ready for AlertEvent creation
 */
export function normalizePermittedEvent(raw: NYCPermittedEventRaw): NormalizedEvent {
  // Parse datetimes
  const startsAt = raw.start_date_time ? new Date(raw.start_date_time) : null;
  const endsAt = raw.end_date_time ? new Date(raw.end_date_time) : null;

  // Extract neighborhoods from location and borough
  const neighborhoods: string[] = [];
  if (raw.event_borough) {
    neighborhoods.push(raw.event_borough);
  }
  if (raw.event_location) {
    // Extract park/venue name from location
    const location = raw.event_location.split(":")[0].trim();
    if (location && !neighborhoods.includes(location)) {
      neighborhoods.push(location);
    }
  }

  // Build body with location and timing info
  const bodyParts: string[] = [];
  if (raw.event_location) {
    bodyParts.push(`📍 ${raw.event_location}`);
  }
  if (raw.event_borough) {
    bodyParts.push(`🗽 ${raw.event_borough}`);
  }
  if (raw.street_closure_type && raw.street_closure_type !== "N/A") {
    bodyParts.push(`🚧 Street closure: ${raw.street_closure_type}`);
  }

  // Determine if this is a "must-see" high-value event
  const isHighValue = isHighValueEvent(raw.event_name);

  return {
    externalId: `nyc-permitted-${raw.event_id}`,
    title: raw.event_name,
    body: bodyParts.length > 0 ? bodyParts.join("\n") : null,
    startsAt,
    endsAt,
    neighborhoods,
    metadata: {
      source: "nyc-permitted-events",
      eventType: raw.event_type || null,
      agency: raw.event_agency || null,
      borough: raw.event_borough || null,
      location: raw.event_location || null,
      streetClosure: raw.street_closure_type !== "N/A" ? raw.street_closure_type : null,
      communityBoard: raw.community_board || null,
      policePrecinct: raw.police_precinct || null,
      cemsId: raw.cemsid || null,
      isHighValue,
      // Determine urgency based on event type
      urgency: determineUrgency(raw),
    },
  };
}

/**
 * Determines notification urgency for an event
 *
 * Urgency levels:
 * - HIGH: Major parades, street closures that affect travel
 * - MEDIUM: Regular events, farmers markets
 * - LOW: Minor events, film shoots
 *
 * @param event - Raw event data
 * @returns Urgency classification
 */
function determineUrgency(event: NYCPermittedEventRaw): "HIGH" | "MEDIUM" | "LOW" {
  const name = event.event_name.toLowerCase();
  const type = event.event_type?.toLowerCase() || "";
  const hasStreetClosure = event.street_closure_type && event.street_closure_type !== "N/A";

  // High urgency: Major parades, events with street closures
  if (type === "parade" || isHighValueEvent(event.event_name)) {
    return "HIGH";
  }
  if (hasStreetClosure) {
    return "HIGH";
  }

  // Medium urgency: Regular interesting events
  if (
    type === "farmers market" ||
    type === "street event" ||
    type === "plaza event" ||
    type === "block party"
  ) {
    return "MEDIUM";
  }

  // Low urgency: Everything else
  return "LOW";
}

/**
 * Batch normalizes an array of raw permitted events
 *
 * @param rawEvents - Array of raw events from API
 * @returns Array of normalized events
 */
export function normalizePermittedEvents(
  rawEvents: NYCPermittedEventRaw[]
): NormalizedEvent[] {
  return rawEvents.map(normalizePermittedEvent);
}

// ============================================================================
// Database Sync Functions
// ============================================================================

/**
 * Prepares normalized events for AlertEvent upsert
 *
 * This function takes normalized events and prepares the data structure
 * needed for Prisma's createMany/upsert operations. It's designed to work
 * with the transactional outbox pattern documented in DATA_STRATEGY.md.
 *
 * @param events - Array of normalized events
 * @param sourceId - AlertSource ID (e.g., the "nyc-permitted-events" source)
 * @returns Array of data objects ready for Prisma createMany
 */
export function prepareForDatabase(
  events: NormalizedEvent[],
  sourceId: string
): Omit<AlertEvent, "id" | "createdAt">[] {
  return events.map((event) => ({
    sourceId,
    externalId: event.externalId,
    title: event.title,
    body: event.body,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    neighborhoods: event.neighborhoods,
    metadata: event.metadata as Prisma.JsonValue,
    expiresAt: event.endsAt || event.startsAt, // Expire after event ends
    // Hype score fields - will be calculated by inference engine
    hypeScore: null,
    hypeFactors: null,
    venueType: null,
    weatherScore: null,
    isWeatherSafe: null,
    // Embedding fields - will be populated by embed-content job
    embeddingModel: null,
    embeddingAt: null,
    topicClusterId: null,
  }));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deduplicates events by event_id
 *
 * The API sometimes returns duplicate events (same event_id) when
 * an event spans multiple days or has multiple permits. This function
 * keeps only the first occurrence.
 *
 * @param events - Array of raw events
 * @returns Deduplicated array
 */
export function deduplicateEvents(
  events: NYCPermittedEventRaw[]
): NYCPermittedEventRaw[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.event_id)) {
      return false;
    }
    seen.add(event.event_id);
    return true;
  });
}

/**
 * Filters events to remove routine/uninteresting ones
 *
 * Removes:
 * - Generic sport permits (Soccer, Baseball, etc.)
 * - Film load-in/load-out
 * - Events with generic names like "Miscellaneous"
 *
 * @param events - Array of normalized events
 * @returns Filtered array
 */
export function filterInterestingEvents(events: NormalizedEvent[]): NormalizedEvent[] {
  const genericNames = [
    /^soccer/i,
    /^baseball/i,
    /^softball/i,
    /^basketball/i,
    /^football/i,
    /^tennis/i,
    /^volleyball/i,
    /^miscellaneous$/i,
    /^load in/i,
    /^load out/i,
    /lawn closure/i,
    /^maintenance$/i,
    /synthetic turf/i,
    /field construction/i,
    /playground.*construction/i,
  ];

  return events.filter((event) => {
    // Keep high-value events regardless
    if ((event.metadata as Record<string, unknown>).isHighValue) {
      return true;
    }

    // Filter out generic sport/routine events
    return !genericNames.some((pattern) => pattern.test(event.title));
  });
}
