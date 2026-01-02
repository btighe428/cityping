// src/lib/__tests__/inference.test.ts
/**
 * Test suite for the zip code inference engine.
 *
 * These tests validate the intelligent default preference generation system
 * that infers user preferences from NYC zip code demographics and infrastructure.
 *
 * The inference system is central to NYC Ping's onboarding UX optimization:
 * users provide only a zip code, and the system populates sensible defaults
 * for all six alert modules (parking, transit, housing, weather, deals, events).
 *
 * Historical Context:
 * Location-based preference inference has roots in geodemographic segmentation
 * systems like PRIZM (1974) and ACORN (1979). NYC Ping applies similar
 * principles at the zip code level, leveraging the unique density of NYC's
 * infrastructure data to achieve meaningful personalization from minimal input.
 */

import { inferProfileFromZip, generateDefaultPreferences } from "../inference";

describe("inferProfileFromZip", () => {
  it("returns profile for known NYC zip code", () => {
    // 11211 = Williamsburg (North), Brooklyn
    // One of NYC's most recognizable neighborhoods, historically a working-class
    // area that transformed into a cultural hub in the 2000s
    const profile = inferProfileFromZip("11211");
    expect(profile.neighborhood).toBe("Williamsburg (North)");
    expect(profile.borough).toBe("Brooklyn");
    expect(profile.subwayLines).toContain("G");
    expect(profile.subwayLines).toContain("L");
  });

  it("returns default profile for unknown zip code", () => {
    // 90210 = Beverly Hills, CA - famous zip code but not in NYC
    const profile = inferProfileFromZip("90210");
    expect(profile.neighborhood).toBe("Unknown Neighborhood");
    expect(profile.borough).toBe("Manhattan"); // Default borough
  });

  it("correctly identifies borough for Manhattan zip codes", () => {
    // 10001 = Chelsea / Hudson Yards
    const profile = inferProfileFromZip("10001");
    expect(profile.borough).toBe("Manhattan");
    expect(profile.neighborhood).toBe("Chelsea / Hudson Yards");
  });

  it("correctly identifies borough for Queens zip codes", () => {
    // 11101 = Long Island City - major development hub
    const profile = inferProfileFromZip("11101");
    expect(profile.borough).toBe("Queens");
    expect(profile.neighborhood).toBe("Long Island City");
  });

  it("correctly identifies borough for Bronx zip codes", () => {
    // 10451 = South Bronx / Mott Haven - historic area with recent development
    const profile = inferProfileFromZip("10451");
    expect(profile.borough).toBe("Bronx");
  });

  it("correctly identifies borough for Staten Island zip codes", () => {
    // 10301 = St. George / Stapleton - near ferry terminal
    const profile = inferProfileFromZip("10301");
    expect(profile.borough).toBe("Staten Island");
    expect(profile.subwayLines).toContain("SIR"); // Staten Island Railway
  });
});

describe("generateDefaultPreferences", () => {
  it("enables parking for high parking relevance areas", () => {
    // 11219 = Borough Park - high parking relevance due to suburban character
    // and significant vehicle ownership in the Orthodox community
    const profile = inferProfileFromZip("11219");
    expect(profile.parkingRelevance).toBe("high");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.parking.enabled).toBe(true);
  });

  it("disables parking for low parking relevance areas", () => {
    // 10001 = Chelsea / Hudson Yards - excellent transit, low vehicle ownership
    const profile = inferProfileFromZip("10001");
    expect(profile.parkingRelevance).toBe("low");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.parking.enabled).toBe(false);
  });

  it("enables parking for medium parking relevance areas", () => {
    // 11211 = Williamsburg (North) has "low" parking relevance
    // 11222 = Greenpoint has "medium" parking relevance
    const profile = inferProfileFromZip("11222");
    expect(profile.parkingRelevance).toBe("medium");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.parking.enabled).toBe(true); // medium = enabled
  });

  it("enables housing for rental markets", () => {
    // Rental-heavy markets benefit most from housing lottery alerts
    const profile = inferProfileFromZip("11211");
    expect(profile.housingMarket).toBe("rental");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.housing.enabled).toBe(true);
  });

  it("enables housing for mixed markets", () => {
    // Mixed markets benefit from both rental and ownership alerts
    const profile = inferProfileFromZip("11216");
    expect(profile.housingMarket).toBe("mixed");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.housing.enabled).toBe(true);
  });

  it("disables housing for ownership-heavy markets", () => {
    // Ownership-heavy markets have less need for housing lottery alerts
    const profile = inferProfileFromZip("11215");
    expect(profile.housingMarket).toBe("ownership");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.housing.enabled).toBe(false);
  });

  it("limits subway lines to top 4 nearest", () => {
    // 10018 = Garment District - has 14 subway lines in profile
    // Should limit to 4 most relevant for notification filtering
    const profile = inferProfileFromZip("10018");
    expect(profile.subwayLines.length).toBeGreaterThan(4);
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.transit.settings.subwayLines.length).toBeLessThanOrEqual(4);
  });

  it("includes all subway lines if 4 or fewer available", () => {
    // 11222 = Greenpoint - only has G line
    const profile = inferProfileFromZip("11222");
    expect(profile.subwayLines.length).toBe(1);
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.transit.settings.subwayLines).toEqual(["G"]);
  });

  it("returns all six module preferences", () => {
    const profile = inferProfileFromZip("11211");
    const prefs = generateDefaultPreferences(profile);

    // All six modules should be present
    expect(prefs).toHaveProperty("parking");
    expect(prefs).toHaveProperty("transit");
    expect(prefs).toHaveProperty("housing");
    expect(prefs).toHaveProperty("weather");
    expect(prefs).toHaveProperty("deals");
    expect(prefs).toHaveProperty("events");
  });

  it("enables transit by default when subway lines exist", () => {
    const profile = inferProfileFromZip("11211");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.transit.enabled).toBe(true);
  });

  it("disables transit for areas without subway access", () => {
    // 11356 = College Point - bus-dependent, no subway
    const profile = inferProfileFromZip("11356");
    expect(profile.subwayLines.length).toBe(0);
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.transit.enabled).toBe(false);
  });

  it("sets weather always enabled", () => {
    // Weather alerts are universally relevant in NYC
    const profile = inferProfileFromZip("11211");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.weather.enabled).toBe(true);
  });

  it("sets deals enabled by default", () => {
    // Deals/financial alerts have broad appeal
    const profile = inferProfileFromZip("11211");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.deals.enabled).toBe(true);
  });

  it("sets events enabled by default", () => {
    // NYC events alerts have broad appeal
    const profile = inferProfileFromZip("11211");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.events.enabled).toBe(true);
  });
});
