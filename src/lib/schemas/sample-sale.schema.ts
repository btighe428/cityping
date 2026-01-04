/**
 * Zod schema for Sample Sale event validation.
 *
 * This schema validates data scraped from NYC sample sale aggregators and brand
 * announcements. Sample sales are temporary retail events where fashion brands
 * sell excess inventory at significant discounts (typically 50-90% off retail).
 *
 * Schema Design Principles:
 * 1. Partial Ingestion: Uses safeParse() to allow valid sales through while
 *    logging invalid ones for admin review. This ensures a malformed entry
 *    doesn't block the entire scrape ingestion.
 *
 * 2. Required Fields: id, brand, location, startDate, endDate, and url are all
 *    required to ensure users receive actionable information.
 *
 * 3. Brand Validation: Requires minimum 1 character to prevent empty entries
 *    that would be meaningless in notifications.
 *
 * 4. URL Validation: Ensures the url field contains a properly formatted URL
 *    so users can click through to event details.
 *
 * 5. Type Safety: Exports inferred TypeScript type for use throughout the app.
 *
 * Technical Context:
 * Sample sale data comes from multiple sources with varying schemas:
 * - 260 Sample Sale API (structured JSON)
 * - Chicmi scraping (HTML parsing)
 * - Brand social media (unstructured, AI-extracted)
 *
 * Each source is transformed to this common schema before storage.
 *
 * Historical Note:
 * NYC sample sales originated in the Garment District during the 1970s as
 * designers sought to liquidate seasonal inventory. The practice evolved from
 * industry-insider events to public sales. 260 Fifth Avenue (260 Sample Sale)
 * became the iconic venue in 1987, hosting brands from Hermes to Proenza Schouler.
 *
 * The secondary market for sample sale intelligence (knowing which sales to
 * attend, arrival strategies, etc.) spawned numerous newsletters and apps,
 * with CityPing providing the most comprehensive aggregation through multi-source
 * scraping and validation.
 */

import { z } from "zod";

/**
 * Main Sample Sale schema.
 *
 * Field specifications:
 * - id: Unique identifier for deduplication (required, typically slug-format)
 * - brand: Fashion brand name (required, min 1 character)
 * - location: Physical address or venue name (required)
 * - startDate: Sale start date/time (required, Date object)
 * - endDate: Sale end date/time (required, Date object)
 * - description: Additional details like discounts, items available (optional)
 * - url: Link to event details or RSVP (required, valid URL format)
 *
 * Example valid sale:
 * {
 *   id: "260-theory-jan-15-18-2026",
 *   brand: "Theory",
 *   location: "260 Fifth Avenue",
 *   startDate: new Date("2026-01-15"),
 *   endDate: new Date("2026-01-18"),
 *   description: "Up to 80% off men's and women's apparel",
 *   url: "https://260samplesale.com/theory"
 * }
 */
export const SampleSaleSchema = z.object({
  id: z.string(),
  brand: z.string().min(1),
  location: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string().optional(),
  url: z.string().url(),
});

/**
 * TypeScript type inferred from the Zod schema.
 *
 * Using z.infer ensures type definitions stay in sync with runtime validation.
 * This pattern eliminates the common source of bugs where TypeScript types
 * and runtime validation diverge.
 *
 * The inferred type is equivalent to:
 * {
 *   id: string;
 *   brand: string;
 *   location: string;
 *   startDate: Date;
 *   endDate: Date;
 *   description?: string | undefined;
 *   url: string;
 * }
 */
export type SampleSale = z.infer<typeof SampleSaleSchema>;
