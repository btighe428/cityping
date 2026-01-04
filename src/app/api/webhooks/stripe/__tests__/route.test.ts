/**
 * Test Suite for Stripe Webhook Referral Conversion
 *
 * This test module validates the referral conversion logic integrated into the
 * Stripe webhook handler. When a new subscription is created, the webhook should:
 *
 * 1. Process the subscription update (existing behavior)
 * 2. Check if the subscriber has a pending referral by email
 * 3. If yes, convert the referral and create a coupon for the referrer
 *
 * Architecture Background - Webhook-Based Referral Processing:
 * -----------------------------------------------------------
 * The referral conversion is triggered by the `customer.subscription.created`
 * Stripe webhook event. This event-driven approach ensures:
 *
 * 1. **Atomicity**: Conversion only happens when payment succeeds
 * 2. **Reliability**: Stripe retries failed webhooks with exponential backoff
 * 3. **Idempotency**: Webhook event IDs prevent duplicate processing
 *
 * Historical Precedent:
 * - Dropbox (2008): Email-based referral tracking with manual fulfillment
 * - Uber (2013): Webhook-triggered promo code activation
 * - Modern SaaS: Stripe webhook + coupon API integration (standard pattern)
 *
 * Test Categories:
 * ---------------
 * 1. Happy path: Referral exists, conversion succeeds
 * 2. No referral: User subscribed without referral code
 * 3. Expired referral: Referral past expiration date
 * 4. Already converted: Referral already processed
 * 5. Error handling: Database/Stripe API failures
 */

import { NextRequest } from "next/server";

// Mock dependencies before importing the route
// Order matters: mocks must be set up before the module is imported

// Mock referral service
const mockConvertReferral = jest.fn();
jest.mock("@/lib/referral-service", () => ({
  convertReferral: mockConvertReferral,
}));

// Mock Stripe verification and client
const mockVerifyWebhookSignature = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();
jest.mock("@/lib/stripe", () => ({
  verifyWebhookSignature: mockVerifyWebhookSignature,
  stripe: {
    subscriptions: {
      retrieve: mockSubscriptionsRetrieve,
    },
  },
}));

// Mock Prisma
const mockUserFindUnique = jest.fn();
const mockReferralFindFirst = jest.fn();
const mockWebhookEventFindUnique = jest.fn();
const mockWebhookEventUpsert = jest.fn();
const mockWebhookEventUpdate = jest.fn();
const mockSubscriptionUpdateMany = jest.fn();
const mockSubscriptionUpsert = jest.fn();
const mockAccountFindUnique = jest.fn();
const mockAccountCreate = jest.fn();
const mockAccountUpdate = jest.fn();
const mockPhoneFindUnique = jest.fn();
const mockPhoneUpsert = jest.fn();
const mockCityFindUnique = jest.fn();
const mockPhoneCityAlertUpsert = jest.fn();
const mockMessageOutboxFindFirst = jest.fn();
const mockMessageOutboxCreate = jest.fn();
const mockMessageOutboxUpdate = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    referral: {
      findFirst: mockReferralFindFirst,
    },
    webhookEvent: {
      findUnique: mockWebhookEventFindUnique,
      upsert: mockWebhookEventUpsert,
      update: mockWebhookEventUpdate,
    },
    subscription: {
      updateMany: mockSubscriptionUpdateMany,
      upsert: mockSubscriptionUpsert,
    },
    account: {
      findUnique: mockAccountFindUnique,
      create: mockAccountCreate,
      update: mockAccountUpdate,
    },
    phone: {
      findUnique: mockPhoneFindUnique,
      upsert: mockPhoneUpsert,
    },
    city: {
      findUnique: mockCityFindUnique,
    },
    phoneCityAlert: {
      upsert: mockPhoneCityAlertUpsert,
    },
    messageOutbox: {
      findFirst: mockMessageOutboxFindFirst,
      create: mockMessageOutboxCreate,
      update: mockMessageOutboxUpdate,
    },
  },
}));

// Mock Twilio SMS
jest.mock("@/lib/twilio", () => ({
  sendSms: jest.fn().mockResolvedValue({ sid: "SM123" }),
}));

// Mock SMS templates
jest.mock("@/lib/sms-templates", () => ({
  SMS_TEMPLATES: {
    optIn: jest.fn().mockReturnValue("Welcome to CityPing!"),
  },
}));

// Now import the route handler
import { POST } from "../route";

