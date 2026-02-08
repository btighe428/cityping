// src/lib/__tests__/email-digest.test.ts
/**
 * Test Suite for Email Digest Functions
 *
 * This module tests the email digest functionality, specifically:
 * 1. Referral code generation/retrieval (getReferralCode)
 * 2. Email template building with referral section (buildDigestHtml)
 *
 * These tests verify the Task 6.5 implementation that adds referral promotion
 * to the daily email digest footer, enabling viral growth through user-to-user
 * sharing with a double-sided incentive (1 free month for referrer on conversion).
 *
 * Testing Philosophy:
 * - Unit tests for pure functions (buildDigestHtml)
 * - Integration-style tests with mocked Prisma for async functions (getReferralCode)
 * - Verification of both success paths and graceful degradation on errors
 */

import {
  buildDigestHtml,
  getReferralCode,
  GroupedEvents,
  EventWithModule,
  FeedbackTokenMap,
} from "../email-digest";

// Mock Prisma
jest.mock("../db", () => ({
  prisma: {
    referral: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock the referral code generation to be deterministic in tests
jest.mock("../referral-service", () => ({
  generateReferralCode: jest.fn().mockReturnValue("NYC-TEST1"),
}));

// Import mocked modules after mocking
import { prisma } from "../db";
import { generateReferralCode } from "../referral-service";

// Helper to create mock events for testing
function createMockEvents(): GroupedEvents {
  const mockModule = {
    id: "parking",
    name: "Parking & Driving",
    description: "Parking alerts",
    icon: "P",
    sortOrder: 1,
  };

  const mockSource = {
    id: "source-1",
    moduleId: "parking",
    slug: "asp-calendar",
    name: "ASP Calendar",
    frequency: "daily" as const,
    enabled: true,
    config: {},
    lastPolledAt: null,
    lastEventAt: null,
    module: mockModule,
  };

  const mockEvent: EventWithModule = {
    id: "event-1",
    sourceId: "source-1",
    externalId: "ext-1",
    title: "ASP Suspended Tomorrow",
    body: "Alternate side parking rules suspended for holiday",
    startsAt: new Date("2026-01-05"),
    endsAt: null,
    neighborhoods: ["williamsburg"],
    metadata: {},
    createdAt: new Date(),
    expiresAt: null,
    hypeScore: null,
    hypeFactors: null,
    venueType: null,
    weatherScore: null,
    isWeatherSafe: null,
    embeddingModel: null,
    embeddingAt: null,
    topicClusterId: null,
    source: mockSource,
  };

  return {
    parking: [mockEvent],
  };
}

describe("email-digest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_BASE_URL = "https://cityping.com";
  });

  afterEach(() => {
    delete process.env.APP_BASE_URL;
  });

  /**
   * getReferralCode Tests
   *
   * This function manages the lazy creation and retrieval of shareable
   * referral codes for users. It ensures each user has exactly one active
   * shareable referral code at any time.
   */
  describe("getReferralCode", () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
    };

    /**
     * Returns existing code when user already has a valid shareable referral.
     * This ensures we don't create duplicate referral codes for the same user.
     */
    it("returns existing referral code when one exists", async () => {
      const existingReferral = {
        id: "ref-1",
        referralCode: "NYC-EXIST",
        referrerId: "user-123",
        refereeEmail: "share.user-123@cityping.internal",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days future
      };

      (prisma.referral.findFirst as jest.Mock).mockResolvedValue(existingReferral);

      const code = await getReferralCode("user-123");

      expect(code).toBe("NYC-EXIST");
      expect(prisma.referral.findFirst).toHaveBeenCalledWith({
        where: {
          referrerId: "user-123",
          refereeEmail: "share.user-123@cityping.internal",
          status: "PENDING",
          expiresAt: { gt: expect.any(Date) },
        },
      });
      // Should not create a new referral
      expect(prisma.referral.create).not.toHaveBeenCalled();
    });

    /**
     * Creates a new referral code when user doesn't have an existing one.
     * This is the "lazy creation" behavior - codes are generated on first request.
     */
    it("creates new referral code when none exists", async () => {
      (prisma.referral.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.referral.create as jest.Mock).mockResolvedValue({
        id: "ref-new",
        referralCode: "NYC-TEST1",
        referrerId: "user-123",
        refereeEmail: "share.user-123@cityping.internal",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      const code = await getReferralCode("user-123");

      expect(code).toBe("NYC-TEST1");
      expect(prisma.referral.create).toHaveBeenCalledWith({
        data: {
          referrerId: "user-123",
          refereeEmail: "share.user-123@cityping.internal",
          referralCode: "NYC-TEST1",
          status: "PENDING",
          expiresAt: expect.any(Date),
        },
      });
    });

    /**
     * Returns null when user doesn't exist in the database.
     * This is a graceful degradation - the digest will still be sent,
     * just without the referral section.
     */
    it("returns null when user does not exist", async () => {
      (prisma.referral.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const code = await getReferralCode("nonexistent-user");

      expect(code).toBeNull();
      expect(prisma.referral.create).not.toHaveBeenCalled();
    });

    /**
     * Returns null on database errors instead of throwing.
     * Email digests should still be sent even if referral code generation fails.
     */
    it("returns null on database error (graceful degradation)", async () => {
      (prisma.referral.findFirst as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const code = await getReferralCode("user-123");

      expect(code).toBeNull();
    });

    /**
     * Creates new code when existing referral has expired.
     * The findFirst query filters by expiresAt > now, so expired referrals
     * won't be returned, triggering new code creation.
     */
    it("creates new code when existing referral is expired", async () => {
      // findFirst returns null because expired referrals are filtered out
      (prisma.referral.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.referral.create as jest.Mock).mockResolvedValue({
        id: "ref-new",
        referralCode: "NYC-TEST1",
        referrerId: "user-123",
        refereeEmail: "share.user-123@cityping.internal",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      const code = await getReferralCode("user-123");

      expect(code).toBe("NYC-TEST1");
      expect(prisma.referral.create).toHaveBeenCalled();
    });
  });

  /**
   * buildDigestHtml Tests
   *
   * These tests verify the HTML email template generation, with specific
   * focus on the referral section added in Task 6.5.
   */
  describe("buildDigestHtml", () => {
    /**
     * Includes referral section when referralCode is provided.
     * The section should contain the shareable link and promotional copy.
     */
    it("includes referral section when referralCode is provided", () => {
      const events = createMockEvents();

      const html = buildDigestHtml(events, undefined, "user-123", {}, "NYC-ABC12");

      // Check for referral section elements
      expect(html).toContain("Know someone who'd love this?");
      expect(html).toContain("get 1 month free when they subscribe");
      expect(html).toContain("https://cityping.com/r/NYC-ABC12");
    });

    /**
     * Omits referral section when referralCode is null.
     * This ensures graceful degradation when referral code generation fails.
     */
    it("omits referral section when referralCode is null", () => {
      const events = createMockEvents();

      const html = buildDigestHtml(events, undefined, "user-123", {}, null);

      expect(html).not.toContain("Know someone who'd love this?");
      expect(html).not.toContain("/r/");
    });

    /**
     * Omits referral section when referralCode is undefined.
     * Backwards compatibility with existing callers.
     */
    it("omits referral section when referralCode is undefined", () => {
      const events = createMockEvents();

      const html = buildDigestHtml(events, undefined, "user-123", {});

      expect(html).not.toContain("Know someone who'd love this?");
    });

    /**
     * Properly escapes referral code in HTML to prevent XSS.
     * Although codes are alphanumeric, we still escape for defense-in-depth.
     */
    it("escapes referral code in output", () => {
      const events = createMockEvents();

      // Test with a malicious code (shouldn't happen in practice, but defense-in-depth)
      const html = buildDigestHtml(events, undefined, "user-123", {}, '<script>alert("xss")</script>');

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    /**
     * Includes basic digest structure regardless of referral code.
     * The referral section should be additive, not break existing functionality.
     */
    it("maintains basic digest structure with referral section", () => {
      const events = createMockEvents();

      const html = buildDigestHtml(events, undefined, "user-123", {}, "NYC-TEST1");

      // Core digest elements should still be present
      expect(html).toContain("NYC TODAY");
      expect(html).toContain("ASP Suspended Tomorrow");
      expect(html).toContain("Upgrade for $7/mo");
      expect(html).toContain("Manage preferences");
      expect(html).toContain("Unsubscribe");
    });

    /**
     * Referral section appears after upgrade CTA but before footer links.
     * This placement maximizes visibility while maintaining email flow.
     */
    it("places referral section in correct position", () => {
      const events = createMockEvents();

      const html = buildDigestHtml(events, undefined, "user-123", {}, "NYC-TEST1");

      const upgradeIndex = html.indexOf("Upgrade for $7/mo");
      const referralIndex = html.indexOf("Know someone who'd love this?");
      const unsubscribeIndex = html.indexOf("Unsubscribe");

      expect(referralIndex).toBeGreaterThan(upgradeIndex);
      expect(referralIndex).toBeLessThan(unsubscribeIndex);
    });

    /**
     * Referral link uses correct base URL from environment.
     */
    it("uses APP_BASE_URL for referral link", () => {
      process.env.APP_BASE_URL = "https://custom.cityping.com";
      const events = createMockEvents();

      const html = buildDigestHtml(events, undefined, "user-123", {}, "NYC-TEST1");

      expect(html).toContain("https://custom.cityping.com/r/NYC-TEST1");
    });

    /**
     * Falls back to localhost when APP_BASE_URL is not set.
     */
    it("falls back to localhost when APP_BASE_URL not set", () => {
      delete process.env.APP_BASE_URL;
      const events = createMockEvents();

      const html = buildDigestHtml(events, undefined, "user-123", {}, "NYC-TEST1");

      expect(html).toContain("http://localhost:3000/r/NYC-TEST1");
    });
  });
});
