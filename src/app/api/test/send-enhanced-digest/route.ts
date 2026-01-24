// /api/test/send-enhanced-digest
/**
 * Test endpoint to send the full CityPing enhanced digest with:
 * - Weather header
 * - Morning commute alerts
 * - Sample sales with hype scores
 * - Events
 * - Housing
 * - NYC News (curated)
 * - Feedback links
 * - Referral CTA
 */

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { prisma } from "@/lib/db";
import {
  buildEnhancedDigestHtml,
  buildEnhancedSubject,
  EnhancedEvent,
} from "@/lib/email-digest-enhanced";
import { ingestAllNewsArticles } from "@/lib/scrapers/news";
import { curateNewsForDate } from "@/lib/news-curation";
import { MtaAlertInput } from "@/lib/commute-alerts";
import { VenueType } from "@/lib/weather-scoring";

export async function GET(request: NextRequest) {
  // Only allow in development or with special header
  const isTest = request.headers.get("x-test-mode") === "true";
  if (process.env.NODE_ENV !== "development" && !isTest) {
    return NextResponse.json(
      { error: "Test endpoint only available in development" },
      { status: 403 }
    );
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "Email parameter required (e.g., ?email=you@example.com)" },
      { status: 400 }
    );
  }

  const skipScrape = request.nextUrl.searchParams.get("skipScrape") === "true";
  const skipCuration = request.nextUrl.searchParams.get("skipCuration") === "true";

  try {
    console.log(`[Test Enhanced Digest] Preparing email for ${email}...`);

    // Step 1: Scrape news (unless skipped)
    if (!skipScrape) {
      console.log("[Test Enhanced Digest] Scraping news...");
      const scrapeResults = await ingestAllNewsArticles();
      console.log(`[Test Enhanced Digest] Scraped ${scrapeResults.total.created} new articles`);
    }

    // Step 2: Curate news (unless skipped)
    if (!skipCuration) {
      console.log("[Test Enhanced Digest] Curating news...");
      const curationResults = await curateNewsForDate(new Date());
      console.log(`[Test Enhanced Digest] Curated ${curationResults.length} articles`);
    }

    // Step 3: Fetch events from database (sample sales, events, housing)
    const events = await prisma.alertEvent.findMany({
      where: {
        OR: [
          { expiresAt: { gte: new Date() } },
          { expiresAt: null },
        ],
      },
      include: {
        source: {
          include: { module: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Filter to relevant modules (module.id is the slug like "sample-sales")
    const relevantModuleIds = ["sample-sales", "events", "housing"];
    const filteredEvents = events.filter((e) =>
      relevantModuleIds.includes(e.source.module.id)
    );

    // Transform to EnhancedEvent format
    const enhancedEvents: EnhancedEvent[] = filteredEvents.map((e) => {
      const metadata = e.metadata as Record<string, unknown> | null;
      const venueTypeRaw = e.venueType as string | null;
      let venueType: VenueType | undefined;
      if (venueTypeRaw === "INDOOR" || venueTypeRaw === "OUTDOOR") {
        venueType = venueTypeRaw;
      }

      return {
        id: e.id,
        title: e.title,
        body: e.body || undefined,
        location: metadata?.location as string | undefined,
        hypeScore: e.hypeScore || undefined,
        hypeFactors: e.hypeFactors as { brandTier: number; scarcity: number; ai: number } | undefined,
        venueType,
        moduleId: e.source.module.id,
        moduleName: e.source.module.name,
        moduleIcon: getModuleIcon(e.source.module.id),
      };
    });

    // Step 4: Fetch MTA alerts for commute section
    const mtaAlerts = await prisma.alertEvent.findMany({
      where: {
        source: { slug: "mta-subway-alerts" },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      take: 10,
    });

    const mtaAlertInputs: MtaAlertInput[] = mtaAlerts.map((a) => {
      const metadata = a.metadata as Record<string, unknown> | null;
      return {
        id: a.id,
        routes: (metadata?.affectedLines as string[]) || [],
        headerText: a.title,
        isPlannedWork: false,
      };
    });

    // Step 5: Build and send the digest
    const html = await buildEnhancedDigestHtml(enhancedEvents, mtaAlertInputs, {
      zipCode: "11211", // Williamsburg for testing
      vibePreset: "REGULAR",
      referralCode: "TEST123",
    });

    const subject = buildEnhancedSubject(enhancedEvents.length);

    await sendEmail({
      to: email,
      subject: `[TEST] ${subject}`,
      html,
    });

    return NextResponse.json({
      success: true,
      sentTo: email,
      summary: {
        eventsCount: enhancedEvents.length,
        mtaAlertsCount: mtaAlertInputs.length,
        eventsByModule: enhancedEvents.reduce((acc, e) => {
          acc[e.moduleName] = (acc[e.moduleName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error("[Test Enhanced Digest] Failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function getModuleIcon(slug: string): string {
  const icons: Record<string, string> = {
    "sample-sales": "🛍️",
    events: "🎭",
    housing: "🏠",
    transit: "🚇",
    parking: "🚗",
  };
  return icons[slug] || "📌";
}
