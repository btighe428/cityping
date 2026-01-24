/**
 * Street Closures Scraper Job
 *
 * Fetches street closures, film permits, and construction from NYC Open Data.
 *
 * Schedule: Every 4 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestStreetClosures, fetchRestaurantInspections } from "@/lib/scrapers/nyc-opendata";
import { JobMonitor } from "@/lib/job-monitor";

export const runtime = "nodejs";
export const maxDuration = 120;

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

  const jobMonitor = await JobMonitor.start("scrape-streets");

  try {
    console.log("[Streets] Starting NYC Open Data scrape...");

    // Fetch street closures
    const closures = await ingestStreetClosures();

    // Also fetch restaurant inspections (grade changes)
    const inspections = await fetchRestaurantInspections();
    const gradeChanges = inspections.filter(i => i.grade === "B" || i.grade === "C");

    await jobMonitor.success({
      itemsProcessed: closures.created + gradeChanges.length,
      metadata: {
        streetClosures: closures.created,
        restaurantGradeChanges: gradeChanges.length,
        skipped: closures.skipped,
      },
    });

    return NextResponse.json({
      success: true,
      streetClosures: {
        created: closures.created,
        skipped: closures.skipped,
      },
      restaurantInspections: {
        total: inspections.length,
        gradeChanges: gradeChanges.length,
      },
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
