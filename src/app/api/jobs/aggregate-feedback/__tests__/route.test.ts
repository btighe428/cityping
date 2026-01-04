// src/app/api/jobs/aggregate-feedback/__tests__/route.test.ts
/**
 * Test Suite for Feedback Aggregation API Route
 *
 * This endpoint is a protected cron job that triggers the feedback aggregation
 * pipeline. It aggregates user feedback (thumbs up/down) by zip code and module,
 * then updates the ZipCodeInferenceWeight table to improve event relevance scoring.
 *
 * Security Model:
 * - Protected by CRON_SECRET environment variable
 * - Supports two authentication methods:
 *   1. x-cron-secret header (Vercel cron convention, preferred)
 *   2. Authorization: Bearer token (backwards compatibility)
 *
 * The endpoint is designed to be called by:
 * - Vercel Cron (scheduled, e.g., hourly or daily)
 * - Manual trigger for testing/debugging (with proper auth)
 *
 * Response Format:
 * Success: { success: true, aggregationCount: N, created: N, updated: N, aggregations: [...] }
 * Error: { error: "message" } with appropriate HTTP status
 */

import { NextRequest } from "next/server";

// Mock the feedback aggregation module before importing the route
jest.mock("@/lib/feedback-aggregation", () => ({
  runFeedbackAggregation: jest.fn(),
}));

import { GET, POST } from "../route";
import { runFeedbackAggregation } from "@/lib/feedback-aggregation";

// Type assertion for mocked function
const mockRunFeedbackAggregation = runFeedbackAggregation as jest.Mock;

// Store original env and restore after tests
const originalEnv = process.env;

describe("GET /api/jobs/aggregate-feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment for each test
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = "test-cron-secret-abc123";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ===========================================================================
  // AUTHORIZATION TESTS
  // ===========================================================================

  describe("Authorization", () => {
    it("returns 401 when no authorization is provided", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when x-cron-secret header is incorrect", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          headers: {
            "x-cron-secret": "wrong-secret",
          },
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when Authorization header is incorrect", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          headers: {
            Authorization: "Bearer wrong-secret",
          },
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("accepts valid x-cron-secret header (Vercel convention)", async () => {
      mockRunFeedbackAggregation.mockResolvedValue({
        aggregationCount: 0,
        created: 0,
        updated: 0,
        aggregations: [],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          headers: {
            "x-cron-secret": "test-cron-secret-abc123",
          },
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("accepts valid Authorization: Bearer token (backwards compatibility)", async () => {
      mockRunFeedbackAggregation.mockResolvedValue({
        aggregationCount: 0,
        created: 0,
        updated: 0,
        aggregations: [],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          headers: {
            Authorization: "Bearer test-cron-secret-abc123",
          },
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("prefers x-cron-secret over Authorization header", async () => {
      mockRunFeedbackAggregation.mockResolvedValue({
        aggregationCount: 0,
        created: 0,
        updated: 0,
        aggregations: [],
      });

      // Both headers provided - valid x-cron-secret should work even if Authorization is wrong
      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          headers: {
            "x-cron-secret": "test-cron-secret-abc123",
            Authorization: "Bearer wrong-secret",
          },
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("allows request in development when CRON_SECRET is not set", async () => {
      delete process.env.CRON_SECRET;
      // Use Object.defineProperty to allow setting NODE_ENV in tests
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
        configurable: true,
      });

      mockRunFeedbackAggregation.mockResolvedValue({
        aggregationCount: 0,
        created: 0,
        updated: 0,
        aggregations: [],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback"
      );
      const response = await GET(request);

      // Should allow in development without secret
      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // SUCCESS RESPONSE TESTS
  // ===========================================================================

  describe("Success Responses", () => {
    it("returns aggregation summary on success", async () => {
      const mockResult = {
        aggregationCount: 3,
        created: 3,
        updated: 0,
        aggregations: [
          {
            zipCode: "10001",
            moduleId: "events",
            positiveCount: 8,
            negativeCount: 2,
            adjustmentFactor: 0.8,
          },
          {
            zipCode: "11211",
            moduleId: "transit",
            positiveCount: 5,
            negativeCount: 5,
            adjustmentFactor: 0.5,
          },
          {
            zipCode: "10028",
            moduleId: "events",
            positiveCount: 3,
            negativeCount: 7,
            adjustmentFactor: 0.3,
          },
        ],
      };

      mockRunFeedbackAggregation.mockResolvedValue(mockResult);

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          headers: {
            "x-cron-secret": "test-cron-secret-abc123",
          },
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.aggregationCount).toBe(3);
      expect(body.created).toBe(3);
      expect(body.updated).toBe(0);
      expect(body.aggregations).toHaveLength(3);
    });

    it("returns empty results when no feedback exists", async () => {
      mockRunFeedbackAggregation.mockResolvedValue({
        aggregationCount: 0,
        created: 0,
        updated: 0,
        aggregations: [],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          headers: {
            "x-cron-secret": "test-cron-secret-abc123",
          },
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.aggregationCount).toBe(0);
      expect(body.aggregations).toEqual([]);
    });

    it("calls runFeedbackAggregation exactly once", async () => {
      mockRunFeedbackAggregation.mockResolvedValue({
        aggregationCount: 0,
        created: 0,
        updated: 0,
        aggregations: [],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          headers: {
            "x-cron-secret": "test-cron-secret-abc123",
          },
        }
      );
      await GET(request);

      expect(mockRunFeedbackAggregation).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe("Error Handling", () => {
    it("returns 500 when aggregation fails", async () => {
      mockRunFeedbackAggregation.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          headers: {
            "x-cron-secret": "test-cron-secret-abc123",
          },
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();

      expect(body.error).toBe("Aggregation failed");
      expect(body.details).toBe("Database connection failed");
    });

    it("handles non-Error exceptions gracefully", async () => {
      mockRunFeedbackAggregation.mockRejectedValue("String error");

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          headers: {
            "x-cron-secret": "test-cron-secret-abc123",
          },
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();

      expect(body.error).toBe("Aggregation failed");
      expect(body.details).toBe("Unknown error");
    });
  });

  // ===========================================================================
  // POST HANDLER TESTS
  // ===========================================================================

  describe("POST handler", () => {
    it("delegates to GET handler for consistency", async () => {
      mockRunFeedbackAggregation.mockResolvedValue({
        aggregationCount: 1,
        created: 1,
        updated: 0,
        aggregations: [
          {
            zipCode: "10001",
            moduleId: "events",
            positiveCount: 5,
            negativeCount: 5,
            adjustmentFactor: 0.5,
          },
        ],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          method: "POST",
          headers: {
            "x-cron-secret": "test-cron-secret-abc123",
          },
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it("enforces authentication for POST requests", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/jobs/aggregate-feedback",
        {
          method: "POST",
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });
});
