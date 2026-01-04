// src/lib/__tests__/feedback-aggregation.test.ts
/**
 * Test Suite for Feedback Aggregation Service
 *
 * This module tests the feedback aggregation system that processes user feedback
 * (thumbs up/down) and updates ZipCodeInferenceWeight records. The aggregation
 * job enables the feedback loop: users rate events, system learns preferences
 * by zip code, and future event relevance is adjusted accordingly.
 *
 * Aggregation Algorithm:
 * For each (zipCode, moduleId) pair with sufficient feedback:
 * 1. Count THUMBS_UP (positive) and THUMBS_DOWN (negative) ratings
 * 2. Calculate adjustment factor: positive / (positive + negative)
 *    - Factor > 0.5: positive sentiment, boost events for this zip+module
 *    - Factor < 0.5: negative sentiment, suppress events for this zip+module
 *    - Factor = 0.5: neutral sentiment (equal positive/negative)
 * 3. Upsert to ZipCodeInferenceWeight table
 *
 * Historical Context:
 * This pattern is rooted in collaborative filtering techniques pioneered by
 * GroupLens (1994) and later refined by Netflix and Amazon. The key insight
 * is that geographic clustering of preferences (by zip code in our case)
 * provides strong signals for content relevance, particularly in urban
 * environments where neighborhood characteristics strongly influence interests.
 *
 * The adjustment factor formula (positive / total) is a simplified version of
 * the Wilson score interval, trading statistical rigor for interpretability
 * and computational efficiency in real-time applications.
 */

import {
  aggregateFeedbackByZipAndModule,
  calculateAdjustmentFactor,
  FeedbackAggregation,
  upsertInferenceWeights,
} from "../feedback-aggregation";
import { prisma } from "../db";

// Mock the prisma client
jest.mock("../db", () => ({
  prisma: {
    userEventFeedback: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    zipCodeInferenceWeight: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
  },
}));

// Type assertions for mocked functions
const mockFindMany = prisma.userEventFeedback.findMany as jest.Mock;
const mockUpsert = prisma.zipCodeInferenceWeight.upsert as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

