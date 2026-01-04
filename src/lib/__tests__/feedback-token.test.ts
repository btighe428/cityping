// src/lib/__tests__/feedback-token.test.ts
/**
 * Tests for Feedback Token Generation
 *
 * This module tests the cryptographically secure token generation
 * used for feedback links in email digests. The tokens enable
 * one-click voting without requiring user authentication.
 *
 * Security Requirements:
 * - Tokens must be cryptographically random (unpredictable)
 * - Tokens must be unique across generations
 * - Tokens must be URL-safe for inclusion in email links
 */

import { generateFeedbackToken } from "../feedback-token";

describe("generateFeedbackToken", () => {
  it("generates a non-empty string token", () => {
    const token = generateFeedbackToken();

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("generates URL-safe tokens (base64url encoding)", () => {
    const token = generateFeedbackToken();

    // URL-safe base64 should only contain alphanumeric, hyphen, underscore
    // No +, /, or = characters which require URL encoding
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates tokens of consistent length", () => {
    const tokens = Array.from({ length: 10 }, () => generateFeedbackToken());

    // All tokens should be the same length (32 bytes = ~43 chars in base64url)
    const lengths = new Set(tokens.map((t) => t.length));
    expect(lengths.size).toBe(1);
  });

  it("generates unique tokens on successive calls", () => {
    // Generate 100 tokens and verify uniqueness
    const tokenCount = 100;
    const tokens = Array.from({ length: tokenCount }, () =>
      generateFeedbackToken()
    );

    // Convert to Set to check for duplicates
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(tokenCount);
  });

  it("generates tokens with sufficient entropy (at least 128 bits)", () => {
    const token = generateFeedbackToken();

    // With 32 random bytes (256 bits) encoded as base64url,
    // the token should be approximately 43 characters
    // (32 * 8 / 6 = 42.67, rounded up with padding)
    // We require at least 128 bits = 16 bytes = ~22 chars
    expect(token.length).toBeGreaterThanOrEqual(22);
  });

  it("generates different tokens across multiple rapid calls", () => {
    // Ensure the RNG isn't seeded with time and producing duplicates
    const rapidTokens = [];
    for (let i = 0; i < 50; i++) {
      rapidTokens.push(generateFeedbackToken());
    }

    const uniqueSet = new Set(rapidTokens);
    expect(uniqueSet.size).toBe(rapidTokens.length);
  });
});
