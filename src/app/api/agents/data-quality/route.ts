/**
 * Data Quality Agent API
 *
 * GET /api/agents/data-quality         - Generate quality report
 * GET /api/agents/data-quality?heal=true - Generate report and auto-heal
 *
 * Schedule: Every 30 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { generateDataQualityReport } from "@/lib/agents/data-quality-agent";

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

  try {
    console.log("[DataQuality] Running data quality check...");

    const report = await generateDataQualityReport();

    // Return status code based on health
    const statusCode = report.overallHealth === "critical" ? 503
      : report.overallHealth === "degraded" ? 207
      : 200;

    return NextResponse.json({
      success: true,
      report: {
        timestamp: report.timestamp,
        overallHealth: report.overallHealth,
        readyForDigest: report.readyForDigest,
        sources: report.sources.map(s => ({
          name: s.sourceName,
          status: s.status,
          successRate: s.successRate24h,
          itemCount: s.itemCount24h,
          issues: s.issues,
        })),
        anomalies: report.anomalies,
        healingActions: report.healingActions,
        stats: {
          healthySources: report.sources.filter(s => s.status === "healthy").length,
          totalSources: report.sources.length,
          staleDataCount: report.staleDataCount,
        },
      },
    }, { status: statusCode });

  } catch (error) {
    console.error("[DataQuality] Error:", error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
