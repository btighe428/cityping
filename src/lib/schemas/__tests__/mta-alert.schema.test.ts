/**
 * Test suite for MTA Alert Zod schema validation.
 *
 * This schema provides runtime validation for data ingested from MTA's GTFS-RT
 * (General Transit Feed Specification - Realtime) feed. The MTA publishes service
 * alerts in Protocol Buffer format, which are then transformed to JSON and must
 * be validated before storage and user notification.
 *
 * Design Rationale:
 * - Uses Zod's safeParse() for graceful partial ingestion (valid alerts processed,
 *   invalid ones logged for admin review)
 * - Required fields (id, header, affectedLines) ensure minimum viable alert data
 * - Optional fields (description, activePeriod) accommodate varying MTA alert formats
 * - affectedLines requires at least one entry to prevent meaningless alerts
 *
 * Historical Context:
 * The MTA began publishing GTFS-RT feeds around 2014, enabling third-party apps
 * to display real-time transit information. Schema validation became essential
 * after several incidents where upstream format changes caused downstream failures.
 */

import { MtaAlertSchema } from "../mta-alert.schema";

describe("MtaAlertSchema", () => {
  it("validates a valid MTA alert with all fields", () => {
    const validAlert = {
      id: "alert-123",
      header: "L train delays",
      description: "Due to signal problems",
      affectedLines: ["L"],
      activePeriod: { start: 1704067200, end: 1704153600 },
    };

    const result = MtaAlertSchema.safeParse(validAlert);
    expect(result.success).toBe(true);
  });

  it("rejects alert with empty affectedLines array", () => {
    const invalidAlert = {
      id: "alert-123",
      header: "L train delays",
      affectedLines: [],
    };

    const result = MtaAlertSchema.safeParse(invalidAlert);
    expect(result.success).toBe(false);
  });

  it("rejects alert with missing header", () => {
    const invalidAlert = {
      id: "alert-123",
      affectedLines: ["L"],
    };

    const result = MtaAlertSchema.safeParse(invalidAlert);
    expect(result.success).toBe(false);
  });

  it("allows optional description and activePeriod", () => {
    const minimalAlert = {
      id: "alert-123",
      header: "Service advisory",
      affectedLines: ["G"],
    };

    const result = MtaAlertSchema.safeParse(minimalAlert);
    expect(result.success).toBe(true);
  });
});
