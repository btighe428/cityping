// src/lib/__tests__/fallback-routes.test.ts
/**
 * Test suite for NYC Subway Fallback Routes Module
 *
 * This module validates the static mapping of alternative subway routes for
 * common service disruptions across the NYC transit system.
 *
 * Historical Context:
 * The NYC Subway's complexity necessitates fallback routing knowledge. When the
 * L train underwent the "L-tramageddon" shutdown threat in 2019 (later cancelled),
 * it highlighted the critical need for alternative route suggestions. The system's
 * three historical networks (IRT, BMT, IND) create natural redundancies:
 * - IRT: Numbered lines (1-7) with limited cross-system transfers
 * - BMT: Lettered lines (J, M, N, Q, R, W, Z) primarily serving Brooklyn/Queens
 * - IND: Lettered lines (A-G) designed as express alternatives to older routes
 *
 * The fallback mappings reflect these historical relationships and modern
 * transfer points established during the 1940 unification.
 *
 * Architectural Notes:
 * The FallbackInfo interface encapsulates both raw alternatives (for programmatic
 * use) and human-readable suggested actions (for user-facing notifications).
 * This dual representation supports both automated rerouting logic and
 * personalized alert messaging.
 */

import {
  FALLBACK_ROUTES,
  getFallbackRoutes,
  getAlternativeLines,
  type FallbackInfo,
  type FallbackSuggestion,
} from "../fallback-routes";

