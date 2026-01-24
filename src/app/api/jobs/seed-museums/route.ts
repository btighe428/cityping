// /api/jobs/seed-museums
/**
 * Museum Free Days Seed Job
 *
 * Seeds the database with static museum free day configurations.
 * Run once or when museum schedules change.
 *
 * Schedule: Manual / one-time
 */

import { NextRequest, NextResponse } from "next/server";
import { seedMuseumFreeDays } from "@/lib/scrapers/museums";

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

  try {
    console.log("[Museums Job] Seeding museum free days...");

    const count = await seedMuseumFreeDays();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      seeded: count,
    });
  } catch (error) {
    console.error("[Museums Job] Failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Museum seed failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
