// /api/jobs/curate-news
/**
 * News Curation Cron Job
 *
 * Uses Claude Haiku to select and synthesize the top 3 NYC news stories.
 * Generates summaries and NYC-angle commentary for each story.
 *
 * Schedule: 6 AM ET daily
 * This runs after the 5 AM news scrape and before the 7 AM email send.
 */

import { NextRequest, NextResponse } from "next/server";
import { curateNewsForDate } from "@/lib/news-curation";
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

  const jobMonitor = await JobMonitor.start("curate-news");

  try {
    // DEBUG: console.log("[News Curation] Starting curation job...");

    const today = new Date();
    const curated = await curateNewsForDate(today);

    await jobMonitor.success({
      itemsProcessed: curated.length,
      metadata: {
        curatedFor: today.toISOString().split("T")[0],
        sources: curated.map((a) => a.source),
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      curatedFor: today.toISOString().split("T")[0],
      articles: curated.map((a) => ({
        id: a.id,
        title: a.title,
        source: a.source,
        summary: a.summary.substring(0, 100) + "...",
      })),
      count: curated.length,
    });
  } catch (error) {
    console.error("[News Curation] Job failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "News curation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
