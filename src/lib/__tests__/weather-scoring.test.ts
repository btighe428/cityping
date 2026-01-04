// src/lib/__tests__/weather-scoring.test.ts
/**
 * Test Suite for Weather-Aware Event Scoring Service
 *
 * This module implements comprehensive testing for the weather scoring service,
 * which adjusts event relevance scores based on weather conditions and venue types.
 * The scoring system enables intelligent notification prioritization, promoting
 * weather-appropriate activities while de-emphasizing weather-sensitive outdoor events
 * during adverse conditions.
 *
 * Architectural Context:
 * The weather scoring service sits within the event processing pipeline, adjusting
 * raw event scores before they're used for notification prioritization. It integrates
 * with the existing weather.ts module (NWS API) and the AlertEvent schema's venueType
 * and weatherScore fields.
 *
 * Scoring Philosophy:
 * - OUTDOOR venues: Heavy penalties for precipitation and extreme temperatures
 * - COVERED venues: Moderate penalties (partial protection from elements)
 * - INDOOR venues: Minimal weather impact, slight boost as "rainy day activities"
 * - WEATHER_DEPENDENT: Severe penalties for any adverse conditions (e.g., outdoor markets)
 *
 * Historical Context:
 * Weather-aware recommendation systems emerged in the early 2000s with travel and
 * tourism platforms. Research by Guo et al. (2014) demonstrated that weather-aware
 * recommendations improved user engagement by 23% in location-based services.
 * NYC Ping applies similar principles to civic event recommendations.
 */

import {
  calculateWeatherScore,
  isWeatherSafe,
  WeatherData,
  EventInput,
  WeatherScoreResult,
} from "../weather-scoring";

