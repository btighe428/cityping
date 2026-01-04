// src/lib/__tests__/hype-scoring.test.ts
/**
 * Test Suite for the Hype Scoring Service
 *
 * This module tests the second and third stages of the hype scoring pipeline:
 * scarcity signal detection and final score calculation. The pipeline architecture:
 *
 *   [Scraper Data] -> [Brand Tier Lookup] -> [Scarcity Detection] -> [Final Score Calculation]
 *                     (brand-tiers.ts)        (hype-scoring.ts)      (hype-scoring.ts)
 *
 * The hype scoring system quantifies sample sale urgency on a 0-100 scale, enabling
 * intelligent notification prioritization and user engagement optimization.
 *
 * Theoretical Foundation - Scarcity Heuristics:
 * --------------------------------------------
 * The scarcity signals detected by this module are grounded in behavioral economics
 * research, particularly Cialdini's "Influence" (1984) and Kahneman's work on loss
 * aversion. Key scarcity triggers include:
 *
 * 1. TIME SCARCITY ("one day only", "today only")
 *    - Creates urgency through deadline pressure
 *    - Loss aversion: missing the sale = permanent loss of opportunity
 *    - Historically, one-day sales generate 2-3x the attendance of multi-day events
 *
 * 2. QUANTITY SCARCITY ("first 100 customers", "limited quantities")
 *    - Competition frame: converts shopping into a race
 *    - "Bandwagon effect" combined with exclusivity
 *    - Early-bird advantages trigger FOMO (Fear Of Missing Out)
 *
 * 3. ACCESS SCARCITY ("VIP", "early access", "exclusive")
 *    - Social proof combined with exclusivity
 *    - Appeals to in-group identity and status seeking
 *    - VIP events for luxury brands often presage public sales
 *
 * 4. VALUE SCARCITY ("70%+ off")
 *    - Reference price anchoring amplifies perceived value
 *    - Deep discounts on already-expensive items create outsized value perception
 *    - 70%+ off luxury goods represents genuinely rare opportunity
 *
 * Testing Philosophy:
 * ------------------
 * These tests verify both the signal detection logic and the score calculation
 * integration. We test boundary conditions (e.g., generic text yielding zero bonus)
 * and ensure proper clamping of final scores to the 0-100 range.
 */

import {
  calculateHypeScore,
  calculateHypeScoreWithAi,
  detectScarcitySignals,
  getAiHypeAdjustment,
  type ScarcitySignals,
  type HypeScoreResult,
} from "../hype-scoring";

