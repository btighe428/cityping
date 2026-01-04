/**
 * Test suite for the Vibe Prompts Module.
 *
 * This module provides system prompts for Claude Haiku that modulate the
 * personality and verbosity of AI-generated notifications based on user
 * familiarity with NYC. The three-tier "vibe" system accommodates the
 * spectrum from recent transplants to lifelong locals.
 *
 * Design Philosophy:
 * The vibe system draws from research in user experience personalization
 * and cognitive load theory. Newcomers benefit from expanded context and
 * encouragement (reduced cognitive load through scaffolding), while locals
 * prefer brevity (respecting their existing mental models). This adaptive
 * communication style mirrors how native New Yorkers naturally adjust
 * their explanations based on the listener's familiarity.
 *
 * Historical Context:
 * NYC's reputation for terseness has deep cultural roots - the "New York
 * minute" idiom reflects the city's fast pace. However, the city also has
 * a tradition of welcoming newcomers (Ellis Island, immigrant communities).
 * The vibe system honors both traditions.
 *
 * Technical Implementation:
 * Prompts are designed for Claude Haiku's context window and instruction-
 * following capabilities. Each prompt establishes persona, tone guidelines,
 * and NYC-specific vocabulary expectations.
 */

import {
  VIBE_PROMPTS,
  VIBE_LABELS,
  getVibePrompt,
  VibePreset,
} from "../vibe-prompts";

