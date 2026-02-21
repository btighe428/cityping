// /api/jobs/scrape-environmental
/**
 * Environmental Data Cron Job (Pollen, UV)
 *
 * Fetches pollen and UV index data from Tomorrow.io/NWS.
 * Powers premium health alerts for sensitive users.
 *
 * Schedule: 3x daily (6am, 12pm, 6pm)
 */

import { NextRequest, NextResponse } from "next/server";
import { syncEnvironmentalData } from "@/lib/scrapers/environmental";
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

  const jobMonitor = await JobMonitor.start("scrape-environmental");

  try {
    console.log("[Environmental Job] Starting sync...");

    const result = await syncEnvironmentalData();

    await jobMonitor.success({
      itemsProcessed: result.pollen + result.uv,
      metadata: {
        pollenReadings: result.pollen,
        uvReadings: result.uv,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[Environmental Job] Failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "Environmental data sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
