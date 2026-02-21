// /api/jobs/scrape-ferry
/**
 * Ferry Alerts Cron Job
 *
 * Fetches real-time ferry service alerts from NYC Ferry and NY Waterway.
 * Covers East River, Rockaway, South Brooklyn, Astoria, and Hudson crossings.
 *
 * Schedule: Every 15 minutes (every-15-min cron)
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestFerryAlerts } from "@/lib/scrapers/ferry";
import { JobMonitor } from "@/lib/job-monitor";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not set - allowing request in development");
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}` || cronSecretHeader === cronSecret;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobMonitor = await JobMonitor.start("scrape-ferry");

  try {
    console.log("[Ferry Job] Starting ferry alerts sync...");

    const result = await ingestFerryAlerts();

    await jobMonitor.success({
      itemsProcessed: result.created,
      metadata: {
        created: result.created,
        skipped: result.skipped,
        deactivated: result.deactivated,
        bySeverity: result.bySeverity,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[Ferry Job] Failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "Ferry alerts sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
