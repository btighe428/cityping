// src/lib/feedback.ts
/**
 * Feedback Record Management
 *
 * This module handles the creation and management of UserEventFeedback records
 * that power the feedback loop system. Each record represents a pending or
 * submitted feedback action for a specific user-event pair.
 *
 * Feedback Loop Architecture:
 * +-----------------+     +------------------+     +-------------------+
 * | Email Digest    | --> | UserEventFeedback| --> | Zip Inference     |
 * | (feedback links)|     | (token, rating)  |     | Weights (learning)|
 * +-----------------+     +------------------+     +-------------------+
 *
 * Token-Based Authentication:
 * Rather than requiring users to log in to submit feedback, we use secure
 * tokens embedded in email links. This enables "one-click" feedback while
 * maintaining security through:
 * - Cryptographically random tokens (256-bit entropy)
 * - 7-day expiration window
 * - One-time use per user-event pair (enforced by unique constraint)
 *
 * Historical Context:
 * This pattern is inspired by email unsubscribe mechanisms (RFC 8058) and
 * one-click satisfaction surveys used by companies like Uber and DoorDash.
 * The tradeoff of security vs. convenience favors convenience here because:
 * 1. Low-stakes action (thumbs up/down, not financial)
 * 2. Short validity window limits exposure
 * 3. Token entropy makes guessing infeasible
 *
 * @module feedback
 */

import { UserEventFeedback } from "@prisma/client";
import { prisma } from "./db";
import { generateFeedbackToken } from "./feedback-token";

/**
 * Number of days until a feedback token expires.
 * Set to 7 days to align with weekly digest cycles while providing
 * reasonable time for users to respond to email links.
 */
const TOKEN_EXPIRY_DAYS = 7;

/**
 * Result type for createFeedbackRecord function.
 * Returns both the raw token (for URL embedding) and the database record.
 */
export interface FeedbackRecordResult {
  /**
   * The raw, unencoded feedback token for embedding in URLs.
   * This is the only time the raw token is available - it's stored
   * as-is in the database for this use case (unlike password hashing).
   */
  token: string;

  /**
   * The created UserEventFeedback database record.
   * Contains all stored fields including the token and expiration.
   */
  feedbackRecord: UserEventFeedback;
}

/**
 * Creates a UserEventFeedback record with a secure feedback token.
 *
 * This function is called when generating email digests to create pending
 * feedback records for each event. The token is embedded in the email's
 * thumbs up/down links:
 *
 * ```
 * /api/feedback?token={token}&rating=up
 * /api/feedback?token={token}&rating=down
 * ```
 *
 * The record starts without a feedbackType (null) until the user clicks
 * one of the links and submits their rating.
 *
 * Idempotency Note:
 * If a record already exists for this user-event pair (unique constraint),
 * this function will throw a Prisma error. Callers should handle this case
 * by either:
 * 1. Catching the error and returning the existing record
 * 2. Using upsert semantics if regenerating tokens is acceptable
 *
 * @param userId - The User.id for the feedback submitter
 * @param eventId - The AlertEvent.id being rated
 * @returns Promise resolving to the token and created record
 *
 * @throws {PrismaClientKnownRequestError} If unique constraint violated
 * @throws {Error} If database connection fails
 *
 * @example
 * ```typescript
 * // In email digest generation:
 * for (const event of events) {
 *   const { token } = await createFeedbackRecord(user.id, event.id);
 *   const thumbsUpUrl = `${baseUrl}/api/feedback?token=${token}&rating=up`;
 *   const thumbsDownUrl = `${baseUrl}/api/feedback?token=${token}&rating=down`;
 *   // Include URLs in email HTML...
 * }
 * ```
 */
export async function createFeedbackRecord(
  userId: string,
  eventId: string
): Promise<FeedbackRecordResult> {
  // Generate cryptographically secure token
  const token = generateFeedbackToken();

  // Calculate expiration date (7 days from now)
  const tokenExpiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Create or update the feedback record
  // Uses upsert to handle the case where a record already exists for this user-event pair
  // (e.g., from a previous digest that wasn't responded to)
  // The feedbackType starts as THUMBS_UP as a placeholder - it gets overwritten
  // when the user actually clicks either thumbs up or down in the email
  const feedbackRecord = await prisma.userEventFeedback.upsert({
    where: {
      userId_eventId: { userId, eventId },
    },
    create: {
      userId,
      eventId,
      feedbackToken: token,
      tokenExpiresAt,
      // feedbackType is required by schema - use THUMBS_UP as placeholder
      // This gets overwritten when user clicks the actual feedback link
      feedbackType: "THUMBS_UP",
    },
    update: {
      // Regenerate token and extend expiry for existing records
      feedbackToken: token,
      tokenExpiresAt,
    },
  });

  return {
    token,
    feedbackRecord,
  };
}
