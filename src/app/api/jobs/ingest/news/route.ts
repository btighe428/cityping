// /api/jobs/ingest/news
/**
 * News Scraper Cron Job
 *
 * Scrapes NYC news from three sources:
 * - Gothamist (WNYC)
 * - THE CITY (nonprofit investigative)
 * - Patch (neighborhood-level)
 *
 * Schedule: 5 AM ET daily
 * This runs before the 6 AM curation job and 7 AM email send.
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestAllNewsArticles } from "@/lib/scrapers/news";
import { JobMonitor } from "@/lib/job-monitor";

// Verify cron secret for security
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

  const jobMonitor = await JobMonitor.start("ingest-news");

  try {
    console.log("[News Ingest] Starting news scraper job...");

    const results = await ingestAllNewsArticles();

    await jobMonitor.success({
      itemsProcessed: results.total.created,
      metadata: {
        gothamist: results.gothamist,
        thecity: results.thecity,
        patch: results.patch,
        totalSkipped: results.total.skipped,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        gothamist: results.gothamist,
        thecity: results.thecity,
        patch: results.patch,
        total: results.total,
      },
    });
  } catch (error) {
    console.error("[News Ingest] Job failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "News ingestion failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
