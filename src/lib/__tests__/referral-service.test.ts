// src/lib/__tests__/referral-service.test.ts
/**
 * Test Suite for the Referral Service
 *
 * This module tests the referral management service that powers CityPing's viral growth
 * program. The referral system follows the classic "double-sided incentive" model pioneered
 * by Dropbox (2008) and later refined by Uber and Airbnb. The architecture:
 *
 *   [Existing User] -> generateReferralCode -> [Unique Code: NYC-XXXXX]
 *   [New User Signs Up via Code] -> createReferral -> [Referral Record Created]
 *   [New User Upgrades to Premium] -> convertReferral -> [Stripe Coupon Applied to Referrer]
 *
 * Theoretical Foundation - Network Effects in SaaS Growth:
 * -------------------------------------------------------
 * Referral programs exploit Metcalfe's Law: the value of a network grows proportionally
 * to the square of its connected users. By incentivizing existing users to recruit new
 * users, CityPing creates a viral coefficient > 1, enabling exponential growth without
 * proportional CAC (Customer Acquisition Cost) increases.
 *
 * Historical Context:
 * - Dropbox's referral program increased signups by 60% permanently (Houston, 2010)
 * - PayPal's $20 referral bonus drove early adoption (Thiel, "Zero to One")
 * - Uber's city-by-city launch leveraged referral codes as scarcity triggers
 *
 * Code Format Rationale:
 * ---------------------
 * The "NYC-XXXXX" format serves multiple purposes:
 * 1. Brand reinforcement ("NYC" prefix identifies CityPing)
 * 2. Memorability (5 characters is optimal for verbal sharing)
 * 3. Uniqueness (36^5 = 60,466,176 possible codes)
 * 4. Fraud resistance (unpredictable alphanumeric sequence)
 *
 * Testing Philosophy:
 * ------------------
 * These tests verify both the code generation uniqueness properties and the complete
 * referral lifecycle from creation through conversion. Stripe API calls are mocked
 * to ensure deterministic test execution and avoid external dependencies.
 */

import {
  generateReferralCode,
  createReferral,
  getReferralByCode,
  convertReferral,
  createReferralCoupon,
} from "../referral-service";

// Mock Stripe with a factory that exposes the mock create function for verification
jest.mock("stripe", () => {
  // Using a factory function to avoid hoisting issues
  const mockCreate = jest.fn().mockResolvedValue({
    id: "coupon_test_123",
    percent_off: 100,
    duration: "once",
    max_redemptions: 1,
  });

  // Store the mock function on the constructor for access in tests
  const MockStripe = jest.fn().mockImplementation(() => ({
    coupons: {
      create: mockCreate,
    },
    customers: {
      update: jest.fn().mockResolvedValue({ id: "cus_test_123" }),
    },
  }));

  // Expose the mock create function
  (MockStripe as any).__mockCouponsCreate = mockCreate;

  return MockStripe;
});

// Mock Prisma
jest.mock("../../lib/db", () => ({
  prisma: {
    referral: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock Resend for email notifications
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: "email_test_123" }),
    },
  })),
}));

// Import mocked prisma after mocking
import { prisma } from "../../lib/db";

