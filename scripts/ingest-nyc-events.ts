#!/usr/bin/env npx tsx
// scripts/ingest-nyc-events.ts
/**
 * NYC Permitted Events Ingestion Script
 *
 * This script fetches events from NYC Open Data's Permitted Events API and
 * stores them in the database as AlertEvents. It's designed to run as a
 * cron job (daily at 6am as per DATA_STRATEGY.md) or manually for testing.
 *
 * Data Source: NYC Permitted Event Information (dataset tvpp-9vvx)
 * Updated: Daily by NYC agencies
 * Coverage: All permitted events including parades, farmers markets, street
 *           fairs, film shoots, and special events
 *
 * Ingestion Pipeline:
 * 1. Fetch raw events from Socrata API
 * 2. Deduplicate by event_id (API sometimes returns duplicates)
 * 3. Normalize to AlertEvent format
 * 4. Filter out routine/uninteresting events (optional)
 * 5. Upsert to database
 * 6. Update AlertSource lastPolledAt timestamp
 *
 * Usage:
 *   npx tsx scripts/ingest-nyc-events.ts              # Fetch interesting events
 *   npx tsx scripts/ingest-nyc-events.ts --all        # Fetch ALL events (including sports)
 *   npx tsx scripts/ingest-nyc-events.ts --days=30    # Fetch next 30 days only
 *   npx tsx scripts/ingest-nyc-events.ts --borough=Brooklyn  # Filter by borough
 *   npx tsx scripts/ingest-nyc-events.ts --dry-run    # Preview without saving
 *   npx tsx scripts/ingest-nyc-events.ts --verbose    # Show detailed output
 *
 * @module scripts/ingest-nyc-events
 */

import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  fetchInterestingEvents,
  fetchPermittedEvents,
  fetchEventsByBorough,
  normalizePermittedEvents,
  deduplicateEvents,
  filterInterestingEvents,
} from "../src/lib/data-sources/nyc-open-data";

const prisma = new PrismaClient();

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CliOptions {
  includeAll: boolean;
  daysAhead: number;
  borough: string | null;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  const boroughArg = args.find((a) => a.startsWith("--borough="));
  const daysArg = args.find((a) => a.startsWith("--days="));

  return {
    includeAll: args.includes("--all"),
    daysAhead: parseInt(daysArg?.split("=")[1] || "90", 10),
    borough: boroughArg?.split("=")[1] || null,
    dryRun: args.includes("--dry-run"),
    verbose: args.includes("--verbose") || args.includes("-v"),
  };
}

// ============================================================================
// Main Ingestion Logic
// ============================================================================

