// src/lib/__tests__/feedback.test.ts
/**
 * Tests for Feedback Record Management
 *
 * This module tests the feedback record creation functionality that connects
 * users to events via tokenized feedback links in email digests.
 *
 * The UserEventFeedback model enables the feedback loop:
 * 1. User receives email digest with thumbs up/down links
 * 2. Clicking a link validates the token and records feedback
 * 3. Feedback aggregates to improve event relevance scoring by zip code
 *
 * Test Strategy:
 * - Mock Prisma client to isolate unit tests from database
 * - Verify token generation and expiration logic
 * - Ensure proper record structure for feedback storage
 */

import { createFeedbackRecord, FeedbackRecordResult } from "../feedback";
import { prisma } from "../db";

// Mock the prisma client
jest.mock("../db", () => ({
  prisma: {
    userEventFeedback: {
      upsert: jest.fn(),
    },
  },
}));

// Mock the feedback token generator
jest.mock("../feedback-token", () => ({
  generateFeedbackToken: jest.fn(() => "mock-secure-token-abc123"),
}));

describe("createFeedbackRecord", () => {
  const mockUserId = "user-123";
  const mockEventId = "event-456";

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation for each test
    (prisma.userEventFeedback.upsert as jest.Mock).mockResolvedValue({
      id: "feedback-789",
      userId: mockUserId,
      eventId: mockEventId,
      feedbackType: "THUMBS_UP", // Placeholder value used in create
      feedbackToken: "mock-secure-token-abc123",
      tokenExpiresAt: new Date("2026-01-11T12:00:00Z"),
      createdAt: new Date("2026-01-04T12:00:00Z"),
    });
  });

  it("creates a feedback record with a new token", async () => {
    const result = await createFeedbackRecord(mockUserId, mockEventId);

    expect(result).toBeDefined();
    expect(result.token).toBe("mock-secure-token-abc123");
    expect(result.feedbackRecord).toBeDefined();
    expect(result.feedbackRecord.userId).toBe(mockUserId);
    expect(result.feedbackRecord.eventId).toBe(mockEventId);
  });

  it("sets tokenExpiresAt to 7 days from now", async () => {
    // Mock Date.now for consistent test
    const mockNow = new Date("2026-01-04T12:00:00Z").getTime();
    jest.spyOn(Date, "now").mockReturnValue(mockNow);

    await createFeedbackRecord(mockUserId, mockEventId);

    expect(prisma.userEventFeedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tokenExpiresAt: expect.any(Date),
        }),
      })
    );

    // Verify the expiration date is approximately 7 days later
    const callArgs = (prisma.userEventFeedback.upsert as jest.Mock).mock
      .calls[0][0];
    const expiresAt = callArgs.create.tokenExpiresAt as Date;

    const expectedExpiry = new Date("2026-01-11T12:00:00Z");
    const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());

    // Allow 1 second tolerance for test execution time
    expect(timeDiff).toBeLessThan(1000);

    jest.spyOn(Date, "now").mockRestore();
  });

  it("passes userId and eventId to the database", async () => {
    await createFeedbackRecord(mockUserId, mockEventId);

    expect(prisma.userEventFeedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_eventId: { userId: mockUserId, eventId: mockEventId },
        },
        create: expect.objectContaining({
          userId: mockUserId,
          eventId: mockEventId,
        }),
      })
    );
  });

  it("stores the generated token in the database", async () => {
    await createFeedbackRecord(mockUserId, mockEventId);

    expect(prisma.userEventFeedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          feedbackToken: "mock-secure-token-abc123",
        }),
      })
    );
  });

  it("returns both the token and the feedback record", async () => {
    const result = await createFeedbackRecord(mockUserId, mockEventId);

    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("feedbackRecord");
    expect(typeof result.token).toBe("string");
    expect(typeof result.feedbackRecord).toBe("object");
  });

  it("generates a unique token for each call", async () => {
    const { generateFeedbackToken } = require("../feedback-token");

    // First call
    await createFeedbackRecord(mockUserId, mockEventId);

    // Change mock to return a different token
    generateFeedbackToken.mockReturnValueOnce("different-token-xyz789");

    // Second call
    await createFeedbackRecord(mockUserId, "event-different");

    // Verify generate was called twice
    expect(generateFeedbackToken).toHaveBeenCalledTimes(2);
  });

  it("handles database errors gracefully", async () => {
    (prisma.userEventFeedback.upsert as jest.Mock).mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(createFeedbackRecord(mockUserId, mockEventId)).rejects.toThrow(
      "Database connection failed"
    );
  });
});
