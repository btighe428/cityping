// /api/jobs/scrape-311
/**
 * NYC 311 Service Alerts Cron Job
 *
 * Fetches high-impact service alerts from NYC Open Data 311 API.
 * Tracks water outages, street closures, gas leaks, and other emergencies.
 *
 * Schedule: Every 4 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { sync311Alerts } from "@/lib/scrapers/nyc-311";
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

  const jobMonitor = await JobMonitor.start("scrape-311");

  try {
    console.log("[311 Job] Starting sync...");

    const result = await sync311Alerts();

    await jobMonitor.success({
      itemsProcessed: result.created || 0,
      metadata: result,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[311 Job] Failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "311 sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
