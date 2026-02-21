// /api/jobs/scrape-traffic
/**
 * Traffic Score Cron Job
 *
 * Fetches real-time traffic flow from TomTom API.
 * Calculates friction scores for NYC regions.
 *
 * Schedule: Every 10 minutes during rush hours (6-10am, 4-8pm)
 */

import { NextRequest, NextResponse } from "next/server";
import { syncTrafficScores } from "@/lib/scrapers/traffic";
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

  const jobMonitor = await JobMonitor.start("scrape-traffic");

  try {
    console.log("[Traffic Job] Starting sync...");

    const result = await syncTrafficScores();

    await jobMonitor.success({
      itemsProcessed: result.regions,
      metadata: {
        regions: result.regions,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[Traffic Job] Failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "Traffic score sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
