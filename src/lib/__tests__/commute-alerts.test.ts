/**
 * Commute Alert Generator Tests
 *
 * Tests for the personalized commute alert generation system that combines:
 * - ZIP-to-station mapping (user location)
 * - MTA service alerts (disruption data)
 * - Fallback route suggestions (alternative routing)
 * - AI-generated copy (natural language messaging)
 *
 * Test Philosophy:
 * Following TDD methodology, these tests define the expected behavior of the
 * commute alert system before implementation. The tests cover:
 * 1. Alert generation when user's lines are affected
 * 2. Null returns when disruptions don't affect user
 * 3. Fallback suggestion inclusion
 * 4. AI copy generation (with mocked API calls)
 *
 * The CommuteAlert interface should include:
 * - affectedLines: string[] - Lines with active alerts affecting user
 * - fallbacks: FallbackSuggestion[] - Alternative route suggestions
 * - aiCopy: string - AI-generated personalized message
 */

import {
  generateCommuteAlert,
  generateCommuteAlertWithAi,
  CommuteAlert,
  MtaAlertInput,
} from "../commute-alerts";

// Mock the fetch function for AI API calls
const originalFetch = global.fetch;

describe("commute-alerts", () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe("generateCommuteAlert", () => {
    describe("when user's lines are affected", () => {
      it("generates alert for L train disruption affecting Williamsburg user", () => {
        const activeAlerts: MtaAlertInput[] = [
          {
            id: "alert-l-1",
            routes: ["L"],
            headerText: "L train running with delays due to signal problems",
            isPlannedWork: false,
          },
        ];

        // 11211 = Williamsburg, has L train access via Bedford Av and Lorimer St
        const result = generateCommuteAlert("11211", activeAlerts);

        expect(result).not.toBeNull();
        expect(result?.affectedLines).toContain("L");
        expect(result?.fallbacks.length).toBeGreaterThan(0);
        // Should suggest G train as primary alternative
        const gSuggestion = result?.fallbacks.find((f) =>
          f.alternatives.includes("G")
        );
        expect(gSuggestion).toBeDefined();
      });

      it("generates alert for multiple line disruptions", () => {
        const activeAlerts: MtaAlertInput[] = [
          {
            id: "alert-l-1",
            routes: ["L"],
            headerText: "L train delays",
            isPlannedWork: false,
          },
          {
            id: "alert-g-1",
            routes: ["G"],
            headerText: "G train running with delays",
            isPlannedWork: false,
          },
        ];

        // 11211 = Williamsburg, has L and G access (via Lorimer St)
        const result = generateCommuteAlert("11211", activeAlerts);

        expect(result).not.toBeNull();
        expect(result?.affectedLines).toContain("L");
        expect(result?.affectedLines).toContain("G");
      });

      it("generates alert for Downtown Brooklyn user with multiple lines", () => {
        const activeAlerts: MtaAlertInput[] = [
          {
            id: "alert-2-1",
            routes: ["2", "3"],
            headerText: "2 and 3 trains running with delays",
            isPlannedWork: false,
          },
        ];

        // 11201 = Downtown Brooklyn, has 2/3/4/5 at Borough Hall
        const result = generateCommuteAlert("11201", activeAlerts);

        expect(result).not.toBeNull();
        expect(result?.affectedLines).toContain("2");
        expect(result?.affectedLines).toContain("3");
      });
    });

    describe("when user's lines are NOT affected", () => {
      it("returns null when alert affects different lines", () => {
        const activeAlerts: MtaAlertInput[] = [
          {
            id: "alert-7-1",
            routes: ["7"],
            headerText: "7 train delays",
            isPlannedWork: false,
          },
        ];

        // 11211 = Williamsburg, has L/G/J/M/Z but NOT 7
        const result = generateCommuteAlert("11211", activeAlerts);

        expect(result).toBeNull();
      });

      it("returns null when no active alerts", () => {
        const result = generateCommuteAlert("11211", []);
        expect(result).toBeNull();
      });

      it("returns null for unknown ZIP code", () => {
        const activeAlerts: MtaAlertInput[] = [
          {
            id: "alert-l-1",
            routes: ["L"],
            headerText: "L train delays",
            isPlannedWork: false,
          },
        ];

        const result = generateCommuteAlert("99999", activeAlerts);
        expect(result).toBeNull();
      });
    });

    describe("fallback suggestions", () => {
      it("includes appropriate fallback routes for L train", () => {
        const activeAlerts: MtaAlertInput[] = [
          {
            id: "alert-l-1",
            routes: ["L"],
            headerText: "L train suspended between Bedford Ave and Lorimer St",
            isPlannedWork: true,
          },
        ];

        const result = generateCommuteAlert("11211", activeAlerts);

        expect(result).not.toBeNull();
        // L train alternatives should include G, J, M, Z
        const lFallback = result?.fallbacks.find((f) => f.affectedLine === "L");
        expect(lFallback).toBeDefined();
        expect(lFallback?.alternatives).toContain("G");
        expect(lFallback?.suggestedAction).toBeTruthy();
      });

      it("includes fallback routes for multi-line disruption", () => {
        // Use Jackson Heights (11372) which has E, F, M, R, 7
        // Alert affects E and M - both present at this station
        const activeAlerts: MtaAlertInput[] = [
          {
            id: "alert-em-1",
            routes: ["E", "M"],
            headerText: "E and M trains experiencing delays",
            isPlannedWork: false,
          },
        ];

        const result = generateCommuteAlert("11372", activeAlerts);

        expect(result).not.toBeNull();
        expect(result?.affectedLines).toContain("E");
        expect(result?.affectedLines).toContain("M");
        expect(result?.fallbacks.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe("alert context", () => {
      it("includes original alert information in result", () => {
        const activeAlerts: MtaAlertInput[] = [
          {
            id: "alert-l-123",
            routes: ["L"],
            headerText: "L train running with delays due to a sick passenger",
            isPlannedWork: false,
          },
        ];

        const result = generateCommuteAlert("11211", activeAlerts);

        expect(result).not.toBeNull();
        expect(result?.alerts).toBeDefined();
        expect(result?.alerts.length).toBe(1);
        expect(result?.alerts[0].headerText).toContain("sick passenger");
      });

      it("includes neighborhood context", () => {
        const activeAlerts: MtaAlertInput[] = [
          {
            id: "alert-l-1",
            routes: ["L"],
            headerText: "L train delays",
            isPlannedWork: false,
          },
        ];

        const result = generateCommuteAlert("11211", activeAlerts);

        expect(result).not.toBeNull();
        expect(result?.neighborhood).toBe("Williamsburg");
        expect(result?.primaryStation).toContain("Bedford");
      });

      it("distinguishes planned work from service changes", () => {
        const activeAlerts: MtaAlertInput[] = [
          {
            id: "alert-l-planned",
            routes: ["L"],
            headerText: "Weekend planned work",
            isPlannedWork: true,
          },
        ];

        const result = generateCommuteAlert("11211", activeAlerts);

        expect(result).not.toBeNull();
        expect(result?.hasPlannedWork).toBe(true);
      });
    });
  });

  describe("generateCommuteAlertWithAi", () => {
    beforeEach(() => {
      // Mock successful AI API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "text",
              text:
                "Heads up! The L is running with delays this morning. " +
                "Your quickest option from Williamsburg is the G to Court Square, " +
                "then the 7 into Manhattan. Allow an extra 15 minutes.",
            },
          ],
        }),
      });
    });

    it("generates AI copy for affected user", async () => {
      const activeAlerts: MtaAlertInput[] = [
        {
          id: "alert-l-1",
          routes: ["L"],
          headerText: "L train running with delays",
          isPlannedWork: false,
        },
      ];

      const result = await generateCommuteAlertWithAi("11211", activeAlerts);

      expect(result).not.toBeNull();
      expect(result?.aiCopy).toBeTruthy();
      expect(result?.aiCopy.length).toBeGreaterThan(20);
    });

    it("AI copy mentions affected line", async () => {
      const activeAlerts: MtaAlertInput[] = [
        {
          id: "alert-l-1",
          routes: ["L"],
          headerText: "L train running with delays",
          isPlannedWork: false,
        },
      ];

      const result = await generateCommuteAlertWithAi("11211", activeAlerts);

      expect(result?.aiCopy.toLowerCase()).toContain("l");
    });

    it("falls back to template when AI fails", async () => {
      // Mock AI failure
      global.fetch = jest.fn().mockRejectedValue(new Error("API error"));

      const activeAlerts: MtaAlertInput[] = [
        {
          id: "alert-l-1",
          routes: ["L"],
          headerText: "L train delays",
          isPlannedWork: false,
        },
      ];

      const result = await generateCommuteAlertWithAi("11211", activeAlerts);

      // Should still return a result with fallback copy
      expect(result).not.toBeNull();
      expect(result?.aiCopy).toBeTruthy();
    });

    it("returns null when user not affected", async () => {
      const activeAlerts: MtaAlertInput[] = [
        {
          id: "alert-7-1",
          routes: ["7"],
          headerText: "7 train delays",
          isPlannedWork: false,
        },
      ];

      // 11211 doesn't have 7 train
      const result = await generateCommuteAlertWithAi("11211", activeAlerts);

      expect(result).toBeNull();
      // AI should not have been called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("includes walk time context in AI prompt", async () => {
      const activeAlerts: MtaAlertInput[] = [
        {
          id: "alert-l-1",
          routes: ["L"],
          headerText: "L train suspended",
          isPlannedWork: true,
        },
      ];

      await generateCommuteAlertWithAi("11211", activeAlerts);

      // Verify fetch was called with appropriate prompt context
      expect(global.fetch).toHaveBeenCalled();
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const promptText = requestBody.messages[0].content;

      // Prompt should include context about alternatives
      expect(promptText.toLowerCase()).toContain("alternative");
    });
  });

  describe("edge cases", () => {
    it("handles alerts with multiple routes affecting same user", () => {
      const activeAlerts: MtaAlertInput[] = [
        {
          id: "alert-multiple-1",
          routes: ["2", "3", "4", "5"],
          headerText: "All Lexington Ave express trains delayed",
          isPlannedWork: false,
        },
      ];

      // 11217 = Boerum Hill, has 2/3/4/5/B/D/N/Q/R at Atlantic Ave-Barclays Ctr
      const result = generateCommuteAlert("11217", activeAlerts);

      expect(result).not.toBeNull();
      expect(result?.affectedLines.length).toBeGreaterThanOrEqual(2);
    });

    it("deduplicates affected lines from multiple alerts", () => {
      const activeAlerts: MtaAlertInput[] = [
        {
          id: "alert-l-1",
          routes: ["L"],
          headerText: "L train delays - signal problems",
          isPlannedWork: false,
        },
        {
          id: "alert-l-2",
          routes: ["L"],
          headerText: "L train delays - track work",
          isPlannedWork: true,
        },
      ];

      const result = generateCommuteAlert("11211", activeAlerts);

      expect(result).not.toBeNull();
      // L should only appear once in affectedLines
      const lCount = result?.affectedLines.filter((l) => l === "L").length;
      expect(lCount).toBe(1);
    });

    it("handles empty routes in alert", () => {
      const activeAlerts: MtaAlertInput[] = [
        {
          id: "alert-empty",
          routes: [],
          headerText: "System-wide advisory",
          isPlannedWork: false,
        },
      ];

      const result = generateCommuteAlert("11211", activeAlerts);

      // Should not crash, should return null (no specific lines affected)
      expect(result).toBeNull();
    });
  });
});
