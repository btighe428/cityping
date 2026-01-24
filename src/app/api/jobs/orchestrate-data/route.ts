// src/app/api/jobs/orchestrate-data/route.ts
/**
 * Data Orchestrator CRON Job
 *
 * The master job that ensures ALL data pipelines are robust and fresh.
 * This is the brain of CityPing's data quality system.
 *
 * Responsibilities:
 * 1. Check freshness of all 10 data sources
 * 2. Refresh any stale or missing data
 * 3. Validate data quality post-refresh
 * 4. Report on overall system health
 * 5. Gate email digests on data quality
 *
 * Schedule: Every 30 minutes (0,30 * * * *)
 * This ensures data is always fresh for the next digest window.
 *
 * Modes:
 * - GET: Check status and auto-refresh stale sources
 * - GET ?force=true: Force refresh ALL sources
 * - GET ?sources=news,mta: Refresh specific sources only
 * - GET ?status=true: Status check only, no refresh
 *
 * Response includes:
 * - Per-source health status
 * - Overall system health (healthy/degraded/critical)
 * - Whether system is ready to send digests
 * - Recommendations for fixes
 */

import { NextRequest, NextResponse } from "next/server";
import {
  orchestrateDataRefresh,
  getDataQualityReport,
  checkDataFreshness,
  DATA_SOURCES,
} from "@/lib/data-orchestrator";
import { JobMonitor } from "@/lib/job-monitor";

/**
 * Verify cron secret for authorization
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }
  const xCronSecret = request.headers.get("x-cron-secret")?.trim();
  if (xCronSecret === cronSecret) return true;
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${cronSecret}`) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get("force") === "true";
  const statusOnly = request.nextUrl.searchParams.get("status") === "true";
  const sourcesParam = request.nextUrl.searchParams.get("sources");
  const sources = sourcesParam ? sourcesParam.split(",").map(s => s.trim()) : undefined;

  // Start job monitoring
  const jobMonitor = await JobMonitor.start("orchestrate-data");

  try {
    // Status-only mode: just report current state
    if (statusOnly) {
      const report = await getDataQualityReport();

      await jobMonitor.success({
        itemsProcessed: report.sources.length,
        metadata: {
          mode: "status-only",
          readyForDigest: report.readyForDigest,
          healthySources: report.sources.filter(s => s.healthy).length,
        },
      });

      return NextResponse.json({
        mode: "status",
        ...report,
      });
    }

    // Full orchestration mode
    console.log(`[Orchestrator API] Starting orchestration (force=${force}, sources=${sources?.join(",") || "auto"})`);

    const result = await orchestrateDataRefresh({
      forceRefresh: force,
      sources,
      baseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
      cronSecret: process.env.CRON_SECRET,
    });

    // Log detailed results
    console.log("[Orchestrator API] Results:");
    for (const source of result.sources) {
      const status = source.healthy ? "✓" : "✗";
      const stale = source.isStale ? " [STALE]" : "";
      const threshold = source.isBelowThreshold ? " [LOW]" : "";
      console.log(`  ${status} ${source.name}: ${source.itemCount} items${stale}${threshold}`);
      if (source.errors.length > 0) {
        console.log(`    Errors: ${source.errors.join(", ")}`);
      }
    }

    // Record job completion
    await jobMonitor.success({
      itemsProcessed: result.sources.length,
      itemsFailed: result.summary.failed,
      metadata: {
        duration: result.duration,
        overallHealth: result.overallHealth,
        readyForDigest: result.readyForDigest,
        summary: result.summary,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Orchestrator API] Failed:", error);

    await jobMonitor.fail(error);

    return NextResponse.json(
      {
        success: false,
        error: "Orchestration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
