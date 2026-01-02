// __tests__/api/checkout/premium.test.ts
/**
 * Test suite for the Premium Upgrade Checkout API endpoint.
 *
 * This test suite validates the premium tier upgrade flow, including:
 *
 * 1. Authentication requirements (401 for unauthenticated requests)
 * 2. Tier validation (400 if already premium)
 * 3. Successful checkout session creation
 * 4. Environment configuration validation
 * 5. Error handling for Stripe API failures
 *
 * Test Architecture:
 * We mock the Prisma client, Stripe client, and auth helper to isolate
 * the API route logic. This follows the "sociable unit test" pattern
 * where we test the route handler with controlled dependencies.
 *
 * Historical Context:
 * Payment testing has evolved significantly since the early days of e-commerce.
 * Modern approaches use mock APIs rather than test card numbers, allowing
 * comprehensive testing of error paths and edge cases that would be difficult
 * to reproduce with real payment providers.
 */

import { NextRequest } from "next/server";

// Mock environment variables before imports
const originalEnv = process.env;

// Mock the db module
jest.mock("../../../src/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock the stripe module
jest.mock("../../../src/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}));

// Mock the auth module
jest.mock("../../../src/lib/auth", () => ({
  getUserFromRequest: jest.fn(),
}));

import { POST } from "../../../src/app/api/checkout/premium/route";
import { stripe } from "../../../src/lib/stripe";
import { getUserFromRequest } from "../../../src/lib/auth";

// Type assertions for mocked functions
const mockGetUserFromRequest = getUserFromRequest as jest.Mock;
const mockStripeCheckoutCreate = stripe.checkout.sessions.create as jest.Mock;

describe("POST /api/checkout/premium", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    process.env = {
      ...originalEnv,
      STRIPE_PREMIUM_PRICE_ID: "price_premium_test",
      APP_BASE_URL: "http://localhost:3000",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ===========================================================================
  // AUTHENTICATION TESTS
  // ===========================================================================

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetUserFromRequest.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("should call getUserFromRequest with the request object", async () => {
      mockGetUserFromRequest.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
        headers: {
          "x-user-id": "test-user-id",
        },
      });

      await POST(req);

      expect(mockGetUserFromRequest).toHaveBeenCalledWith(req);
    });
  });

  // ===========================================================================
  // TIER VALIDATION TESTS
  // ===========================================================================

  describe("Tier Validation", () => {
    it("should return 400 when user is already premium", async () => {
      mockGetUserFromRequest.mockResolvedValue({
        id: "user-123",
        email: "premium@example.com",
        tier: "premium",
      });

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Already premium");
    });

    it("should proceed for free tier users", async () => {
      mockGetUserFromRequest.mockResolvedValue({
        id: "user-456",
        email: "free@example.com",
        tier: "free",
      });
      mockStripeCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/session/test",
      });

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // SUCCESSFUL CHECKOUT TESTS
  // ===========================================================================

  describe("Successful Checkout Session Creation", () => {
    const mockUser = {
      id: "user-789",
      email: "user@example.com",
      tier: "free",
      zipCode: "10001",
    };

    beforeEach(() => {
      mockGetUserFromRequest.mockResolvedValue(mockUser);
    });

    it("should return checkout URL on success", async () => {
      const expectedUrl = "https://checkout.stripe.com/c/pay/cs_test_123";
      mockStripeCheckoutCreate.mockResolvedValue({ url: expectedUrl });

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.url).toBe(expectedUrl);
    });

    it("should create session with correct customer email", async () => {
      mockStripeCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/session/test",
      });

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      await POST(req);

      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: mockUser.email,
        })
      );
    });

    it("should create session with premium price ID", async () => {
      mockStripeCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/session/test",
      });

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      await POST(req);

      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: "price_premium_test",
              quantity: 1,
            },
          ],
        })
      );
    });

    it("should create session in subscription mode", async () => {
      mockStripeCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/session/test",
      });

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      await POST(req);

      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
        })
      );
    });

    it("should include userId in session metadata", async () => {
      mockStripeCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/session/test",
      });

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      await POST(req);

      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            userId: mockUser.id,
          },
        })
      );
    });

    it("should set correct success_url with upgraded parameter", async () => {
      mockStripeCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/session/test",
      });

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      await POST(req);

      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: "http://localhost:3000/dashboard?upgraded=true",
        })
      );
    });

    it("should set correct cancel_url", async () => {
      mockStripeCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/session/test",
      });

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      await POST(req);

      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          cancel_url: "http://localhost:3000/dashboard",
        })
      );
    });
  });

  // ===========================================================================
  // ENVIRONMENT CONFIGURATION TESTS
  // ===========================================================================

  describe("Environment Configuration", () => {
    it("should return 500 when STRIPE_PREMIUM_PRICE_ID is not set", async () => {
      delete process.env.STRIPE_PREMIUM_PRICE_ID;

      // Need to re-import to pick up env change
      // For this test, we simulate by testing the actual behavior
      mockGetUserFromRequest.mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
        tier: "free",
      });

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      // Since the env is checked at module load time, we need to verify
      // the behavior through integration or manual testing
      // This test documents the expected behavior
      const response = await POST(req);
      const body = await response.json();

      // When STRIPE_PREMIUM_PRICE_ID is undefined, should return 500
      expect(response.status).toBe(500);
      expect(body.error).toBe("Payment configuration error");
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe("Error Handling", () => {
    beforeEach(() => {
      // Reset env for error tests
      process.env.STRIPE_PREMIUM_PRICE_ID = "price_premium_test";
    });

    it("should return 500 when Stripe API fails", async () => {
      mockGetUserFromRequest.mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
        tier: "free",
      });
      mockStripeCheckoutCreate.mockRejectedValue(new Error("Stripe API error"));

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to create checkout session");
    });

    it("should not expose internal Stripe errors to client", async () => {
      mockGetUserFromRequest.mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
        tier: "free",
      });
      mockStripeCheckoutCreate.mockRejectedValue(
        new Error("Your card was declined: insufficient_funds")
      );

      const req = new NextRequest("http://localhost:3000/api/checkout/premium", {
        method: "POST",
      });

      const response = await POST(req);
      const body = await response.json();

      // Should return generic error, not Stripe-specific message
      expect(body.error).not.toContain("insufficient_funds");
      expect(body.error).toBe("Failed to create checkout session");
    });
  });
});
