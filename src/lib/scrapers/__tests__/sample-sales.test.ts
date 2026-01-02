// src/lib/scrapers/__tests__/sample-sales.test.ts
/**
 * Test suite for 260 Sample Sale Scraper
 *
 * This module tests the primary functions of the 260 Sample Sale scraper:
 * 1. parseDateRange - Parse date range strings like "Jan 15-18, 2026"
 * 2. fetch260SampleSales - HTML scraping and transformation (mocked)
 * 3. ingestSampleSales - Full ingestion pipeline with database operations (mocked)
 *
 * Testing Strategy:
 * - Unit tests for pure functions (parseDateRange)
 * - Integration tests with mocked external dependencies (fetch260SampleSales, ingestSampleSales)
 * - Edge case coverage for malformed data and error conditions
 *
 * 260 Sample Sale Context:
 * 260 Sample Sale is one of NYC's premier sample sale operators, hosting
 * designer brand sales at their flagship location at 260 Fifth Avenue in Manhattan.
 * Sample sales offer luxury and designer goods at significant discounts (40-80% off retail),
 * typically lasting 3-5 days with inventory from previous seasons or excess stock.
 *
 * The scraper monitors their website for upcoming sales, enabling NYC Ping users
 * to receive notifications when their favorite brands have upcoming sample sales.
 */

import {
  fetch260SampleSales,
  ingestSampleSales,
  parseDateRange,
} from "../sample-sales";

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

