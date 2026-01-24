/**
 * Tests for Daily Pulse email job utility functions
 *
 * These tests verify the event filtering, scoring, and truncation logic
 * that ensures high-quality email content.
 */

// =============================================================================
// REPLICATED UTILITY FUNCTIONS FOR TESTING
// (In production, these could be extracted to a shared utils file)
// =============================================================================

const EXCLUDED_EVENT_PATTERNS = [
  /mobile.*unit/i,
  /outreach.*collective/i,
  /tabling/i,
  /health.*screening/i,
  /blood.*drive/i,
  /voter.*registration/i,
  /census/i,
  /flu.*shot/i,
  /vaccine.*clinic/i,
  /covid.*test/i,
];

const PRIORITY_MODULES = ["transit", "parking", "weather"];

function smartTruncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const cutPoint = lastSpace > maxLength * 0.6 ? lastSpace : maxLength;
  return text.slice(0, cutPoint).trim() + "…";
}

function shouldExcludeEvent(event: { title: string; body?: string | null }): boolean {
  const textToCheck = `${event.title} ${event.body || ""}`.toLowerCase();
  return EXCLUDED_EVENT_PATTERNS.some((pattern) => pattern.test(textToCheck));
}

function getWeatherEmoji(forecast: string): string {
  const f = forecast.toLowerCase();
  if (f.includes("snow") || f.includes("flurries")) return "❄️";
  if (f.includes("thunder") || f.includes("storm")) return "⛈️";
  if (f.includes("rain") || f.includes("shower")) return "🌧️";
  if (f.includes("cloud") && f.includes("sun")) return "⛅";
  if (f.includes("cloud") || f.includes("overcast")) return "☁️";
  if (f.includes("fog") || f.includes("mist")) return "🌫️";
  if (f.includes("wind")) return "💨";
  if (f.includes("clear") || f.includes("sunny")) return "☀️";
  return "🌤️";
}

function scoreEvent(event: {
  title: string;
  source: { moduleId: string };
  hypeScore?: number | null;
  weatherScore?: number | null;
}): number {
  let score = 50;
  if (PRIORITY_MODULES.includes(event.source.moduleId)) {
    score += 30;
  }
  if (event.hypeScore) {
    score += event.hypeScore * 0.3;
  }
  if (event.weatherScore !== null && event.weatherScore !== undefined) {
    score += event.weatherScore * 10;
  }
  const urgentPatterns = [/delay/i, /suspend/i, /close/i, /cancel/i, /alert/i, /deadline/i];
  if (urgentPatterns.some((p) => p.test(event.title))) {
    score += 20;
  }
  return score;
}

// =============================================================================
// TESTS
// =============================================================================

