// src/lib/matching.ts
/**
 * NYC Ping Event Matching Engine
 *
 * This module implements the core business logic for intelligent event-to-user
 * matching, enabling targeted notification delivery based on user preferences
 * and event characteristics.
 *
 * Architectural Position:
 * The matching engine sits between the event ingestion layer (AlertSource pollers)
 * and the notification dispatch layer (NotificationOutbox processor). It implements
 * content-based routing, determining which users should receive each event based
 * on preference matching rules specific to each module.
 *
 * Design Philosophy:
 * The engine follows a "fail-open" strategy for universal events (parking, weather)
 * while implementing precise filtering for targeted events (transit, housing).
 * This asymmetry reflects notification utility economics:
 * - False negatives (missing important alerts) have high user cost
 * - False positives (receiving irrelevant alerts) have lower but cumulative cost
 *
 * The balance is struck per-module based on event characteristics:
 * - Parking: Citywide ASP suspensions are universally relevant → fail-open
 * - Transit: Line-specific delays only matter to line riders → strict filtering
 * - Housing: Income-bracketed lotteries → bracket matching with fallback
 * - Weather: Severe conditions affect all → fail-open
 * - Events: Location-specific → neighborhood matching with citywide fallback
 * - Deals: Generally universal with optional location filtering
 *
 * Historical Context:
 * Content-based routing has roots in message-oriented middleware (MOM) systems
 * of the 1980s. Early implementations like TIBCO Rendezvous (1994) pioneered
 * subject-based filtering. Modern systems like Apache Kafka's stream processing
 * and AWS EventBridge's content filtering patterns evolved these concepts.
 * NYC Ping applies similar principles at the application layer for notification
 * routing, with domain-specific matching logic for NYC civic data.
 *
 * Performance Considerations:
 * The matchesUserPreferences function is designed for O(1) to O(n) complexity
 * where n is the smaller of event attributes or user preferences. For typical
 * NYC data (4 subway lines, 6-8 income brackets), this remains sub-millisecond.
 * Batch processing via matchEventToUsers leverages database-level filtering
 * to minimize in-memory matching operations.
 */

import { prisma } from "./db";

/**
 * Type definitions for event and preference structures.
 *
 * These interfaces mirror the Prisma schema but provide TypeScript-level
 * type safety for the matching logic. The use of `any` in test files
 * allows flexible test fixture construction while maintaining runtime safety.
 */

/**
 * Represents an alert event with source metadata and geographic targeting.
 *
 * The nested structure (source.module.id) aligns with Prisma's relation
 * hierarchy: AlertEvent → AlertSource → Module.
 */
export interface MatchableEvent {
  source: {
    module: {
      id: string;
    };
  };
  metadata: Record<string, unknown>;
  neighborhoods: string[];
  title?: string;
  body?: string;
  id?: string;
  startsAt?: Date;
  endsAt?: Date;
}

/**
 * Represents a user's module preference with settings.
 *
 * Settings is a JSON object with module-specific keys:
 * - transit: { subwayLines: string[] }
 * - housing: { incomeBracket: string }
 * - parking: { aspAlerts: boolean }
 * - events: { neighborhood: string }
 * - deals: { neighborhood: string }
 */
export interface MatchablePreference {
  settings: Record<string, unknown>;
  userId?: string;
  moduleId?: string;
  enabled?: boolean;
}

/**
 * User tier for notification scheduling.
 */
export type UserTier = "free" | "premium";

/**
 * Full user record for notification queueing.
 */
export interface MatchableUser {
  id: string;
  email: string;
  phone?: string | null;
  tier: UserTier;
  smsOptInStatus: string;
}

/**
 * Result of preference matching with user context.
 */
export interface MatchResult {
  userId: string;
  user: MatchableUser;
  preference: MatchablePreference;
  matched: boolean;
}

// ============================================================================
// CORE MATCHING LOGIC
// ============================================================================

