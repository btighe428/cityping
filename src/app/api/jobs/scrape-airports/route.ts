// /api/jobs/scrape-airports
/**
 * FAA Airport Delays Cron Job
 *
 * Fetches delay status for JFK, LGA, EWR from FAA API.
 * Tracks ground delays, ground stops, and travel waivers.
 *
 * Schedule: Every 15 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { syncAirportStatus } from "@/lib/scrapers/faa-airports";
import { JobMonitor } from "@/lib/job-monitor";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const xCronSecret = request.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not set - allowing request in development");
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}` || xCronSecret === cronSecret;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobMonitor = await JobMonitor.start("scrape-airports");

  try {
    console.log("[Airports Job] Starting sync...");

    const result = await syncAirportStatus();

    await jobMonitor.success({
      itemsProcessed: result.airports,
      metadata: {
        airports: result.airports,
        delays: result.delays,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[Airports Job] Failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "Airport status sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