describe("VIBE_PROMPTS", () => {
  /**
   * Basic Structure Tests
   *
   * Verify that all expected presets are defined and contain valid prompts.
   * This prevents runtime errors from missing keys.
   */
  describe("prompt definitions", () => {
    it("defines prompts for all three presets", () => {
      expect(VIBE_PROMPTS).toHaveProperty("TRANSPLANT");
      expect(VIBE_PROMPTS).toHaveProperty("REGULAR");
      expect(VIBE_PROMPTS).toHaveProperty("LOCAL");
    });

    it("returns non-empty strings for all presets", () => {
      expect(typeof VIBE_PROMPTS.TRANSPLANT).toBe("string");
      expect(typeof VIBE_PROMPTS.REGULAR).toBe("string");
      expect(typeof VIBE_PROMPTS.LOCAL).toBe("string");

      expect(VIBE_PROMPTS.TRANSPLANT.length).toBeGreaterThan(50);
      expect(VIBE_PROMPTS.REGULAR.length).toBeGreaterThan(50);
      expect(VIBE_PROMPTS.LOCAL.length).toBeGreaterThan(50);
    });
  });

  /**
   * TRANSPLANT Preset Tests
   *
   * The TRANSPLANT persona should be welcoming and educational.
   * Key characteristics:
   * - Explains NYC-specific terminology (bodega, alternate side, etc.)
   * - Uses encouraging, supportive language
   * - Provides extra context and background information
   * - Friendly, patient tone
   */
  describe("TRANSPLANT preset", () => {
    it("contains characteristics for newcomer-friendly communication", () => {
      const prompt = VIBE_PROMPTS.TRANSPLANT;

      // Should reference explaining/helping newcomers
      expect(
        prompt.toLowerCase().includes("new") ||
          prompt.toLowerCase().includes("explain") ||
          prompt.toLowerCase().includes("welcome") ||
          prompt.toLowerCase().includes("context")
      ).toBe(true);
    });

    it("emphasizes helpful and encouraging tone", () => {
      const prompt = VIBE_PROMPTS.TRANSPLANT;

      // Should include encouraging or friendly language guidance
      expect(
        prompt.toLowerCase().includes("friendly") ||
          prompt.toLowerCase().includes("helpful") ||
          prompt.toLowerCase().includes("encourag") ||
          prompt.toLowerCase().includes("patient")
      ).toBe(true);
    });

    it("mentions providing context or background", () => {
      const prompt = VIBE_PROMPTS.TRANSPLANT;

      // Should guide AI to provide extra information
      expect(
        prompt.toLowerCase().includes("context") ||
          prompt.toLowerCase().includes("background") ||
          prompt.toLowerCase().includes("explain") ||
          prompt.toLowerCase().includes("detail")
      ).toBe(true);
    });
  });

  /**
   * REGULAR Preset Tests
   *
   * The REGULAR persona is the balanced default.
   * Key characteristics:
   * - Clear and practical communication
   * - Assumes basic NYC familiarity
   * - Balanced tone - not too casual, not too formal
   * - Focuses on actionable information
   */
  describe("REGULAR preset", () => {
    it("contains characteristics for balanced communication", () => {
      const prompt = VIBE_PROMPTS.REGULAR;

      // Should reference balanced or practical approach
      expect(
        prompt.toLowerCase().includes("clear") ||
          prompt.toLowerCase().includes("practical") ||
          prompt.toLowerCase().includes("balanc") ||
          prompt.toLowerCase().includes("efficient")
      ).toBe(true);
    });

    it("focuses on actionable information", () => {
      const prompt = VIBE_PROMPTS.REGULAR;

      // Should emphasize actionable or useful info
      expect(
        prompt.toLowerCase().includes("action") ||
          prompt.toLowerCase().includes("useful") ||
          prompt.toLowerCase().includes("essential") ||
          prompt.toLowerCase().includes("point")
      ).toBe(true);
    });
  });

  /**
   * LOCAL Preset Tests
   *
   * The LOCAL persona channels authentic NYC directness.
   * Key characteristics:
   * - Brief, no-nonsense communication
   * - Uses NYC slang and abbreviations naturally
   * - Assumes deep familiarity with the city
   * - May include insider tips and shortcuts
   */
  describe("LOCAL preset", () => {
    it("contains characteristics for brief, direct communication", () => {
      const prompt = VIBE_PROMPTS.LOCAL;

      // Should reference brevity or directness
      expect(
        prompt.toLowerCase().includes("brief") ||
          prompt.toLowerCase().includes("terse") ||
          prompt.toLowerCase().includes("short") ||
          prompt.toLowerCase().includes("concise") ||
          prompt.toLowerCase().includes("no-nonsense")
      ).toBe(true);
    });

    it("assumes familiarity with NYC", () => {
      const prompt = VIBE_PROMPTS.LOCAL;

      // Should indicate deep city knowledge assumption
      expect(
        prompt.toLowerCase().includes("familiar") ||
          prompt.toLowerCase().includes("know") ||
          prompt.toLowerCase().includes("assume") ||
          prompt.toLowerCase().includes("local")
      ).toBe(true);
    });

    it("may include NYC-specific language guidance", () => {
      const prompt = VIBE_PROMPTS.LOCAL;

      // Should reference slang or abbreviations or insider knowledge
      expect(
        prompt.toLowerCase().includes("slang") ||
          prompt.toLowerCase().includes("abbreviat") ||
          prompt.toLowerCase().includes("insider") ||
          prompt.toLowerCase().includes("shortcut") ||
          prompt.toLowerCase().includes("new york")
      ).toBe(true);
    });
  });
});