/**
 * Determines if an event matches a user's module preferences.
 *
 * This is the core decision function of the matching engine. It implements
 * module-specific matching rules that balance notification relevance with
 * coverage guarantees.
 *
 * Matching Strategy by Module:
 *
 * 1. TRANSIT - Strict Line Matching
 *    Requires intersection between event's affectedLines and user's subwayLines.
 *    Rationale: Transit delays are only relevant if user rides affected lines.
 *    NYC subway has 27 lines; without filtering, users face notification flood.
 *
 * 2. HOUSING - Income Bracket Matching
 *    If event specifies incomeBrackets, user's bracket must be included.
 *    If no brackets specified (general housing news), all users match.
 *    If user has no bracket preference, match all (exploratory interest).
 *    Rationale: Housing lotteries have strict eligibility; irrelevant alerts waste time.
 *
 * 3. PARKING - Universal with Opt-Out
 *    Matches if aspAlerts is not explicitly false.
 *    Rationale: ASP suspensions are citywide; missing one costs a ticket ($65+).
 *    The default-true behavior ensures coverage for users who enabled the module.
 *
 * 4. WEATHER - Universal
 *    Always matches for enabled module.
 *    Rationale: Severe weather affects all users regardless of preferences.
 *
 * 5. EVENTS - Neighborhood Matching with Fallback
 *    If event has neighborhoods, user's neighborhood must be included.
 *    If no neighborhoods (citywide event), all users match.
 *    Rationale: Street fairs and local events only matter locally.
 *
 * 6. DEALS - Universal with Optional Location
 *    Similar to events: neighborhood filtering if specified, otherwise universal.
 *
 * @param event - The alert event to evaluate
 * @param preference - User's module preference with settings
 * @returns true if the event should be delivered to this user
 *
 * @example
 * // Transit event affecting G and L lines
 * const event = { source: { module: { id: 'transit' } }, metadata: { affectedLines: ['G', 'L'] }, neighborhoods: [] };
 * const pref = { settings: { subwayLines: ['G', '7'] } };
 * matchesUserPreferences(event, pref); // true - G line overlaps
 *
 * @example
 * // Housing lottery for 50-80% AMI
 * const event = { source: { module: { id: 'housing' } }, metadata: { incomeBrackets: ['50-80'] }, neighborhoods: [] };
 * const pref = { settings: { incomeBracket: '80-100' } };
 * matchesUserPreferences(event, pref); // false - bracket doesn't match
 */
export function matchesUserPreferences(
  event: MatchableEvent,
  preference: MatchablePreference
): boolean {
  const moduleId = event.source?.module?.id;
  const settings = preference.settings || {};
  const metadata = event.metadata || {};
  const neighborhoods = event.neighborhoods || [];

  switch (moduleId) {
    case "transit":
      return matchTransitEvent(metadata, settings);

    case "housing":
      return matchHousingEvent(metadata, settings);

    case "parking":
      return matchParkingEvent(settings);

    case "weather":
      // Weather events are universally relevant for enabled module
      return true;

    case "events":
      return matchLocationBasedEvent(neighborhoods, settings);

    case "deals":
      return matchLocationBasedEvent(neighborhoods, settings);

    default:
      // Unknown modules: fail-open for future extensibility
      // New modules will work immediately, with refined matching added later
      return true;
  }
}

/**
 * Transit event matching: requires subway line intersection.
 *
 * Implements set intersection logic between event's affected lines and
 * user's monitored lines. Uses early-exit optimization for performance.
 *
 * @param metadata - Event metadata containing affectedLines array
 * @param settings - User settings containing subwayLines array
 * @returns true if any line overlap exists
 */
function matchTransitEvent(
  metadata: Record<string, unknown>,
  settings: Record<string, unknown>
): boolean {
  const affectedLines = metadata.affectedLines as string[] | undefined;
  const userLines = settings.subwayLines as string[] | undefined;

  // No affected lines in event = malformed data, don't match
  if (!affectedLines || !Array.isArray(affectedLines) || affectedLines.length === 0) {
    return false;
  }

  // User has no subway preferences = can't determine relevance
  if (!userLines || !Array.isArray(userLines) || userLines.length === 0) {
    return false;
  }

  // Check for any intersection (O(n*m) but n,m typically < 10)
  // Could optimize with Set if performance becomes critical
  return affectedLines.some((line) => userLines.includes(line));
}

/**
 * Housing event matching: income bracket compatibility check.
 *
 * Housing lotteries in NYC are categorized by Area Median Income (AMI)
 * brackets. This function ensures users only see lotteries they're
 * potentially eligible for based on their income bracket preference.
 *
 * Matching Rules:
 * 1. Event has no brackets → universal (general housing news)
 * 2. User has no bracket preference → universal (show all)
 * 3. Both specified → bracket must be in event's list
 *
 * @param metadata - Event metadata containing incomeBrackets array
 * @param settings - User settings containing incomeBracket string
 * @returns true if bracket matches or fallback applies
 */
