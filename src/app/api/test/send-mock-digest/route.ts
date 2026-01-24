// /api/test/send-mock-digest
/**
 * Test endpoint with properly formatted mock data
 * matching the ideal CityPing digest format
 */

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { prisma } from "@/lib/db";
import {
  buildEnhancedDigestHtml,
  buildEnhancedSubject,
  EnhancedEvent,
} from "@/lib/email-digest-enhanced";
import { MtaAlertInput } from "@/lib/commute-alerts";
import { recurateSummaries } from "@/lib/news-curation";

// Mock data matching the ideal format
const mockEvents: EnhancedEvent[] = [
  // Sample Sales
  {
    id: "ss-1",
    title: "Hermès Sample Sale",
    body: "Birkins, Kelly bags, and silk scarves at 50-70% off. One day only. Expect 3+ hour waits.",
    location: "260 Fifth Avenue, 10th Floor",
    hypeScore: 98,
    hypeFactors: { brandTier: 40, scarcity: 38, ai: 20 },
    venueType: "INDOOR",
    moduleId: "sample-sales",
    moduleName: "Sample Sales",
    moduleIcon: "🛍️",
  },
  {
    id: "ss-2",
    title: "Proenza Schouler Archive Sale",
    body: "PS1 bags, ready-to-wear, shoes. 60-80% off retail.",
    location: "Chelsea Market, 75 9th Ave",
    hypeScore: 82,
    hypeFactors: { brandTier: 32, scarcity: 30, ai: 20 },
    venueType: "INDOOR",
    moduleId: "sample-sales",
    moduleName: "Sample Sales",
    moduleIcon: "🛍️",
  },
  {
    id: "ss-3",
    title: "Peach & Lily K-Beauty Sampling",
    body: "Free samples of Glass Skin serum, Super Reboot mask",
    location: "E 34th St between 5th & 6th Ave",
    hypeScore: 45,
    hypeFactors: { brandTier: 15, scarcity: 15, ai: 15 },
    venueType: "OUTDOOR",
    moduleId: "sample-sales",
    moduleName: "Sample Sales",
    moduleIcon: "🛍️",
  },
  // Events
  {
    id: "ev-1",
    title: "Winter Jazz Fest - Brooklyn",
    body: "Multi-venue jazz festival featuring 100+ artists across 12 venues",
    location: "Various venues in Downtown Brooklyn",
    hypeScore: 76,
    hypeFactors: { brandTier: 28, scarcity: 28, ai: 20 },
    venueType: "INDOOR",
    moduleId: "events",
    moduleName: "Events",
    moduleIcon: "🎭",
  },
  {
    id: "ev-2",
    title: "MoMA Free Friday Nights",
    body: "Free admission 5:30-9pm. Yayoi Kusama: Infinity Mirrors on view.",
    location: "11 W 53rd St",
    hypeScore: undefined,
    venueType: "INDOOR",
    moduleId: "events",
    moduleName: "Events",
    moduleIcon: "🎭",
  },
  // Housing
  {
    id: "ho-1",
    title: "Housing Connect: New Affordable Units in LIC",
    body: "1-3 BR units, $1,200-$2,800/mo. Deadline: Jan 15",
    location: "Long Island City",
    hypeScore: undefined,
    venueType: undefined,
    moduleId: "housing",
    moduleName: "Housing",
    moduleIcon: "🏠",
  },
];

const mockMtaAlerts: MtaAlertInput[] = [
  {
    id: "mta-1",
    routes: ["L"],
    headerText: "L train running with delays due to signal problems at Bedford Ave",
    isPlannedWork: false,
  },
];

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const recurate = request.nextUrl.searchParams.get("recurate") === "true";

  if (!email) {
    return NextResponse.json(
      { error: "Email parameter required (e.g., ?email=you@example.com)" },
      { status: 400 }
    );
  }

  try {
    console.log(`[Test Mock Digest] Sending to ${email}...`);

    // If recurate=true, regenerate summaries with the current (concise) prompt
    if (recurate) {
      console.log("[Test Mock Digest] Re-curating news with concise summaries...");
      const recurated = await recurateSummaries(new Date());
      console.log(`[Test Mock Digest] Re-curated ${recurated.length} articles`);
    }

    const html = await buildEnhancedDigestHtml(mockEvents, mockMtaAlerts, {
      zipCode: "11211", // Williamsburg
      vibePreset: "REGULAR",
      referralCode: "NYC-TEST1",
    });

    const subject = buildEnhancedSubject(mockEvents.length);

    await sendEmail({
      to: email,
      subject: `[TEST] ${subject}`,
      html,
    });

    return NextResponse.json({
      success: true,
      sentTo: email,
      mockDataUsed: true,
      recurated: recurate,
      summary: {
        sampleSales: 3,
        events: 2,
        housing: 1,
        mtaAlerts: 1,
        newsFromDb: recurate ? "re-curated with concise summaries" : "included if curated",
      },
    });
  } catch (error) {
    console.error("[Test Mock Digest] Failed:", error);
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
