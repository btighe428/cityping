// /api/test/send-real-digest
/**
 * Test endpoint that sends a REAL digest with actual database data
 * NO MOCK DATA - everything is pulled from live sources
 *
 * This is the definitive test for email quality with real content.
 *
 * Usage:
 *   GET /api/test/send-real-digest?email=you@example.com
 *   GET /api/test/send-real-digest?email=you@example.com&refresh=true (refresh stale data first)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import {
  buildEnhancedDigestHtml,
  buildEnhancedSubject,
  EnhancedEvent,
} from "@/lib/email-digest-enhanced";
import { MtaAlertInput } from "@/lib/commute-alerts";
import { orchestrateDataRefresh, getDataQualityReport } from "@/lib/data-orchestrator";
import { DateTime } from "luxon";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  if (!email) {
    return NextResponse.json(
      { error: "Email parameter required (e.g., ?email=you@example.com)" },
      { status: 400 }
    );
  }

  try {
    console.log(`[Real Digest] Preparing real digest for ${email}...`);

    // Optionally refresh stale data first
    if (refresh) {
      console.log("[Real Digest] Refreshing stale data sources...");
      await orchestrateDataRefresh({ forceRefresh: false });
    }

    // Check data quality
    const report = await getDataQualityReport();
    console.log(`[Real Digest] Data quality: ${report.readyForDigest ? "READY" : "NOT READY"}`);
    if (report.recommendations.length > 0) {
      console.log(`[Real Digest] Recommendations: ${report.recommendations.join("; ")}`);
    }

    const now = DateTime.now().setZone("America/New_York");
    const todayStart = now.startOf("day").toJSDate();
    const todayEnd = now.endOf("day").toJSDate();
    const weekFromNow = now.plus({ days: 7 }).toJSDate();

    // ==========================================================================
    // FETCH REAL DATA FROM DATABASE
    // ==========================================================================

    // 1. Sample Sales (from AlertEvent with hypeScore)
    const sampleSales = await prisma.alertEvent.findMany({
      where: {
        source: { moduleId: "food" },
        startsAt: { gte: todayStart, lte: weekFromNow },
      },
      include: { source: { include: { module: true } } },
      orderBy: { hypeScore: "desc" },
      take: 5,
    });

    // 2. Events (from AlertEvent or CityEvent)
    const events = await prisma.alertEvent.findMany({
      where: {
        source: { moduleId: "events" },
        startsAt: { gte: todayStart, lte: weekFromNow },
      },
      include: { source: { include: { module: true } } },
      orderBy: { startsAt: "asc" },
      take: 5,
    });

    // Also check CityEvent for curated events
    const cityEvents = await prisma.cityEvent.findMany({
      where: {
        status: { in: ["auto", "published"] },
        startsAt: { gte: todayStart, lte: weekFromNow },
      },
      orderBy: { insiderScore: "desc" },
      take: 5,
    });

    // 3. Housing Lotteries
    const housing = await prisma.alertEvent.findMany({
      where: {
        source: { moduleId: "housing" },
        startsAt: { gte: todayStart },
      },
      include: { source: { include: { module: true } } },
      orderBy: { startsAt: "asc" },
      take: 3,
    });

    // 4. MTA Alerts (real-time)
    const mtaAlerts = await prisma.alertEvent.findMany({
      where: {
        source: { moduleId: "transit" },
        createdAt: { gte: now.minus({ hours: 4 }).toJSDate() },
      },
      include: { source: { include: { module: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // ==========================================================================
    // CONVERT TO ENHANCED EVENT FORMAT
    // ==========================================================================

    const enhancedEvents: EnhancedEvent[] = [];

    // Add sample sales
    for (const sale of sampleSales) {
      const metadata = sale.metadata as Record<string, unknown> | null;
      enhancedEvents.push({
        id: sale.id,
        title: sale.title,
        body: sale.body || undefined,
        location: (metadata?.location as string) || (metadata?.venue as string) || undefined,
        hypeScore: sale.hypeScore || undefined,
        venueType: (sale.venueType as "INDOOR" | "OUTDOOR" | "COVERED" | "WEATHER_DEPENDENT") || "INDOOR",
        moduleId: "sample-sales",
        moduleName: "Sample Sales",
        moduleIcon: "🛍️",
      });
    }

    // Add events from AlertEvent
    for (const event of events) {
      const metadata = event.metadata as Record<string, unknown> | null;
      enhancedEvents.push({
        id: event.id,
        title: event.title,
        body: event.body || undefined,
        location: (metadata?.location as string) || (metadata?.venue as string) || undefined,
        hypeScore: event.hypeScore || undefined,
        venueType: (event.venueType as "INDOOR" | "OUTDOOR" | "COVERED" | "WEATHER_DEPENDENT") || undefined,
        moduleId: "events",
        moduleName: "Events",
        moduleIcon: "🎭",
      });
    }

    // Add curated city events
    for (const event of cityEvents) {
      if (enhancedEvents.some(e => e.title === event.title)) continue; // Dedupe
      enhancedEvents.push({
        id: event.id,
        title: event.title,
        body: event.description || undefined,
        location: event.venue || undefined,
        hypeScore: event.insiderScore || undefined,
        venueType: undefined,
        moduleId: "events",
        moduleName: "Events",
        moduleIcon: "🎭",
      });
    }

    // Add housing
    for (const h of housing) {
      const metadata = h.metadata as Record<string, unknown> | null;
      enhancedEvents.push({
        id: h.id,
        title: h.title,
        body: h.body || undefined,
        location: (metadata?.location as string) || (metadata?.neighborhood as string) || undefined,
        hypeScore: undefined,
        venueType: undefined,
        moduleId: "housing",
        moduleName: "Housing",
        moduleIcon: "🏠",
      });
    }

    // Convert MTA alerts to the expected format
    const mtaAlertInputs: MtaAlertInput[] = mtaAlerts.map((alert) => {
      const metadata = alert.metadata as Record<string, unknown> | null;
      return {
        id: alert.id,
        routes: (metadata?.routes as string[]) || [],
        headerText: alert.title,
        isPlannedWork: (metadata?.isPlannedWork as boolean) || false,
      };
    });

    // ==========================================================================
    // BUILD AND SEND EMAIL
    // ==========================================================================

    if (enhancedEvents.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No events found in database",
        dataQuality: report,
        counts: {
          sampleSales: sampleSales.length,
          events: events.length,
          cityEvents: cityEvents.length,
          housing: housing.length,
          mtaAlerts: mtaAlerts.length,
        },
      });
    }

    // Get or create a test referral code
    const testUser = await prisma.user.findFirst();
    let referralCode: string | undefined;
    if (testUser) {
      const referral = await prisma.referral.findFirst({
        where: { referrerId: testUser.id, status: "PENDING" },
      });
      referralCode = referral?.referralCode;
    }

    const html = await buildEnhancedDigestHtml(enhancedEvents, mtaAlertInputs, {
      zipCode: "10001", // Midtown default
      vibePreset: "REGULAR",
      referralCode: referralCode || "NYC-REAL1",
    });

    const subject = buildEnhancedSubject(enhancedEvents.length);

    await sendEmail({
      to: email,
      subject: `[REAL DATA] ${subject}`,
      html,
    });

    return NextResponse.json({
      success: true,
      sentTo: email,
      mockDataUsed: false,
      dataQuality: {
        readyForDigest: report.readyForDigest,
        recommendations: report.recommendations,
      },
      counts: {
        sampleSales: sampleSales.length,
        events: events.length,
        cityEvents: cityEvents.length,
        housing: housing.length,
        mtaAlerts: mtaAlerts.length,
        totalEnhancedEvents: enhancedEvents.length,
      },
      sources: report.sources.map(s => ({
        name: s.name,
        healthy: s.healthy,
        itemCount: s.itemCount,
        isStale: s.isStale,
      })),
    });
  } catch (error) {
    console.error("[Real Digest] Failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send real digest",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
