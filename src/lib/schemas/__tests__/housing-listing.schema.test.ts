/**
 * Test suite for Housing Listing Zod schema validation.
 *
 * This schema validates affordable housing lottery listings scraped from NYC Housing
 * Connect (housingconnect.nyc.gov). Housing Connect is the city's centralized portal
 * for affordable housing lotteries, launched in 2014 to replace the fragmented
 * paper-based application system.
 *
 * Design Rationale:
 * - Uses Zod's safeParse() for graceful partial ingestion (valid listings processed,
 *   invalid ones logged for admin review)
 * - Required fields (id, title, borough, deadline, incomeBrackets, url) ensure
 *   minimum viable listing data for user notifications
 * - Optional fields (neighborhood, bedrooms, rent) accommodate varying listing formats
 * - URL validation ensures users receive working links to apply
 *
 * Domain Context:
 * NYC affordable housing lotteries are governed by HPD (Housing Preservation and
 * Development). Income brackets are expressed as percentages of AMI (Area Median Income),
 * which for NYC metro area is determined annually by HUD. For 2025, a single person
 * at 80% AMI has an income limit of approximately $82,000.
 *
 * Historical Note:
 * Before Housing Connect, applicants had to mail separate applications to each
 * development. The digital lottery system has processed over 10 million applications
 * since launch, with average odds of selection around 1-2% for most developments.
 */

import { HousingListingSchema } from "../housing-listing.schema";

describe("HousingListingSchema", () => {
  it("validates a valid housing listing with all fields", () => {
    const validListing = {
      id: "hc-12345",
      title: "Affordable Housing at 123 Main St",
      borough: "Brooklyn",
      neighborhood: "Williamsburg",
      deadline: new Date("2026-02-15"),
      incomeBrackets: ["50-80", "80-100"],
      url: "https://housingconnect.nyc.gov/12345",
      bedrooms: 2,
      rent: 1500,
    };

    const result = HousingListingSchema.safeParse(validListing);
    expect(result.success).toBe(true);
  });

  it("validates a minimal housing listing without optional fields", () => {
    const minimalListing = {
      id: "hc-67890",
      title: "Senior Housing Opportunity",
      borough: "Queens",
      deadline: new Date("2026-03-01"),
      incomeBrackets: ["30-50"],
      url: "https://housingconnect.nyc.gov/67890",
    };

    const result = HousingListingSchema.safeParse(minimalListing);
    expect(result.success).toBe(true);
  });

  it("rejects listing without deadline", () => {
    const invalidListing = {
      id: "hc-12345",
      title: "Affordable Housing",
      borough: "Brooklyn",
      incomeBrackets: ["50-80"],
      url: "https://housingconnect.nyc.gov/12345",
    };

    const result = HousingListingSchema.safeParse(invalidListing);
    expect(result.success).toBe(false);
  });

  it("rejects listing with empty title", () => {
    const invalidListing = {
      id: "hc-12345",
      title: "",
      borough: "Manhattan",
      deadline: new Date("2026-04-01"),
      incomeBrackets: ["80-100"],
      url: "https://housingconnect.nyc.gov/12345",
    };

    const result = HousingListingSchema.safeParse(invalidListing);
    expect(result.success).toBe(false);
  });

  it("rejects listing with invalid URL", () => {
    const invalidListing = {
      id: "hc-12345",
      title: "Housing Opportunity",
      borough: "Bronx",
      deadline: new Date("2026-05-01"),
      incomeBrackets: ["50-80"],
      url: "not-a-valid-url",
    };

    const result = HousingListingSchema.safeParse(invalidListing);
    expect(result.success).toBe(false);
  });

  it("accepts listing with empty incomeBrackets array", () => {
    // Note: Some listings may not specify income brackets initially
    const listingWithEmptyBrackets = {
      id: "hc-99999",
      title: "New Development Coming Soon",
      borough: "Staten Island",
      deadline: new Date("2026-06-01"),
      incomeBrackets: [],
      url: "https://housingconnect.nyc.gov/99999",
    };

    const result = HousingListingSchema.safeParse(listingWithEmptyBrackets);
    expect(result.success).toBe(true);
  });
});