async function main() {
  const options = parseArgs();

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           NYC Permitted Events Ingestion                     ║
╚══════════════════════════════════════════════════════════════╝

  Mode: ${options.includeAll ? "All events" : "Interesting events only"}
  Days ahead: ${options.daysAhead}
  Borough filter: ${options.borough || "All boroughs"}
  Dry run: ${options.dryRun}
`);

  // Step 1: Ensure the AlertSource exists
  console.log("  [1/6] Checking AlertSource...");

  let source = await prisma.alertSource.findUnique({
    where: { slug: "nyc-permitted-events" },
  });

  if (!source) {
    console.log("  Creating AlertSource: nyc-permitted-events");

    // First ensure the events module exists
    let eventsModule = await prisma.module.findUnique({
      where: { id: "events" },
    });

    if (!eventsModule) {
      console.log("  Creating Module: events");
      eventsModule = await prisma.module.create({
        data: {
          id: "events",
          name: "Events & Culture",
          description: "Parades, farmers markets, festivals, and cultural events across NYC",
          icon: "🎭",
          sortOrder: 1,
        },
      });
    }

    source = await prisma.alertSource.create({
      data: {
        moduleId: "events",
        slug: "nyc-permitted-events",
        name: "NYC Permitted Events",
        frequency: "daily",
        enabled: true,
        config: {
          apiEndpoint: "data.cityofnewyork.us/resource/tvpp-9vvx.json",
          datasetId: "tvpp-9vvx",
          datasetName: "NYC Permitted Event Information",
          updateFrequency: "daily",
        },
      },
    });
  }

  console.log(`  AlertSource ID: ${source.id}`);

  // Step 2: Fetch events from API
  console.log("\n  [2/6] Fetching events from NYC Open Data...");

  let rawEvents;
  if (options.borough) {
    rawEvents = await fetchEventsByBorough(options.borough, options.daysAhead);
  } else if (options.includeAll) {
    rawEvents = await fetchPermittedEvents(options.daysAhead);
  } else {
    rawEvents = await fetchInterestingEvents(options.daysAhead);
  }

  console.log(`  Fetched ${rawEvents.length} raw events`);

  if (rawEvents.length === 0) {
    console.log("\n  No events found. Exiting.");
    return;
  }

  // Step 3: Deduplicate
  console.log("\n  [3/6] Deduplicating events...");

  const dedupedEvents = deduplicateEvents(rawEvents);
  console.log(`  ${rawEvents.length} → ${dedupedEvents.length} after deduplication`);

  // Step 4: Normalize events
  console.log("\n  [4/6] Normalizing events...");

  let normalizedEvents = normalizePermittedEvents(dedupedEvents);

  // Optionally filter out routine events
  if (!options.includeAll) {
    const beforeFilter = normalizedEvents.length;
    normalizedEvents = filterInterestingEvents(normalizedEvents);
    console.log(`  ${beforeFilter} → ${normalizedEvents.length} after filtering`);
  }

  // Log a sample event in verbose mode
  if (options.verbose && normalizedEvents.length > 0) {
    console.log("\n  Sample normalized event:");
    console.log(JSON.stringify(normalizedEvents[0], null, 2));
  }

  // Print summary by event type
  const byType = normalizedEvents.reduce(
    (acc, e) => {
      const type = (e.metadata as Record<string, unknown>).eventType as string || "Unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log("\n  Events by type:");
  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

  // Print summary by borough
  const byBorough = normalizedEvents.reduce(
    (acc, e) => {
      const borough = (e.metadata as Record<string, unknown>).borough as string || "Unknown";
      acc[borough] = (acc[borough] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log("\n  Events by borough:");
  Object.entries(byBorough)
    .sort((a, b) => b[1] - a[1])
    .forEach(([borough, count]) => {
      console.log(`    ${borough}: ${count}`);
    });

  // Step 5: Upsert to database
  console.log("\n  [5/6] Upserting to database...");

  if (options.dryRun) {
    console.log(`  [DRY RUN] Would upsert ${normalizedEvents.length} events`);

    // Print sample titles
    console.log("\n  Sample event titles:");
    normalizedEvents.slice(0, 15).forEach((e) => {
      const date = e.startsAt ? e.startsAt.toLocaleDateString() : "TBD";
      const urgency = (e.metadata as Record<string, unknown>).urgency || "LOW";
      const icon = urgency === "HIGH" ? "🔴" : urgency === "MEDIUM" ? "🟡" : "⚪";
      console.log(`    ${icon} ${date}: ${e.title}`);
    });
  } else {
    // Perform actual upserts
    let created = 0;
    const updated = 0;
    let errors = 0;

    for (const event of normalizedEvents) {
      try {
        await prisma.alertEvent.upsert({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: event.externalId,
            },
          },
          create: {
            sourceId: source.id,
            externalId: event.externalId,
            title: event.title,
            body: event.body,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            neighborhoods: event.neighborhoods,
            metadata: event.metadata as Prisma.InputJsonValue,
            expiresAt: event.endsAt || event.startsAt,
          },
          update: {
            title: event.title,
            body: event.body,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            neighborhoods: event.neighborhoods,
            metadata: event.metadata as Prisma.InputJsonValue,
            expiresAt: event.endsAt || event.startsAt,
          },
        });
        created++; // For simplicity, count all as "processed"
      } catch (error) {
        errors++;
        if (options.verbose) {
          console.error(`  Error upserting event ${event.externalId}:`, error);
        }
      }
    }

    console.log(`  Processed: ${created}`);
    if (errors > 0) {
      console.log(`  Errors: ${errors}`);
    }
  }

  // Step 6: Update source timestamp
  console.log("\n  [6/6] Updating source timestamp...");

  if (!options.dryRun) {
    await prisma.alertSource.update({
      where: { id: source.id },
      data: {
        lastPolledAt: new Date(),
        lastEventAt: normalizedEvents.length > 0 ? new Date() : undefined,
      },
    });
    console.log("  ✅ Source timestamp updated");
  }

  // Final summary
  const highValueCount = normalizedEvents.filter(
    (e) => (e.metadata as Record<string, unknown>).isHighValue
  ).length;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Ingestion Complete                                 ║
╚══════════════════════════════════════════════════════════════╝

  Total events: ${normalizedEvents.length}
  High-value events: ${highValueCount}
  Source: NYC Permitted Event Information
  Dataset: tvpp-9vvx

  Next steps:
  - Run 'npx tsx scripts/demo-v2-digest.ts <email>' to preview in email
  - Set up daily cron job for automatic ingestion
`);
}

// ============================================================================
// Entry Point
// ============================================================================

main()
  .catch((error) => {
    console.error("Ingestion failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
