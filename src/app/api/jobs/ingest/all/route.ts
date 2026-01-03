// src/app/api/jobs/ingest/all/route.ts
/**
 * Combined Data Ingestion Job
 *
 * Runs all data ingestion tasks in a single cron job to work within
 * Vercel Hobby plan limitations (max 2 daily cron jobs).
 *
 * Ingests from:
 * - MTA Subway Alerts
 * - NYC Permitted Events (Open Data)
 * - Housing Connect Lotteries
 * - Sample Sales
 *
 * Schedule: Daily at 8am UTC (3am ET)
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Verify cron secret for authorization
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    console.warn("[Ingest All] CRON_SECRET not set - allowing in development");
    return process.env.NODE_ENV === "development";
  }

  const xCronSecret = request.headers.get("x-cron-secret")?.trim();
  if (xCronSecret === cronSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

/**
 * Call an internal ingestion endpoint
 */
async function runIngestion(
  path: string,
  cronSecret: string
): Promise<{ path: string; status: "success" | "error"; data?: unknown; error?: string }> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        "x-cron-secret": cronSecret,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { path, status: "error", error: data.error || `HTTP ${response.status}` };
    }

    return { path, status: "success", data };
  } catch (error) {
    return {
      path,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET?.trim() || "";
  const startTime = Date.now();

  console.log("[Ingest All] Starting combined ingestion job...");

  // Run all ingestion jobs in parallel
  const results = await Promise.all([
    runIngestion("/api/jobs/ingest/mta-alerts", cronSecret),
    runIngestion("/api/jobs/ingest/nyc-events", cronSecret),
    runIngestion("/api/jobs/ingest/housing-lotteries", cronSecret),
    runIngestion("/api/jobs/ingest/sample-sales", cronSecret),
  ]);

  const duration = Date.now() - startTime;
  const successful = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;

  console.log(
    `[Ingest All] Complete in ${duration}ms: ${successful} succeeded, ${failed} failed`
  );

  // Return summary
  return NextResponse.json({
    duration: `${duration}ms`,
    summary: {
      successful,
      failed,
      total: results.length,
    },
    results,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
