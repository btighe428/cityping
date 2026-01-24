/**
 * Multi-Source News Ingestion Job
 *
 * Scrapes all configured NYC news sources in parallel.
 *
 * Usage:
 *   GET /api/jobs/ingest/news-multi              → Scrape all enabled sources
 *   GET /api/jobs/ingest/news-multi?tier=1       → Scrape only Tier 1 (essential)
 *   GET /api/jobs/ingest/news-multi?tier=2       → Scrape only Tier 2 (specialized)
 *   GET /api/jobs/ingest/news-multi?tier=3       → Scrape only Tier 3 (hyperlocal)
 *   GET /api/jobs/ingest/news-multi?sources=gothamist,thecity → Specific sources
 *   GET /api/jobs/ingest/news-multi?stats=true   → Get source statistics only
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 *   x-cron-secret: <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import {
  scrapeAllNewsSources,
  scrapeSourcesByIds,
  scrapeSourcesByTier,
} from "@/lib/scrapers/news/multi-source-scraper";
import { getSourceStats, getEnabledSources } from "@/lib/scrapers/news/sources";
import { JobMonitor } from "@/lib/job-monitor";

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  // Check bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && authHeader.slice(7) === CRON_SECRET) {
    return true;
  }
  // Check x-cron-secret header
  const cronHeader = request.headers.get("x-cron-secret");
  if (cronHeader === CRON_SECRET) {
    return true;
  }
  // Allow in development
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const statsOnly = searchParams.get("stats") === "true";
  const tier = searchParams.get("tier");
  const sourcesParam = searchParams.get("sources");

  // Stats only mode
  if (statsOnly) {
    const stats = getSourceStats();
    const sources = getEnabledSources().map((s) => ({
      id: s.id,
      name: s.name,
      tier: s.tier,
      category: s.category,
      borough: s.borough,
    }));

    return NextResponse.json({
      stats,
      sources,
      timestamp: new Date().toISOString(),
    });
  }

  // Start job monitor
  const jobMonitor = await JobMonitor.start("ingest-news-multi");

  try {
    let result;

    if (sourcesParam) {
      // Scrape specific sources
      const sourceIds = sourcesParam.split(",").map((s) => s.trim());
      console.log(`[NewsMulti] Scraping specific sources: ${sourceIds.join(", ")}`);
      result = await scrapeSourcesByIds(sourceIds);
    } else if (tier) {
      // Scrape by tier
      const tierNum = parseInt(tier, 10) as 1 | 2 | 3;
      if (![1, 2, 3].includes(tierNum)) {
        return NextResponse.json(
          { error: "Invalid tier. Must be 1, 2, or 3." },
          { status: 400 }
        );
      }
      console.log(`[NewsMulti] Scraping Tier ${tierNum} sources`);
      result = await scrapeSourcesByTier(tierNum);
    } else {
      // Scrape all sources
      console.log("[NewsMulti] Scraping all enabled sources");
      result = await scrapeAllNewsSources();
    }

    // Log success
    await jobMonitor.success({
      itemsProcessed: result.totalArticlesCreated,
      metadata: {
        totalSources: result.totalSources,
        successfulSources: result.successfulSources,
        failedSources: result.failedSources,
        totalArticlesFound: result.totalArticlesFound,
        totalArticlesCreated: result.totalArticlesCreated,
        totalArticlesSkipped: result.totalArticlesSkipped,
        durationMs: result.totalDurationMs,
        errors: result.errors.slice(0, 10), // Limit error count in metadata
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalSources: result.totalSources,
        successfulSources: result.successfulSources,
        failedSources: result.failedSources,
        articlesFound: result.totalArticlesFound,
        articlesCreated: result.totalArticlesCreated,
        articlesSkipped: result.totalArticlesSkipped,
        durationMs: result.totalDurationMs,
        durationSec: (result.totalDurationMs / 1000).toFixed(2),
      },
      bySource: result.results.map((r) => ({
        source: r.sourceId,
        name: r.sourceName,
        found: r.articlesFound,
        created: r.articlesCreated,
        skipped: r.articlesSkipped,
        ok: r.errors.length === 0,
      })),
      errors: result.errors.length > 0 ? result.errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await jobMonitor.fail(error);

    console.error("[NewsMulti] Job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
