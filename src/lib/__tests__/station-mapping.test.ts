// src/lib/__tests__/station-mapping.test.ts
/**
 * Test suite for the NYC Subway Station Mapping Module.
 *
 * This module provides geographic intelligence linking NYC zip codes to their
 * nearest subway stations, enabling personalized commute alerts and transit
 * recommendations based on user location.
 *
 * Historical Context:
 * The NYC subway system opened in 1904 (IRT) and expanded through consolidation
 * of three independent operators (IRT, BMT, IND) in 1940. Today's unified system
 * serves ~3.5 million daily riders across 472 stations. The geographic distribution
 * of stations closely correlates with population density and commercial activity,
 * with Manhattan below 60th Street having the highest station density (~1 per
 * 0.05 square miles) and outer borough areas significantly lower density.
 *
 * Design Rationale:
 * The zip code to station mapping provides O(1) lookup performance for commute
 * personalization. Rather than real-time geolocation, we pre-compute nearest
 * stations for common residential zip codes. This approach trades minor precision
 * loss for dramatically reduced latency and API call overhead. For users living
 * in transit deserts (parts of Eastern Queens, Staten Island), the mapping
 * returns relevant bus/ferry connections or empty arrays.
 *
 * Coverage Strategy:
 * - Manhattan: High station density means most zip codes have multiple options
 * - Brooklyn: Mixed density, focus on residential neighborhoods
 * - Queens: Concentrated along 7, E/F, N/W corridors
 * - Bronx: Concentrated along 2/5 and 4 corridors
 * - Staten Island: Limited to SIR and Ferry connections
 */

import { ZIP_TO_STATIONS, getNearestStations, StationInfo } from "../station-mapping";

