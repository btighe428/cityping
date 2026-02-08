// src/app/api/agents/heal/route.ts
/**
 * SELF-HEALING API ENDPOINT
 *
 * Triggers the robustness agent to:
 * 1. Check all data sources for staleness
 * 2. Automatically refresh any stale sources
 * 3. Verify the data is now fresh
 *
 * Usage:
 *   GET /api/agents/heal           - Check freshness and heal if needed
 *   GET /api/agents/heal?check=true - Check freshness only (no healing)
 *   GET /api/agents/heal?force=true - Force refresh ALL sources
 */

import { NextRequest, NextResponse } from "next/server";
import {
  healStaleData,
  ensureDataReady,
  checkDataFreshness,
} from "@/lib/agents/robustness-agent";
import { DateTime } from "luxon";

export const maxDuration = 300; // 5 minutes max for healing operations

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const checkOnly = searchParams.get("check") === "true";
  const forceAll = searchParams.get("force") === "true";

  const startTime = Date.now();

  try {
    // Check-only mode: just report freshness status
    if (checkOnly) {
      const freshness = await checkDataFreshness();
      const staleCount = freshness.filter(f => f.isStale).length;
      const freshCount = freshness.filter(f => !f.isStale).length;

      return NextResponse.json({
        timestamp: DateTime.now().setZone("America/New_York").toISO(),
        mode: "check",
        summary: {
          total: freshness.length,
          fresh: freshCount,
          stale: staleCount,
          healthPercent: Math.round((freshCount / freshness.length) * 100),
        },
        sources: freshness.map(f => ({
          name: f.name,
          status: f.isStale ? "STALE" : "FRESH",
          hoursOld: f.hoursOld,
          threshold: f.thresholdHours,
          itemCount: f.itemCount,
        })),
        durationMs: Date.now() - startTime,
      });
    }

    // Force mode: refresh ALL sources regardless of freshness
    if (forceAll) {
      console.log("[Heal API] FORCE MODE: Refreshing all data sources...");

      // Mark everything as stale temporarily to trigger full refresh
      const healingActions = await healStaleData();
      const freshness = await checkDataFreshness();

      return NextResponse.json({
        timestamp: DateTime.now().setZone("America/New_York").toISO(),
        mode: "force",
        healingActions: healingActions.map(a => ({
          source: a.sourceId,
          reason: a.reason,
          success: a.success,
          result: a.result,
          durationMs: a.duration,
        })),
        postHealStatus: freshness.map(f => ({
          name: f.name,
          status: f.isStale ? "STILL_STALE" : "FRESH",
          hoursOld: f.hoursOld,
          itemCount: f.itemCount,
        })),
        summary: {
          attempted: healingActions.length,
          succeeded: healingActions.filter(a => a.success).length,
          failed: healingActions.filter(a => !a.success).length,
        },
        durationMs: Date.now() - startTime,
      });
    }

    // Default mode: Check and heal only what's stale
    console.log("[Heal API] Checking freshness and healing stale sources...");
    const result = await ensureDataReady();

    const statusCode = result.ready ? 200 : 207; // 207 = Multi-Status (partial success)

    return NextResponse.json({
      timestamp: DateTime.now().setZone("America/New_York").toISO(),
      mode: "auto-heal",
      ready: result.ready,
      healingActions: result.healingActions.map(a => ({
        source: a.sourceId,
        reason: a.reason,
        success: a.success,
        result: a.result,
        durationMs: a.duration,
      })),
      freshness: result.freshness.map(f => ({
        name: f.name,
        status: f.isStale ? "STALE" : "FRESH",
        hoursOld: f.hoursOld,
        threshold: f.thresholdHours,
        itemCount: f.itemCount,
      })),
      summary: {
        sourcesChecked: result.freshness.length,
        healingAttempted: result.healingActions.length,
        healingSucceeded: result.healingActions.filter(a => a.success).length,
        stillStale: result.freshness.filter(f => f.isStale).length,
      },
      errors: result.errors,
      durationMs: Date.now() - startTime,
    }, { status: statusCode });

  } catch (error) {
    console.error("[Heal API] Error:", error);
    return NextResponse.json({
      error: "Healing operation failed",
      details: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    }, { status: 500 });
  }
}
