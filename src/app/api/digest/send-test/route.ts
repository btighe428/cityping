// src/app/api/digest/send-test/route.ts
/**
 * Test endpoint for enhanced daily digest email.
 * Usage: GET /api/digest/send-test?email=your@email.com
 */

import { NextRequest, NextResponse } from "next/server";
import { generateDailyDigest, summarizeDigest } from "@/lib/agents/daily-digest-orchestrator";
import { buildEnhancedDigestHtml, buildEnhancedDigestText } from "@/lib/email-templates-enhanced";
import { sendEmail } from "@/lib/resend";
import { buildPremiumSections } from "@/lib/premium/email-sections";
import { EnhancedSections } from "@/lib/premium/enhanced-sections";
import { prisma } from "@/lib/db";

export const maxDuration = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = req.nextUrl.searchParams.get("email");
  const skipClustering = req.nextUrl.searchParams.get("skipClustering") === "1";
  const userIdParam = req.nextUrl.searchParams.get("userId");

  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
  }

  console.log("[DigestSendTest] Generating enhanced digest for", email);

  try {
    // Find a real user ID (for premium sections that need saved locations)
    let userId = userIdParam;
    if (!userId) {
      // Try to find a user with saved locations first
      const userWithLocations = await prisma.userSavedLocation.findFirst({
        select: { userId: true },
      });
      if (userWithLocations) {
        userId = userWithLocations.userId;
      } else {
        // Fall back to any user
        const anyUser = await prisma.user.findFirst({
          select: { id: true },
        });
        userId = anyUser?.id || "test-user";
      }
    }

    console.log("[DigestSendTest] Using userId:", userId);

    // Generate the digest
    const digest = await generateDailyDigest({
      userId,
      isPremium: true, // Show all content for testing
      skipClustering,
    });

    console.log("[DigestSendTest] Summary:");
    console.log(summarizeDigest(digest));

    // Build premium sections
    let premiumSections = null;
    try {
      premiumSections = await buildPremiumSections(userId, true);
      console.log("[DigestSendTest] Premium sections:", premiumSections.sections.length, "sections");
    } catch (e) {
      console.warn("[DigestSendTest] Premium sections failed:", e);
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
      console.log("[DigestSendTest] Enhanced sections built");
    } catch (e) {
      console.warn("[DigestSendTest] Enhanced sections failed:", e);
    }

    // Build email content
    const html = buildEnhancedDigestHtml(digest, {
      isPremium: true,
      referralCode: "NYC-TEST",
      premiumSections,
      enhancedSections,
    });
    const text = buildEnhancedDigestText(digest, premiumSections);

    const dateStr = digest.meta.generatedAt.toFormat("MMMM d");

    // Send email
    const result = await sendEmail({
      to: email,
      subject: `CityPing Daily - ${dateStr}`,
      html,
      text,
    });

    return NextResponse.json({
      success: true,
      emailId: result.id,
      attempts: result.attempts,
      verified: result.verified,
      summary: {
        weather: digest.weather ? `${digest.weather.emoji} ${digest.weather.summary}` : null,
        subjectLine: digest.subjectLine?.full || null,
        horizon: digest.horizon.alerts.length,
        deepDive: digest.deepDive.clusters.length,
        briefing: digest.briefing.items.length,
        agenda: digest.agenda.events.length,
        premiumSections: premiumSections?.sections.length || 0,
        premiumSectionTypes: premiumSections?.sections.map(s => s.type) || [],
        tokensUsed: digest.meta.tokensUsed,
        processingTimeMs: digest.meta.processingTimeMs,
        errors: digest.meta.errors,
        stages: digest.meta.stages,
      },
    });
  } catch (error) {
    console.error("[DigestSendTest] Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