describe("referral-service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Referral Code Generation Tests
   *
   * The generateReferralCode function creates unique, human-readable codes
   * in the format "NYC-XXXXX" where X is an alphanumeric character (0-9, A-Z).
   *
   * Design Constraints:
   * - Format: "NYC-" prefix + 5 alphanumeric characters
   * - Case: Uppercase for consistency and readability
   * - Entropy: 36^5 possible combinations (~60 million unique codes)
   * - Collision probability: Negligible for expected user base (<1M users)
   */
  describe("generateReferralCode", () => {
    /**
     * Format Validation
     *
     * Every generated code must match the "NYC-XXXXX" pattern.
     * This ensures brand consistency and easy identification of CityPing referral links.
     */
    it("generates code in NYC-XXXXX format", () => {
      const code = generateReferralCode();

      // Verify format: NYC- followed by exactly 5 alphanumeric characters
      expect(code).toMatch(/^NYC-[A-Z0-9]{5}$/);
    });

    /**
     * Uniqueness Guarantee
     *
     * Each call should produce a different code. While cryptographically
     * perfect uniqueness cannot be guaranteed, the probability of collision
     * in a reasonable test sample should be zero.
     *
     * Statistical note: With 36^5 possible codes, generating 1000 codes
     * has collision probability of approximately 0.008% (birthday paradox).
     */
    it("generates unique codes on successive calls", () => {
      const codes = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        codes.add(generateReferralCode());
      }

      // All 1000 codes should be unique
      expect(codes.size).toBe(iterations);
    });

    /**
     * Character Set Validation
     *
     * The suffix must contain only uppercase alphanumeric characters
     * for maximum compatibility with URLs, verbal communication, and
     * human transcription accuracy.
     */
    it("uses only uppercase alphanumeric characters in suffix", () => {
      const code = generateReferralCode();
      const suffix = code.replace("NYC-", "");

      // Each character should be 0-9 or A-Z
      for (const char of suffix) {
        expect(char).toMatch(/[A-Z0-9]/);
      }
    });

    /**
     * Length Consistency
     *
     * Total code length should always be exactly 9 characters:
     * "NYC-" (4) + suffix (5) = 9
     */
    it("produces codes of consistent length", () => {
      for (let i = 0; i < 100; i++) {
        const code = generateReferralCode();
        expect(code.length).toBe(9);
      }
    });

    /**
     * Randomness Distribution
     *
     * The generated codes should exhibit reasonable entropy.
     * This test verifies that the suffix isn't always starting
     * with the same character (which would indicate poor randomness).
     */
    it("exhibits reasonable randomness in generated codes", () => {
      const firstChars = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const code = generateReferralCode();
        firstChars.add(code[4]); // First character after "NYC-"
      }

      // Should see multiple different first characters (at least 5 different ones)
      expect(firstChars.size).toBeGreaterThanOrEqual(5);
    });
  });

  /**
   * Referral Creation Tests
   *
   * The createReferral function establishes a referral relationship between
   * an existing user (referrer) and a potential new user (referee, identified by email).
   *
   * Business Logic:
   * 1. Validates referrer exists
   * 2. Generates unique referral code
   * 3. Sets 90-day expiration window (industry standard)
   * 4. Creates referral record with PENDING status
   */
  describe("createReferral", () => {
    const mockReferrer = {
      id: "user_referrer_123",
      email: "referrer@example.com",
      stripeCustomerId: "cus_referrer_123",
    };

    /**
     * Successful Referral Creation
     *
     * When a valid referrer ID and referee email are provided,
     * the function should create a referral record and return it.
     */
    it("creates a referral record with unique code", async () => {
      const refereeEmail = "newuser@example.com";

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockReferrer);
      (prisma.referral.findFirst as jest.Mock).mockResolvedValue(null); // No existing referral
      (prisma.referral.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          id: "referral_123",
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const referral = await createReferral(mockReferrer.id, refereeEmail);

      expect(referral).toBeDefined();
      expect(referral.referrerId).toBe(mockReferrer.id);
      expect(referral.refereeEmail).toBe(refereeEmail);
      expect(referral.referralCode).toMatch(/^NYC-[A-Z0-9]{5}$/);
      expect(referral.status).toBe("PENDING");
    });

    /**
     * Referrer Validation
     *
     * If the referrer ID doesn't correspond to an existing user,
     * the function should throw an error.
     */
    it("throws error if referrer does not exist", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        createReferral("nonexistent_user", "test@example.com")
      ).rejects.toThrow("Referrer not found");
    });

    /**
     * Duplicate Prevention
     *
     * A referrer should not be able to create multiple pending referrals
     * for the same email address. This prevents referral spam.
     */
    it("throws error if referral for email already exists", async () => {
      const existingReferral = {
        id: "existing_referral",
        refereeEmail: "existing@example.com",
        status: "PENDING",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockReferrer);
      (prisma.referral.findFirst as jest.Mock).mockResolvedValue(existingReferral);

      await expect(
        createReferral(mockReferrer.id, "existing@example.com")
      ).rejects.toThrow("Referral already exists for this email");
    });

    /**
     * Expiration Window
     *
     * Referrals should have an expiration date set (90 days from creation).
     * This creates urgency for the referee to sign up.
     */
    it("sets expiration date 90 days in the future", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockReferrer);
      (prisma.referral.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.referral.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          id: "referral_123",
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const referral = await createReferral(mockReferrer.id, "test@example.com");

      const now = new Date();
      const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      // Expiration should be approximately 90 days from now (within 1 day tolerance)
      expect(referral.expiresAt.getTime()).toBeGreaterThan(
        ninetyDaysFromNow.getTime() - 24 * 60 * 60 * 1000
      );
      expect(referral.expiresAt.getTime()).toBeLessThan(
        ninetyDaysFromNow.getTime() + 24 * 60 * 60 * 1000
      );
    });
  });

  /**
   * Referral Lookup Tests
   *
   * The getReferralByCode function retrieves a referral record by its unique code.
   * This is the primary lookup method used when a new user signs up via referral link.
   */
  describe("getReferralByCode", () => {
    /**
     * Successful Lookup
     *
     * When a valid code is provided, the function should return
     * the complete referral record including referrer information.
     */
    it("retrieves referral by code", async () => {
      const mockReferral = {
        id: "referral_123",
        referralCode: "NYC-ABC12",
        referrerId: "user_123",
        refereeEmail: "test@example.com",
        status: "PENDING",
        referrer: {
          id: "user_123",
          email: "referrer@example.com",
        },
      };

      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(mockReferral);

      const result = await getReferralByCode("NYC-ABC12");

      expect(result).toBeDefined();
      expect(result?.referralCode).toBe("NYC-ABC12");
      expect(result?.referrer).toBeDefined();
    });

    /**
     * Invalid Code Handling
     *
     * When a non-existent code is provided, the function should return null
     * rather than throwing an error (allows for graceful UI handling).
     */
    it("returns null for non-existent code", async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getReferralByCode("NYC-XXXXX");

      expect(result).toBeNull();
    });

    /**
     * Case Insensitivity
     *
     * Referral codes should be looked up case-insensitively to handle
     * user input variations (e.g., "nyc-abc12" should match "NYC-ABC12").
     */
    it("handles case-insensitive lookup", async () => {
      const mockReferral = {
        id: "referral_123",
        referralCode: "NYC-ABC12",
        status: "PENDING",
      };

      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(mockReferral);

      await getReferralByCode("nyc-abc12");

      // Verify the query was made with uppercase code
      expect(prisma.referral.findUnique).toHaveBeenCalledWith({
        where: { referralCode: "NYC-ABC12" },
        include: { referrer: true },
      });
    });
  });

  /**
   * Referral Conversion Tests
   *
   * The convertReferral function handles the moment when a referred user
   * successfully upgrades to a paid subscription. This triggers:
   * 1. Updating referral status to CONVERTED
   * 2. Creating a Stripe coupon for the referrer (1 month free)
   * 3. Storing the coupon ID in the referral record
   * 4. Optionally notifying the referrer
   *
   * This is the "reward fulfillment" phase of the referral lifecycle.
   */
  describe("convertReferral", () => {
    const mockReferral = {
      id: "referral_123",
      referralCode: "NYC-ABC12",
      referrerId: "user_referrer",
      refereeId: null,
      refereeEmail: "referee@example.com",
      status: "PENDING",
      referrer: {
        id: "user_referrer",
        email: "referrer@example.com",
        stripeCustomerId: "cus_referrer_123",
      },
    };

    /**
     * Successful Conversion
     *
     * When a valid referral ID and referee ID are provided, the function
     * should update the referral status and create a Stripe coupon.
     */
    it("converts referral and creates Stripe coupon", async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(mockReferral);
      (prisma.referral.update as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          ...mockReferral,
          ...args.data,
          status: "CONVERTED",
        });
      });

      const result = await convertReferral("referral_123", "user_referee");

      expect(result).toBeDefined();
      expect(result.status).toBe("CONVERTED");
      expect(result.stripeCouponId).toBe("coupon_test_123");
      expect(result.refereeId).toBe("user_referee");
      expect(result.convertedAt).toBeDefined();
    });

    /**
     * Referral Not Found
     *
     * If the referral ID doesn't exist, the function should throw an error.
     */
    it("throws error if referral not found", async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        convertReferral("nonexistent_referral", "user_referee")
      ).rejects.toThrow("Referral not found");
    });

    /**
     * Already Converted Prevention
     *
     * A referral that has already been converted should not be processed again.
     * This prevents double-rewarding and coupon abuse.
     */
    it("throws error if referral already converted", async () => {
      const convertedReferral = {
        ...mockReferral,
        status: "CONVERTED",
        convertedAt: new Date(),
      };

      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(convertedReferral);

      await expect(
        convertReferral("referral_123", "user_referee")
      ).rejects.toThrow("Referral has already been converted");
    });

    /**
     * Expired Referral Handling
     *
     * Referrals past their expiration date should not be convertible.
     */
    it("throws error if referral has expired", async () => {
      const expiredReferral = {
        ...mockReferral,
        status: "EXPIRED",
      };

      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(expiredReferral);

      await expect(
        convertReferral("referral_123", "user_referee")
      ).rejects.toThrow("Referral has expired");
    });
  });

  /**
   * Stripe Coupon Creation Tests
   *
   * The createReferralCoupon function creates a one-time 100% discount coupon
   * for the referrer's next billing cycle. This integrates with Stripe's coupon API.
   *
   * Coupon Specifications:
   * - 100% discount (1 month free)
   * - Single use (max_redemptions: 1)
   * - Metadata includes referrer ID for audit trail
   */
  describe("createReferralCoupon", () => {
    /**
     * Successful Coupon Creation
     *
     * Verifies that the Stripe API is called with correct parameters
     * and returns a valid coupon object.
     */
    it("creates a 100% off one-time coupon", async () => {
      const coupon = await createReferralCoupon("user_referrer_123");

      expect(coupon).toBeDefined();
      expect(coupon.id).toBe("coupon_test_123");
      expect(coupon.percent_off).toBe(100);
      expect(coupon.duration).toBe("once");
      expect(coupon.max_redemptions).toBe(1);
    });

    /**
     * Metadata Inclusion
     *
     * The coupon should include metadata linking it to the referrer
     * for audit and support purposes.
     */
    it("includes referrer metadata in coupon", async () => {
      // Get the mock function from the Stripe constructor
      const Stripe = require("stripe");
      const mockCreate = (Stripe as any).__mockCouponsCreate;

      // Clear previous calls
      mockCreate.mockClear();

      await createReferralCoupon("user_referrer_123");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          percent_off: 100,
          duration: "once",
          max_redemptions: 1,
          metadata: expect.objectContaining({
            referrer_id: "user_referrer_123",
            type: "referral_reward",
          }),
        })
      );
    });
  });
});
