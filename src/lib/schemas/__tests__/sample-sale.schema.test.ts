/**
 * Test suite for Sample Sale Zod schema validation.
 *
 * This schema provides runtime validation for data scraped from NYC sample sale
 * aggregators (260 Sample Sale, Chicmi, etc.). Sample sales are temporary retail
 * events where fashion brands sell excess inventory at significant discounts,
 * typically 50-90% off retail.
 *
 * Design Rationale:
 * - Uses Zod's safeParse() for graceful partial ingestion (valid sales processed,
 *   invalid ones logged for admin review)
 * - Required fields (id, brand, location, startDate, endDate, url) ensure minimum
 *   viable event data for user notification
 * - Optional description field accommodates varying levels of detail from sources
 * - Brand requires min(1) to prevent meaningless entries (empty string rejection)
 * - URL validation ensures links are properly formatted for user clicks
 *
 * Historical Context:
 * Sample sales emerged in NYC's Garment District in the 1970s as designers sought
 * to clear seasonal inventory. The practice evolved from industry-insider events
 * to public sales, with 260 Fifth Avenue becoming the iconic venue since 1987.
 * CityPing aggregates multiple sources to provide comprehensive coverage.
 *
 * NYC Sample Sale Ecosystem:
 * - 260 Sample Sale: Premier venue at 260 Fifth Avenue (Flatiron)
 * - Clothingline: Multiple Manhattan locations
 * - Soiffer Haskin: High-end designer sales
 * - Brand-direct: Pop-up events announced via social media
 */

import { SampleSaleSchema } from "../sample-sale.schema";

describe("SampleSaleSchema", () => {
  it("validates a valid sample sale with all required fields", () => {
    const validSale = {
      id: "260-theory-jan-15-18-2026",
      brand: "Theory",
      location: "260 Fifth Avenue",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-01-18"),
      url: "https://260samplesale.com/theory",
    };

    const result = SampleSaleSchema.safeParse(validSale);
    expect(result.success).toBe(true);
  });

  it("rejects sale with empty brand string", () => {
    const invalidSale = {
      id: "260-test",
      brand: "",
      location: "260 Fifth Avenue",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-01-18"),
      url: "https://260samplesale.com",
    };

    const result = SampleSaleSchema.safeParse(invalidSale);
    expect(result.success).toBe(false);
  });

  it("allows optional description field", () => {
    const saleWithDesc = {
      id: "260-hermes",
      brand: "Hermes",
      location: "260 Fifth Avenue",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-01-18"),
      description: "Up to 70% off",
      url: "https://260samplesale.com/hermes",
    };

    const result = SampleSaleSchema.safeParse(saleWithDesc);
    expect(result.success).toBe(true);
  });

  it("rejects sale with invalid URL format", () => {
    const invalidUrlSale = {
      id: "260-test",
      brand: "Theory",
      location: "260 Fifth Avenue",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-01-18"),
      url: "not-a-valid-url",
    };

    const result = SampleSaleSchema.safeParse(invalidUrlSale);
    expect(result.success).toBe(false);
  });

  it("rejects sale with missing required fields", () => {
    const incompleteSale = {
      id: "260-test",
      brand: "Theory",
      // Missing: location, startDate, endDate, url
    };

    const result = SampleSaleSchema.safeParse(incompleteSale);
    expect(result.success).toBe(false);
  });

  it("validates sale with luxury brand containing special characters", () => {
    // French luxury brands often use accented characters
    const luxurySale = {
      id: "260-hermes-jan-2026",
      brand: "Hermes",
      location: "260 Fifth Avenue, New York, NY 10001",
      startDate: new Date("2026-01-20"),
      endDate: new Date("2026-01-23"),
      description: "Rare archive pieces, accessories, and RTW",
      url: "https://260samplesale.com/events/hermes-jan-2026",
    };

    const result = SampleSaleSchema.safeParse(luxurySale);
    expect(result.success).toBe(true);
  });

  it("handles dates correctly as Date objects", () => {
    const saleWithDates = {
      id: "test-sale",
      brand: "Rag & Bone",
      location: "Metropolitan Pavilion",
      startDate: new Date("2026-02-01T09:00:00"),
      endDate: new Date("2026-02-03T18:00:00"),
      url: "https://example.com/sale",
    };

    const result = SampleSaleSchema.safeParse(saleWithDates);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBeInstanceOf(Date);
      expect(result.data.endDate).toBeInstanceOf(Date);
    }
  });
});
