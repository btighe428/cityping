/**
 * Free Events Scraper Job
 *
 * Fetches free events from Eventbrite for NYC.
 *
 * Schedule: Every 6 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestEventbriteEvents } from "@/lib/scrapers/eventbrite-nyc";
import { JobMonitor } from "@/lib/job-monitor";

export const runtime = "nodejs";
export const maxDuration = 120;

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;

  return (
    authHeader === `Bearer ${secret}` ||
    cronSecret === secret ||
    process.env.NODE_ENV === "development"
  );
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobMonitor = await JobMonitor.start("scrape-events");

  try {
    console.log("[Events] Starting Eventbrite scrape...");

    const result = await ingestEventbriteEvents();

    await jobMonitor.success({
      itemsProcessed: result.created,
      metadata: {
        skipped: result.skipped,
      },
    });

    return NextResponse.json({
      success: true,
      created: result.created,
      skipped: result.skipped,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await jobMonitor.fail(error instanceof Error ? error.message : "Unknown error");

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