function matchHousingEvent(
  metadata: Record<string, unknown>,
  settings: Record<string, unknown>
): boolean {
  const eventBrackets = metadata.incomeBrackets as string[] | undefined;
  const userBracket = settings.incomeBracket as string | undefined;

  // No brackets in event = general housing news, match all
  if (!eventBrackets || !Array.isArray(eventBrackets) || eventBrackets.length === 0) {
    return true;
  }

  // User has no bracket preference = show all housing events
  if (!userBracket) {
    return true;
  }

  // Check if user's bracket is in event's eligible brackets
  return eventBrackets.includes(userBracket);
}

/**
 * Parking event matching: opt-out based logic.
 *
 * Parking alerts (ASP suspensions) are citywide events that benefit
 * any driver. The matching logic uses opt-out semantics: users receive
 * parking alerts unless they explicitly set aspAlerts: false.
 *
 * Default Behavior:
 * - aspAlerts: true → match
 * - aspAlerts: false → no match
 * - aspAlerts: undefined → match (default true for module enablement)
 *
 * @param settings - User settings containing optional aspAlerts boolean
 * @returns true unless aspAlerts is explicitly false
 */
function matchParkingEvent(settings: Record<string, unknown>): boolean {
  const aspAlerts = settings.aspAlerts;

  // Explicit false = user opted out
  if (aspAlerts === false) {
    return false;
  }

  // True or undefined (default) = match
  return true;
}

/**
 * Location-based event matching for events and deals modules.
 *
 * These modules support optional neighborhood targeting. When an event
 * specifies neighborhoods, only users in those neighborhoods receive it.
 * Citywide events (empty neighborhoods array) go to everyone.
 *
 * NYC Neighborhood Context:
 * NYC has ~200+ recognized neighborhoods with varying boundary definitions.
 * The matching uses exact string matching, requiring consistent naming
 * between event data and user preferences (handled at data ingestion).
 *
 * @param neighborhoods - Event's target neighborhoods (empty = citywide)
 * @param settings - User settings containing optional neighborhood string
 * @returns true if neighborhood matches or event is citywide
 */
function matchLocationBasedEvent(
  neighborhoods: string[],
  settings: Record<string, unknown>
): boolean {
  // No neighborhood targeting = citywide event, match all
  if (!neighborhoods || neighborhoods.length === 0) {
    return true;
  }

  const userNeighborhood = settings.neighborhood as string | undefined;

  // User has no neighborhood preference but event is targeted
  // This is an edge case - could match (exploratory) or not match (precision)
  // We choose to not match for targeted events to avoid spam
  if (!userNeighborhood) {
    return false;
  }

  // Check if user's neighborhood is in event's target list
  return neighborhoods.includes(userNeighborhood);
}

// ============================================================================
// USER MATCHING AND NOTIFICATION QUEUEING
// ============================================================================

/**
 * Finds all users who should receive an event and queues notifications.
 *
 * This function orchestrates the full matching workflow:
 * 1. Load event with source/module relations
 * 2. Find all users with enabled preferences for the event's module
 * 3. Filter to users whose preferences match the event
 * 4. Queue notifications for matched users
 *
 * Database Optimization:
 * The function performs initial filtering at the database level (module enabled)
 * to minimize in-memory processing. Only users with the relevant module enabled
 * are loaded, then preference matching is applied in application code.
 *
 * Batch Processing:
 * For high-volume event sources (transit alerts during rush hour), this
 * function can process thousands of users efficiently. The notification
 * queueing uses Prisma's createMany for batch inserts with skipDuplicates
 * to handle the unique constraint on (userId, eventId, channel).
 *
 * @param event - Alert event with full relations loaded
 * @returns Array of queued notification records
 *
 * @example
 * // Process a new transit delay event
 * const notifications = await matchEventToUsers(transitEvent);
 * console.log(`Queued ${notifications.length} notifications`);
 */
