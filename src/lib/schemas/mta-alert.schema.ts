/**
 * Zod schema for MTA Service Alert validation.
 *
 * This schema validates data ingested from MTA's GTFS-RT (General Transit Feed
 * Specification - Realtime) API. The MTA publishes service alerts for all NYC
 * subway lines in Protocol Buffer format, which gets transformed to JSON.
 *
 * Schema Design Principles:
 * 1. Partial Ingestion: Uses safeParse() to allow valid alerts through while
 *    logging invalid ones for admin review. This ensures a malformed alert
 *    doesn't block the entire feed ingestion.
 *
 * 2. Minimal Required Fields: Only id, header, and affectedLines are required.
 *    The MTA doesn't always provide descriptions or time bounds.
 *
 * 3. Type Safety: Exports inferred TypeScript type for use throughout the app.
 *
 * Technical Context:
 * The MTA's GTFS-RT feed follows Google's transit spec (developers.google.com/transit/gtfs-realtime).
 * Alert messages contain EntitySelector and TimeRange objects which we flatten
 * for simpler storage and querying.
 *
 * Historical Note:
 * The MTA launched their real-time data feeds in 2011 for the 1-6 and L lines,
 * expanding to all lines by 2017. Third-party validation became essential after
 * several incidents where upstream schema changes caused downstream app failures.
 */

import { z } from "zod";

/**
 * Schema for MTA service alert active time period.
 *
 * Per GTFS-RT spec, time ranges use Unix timestamps (seconds since epoch).
 * The 'end' field is optional because MTA often publishes alerts without
 * known resolution times (e.g., "delays due to police investigation").
 */
const ActivePeriodSchema = z.object({
  start: z.number(),
  end: z.number().optional(),
});

/**
 * Main MTA Alert schema.
 *
 * Field specifications:
 * - id: Unique identifier from MTA (required, used for deduplication)
 * - header: Short alert description shown in notifications (required, min 1 char)
 * - description: Extended details about the alert (optional)
 * - affectedLines: Array of affected subway line identifiers (required, min 1 item)
 * - activePeriod: Time bounds for the alert (optional)
 */
export const MtaAlertSchema = z.object({
  id: z.string(),
  header: z.string().min(1),
  description: z.string().optional(),
  affectedLines: z.array(z.string()).min(1),
  activePeriod: ActivePeriodSchema.optional(),
});

/**
 * TypeScript type inferred from the Zod schema.
 *
 * Using z.infer ensures type definitions stay in sync with runtime validation.
 * This pattern eliminates the common source of bugs where TypeScript types
 * and runtime validation diverge.
 */
export type MtaAlert = z.infer<typeof MtaAlertSchema>;
