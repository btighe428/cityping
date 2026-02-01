// src/app/api/test-daily-pulse/route.ts
/**
 * Test endpoint for NYC Today daily email - DELETE IN PRODUCTION
 * Usage: GET /api/test-daily-pulse?email=your@email.com
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import { nycToday, NYCTodayData, NYCTodayEvent, NYCTodayNewsItem } from "@/lib/email-templates-v2";
import { getCuratedNewsForDate } from "@/lib/news-curation";
import { fetchNYCWeatherForecast } from "@/lib/weather";
import { DateTime } from "luxon";

function getWeatherEmoji(forecast: string): string {
  const f = forecast.toLowerCase();
  if (f.includes("snow") || f.includes("flurries")) return "❄️";
  if (f.includes("thunder") || f.includes("storm")) return "⛈️";
  if (f.includes("rain") || f.includes("shower")) return "🌧️";
  if (f.includes("cloud") && f.includes("sun")) return "⛅";
  if (f.includes("cloud") || f.includes("overcast")) return "☁️";
  if (f.includes("fog") || f.includes("mist")) return "🌫️";
  if (f.includes("wind")) return "💨";
  if (f.includes("clear") || f.includes("sunny")) return "☀️";
  return "🌤️";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
  }

  console.log("[Test Daily] Starting for", email);

  try {
    const nyNow = DateTime.now().setZone("America/New_York");

    // Fetch real data in parallel
    const [evergreenEvents, curatedNews, weatherForecast] = await Promise.all([
      prisma.evergreenEvent.findMany({
        where: { isActive: true },
        take: 10,
      }),
      getCuratedNewsForDate(nyNow.toJSDate()),
      fetchNYCWeatherForecast(),
    ]);

    console.log("[Test Daily] Found", evergreenEvents.length, "evergreen events");
    console.log("[Test Daily] Found", curatedNews.length, "curated news stories");

    // Format news for email
    const newsItems: NYCTodayNewsItem[] = curatedNews.map((article) => ({
      id: article.id,
      title: article.title,
      summary: article.summary,
      nycAngle: article.nycAngle || undefined,
      source: article.source,
      url: article.url,
    }));

    // Get real weather if available
    const todayDateStr = nyNow.toISODate();
    const todayWeatherDay = weatherForecast?.days.find(
      (d) => d.date === todayDateStr && !d.name.includes("Night")
    );
    const tonightWeather = weatherForecast?.days.find(
      (d) => d.date === todayDateStr && d.name.includes("Night")
    );

    const weather = todayWeatherDay
      ? {
          high: todayWeatherDay.temperature,
          low: tonightWeather?.temperature || todayWeatherDay.temperature - 10,
          icon: getWeatherEmoji(todayWeatherDay.shortForecast),
          summary: todayWeatherDay.shortForecast,
        }
      : {
          high: 51,
          low: 42,
          icon: "☀️",
          summary: "Sunny",
        };

    // Build essentials grouped by module (new structure)
    const essentials = {
      transit: [
        {
          id: "transit-1",
          title: "L train delays",
          description: "btwn Bedford & 8th Ave til noon",
          category: "transit",
          moduleId: "transit" as const,
          isUrgent: true,
        },
        {
          id: "transit-2",
          title: "Normal service on most lines",
          description: "minor delays possible on 7 train",
          category: "transit",
          moduleId: "transit" as const,
          isUrgent: false,
        },
      ],
      parking: [
        {
          id: "asp-1",
          title: "ASP in effect",
          description: "moved your car?",
          category: "parking",
          moduleId: "parking" as const,
          isUrgent: false,
        },
      ],
      other: [
        {
          id: "sports-1",
          title: "Rangers vs Bruins 7pm",
          description: "clinch playoff spot tonight",
          category: "sports",
          isUrgent: false,
        },
      ],
    };

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
      weather,
      news: newsItems.length > 0 ? newsItems : undefined,
      essentials,
      dontMiss: dontMiss ? {
        title: `${dontMiss.name} registration opens 10am`,
        description: dontMiss.insiderContext?.slice(0, 100) || "Last year sold out in 3 hours. Set an alarm.",
        ctaUrl: dontMiss.sources[0],
        moduleIcon: "🎟️",
      } : {
        title: "Open House NY registration opens 10am",
        description: "Last year sold out in 3 hours. Set an alarm.",
        ctaUrl: "https://ohny.org",
        moduleIcon: "🏛️",
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
        news: newsItems.length,
        essentials: {
          transit: essentials.transit.length,
          parking: essentials.parking.length,
          other: essentials.other.length,
        },
        dontMiss: !!todayData.dontMiss,
        tonightInNYC: tonightInNYC.length,
        lookAhead: lookAhead.length,
      },
      weather: weather.summary,
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
