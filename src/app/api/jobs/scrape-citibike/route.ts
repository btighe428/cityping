// /api/jobs/scrape-citibike
/**
 * CitiBike GBFS Sync Cron Job
 *
 * Fetches real-time station availability from CitiBike GBFS feed.
 * Updates bike/dock counts for premium user alerts.
 *
 * Schedule: Every 5 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { syncCitiBikeStations } from "@/lib/scrapers/citibike";
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

  const jobMonitor = await JobMonitor.start("scrape-citibike");

  try {
    console.log("[CitiBike Job] Starting sync...");

    const result = await syncCitiBikeStations();

    await jobMonitor.success({
      itemsProcessed: result.updated,
      metadata: {
        totalStations: result.stations,
        updatedStations: result.updated,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[CitiBike Job] Failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "CitiBike sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
