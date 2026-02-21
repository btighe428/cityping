// /api/jobs/curate-one-thing
/**
 * One Thing To Do Today Curator Cron Job
 *
 * Selects and curates one interesting/obscure event for the day.
 * Uses LLM to generate insider reasoning for why it's special.
 *
 * Schedule: Daily at 5am ET
 */

import { NextRequest, NextResponse } from "next/server";
import { curateOneThing } from "@/lib/premium/one-thing-curator";
import { JobMonitor } from "@/lib/job-monitor";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const xCronSecret = request.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not set - allowing request in development");
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}` || xCronSecret === cronSecret;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobMonitor = await JobMonitor.start("curate-one-thing");

  try {
    console.log("[OneThing Job] Starting curation...");

    const result = await curateOneThing();

    if (result) {
      await jobMonitor.success({
        itemsProcessed: 1,
        metadata: {
          eventId: result.eventId,
          title: result.title,
          category: result.category,
        },
      });

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        curated: {
          eventId: result.eventId,
          title: result.title,
          venue: result.venue,
          neighborhood: result.neighborhood,
          insiderReason: result.insiderReason,
        },
      });
    } else {
      await jobMonitor.success({
        itemsProcessed: 0,
        metadata: {
          reason: "No suitable events found",
        },
      });

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        curated: null,
        message: "No suitable events found for today",
      });
    }
  } catch (error) {
    console.error("[OneThing Job] Failed:", error);
    await jobMonitor.fail(error);
    return NextResponse.json(
      {
        success: false,
        error: "One Thing curation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
