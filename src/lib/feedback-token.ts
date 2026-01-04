// src/lib/feedback-token.ts
/**
 * Feedback Token Generation
 *
 * Provides cryptographically secure random token generation for the feedback
 * loop system. Tokens are embedded in email digest links to enable one-click
 * thumbs up/down voting without requiring user authentication.
 *
 * Security Architecture:
 * - Uses Node.js crypto.randomBytes() for CSPRNG (Cryptographically Secure
 *   Pseudo-Random Number Generator)
 * - 32 bytes of entropy (256 bits) - far exceeds the 128-bit minimum for
 *   secure tokens
 * - base64url encoding ensures URL-safe characters without escaping
 *
 * Token Lifecycle:
 * 1. Generated when creating UserEventFeedback record
 * 2. Embedded in email digest feedback links
 * 3. Validated and expired after 7 days or upon use
 *
 * Historical Context:
 * This pattern follows industry best practices established by OWASP for
 * secure token generation. The base64url encoding (RFC 4648) is specifically
 * designed for URL-safe transmission, avoiding the + and / characters of
 * standard base64 that require percent-encoding in URLs.
 *
 * @module feedback-token
 */

import crypto from "crypto";

/**
 * Length in bytes for the random token.
 * 32 bytes = 256 bits of entropy, providing strong collision resistance.
 *
 * Mathematical foundation:
 * - Birthday paradox collision probability: ~1 in 2^128 after 2^64 tokens
 * - At 1M tokens/day, would take ~50 billion years for 50% collision chance
 */
const TOKEN_BYTE_LENGTH = 32;

/**
 * Generates a cryptographically secure random token for feedback links.
 *
 * The token is suitable for:
 * - Embedding directly in URLs without encoding
 * - One-time use authentication for feedback submission
 * - Short-term validity (typically 7 days)
 *
 * Implementation uses Node.js crypto.randomBytes() which sources entropy from:
 * - /dev/urandom on Unix-like systems
 * - CryptGenRandom on Windows
 * - Hardware RNG when available
 *
 * @returns A URL-safe base64url-encoded random string (~43 characters)
 *
 * @example
 * ```typescript
 * const token = generateFeedbackToken();
 * // => "dGhpcyBpcyBhIHNhbXBsZSB0b2tlbiB2YWx1ZQ"
 *
 * // Use in email link:
 * const feedbackUrl = `${baseUrl}/api/feedback?token=${token}&rating=up`;
 * ```
 */
export function generateFeedbackToken(): string {
  return crypto.randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
}
