// /api/jobs/scrape-parks
/**
 * NYC Parks Events Cron Job
 *
 * Fetches free events from NYC Parks calendar.
 * Includes fitness, nature, sports, arts, and tour events.
 *
 * Schedule: 7am daily
 */

import { NextRequest, NextResponse } from "next/server";
import { syncParksEvents } from "@/lib/scrapers/parks-events";
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

  const jobMonitor = await JobMonitor.start("scrape-parks");

  try {
    console.log("[Parks Job] Starting sync...");

    const result = await syncParksEvents();

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
    console.error("[Parks Job] Failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "Parks sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
