/**
 * Test suite for the feedback API endpoint.
 *
 * The feedback endpoint handles user feedback submissions via email links.
 * Users click thumbs up/down links in digest emails which contain a unique
 * feedback token. This test suite validates:
 *
 * 1. Valid feedback submission (up/down ratings)
 * 2. Expired token handling (token past tokenExpiresAt)
 * 3. Invalid token handling (token not found)
 * 4. Missing parameter validation
 *
 * Implementation Notes:
 * - GET request with query params: token (required), rating (required: "up" | "down")
 * - Uses UserEventFeedback model with feedbackToken, tokenExpiresAt, feedbackType
 * - Maps "up" -> THUMBS_UP, "down" -> THUMBS_DOWN
 * - Redirects to /feedback/thanks with appropriate query params
 */

import { NextRequest } from "next/server";

// Mock the db module before importing the route
jest.mock("@/lib/db", () => ({
  prisma: {
    userEventFeedback: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/db";

// Type assertion for mocked functions
const mockFindUnique = prisma.userEventFeedback.findUnique as jest.Mock;
const mockUpdate = prisma.userEventFeedback.update as jest.Mock;

describe("GET /api/feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // VALID FEEDBACK SUBMISSION TESTS
  // =========================================================================

  describe("Valid Feedback Submission", () => {
    it("should accept thumbs up rating and redirect to success page", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const mockFeedbackRecord = {
        id: "feedback-123",
        userId: "user-456",
        eventId: "event-789",
        feedbackToken: "valid-token-abc123",
        tokenExpiresAt: futureDate,
        feedbackType: null,
        user: { id: "user-456", zipCode: "10001" },
        event: { id: "event-789", source: { moduleId: "events" } },
      };

      mockFindUnique.mockResolvedValue(mockFeedbackRecord);
      mockUpdate.mockResolvedValue({ ...mockFeedbackRecord, feedbackType: "THUMBS_UP" });

      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=valid-token-abc123&rating=up"
      );
      const response = await GET(request);

      expect(response.status).toBe(307); // Temporary redirect
      expect(response.headers.get("Location")).toContain("/feedback/thanks?success=true");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { feedbackToken: "valid-token-abc123" },
        data: { feedbackType: "THUMBS_UP" },
      });
    });

    it("should accept thumbs down rating and redirect to success page", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockFeedbackRecord = {
        id: "feedback-123",
        userId: "user-456",
        eventId: "event-789",
        feedbackToken: "valid-token-def456",
        tokenExpiresAt: futureDate,
        feedbackType: null,
        user: { id: "user-456", zipCode: "10001" },
        event: { id: "event-789", source: { moduleId: "events" } },
      };

      mockFindUnique.mockResolvedValue(mockFeedbackRecord);
      mockUpdate.mockResolvedValue({ ...mockFeedbackRecord, feedbackType: "THUMBS_DOWN" });

      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=valid-token-def456&rating=down"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?success=true");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { feedbackToken: "valid-token-def456" },
        data: { feedbackType: "THUMBS_DOWN" },
      });
    });

    it("should allow updating existing feedback (vote change)", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockFeedbackRecord = {
        id: "feedback-123",
        userId: "user-456",
        eventId: "event-789",
        feedbackToken: "existing-token",
        tokenExpiresAt: futureDate,
        feedbackType: "THUMBS_DOWN", // Previously voted down
        user: { id: "user-456", zipCode: "10001" },
        event: { id: "event-789", source: { moduleId: "events" } },
      };

      mockFindUnique.mockResolvedValue(mockFeedbackRecord);
      mockUpdate.mockResolvedValue({ ...mockFeedbackRecord, feedbackType: "THUMBS_UP" });

      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=existing-token&rating=up"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?success=true");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { feedbackToken: "existing-token" },
        data: { feedbackType: "THUMBS_UP" },
      });
    });
  });

  // =========================================================================
  // EXPIRED TOKEN HANDLING TESTS
  // =========================================================================

  describe("Expired Token Handling", () => {
    it("should redirect to error=expired for expired token", async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const mockFeedbackRecord = {
        id: "feedback-123",
        userId: "user-456",
        eventId: "event-789",
        feedbackToken: "expired-token",
        tokenExpiresAt: pastDate,
        feedbackType: null,
        user: { id: "user-456", zipCode: "10001" },
        event: { id: "event-789", source: { moduleId: "events" } },
      };

      mockFindUnique.mockResolvedValue(mockFeedbackRecord);

      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=expired-token&rating=up"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?error=expired");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should redirect to error=expired for token expiring exactly now", async () => {
      // Edge case: token expires at current moment
      const nowDate = new Date();
      const mockFeedbackRecord = {
        id: "feedback-123",
        userId: "user-456",
        eventId: "event-789",
        feedbackToken: "edge-case-token",
        tokenExpiresAt: nowDate,
        feedbackType: null,
        user: { id: "user-456", zipCode: "10001" },
        event: { id: "event-789", source: { moduleId: "events" } },
      };

      mockFindUnique.mockResolvedValue(mockFeedbackRecord);

      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=edge-case-token&rating=up"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?error=expired");
    });
  });

  // =========================================================================
  // INVALID TOKEN HANDLING TESTS
  // =========================================================================

  describe("Invalid Token Handling", () => {
    it("should redirect to error=invalid for non-existent token", async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=nonexistent-token&rating=up"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?error=invalid");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should look up by feedbackToken field", async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=some-token&rating=up"
      );
      await GET(request);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { feedbackToken: "some-token" },
      });
    });
  });

  // =========================================================================
  // MISSING PARAMETERS TESTS
  // =========================================================================

  describe("Missing Parameters", () => {
    it("should redirect to error=invalid when token is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/feedback?rating=up"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?error=invalid");
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("should redirect to error=invalid when rating is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=valid-token"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?error=invalid");
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("should redirect to error=invalid when both parameters are missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/feedback"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?error=invalid");
    });

    it("should redirect to error=invalid for invalid rating value", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=valid-token&rating=maybe"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?error=invalid");
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("should be case-insensitive for rating parameter", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockFeedbackRecord = {
        id: "feedback-123",
        userId: "user-456",
        eventId: "event-789",
        feedbackToken: "case-token",
        tokenExpiresAt: futureDate,
        feedbackType: null,
        user: { id: "user-456", zipCode: "10001" },
        event: { id: "event-789", source: { moduleId: "events" } },
      };

      mockFindUnique.mockResolvedValue(mockFeedbackRecord);
      mockUpdate.mockResolvedValue({ ...mockFeedbackRecord, feedbackType: "THUMBS_UP" });

      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=case-token&rating=UP"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?success=true");
    });
  });

  // =========================================================================
  // ERROR HANDLING TESTS
  // =========================================================================

  describe("Error Handling", () => {
    it("should redirect to error=invalid on database error during lookup", async () => {
      mockFindUnique.mockRejectedValue(new Error("Database connection failed"));

      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=valid-token&rating=up"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?error=invalid");
    });

    it("should redirect to error=invalid on database error during update", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockFeedbackRecord = {
        id: "feedback-123",
        userId: "user-456",
        eventId: "event-789",
        feedbackToken: "update-fail-token",
        tokenExpiresAt: futureDate,
        feedbackType: null,
      };

      mockFindUnique.mockResolvedValue(mockFeedbackRecord);
      mockUpdate.mockRejectedValue(new Error("Update failed"));

      const request = new NextRequest(
        "http://localhost:3000/api/feedback?token=update-fail-token&rating=up"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/feedback/thanks?error=invalid");
    });
  });
});