describe("fallback-routes", () => {
  /**
   * FALLBACK_ROUTES Static Mapping Tests
   *
   * Validates the structure and content of the static fallback route mappings.
   * Each major subway line should have documented alternatives based on:
   * - Geographic parallelism (e.g., 7th Ave vs 8th Ave trunk lines)
   * - Transfer hub connectivity (e.g., Times Square, Atlantic Ave)
   * - Historical system design (IRT/BMT/IND redundancies)
   */
  describe("FALLBACK_ROUTES constant", () => {
    it("contains fallback info for L train", () => {
      expect(FALLBACK_ROUTES["L"]).toBeDefined();
      expect(FALLBACK_ROUTES["L"].alternatives).toContain("G");
      expect(FALLBACK_ROUTES["L"].suggestedAction).toBeTruthy();
    });

    it("contains fallback info for major lettered lines (A/C)", () => {
      expect(FALLBACK_ROUTES["A"]).toBeDefined();
      expect(FALLBACK_ROUTES["C"]).toBeDefined();
      expect(FALLBACK_ROUTES["A"].alternatives.length).toBeGreaterThan(0);
    });

    it("contains fallback info for numbered lines (1/2/3)", () => {
      expect(FALLBACK_ROUTES["1"]).toBeDefined();
      expect(FALLBACK_ROUTES["2"]).toBeDefined();
      expect(FALLBACK_ROUTES["3"]).toBeDefined();
    });

    it("contains fallback info for Lexington Ave lines (4/5/6)", () => {
      expect(FALLBACK_ROUTES["4"]).toBeDefined();
      expect(FALLBACK_ROUTES["5"]).toBeDefined();
      expect(FALLBACK_ROUTES["6"]).toBeDefined();
    });

    it("contains fallback info for Broadway lines (N/Q/R/W)", () => {
      expect(FALLBACK_ROUTES["N"]).toBeDefined();
      expect(FALLBACK_ROUTES["Q"]).toBeDefined();
      expect(FALLBACK_ROUTES["R"]).toBeDefined();
      expect(FALLBACK_ROUTES["W"]).toBeDefined();
    });

    it("contains fallback info for 7 train", () => {
      expect(FALLBACK_ROUTES["7"]).toBeDefined();
      expect(FALLBACK_ROUTES["7"].alternatives.length).toBeGreaterThan(0);
    });
  });

  /**
   * getAlternativeLines Function Tests
   *
   * Tests the core utility function that retrieves alternative lines for a
   * given affected line. This function powers quick lookups during real-time
   * alert processing.
   */
  describe("getAlternativeLines", () => {
    it("returns G, J, M, Z alternatives for L train", () => {
      const alternatives = getAlternativeLines("L");
      expect(alternatives).toContain("G");
      // L train alternatives should include J/M/Z for Williamsburg Bridge access
      expect(alternatives.some((line) => ["J", "M", "Z"].includes(line))).toBe(
        true
      );
    });

    it("returns alternatives for numbered lines (1/2/3)", () => {
      const alternatives = getAlternativeLines("1");
      expect(alternatives.length).toBeGreaterThan(0);
      // 1/2/3 (7th Ave) alternatives should include 8th Ave lines (A/C/E)
      expect(
        alternatives.some((line) => ["A", "C", "E"].includes(line))
      ).toBe(true);
    });

    it("returns alternatives for Lexington Ave lines (4/5/6)", () => {
      const alternatives = getAlternativeLines("4");
      expect(alternatives.length).toBeGreaterThan(0);
    });

    it("returns B/D options for N/Q/R/W lines", () => {
      const alternativesN = getAlternativeLines("N");
      const alternativesR = getAlternativeLines("R");

      // Broadway lines should have 6th Ave alternatives
      expect(
        alternativesN.some((line) => ["B", "D"].includes(line))
      ).toBe(true);
      expect(alternativesR.length).toBeGreaterThan(0);
    });

    it("returns crosstown alternatives for 7 train", () => {
      const alternatives = getAlternativeLines("7");
      expect(alternatives.length).toBeGreaterThan(0);
      // 7 train alternatives should include E/F for Roosevelt Ave access
      expect(
        alternatives.some((line) => ["E", "F"].includes(line))
      ).toBe(true);
    });

    it("returns empty array for unknown line", () => {
      const alternatives = getAlternativeLines("XYZ");
      expect(alternatives).toEqual([]);
    });

    it("handles lowercase input", () => {
      const alternatives = getAlternativeLines("l");
      expect(alternatives).toContain("G");
    });

    it("handles mixed case input", () => {
      const alternatives = getAlternativeLines("n");
      expect(alternatives.length).toBeGreaterThan(0);
    });
  });

  /**
   * getFallbackRoutes Function Tests
   *
   * Tests the higher-level function that accepts an array of affected lines
   * and returns enriched FallbackSuggestion objects with user-facing text.
   * This function is designed for integration with the commute alert system.
   */
  describe("getFallbackRoutes", () => {
    it("returns fallback suggestions for a single affected line", () => {
      const suggestions = getFallbackRoutes(["L"]);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].affectedLine).toBe("L");
      expect(suggestions[0].alternatives.length).toBeGreaterThan(0);
      expect(suggestions[0].suggestedAction).toBeTruthy();
      expect(typeof suggestions[0].suggestedAction).toBe("string");
    });

    it("returns combined results for multiple affected lines", () => {
      const suggestions = getFallbackRoutes(["L", "G"]);

      expect(suggestions).toHaveLength(2);

      const lSuggestion = suggestions.find((s) => s.affectedLine === "L");
      const gSuggestion = suggestions.find((s) => s.affectedLine === "G");

      expect(lSuggestion).toBeDefined();
      expect(gSuggestion).toBeDefined();
      expect(lSuggestion!.alternatives.length).toBeGreaterThan(0);
      expect(gSuggestion!.alternatives.length).toBeGreaterThan(0);
    });

    it("returns empty results for unknown lines", () => {
      const suggestions = getFallbackRoutes(["XYZ", "ABC"]);

      expect(suggestions).toHaveLength(0);
    });

    it("filters out unknown lines from mixed input", () => {
      const suggestions = getFallbackRoutes(["L", "XYZ", "G"]);

      // Should only return suggestions for known lines
      expect(suggestions).toHaveLength(2);
      expect(suggestions.every((s) => ["L", "G"].includes(s.affectedLine))).toBe(
        true
      );
    });

    it("returns empty array for empty input", () => {
      const suggestions = getFallbackRoutes([]);
      expect(suggestions).toEqual([]);
    });

    it("handles case-insensitive line input", () => {
      const suggestions = getFallbackRoutes(["l", "g"]);

      expect(suggestions).toHaveLength(2);
      // Results should be normalized to uppercase
      expect(suggestions[0].affectedLine).toBe("L");
      expect(suggestions[1].affectedLine).toBe("G");
    });

    it("includes actionable suggested text for L train", () => {
      const suggestions = getFallbackRoutes(["L"]);

      expect(suggestions[0].suggestedAction).toMatch(/G|Court Square|J|M|Z/i);
    });

    it("includes actionable suggested text for A/C lines", () => {
      const acSuggestions = getFallbackRoutes(["A", "C"]);

      acSuggestions.forEach((suggestion) => {
        expect(suggestion.suggestedAction.length).toBeGreaterThan(10);
      });
    });

    it("deduplicates repeated lines in input", () => {
      const suggestions = getFallbackRoutes(["L", "L", "L"]);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].affectedLine).toBe("L");
    });
  });

  /**
   * Integration Tests
   *
   * Validates the complete fallback route workflow from affected line
   * identification to user-facing suggestion generation.
   */
  describe("integration scenarios", () => {
    it("provides complete fallback info for Williamsburg commuter (L train)", () => {
      // Scenario: User lives in Williamsburg (11211), L train is delayed
      const suggestions = getFallbackRoutes(["L"]);

      expect(suggestions).toHaveLength(1);
      const lFallback = suggestions[0];

      // Should suggest G train (parallel service through Brooklyn)
      expect(lFallback.alternatives).toContain("G");

      // Should mention transfer strategy in suggested action
      expect(lFallback.suggestedAction).toBeTruthy();
    });

    it("handles major service disruption (multiple lines)", () => {
      // Scenario: Signal problems affecting 8th Ave trunk (A/C/E)
      const suggestions = getFallbackRoutes(["A", "C", "E"]);

      expect(suggestions.length).toBe(3);

      // Each should have alternatives
      suggestions.forEach((suggestion) => {
        expect(suggestion.alternatives.length).toBeGreaterThan(0);
        expect(suggestion.suggestedAction).toBeTruthy();
      });
    });

    it("handles crosstown alternatives for Upper East Side (4/5/6)", () => {
      // Scenario: Lexington Ave service disrupted
      const suggestions = getFallbackRoutes(["4", "5", "6"]);

      expect(suggestions.length).toBe(3);

      // Should suggest crosstown options (7 train at Grand Central)
      const has7trainAlternative = suggestions.some((s) =>
        s.alternatives.includes("7")
      );
      expect(has7trainAlternative).toBe(true);
    });
  });
});
