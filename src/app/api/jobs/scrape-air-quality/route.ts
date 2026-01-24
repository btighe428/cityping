// /api/jobs/scrape-air-quality
/**
 * Air Quality Cron Job
 *
 * Fetches AQI data from AirNow API for NYC zip codes.
 * Includes current conditions and forecasts.
 *
 * Schedule: 6am, 12pm, 6pm daily
 */

import { NextRequest, NextResponse } from "next/server";
import { syncAirQuality } from "@/lib/scrapers/air-quality";
import { JobMonitor } from "@/lib/job-monitor";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not set - allowing request in development");
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobMonitor = await JobMonitor.start("scrape-air-quality");

  try {
    console.log("[AirQuality Job] Starting sync...");

    const result = await syncAirQuality();

    await jobMonitor.success({
      itemsProcessed: result.readings,
      metadata: {
        readings: result.readings,
        alerts: result.alerts,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[AirQuality Job] Failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "Air quality sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
