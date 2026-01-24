/**
 * Emergency Alerts Scraper Job
 *
 * Fetches alerts from Notify NYC emergency management system.
 *
 * Schedule: Every 15 minutes (critical alerts need fast delivery)
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestNotifyNYCAlerts } from "@/lib/scrapers/notify-nyc";
import { JobMonitor } from "@/lib/job-monitor";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const jobMonitor = await JobMonitor.start("scrape-emergency");

  try {
    console.log("[Emergency] Starting Notify NYC scrape...");

    const result = await ingestNotifyNYCAlerts();

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
