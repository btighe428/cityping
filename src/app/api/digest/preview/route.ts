// src/app/api/digest/preview/route.ts
/**
 * ENHANCED DIGEST PREVIEW ENDPOINT
 *
 * Generates a preview of the enhanced daily digest for testing and debugging.
 * Returns either JSON stats or rendered HTML based on query parameters.
 *
 * Usage:
 *   GET /api/digest/preview          - Returns JSON with digest content and stats
 *   GET /api/digest/preview?html=1   - Returns rendered HTML email
 *   GET /api/digest/preview?text=1   - Returns plain text version
 *
 * Query Parameters:
 *   html: If "1" or "true", returns rendered HTML email
 *   text: If "1" or "true", returns plain text version
 *   premium: If "1" or "true", includes premium content
 *   skipClustering: If "1" or "true", skips LLM clustering (faster)
 *   skipHorizon: If "1" or "true", skips horizon alerts
 *
 * Authentication: Requires CRON_SECRET header for production safety.
 * In development (localhost), authentication is bypassed.
 */

import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import {
  generateDailyDigest,
  summarizeDigest,
  isDigestViable,
} from "@/lib/agents/daily-digest-orchestrator";
import {
  buildEnhancedDigestHtml,
  buildEnhancedDigestText,
} from "@/lib/email-templates-enhanced";

export const maxDuration = 60; // Allow up to 60s for LLM calls

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check authentication (bypass in dev)
  const isDev = process.env.NODE_ENV === "development";
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!isDev && cronSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const wantHtml = searchParams.get("html") === "1" || searchParams.get("html") === "true";
    const wantText = searchParams.get("text") === "1" || searchParams.get("text") === "true";
    const isPremium = searchParams.get("premium") === "1" || searchParams.get("premium") === "true";
    const skipClustering = searchParams.get("skipClustering") === "1";
    const skipHorizon = searchParams.get("skipHorizon") === "1";

    // DEBUG: console.log("[DigestPreview] Generating enhanced digest...");
    // DEBUG: console.log(`[DigestPreview] Options: html=${wantHtml}, premium=${isPremium}, skipClustering=${skipClustering}`);

    // Generate the digest
    const digest = await generateDailyDigest({
      userId: "preview-user",
      isPremium,
      skipClustering,
      skipHorizon,
    });

    const summary = summarizeDigest(digest);
    const viable = isDigestViable(digest);

    // DEBUG: console.log("[DigestPreview] Summary:");
    // DEBUG: console.log(summary);

    // Return HTML if requested
    if (wantHtml) {
      const html = buildEnhancedDigestHtml(digest, {
        isPremium,
        referralCode: "NYC-PREVIEW",
      });

      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Return plain text if requested
    if (wantText) {
      const text = buildEnhancedDigestText(digest);

      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Return JSON stats
    const elapsedMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      viable,
      weather: digest.weather ? {
        emoji: digest.weather.emoji,
        summary: digest.weather.summary,
        high: digest.weather.high,
        low: digest.weather.low,
        condition: digest.weather.condition,
      } : null,
      subjectLine: digest.subjectLine ? {
        full: digest.subjectLine.full,
        preheader: digest.subjectLine.preheader,
      } : null,
      summary: {
        horizon: {
          free: digest.horizon.alerts.length,
          premium: digest.horizon.premiumAlerts.length,
          alerts: digest.horizon.alerts.map((a) => ({
            id: a.id,
            title: a.event.shortTitle,
            urgency: a.urgency,
            daysUntil: a.daysUntil,
            message: a.message,
          })),
        },
        deepDive: {
          clusterCount: digest.deepDive.clusters.length,
          clusters: digest.deepDive.clustersForEmail.map((c) => ({
            theme: c.theme,
            headline: c.headline,
            articleCount: c.articleCount,
          })),
        },
        briefing: {
          itemCount: digest.briefing.items.length,
          items: digest.briefing.items.map((i) => ({
            title: i.title,
            category: i.category,
          })),
        },
        agenda: {
          eventCount: digest.agenda.events.length,
          windowDays: digest.agenda.windowDays,
          events: digest.agenda.events.map((e) => ({
            title: e.title,
            date: e.date.toISODate(),
            venue: e.venue,
          })),
        },
        standardContent: {
          newsCount: digest.standardContent.news.length,
          alertCount: digest.standardContent.alerts.length,
        },
      },
      meta: {
        generatedAt: digest.meta.generatedAt.toISO(),
        dayOfWeek: digest.meta.dayOfWeek,
        isWeekend: digest.meta.isWeekend,
        tokensUsed: digest.meta.tokensUsed,
        estimatedCost: `$${digest.meta.estimatedCost.toFixed(4)}`,
        processingTimeMs: digest.meta.processingTimeMs,
        totalTimeMs: elapsedMs,
        errors: digest.meta.errors,
        stages: digest.meta.stages,
      },
    });
  } catch (error) {
    console.error("[DigestPreview] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
