// src/app/api/test-weekly-digest/route.ts
/**
 * Test endpoint for weekly digest - DELETE IN PRODUCTION
 * Usage: GET /api/test-weekly-digest?email=your@email.com
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import {
  yourNYCWeek,
  CityPulseEvent,
  WeekAtGlanceDay,
  YourNYCWeekData,
} from "@/lib/email-templates-v2";
import { generateEditorNote } from "@/lib/ai-copy";
import { DateTime } from "luxon";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
  }

  console.log("[Test Weekly] Starting for", email);

  try {
    const nyNow = DateTime.now().setZone("America/New_York");
    const weekStart = nyNow.startOf("day");
    const weekEnd = weekStart.plus({ days: 7 });

    // Get week range string
    const getWeekRange = (start: DateTime, end: DateTime): string => {
      const startMonth = start.toFormat("MMM");
      const endMonth = end.toFormat("MMM");
      if (startMonth === endMonth) {
        return `${startMonth} ${start.toFormat("d")}-${end.toFormat("d")}`;
      }
      return `${startMonth} ${start.toFormat("d")} - ${endMonth} ${end.toFormat("d")}`;
    };

    // Fetch evergreen events for demo content
    const evergreenEvents = await prisma.evergreenEvent.findMany({
      where: { isActive: true },
      take: 20,
    });

    console.log("[Test Weekly] Found", evergreenEvents.length, "evergreen events");

    // Transform to CityPulseEvent format with mock dates
    const mockEvents: CityPulseEvent[] = evergreenEvents.map((e, i) => ({
      id: e.id,
      title: e.name,
      description: e.insiderContext || undefined,
      startsAt: weekStart.plus({ days: i % 7 }).toJSDate(),
      category: e.category.toLowerCase(),
      insiderScore: 70 + (i % 30),
      tips: e.tips,
    }));

    // Add some action-required items
    const actionRequired: CityPulseEvent[] = mockEvents.slice(0, 3).map((e) => ({
      ...e,
      isActionRequired: true,
      deadlineAt: weekStart.plus({ days: 3 }).toJSDate(),
      ctaUrl: "https://nycping-app.vercel.app",
      ctaText: "SIGN UP",
    }));

    // Group by category
    const byCategory: Record<string, CityPulseEvent[]> = {};
    for (const event of mockEvents) {
      if (!byCategory[event.category]) {
        byCategory[event.category] = [];
      }
      byCategory[event.category].push(event);
    }

    // Build week at a glance
    const categoryIcons: Record<string, string> = {
      culture: "🎭",
      sports: "⚾",
      food: "🍽️",
      civic: "🏛️",
      seasonal: "🎄",
      weather: "🌤️",
      local: "📍",
      transit: "🚇",
    };

    const weekAtGlance: WeekAtGlanceDay[] = [];
    for (let i = 0; i < 7; i++) {
      const day = weekStart.plus({ days: i });
      const dayEvents = mockEvents.filter((e) => {
        if (!e.startsAt) return false;
        return DateTime.fromJSDate(e.startsAt).hasSame(day, "day");
      });

      weekAtGlance.push({
        date: day.toJSDate(),
        dayName: day.toFormat("EEEE"),
        highTemp: 35 + Math.floor(Math.random() * 20),
        weatherIcon: i === 4 ? "❄️" : undefined,
        hasEvents: dayEvents.length > 0,
        eventIcons: Array.from(new Set(dayEvents.map((e) => e.category)))
          .slice(0, 2)
          .map((cat) => categoryIcons[cat] || "•"),
      });
    }

    // Generate editor's note using AI
    console.log("[Test Weekly] Generating editor note...");
    const editorNote = await generateEditorNote(mockEvents, actionRequired);
    console.log("[Test Weekly] Editor note:", editorNote);

    // Build on your radar
    const onYourRadar: CityPulseEvent[] = [
      {
        id: "radar-1",
        title: "Cherry Blossom Peak Bloom",
        description: "Coming late March",
        category: "seasonal",
        insiderScore: 80,
      },
      {
        id: "radar-2",
        title: "NYC Marathon Lottery",
        description: "Opens in 6 weeks",
        category: "sports",
        insiderScore: 85,
      },
      {
        id: "radar-3",
        title: "Governors Island Season",
        description: "May 1 opening",
        category: "local",
        insiderScore: 75,
      },
    ];

    const weekData: YourNYCWeekData = {
      weekRange: getWeekRange(weekStart, weekEnd),
      editorNote,
      weekAtGlance,
      actionRequired,
      thisWeekByCategory: byCategory,
      onYourRadar,
      user: {
        neighborhood: "Brooklyn",
        tier: "free",
      },
    };

    const emailContent = yourNYCWeek(weekData);

    const result = await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json({
      success: true,
      eventCount: mockEvents.length,
      actionRequired: actionRequired.length,
      categories: Object.keys(byCategory),
      editorNote,
      emailId: result.id,
    });
  } catch (error) {
    console.error("[Test Weekly] Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
