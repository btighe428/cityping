// src/app/api/jobs/seed-haiku-events/route.ts
/**
 * Seeds the events database with Haiku-curated NYC events.
 * Haiku analyzes each event to determine optimal alert timing.
 */

import { NextRequest, NextResponse } from "next/server";
import { seedHaikuCuratedEvents } from "@/lib/premium/haiku-events-curator";

export const maxDuration = 120; // 2 min for Haiku calls

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[HaikuEvents Job] Starting seed...");

  try {
    const result = await seedHaikuCuratedEvents();

    console.log(`[HaikuEvents Job] Done: ${result.created} created, ${result.analyzed} analyzed`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      created: result.created,
      analyzed: result.analyzed,
    });
  } catch (error) {
    console.error("[HaikuEvents Job] Failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
