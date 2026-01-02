// src/lib/scrapers/__tests__/housing-connect.test.ts
/**
 * Test suite for Housing Connect Lottery Scraper
 *
 * This module tests the primary functions of the Housing Connect scraper:
 * 1. normalizeNeighborhood - Neighborhood string normalization
 * 2. parseDeadline - Date parsing from various formats
 * 3. fetchHousingLotteries - HTML scraping and transformation (mocked)
 * 4. ingestHousingLotteries - Full ingestion pipeline with database operations (mocked)
 *
 * Testing Strategy:
 * - Unit tests for pure functions (normalizeNeighborhood, parseDeadline)
 * - Integration tests with mocked external dependencies (fetchHousingLotteries, ingestHousingLotteries)
 * - Edge case coverage for malformed data and error conditions
 *
 * Mock Philosophy:
 * External dependencies (HTTP, database) are mocked to ensure:
 * - Tests are deterministic and reproducible
 * - Tests run without network or database access
 * - Tests execute quickly for rapid feedback during development
 *
 * NYC Housing Context:
 * Housing Connect (housingconnect.nyc.gov) is NYC's centralized portal for
 * affordable housing lottery applications. Lotteries are categorized by:
 * - AMI (Area Median Income) brackets for income eligibility
 * - Neighborhood/borough location
 * - Application deadline
 */

import {
  fetchHousingLotteries,
  ingestHousingLotteries,
  normalizeNeighborhood,
  parseDeadline,
} from "../housing-connect";

