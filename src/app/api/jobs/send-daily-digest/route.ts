// src/app/api/jobs/send-daily-digest/route.ts
/**
 * PRODUCTION DAILY DIGEST JOB (HTTP endpoint)
 *
 * Thin wrapper around runDailyDigestJob() for Vercel cron / manual invocation.
 * The actual logic lives in @/lib/jobs/run-daily-digest.
 *
 * Security:
 * - Requires x-cron-secret header (Vercel cron convention)
 * - Also accepts Authorization: Bearer token for backwards compatibility
 */

import { NextRequest, NextResponse } from "next/server";
import { runDailyDigestJob } from "@/lib/jobs/run-daily-digest";
import { acquireJobLock, releaseJobLock } from "@/lib/email-outbox";
import { JobMonitor } from "@/lib/job-monitor";

// Allow up to 120s for LLM calls (horizon + clustering)
export const maxDuration = 120;

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("[DailyDigest] CRON_SECRET not set - allowing in development");
    return process.env.NODE_ENV === "development";
  }

  const xCronSecret = request.headers.get("x-cron-secret");
  if (xCronSecret === cronSecret) return true;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  return false;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lockId = await acquireJobLock("send-daily-digest", 60);
  if (!lockId) {
    console.log("[DailyDigest] Another instance is already running, skipping");
    return NextResponse.json(
      { success: false, reason: "Another instance is already running" },
      { status: 429 }
    );
  }

  const jobMonitor = await JobMonitor.start("send-daily-digest");

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const skipEnhanced = searchParams.get("skipEnhanced") === "true";

  try {
    const result = await runDailyDigestJob({ force, skipEnhanced });

    await jobMonitor.success({
      itemsProcessed: result.digestsSent,
      itemsFailed: result.failed,
      metadata: {
        totalUsers: result.totalUsers,
        skipped: result.skipped,
        mode: result.mode,
      },
    });

    await releaseJobLock("send-daily-digest", lockId);
    return NextResponse.json(result);
  } catch (error) {
    const errorMsg = `Job failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`[DailyDigest] ${errorMsg}`, error);
    await jobMonitor.fail(error);
    await releaseJobLock("send-daily-digest", lockId);
    return NextResponse.json({ success: false, errors: [errorMsg] }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request);
}
