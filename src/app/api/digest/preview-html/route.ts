// src/app/api/digest/preview-html/route.ts
/**
 * Returns the actual rendered HTML of the daily digest email.
 * Usage: GET /api/digest/preview-html
 */

import { NextRequest, NextResponse } from "next/server";
import { generateDailyDigest } from "@/lib/agents/daily-digest-orchestrator";
import { buildEnhancedDigestHtml } from "@/lib/email-templates-enhanced";
import { buildPremiumSections } from "@/lib/premium/email-sections";
import { EnhancedSections } from "@/lib/premium/enhanced-sections";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userIdParam = req.nextUrl.searchParams.get("userId");
  const skipClustering = req.nextUrl.searchParams.get("skipClustering") !== "0";

  try {
    // Find a real user ID
    let userId = userIdParam;
    if (!userId) {
      const userWithLocations = await prisma.userSavedLocation.findFirst({
        select: { userId: true },
      });
      if (userWithLocations) {
        userId = userWithLocations.userId;
      } else {
        const anyUser = await prisma.user.findFirst({
          select: { id: true },
        });
        userId = anyUser?.id || "test-user";
      }
    }

    // Generate the digest
    const digest = await generateDailyDigest({
      userId,
      isPremium: true,
      skipClustering,
    });

    // Build premium sections
    let premiumSections = null;
    try {
      premiumSections = await buildPremiumSections(userId, true);
    } catch (e) {
      console.warn("[PreviewHTML] Premium sections failed:", e);
    }

    // Build enhanced data visualizations
    let enhancedSections = null;
    try {
      const [commuteDashboard, citiBikeDashboard, trafficTrends, weatherTimeline, aspCalendar] = await Promise.all([
        EnhancedSections.buildCommuteDashboard(userId),
        EnhancedSections.buildCitiBikeDashboard(userId),
        EnhancedSections.buildTrafficTrendsSection(),
        digest.weather?.forecast
          ? Promise.resolve(EnhancedSections.buildWeatherTimeline(digest.weather.forecast))
          : Promise.resolve(""),
        EnhancedSections.buildASPCalendar(),
      ]);

      enhancedSections = {
        commuteDashboard,
        citiBikeDashboard,
        trafficTrends,
        weatherTimeline,
        aspCalendar,
      };
    } catch (e) {
      console.warn("[PreviewHTML] Enhanced sections failed:", e);
    }

    // Build email HTML
    const html = buildEnhancedDigestHtml(digest, {
      isPremium: true,
      referralCode: "NYC-PREVIEW",
      premiumSections,
      enhancedSections,
    });

    // Return raw HTML
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[PreviewHTML] Error:", error);
    return new NextResponse(
      `<html><body><h1>Error</h1><pre>${String(error)}</pre></body></html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}
