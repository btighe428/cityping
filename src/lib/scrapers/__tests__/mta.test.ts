// src/lib/scrapers/__tests__/mta.test.ts
/**
 * Test suite for MTA Subway Alerts Scraper
 *
 * This module tests the three primary functions of the MTA scraper:
 * 1. extractAffectedLines - Parsing GTFS-RT informed_entity arrays
 * 2. fetchMtaAlerts - HTTP fetching and transformation (mocked)
 * 3. ingestMtaAlerts - Full ingestion pipeline with database operations (mocked)
 *
 * Testing Strategy:
 * - Unit tests for pure functions (extractAffectedLines)
 * - Integration tests with mocked external dependencies (fetchMtaAlerts, ingestMtaAlerts)
 * - Edge case coverage for malformed data and error conditions
 *
 * Mock Philosophy:
 * External dependencies (HTTP, database) are mocked to ensure:
 * - Tests are deterministic and reproducible
 * - Tests run without network or database access
 * - Tests execute quickly for rapid feedback during development
 *
 * NYC Subway Context:
 * The NYC subway system uses single-letter or number route identifiers:
 * - 1, 2, 3, 4, 5, 6, 7 (IRT numbered lines)
 * - A, B, C, D, E, F, G, J, L, M, N, Q, R, S, W, Z (IND/BMT lettered lines)
 * - SI (Staten Island Railway)
 */

import { extractAffectedLines, fetchMtaAlerts, ingestMtaAlerts, validateAndFilterAlerts } from "../mta";

// Mock the db module - must be before importing functions that use it
jest.mock("@/lib/db", () => ({
  prisma: {
    alertSource: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    alertEvent: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
  },
}));

// Mock the matching module
jest.mock("@/lib/matching", () => ({
  matchEventToUsers: jest.fn().mockResolvedValue([]),
}));

// Mock the scraper-alerts module
jest.mock("@/lib/scraper-alerts", () => ({
  sendScraperAlert: jest.fn().mockResolvedValue(undefined),
}));

// Mock the scoring module to make all alerts pass the isActionable filter
jest.mock("@/lib/agents/scoring", () => ({
  generateDedupKey: jest.fn((type, title) => `${type}:${title}`),
  classifyTransitAlert: jest.fn().mockReturnValue({
    severity: "major",
    score: 70,
    isActionable: true,
    reason: "Test alert",
  }),
  shouldSuppressTransitAlert: jest.fn().mockReturnValue(false),
}));

// Get mocked prisma for test manipulation
import { prisma } from "@/lib/db";
import { matchEventToUsers } from "@/lib/matching";
import { sendScraperAlert } from "@/lib/scraper-alerts";

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedMatchEventToUsers = matchEventToUsers as jest.MockedFunction<
  typeof matchEventToUsers
>;
const mockedSendScraperAlert = sendScraperAlert as jest.MockedFunction<
  typeof sendScraperAlert
>;