export async function matchEventToUsers(event: MatchableEvent & { id: string }) {
  const moduleId = event.source?.module?.id;

  if (!moduleId) {
    console.warn("[Matching] Event missing module ID, skipping:", event.id);
    return [];
  }

  // Find all users with this module enabled
  const preferences = await prisma.userModulePreference.findMany({
    where: {
      moduleId,
      enabled: true,
    },
    include: {
      user: true,
    },
  });

  // Filter to preferences that match the event
  const matchedPreferences = preferences.filter((pref) =>
    matchesUserPreferences(event, {
      settings: pref.settings as Record<string, unknown>,
    })
  );

  // Queue notifications for all matched users
  const notifications = await Promise.all(
    matchedPreferences.map((pref) =>
      queueNotification(pref.user as unknown as MatchableUser, event)
    )
  );

  // Flatten and filter out nulls (duplicate notifications skipped)
  return notifications.flat().filter(Boolean);
}

/**
 * Creates notification outbox entries for a user-event pair.
 *
 * Implements tier-based notification scheduling:
 * - Premium users: Immediate delivery via SMS and email
 * - Free users: 24-hour delayed email digest
 *
 * This tiered approach serves business and UX goals:
 * - Incentivizes premium upgrades with instant notifications
 * - Protects free tier from notification fatigue
 * - Enables digest batching for cost efficiency
 *
 * Notification Channels:
 * - SMS: Premium only, requires confirmed opt-in (smsOptInStatus = 'confirmed')
 * - Email: All tiers, always enabled
 *
 * Idempotency:
 * The function handles duplicate queueing gracefully via the unique constraint
 * on (userId, eventId, channel). Duplicate attempts are skipped silently,
 * implementing exactly-once semantics at the queue level.
 *
 * Scheduling Logic:
 * - Premium: scheduledFor = now() (immediate processing)
 * - Free: scheduledFor = now() + 24 hours (digest batch window)
 *
 * The scheduler processes notifications where scheduledFor <= now(), so
 * premium notifications are picked up immediately while free notifications
 * wait for the next digest processing run.
 *
 * @param user - User record with tier and contact info
 * @param event - Event to notify about
 * @returns Created notification record(s) or empty array if skipped
 *
 * @example
 * // Queue notification for premium user
 * const notifications = await queueNotification(premiumUser, transitEvent);
 * // Returns: [{ channel: 'sms', ... }, { channel: 'email', ... }]
 *
 * @example
 * // Queue notification for free user
 * const notifications = await queueNotification(freeUser, housingEvent);
 * // Returns: [{ channel: 'email', scheduledFor: <24h from now>, ... }]
 */
export async function queueNotification(
  user: MatchableUser,
  event: MatchableEvent & { id: string }
) {
  const notifications: Array<{
    userId: string;
    eventId: string;
    channel: "sms" | "email";
    scheduledFor: Date;
    status: "pending";
  }> = [];

  const now = new Date();

  if (user.tier === "premium") {
    // Premium: immediate delivery
    const scheduledFor = now;

    // SMS notification (if opted in)
    if (user.phone && user.smsOptInStatus === "confirmed") {
      notifications.push({
        userId: user.id,
        eventId: event.id,
        channel: "sms",
        scheduledFor,
        status: "pending",
      });
    }

    // Email notification (always for premium)
    notifications.push({
      userId: user.id,
      eventId: event.id,
      channel: "email",
      scheduledFor,
      status: "pending",
    });
  } else {
    // Free tier: 24-hour delayed email digest
    const scheduledFor = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    notifications.push({
      userId: user.id,
      eventId: event.id,
      channel: "email",
      scheduledFor,
      status: "pending",
    });
  }

  // Batch insert with duplicate handling
  try {
    const created = await prisma.notificationOutbox.createMany({
      data: notifications,
      skipDuplicates: true, // Handles unique constraint violations
    });

    console.log(
      `[Matching] Queued ${created.count} notifications for user ${user.id}`
    );

    return notifications.slice(0, created.count);
  } catch (error) {
    console.error(
      `[Matching] Error queueing notifications for user ${user.id}:`,
      error
    );
    return [];
  }
}

/**
 * Processes a batch of events, matching and queueing notifications for all.
 *
 * This is the primary entry point for batch event processing, typically
 * called after an alert source poll completes with new events.
 *
 * @param events - Array of events with full relations
 * @returns Total count of queued notifications
 */
export async function processEventBatch(
  events: Array<MatchableEvent & { id: string }>
): Promise<number> {
  let totalQueued = 0;

  for (const event of events) {
    const notifications = await matchEventToUsers(event);
    totalQueued += notifications.length;
  }

  console.log(
    `[Matching] Processed ${events.length} events, queued ${totalQueued} notifications`
  );

  return totalQueued;
}