describe("VIBE_LABELS", () => {
  /**
   * Label Structure Tests
   *
   * Labels provide UI-facing metadata for the vibe selector.
   * Each label should have emoji, title, and description.
   */
  describe("label definitions", () => {
    it("defines labels for all three presets", () => {
      expect(VIBE_LABELS).toHaveProperty("TRANSPLANT");
      expect(VIBE_LABELS).toHaveProperty("REGULAR");
      expect(VIBE_LABELS).toHaveProperty("LOCAL");
    });

    it("each label has emoji, title, and description", () => {
      const presets: VibePreset[] = ["TRANSPLANT", "REGULAR", "LOCAL"];

      for (const preset of presets) {
        const label = VIBE_LABELS[preset];
        expect(label).toHaveProperty("emoji");
        expect(label).toHaveProperty("title");
        expect(label).toHaveProperty("description");

        expect(typeof label.emoji).toBe("string");
        expect(typeof label.title).toBe("string");
        expect(typeof label.description).toBe("string");

        expect(label.emoji.length).toBeGreaterThan(0);
        expect(label.title.length).toBeGreaterThan(0);
        expect(label.description.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("getVibePrompt", () => {
  /**
   * Helper Function Tests
   *
   * The getVibePrompt function provides a safe accessor with fallback.
   */
  describe("valid presets", () => {
    it("returns TRANSPLANT prompt for TRANSPLANT preset", () => {
      expect(getVibePrompt("TRANSPLANT")).toBe(VIBE_PROMPTS.TRANSPLANT);
    });

    it("returns REGULAR prompt for REGULAR preset", () => {
      expect(getVibePrompt("REGULAR")).toBe(VIBE_PROMPTS.REGULAR);
    });

    it("returns LOCAL prompt for LOCAL preset", () => {
      expect(getVibePrompt("LOCAL")).toBe(VIBE_PROMPTS.LOCAL);
    });
  });

  describe("fallback behavior", () => {
    it("returns REGULAR prompt for unknown preset values", () => {
      // Type assertion to test runtime behavior with invalid input
      const result = getVibePrompt("UNKNOWN" as VibePreset);
      expect(result).toBe(VIBE_PROMPTS.REGULAR);
    });

    it("returns REGULAR prompt for empty string", () => {
      const result = getVibePrompt("" as VibePreset);
      expect(result).toBe(VIBE_PROMPTS.REGULAR);
    });

    it("returns REGULAR prompt for null-ish values", () => {
      // @ts-expect-error Testing runtime behavior with null
      const resultNull = getVibePrompt(null);
      expect(resultNull).toBe(VIBE_PROMPTS.REGULAR);

      // @ts-expect-error Testing runtime behavior with undefined
      const resultUndefined = getVibePrompt(undefined);
      expect(resultUndefined).toBe(VIBE_PROMPTS.REGULAR);
    });
  });

  describe("case sensitivity", () => {
    it("handles uppercase presets correctly", () => {
      expect(getVibePrompt("TRANSPLANT")).toBe(VIBE_PROMPTS.TRANSPLANT);
      expect(getVibePrompt("REGULAR")).toBe(VIBE_PROMPTS.REGULAR);
      expect(getVibePrompt("LOCAL")).toBe(VIBE_PROMPTS.LOCAL);
    });

    it("falls back to REGULAR for lowercase variants", () => {
      // Prisma enum values are uppercase; lowercase should fallback
      const resultLower = getVibePrompt("transplant" as VibePreset);
      expect(resultLower).toBe(VIBE_PROMPTS.REGULAR);
    });
  });
});

describe("prompt suitability for Claude Haiku", () => {
  /**
   * AI Model Compatibility Tests
   *
   * Prompts should be designed for Claude Haiku's capabilities:
   * - Reasonable length (not excessively long)
   * - Clear instructions
   * - Actionable guidance
   */
  it("prompts are reasonable length for system prompts", () => {
    const maxLength = 2000; // Reasonable max for system prompt

    expect(VIBE_PROMPTS.TRANSPLANT.length).toBeLessThan(maxLength);
    expect(VIBE_PROMPTS.REGULAR.length).toBeLessThan(maxLength);
    expect(VIBE_PROMPTS.LOCAL.length).toBeLessThan(maxLength);
  });

  it("prompts establish clear persona or tone", () => {
    // All prompts should have persona-establishing language
    const allPrompts = [
      VIBE_PROMPTS.TRANSPLANT,
      VIBE_PROMPTS.REGULAR,
      VIBE_PROMPTS.LOCAL,
    ];

    for (const prompt of allPrompts) {
      // Should contain persona-related terms
      const hasPersonaGuidance =
        prompt.toLowerCase().includes("you") ||
        prompt.toLowerCase().includes("tone") ||
        prompt.toLowerCase().includes("style") ||
        prompt.toLowerCase().includes("like");

      expect(hasPersonaGuidance).toBe(true);
    }
  });
});
