// src/lib/feedback-aggregation.ts
/**
 * Feedback Aggregation Service
 *
 * This module implements the feedback loop aggregation system that processes
 * user feedback (thumbs up/down ratings) and updates ZipCodeInferenceWeight
 * records. These weights are used to personalize event relevance scoring
 * based on neighborhood-level preferences.
 *
 * Architecture Overview:
 * +------------------+     +-------------------+     +----------------------+
 * | UserEventFeedback| --> | Aggregation Job   | --> | ZipCodeInferenceWeight|
 * | (individual votes)|     | (this module)     |     | (learned preferences)|
 * +------------------+     +-------------------+     +----------------------+
 *
 * The aggregation follows a collaborative filtering pattern where user
 * preferences are grouped by geography (zip code) and content type (module).
 * This enables the system to learn that, for example, residents of 11211
 * (Williamsburg) have different event preferences than residents of 10028
 * (Upper East Side).
 *
 * Aggregation Algorithm:
 * 1. Query all UserEventFeedback records with user and event relations
 * 2. Group by (user.zipCode, event.source.moduleId)
 * 3. Count THUMBS_UP (positive) and THUMBS_DOWN (negative) for each group
 * 4. Calculate adjustment factor: positive / (positive + negative)
 *    - 1.0 = all positive feedback, maximize relevance
 *    - 0.5 = neutral (equal positive/negative)
 *    - 0.0 = all negative feedback, minimize relevance
 * 5. Upsert results to ZipCodeInferenceWeight table
 *
 * Historical Context:
 * This approach is rooted in the seminal work on collaborative filtering
 * by Goldberg et al. (1992) and later refined in the Netflix Prize competition
 * (2006-2009). The geographic clustering aspect draws from geodemographic
 * segmentation systems like PRIZM (Claritas, 1974) which demonstrated that
 * neighborhood-level groupings provide strong signals for preference prediction.
 *
 * Performance Considerations:
 * - Designed for batch processing (cron job, not real-time)
 * - Uses database-level aggregation where possible
 * - Atomic updates via transactions to maintain consistency
 *
 * @module feedback-aggregation
 */

import { prisma } from "./db";

/**
 * Represents aggregated feedback data for a specific zip code and module.
 * This intermediate representation is calculated before upserting to the
 * ZipCodeInferenceWeight table.
 */
export interface FeedbackAggregation {
  /** NYC zip code (5 digits) identifying the geographic area */
  zipCode: string;

  /** Module identifier (events, transit, parking, etc.) */
  moduleId: string;

  /** Count of THUMBS_UP feedback for this zip+module combination */
  positiveCount: number;

  /** Count of THUMBS_DOWN feedback for this zip+module combination */
  negativeCount: number;

  /**
   * Calculated adjustment factor: positive / (positive + negative)
   * Range: [0.0, 1.0] where:
   * - 1.0 = all positive feedback (boost relevance)
   * - 0.5 = neutral (no adjustment)
   * - 0.0 = all negative feedback (suppress relevance)
   */
  adjustmentFactor: number;
}

/**
 * Result type for the upsertInferenceWeights function.
 * Tracks the number of records created vs. updated for monitoring/logging.
 */
export interface UpsertResult {
  /** Number of new ZipCodeInferenceWeight records created */
  created: number;

  /** Number of existing ZipCodeInferenceWeight records updated */
  updated: number;
}