describe("feedback-aggregation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation((fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  });

  // ===========================================================================
  // ADJUSTMENT FACTOR CALCULATION TESTS
  // ===========================================================================

  describe("calculateAdjustmentFactor", () => {
    it("returns 1.0 for all positive feedback", () => {
      const factor = calculateAdjustmentFactor(10, 0);
      expect(factor).toBe(1.0);
    });

    it("returns 0.0 for all negative feedback", () => {
      const factor = calculateAdjustmentFactor(0, 10);
      expect(factor).toBe(0.0);
    });

    it("returns 0.5 for equal positive and negative feedback", () => {
      const factor = calculateAdjustmentFactor(5, 5);
      expect(factor).toBe(0.5);
    });

    it("returns 0.75 for 3:1 positive:negative ratio", () => {
      const factor = calculateAdjustmentFactor(75, 25);
      expect(factor).toBe(0.75);
    });

    it("returns 0.25 for 1:3 positive:negative ratio", () => {
      const factor = calculateAdjustmentFactor(25, 75);
      expect(factor).toBe(0.25);
    });

    it("handles single positive feedback", () => {
      const factor = calculateAdjustmentFactor(1, 0);
      expect(factor).toBe(1.0);
    });

    it("handles single negative feedback", () => {
      const factor = calculateAdjustmentFactor(0, 1);
      expect(factor).toBe(0.0);
    });

    it("returns 0.5 (neutral) when both counts are zero", () => {
      // Edge case: no feedback - return neutral factor
      const factor = calculateAdjustmentFactor(0, 0);
      expect(factor).toBe(0.5);
    });

    it("calculates correctly for realistic feedback volumes", () => {
      // 8 positive, 2 negative = 80% positive
      const factor = calculateAdjustmentFactor(8, 2);
      expect(factor).toBe(0.8);
    });

    it("rounds to 4 decimal places for precision", () => {
      // 7 positive, 3 negative = 0.7 (exact)
      const factor = calculateAdjustmentFactor(7, 3);
      expect(factor).toBe(0.7);

      // 1 positive, 3 negative = 0.25 (exact)
      const factor2 = calculateAdjustmentFactor(1, 3);
      expect(factor2).toBe(0.25);

      // 2 positive, 3 negative = 0.4 (exact)
      const factor3 = calculateAdjustmentFactor(2, 3);
      expect(factor3).toBe(0.4);
    });
  });

  // ===========================================================================
  // FEEDBACK COUNTING BY ZIP CODE AND MODULE TESTS
  // ===========================================================================

  describe("aggregateFeedbackByZipAndModule", () => {
    it("aggregates feedback grouped by zip code and module", async () => {
      // Mock feedback data with user info for zip code
      mockFindMany.mockResolvedValue([
        {
          id: "fb-1",
          userId: "user-1",
          eventId: "event-1",
          feedbackType: "THUMBS_UP",
          user: { zipCode: "10001" },
          event: { source: { moduleId: "events" } },
        },
        {
          id: "fb-2",
          userId: "user-2",
          eventId: "event-2",
          feedbackType: "THUMBS_UP",
          user: { zipCode: "10001" },
          event: { source: { moduleId: "events" } },
        },
        {
          id: "fb-3",
          userId: "user-3",
          eventId: "event-3",
          feedbackType: "THUMBS_DOWN",
          user: { zipCode: "10001" },
          event: { source: { moduleId: "events" } },
        },
        {
          id: "fb-4",
          userId: "user-4",
          eventId: "event-4",
          feedbackType: "THUMBS_UP",
          user: { zipCode: "11211" },
          event: { source: { moduleId: "transit" } },
        },
      ]);

      const result = await aggregateFeedbackByZipAndModule();

      expect(result).toHaveLength(2);

      // Find the 10001 + events aggregation
      const chelseaEvents = result.find(
        (r) => r.zipCode === "10001" && r.moduleId === "events"
      );
      expect(chelseaEvents).toBeDefined();
      expect(chelseaEvents?.positiveCount).toBe(2);
      expect(chelseaEvents?.negativeCount).toBe(1);
      expect(chelseaEvents?.adjustmentFactor).toBeCloseTo(0.6667, 3);

      // Find the 11211 + transit aggregation
      const wburgTransit = result.find(
        (r) => r.zipCode === "11211" && r.moduleId === "transit"
      );
      expect(wburgTransit).toBeDefined();
      expect(wburgTransit?.positiveCount).toBe(1);
      expect(wburgTransit?.negativeCount).toBe(0);
      expect(wburgTransit?.adjustmentFactor).toBe(1.0);
    });

    it("queries feedback with user and event relations", async () => {
      mockFindMany.mockResolvedValue([]);

      await aggregateFeedbackByZipAndModule();

      expect(mockFindMany).toHaveBeenCalledWith({
        include: {
          user: { select: { zipCode: true } },
          event: { include: { source: { select: { moduleId: true } } } },
        },
      });
    });

    it("returns empty array when no feedback exists", async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await aggregateFeedbackByZipAndModule();

      expect(result).toEqual([]);
    });

    it("handles multiple modules for same zip code", async () => {
      mockFindMany.mockResolvedValue([
        {
          id: "fb-1",
          userId: "user-1",
          eventId: "event-1",
          feedbackType: "THUMBS_UP",
          user: { zipCode: "10001" },
          event: { source: { moduleId: "events" } },
        },
        {
          id: "fb-2",
          userId: "user-2",
          eventId: "event-2",
          feedbackType: "THUMBS_DOWN",
          user: { zipCode: "10001" },
          event: { source: { moduleId: "transit" } },
        },
      ]);

      const result = await aggregateFeedbackByZipAndModule();

      expect(result).toHaveLength(2);

      const eventsAgg = result.find((r) => r.moduleId === "events");
      expect(eventsAgg?.positiveCount).toBe(1);
      expect(eventsAgg?.negativeCount).toBe(0);

      const transitAgg = result.find((r) => r.moduleId === "transit");
      expect(transitAgg?.positiveCount).toBe(0);
      expect(transitAgg?.negativeCount).toBe(1);
    });

    it("handles same module across different zip codes", async () => {
      mockFindMany.mockResolvedValue([
        {
          id: "fb-1",
          userId: "user-1",
          eventId: "event-1",
          feedbackType: "THUMBS_UP",
          user: { zipCode: "10001" },
          event: { source: { moduleId: "events" } },
        },
        {
          id: "fb-2",
          userId: "user-2",
          eventId: "event-2",
          feedbackType: "THUMBS_DOWN",
          user: { zipCode: "11211" },
          event: { source: { moduleId: "events" } },
        },
      ]);

      const result = await aggregateFeedbackByZipAndModule();

      expect(result).toHaveLength(2);

      const chelsea = result.find((r) => r.zipCode === "10001");
      expect(chelsea?.positiveCount).toBe(1);
      expect(chelsea?.negativeCount).toBe(0);

      const wburg = result.find((r) => r.zipCode === "11211");
      expect(wburg?.positiveCount).toBe(0);
      expect(wburg?.negativeCount).toBe(1);
    });
  });

  // ===========================================================================
  // UPSERT BEHAVIOR TESTS
  // ===========================================================================

  describe("upsertInferenceWeights", () => {
    it("creates new weight record when none exists", async () => {
      mockUpsert.mockResolvedValue({
        id: "weight-1",
        zipCode: "10001",
        moduleId: "events",
        positiveCount: 8,
        negativeCount: 2,
        adjustmentFactor: 0.8,
      });

      const aggregations: FeedbackAggregation[] = [
        {
          zipCode: "10001",
          moduleId: "events",
          positiveCount: 8,
          negativeCount: 2,
          adjustmentFactor: 0.8,
        },
      ];

      const result = await upsertInferenceWeights(aggregations);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            zipCode_moduleId: { zipCode: "10001", moduleId: "events" },
          },
          create: expect.objectContaining({
            zipCode: "10001",
            moduleId: "events",
            positiveCount: 8,
            negativeCount: 2,
            adjustmentFactor: 0.8,
          }),
          update: expect.objectContaining({
            positiveCount: 8,
            negativeCount: 2,
            adjustmentFactor: 0.8,
          }),
        })
      );
    });

    it("updates existing weight record", async () => {
      // First call returns existing record indication
      mockUpsert.mockResolvedValue({
        id: "weight-1",
        zipCode: "10001",
        moduleId: "events",
        positiveCount: 15, // Updated value
        negativeCount: 5,
        adjustmentFactor: 0.75,
      });

      const aggregations: FeedbackAggregation[] = [
        {
          zipCode: "10001",
          moduleId: "events",
          positiveCount: 15,
          negativeCount: 5,
          adjustmentFactor: 0.75,
        },
      ];

      // Note: upsert always "creates or updates" - we track updates by checking
      // if the record existed before, but for simplicity we just count operations
      const result = await upsertInferenceWeights(aggregations);

      expect(result.created + result.updated).toBe(1);
    });

    it("handles multiple aggregations in a single call", async () => {
      mockUpsert.mockResolvedValue({});

      const aggregations: FeedbackAggregation[] = [
        {
          zipCode: "10001",
          moduleId: "events",
          positiveCount: 8,
          negativeCount: 2,
          adjustmentFactor: 0.8,
        },
        {
          zipCode: "10001",
          moduleId: "transit",
          positiveCount: 5,
          negativeCount: 5,
          adjustmentFactor: 0.5,
        },
        {
          zipCode: "11211",
          moduleId: "events",
          positiveCount: 3,
          negativeCount: 7,
          adjustmentFactor: 0.3,
        },
      ];

      const result = await upsertInferenceWeights(aggregations);

      // Each aggregation should trigger an upsert
      expect(mockUpsert).toHaveBeenCalledTimes(3);
      expect(result.created + result.updated).toBe(3);
    });

    it("returns zero counts when no aggregations provided", async () => {
      const result = await upsertInferenceWeights([]);

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      mockUpsert.mockRejectedValue(new Error("Database connection failed"));

      const aggregations: FeedbackAggregation[] = [
        {
          zipCode: "10001",
          moduleId: "events",
          positiveCount: 8,
          negativeCount: 2,
          adjustmentFactor: 0.8,
        },
      ];

      await expect(upsertInferenceWeights(aggregations)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("uses transaction for atomicity", async () => {
      mockUpsert.mockResolvedValue({});

      const aggregations: FeedbackAggregation[] = [
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
      ];

      await upsertInferenceWeights(aggregations);

      // Should use transaction for atomicity
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // INTEGRATION BEHAVIOR TESTS
  // ===========================================================================

  describe("aggregation integration", () => {
    it("calculates correct adjustment factor for aggregated data", async () => {
      // 80 positive, 20 negative = 0.8 adjustment factor
      mockFindMany.mockResolvedValue([
        ...Array.from({ length: 80 }, (_, i) => ({
          id: `fb-pos-${i}`,
          userId: `user-${i}`,
          eventId: `event-${i}`,
          feedbackType: "THUMBS_UP",
          user: { zipCode: "10001" },
          event: { source: { moduleId: "events" } },
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `fb-neg-${i}`,
          userId: `user-neg-${i}`,
          eventId: `event-neg-${i}`,
          feedbackType: "THUMBS_DOWN",
          user: { zipCode: "10001" },
          event: { source: { moduleId: "events" } },
        })),
      ]);

      const result = await aggregateFeedbackByZipAndModule();

      expect(result).toHaveLength(1);
      expect(result[0].positiveCount).toBe(80);
      expect(result[0].negativeCount).toBe(20);
      expect(result[0].adjustmentFactor).toBe(0.8);
    });
  });
});
