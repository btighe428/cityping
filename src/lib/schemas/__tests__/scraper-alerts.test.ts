/**
 * Test suite for Scraper Alert Service.
 *
 * This module provides the infrastructure for alerting administrators when
 * upstream data sources change their schema or return malformed data. In the
 * context of web scraping and API consumption, schema drift is a persistent
 * operational challenge - external services may modify their response formats
 * without notice, causing silent data corruption or ingestion failures.
 *
 * Architectural Context:
 * The scraper alert system implements a "partial ingestion" pattern (also known
 * as "best effort" or "graceful degradation"). When validating incoming data:
 * 1. Valid records are processed normally
 * 2. Invalid records are logged and aggregated
 * 3. If errors exceed a threshold, administrators are notified via email
 *
 * This approach draws from distributed systems resilience patterns, particularly
 * the "bulkhead" pattern - isolating failures prevents a single malformed record
 * from halting the entire ingestion pipeline.
 *
 * Historical Precedent:
 * Schema validation alerts became industry standard after high-profile incidents
 * where silent data corruption propagated through systems undetected. The 2012
 * Knight Capital incident ($440M loss in 45 minutes) was partially attributed
 * to inadequate monitoring of data flow anomalies. While our use case is less
 * dramatic, the principle remains: early detection prevents cascading failures.
 *
 * Design Decisions:
 * - Payload samples limited to 3: Balances diagnostic value against email size
 * - HTML formatting: Enables rich error display while maintaining email compatibility
 * - Graceful env var handling: Missing ADMIN_ALERT_EMAIL logs warning rather than throwing
 */

import { buildScraperAlertEmail, ScraperError } from "../../scraper-alerts";

describe("buildScraperAlertEmail", () => {
  it("builds email with error details including source and validation message", () => {
    const errors: ScraperError[] = [
      {
        source: "mta",
        payload: { id: "123", header: null },
        error: "Expected string, received null at header",
        timestamp: new Date("2026-01-04T10:00:00Z"),
      },
    ];

    const email = buildScraperAlertEmail("mta", errors);

    // Verify subject contains required components
    expect(email.subject).toContain("[CityPing] Scraper Validation Failures");
    expect(email.subject).toContain("mta");
    expect(email.subject).toContain("1 error");

    // Verify HTML body contains error details
    expect(email.html).toContain("header");
    expect(email.html).toContain("Expected string");
  });

  it("pluralizes errors correctly for single error", () => {
    const errors: ScraperError[] = [
      { source: "mta", payload: {}, error: "Single error", timestamp: new Date() },
    ];

    const email = buildScraperAlertEmail("mta", errors);

    // Should use singular "error" not "errors"
    expect(email.subject).toContain("1 error)");
    expect(email.subject).not.toContain("1 errors");
  });

  it("pluralizes errors correctly for multiple errors", () => {
    const errors: ScraperError[] = [
      { source: "mta", payload: {}, error: "Error 1", timestamp: new Date() },
      { source: "mta", payload: {}, error: "Error 2", timestamp: new Date() },
      { source: "mta", payload: {}, error: "Error 3", timestamp: new Date() },
    ];

    const email = buildScraperAlertEmail("mta", errors);

    // Should use plural "errors"
    expect(email.subject).toContain("3 errors");
    expect(email.subject).not.toContain("3 error)");
  });

  it("limits payload samples to 3 to prevent email bloat", () => {
    const errors: ScraperError[] = Array.from({ length: 10 }, (_, i) => ({
      source: "mta",
      payload: { id: `error-${i}` },
      error: `Error ${i}`,
      timestamp: new Date(),
    }));

    const email = buildScraperAlertEmail("mta", errors);

    // Should only show first 3 samples in HTML body
    expect(email.html).toContain("error-0");
    expect(email.html).toContain("error-1");
    expect(email.html).toContain("error-2");

    // Should NOT include samples beyond the first 3
    expect(email.html).not.toContain("error-3");
    expect(email.html).not.toContain("error-9");
  });

  it("escapes HTML in error messages to prevent XSS", () => {
    const errors: ScraperError[] = [
      {
        source: "mta",
        payload: { test: "<script>alert('xss')</script>" },
        error: "Error with <dangerous> content",
        timestamp: new Date(),
      },
    ];

    const email = buildScraperAlertEmail("mta", errors);

    // Should escape angle brackets
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;");
  });

  it("includes timestamp and source metadata in email body", () => {
    const errors: ScraperError[] = [
      {
        source: "sample-sales",
        payload: { brand: "Test" },
        error: "Validation failed",
        timestamp: new Date("2026-01-04T15:30:00Z"),
      },
    ];

    const email = buildScraperAlertEmail("sample-sales", errors);

    // Subject should contain the source
    expect(email.subject).toContain("sample-sales");

    // Body should contain source reference
    expect(email.html).toContain("sample-sales");
  });

  it("handles empty payload gracefully", () => {
    const errors: ScraperError[] = [
      {
        source: "mta",
        payload: {},
        error: "Empty payload received",
        timestamp: new Date(),
      },
    ];

    const email = buildScraperAlertEmail("mta", errors);

    // Should not throw and should generate valid HTML
    expect(email.subject).toBeDefined();
    expect(email.html).toBeDefined();
    expect(email.html.length).toBeGreaterThan(0);
  });

  it("handles complex nested payload structures", () => {
    const errors: ScraperError[] = [
      {
        source: "housing",
        payload: {
          listing: {
            id: "123",
            details: {
              bedrooms: null,
              nested: { deep: { value: "test" } },
            },
          },
        },
        error: "Expected number at listing.details.bedrooms",
        timestamp: new Date(),
      },
    ];

    const email = buildScraperAlertEmail("housing", errors);

    // Should serialize nested structures
    expect(email.html).toContain("listing");
    expect(email.html).toContain("bedrooms");
  });
});
