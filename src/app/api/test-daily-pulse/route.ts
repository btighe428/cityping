// src/app/api/test-daily-pulse/route.ts
/**
 * Test endpoint for NYC Today daily email - DELETE IN PRODUCTION
 * Usage: GET /api/test-daily-pulse?email=your@email.com
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import { nycToday, NYCTodayData, NYCTodayEvent } from "@/lib/email-templates-v2";
import { DateTime } from "luxon";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
  }

  console.log("[Test Daily] Starting for", email);

  try {
    const nyNow = DateTime.now().setZone("America/New_York");

    // Fetch some evergreen events for realistic content
    const evergreenEvents = await prisma.evergreenEvent.findMany({
      where: { isActive: true },
      take: 10,
    });

    console.log("[Test Daily] Found", evergreenEvents.length, "evergreen events");

    // What Matters Today - transit, parking, urgent
    const whatMattersToday: NYCTodayEvent[] = [
      {
        id: "asp-1",
        title: "ASP in effect",
        description: "moved your car?",
        category: "transit",
        isUrgent: false,
      },
      {
        id: "transit-1",
        title: "L train delays",
        description: "btwn Bedford & 8th Ave til noon",
        category: "transit",
        isUrgent: true,
      },
      {
        id: "sports-1",
        title: "Rangers vs Bruins 7pm",
        description: "clinch playoff spot tonight",
        category: "sports",
        isUrgent: false,
      },
    ];

    // Don't Miss - one urgent signup or deadline
    const dontMiss = evergreenEvents.find(e =>
      e.name.toLowerCase().includes("open house") ||
      e.name.toLowerCase().includes("marathon")
    );

    // Tonight in NYC
    const tonightInNYC: NYCTodayEvent[] = [
      {
        id: "tonight-1",
        title: "MoMA after 5:30",
        description: "it's Friday eve, close enough",
        category: "culture",
        isFree: true,
      },
      {
        id: "tonight-2",
        title: "Jazz at Smalls, 10pm",
        description: "no cover if you eat",
        category: "culture",
        price: "$25",
      },
      {
        id: "tonight-3",
        title: "Comedy at the Stand",
        description: "late show has surprise drop-ins",
        category: "culture",
        price: "$20",
      },
    ];

    // Look Ahead
    const lookAhead = [
      {
        day: "Sat",
        forecast: "High 55°",
        tip: "perfect for the Highline",
      },
      {
        day: "Sun",
        forecast: "Rain by 4pm",
        tip: "morning plans only",
      },
    ];

    const todayData: NYCTodayData = {
      date: nyNow.toJSDate(),
      weather: {
        high: 51,
        low: 42,
        icon: "☀️",
        summary: "Sunny",
      },
      whatMattersToday,
      dontMiss: dontMiss ? {
        title: `${dontMiss.name} registration opens 10am`,
        description: dontMiss.insiderContext?.slice(0, 100) || "Last year sold out in 3 hours. Set an alarm.",
        ctaUrl: dontMiss.sources[0],
      } : {
        title: "Open House NY registration opens 10am",
        description: "Last year sold out in 3 hours. Set an alarm.",
        ctaUrl: "https://ohny.org",
      },
      tonightInNYC,
      lookAhead,
      user: {
        neighborhood: "Brooklyn",
        tier: "free",
      },
    };

    const emailContent = nycToday(todayData);

    const result = await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json({
      success: true,
      sections: {
        whatMattersToday: whatMattersToday.length,
        dontMiss: !!todayData.dontMiss,
        tonightInNYC: tonightInNYC.length,
        lookAhead: lookAhead.length,
      },
      emailId: result.id,
    });
  } catch (error) {
    console.error("[Test Daily] Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