describe("Daily Pulse Utility Functions", () => {
  describe("smartTruncate", () => {
    it("should return original text if under max length", () => {
      const text = "Short text";
      expect(smartTruncate(text, 50)).toBe("Short text");
    });

    it("should truncate at word boundary", () => {
      const text = "Grand Army Plaza Safety Zone West";
      const result = smartTruncate(text, 25);
      expect(result).toBe("Grand Army Plaza Safety…");
      expect(result).not.toContain("Zone");
    });

    it("should not cut words mid-way", () => {
      const text = "Patterson Playground: Patterson Playground Bronx";
      const result = smartTruncate(text, 30);
      // Should cut at a space, not mid-word
      expect(result.endsWith("…")).toBe(true);
      expect(result).not.toMatch(/[a-z]…$/); // Should not end with partial word
    });

    it("should handle empty strings", () => {
      expect(smartTruncate("", 50)).toBe("");
    });

    it("should handle text with no spaces", () => {
      const text = "SuperLongWordWithNoSpaces";
      const result = smartTruncate(text, 10);
      expect(result.length).toBeLessThanOrEqual(11); // 10 + ellipsis
    });
  });

  describe("shouldExcludeEvent", () => {
    it("should exclude mobile health unit events", () => {
      expect(
        shouldExcludeEvent({
          title: "Sexual Health Mobile Medical Unit Event",
          body: "Prospect Park",
        })
      ).toBe(true);
    });

    it("should exclude outreach collective events", () => {
      expect(
        shouldExcludeEvent({
          title: "Bronx Outreach Collective tabling",
          body: "Patterson Playground",
        })
      ).toBe(true);
    });

    it("should exclude blood drives", () => {
      expect(
        shouldExcludeEvent({
          title: "Community Blood Drive",
          body: "Local church",
        })
      ).toBe(true);
    });

    it("should exclude vaccine clinics", () => {
      expect(
        shouldExcludeEvent({
          title: "Free Flu Shot Clinic",
          body: null,
        })
      ).toBe(true);
    });

    it("should NOT exclude regular events", () => {
      expect(
        shouldExcludeEvent({
          title: "Jazz Concert at Lincoln Center",
          body: "Evening performance",
        })
      ).toBe(false);
    });

    it("should NOT exclude transit alerts", () => {
      expect(
        shouldExcludeEvent({
          title: "A/C Train Delays",
          body: "Signal problems at 14th St",
        })
      ).toBe(false);
    });

    it("should NOT exclude parking suspensions", () => {
      expect(
        shouldExcludeEvent({
          title: "ASP Suspended - MLK Day",
          body: "No alternate side parking",
        })
      ).toBe(false);
    });

    it("should NOT exclude sample sales", () => {
      expect(
        shouldExcludeEvent({
          title: "Gucci Sample Sale - 70% Off",
          body: "260 Fifth Avenue",
        })
      ).toBe(false);
    });
  });

  describe("getWeatherEmoji", () => {
    it("should return snow emoji for snow forecasts", () => {
      expect(getWeatherEmoji("Snow likely")).toBe("❄️");
      expect(getWeatherEmoji("Flurries expected")).toBe("❄️");
    });

    it("should return storm emoji for thunderstorms", () => {
      expect(getWeatherEmoji("Thunderstorms")).toBe("⛈️");
      expect(getWeatherEmoji("Severe storms possible")).toBe("⛈️");
    });

    it("should return rain emoji for rain", () => {
      expect(getWeatherEmoji("Showers likely")).toBe("🌧️");
      expect(getWeatherEmoji("Rain")).toBe("🌧️");
    });

    it("should return partly cloudy for mixed conditions", () => {
      // NWS uses "Partly sunny" or "Clouds and sun" for mixed conditions
      expect(getWeatherEmoji("Partly sunny and cloudy")).toBe("⛅");
      expect(getWeatherEmoji("Clouds and sun")).toBe("⛅");
    });

    it("should return cloudy for overcast", () => {
      expect(getWeatherEmoji("Mostly cloudy")).toBe("☁️");
      expect(getWeatherEmoji("Overcast")).toBe("☁️");
    });

    it("should return sun emoji for clear days", () => {
      expect(getWeatherEmoji("Sunny")).toBe("☀️");
      expect(getWeatherEmoji("Clear skies")).toBe("☀️");
    });

    it("should return default emoji for unknown conditions", () => {
      expect(getWeatherEmoji("Some weather")).toBe("🌤️");
    });
  });

  describe("scoreEvent", () => {
    it("should give base score of 50", () => {
      const event = {
        title: "Regular Event",
        source: { moduleId: "events" },
      };
      expect(scoreEvent(event)).toBe(50);
    });

    it("should add 30 points for transit module", () => {
      const event = {
        title: "Train Status",
        source: { moduleId: "transit" },
      };
      expect(scoreEvent(event)).toBe(80);
    });

    it("should add 30 points for parking module", () => {
      const event = {
        title: "Parking Update",
        source: { moduleId: "parking" },
      };
      expect(scoreEvent(event)).toBe(80);
    });

    it("should add bonus for hype score", () => {
      const event = {
        title: "Sample Sale",
        source: { moduleId: "deals" },
        hypeScore: 80,
      };
      // 50 base + (80 * 0.3) = 74
      expect(scoreEvent(event)).toBe(74);
    });

    it("should add 20 points for urgent keywords", () => {
      const event = {
        title: "Service Delay on A Line",
        source: { moduleId: "transit" },
      };
      // 50 base + 30 transit + 20 urgent = 100
      expect(scoreEvent(event)).toBe(100);
    });

    it("should recognize suspension as urgent", () => {
      const event = {
        title: "ASP Suspended",
        source: { moduleId: "parking" },
      };
      // 50 base + 30 parking + 20 urgent = 100
      expect(scoreEvent(event)).toBe(100);
    });

    it("should recognize deadline as urgent", () => {
      const event = {
        title: "Housing Lottery Deadline Today",
        source: { moduleId: "housing" },
      };
      // 50 base + 20 urgent = 70
      expect(scoreEvent(event)).toBe(70);
    });

    it("should combine all bonuses correctly", () => {
      const event = {
        title: "Transit Alert - Delays",
        source: { moduleId: "transit" },
        hypeScore: 50,
        weatherScore: 0.8,
      };
      // 50 base + 30 transit + (50 * 0.3) hype + (0.8 * 10) weather + 20 urgent
      // = 50 + 30 + 15 + 8 + 20 = 123
      expect(scoreEvent(event)).toBe(123);
    });
  });
});

describe("Event Filtering Integration", () => {
  it("should filter out low-value events from a mixed list", () => {
    const events = [
      { title: "Sexual Health Mobile Medical Unit Event", body: "Prospect Park" },
      { title: "A Train Delays - Signal Problems", body: "14th St" },
      { title: "Bronx Outreach Collective tabling", body: "Patterson Playground" },
      { title: "Gucci Sample Sale", body: "260 Fifth Ave" },
      { title: "Free Flu Shot Clinic", body: "Local pharmacy" },
      { title: "ASP Suspended - Snow Emergency", body: null },
    ];

    const filtered = events.filter((e) => !shouldExcludeEvent(e));

    expect(filtered).toHaveLength(3);
    expect(filtered.map((e) => e.title)).toEqual([
      "A Train Delays - Signal Problems",
      "Gucci Sample Sale",
      "ASP Suspended - Snow Emergency",
    ]);
  });

  it("should sort events by relevance score", () => {
    const events = [
      { title: "Regular Concert", source: { moduleId: "events" } },
      { title: "Transit Delay", source: { moduleId: "transit" } },
      { title: "Sample Sale", source: { moduleId: "deals" }, hypeScore: 90 },
      { title: "ASP Suspended", source: { moduleId: "parking" } },
    ];

    const scored = events
      .map((e) => ({ ...e, score: scoreEvent(e) }))
      .sort((a, b) => b.score - a.score);

    // Transit Delay: 80 + 20 urgent = 100
    // ASP Suspended: 80 + 20 urgent = 100
    // Sample Sale: 50 + 27 hype = 77
    // Regular Concert: 50
    expect(scored[0].title).toBe("Transit Delay");
    expect(scored[scored.length - 1].title).toBe("Regular Concert");
  });
});