/**
 * Calculates the adjustment factor from positive and negative counts.
 *
 * The formula is a simple ratio: positive / (positive + negative)
 * This provides an intuitive interpretation:
 * - 100% positive = 1.0 (maximum boost)
 * - 50% positive = 0.5 (neutral)
 * - 0% positive = 0.0 (maximum suppression)
 *
 * Edge Cases:
 * - When both counts are zero, returns 0.5 (neutral) to avoid NaN
 * - Results are not rounded to preserve precision for downstream calculations
 *
 * Mathematical Foundation:
 * This is a simplified maximum likelihood estimate for a Bernoulli parameter.
 * For more robust estimation with small samples, consider the Wilson score
 * interval or Laplace smoothing (adding pseudocounts).
 *
 * @param positiveCount - Number of THUMBS_UP ratings
 * @param negativeCount - Number of THUMBS_DOWN ratings
 * @returns Adjustment factor in range [0.0, 1.0]
 *
 * @example
 * ```typescript
 * calculateAdjustmentFactor(8, 2);  // Returns 0.8
 * calculateAdjustmentFactor(5, 5);  // Returns 0.5
 * calculateAdjustmentFactor(0, 10); // Returns 0.0
 * ```
 */
export function calculateAdjustmentFactor(
  positiveCount: number,
  negativeCount: number
): number {
  const total = positiveCount + negativeCount;

  // Handle edge case: no feedback at all returns neutral factor
  if (total === 0) {
    return 0.5;
  }

  // Simple ratio: proportion of positive feedback
  return positiveCount / total;
}

/**
 * Internal type for raw feedback data with relations.
 * Used during aggregation processing before grouping.
 */
interface FeedbackWithRelations {
  id: string;
  userId: string;
  eventId: string;
  feedbackType: "THUMBS_UP" | "THUMBS_DOWN";
  user: { zipCode: string };
  event: { source: { moduleId: string } };
}

/**
 * Aggregates all feedback records by zip code and module.
 *
 * This function performs the core aggregation logic:
 * 1. Fetches all UserEventFeedback records with user and event relations
 * 2. Groups by (user.zipCode, event.source.moduleId)
 * 3. Counts positive (THUMBS_UP) and negative (THUMBS_DOWN) for each group
 * 4. Calculates the adjustment factor for each group
 *
 * The function returns all aggregations, not just those with minimum feedback
 * thresholds. Filtering can be applied by the caller if needed.
 *
 * Performance Note:
 * For very large feedback tables, consider adding database-level GROUP BY
 * using Prisma's groupBy() or raw SQL. The current implementation fetches
 * all records and groups in memory, which is suitable for moderate volumes
 * (< 100K records) but may need optimization for larger scales.
 *
 * @returns Promise resolving to array of aggregations by (zipCode, moduleId)
 *
 * @example
 * ```typescript
 * const aggregations = await aggregateFeedbackByZipAndModule();
 * // Returns: [
 * //   { zipCode: "10001", moduleId: "events", positiveCount: 8, negativeCount: 2, adjustmentFactor: 0.8 },
 * //   { zipCode: "11211", moduleId: "transit", positiveCount: 5, negativeCount: 5, adjustmentFactor: 0.5 },
 * // ]
 * ```
 */
export async function aggregateFeedbackByZipAndModule(): Promise<
  FeedbackAggregation[]
> {
  // Fetch all feedback with user (for zip) and event->source (for module)
  const feedbackRecords = (await prisma.userEventFeedback.findMany({
    include: {
      user: { select: { zipCode: true } },
      event: { include: { source: { select: { moduleId: true } } } },
    },
  })) as FeedbackWithRelations[];

  // Group by (zipCode, moduleId) and count positive/negative
  const aggregationMap = new Map<
    string,
    { zipCode: string; moduleId: string; positive: number; negative: number }
  >();

  for (const feedback of feedbackRecords) {
    const zipCode = feedback.user.zipCode;
    const moduleId = feedback.event.source.moduleId;
    const key = `${zipCode}:${moduleId}`;

    if (!aggregationMap.has(key)) {
      aggregationMap.set(key, {
        zipCode,
        moduleId,
        positive: 0,
        negative: 0,
      });
    }

    const agg = aggregationMap.get(key)!;
    if (feedback.feedbackType === "THUMBS_UP") {
      agg.positive++;
    } else if (feedback.feedbackType === "THUMBS_DOWN") {
      agg.negative++;
    }
  }

  // Convert to array and calculate adjustment factors
  const aggregations: FeedbackAggregation[] = [];

  for (const agg of aggregationMap.values()) {
    aggregations.push({
      zipCode: agg.zipCode,
      moduleId: agg.moduleId,
      positiveCount: agg.positive,
      negativeCount: agg.negative,
      adjustmentFactor: calculateAdjustmentFactor(agg.positive, agg.negative),
    });
  }

  return aggregations;
}

