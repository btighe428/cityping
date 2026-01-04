/**
 * Zod schema for NYC Housing Connect listing validation.
 *
 * This schema validates affordable housing lottery listings scraped from NYC Housing
 * Connect (housingconnect.nyc.gov), the city's centralized portal for affordable
 * housing applications. Launched in 2014 by HPD (Housing Preservation and Development),
 * Housing Connect replaced the fragmented paper-based lottery system.
 *
 * Schema Design Principles:
 * 1. Partial Ingestion: Uses safeParse() to allow valid listings through while
 *    logging invalid ones for admin review. A malformed listing shouldn't block
 *    the entire scrape run.
 *
 * 2. Minimal Required Fields: id, title, borough, deadline, incomeBrackets, and url
 *    are required. These represent the minimum viable information for a user to
 *    know about and apply to a housing lottery.
 *
 * 3. Type Safety: Exports inferred TypeScript type for use throughout the app.
 *
 * Domain Context:
 * NYC affordable housing operates on the AMI (Area Median Income) system. Income
 * brackets like "50-80" mean the unit is available to households earning between
 * 50% and 80% of AMI. For 2025 NYC metro, 100% AMI for a family of four is
 * approximately $127,300 (per HUD annual calculations).
 *
 * Technical Context:
 * Housing Connect listings change frequently as deadlines pass and new developments
 * enter the lottery pipeline. Average lottery odds are 1-2%, making timely
 * notification of new listings valuable to users. The platform has processed
 * over 10 million applications since launch.
 *
 * Historical Note:
 * Before Housing Connect, applicants had to obtain, complete, and mail separate
 * paper applications to each development - often standing in line for hours.
 * The digital transformation of this system represents one of NYC's most
 * successful e-government initiatives.
 */

import { z } from "zod";

/**
 * Main Housing Listing schema.
 *
 * Field specifications:
 * - id: Unique identifier from Housing Connect (required, used for deduplication)
 * - title: Listing name/address shown in notifications (required, min 1 char)
 * - borough: NYC borough where the development is located (required)
 * - neighborhood: Specific neighborhood within the borough (optional)
 * - deadline: Application deadline date (required - critical for user action)
 * - incomeBrackets: Array of AMI percentage ranges the listing accepts (required)
 * - url: Direct link to the Housing Connect listing page (required, validated as URL)
 * - bedrooms: Number of bedrooms in the unit (optional - varies by listing)
 * - rent: Monthly rent amount (optional - not always disclosed before lottery)
 */
export const HousingListingSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  borough: z.string(),
  neighborhood: z.string().optional(),
  deadline: z.date(),
  incomeBrackets: z.array(z.string()),
  url: z.string().url(),
  bedrooms: z.number().optional(),
  rent: z.number().optional(),
});

/**
 * TypeScript type inferred from the Zod schema.
 *
 * Using z.infer ensures type definitions stay in sync with runtime validation.
 * This pattern eliminates the common source of bugs where TypeScript types
 * and runtime validation diverge - a particularly important concern when
 * scraping external data sources that may change without notice.
 */
export type HousingListing = z.infer<typeof HousingListingSchema>;