describe("hype-scoring", () => {
  /**
   * Scarcity Signal Detection Tests
   *
   * These tests verify that the detectScarcitySignals function correctly
   * identifies marketing language patterns that indicate scarcity.
   * The regex patterns must balance precision (avoiding false positives)
   * with recall (catching common variations).
   */
  describe("detectScarcitySignals", () => {
    /**
     * Time Scarcity Detection
     *
     * One-day-only sales create maximum urgency. Common patterns include:
     * - "One day only!" (260 Sample Sale standard phrasing)
     * - "Today only" (flash sale language)
     * - "Single day event" (formal announcement style)
     *
     * Bonus: +15 points - highest scarcity signal weight
     */
    it("detects 'one day only'", () => {
      const signals = detectScarcitySignals("One day only! Hermes sample sale");

      expect(signals.oneDay).toBe(true);
      expect(signals.bonus).toBeGreaterThan(0);
      // Verify the specific bonus value per the spec
      expect(signals.bonus).toBeGreaterThanOrEqual(15);
    });

    it("detects 'today only' variant", () => {
      const signals = detectScarcitySignals("Today only - Theory warehouse sale");

      expect(signals.oneDay).toBe(true);
      expect(signals.bonus).toBeGreaterThanOrEqual(15);
    });

    it("detects 'single day' variant", () => {
      const signals = detectScarcitySignals("This is a single day event");

      expect(signals.oneDay).toBe(true);
    });

    /**
     * Quantity Scarcity Detection
     *
     * Limited quantity language triggers competition frame.
     * Common patterns include:
     * - "First 100 customers" (numbered scarcity)
     * - "Limited quantities" (general scarcity)
     * - "While supplies last" (urgency language)
     *
     * Bonus: +10 points
     */
    it("detects 'first 100 customers'", () => {
      const signals = detectScarcitySignals(
        "First 100 customers get extra 20% off"
      );

      expect(signals.limitedQuantity).toBe(true);
      expect(signals.bonus).toBeGreaterThanOrEqual(10);
    });

    it("detects 'limited quantities'", () => {
      const signals = detectScarcitySignals(
        "Limited quantities available - shop early"
      );

      expect(signals.limitedQuantity).toBe(true);
    });

    it("detects 'while supplies last'", () => {
      const signals = detectScarcitySignals(
        "Prices slashed while supplies last"
      );

      expect(signals.limitedQuantity).toBe(true);
    });

    /**
     * VIP Access Detection
     *
     * Exclusive access signals prestige and early opportunity.
     * Common patterns include:
     * - "VIP" (explicit exclusivity)
     * - "Early access" (timing advantage)
     * - "Preview" (first look)
     * - "Exclusive" (access restriction)
     *
     * Bonus: +10 points
     */
    it("detects 'vip' access", () => {
      const signals = detectScarcitySignals("VIP shopping day for members");

      expect(signals.vipAccess).toBe(true);
      expect(signals.bonus).toBeGreaterThanOrEqual(10);
    });

    it("detects 'early access' variant", () => {
      const signals = detectScarcitySignals(
        "Early access for email subscribers"
      );

      expect(signals.vipAccess).toBe(true);
    });

    it("detects 'exclusive preview' variant", () => {
      const signals = detectScarcitySignals("Exclusive preview event tonight");

      expect(signals.vipAccess).toBe(true);
    });

    /**
     * Deep Discount Detection
     *
     * Exceptional discounts (70%+) signal genuine value opportunity.
     * Fashion industry context: Typical sample sale discounts are 40-60%.
     * Discounts of 70%+ are rare and indicate either:
     * - End of season clearance
     * - Overstocked inventory
     * - Exceptional promotional event
     *
     * Bonus: +5 points (lower than scarcity signals as discounts are common)
     */
    it("detects deep discounts", () => {
      const signals = detectScarcitySignals("Up to 80% off retail");

      expect(signals.deepDiscount).toBe(true);
      expect(signals.bonus).toBeGreaterThanOrEqual(5);
    });

    it("detects 70% off threshold", () => {
      const signals = detectScarcitySignals("70% off all items");

      expect(signals.deepDiscount).toBe(true);
    });

    it("detects 90% off extreme discount", () => {
      const signals = detectScarcitySignals("90% off clearance event");

      expect(signals.deepDiscount).toBe(true);
    });

    /**
     * Null Case - No Scarcity Signals
     *
     * Generic sample sale text without scarcity language should yield
     * zero bonus. This prevents score inflation for ordinary events.
     */
    it("returns zero bonus for generic text", () => {
      const signals = detectScarcitySignals("Sample sale this weekend");

      expect(signals.oneDay).toBe(false);
      expect(signals.limitedQuantity).toBe(false);
      expect(signals.vipAccess).toBe(false);
      expect(signals.deepDiscount).toBe(false);
      expect(signals.bonus).toBe(0);
    });

    it("returns zero bonus for empty string", () => {
      const signals = detectScarcitySignals("");

      expect(signals.bonus).toBe(0);
    });

    /**
     * Multiple Signal Accumulation
     *
     * Multiple scarcity signals should stack additively.
     * A sale that is "one day only" AND "VIP" AND "70% off"
     * should accumulate all applicable bonuses.
     */
    it("accumulates multiple scarcity signals", () => {
      const signals = detectScarcitySignals(
        "VIP early access: One day only! Up to 80% off Hermes"
      );

      expect(signals.oneDay).toBe(true);
      expect(signals.vipAccess).toBe(true);
      expect(signals.deepDiscount).toBe(true);
      // Should be at least 15 + 10 + 5 = 30
      expect(signals.bonus).toBeGreaterThanOrEqual(30);
    });

    /**
     * Case Insensitivity
     *
     * Marketing text arrives in various cases. The detection
     * should be case-insensitive to handle "ONE DAY ONLY",
     * "One Day Only", and "one day only" equivalently.
     */
    it("handles case-insensitive matching", () => {
      const upper = detectScarcitySignals("ONE DAY ONLY! VIP ACCESS");
      const lower = detectScarcitySignals("one day only! vip access");
      const mixed = detectScarcitySignals("One Day Only! Vip Access");

      expect(upper.oneDay).toBe(true);
      expect(lower.oneDay).toBe(true);
      expect(mixed.oneDay).toBe(true);

      expect(upper.vipAccess).toBe(true);
      expect(lower.vipAccess).toBe(true);
      expect(mixed.vipAccess).toBe(true);
    });
  });

  /**
   * Hype Score Calculation Tests
   *
   * These tests verify the complete scoring pipeline:
   *   baseScore (from brand tier) + scarcityBonus + aiAdjustment = finalScore
   *
   * The finalScore is clamped to 0-100 to maintain a consistent scale.
   */
  describe("calculateHypeScore", () => {
    /**
     * Luxury Brand with Scarcity
     *
     * This represents the "holy grail" scenario: a luxury brand sample sale
     * with time scarcity. Expected behavior:
     * - baseScore: 95 (luxury tier)
     * - scarcityBonus: 15+ (one day only)
     * - finalScore: 100 (clamped from 110+)
     */
    it("calculates score for luxury brand with scarcity", () => {
      const score = calculateHypeScore("Hermes", "One day only! Up to 70% off");

      // Hermes is luxury tier: baseScore = 95
      expect(score.baseScore).toBe(95);

      // "One day only" triggers scarcity bonus
      expect(score.scarcityBonus).toBeGreaterThan(0);

      // Final score should be at least baseScore (scarcity adds)
      expect(score.finalScore).toBeGreaterThanOrEqual(95);

      // Final score is clamped to max 100
      expect(score.finalScore).toBeLessThanOrEqual(100);

      // Verify factors object structure
      expect(score.factors).toHaveProperty("brandTier");
      expect(score.factors).toHaveProperty("scarcity");
      expect(score.factors).toHaveProperty("ai");
    });

    /**
     * Unknown Brand - Conservative Default
     *
     * Unknown brands receive conservative scoring to prevent gaming
     * the system with obscure or fake brand names.
     */
    it("calculates score for unknown brand", () => {
      const score = calculateHypeScore("Random Brand", "Sample sale");

      // Unknown tier: baseScore = 40
      expect(score.baseScore).toBe(40);

      // No scarcity signals in generic text
      expect(score.scarcityBonus).toBe(0);

      // No AI adjustment when not provided
      expect(score.aiAdjustment).toBe(0);

      // Final score equals base with no adjustments
      expect(score.finalScore).toBe(40);
    });

    /**
     * Designer Brand - Mid-Tier Scoring
     *
     * Designer brands (e.g., Alexander Wang) represent the sweet spot
     * for CityPing users: accessible prices, good discounts, quality goods.
     */
    it("calculates score for designer brand", () => {
      const score = calculateHypeScore(
        "Alexander Wang",
        "VIP early access sale"
      );

      // Designer tier: baseScore = 75
      expect(score.baseScore).toBe(75);

      // VIP triggers scarcity bonus
      expect(score.scarcityBonus).toBeGreaterThanOrEqual(10);

      // Final score reflects base + scarcity
      expect(score.finalScore).toBeGreaterThanOrEqual(85);
    });

    /**
     * Contemporary Brand - Standard Scoring
     *
     * Contemporary brands like Theory are frequent sample sale hosts.
     * Their baseline scoring reflects reliable but not exceptional events.
     */
    it("calculates score for contemporary brand", () => {
      const score = calculateHypeScore(
        "Theory",
        "Annual sample sale - up to 60% off"
      );

      // Contemporary tier: baseScore = 55
      expect(score.baseScore).toBe(55);

      // 60% off doesn't trigger deep discount (threshold is 70%)
      expect(score.factors.scarcity).toBe(0);

      expect(score.finalScore).toBe(55);
    });

    /**
     * AI Adjustment Integration
     *
     * The optional aiAdjustment parameter allows Claude Haiku
     * to refine scores based on contextual analysis. This tests
     * that adjustments are properly applied.
     */
    it("applies AI adjustment correctly", () => {
      const positiveAdjustment = calculateHypeScore(
        "Theory",
        "Sample sale",
        10 // Positive AI boost
      );

      expect(positiveAdjustment.aiAdjustment).toBe(10);
      expect(positiveAdjustment.finalScore).toBe(55 + 10);
      expect(positiveAdjustment.factors.ai).toBe(10);

      const negativeAdjustment = calculateHypeScore(
        "Theory",
        "Sample sale",
        -15 // Negative AI penalty
      );

      expect(negativeAdjustment.aiAdjustment).toBe(-15);
      expect(negativeAdjustment.finalScore).toBe(55 - 15);
    });

    /**
     * Score Clamping - Upper Bound
     *
     * Even with maximum brand score + maximum scarcity + AI boost,
     * the final score must not exceed 100.
     */
    it("clamps final score to maximum 100", () => {
      const score = calculateHypeScore(
        "Hermes", // 95 base
        "One day only! VIP access! 90% off!", // ~35 bonus
        20 // AI boost
      );

      // Raw score would be 95 + 35+ + 20 = 150+
      // Must be clamped to 100
      expect(score.finalScore).toBe(100);
    });

    /**
     * Score Clamping - Lower Bound
     *
     * Negative AI adjustments should not push scores below 0.
     */
    it("clamps final score to minimum 0", () => {
      const score = calculateHypeScore(
        "Random Brand", // 40 base
        "Sample sale", // 0 scarcity
        -50 // Severe AI penalty (hypothetical)
      );

      // Raw score would be 40 + 0 + (-50) = -10
      // Must be clamped to 0
      expect(score.finalScore).toBe(0);
    });

    /**
     * Result Structure Verification
     *
     * Verify that the HypeScoreResult interface is properly implemented
     * with all required properties.
     */
    it("returns properly structured result object", () => {
      const score = calculateHypeScore("Vince", "Weekend sale");

      // Verify all top-level properties exist
      expect(typeof score.baseScore).toBe("number");
      expect(typeof score.scarcityBonus).toBe("number");
      expect(typeof score.aiAdjustment).toBe("number");
      expect(typeof score.finalScore).toBe("number");

      // Verify factors sub-object
      expect(typeof score.factors.brandTier).toBe("number");
      expect(typeof score.factors.scarcity).toBe("number");
      expect(typeof score.factors.ai).toBe("number");

      // Verify factors match top-level values
      expect(score.factors.brandTier).toBe(score.baseScore);
      expect(score.factors.scarcity).toBe(score.scarcityBonus);
      expect(score.factors.ai).toBe(score.aiAdjustment);
    });

    /**
     * Case Insensitivity for Brand Names
     *
     * Brand matching should be case-insensitive, matching the
     * behavior of getBrandTier in brand-tiers.ts.
     */
    it("handles brand name case insensitivity", () => {
      const upper = calculateHypeScore("HERMES", "Sample sale");
      const lower = calculateHypeScore("hermes", "Sample sale");
      const mixed = calculateHypeScore("Hermes", "Sample sale");

      expect(upper.baseScore).toBe(95);
      expect(lower.baseScore).toBe(95);
      expect(mixed.baseScore).toBe(95);
    });

    /**
     * Empty/Null Description Handling
     *
     * The function should gracefully handle empty or undefined
     * descriptions without throwing errors.
     */
    it("handles empty description gracefully", () => {
      const score = calculateHypeScore("Theory", "");

      expect(score.scarcityBonus).toBe(0);
      expect(score.finalScore).toBe(55);
    });
  });

  /**
   * AI-Powered Hype Adjustment Tests
   *
   * The getAiHypeAdjustment function integrates Claude Haiku to provide
   * contextual scoring refinements. In production, it analyzes:
   * - Scarcity signals not captured by regex patterns
   * - Historical brand performance at sample sales
   * - Seasonal and timing factors
   *
   * In test mode (NODE_ENV === "test"), the function returns 0 to avoid
   * external API dependencies during automated testing. This follows the
   * Test Double pattern: real API calls are tested in integration tests,
   * while unit tests verify the function's boundary behavior.
   *
   * Historical Context - AI in Retail Pricing:
   * The use of AI for dynamic pricing and demand prediction has precedent
   * in retail since the 1990s (American Airlines SABRE system). Modern
   * applications include Uber's surge pricing and Amazon's real-time
   * pricing algorithms. CityPing's approach is more subtle: rather than
   * adjusting prices, we adjust notification urgency to help users
   * prioritize genuinely exceptional opportunities.
   */
  describe("getAiHypeAdjustment", () => {
    /**
     * Test Mode Behavior
     *
     * In test environment, getAiHypeAdjustment returns 0 to:
     * 1. Avoid external API dependencies in CI/CD pipelines
     * 2. Ensure deterministic test outcomes
     * 3. Prevent API rate limiting during test runs
     *
     * This is a critical design decision: the AI adjustment is an
     * enhancement, not a core requirement. The system functions
     * correctly with aiAdjustment = 0.
     */
    it("returns 0 in test environment", async () => {
      const adjustment = await getAiHypeAdjustment(
        "Theory",
        "Sample sale this weekend",
        55
      );

      expect(adjustment).toBe(0);
    });

    /**
     * Boundary Validation
     *
     * Regardless of environment, the function must return values
     * within the valid range of -20 to +20. This prevents runaway
     * score inflation or deflation from AI responses.
     *
     * The clamping is implemented in the function itself, not just
     * in calculateHypeScoreWithAi, to ensure safety at every level.
     */
    it("returns adjustment between -20 and +20", async () => {
      const adjustment = await getAiHypeAdjustment(
        "Theory",
        "Sample sale this weekend",
        55
      );

      expect(adjustment).toBeGreaterThanOrEqual(-20);
      expect(adjustment).toBeLessThanOrEqual(20);
    });

    /**
     * Type Safety
     *
     * The function must return a number, never undefined or NaN.
     * This ensures downstream calculations are always valid.
     */
    it("returns a valid number", async () => {
      const adjustment = await getAiHypeAdjustment("Hermes", "One day only!", 95);

      expect(typeof adjustment).toBe("number");
      expect(Number.isNaN(adjustment)).toBe(false);
      expect(Number.isFinite(adjustment)).toBe(true);
    });
  });

  /**
   * Full AI-Integrated Scoring Pipeline Tests
   *
   * The calculateHypeScoreWithAi function orchestrates the complete
   * scoring pipeline including the AI adjustment step. It follows the
   * same logic as calculateHypeScore but adds the AI refinement layer.
   *
   * Architecture:
   *   [Brand Name] -> getBrandScore -> baseScore
   *   [Description] -> detectScarcitySignals -> scarcityBonus
   *   [Context] -> getAiHypeAdjustment -> aiAdjustment (async)
   *   [All Scores] -> Clamping -> finalScore
   */
  describe("calculateHypeScoreWithAi", () => {
    /**
     * Return Value Structure
     *
     * The async function must return the same HypeScoreResult structure
     * as the synchronous calculateHypeScore, ensuring API consistency.
     */
    it("returns properly structured HypeScoreResult", async () => {
      const score = await calculateHypeScoreWithAi("Theory", "Weekend sale");

      expect(typeof score.baseScore).toBe("number");
      expect(typeof score.scarcityBonus).toBe("number");
      expect(typeof score.aiAdjustment).toBe("number");
      expect(typeof score.finalScore).toBe("number");
      expect(score.factors).toHaveProperty("brandTier");
      expect(score.factors).toHaveProperty("scarcity");
      expect(score.factors).toHaveProperty("ai");
    });

    /**
     * Score Range Validation
     *
     * Final scores must be clamped to 0-100 regardless of inputs.
     */
    it("clamps final score to 0-100 range", async () => {
      const score = await calculateHypeScoreWithAi(
        "Hermes",
        "One day only! VIP access! 90% off!"
      );

      expect(score.finalScore).toBeGreaterThanOrEqual(0);
      expect(score.finalScore).toBeLessThanOrEqual(100);
    });

    /**
     * Brand Tier Integration
     *
     * The async function should correctly delegate to getBrandScore
     * for base score calculation.
     */
    it("uses correct brand tier score", async () => {
      const luxuryScore = await calculateHypeScoreWithAi("Hermes", "Sale");
      const designerScore = await calculateHypeScoreWithAi("Alexander Wang", "Sale");
      const contemporaryScore = await calculateHypeScoreWithAi("Theory", "Sale");

      expect(luxuryScore.baseScore).toBe(95);
      expect(designerScore.baseScore).toBe(75);
      expect(contemporaryScore.baseScore).toBe(55);
    });

    /**
     * Scarcity Detection Integration
     *
     * The async function should correctly detect and apply scarcity bonuses.
     */
    it("detects and applies scarcity bonus", async () => {
      const withScarcity = await calculateHypeScoreWithAi(
        "Theory",
        "One day only! VIP access!"
      );
      const withoutScarcity = await calculateHypeScoreWithAi(
        "Theory",
        "Regular weekend sale"
      );

      expect(withScarcity.scarcityBonus).toBeGreaterThan(0);
      expect(withoutScarcity.scarcityBonus).toBe(0);
    });

    /**
     * AI Adjustment Integration (Test Mode)
     *
     * In test environment, AI adjustment should be 0, but the
     * function should still complete successfully.
     */
    it("includes AI adjustment in factors", async () => {
      const score = await calculateHypeScoreWithAi(
        "Theory",
        "Sample sale"
      );

      // In test mode, AI adjustment is 0
      expect(score.aiAdjustment).toBe(0);
      expect(score.factors.ai).toBe(0);
    });
  });
});
