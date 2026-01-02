// src/lib/__tests__/matching.test.ts
/**
 * Test suite for the Event Matching Engine.
 *
 * This module implements the core business logic for matching alert events
 * to user preferences, enabling intelligent notification routing based on:
 * - Module type (parking, transit, housing, etc.)
 * - User preference settings (subway lines, income brackets, etc.)
 * - Geographic/neighborhood matching
 *
 * The matching engine is architecturally positioned as the decision layer
 * between event ingestion (alert sources) and notification dispatch (outbox).
 * This separation of concerns follows the "pipes and filters" architectural
 * pattern, allowing independent evolution of data sources and delivery channels.
 *
 * Historical Context:
 * Event-driven notification systems trace back to publish-subscribe patterns
 * in message-oriented middleware (MOM) systems of the 1980s (TIBCO, IBM MQ).
 * Modern implementations like this one apply content-based routing, where
 * message content (event metadata) determines routing rather than explicit
 * channel subscriptions.
 *
 * Design Decision Rationale:
 * The preference matching uses a "fail-open" philosophy for universal events
 * (like parking ASP suspensions) while requiring explicit matches for
 * targeted events (like transit delays affecting specific subway lines).
 * This asymmetry reflects real-world notification utility: missing a citywide
 * parking suspension is worse than missing an irrelevant transit alert.
 */

import { matchesUserPreferences } from "../matching";

