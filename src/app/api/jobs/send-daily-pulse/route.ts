// src/app/api/jobs/send-daily-pulse/route.ts
/**
 * Daily "NYC Today" Email Job
 *
 * Delivers the morning briefing at 7am ET weekdays.
 * 60-second scan: What matters today, don't miss, tonight, look ahead.
 *
 * Schedule: 0 12 * * 1-5 (weekdays at 12:00 UTC = 7am ET)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import { nycToday, NYCTodayData, NYCTodayEvent } from "@/lib/email-templates-v2";
import { DateTime } from "luxon";

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }
  const xCronSecret = request.headers.get("x-cron-secret")?.trim();
  if (xCronSecret === cronSecret) return true;
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${cronSecret}`) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const nyNow = DateTime.now().setZone("America/New_York");
    console.log(`[Daily Pulse] Starting for ${nyNow.toFormat("EEEE, MMMM d")}`);

    // Get all users
    const users = await prisma.user.findMany();
    console.log(`[Daily Pulse] Found ${users.length} users`);

    // Fetch today's alerts from existing modules
    const todayStart = nyNow.startOf("day").toJSDate();
    const todayEnd = nyNow.endOf("day").toJSDate();

    const alertEvents = await prisma.alertEvent.findMany({
      where: {
        startsAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        source: { include: { module: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    // Fetch city events for today
    const cityEvents = await prisma.cityEvent.findMany({
      where: {
        status: { in: ["auto", "published"] },
        startsAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { insiderScore: "desc" },
      take: 10,
    });

    // Build What Matters Today from alerts
    const whatMattersToday: NYCTodayEvent[] = alertEvents
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: e.body?.slice(0, 50) || undefined,
        category: e.source.moduleId,
        isUrgent: e.source.moduleId === "transit",
      }));

    // Find a "Don't Miss" item (deadline today or high-value event)
    const dontMissEvent = cityEvents.find(
      (e) => e.deadlineAt && e.deadlineAt <= todayEnd && e.deadlineAt >= todayStart
    ) || cityEvents[0];

    const dontMiss = dontMissEvent
      ? {
          title: dontMissEvent.title,
          description: dontMissEvent.description || "Don't miss this one.",
          ctaUrl: dontMissEvent.sourceUrl || undefined,
        }
      : undefined;

    // Tonight in NYC - evening events
    const tonightInNYC: NYCTodayEvent[] = cityEvents
      .filter((e) => {
        if (!e.startsAt) return false;
        const hour = DateTime.fromJSDate(e.startsAt).hour;
        return hour >= 17; // 5pm or later
      })
      .slice(0, 3)
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description?.slice(0, 50) || undefined,
        category: e.category.toLowerCase(),
        isFree: e.tags?.includes("free") || false,
      }));

    // Look Ahead - tomorrow and day after
    const lookAhead = [
      {
        day: nyNow.plus({ days: 1 }).toFormat("EEE"),
        forecast: "Check weather app",
        tip: undefined,
      },
      {
        day: nyNow.plus({ days: 2 }).toFormat("EEE"),
        forecast: "Plan accordingly",
        tip: undefined,
      },
    ];

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const todayData: NYCTodayData = {
          date: nyNow.toJSDate(),
          whatMattersToday,
          dontMiss,
          tonightInNYC,
          lookAhead,
          user: {
            neighborhood: user.inferredNeighborhood || undefined,
            tier: user.tier,
          },
        };

        const emailContent = nycToday(todayData);

        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        sent++;
        console.log(`[Daily Pulse] Sent to ${user.email}`);
      } catch (error) {
        console.error(`[Daily Pulse] Failed for ${user.email}:`, error);
        failed++;
      }
    }

    console.log(`[Daily Pulse] Done: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      date: nyNow.toFormat("yyyy-MM-dd"),
      users: users.length,
      sent,
      failed,
      events: {
        alertEvents: alertEvents.length,
        cityEvents: cityEvents.length,
      },
    });
  } catch (error) {
    console.error("[Daily Pulse] Job failed:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