// Mock the db module - must be before importing functions that use it
jest.mock("@/lib/db", () => ({
  prisma: {
    alertSource: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    alertEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock the matching module
jest.mock("@/lib/matching", () => ({
  matchEventToUsers: jest.fn().mockResolvedValue([]),
}));

// Get mocked prisma for test manipulation
import { prisma } from "@/lib/db";
import { matchEventToUsers } from "@/lib/matching";

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedMatchEventToUsers = matchEventToUsers as jest.MockedFunction<
  typeof matchEventToUsers
>;

describe("Housing Connect Scraper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * normalizeNeighborhood Tests
   *
   * These tests verify the neighborhood string normalization logic.
   * The function must:
   * - Convert to lowercase
   * - Replace spaces with hyphens
   * - Remove non-alphanumeric characters except hyphens
   */
  describe("normalizeNeighborhood", () => {
    it("converts neighborhood to lowercase slug format", () => {
      const result = normalizeNeighborhood("Upper West Side");
      expect(result).toBe("upper-west-side");
    });

    it("handles already lowercase input", () => {
      const result = normalizeNeighborhood("brooklyn");
      expect(result).toBe("brooklyn");
    });

    it("handles multiple spaces", () => {
      const result = normalizeNeighborhood("Fort   Greene");
      expect(result).toBe("fort-greene");
    });

    it("removes special characters", () => {
      const result = normalizeNeighborhood("Bedford-Stuyvesant (Bed-Stuy)");
      expect(result).toBe("bedford-stuyvesant-bed-stuy");
    });

    it("trims whitespace", () => {
      const result = normalizeNeighborhood("  Williamsburg  ");
      expect(result).toBe("williamsburg");
    });

    it("handles empty string", () => {
      const result = normalizeNeighborhood("");
      expect(result).toBe("");
    });

    it("handles numbers in neighborhood names", () => {
      // E.g., "East 116th Street" areas
      const result = normalizeNeighborhood("East 116th Street");
      expect(result).toBe("east-116th-street");
    });

    it("normalizes common NYC neighborhoods consistently", () => {
      // Test a variety of NYC neighborhoods to ensure consistent output
      expect(normalizeNeighborhood("Astoria")).toBe("astoria");
      expect(normalizeNeighborhood("Long Island City")).toBe("long-island-city");
      expect(normalizeNeighborhood("Jackson Heights")).toBe("jackson-heights");
      expect(normalizeNeighborhood("Sunset Park")).toBe("sunset-park");
      expect(normalizeNeighborhood("South Bronx")).toBe("south-bronx");
    });
  });

  /**
   * parseDeadline Tests
   *
   * These tests verify date parsing from various formats.
   * The function must:
   * - Parse standard date formats
   * - Remove common prefixes like "Apply by"
   * - Return a valid date or fallback to 30 days from now
   */
  describe("parseDeadline", () => {
    it("parses standard date format", () => {
      const result = parseDeadline("January 15, 2025");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(15);
    });

    it("parses MM/DD/YYYY format", () => {
      const result = parseDeadline("01/15/2025");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it("removes 'Apply by' prefix", () => {
      const result = parseDeadline("Apply by January 15, 2025");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it("removes 'apply by' prefix (case insensitive)", () => {
      const result = parseDeadline("apply by February 20, 2025");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1); // February is 1
      expect(result.getDate()).toBe(20);
    });

    it("removes 'Deadline:' prefix", () => {
      const result = parseDeadline("Deadline: March 10, 2025");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(2); // March is 2
      expect(result.getDate()).toBe(10);
    });

    it("returns fallback date for invalid input", () => {
      const before = new Date();
      const result = parseDeadline("invalid date string");
      const after = new Date();

      // Should be approximately 30 days from now
      const expectedMin = new Date(before.getTime() + 29 * 24 * 60 * 60 * 1000);
      const expectedMax = new Date(after.getTime() + 31 * 24 * 60 * 60 * 1000);

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });

    it("returns fallback date for empty string", () => {
      const now = new Date();
      const result = parseDeadline("");

      // Should be approximately 30 days from now
      const expected = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const diffDays = Math.abs(result.getTime() - expected.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeLessThan(1);
    });
  });

  /**
   * fetchHousingLotteries Tests
   *
   * These tests verify the HTML scraping and transformation logic.
   * The function must:
   * - Make HTTP request to Housing Connect
   * - Handle errors gracefully
   * - Parse HTML using Cheerio
   * - Transform DOM elements to HousingLottery interface
   */
  describe("fetchHousingLotteries", () => {
    // Save original fetch to restore after tests
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("fetches and parses lotteries from Housing Connect HTML", async () => {
      // Mock successful response with typical lottery card structure
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="123456">
              <h3 class="lottery-name">Affordable Housing at 123 Main St</h3>
              <div class="lottery-address">123 Main Street, Brooklyn, NY 11201</div>
              <div class="lottery-neighborhood">Downtown Brooklyn</div>
              <div class="lottery-deadline">Apply by January 15, 2025</div>
              <span class="income-bracket">50-80% AMI</span>
              <span class="income-bracket">80-130% AMI</span>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const lotteries = await fetchHousingLotteries();

      expect(lotteries).toHaveLength(1);
      expect(lotteries[0]).toMatchObject({
        id: "123456",
        name: "Affordable Housing at 123 Main St",
        address: "123 Main Street, Brooklyn, NY 11201",
        neighborhood: "downtown-brooklyn",
        incomeBrackets: ["50-80% AMI", "80-130% AMI"],
      });
      expect(lotteries[0].url).toContain("123456");
    });

    it("throws error on HTTP failure", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(fetchHousingLotteries()).rejects.toThrow(
        "Housing Connect error: 500"
      );
    });

    it("handles 403 forbidden error", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(fetchHousingLotteries()).rejects.toThrow(
        "Housing Connect error: 403"
      );
    });

    it("handles empty lottery listings", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="no-results">No lotteries available</div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const lotteries = await fetchHousingLotteries();

      expect(lotteries).toHaveLength(0);
    });

    it("handles multiple lottery cards", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="111">
              <h3 class="lottery-name">Building A</h3>
              <div class="lottery-address">111 First Ave</div>
              <div class="lottery-neighborhood">East Village</div>
              <div class="lottery-deadline">January 20, 2025</div>
              <span class="income-bracket">30-50% AMI</span>
            </div>
            <div class="lottery-card" data-lottery-id="222">
              <h3 class="lottery-name">Building B</h3>
              <div class="lottery-address">222 Second Ave</div>
              <div class="lottery-neighborhood">Murray Hill</div>
              <div class="lottery-deadline">February 15, 2025</div>
              <span class="income-bracket">80-130% AMI</span>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const lotteries = await fetchHousingLotteries();

      expect(lotteries).toHaveLength(2);
      expect(lotteries[0].id).toBe("111");
      expect(lotteries[1].id).toBe("222");
    });

    it("skips lottery cards without ID", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card">
              <h3 class="lottery-name">Invalid Lottery (no ID)</h3>
            </div>
            <div class="lottery-card" data-lottery-id="valid123">
              <h3 class="lottery-name">Valid Lottery</h3>
              <div class="lottery-address">123 Valid St</div>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const lotteries = await fetchHousingLotteries();

      expect(lotteries).toHaveLength(1);
      expect(lotteries[0].id).toBe("valid123");
    });

    it("skips lottery cards without name", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="no-name">
              <div class="lottery-address">123 No Name St</div>
            </div>
            <div class="lottery-card" data-lottery-id="has-name">
              <h3 class="lottery-name">Has Name</h3>
              <div class="lottery-address">456 Named St</div>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const lotteries = await fetchHousingLotteries();

      expect(lotteries).toHaveLength(1);
      expect(lotteries[0].name).toBe("Has Name");
    });

    it("extracts lottery ID from detail link href when data attribute missing", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card">
              <a href="/PublicWeb/details/789">
                <h3 class="lottery-name">Linked Lottery</h3>
              </a>
              <div class="lottery-address">789 Link St</div>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const lotteries = await fetchHousingLotteries();

      expect(lotteries).toHaveLength(1);
      expect(lotteries[0].id).toBe("789");
    });

    it("handles lotteries without income brackets", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="no-brackets">
              <h3 class="lottery-name">General Housing</h3>
              <div class="lottery-address">100 Generic St</div>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const lotteries = await fetchHousingLotteries();

      expect(lotteries).toHaveLength(1);
      expect(lotteries[0].incomeBrackets).toEqual([]);
    });
  });

  /**
   * ingestHousingLotteries Tests
   *
   * These tests verify the full ingestion pipeline including:
   * - Database lookups and writes
   * - Deduplication logic
   * - Matching engine integration
   * - Statistics tracking
   */
  describe("ingestHousingLotteries", () => {
    const originalFetch = global.fetch;

    const mockSource = {
      id: "source-housing",
      slug: "housing-connect-lotteries",
      moduleId: "housing",
      module: {
        id: "housing",
        name: "Housing",
        icon: "home",
        description: "Affordable housing lotteries",
        sortOrder: 3,
      },
    };

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();

      // Setup default mock implementations
      (mockedPrisma.alertSource.findUnique as jest.Mock).mockResolvedValue(
        mockSource
      );
      (mockedPrisma.alertSource.update as jest.Mock).mockResolvedValue(
        mockSource
      );
      (mockedPrisma.alertEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.alertEvent.create as jest.Mock).mockImplementation(
        (args) => ({
          id: `event-${args.data.externalId}`,
          ...args.data,
          source: mockSource,
        })
      );
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("creates new events for lotteries not in database", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="new-1">
              <h3 class="lottery-name">New Housing 1</h3>
              <div class="lottery-address">123 New St</div>
              <div class="lottery-neighborhood">Brooklyn</div>
              <div class="lottery-deadline">January 30, 2025</div>
              <span class="income-bracket">50-80% AMI</span>
            </div>
            <div class="lottery-card" data-lottery-id="new-2">
              <h3 class="lottery-name">New Housing 2</h3>
              <div class="lottery-address">456 New Ave</div>
              <div class="lottery-neighborhood">Queens</div>
              <div class="lottery-deadline">February 15, 2025</div>
              <span class="income-bracket">80-130% AMI</span>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await ingestHousingLotteries();

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledTimes(2);
      expect(mockedMatchEventToUsers).toHaveBeenCalledTimes(2);
    });

    it("skips lotteries already in database (deduplication)", async () => {
      // First lottery exists, second is new
      (mockedPrisma.alertEvent.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "existing" }) // First lottery exists
        .mockResolvedValueOnce(null); // Second lottery is new

      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="existing-lottery">
              <h3 class="lottery-name">Existing Housing</h3>
              <div class="lottery-address">Old St</div>
            </div>
            <div class="lottery-card" data-lottery-id="new-lottery">
              <h3 class="lottery-name">New Housing</h3>
              <div class="lottery-address">New St</div>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await ingestHousingLotteries();

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledTimes(1);
    });

    it("throws error when alert source is not configured", async () => {
      (mockedPrisma.alertSource.findUnique as jest.Mock).mockResolvedValue(null);

      const mockHtml = `<html><body></body></html>`;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await expect(ingestHousingLotteries()).rejects.toThrow(
        "Housing Connect source not configured"
      );
    });

    it("updates lastPolledAt on source after ingestion", async () => {
      const mockHtml = `<html><body></body></html>`;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestHousingLotteries();

      expect(mockedPrisma.alertSource.update).toHaveBeenCalledWith({
        where: { id: mockSource.id },
        data: { lastPolledAt: expect.any(Date) },
      });
    });

    it("includes incomeBrackets in event metadata", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="multi-bracket">
              <h3 class="lottery-name">Multi-Bracket Housing</h3>
              <div class="lottery-address">789 Multi St</div>
              <div class="lottery-neighborhood">Harlem</div>
              <div class="lottery-deadline">March 1, 2025</div>
              <span class="income-bracket">30-50% AMI</span>
              <span class="income-bracket">50-80% AMI</span>
              <span class="income-bracket">80-130% AMI</span>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestHousingLotteries();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              incomeBrackets: expect.arrayContaining([
                "30-50% AMI",
                "50-80% AMI",
                "80-130% AMI",
              ]),
            }),
          }),
        })
      );
    });

    it("includes neighborhood in event neighborhoods array", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="neighborhood-test">
              <h3 class="lottery-name">Neighborhood Test</h3>
              <div class="lottery-address">123 Test St</div>
              <div class="lottery-neighborhood">Fort Greene</div>
              <div class="lottery-deadline">April 1, 2025</div>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestHousingLotteries();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            neighborhoods: ["fort-greene"],
          }),
        })
      );
    });

    it("sets startsAt to current date and endsAt to application deadline", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="deadline-test">
              <h3 class="lottery-name">Deadline Test</h3>
              <div class="lottery-address">456 Test Ave</div>
              <div class="lottery-deadline">December 31, 2025</div>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const beforeTest = new Date();
      await ingestHousingLotteries();
      const afterTest = new Date();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startsAt: expect.any(Date),
            endsAt: expect.any(Date),
          }),
        })
      );

      // Verify startsAt is approximately now
      const createCall = (mockedPrisma.alertEvent.create as jest.Mock).mock
        .calls[0][0];
      const startsAt = createCall.data.startsAt;
      expect(startsAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(startsAt.getTime()).toBeLessThanOrEqual(afterTest.getTime());

      // Verify endsAt is the deadline
      const endsAt = createCall.data.endsAt;
      expect(endsAt.getFullYear()).toBe(2025);
      expect(endsAt.getMonth()).toBe(11); // December
      expect(endsAt.getDate()).toBe(31);
    });

    it("calls matchEventToUsers for each new event", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="match-test">
              <h3 class="lottery-name">Match Test Housing</h3>
              <div class="lottery-address">Match Ave</div>
              <span class="income-bracket">50-80% AMI</span>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestHousingLotteries();

      expect(mockedMatchEventToUsers).toHaveBeenCalledTimes(1);
      expect(mockedMatchEventToUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.objectContaining({
            module: expect.objectContaining({ id: "housing" }),
          }),
        })
      );
    });

    it("handles empty neighborhoods gracefully", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="no-neighborhood">
              <h3 class="lottery-name">No Neighborhood</h3>
              <div class="lottery-address">123 Unknown St</div>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestHousingLotteries();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            neighborhoods: [],
          }),
        })
      );
    });

    it("creates correct event title format", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="title-test">
              <h3 class="lottery-name">The Grand Residences</h3>
              <div class="lottery-address">100 Grand Ave</div>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestHousingLotteries();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "New Housing Lottery: The Grand Residences",
          }),
        })
      );
    });

    it("includes URL in event body and metadata", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="lottery-card" data-lottery-id="url-test">
              <h3 class="lottery-name">URL Test</h3>
              <div class="lottery-address">URL Ave</div>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestHousingLotteries();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: expect.stringContaining(
              "https://housingconnect.nyc.gov/PublicWeb/details/url-test"
            ),
            metadata: expect.objectContaining({
              url: "https://housingconnect.nyc.gov/PublicWeb/details/url-test",
            }),
          }),
        })
      );
    });
  });
});
