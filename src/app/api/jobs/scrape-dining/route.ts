// /api/jobs/scrape-dining
/**
 * Dining Deals Cron Job
 *
 * Fetches restaurant deals and openings from Eater NY, The Infatuation.
 * Aggregates and categorizes dining news for the daily digest.
 *
 * Schedule: 8am daily
 */

import { NextRequest, NextResponse } from "next/server";
import { syncDiningDeals } from "@/lib/scrapers/dining-deals";
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

  const jobMonitor = await JobMonitor.start("scrape-dining");

  try {
    console.log("[Dining Job] Starting sync...");

    const result = await syncDiningDeals();

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
    console.error("[Dining Job] Failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "Dining sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