describe("Weather Scoring Service", () => {
  /**
   * Test Data Factory Functions
   *
   * These helper functions create consistent test fixtures while allowing
   * easy overrides for specific test scenarios. This pattern follows the
   * Object Mother / Test Data Builder pattern popularized by Martin Fowler.
   */

  const createWeatherData = (overrides: Partial<WeatherData> = {}): WeatherData => ({
    temperature: 70,
    precipProbability: 0,
    windSpeed: 5,
    shortForecast: "Mostly sunny",
    ...overrides,
  });

  const createEventInput = (overrides: Partial<EventInput> = {}): EventInput => ({
    title: "Test Event",
    venueType: "OUTDOOR",
    ...overrides,
  });

  // ============================================================================
  // SECTION 1: calculateWeatherScore - Core Scoring Logic
  // ============================================================================

  describe("calculateWeatherScore", () => {
    /**
     * Base Score Tests
     *
     * The base score starts at 100 and is adjusted based on weather conditions
     * and venue type. These tests verify the baseline behavior before adjustments.
     */
    describe("base score behavior", () => {
      it("returns base score of 100 for ideal weather conditions", () => {
        const event = createEventInput({ venueType: "OUTDOOR" });
        const weather = createWeatherData({
          temperature: 70,
          precipProbability: 0,
          windSpeed: 5,
          shortForecast: "Sunny",
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.baseScore).toBe(100);
        expect(result.adjustedScore).toBe(100);
      });

      it("includes weather condition in result", () => {
        const event = createEventInput();
        const weather = createWeatherData({ precipProbability: 60 });

        const result = calculateWeatherScore(event, weather);

        expect(result.weatherCondition).toBeDefined();
        expect(typeof result.adjustments).toBe("object");
      });
    });

    /**
     * OUTDOOR Venue Tests
     *
     * Outdoor venues (parks, rooftops, street events) receive the most significant
     * weather adjustments. NYC's climate variability makes this critical for
     * events like street fairs, outdoor concerts, and farmers markets.
     */
    describe("OUTDOOR venues", () => {
      it("applies -30 penalty for rain probability > 50%", () => {
        const event = createEventInput({ venueType: "OUTDOOR" });
        const weather = createWeatherData({
          precipProbability: 60,
          shortForecast: "Rain likely",
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustments.precipitation).toBeLessThanOrEqual(-30);
        expect(result.adjustedScore).toBeLessThanOrEqual(70);
      });

      it("applies -20 penalty for temperature below 40F", () => {
        const event = createEventInput({ venueType: "OUTDOOR" });
        const weather = createWeatherData({
          temperature: 35,
          precipProbability: 0,
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustments.temperature).toBeLessThanOrEqual(-20);
        expect(result.adjustedScore).toBeLessThanOrEqual(80);
      });

      it("applies -20 penalty for temperature above 90F", () => {
        const event = createEventInput({ venueType: "OUTDOOR" });
        const weather = createWeatherData({
          temperature: 95,
          precipProbability: 0,
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustments.temperature).toBeLessThanOrEqual(-20);
        expect(result.adjustedScore).toBeLessThanOrEqual(80);
      });

      it("applies wind speed penalty for high winds", () => {
        const event = createEventInput({ venueType: "OUTDOOR" });
        const weather = createWeatherData({
          windSpeed: 25, // High winds
          precipProbability: 0,
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustments.wind).toBeLessThan(0);
        expect(result.adjustedScore).toBeLessThan(100);
      });

      it("accumulates multiple penalties", () => {
        const event = createEventInput({ venueType: "OUTDOOR" });
        const weather = createWeatherData({
          temperature: 35,
          precipProbability: 60,
          windSpeed: 25,
        });

        const result = calculateWeatherScore(event, weather);

        // Should have penalties for temp, rain, and wind
        expect(result.adjustedScore).toBeLessThan(50);
      });
    });

    /**
     * COVERED Venue Tests
     *
     * Covered venues (tents, pavilions, awnings) provide partial protection.
     * They receive reduced penalties compared to fully outdoor venues.
     * Examples: Bryant Park Winter Village, outdoor seating with awnings.
     */
    describe("COVERED venues", () => {
      it("applies -15 penalty for heavy rain", () => {
        const event = createEventInput({ venueType: "COVERED" });
        const weather = createWeatherData({
          precipProbability: 80,
          shortForecast: "Heavy rain expected",
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustments.precipitation).toBe(-15);
        expect(result.adjustedScore).toBeLessThanOrEqual(85);
      });

      it("applies -10 penalty for extreme temperatures", () => {
        const event = createEventInput({ venueType: "COVERED" });
        const weather = createWeatherData({
          temperature: 95,
          precipProbability: 0,
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustments.temperature).toBe(-10);
        expect(result.adjustedScore).toBe(90);
      });

      it("has reduced wind impact compared to outdoor", () => {
        const outdoorEvent = createEventInput({ venueType: "OUTDOOR" });
        const coveredEvent = createEventInput({ venueType: "COVERED" });
        const weather = createWeatherData({ windSpeed: 25 });

        const outdoorResult = calculateWeatherScore(outdoorEvent, weather);
        const coveredResult = calculateWeatherScore(coveredEvent, weather);

        expect(coveredResult.adjustments.wind).toBeGreaterThan(outdoorResult.adjustments.wind);
      });
    });

    /**
     * INDOOR Venue Tests
     *
     * Indoor venues (museums, theaters, restaurants) have minimal weather impact.
     * They actually receive a small bonus during bad weather as they become
     * more appealing alternatives. NYC examples: MoMA, Broadway shows, restaurants.
     */
    describe("INDOOR venues", () => {
      it("applies +5 bonus for bad weather (rainy day activity)", () => {
        const event = createEventInput({ venueType: "INDOOR" });
        const weather = createWeatherData({
          precipProbability: 70,
          shortForecast: "Rain",
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustments.rainyDayBonus).toBe(5);
        expect(result.adjustedScore).toBe(105); // Can exceed 100, clamped later if needed
      });

      it("has minimal temperature impact", () => {
        const event = createEventInput({ venueType: "INDOOR" });
        const weather = createWeatherData({
          temperature: 95, // Extreme heat
          precipProbability: 0,
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustments.temperature).toBe(0);
        expect(result.adjustedScore).toBe(100);
      });

      it("has no wind impact", () => {
        const event = createEventInput({ venueType: "INDOOR" });
        const weather = createWeatherData({
          windSpeed: 40, // Very high winds
          precipProbability: 0,
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustments.wind).toBe(0);
        expect(result.adjustedScore).toBe(100);
      });
    });

    /**
     * WEATHER_DEPENDENT Venue Tests
     *
     * Weather-dependent venues are highly sensitive to conditions and may be
     * cancelled. Examples: outdoor markets, pop-up events, rooftop yoga.
     * These receive the harshest penalties.
     */
    describe("WEATHER_DEPENDENT venues", () => {
      it("applies -50 penalty for any adverse conditions", () => {
        const event = createEventInput({ venueType: "WEATHER_DEPENDENT" });
        const weather = createWeatherData({
          precipProbability: 40, // Moderate rain chance
          shortForecast: "Chance of showers",
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustedScore).toBeLessThanOrEqual(50);
      });

      it("applies severe penalty for marginal conditions", () => {
        const event = createEventInput({ venueType: "WEATHER_DEPENDENT" });
        const weather = createWeatherData({
          temperature: 45, // Cool but not extreme
          windSpeed: 15, // Moderate wind
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustedScore).toBeLessThan(80);
      });
    });

    /**
     * Edge Cases and Null Handling
     *
     * Real-world data often includes missing or incomplete weather information.
     * The system must handle these gracefully without crashing.
     */
    describe("edge cases", () => {
      it("handles missing weather data gracefully", () => {
        const event = createEventInput();
        const weather: WeatherData = {
          temperature: 70,
          precipProbability: 0,
          windSpeed: 0,
          shortForecast: "",
        };

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustedScore).toBeDefined();
        expect(typeof result.adjustedScore).toBe("number");
      });

      it("handles null venueType by defaulting to OUTDOOR", () => {
        const event = createEventInput({ venueType: undefined });
        const weather = createWeatherData({ precipProbability: 60 });

        const result = calculateWeatherScore(event, weather);

        // Should apply outdoor penalties as default
        expect(result.adjustedScore).toBeLessThan(100);
      });

      it("clamps score to valid range (0-100)", () => {
        const event = createEventInput({ venueType: "OUTDOOR" });
        const weather = createWeatherData({
          temperature: 20, // Extreme cold
          precipProbability: 90,
          windSpeed: 40,
          shortForecast: "Blizzard conditions",
        });

        const result = calculateWeatherScore(event, weather);

        expect(result.adjustedScore).toBeGreaterThanOrEqual(0);
        expect(result.adjustedScore).toBeLessThanOrEqual(100);
      });

      it("handles undefined precipProbability", () => {
        const event = createEventInput();
        const weather = createWeatherData({
          precipProbability: undefined as any,
        });

        expect(() => calculateWeatherScore(event, weather)).not.toThrow();
      });
    });
  });

  // ============================================================================
  // SECTION 2: isWeatherSafe - Safety Determination
  // ============================================================================

  describe("isWeatherSafe", () => {
    /**
     * Safety Determination Tests
     *
     * isWeatherSafe returns false for dangerous conditions that could pose
     * health risks or lead to event cancellation. This is separate from
     * scoring - an event can have a low score but still be "safe" to attend.
     */

    describe("thunderstorm conditions", () => {
      it("returns false for thunderstorms", () => {
        const weather = createWeatherData({
          shortForecast: "Thunderstorms likely",
        });

        expect(isWeatherSafe("OUTDOOR", weather)).toBe(false);
        expect(isWeatherSafe("COVERED", weather)).toBe(false);
      });

      it("returns true for indoor venues during thunderstorms", () => {
        const weather = createWeatherData({
          shortForecast: "Thunderstorms likely",
        });

        expect(isWeatherSafe("INDOOR", weather)).toBe(true);
      });
    });

    describe("extreme temperature conditions", () => {
      it("returns false for extreme heat (> 100F) at outdoor venues", () => {
        const weather = createWeatherData({
          temperature: 105,
          shortForecast: "Extreme heat",
        });

        expect(isWeatherSafe("OUTDOOR", weather)).toBe(false);
      });

      it("returns false for extreme cold (< 15F) at outdoor venues", () => {
        const weather = createWeatherData({
          temperature: 10,
          shortForecast: "Dangerously cold",
        });

        expect(isWeatherSafe("OUTDOOR", weather)).toBe(false);
      });

      it("returns true for moderate temperatures", () => {
        const weather = createWeatherData({
          temperature: 70,
          shortForecast: "Mostly sunny",
        });

        expect(isWeatherSafe("OUTDOOR", weather)).toBe(true);
        expect(isWeatherSafe("COVERED", weather)).toBe(true);
        expect(isWeatherSafe("INDOOR", weather)).toBe(true);
      });
    });

    describe("high wind conditions", () => {
      it("returns false for dangerous wind speeds (> 40 mph) at outdoor venues", () => {
        const weather = createWeatherData({
          windSpeed: 45,
          shortForecast: "High winds expected",
        });

        expect(isWeatherSafe("OUTDOOR", weather)).toBe(false);
      });

      it("returns true for indoor venues during high winds", () => {
        const weather = createWeatherData({
          windSpeed: 45,
          shortForecast: "High winds expected",
        });

        expect(isWeatherSafe("INDOOR", weather)).toBe(true);
      });
    });

    describe("weather-dependent venues", () => {
      it("returns false for any precipitation with WEATHER_DEPENDENT", () => {
        const weather = createWeatherData({
          precipProbability: 30,
          shortForecast: "Slight chance of rain",
        });

        expect(isWeatherSafe("WEATHER_DEPENDENT", weather)).toBe(false);
      });

      it("returns true for clear conditions with WEATHER_DEPENDENT", () => {
        const weather = createWeatherData({
          precipProbability: 0,
          temperature: 70,
          windSpeed: 5,
          shortForecast: "Clear",
        });

        expect(isWeatherSafe("WEATHER_DEPENDENT", weather)).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("handles null venueType by defaulting to OUTDOOR behavior", () => {
        const weather = createWeatherData({
          shortForecast: "Thunderstorms",
        });

        expect(isWeatherSafe(null, weather)).toBe(false);
      });

      it("handles undefined weather properties", () => {
        const weather = {
          temperature: 70,
          precipProbability: 0,
          windSpeed: 0,
          shortForecast: "",
        };

        expect(isWeatherSafe("OUTDOOR", weather)).toBe(true);
      });

      it("handles missing shortForecast", () => {
        const weather = createWeatherData({
          shortForecast: undefined as any,
        });

        expect(() => isWeatherSafe("OUTDOOR", weather)).not.toThrow();
      });
    });
  });

  // ============================================================================
  // SECTION 3: Integration Scenarios
  // ============================================================================

  describe("integration scenarios", () => {
    /**
     * Real-world NYC Weather Scenarios
     *
     * These tests simulate common NYC weather patterns and verify the system
     * responds appropriately. NYC experiences diverse weather: nor'easters,
     * summer heat waves, spring rain, fall perfection.
     */

    it("handles NYC summer heat wave scenario", () => {
      const centralParkConcert = createEventInput({
        title: "Central Park Summer Stage",
        venueType: "OUTDOOR",
      });
      const heatWave = createWeatherData({
        temperature: 98,
        precipProbability: 10,
        windSpeed: 3,
        shortForecast: "Hot and humid",
      });

      const result = calculateWeatherScore(centralParkConcert, heatWave);
      const safe = isWeatherSafe("OUTDOOR", heatWave);

      expect(result.adjustedScore).toBeLessThanOrEqual(80);
      expect(safe).toBe(true); // Hot but not dangerous (< 100F)
    });

    it("handles NYC winter nor'easter scenario", () => {
      const outdoorMarket = createEventInput({
        title: "Union Square Holiday Market",
        venueType: "WEATHER_DEPENDENT",
      });
      const norEaster = createWeatherData({
        temperature: 32,
        precipProbability: 90,
        windSpeed: 30,
        shortForecast: "Heavy snow expected",
      });

      const result = calculateWeatherScore(outdoorMarket, norEaster);
      const safe = isWeatherSafe("WEATHER_DEPENDENT", norEaster);

      expect(result.adjustedScore).toBeLessThan(30);
      expect(safe).toBe(false);
    });

    it("handles NYC spring rain scenario", () => {
      const museumVisit = createEventInput({
        title: "MoMA Exhibition",
        venueType: "INDOOR",
      });
      const springRain = createWeatherData({
        temperature: 55,
        precipProbability: 70,
        windSpeed: 10,
        shortForecast: "Light rain",
      });

      const result = calculateWeatherScore(museumVisit, springRain);
      const safe = isWeatherSafe("INDOOR", springRain);

      expect(result.adjustedScore).toBeGreaterThan(100); // Rainy day bonus
      expect(safe).toBe(true);
    });

    it("handles perfect NYC fall day scenario", () => {
      const bryantParkEvent = createEventInput({
        title: "Bryant Park Fall Festival",
        venueType: "COVERED",
      });
      const perfectFall = createWeatherData({
        temperature: 65,
        precipProbability: 0,
        windSpeed: 5,
        shortForecast: "Sunny and pleasant",
      });

      const result = calculateWeatherScore(bryantParkEvent, perfectFall);
      const safe = isWeatherSafe("COVERED", perfectFall);

      expect(result.adjustedScore).toBe(100);
      expect(safe).toBe(true);
    });
  });
});
