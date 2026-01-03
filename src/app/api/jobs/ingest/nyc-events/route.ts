// src/app/api/jobs/ingest/nyc-events/route.ts
/**
 * NYC Open Data Events Ingestion Job
 *
 * Fetches permitted events from NYC Open Data (Socrata API) and upserts
 * them into the AlertEvent table. Runs daily to capture new events.
 *
 * Data Source: NYC Permitted Event Information (dataset tvpp-9vvx)
 * - Updated daily by NYC agencies
 * - Contains parades, farmers markets, street fairs, film shoots, etc.
 *
 * Polling Frequency: Daily at 4am ET
 * - Events are posted days/weeks in advance
 * - Daily polling catches new permits promptly
 * - Respects API rate limits (1000 req/hour anonymous)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  fetchInterestingEvents,
  normalizePermittedEvents,
  deduplicateEvents,
  filterInterestingEvents,
} from "@/lib/data-sources/nyc-open-data";

/**
 * Verify cron secret for authorization
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    console.warn("[NYC Events] CRON_SECRET not set - allowing in development");
    return process.env.NODE_ENV === "development";
  }

  const xCronSecret = request.headers.get("x-cron-secret")?.trim();
  if (xCronSecret === cronSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[NYC Events] Starting ingestion...");

    // Fetch interesting events from NYC Open Data (next 90 days)
    const rawEvents = await fetchInterestingEvents(90);
    console.log(`[NYC Events] Fetched ${rawEvents.length} raw events`);

    // Deduplicate by event_id
    const deduped = deduplicateEvents(rawEvents);
    console.log(`[NYC Events] ${deduped.length} after deduplication`);

    // Normalize to our format
    const normalized = normalizePermittedEvents(deduped);

    // Filter out routine sports permits, etc.
    const interesting = filterInterestingEvents(normalized);
    console.log(`[NYC Events] ${interesting.length} interesting events`);

    // Get or create the events source
    let source = await prisma.alertSource.findFirst({
      where: { slug: "nyc-permitted-events" },
    });

    if (!source) {
      // Create the source if it doesn't exist
      const eventsModule = await prisma.module.findFirst({
        where: { id: "events" },
      });

      if (!eventsModule) {
        throw new Error("Events module not found - run seed first");
      }

      source = await prisma.alertSource.create({
        data: {
          slug: "nyc-permitted-events",
          name: "NYC Permitted Events",
          moduleId: "events",
          frequency: "daily",
          config: {
            apiUrl: "https://data.cityofnewyork.us/resource/tvpp-9vvx.json",
            datasetId: "tvpp-9vvx",
          },
        },
      });
    }

    // Upsert events (skip existing by externalId)
    let created = 0;
    let skipped = 0;
    let updated = 0;

    for (const event of interesting) {
      const existing = await prisma.alertEvent.findFirst({
        where: { externalId: event.externalId },
      });

      if (existing) {
        // Update if title or dates changed
        if (
          existing.title !== event.title ||
          existing.startsAt?.getTime() !== event.startsAt?.getTime()
        ) {
          await prisma.alertEvent.update({
            where: { id: existing.id },
            data: {
              title: event.title,
              body: event.body,
              startsAt: event.startsAt,
              endsAt: event.endsAt,
              metadata: event.metadata as Prisma.InputJsonValue,
            },
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await prisma.alertEvent.create({
          data: {
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
        });
        created++;
      }
    }

    // Clean up expired events (ended more than 1 day ago)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deleted = await prisma.alertEvent.deleteMany({
      where: {
        sourceId: source.id,
        OR: [
          { expiresAt: { lt: yesterday } },
          { endsAt: { lt: yesterday } },
        ],
      },
    });

    console.log(
      `[NYC Events] Complete: ${created} created, ${updated} updated, ${skipped} skipped, ${deleted.count} expired removed`
    );

    return NextResponse.json({
      created,
      updated,
      skipped,
      expired: deleted.count,
      total: interesting.length,
    });
  } catch (error) {
    console.error("[NYC Events] Ingestion failed:", error);
    return NextResponse.json(
      {
        error: "Failed to ingest NYC events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