/**
 * Upserts aggregated feedback data to ZipCodeInferenceWeight table.
 *
 * This function persists the aggregation results by:
 * 1. For each aggregation, attempting to find an existing weight record
 * 2. If found, updating the counts and adjustment factor
 * 3. If not found, creating a new weight record
 *
 * The operation uses a database transaction to ensure atomicity - either
 * all upserts succeed or all fail, maintaining data consistency.
 *
 * The ZipCodeInferenceWeight records are used by the matching engine to
 * boost or suppress event relevance for specific neighborhoods. A higher
 * adjustment factor means users in that zip code have historically rated
 * events from that module positively.
 *
 * @param aggregations - Array of aggregated feedback data to persist
 * @returns Promise resolving to counts of created/updated records
 *
 * @throws {Error} If database transaction fails
 *
 * @example
 * ```typescript
 * const aggregations = await aggregateFeedbackByZipAndModule();
 * const result = await upsertInferenceWeights(aggregations);
 * console.log(`Created: ${result.created}, Updated: ${result.updated}`);
 * ```
 */
export async function upsertInferenceWeights(
  aggregations: FeedbackAggregation[]
): Promise<UpsertResult> {
  if (aggregations.length === 0) {
    return { created: 0, updated: 0 };
  }

  // Track created vs updated (simplified: we count all as "created" since
  // Prisma upsert doesn't distinguish - in practice this is for monitoring)
  let operationCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const agg of aggregations) {
      await tx.zipCodeInferenceWeight.upsert({
        where: {
          zipCode_moduleId: {
            zipCode: agg.zipCode,
            moduleId: agg.moduleId,
          },
        },
        create: {
          zipCode: agg.zipCode,
          moduleId: agg.moduleId,
          positiveCount: agg.positiveCount,
          negativeCount: agg.negativeCount,
          adjustmentFactor: agg.adjustmentFactor,
        },
        update: {
          positiveCount: agg.positiveCount,
          negativeCount: agg.negativeCount,
          adjustmentFactor: agg.adjustmentFactor,
        },
      });
      operationCount++;
    }
  });

  // Note: Prisma upsert doesn't tell us if it created or updated.
  // For simplicity, we report all as "created" - a production system
  // might query before to distinguish, but that adds latency.
  return { created: operationCount, updated: 0 };
}

/**
 * Runs the complete feedback aggregation pipeline.
 *
 * This is the main entry point for the aggregation job, combining:
 * 1. aggregateFeedbackByZipAndModule() - collect and group feedback
 * 2. upsertInferenceWeights() - persist to database
 *
 * Designed to be called by a scheduled cron job (e.g., daily or hourly).
 *
 * @returns Promise resolving to aggregation summary
 *
 * @example
 * ```typescript
 * // In cron job handler:
 * const result = await runFeedbackAggregation();
 * console.log(`Aggregated ${result.aggregationCount} zip+module combinations`);
 * console.log(`Persisted ${result.created + result.updated} weight records`);
 * ```
 */
export async function runFeedbackAggregation(): Promise<{
  aggregationCount: number;
  created: number;
  updated: number;
  aggregations: FeedbackAggregation[];
}> {
  // Step 1: Aggregate feedback by zip code and module
  const aggregations = await aggregateFeedbackByZipAndModule();

  // Step 2: Persist to ZipCodeInferenceWeight table
  const { created, updated } = await upsertInferenceWeights(aggregations);

  return {
    aggregationCount: aggregations.length,
    created,
    updated,
    aggregations,
  };
}