describe("Stripe Webhook - Referral Conversion", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: webhook event not processed yet
    mockWebhookEventFindUnique.mockResolvedValue(null);
    mockWebhookEventUpsert.mockResolvedValue({});
    mockWebhookEventUpdate.mockResolvedValue({});
    mockSubscriptionUpdateMany.mockResolvedValue({ count: 1 });
  });

  /**
   * Helper to create a mock Stripe subscription.created event
   */
  function createSubscriptionCreatedEvent(
    customerId: string,
    subscriptionId: string = "sub_test_123"
  ) {
    return {
      id: "evt_test_" + Date.now(),
      type: "customer.subscription.created",
      data: {
        object: {
          id: subscriptionId,
          customer: customerId,
          status: "active",
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          cancel_at_period_end: false,
          items: {
            data: [{ price: { id: "price_monthly_123" } }],
          },
        },
      },
    };
  }

  /**
   * Helper to create a mock request with Stripe webhook payload
   */
  async function createWebhookRequest(event: unknown): Promise<NextRequest> {
    const body = JSON.stringify(event);
    const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "valid_signature_mock",
        "content-type": "application/json",
      },
      body,
    });
    return request;
  }

  // ===========================================================================
  // HAPPY PATH: REFERRAL CONVERSION
  // ===========================================================================

  describe("Referral Conversion - Happy Path", () => {
    /**
     * When a user with a pending referral subscribes, the system should:
     * 1. Find the user by Stripe customer ID
     * 2. Find the pending referral by the user's email
     * 3. Call convertReferral() with the referral ID and user ID
     * 4. Log the successful conversion
     */
    it("should convert pending referral when user subscribes", async () => {
      const customerId = "cus_test_referral_user";
      const userId = "user_referee_123";
      const referralId = "ref_pending_123";
      const referrerId = "user_referrer_456";

      const event = createSubscriptionCreatedEvent(customerId);
      mockVerifyWebhookSignature.mockReturnValue(event);

      // Mock user lookup - user exists with this Stripe customer ID
      mockUserFindUnique.mockResolvedValue({
        id: userId,
        email: "referee@example.com",
        stripeCustomerId: customerId,
      });

      // Mock pending referral exists for this email
      mockReferralFindFirst.mockResolvedValue({
        id: referralId,
        referrerId: referrerId,
        refereeEmail: "referee@example.com",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days future
      });

      // Mock successful conversion
      mockConvertReferral.mockResolvedValue({
        id: referralId,
        referrerId: referrerId,
        refereeId: userId,
        status: "CONVERTED",
        stripeCouponId: "coupon_reward_123",
        convertedAt: new Date(),
      });

      const request = await createWebhookRequest(event);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { stripeCustomerId: customerId },
      });
      expect(mockReferralFindFirst).toHaveBeenCalledWith({
        where: {
          refereeEmail: "referee@example.com",
          status: "PENDING",
          expiresAt: { gt: expect.any(Date) },
        },
      });
      expect(mockConvertReferral).toHaveBeenCalledWith(referralId, userId);
    });

    /**
     * Conversion should work with case-insensitive email matching.
     * Users may enter emails with different casing (John@Example.com vs john@example.com).
     */
    it("should match referral email case-insensitively", async () => {
      const customerId = "cus_case_test";
      const userId = "user_case_123";
      const referralId = "ref_case_123";

      const event = createSubscriptionCreatedEvent(customerId);
      mockVerifyWebhookSignature.mockReturnValue(event);

      // User has uppercase email
      mockUserFindUnique.mockResolvedValue({
        id: userId,
        email: "Test.User@Example.COM",
        stripeCustomerId: customerId,
      });

      // Referral has lowercase email
      mockReferralFindFirst.mockResolvedValue({
        id: referralId,
        refereeEmail: "test.user@example.com",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      mockConvertReferral.mockResolvedValue({
        id: referralId,
        status: "CONVERTED",
        stripeCouponId: "coupon_123",
      });

      const request = await createWebhookRequest(event);
      await POST(request);

      // The query should use lowercase email
      expect(mockReferralFindFirst).toHaveBeenCalledWith({
        where: {
          refereeEmail: "test.user@example.com", // lowercase
          status: "PENDING",
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });
  });

  // ===========================================================================
  // NO REFERRAL: NON-REFERRED SUBSCRIPTIONS
  // ===========================================================================

  describe("Non-Referral Subscriptions", () => {
    /**
     * Most subscriptions won't have a referral - the system should handle
     * this gracefully without errors.
     */
    it("should handle subscription without pending referral gracefully", async () => {
      const customerId = "cus_no_referral";
      const userId = "user_direct_signup";

      const event = createSubscriptionCreatedEvent(customerId);
      mockVerifyWebhookSignature.mockReturnValue(event);

      // User exists
      mockUserFindUnique.mockResolvedValue({
        id: userId,
        email: "direct@example.com",
        stripeCustomerId: customerId,
      });

      // No pending referral found
      mockReferralFindFirst.mockResolvedValue(null);

      const request = await createWebhookRequest(event);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockConvertReferral).not.toHaveBeenCalled();
    });

    /**
     * If no User record exists for the Stripe customer (legacy subscription),
     * referral processing should skip silently.
     */
    it("should skip referral processing when User not found", async () => {
      const customerId = "cus_legacy_no_user";

      const event = createSubscriptionCreatedEvent(customerId);
      mockVerifyWebhookSignature.mockReturnValue(event);

      // No User record (legacy account using Phone/Account model)
      mockUserFindUnique.mockResolvedValue(null);

      const request = await createWebhookRequest(event);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockReferralFindFirst).not.toHaveBeenCalled();
      expect(mockConvertReferral).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // EXPIRED REFERRAL HANDLING
  // ===========================================================================

  describe("Expired Referral Handling", () => {
    /**
     * Referrals have a 90-day expiration window. The query filters by
     * expiresAt > now, so expired referrals won't be returned.
     */
    it("should not convert expired referrals", async () => {
      const customerId = "cus_expired_ref";
      const userId = "user_late_signup";

      const event = createSubscriptionCreatedEvent(customerId);
      mockVerifyWebhookSignature.mockReturnValue(event);

      mockUserFindUnique.mockResolvedValue({
        id: userId,
        email: "late@example.com",
        stripeCustomerId: customerId,
      });

      // No pending referral found (the query filters out expired ones)
      mockReferralFindFirst.mockResolvedValue(null);

      const request = await createWebhookRequest(event);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockConvertReferral).not.toHaveBeenCalled();

      // Verify the query includes expiration check
      expect(mockReferralFindFirst).toHaveBeenCalledWith({
        where: {
          refereeEmail: "late@example.com",
          status: "PENDING",
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe("Error Handling", () => {
    /**
     * If convertReferral() throws an error, the webhook should still succeed.
     * Referral conversion is non-critical - it shouldn't block subscription processing.
     */
    it("should succeed even if referral conversion fails", async () => {
      const customerId = "cus_conversion_error";
      const userId = "user_error_123";
      const referralId = "ref_error_123";

      const event = createSubscriptionCreatedEvent(customerId);
      mockVerifyWebhookSignature.mockReturnValue(event);

      mockUserFindUnique.mockResolvedValue({
        id: userId,
        email: "error@example.com",
        stripeCustomerId: customerId,
      });

      mockReferralFindFirst.mockResolvedValue({
        id: referralId,
        refereeEmail: "error@example.com",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Conversion throws error
      mockConvertReferral.mockRejectedValue(new Error("Stripe API error"));

      const request = await createWebhookRequest(event);
      const response = await POST(request);

      // Webhook should still succeed
      expect(response.status).toBe(200);
      expect(mockConvertReferral).toHaveBeenCalled();
    });

    /**
     * Database errors during user lookup should not crash the webhook.
     */
    it("should succeed even if user lookup fails", async () => {
      const customerId = "cus_db_error";

      const event = createSubscriptionCreatedEvent(customerId);
      mockVerifyWebhookSignature.mockReturnValue(event);

      // Database error
      mockUserFindUnique.mockRejectedValue(new Error("Database connection failed"));

      const request = await createWebhookRequest(event);
      const response = await POST(request);

      // Webhook should still succeed
      expect(response.status).toBe(200);
      expect(mockConvertReferral).not.toHaveBeenCalled();
    });

    /**
     * Database errors during referral lookup should not crash the webhook.
     */
    it("should succeed even if referral lookup fails", async () => {
      const customerId = "cus_ref_lookup_error";
      const userId = "user_ref_error";

      const event = createSubscriptionCreatedEvent(customerId);
      mockVerifyWebhookSignature.mockReturnValue(event);

      mockUserFindUnique.mockResolvedValue({
        id: userId,
        email: "refsearch@example.com",
        stripeCustomerId: customerId,
      });

      // Referral lookup error
      mockReferralFindFirst.mockRejectedValue(new Error("Database timeout"));

      const request = await createWebhookRequest(event);
      const response = await POST(request);

      // Webhook should still succeed
      expect(response.status).toBe(200);
      expect(mockConvertReferral).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // WEBHOOK SIGNATURE VALIDATION
  // ===========================================================================

  describe("Webhook Security", () => {
    /**
     * Invalid Stripe signature should return 400 error.
     */
    it("should reject requests with invalid signature", async () => {
      mockVerifyWebhookSignature.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "invalid_signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "test" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(mockConvertReferral).not.toHaveBeenCalled();
    });

    /**
     * Missing signature header should return 400 error.
     */
    it("should reject requests without signature header", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "test" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Missing signature");
    });
  });

  // ===========================================================================
  // IDEMPOTENCY
  // ===========================================================================

  describe("Idempotency", () => {
    /**
     * Duplicate webhook events should be detected and skipped.
     * Stripe may retry webhooks, so idempotency is critical.
     */
    it("should skip already processed webhook events", async () => {
      const event = createSubscriptionCreatedEvent("cus_duplicate");
      mockVerifyWebhookSignature.mockReturnValue(event);

      // Event already processed
      mockWebhookEventFindUnique.mockResolvedValue({
        id: "existing_event",
        eventId: event.id,
        processedAt: new Date(),
      });

      const request = await createWebhookRequest(event);
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.duplicate).toBe(true);
      expect(mockConvertReferral).not.toHaveBeenCalled();
    });
  });
});