describe("260 Sample Sale Scraper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * parseDateRange Tests
   *
   * 260 Sample Sale uses various date formats:
   * - "Jan 15-18, 2026" (multi-day same month)
   * - "January 15, 2026" (single day)
   * - "Dec 28 - Jan 2, 2026" (cross-month, rare)
   *
   * The function must parse these reliably to determine sale duration.
   */
  describe("parseDateRange", () => {
    it("parses multi-day date range within same month", () => {
      const result = parseDateRange("Jan 15-18, 2026");
      expect(result.start).not.toBeNull();
      expect(result.end).not.toBeNull();
      expect(result.start?.getFullYear()).toBe(2026);
      expect(result.start?.getMonth()).toBe(0); // January is 0
      expect(result.start?.getDate()).toBe(15);
      expect(result.end?.getMonth()).toBe(0);
      expect(result.end?.getDate()).toBe(18);
    });

    it("parses single day date", () => {
      const result = parseDateRange("February 20, 2026");
      expect(result.start).not.toBeNull();
      expect(result.start?.getFullYear()).toBe(2026);
      expect(result.start?.getMonth()).toBe(1); // February is 1
      expect(result.start?.getDate()).toBe(20);
      // Single day - end should be null or same as start
      expect(result.end).toBeNull();
    });

    it("parses abbreviated month names", () => {
      const result = parseDateRange("Mar 5-8, 2026");
      expect(result.start?.getMonth()).toBe(2); // March
      expect(result.start?.getDate()).toBe(5);
      expect(result.end?.getDate()).toBe(8);
    });

    it("parses full month names", () => {
      const result = parseDateRange("December 10-14, 2026");
      expect(result.start?.getMonth()).toBe(11); // December
      expect(result.start?.getDate()).toBe(10);
      expect(result.end?.getDate()).toBe(14);
    });

    it("handles date without comma before year", () => {
      const result = parseDateRange("Jan 15-18 2026");
      expect(result.start).not.toBeNull();
      expect(result.start?.getFullYear()).toBe(2026);
    });

    it("returns null for invalid date format", () => {
      const result = parseDateRange("invalid date string");
      expect(result.start).toBeNull();
      expect(result.end).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = parseDateRange("");
      expect(result.start).toBeNull();
      expect(result.end).toBeNull();
    });

    it("handles date ranges at end of month", () => {
      const result = parseDateRange("Jan 28-31, 2026");
      expect(result.start?.getDate()).toBe(28);
      expect(result.end?.getDate()).toBe(31);
    });

    it("handles single digit days", () => {
      const result = parseDateRange("Apr 3-7, 2026");
      expect(result.start?.getDate()).toBe(3);
      expect(result.end?.getDate()).toBe(7);
    });
  });

  /**
   * fetch260SampleSales Tests
   *
   * These tests verify the HTML scraping and transformation logic.
   * The function must:
   * - Make HTTP request to 260samplesale.com
   * - Handle errors gracefully
   * - Parse HTML using Cheerio
   * - Transform DOM elements to SampleSale interface
   * - Generate stable IDs from brand + dates
   */
  describe("fetch260SampleSales", () => {
    // Save original fetch to restore after tests
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("fetches and parses sample sales from 260 Sample Sale HTML", async () => {
      // Mock successful response with typical sale listing structure
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-location">260 Fifth Avenue, 4th Floor</div>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory-january-2026">View Details</a>
              <p class="sale-description">Up to 80% off women's and men's apparel</p>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const sales = await fetch260SampleSales();

      expect(sales).toHaveLength(1);
      expect(sales[0]).toMatchObject({
        brand: "Theory",
        location: "260 Fifth Avenue, 4th Floor",
        description: "Up to 80% off women's and men's apparel",
      });
      expect(sales[0].id).toContain("theory");
      expect(sales[0].url).toContain("260samplesale.com");
    });

    it("throws error on HTTP failure", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(fetch260SampleSales()).rejects.toThrow(
        "260 Sample Sale error: 500"
      );
    });

    it("throws error on 403 forbidden", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(fetch260SampleSales()).rejects.toThrow(
        "260 Sample Sale error: 403"
      );
    });

    it("handles empty sale listings", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="no-sales">Check back soon for upcoming sales</div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const sales = await fetch260SampleSales();
      expect(sales).toHaveLength(0);
    });

    it("handles multiple sale listings", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-location">260 Fifth Avenue</div>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory">Details</a>
            </div>
            <div class="sale-listing">
              <h3 class="sale-brand">Vince</h3>
              <div class="sale-location">260 Fifth Avenue</div>
              <div class="sale-dates">Jan 22-25, 2026</div>
              <a href="/sales/vince">Details</a>
            </div>
            <div class="sale-listing">
              <h3 class="sale-brand">Rag & Bone</h3>
              <div class="sale-location">260 Fifth Avenue</div>
              <div class="sale-dates">Feb 5-8, 2026</div>
              <a href="/sales/rag-bone">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const sales = await fetch260SampleSales();

      expect(sales).toHaveLength(3);
      expect(sales[0].brand).toBe("Theory");
      expect(sales[1].brand).toBe("Vince");
      expect(sales[2].brand).toBe("Rag & Bone");
    });

    it("generates stable ID from brand and dates", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const sales = await fetch260SampleSales();

      // ID should be slug-format with brand and dates
      expect(sales[0].id).toBe("260-theory-Jan-15-18,-2026");
    });

    it("skips listings without brand", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <div class="sale-dates">Jan 15-18, 2026</div>
            </div>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-dates">Jan 22-25, 2026</div>
              <a href="/sales/theory">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const sales = await fetch260SampleSales();

      expect(sales).toHaveLength(1);
      expect(sales[0].brand).toBe("Theory");
    });

    it("skips listings with unparseable dates", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Invalid Brand</h3>
              <div class="sale-dates">TBD</div>
            </div>
            <div class="sale-listing">
              <h3 class="sale-brand">Valid Brand</h3>
              <div class="sale-dates">Jan 22-25, 2026</div>
              <a href="/sales/valid">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const sales = await fetch260SampleSales();

      expect(sales).toHaveLength(1);
      expect(sales[0].brand).toBe("Valid Brand");
    });

    it("handles relative URLs by prepending base URL", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory-january">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const sales = await fetch260SampleSales();

      expect(sales[0].url).toBe("https://260samplesale.com/sales/theory-january");
    });

    it("preserves absolute URLs", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="https://260samplesale.com/sales/theory">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const sales = await fetch260SampleSales();

      expect(sales[0].url).toBe("https://260samplesale.com/sales/theory");
    });

    it("uses end date same as start date for single day sales", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Pop-Up Brand</h3>
              <div class="sale-dates">March 5, 2026</div>
              <a href="/popup">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const sales = await fetch260SampleSales();

      expect(sales).toHaveLength(1);
      expect(sales[0].startDate.getTime()).toBe(sales[0].endDate.getTime());
    });
  });

  /**
   * ingestSampleSales Tests
   *
   * These tests verify the full ingestion pipeline including:
   * - Database lookups and writes
   * - Deduplication logic by externalId
   * - Matching engine integration
   * - Statistics tracking
   * - Brand metadata for matching
   */
  describe("ingestSampleSales", () => {
    const originalFetch = global.fetch;

    const mockSource = {
      id: "source-260-sample-sale",
      slug: "260-sample-sale",
      moduleId: "deals",
      module: {
        id: "deals",
        name: "Deals",
        icon: "tag",
        description: "Sample sales and deals",
        sortOrder: 6,
      },
    };

    beforeEach(() => {
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

    it("creates new events for sales not in database", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-location">260 Fifth Avenue</div>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory">Details</a>
            </div>
            <div class="sale-listing">
              <h3 class="sale-brand">Vince</h3>
              <div class="sale-location">260 Fifth Avenue</div>
              <div class="sale-dates">Jan 22-25, 2026</div>
              <a href="/sales/vince">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await ingestSampleSales();

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledTimes(2);
      expect(mockedMatchEventToUsers).toHaveBeenCalledTimes(2);
    });

    it("skips sales already in database (deduplication)", async () => {
      // First sale exists, second is new
      (mockedPrisma.alertEvent.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "existing" }) // First sale exists
        .mockResolvedValueOnce(null); // Second sale is new

      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Existing Brand</h3>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/existing">Details</a>
            </div>
            <div class="sale-listing">
              <h3 class="sale-brand">New Brand</h3>
              <div class="sale-dates">Jan 22-25, 2026</div>
              <a href="/sales/new">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await ingestSampleSales();

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

      await expect(ingestSampleSales()).rejects.toThrow(
        "260 Sample Sale source not configured"
      );
    });

    it("updates lastPolledAt on source after ingestion", async () => {
      const mockHtml = `<html><body></body></html>`;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestSampleSales();

      expect(mockedPrisma.alertSource.update).toHaveBeenCalledWith({
        where: { id: mockSource.id },
        data: { lastPolledAt: expect.any(Date) },
      });
    });

    it("includes brand in event metadata for matching", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-location">260 Fifth Avenue</div>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestSampleSales();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              brands: ["theory"],
            }),
          }),
        })
      );
    });

    it("sets neighborhoods to manhattan for 260 sales", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-location">260 Fifth Avenue</div>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestSampleSales();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            neighborhoods: ["manhattan"],
          }),
        })
      );
    });

    it("creates correct event title format with brand name", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Rag & Bone</h3>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/rag-bone">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestSampleSales();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Rag & Bone Sample Sale",
          }),
        })
      );
    });

    it("sets startsAt and endsAt from parsed dates", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestSampleSales();

      const createCall = (mockedPrisma.alertEvent.create as jest.Mock).mock
        .calls[0][0];

      expect(createCall.data.startsAt.getMonth()).toBe(0); // January
      expect(createCall.data.startsAt.getDate()).toBe(15);
      expect(createCall.data.endsAt.getMonth()).toBe(0);
      expect(createCall.data.endsAt.getDate()).toBe(18);
    });

    it("includes URL in event body and metadata", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-location">260 Fifth Avenue</div>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory-jan-2026">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestSampleSales();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              url: "https://260samplesale.com/sales/theory-jan-2026",
            }),
          }),
        })
      );
    });

    it("calls matchEventToUsers for each new event", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestSampleSales();

      expect(mockedMatchEventToUsers).toHaveBeenCalledTimes(1);
      expect(mockedMatchEventToUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.objectContaining({
            module: expect.objectContaining({ id: "deals" }),
          }),
        })
      );
    });

    it("includes location in event body", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-location">260 Fifth Avenue, 4th Floor</div>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await ingestSampleSales();

      expect(mockedPrisma.alertEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: expect.stringContaining("260 Fifth Avenue, 4th Floor"),
          }),
        })
      );
    });

    it("handles sales with missing optional description", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sale-listing">
              <h3 class="sale-brand">Theory</h3>
              <div class="sale-location">260 Fifth Avenue</div>
              <div class="sale-dates">Jan 15-18, 2026</div>
              <a href="/sales/theory">Details</a>
            </div>
          </body>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      // Should not throw
      const result = await ingestSampleSales();
      expect(result.created).toBe(1);
    });
  });
});