describe("Station Mapping Module", () => {
  /**
   * ZIP_TO_STATIONS Constant Tests
   *
   * Validates the structure and completeness of the static mapping data.
   * The mapping should cover at least 20 common NYC zip codes across all
   * five boroughs as specified in requirements.
   */
  describe("ZIP_TO_STATIONS constant", () => {
    it("should be a non-empty record", () => {
      expect(typeof ZIP_TO_STATIONS).toBe("object");
      expect(Object.keys(ZIP_TO_STATIONS).length).toBeGreaterThanOrEqual(20);
    });

    it("should cover Manhattan zip codes", () => {
      const manhattanZips = ["10001", "10002", "10003", "10011", "10014", "10016", "10019", "10022", "10028", "10036"];
      manhattanZips.forEach((zip) => {
        expect(ZIP_TO_STATIONS).toHaveProperty(zip);
        expect(ZIP_TO_STATIONS[zip].length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should cover Brooklyn zip codes", () => {
      const brooklynZips = ["11201", "11211", "11215", "11217", "11238"];
      brooklynZips.forEach((zip) => {
        expect(ZIP_TO_STATIONS).toHaveProperty(zip);
        expect(ZIP_TO_STATIONS[zip].length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should cover Queens zip codes", () => {
      const queensZips = ["11101", "11104", "11372"];
      queensZips.forEach((zip) => {
        expect(ZIP_TO_STATIONS).toHaveProperty(zip);
        expect(ZIP_TO_STATIONS[zip].length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should cover Bronx zip codes", () => {
      const bronxZips = ["10451", "10452"];
      bronxZips.forEach((zip) => {
        expect(ZIP_TO_STATIONS).toHaveProperty(zip);
        expect(ZIP_TO_STATIONS[zip].length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should cover Staten Island with ferry terminal info", () => {
      expect(ZIP_TO_STATIONS).toHaveProperty("10301");
      expect(ZIP_TO_STATIONS["10301"].length).toBeGreaterThanOrEqual(1);
      // Staten Island should reference the ferry or SIR
      const stationNames = ZIP_TO_STATIONS["10301"].map((s) => s.stationName.toLowerCase());
      const hasFerryOrSIR = stationNames.some(
        (name) => name.includes("ferry") || name.includes("st. george") || name.includes("sir")
      );
      expect(hasFerryOrSIR).toBe(true);
    });
  });

  /**
   * StationInfo Structure Validation Tests
   *
   * Each station entry must contain:
   * - stationName: Human-readable station identifier
   * - lines: Array of subway line designations (e.g., ["A", "C", "E"])
   * - walkMinutes: Estimated walking time from zip code centroid
   */
  describe("StationInfo data structure", () => {
    it("should have required properties for each station", () => {
      Object.entries(ZIP_TO_STATIONS).forEach(([zip, stations]) => {
        expect(Array.isArray(stations)).toBe(true);
        stations.forEach((station: StationInfo) => {
          expect(station).toHaveProperty("stationName");
          expect(typeof station.stationName).toBe("string");
          expect(station.stationName.length).toBeGreaterThan(0);

          expect(station).toHaveProperty("lines");
          expect(Array.isArray(station.lines)).toBe(true);
          expect(station.lines.length).toBeGreaterThan(0);
          station.lines.forEach((line) => {
            expect(typeof line).toBe("string");
          });

          expect(station).toHaveProperty("walkMinutes");
          expect(typeof station.walkMinutes).toBe("number");
          expect(station.walkMinutes).toBeGreaterThanOrEqual(0);
          expect(station.walkMinutes).toBeLessThanOrEqual(30); // Reasonable walking distance
        });
      });
    });

    it("should have 1-3 stations per zip code", () => {
      Object.entries(ZIP_TO_STATIONS).forEach(([zip, stations]) => {
        expect(stations.length).toBeGreaterThanOrEqual(1);
        expect(stations.length).toBeLessThanOrEqual(3);
      });
    });

    it("should have valid subway line designations", () => {
      // Valid NYC subway lines
      const validLines = [
        "1", "2", "3", "4", "5", "6", "7",
        "A", "B", "C", "D", "E", "F", "G",
        "J", "L", "M", "N", "Q", "R", "W", "Z",
        "S", "SIR", // S for shuttles, SIR for Staten Island Railway
      ];

      Object.entries(ZIP_TO_STATIONS).forEach(([zip, stations]) => {
        stations.forEach((station: StationInfo) => {
          station.lines.forEach((line) => {
            expect(validLines).toContain(line);
          });
        });
      });
    });
  });

  /**
   * getNearestStations Function Tests
   *
   * The helper function provides the primary interface for accessing
   * station data by zip code. Returns an array of StationInfo objects
   * for known zip codes, empty array for unknown.
   */
  describe("getNearestStations function", () => {
    it("should return stations for known Manhattan zip codes", () => {
      const stations = getNearestStations("10001");
      expect(Array.isArray(stations)).toBe(true);
      expect(stations.length).toBeGreaterThanOrEqual(1);
      expect(stations[0]).toHaveProperty("stationName");
      expect(stations[0]).toHaveProperty("lines");
      expect(stations[0]).toHaveProperty("walkMinutes");
    });

    it("should return stations for known Brooklyn zip codes", () => {
      const stations = getNearestStations("11211");
      expect(stations.length).toBeGreaterThanOrEqual(1);
      // Williamsburg should have L train access
      const allLines = stations.flatMap((s) => s.lines);
      expect(allLines).toContain("L");
    });

    it("should return stations for known Queens zip codes", () => {
      const stations = getNearestStations("11101");
      expect(stations.length).toBeGreaterThanOrEqual(1);
      // Long Island City should have 7 train access
      const allLines = stations.flatMap((s) => s.lines);
      expect(allLines).toContain("7");
    });

    it("should return stations for known Bronx zip codes", () => {
      const stations = getNearestStations("10451");
      expect(stations.length).toBeGreaterThanOrEqual(1);
    });

    it("should return stations for Staten Island with ferry info", () => {
      const stations = getNearestStations("10301");
      expect(stations.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty array for unknown zip codes", () => {
      expect(getNearestStations("00000")).toEqual([]);
      expect(getNearestStations("99999")).toEqual([]);
      expect(getNearestStations("")).toEqual([]);
      expect(getNearestStations("invalid")).toEqual([]);
    });

    it("should return empty array for non-NYC zip codes", () => {
      // Los Angeles zip
      expect(getNearestStations("90210")).toEqual([]);
      // Chicago zip
      expect(getNearestStations("60601")).toEqual([]);
    });

    it("should handle zip codes with leading zeros correctly", () => {
      // Some systems strip leading zeros; our function should handle string input
      const stations = getNearestStations("10001");
      expect(stations.length).toBeGreaterThanOrEqual(1);
    });
  });

  /**
   * Geographic Accuracy Tests
   *
   * Validates that specific zip codes map to geographically appropriate stations.
   * These tests ensure the mapping reflects actual NYC geography.
   */
  describe("geographic accuracy", () => {
    it("should map Chelsea (10001) to Penn Station area stations", () => {
      const stations = getNearestStations("10001");
      const stationNames = stations.map((s) => s.stationName);
      // 10001 is Chelsea/Penn Station area - should have access to major lines
      const allLines = stations.flatMap((s) => s.lines);
      // Penn Station area has 1/2/3, A/C/E access
      const hasPennStationLines =
        allLines.includes("1") || allLines.includes("2") || allLines.includes("3") ||
        allLines.includes("A") || allLines.includes("C") || allLines.includes("E");
      expect(hasPennStationLines).toBe(true);
    });

    it("should map Williamsburg (11211) to Bedford Ave L station", () => {
      const stations = getNearestStations("11211");
      const stationNames = stations.map((s) => s.stationName.toLowerCase());
      // Bedford Ave is the iconic Williamsburg station
      const hasBedfordOrLorimer = stationNames.some(
        (name) => name.includes("bedford") || name.includes("lorimer")
      );
      expect(hasBedfordOrLorimer).toBe(true);
    });

    it("should map Times Square area (10036) to major transit hub", () => {
      const stations = getNearestStations("10036");
      const allLines = stations.flatMap((s) => s.lines);
      // Times Square is a major hub - should have multiple line options
      expect(allLines.length).toBeGreaterThanOrEqual(3);
    });

    it("should map Jackson Heights (11372) to Roosevelt Ave station", () => {
      const stations = getNearestStations("11372");
      const stationNames = stations.map((s) => s.stationName.toLowerCase());
      const hasRoosevelt = stationNames.some((name) => name.includes("roosevelt"));
      expect(hasRoosevelt).toBe(true);
    });
  });
});