describe("matchesUserPreferences", () => {
  /**
   * Transit Event Matching Tests
   *
   * Transit events include subway delays, service changes, and planned work.
   * Matching logic: User must have at least one affected subway line in their
   * preference settings. This prevents notification spam from irrelevant lines.
   *
   * NYC Subway Context:
   * With 472 stations and 27 lines, the NYC subway system generates hundreds
   * of daily service alerts. Without intelligent filtering, users would face
   * severe notification fatigue. The line-based filtering provides ~90% noise
   * reduction for typical users who regularly use 2-4 lines.
   */
  describe("transit module matching", () => {
    it("matches transit event when user has affected subway line", () => {
      // G line runs through Greenpoint/Williamsburg, L through Bedford
      // A user in Williamsburg likely cares about both
      const event = {
        source: { module: { id: "transit" } },
        metadata: { affectedLines: ["G", "L"] },
        neighborhoods: [],
      };
      const preference = {
        settings: { subwayLines: ["G", "7"] },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });

    it("does not match transit event when user lacks affected lines", () => {
      // User only uses 7 and N (Flushing/Astoria lines)
      // Event affects G and L (Brooklyn lines) - no overlap
      const event = {
        source: { module: { id: "transit" } },
        metadata: { affectedLines: ["G", "L"] },
        neighborhoods: [],
      };
      const preference = {
        settings: { subwayLines: ["7", "N"] },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(false);
    });

    it("matches transit event when multiple lines overlap", () => {
      // User rides ACE lines (8th Ave trunk), event affects A and F
      // A overlaps - should match
      const event = {
        source: { module: { id: "transit" } },
        metadata: { affectedLines: ["A", "F"] },
        neighborhoods: [],
      };
      const preference = {
        settings: { subwayLines: ["A", "C", "E"] },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });

    it("does not match transit event when metadata lacks affectedLines", () => {
      // Malformed event data should not match
      const event = {
        source: { module: { id: "transit" } },
        metadata: {},
        neighborhoods: [],
      };
      const preference = {
        settings: { subwayLines: ["G", "L"] },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(false);
    });

    it("does not match transit event when user has no subwayLines preference", () => {
      // User hasn't configured subway line preferences
      const event = {
        source: { module: { id: "transit" } },
        metadata: { affectedLines: ["G", "L"] },
        neighborhoods: [],
      };
      const preference = {
        settings: {},
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(false);
    });
  });

  /**
   * Housing Event Matching Tests
   *
   * Housing events include lottery openings, affordable housing announcements,
   * and income-restricted rental opportunities. Matching is based on income
   * bracket compatibility to avoid showing irrelevant opportunities.
   *
   * NYC Housing Context:
   * The NYC Housing Connect lottery system categorizes units by Area Median
   * Income (AMI) brackets: 0-30%, 30-50%, 50-80%, 80-100%, 100-130%, 130%+.
   * Matching ensures users only see lotteries they're eligible for based on
   * their self-reported income bracket.
   */
  describe("housing module matching", () => {
    it("matches housing event when income bracket matches", () => {
      // User qualifies for 50-80% AMI units
      const event = {
        source: { module: { id: "housing" } },
        metadata: { incomeBrackets: ["50-80", "80-100"] },
        neighborhoods: [],
      };
      const preference = {
        settings: { incomeBracket: "50-80" },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });

    it("does not match housing event when income bracket doesn't match", () => {
      // User at 130%+ AMI, lottery only for 0-30% (deeply affordable)
      const event = {
        source: { module: { id: "housing" } },
        metadata: { incomeBrackets: ["0-30", "30-50"] },
        neighborhoods: [],
      };
      const preference = {
        settings: { incomeBracket: "130+" },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(false);
    });

    it("matches housing event when no income brackets specified in event", () => {
      // General housing announcement without income restrictions
      const event = {
        source: { module: { id: "housing" } },
        metadata: {},
        neighborhoods: [],
      };
      const preference = {
        settings: { incomeBracket: "50-80" },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });

    it("matches housing event when user has no income bracket preference", () => {
      // User hasn't specified income bracket - show all housing
      const event = {
        source: { module: { id: "housing" } },
        metadata: { incomeBrackets: ["50-80", "80-100"] },
        neighborhoods: [],
      };
      const preference = {
        settings: {},
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });
  });

  /**
   * Parking Event Matching Tests
   *
   * Parking events include ASP (Alternate Side Parking) suspensions,
   * metered parking changes, and tow-away zone alerts.
   *
   * NYC Parking Context:
   * ASP rules require vehicles to be moved 1-2 times per week for street
   * cleaning. When suspended (holidays, snow), drivers save time and avoid
   * tickets. These are "fail-open" universal events - if a user has parking
   * alerts enabled (aspAlerts: true), they should receive ALL parking events.
   * There's no downside to knowing parking is suspended citywide.
   */
  describe("parking module matching", () => {
    it("matches parking events for all users with module enabled", () => {
      // ASP suspension events are universal - no filtering needed
      const event = {
        source: { module: { id: "parking" } },
        metadata: {},
        neighborhoods: [],
      };
      const preference = {
        settings: { aspAlerts: true },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });

    it("does not match parking events when aspAlerts is false", () => {
      // User explicitly disabled parking alerts
      const event = {
        source: { module: { id: "parking" } },
        metadata: {},
        neighborhoods: [],
      };
      const preference = {
        settings: { aspAlerts: false },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(false);
    });

    it("matches parking events when aspAlerts is not set (default true)", () => {
      // Module enabled but no explicit aspAlerts setting - default to true
      const event = {
        source: { module: { id: "parking" } },
        metadata: {},
        neighborhoods: [],
      };
      const preference = {
        settings: {},
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });
  });

  /**
   * Weather Event Matching Tests
   *
   * Weather events include severe weather alerts, heat advisories, and
   * snow emergency declarations. Like parking, these are universal events.
   *
   * NYC Weather Context:
   * NYC experiences diverse weather conditions: nor'easters, heat waves,
   * flash floods. All users in a geographic area should receive weather
   * alerts regardless of other preferences.
   */
  describe("weather module matching", () => {
    it("matches weather events for all users with module enabled", () => {
      const event = {
        source: { module: { id: "weather" } },
        metadata: { severity: "high" },
        neighborhoods: [],
      };
      const preference = {
        settings: {},
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });
  });

  /**
   * Events Module Matching Tests
   *
   * Events include street fairs, parades, and neighborhood happenings.
   * These can optionally be filtered by neighborhood.
   */
  describe("events module matching", () => {
    it("matches events when user neighborhood matches event neighborhoods", () => {
      // Event in Williamsburg, user is in Williamsburg
      const event = {
        source: { module: { id: "events" } },
        metadata: {},
        neighborhoods: ["Williamsburg", "Greenpoint"],
      };
      const preference = {
        settings: { neighborhood: "Williamsburg" },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });

    it("matches events when event has no neighborhood restriction", () => {
      // Citywide event - everyone should see
      const event = {
        source: { module: { id: "events" } },
        metadata: {},
        neighborhoods: [],
      };
      const preference = {
        settings: { neighborhood: "Williamsburg" },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });

    it("does not match events when user neighborhood doesn't match", () => {
      // Event in Harlem, user in Brooklyn
      const event = {
        source: { module: { id: "events" } },
        metadata: {},
        neighborhoods: ["Harlem", "East Harlem"],
      };
      const preference = {
        settings: { neighborhood: "Williamsburg" },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(false);
    });
  });

  /**
   * Deals Module Matching Tests
   *
   * Deals include restaurant specials, retail promotions, and financial offers.
   * These are generally universal but can be neighborhood-filtered.
   */
  describe("deals module matching", () => {
    it("matches deals events for all users with module enabled", () => {
      const event = {
        source: { module: { id: "deals" } },
        metadata: {},
        neighborhoods: [],
      };
      const preference = {
        settings: {},
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });

    it("matches deals when user neighborhood matches", () => {
      // Local deal in user's neighborhood
      const event = {
        source: { module: { id: "deals" } },
        metadata: {},
        neighborhoods: ["Greenpoint"],
      };
      const preference = {
        settings: { neighborhood: "Greenpoint" },
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });
  });

  /**
   * Unknown Module Handling Tests
   *
   * Ensures graceful handling of edge cases and future module additions.
   */
  describe("unknown module handling", () => {
    it("returns true for unknown modules (fail-open for future extensibility)", () => {
      // New module added to system - should default to showing
      const event = {
        source: { module: { id: "new-module" } },
        metadata: {},
        neighborhoods: [],
      };
      const preference = {
        settings: {},
      };
      expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
    });
  });
});
