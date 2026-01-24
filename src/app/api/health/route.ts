/**
 * Health Check API
 *
 * Provides system health status for monitoring dashboards, alerting systems,
 * and uptime monitors (e.g., Pingdom, UptimeRobot, Better Stack).
 *
 * Endpoints:
 *   GET /api/health - Basic health check (for uptime monitors)
 *   GET /api/health?detailed=true - Detailed job status (for dashboards)
 *
 * Returns:
 *   200 - System healthy
 *   503 - System degraded or critical
 */

import { NextRequest, NextResponse } from "next/server";
import { getSystemHealth, checkStaleJobs } from "@/lib/job-monitor";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const detailed = searchParams.get("detailed") === "true";
  const checkStale = searchParams.get("checkStale") === "true";

  try {
    // Optionally check for stale jobs and send alerts
    if (checkStale) {
      await checkStaleJobs();
    }

    const health = await getSystemHealth();

    // For simple uptime monitors, just return status
    if (!detailed) {
      const httpStatus = health.status === "healthy" ? 200 : 503;
      return NextResponse.json(
        {
          status: health.status,
          timestamp: health.lastChecked.toISOString(),
        },
        { status: httpStatus }
      );
    }

    // Detailed response for dashboards
    const httpStatus = health.status === "critical" ? 503 : 200;

    return NextResponse.json(
      {
        status: health.status,
        timestamp: health.lastChecked.toISOString(),
        summary: {
          total: health.jobs.length,
          healthy: health.jobs.filter((j) => j.status === "healthy").length,
          warning: health.jobs.filter((j) => j.status === "warning").length,
          critical: health.jobs.filter((j) => j.status === "critical").length,
          unknown: health.jobs.filter((j) => j.status === "unknown").length,
        },
        jobs: health.jobs.map((job) => ({
          name: job.jobName,
          displayName: job.displayName,
          status: job.status,
          lastRun: job.lastRun?.toISOString() || null,
          lastStatus: job.lastStatus,
          expectedFrequency: job.expectedFrequency,
          missedRuns: job.missedRuns,
          consecutiveFailures: job.consecutiveFailures,
        })),
      },
      { status: httpStatus }
    );
  } catch (error) {
    console.error("[Health] Error checking health:", error);

    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