describe("MTA Scraper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * extractAffectedLines Tests
   *
   * These tests verify the GTFS-RT informed_entity parsing logic.
   * The function must:
   * - Extract route_id values from the entity array
   * - Filter to valid subway routes only (excluding buses, LIRR, etc.)
   * - Deduplicate and normalize to uppercase
   */
  describe("extractAffectedLines", () => {
    it("extracts valid subway routes from informed entities", () => {
      // Typical GTFS-RT structure with multiple affected routes
      const entities = [
        { route_id: "G" },
        { route_id: "L" },
        { route_id: "7" },
      ];

      const result = extractAffectedLines(entities);

      expect(result).toHaveLength(3);
      expect(result).toContain("G");
      expect(result).toContain("L");
      expect(result).toContain("7");
    });

    it("filters out non-subway routes (buses, LIRR, Metro-North)", () => {
      // MTA includes non-subway routes in the same feed
      // B63 is a Brooklyn bus, LIRR and MNR are commuter rail
      const entities = [
        { route_id: "G" },
        { route_id: "B63" }, // Bus route - should be filtered
        { route_id: "LIRR" }, // Long Island Rail Road - should be filtered
        { route_id: "MNR" }, // Metro-North - should be filtered
      ];

      const result = extractAffectedLines(entities);

      expect(result).toHaveLength(1);
      expect(result).toContain("G");
      expect(result).not.toContain("B63");
      expect(result).not.toContain("LIRR");
    });

    it("normalizes route IDs to uppercase", () => {
      // GTFS-RT may provide lowercase route IDs
      const entities = [
        { route_id: "g" },
        { route_id: "l" },
        { route_id: "a" },
      ];

      const result = extractAffectedLines(entities);

      expect(result).toEqual(expect.arrayContaining(["G", "L", "A"]));
    });

    it("deduplicates repeated route IDs", () => {
      // Alerts may affect multiple stations on the same line
      const entities = [
        { route_id: "G" },
        { route_id: "G" },
        { route_id: "L" },
        { route_id: "L" },
        { route_id: "L" },
      ];

      const result = extractAffectedLines(entities);

      expect(result).toHaveLength(2);
      expect(result).toContain("G");
      expect(result).toContain("L");
    });

    it("handles empty entity array", () => {
      const result = extractAffectedLines([]);

      expect(result).toHaveLength(0);
    });

    it("handles entities without route_id", () => {
      // Some entities may only have agency_id or stop_id
      const entities = [
        { agency_id: "MTA" },
        { stop_id: "G24N" },
        { route_id: "G" },
      ];

      const result = extractAffectedLines(entities);

      expect(result).toHaveLength(1);
      expect(result).toContain("G");
    });

    it("handles Staten Island Railway (SI) route", () => {
      // SI is the only two-character subway route
      const entities = [{ route_id: "SI" }, { route_id: "si" }];

      const result = extractAffectedLines(entities);

      expect(result).toHaveLength(1);
      expect(result).toContain("SI");
    });

    it("handles all numbered routes (1-7)", () => {
      const entities = [
        { route_id: "1" },
        { route_id: "2" },
        { route_id: "3" },
        { route_id: "4" },
        { route_id: "5" },
        { route_id: "6" },
        { route_id: "7" },
      ];

      const result = extractAffectedLines(entities);

      expect(result).toHaveLength(7);
      ["1", "2", "3", "4", "5", "6", "7"].forEach((line) => {
        expect(result).toContain(line);
      });
    });
  });

  /**
   * fetchMtaAlerts Tests
   *
   * These tests verify the HTTP fetching and transformation logic.
   * The function must:
   * - Make HTTP request to MTA GTFS-RT API
   * - Handle errors gracefully
   * - Transform GTFS-RT schema to internal MtaAlert format
   * - Filter out non-subway alerts
   */
  describe("fetchMtaAlerts", () => {
    // Save original fetch to restore after tests
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("fetches and transforms alerts from MTA API", async () => {
      // Mock successful API response with typical GTFS-RT structure
      const mockResponse = {
        entity: [
          {
            id: "alert-123",
            alert: {
              header_text: {
                translation: [{ text: "G train delays", language: "en" }],
              },
              description_text: {
                translation: [{ text: "Signal problems at Nassau Ave", language: "en" }],
              },
              informed_entity: [{ route_id: "G" }],
              active_period: [{ start: 1704067200, end: 1704070800 }],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const alerts = await fetchMtaAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        id: "alert-123",
        header: "G train delays",
        description: "Signal problems at Nassau Ave",
        affectedLines: ["G"],
      });
    });

    it("throws error on API failure", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(fetchMtaAlerts()).rejects.toThrow("MTA API error: 500");
    });

    it("filters out alerts without subway routes", async () => {
      // API may return alerts for buses or other services
      const mockResponse = {
        entity: [
          {
            id: "subway-alert",
            alert: {
              header_text: { translation: [{ text: "L train delays" }] },
              informed_entity: [{ route_id: "L" }],
            },
          },
          {
            id: "bus-alert",
            alert: {
              header_text: { translation: [{ text: "B63 detour" }] },
              informed_entity: [{ route_id: "B63" }],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const alerts = await fetchMtaAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe("subway-alert");
    });

    it("handles empty entity array", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ entity: [] }),
      });

      const alerts = await fetchMtaAlerts();

      expect(alerts).toHaveLength(0);
    });

    it("handles missing entity field", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const alerts = await fetchMtaAlerts();

      expect(alerts).toHaveLength(0);
    });

    it("uses default header text when translation is missing", async () => {
      const mockResponse = {
        entity: [
          {
            id: "alert-no-text",
            alert: {
              informed_entity: [{ route_id: "G" }],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const alerts = await fetchMtaAlerts();

      expect(alerts[0].header).toBe("Service Alert");
    });
  });

  /**
   * ingestMtaAlerts Tests
   *
   * These tests verify the full ingestion pipeline including:
   * - Database lookups and writes
   * - Deduplication logic
   * - Matching engine integration
   * - Statistics tracking
   */
  describe("ingestMtaAlerts", () => {
    const originalFetch = global.fetch;

    const mockSource = {
      id: "source-123",
      slug: "mta-subway-alerts",
      moduleId: "transit",
      module: { id: "transit", name: "Transit", icon: "subway", description: "Transit alerts", sortOrder: 2 },
    };

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();

      // Setup default mock implementations
      (mockedPrisma.alertSource.findUnique as jest.Mock).mockResolvedValue(mockSource);
      (mockedPrisma.alertSource.update as jest.Mock).mockResolvedValue(mockSource);
      (mockedPrisma.alertEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.alertEvent.create as jest.Mock).mockImplementation((args) => ({
        id: `event-${args.data.externalId}`,
        ...args.data,
        source: mockSource,
      }));
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("creates new events for alerts not in database", async () => {
      // Mock API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            entity: [
              {
                id: "new-alert-1",
                alert: {
                  header_text: { translation: [{ text: "G delays" }] },
                  informed_entity: [{ route_id: "G" }],
                },
              },
              {
                id: "new-alert-2",
                alert: {
                  header_text: { translation: [{ text: "L delays" }] },
                  informed_entity: [{ route_id: "L" }],
                },
              },
            ],
          }),
      });

      const result = await ingestMtaAlerts();

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledTimes(2);
      expect(mockedMatchEventToUsers).toHaveBeenCalledTimes(2);
    });

    it("skips alerts already in database (deduplication)", async () => {
      // First alert exists, second is new
      (mockedPrisma.alertEvent.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "existing" }) // First alert exists
        .mockResolvedValueOnce(null); // Second alert is new

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            entity: [
              {
                id: "existing-alert",
                alert: {
                  header_text: { translation: [{ text: "G delays" }] },
                  informed_entity: [{ route_id: "G" }],
                },
              },
              {
                id: "new-alert",
                alert: {
                  header_text: { translation: [{ text: "L delays" }] },
                  informed_entity: [{ route_id: "L" }],
                },
              },
            ],
          }),
      });

      const result = await ingestMtaAlerts();

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledTimes(1);
    });

    it("throws error when alert source is not configured", async () => {
      (mockedPrisma.alertSource.findUnique as jest.Mock).mockResolvedValue(null);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ entity: [] }),
      });

      await expect(ingestMtaAlerts()).rejects.toThrow(
        "MTA alert source not configured"
      );
    });

    it("updates lastPolledAt on source after ingestion", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ entity: [] }),
      });

      await ingestMtaAlerts();

      expect(mockedPrisma.alertSource.update).toHaveBeenCalledWith({
        where: { id: mockSource.id },
        data: { lastPolledAt: expect.any(Date) },
      });
    });

    it("includes affectedLines in event metadata", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            entity: [
              {
                id: "multi-line-alert",
                alert: {
                  header_text: { translation: [{ text: "Delay" }] },
                  informed_entity: [
                    { route_id: "A" },
                    { route_id: "C" },
                    { route_id: "E" },
                  ],
                },
              },
            ],
          }),
      });

      await ingestMtaAlerts();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: {
              affectedLines: expect.arrayContaining(["A", "C", "E"]),
            },
          }),
        })
      );
    });

    it("converts UNIX timestamps to Date objects for active period", async () => {
      const startTimestamp = 1704067200; // Jan 1, 2024 00:00:00 UTC
      const endTimestamp = 1704153600; // Jan 2, 2024 00:00:00 UTC

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            entity: [
              {
                id: "timed-alert",
                alert: {
                  header_text: { translation: [{ text: "Planned work" }] },
                  informed_entity: [{ route_id: "G" }],
                  active_period: [
                    { start: startTimestamp, end: endTimestamp },
                  ],
                },
              },
            ],
          }),
      });

      await ingestMtaAlerts();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startsAt: new Date(startTimestamp * 1000),
            endsAt: new Date(endTimestamp * 1000),
          }),
        })
      );
    });

    it("handles alerts without active period", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            entity: [
              {
                id: "no-period-alert",
                alert: {
                  header_text: { translation: [{ text: "Alert" }] },
                  informed_entity: [{ route_id: "G" }],
                  // No active_period field
                },
              },
            ],
          }),
      });

      await ingestMtaAlerts();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startsAt: null,
            endsAt: null,
          }),
        })
      );
    });

    it("calls matchEventToUsers for each new event", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            entity: [
              {
                id: "alert-1",
                alert: {
                  header_text: { translation: [{ text: "Alert 1" }] },
                  informed_entity: [{ route_id: "G" }],
                },
              },
            ],
          }),
      });

      await ingestMtaAlerts();

      expect(mockedMatchEventToUsers).toHaveBeenCalledTimes(1);
      expect(mockedMatchEventToUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.objectContaining({
            module: expect.objectContaining({ id: "transit" }),
          }),
        })
      );
    });
  });

  /**
   * validateAndFilterAlerts Tests
   *
   * These tests verify the Zod validation layer that implements partial ingestion.
   * The function must:
   * - Validate each raw alert against the MtaAlertSchema
   * - Return valid alerts for processing
   * - Collect validation errors for admin notification
   * - Handle malformed data gracefully without throwing
   *
   * Architectural Context:
   * This validation layer implements the "circuit breaker monitoring" pattern:
   * valid data flows through while errors are aggregated for alerting.
   * This ensures upstream schema changes don't completely break ingestion.
   */
  describe("validateAndFilterAlerts", () => {
    it("returns valid alerts and collects errors", () => {
      const rawAlerts = [
        { id: "1", header: "Valid alert", affectedLines: ["L"] },
        { id: "2", header: "", affectedLines: ["G"] }, // Invalid: empty header
        { id: "3", header: "Another valid", affectedLines: ["A"] },
      ];

      const { valid, errors } = validateAndFilterAlerts(rawAlerts);

      expect(valid).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0].payload).toEqual(rawAlerts[1]);
      expect(errors[0].source).toBe("mta");
      expect(errors[0].error).toContain("header");
    });

    it("handles completely malformed data", () => {
      const rawAlerts = [
        { garbage: true },
        null,
        { id: "1", header: "Valid", affectedLines: ["L"] },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { valid, errors } = validateAndFilterAlerts(rawAlerts as any);

      expect(valid).toHaveLength(1);
      expect(errors).toHaveLength(2);
    });

    it("validates all required fields", () => {
      const rawAlerts = [
        { header: "Missing id", affectedLines: ["L"] }, // Missing id
        { id: "2", affectedLines: ["G"] }, // Missing header
        { id: "3", header: "Missing lines" }, // Missing affectedLines
        { id: "4", header: "Empty lines", affectedLines: [] }, // Empty affectedLines
        { id: "5", header: "Valid complete", affectedLines: ["A"], description: "Optional desc" },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { valid, errors } = validateAndFilterAlerts(rawAlerts as any);

      expect(valid).toHaveLength(1);
      expect(valid[0].id).toBe("5");
      expect(errors).toHaveLength(4);
    });

    it("preserves optional fields on valid alerts", () => {
      const rawAlerts = [
        {
          id: "1",
          header: "Full alert",
          description: "Detailed description",
          affectedLines: ["L", "G"],
          activePeriod: { start: 1704067200, end: 1704153600 },
        },
      ];

      const { valid, errors } = validateAndFilterAlerts(rawAlerts);

      expect(valid).toHaveLength(1);
      expect(errors).toHaveLength(0);
      expect(valid[0].description).toBe("Detailed description");
      expect(valid[0].activePeriod?.start).toBe(1704067200);
      expect(valid[0].activePeriod?.end).toBe(1704153600);
    });
  });
});
