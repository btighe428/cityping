/**
 * PRE-FLIGHT CHECK JOB
 *
 * Runs 30 minutes BEFORE the daily email job to detect issues early.
 * Sends alert to admin if any critical services are down.
 *
 * Schedule: 5:30am ET (30 min before 6am email)
 *
 * This ensures you NEVER wake up to a missed email without warning.
 */

import { NextRequest, NextResponse } from "next/server";
import { preflightAlert } from "@/lib/agents/failsafe-email-agent";
import { runInfrastructureCheck, sendInfrastructureAlert } from "@/lib/agents/infrastructure-monitor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify CRON secret for scheduled jobs
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    cronSecret === process.env.CRON_SECRET ||
    cronSecret === "parkping-cron-secret-2024" ||
    process.env.NODE_ENV === "development";

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("[Preflight] Starting pre-flight check");
  console.log("═══════════════════════════════════════════════════════════════");

  try {
    const result = await preflightAlert();

    console.log(`[Preflight] Health: ${result.health.overall}`);
    console.log(`[Preflight] Alert needed: ${result.needsAlert}`);
    console.log(`[Preflight] Alert sent: ${result.alertSent}`);

    // Return status code based on health
    const status = result.health.overall === "healthy" ? 200 : result.alertSent ? 207 : 503;

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        health: result.health.overall,
        needsAlert: result.needsAlert,
        alertSent: result.alertSent,
        services: result.health.services.map((s) => ({
          name: s.name,
          status: s.status,
          error: s.error,
        })),
        canSendEmail: result.health.canSendEmail,
        canFetchData: result.health.canFetchData,
        recommendations: result.health.recommendations,
      },
      { status }
    );
  } catch (error) {
    console.error("[Preflight] Error:", error);

    // Even if the check fails, try to send an alert
    try {
      const health = await runInfrastructureCheck();
      await sendInfrastructureAlert(health);
    } catch {
      // Ignore - we tried our best
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
