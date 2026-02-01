// src/app/api/jobs/send-weekly-digest/route.ts
/**
 * Weekly Email Digest Job - "Your NYC Week"
 *
 * Delivers the Sunday morning weekly digest to all users, combining:
 * - CityEvents from the canonical calendar
 * - EvergreenEvents (annual recurring events)
 * - AlertEvents from existing modules (parking, transit, etc.)
 *
 * Architecture:
 * - Queries for all users with email opt-in
 * - Fetches events for the upcoming week
 * - Groups events by category for the template
 * - Identifies action-required items (deadlines within 7 days)
 * - Sends personalized "Your NYC Week" email via Resend
 *
 * Timing Strategy:
 * Scheduled for Sunday 8am ET (13:00 UTC) to deliver with morning coffee.
 * Gives users a 5-minute read to plan their week ahead.
 *
 * Security:
 * - Requires x-cron-secret header (Vercel cron convention)
 * - Scheduled via Vercel cron at 0 13 * * 0 (Sundays at 13:00 UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  yourNYCWeek,
  CityPulseEvent,
  WeekAtGlanceDay,
  YourNYCWeekData,
} from "@/lib/email-templates-v2";
import { generateEditorNote } from "@/lib/ai-copy";
import { DateTime } from "luxon";
import { sendEmailTracked, acquireJobLock, releaseJobLock } from "@/lib/email-outbox";
import { JobMonitor } from "@/lib/job-monitor";

/**
 * Verify cron secret for authorization.
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    console.warn("CRON_SECRET not set - allowing request in development");
    return process.env.NODE_ENV === "development";
  }

  const xCronSecret = request.headers.get("x-cron-secret")?.trim();
  if (xCronSecret === cronSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

/**
 * Get the week range string (e.g., "Jan 19-25")
 */
function getWeekRange(start: DateTime, end: DateTime): string {
  const startMonth = start.toFormat("MMM");
  const endMonth = end.toFormat("MMM");
  const startDay = start.toFormat("d");
  const endDay = end.toFormat("d");

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

/**
 * Map EventCategory to CityPulseEvent category string
 */
function mapCategory(category: string): string {
  return category.toLowerCase();
}

/**
 * Build week at a glance data structure
 */
function buildWeekAtGlance(
  startDate: DateTime,
  eventsByDay: Map<string, CityPulseEvent[]>
): WeekAtGlanceDay[] {
  const days: WeekAtGlanceDay[] = [];
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

  for (let i = 0; i < 7; i++) {
    const day = startDate.plus({ days: i });
    const dayKey = day.toFormat("yyyy-MM-dd");
    const dayEvents = eventsByDay.get(dayKey) || [];

    // Get unique category icons for this day
    const uniqueCategories = Array.from(new Set(dayEvents.map((e) => e.category)));
    const eventIcons = uniqueCategories
      .slice(0, 2)
      .map((cat) => categoryIcons[cat] || "•");

    days.push({
      date: day.toJSDate(),
      dayName: day.toFormat("EEEE"),
      hasEvents: dayEvents.length > 0,
      eventIcons,
      // Weather data would come from a weather API integration
      // For now, leaving undefined - can be added later
    });
  }

  return days;
}

/**
 * GET handler for weekly email digest job.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Acquire distributed lock to prevent concurrent runs
  const lockId = await acquireJobLock("send-weekly-digest", 60);
  if (!lockId) {
    console.log("[Weekly Digest] Another instance is already running, skipping");
    return NextResponse.json(
      { success: false, reason: "Another instance is already running" },
      { status: 429 }
    );
  }

  const jobMonitor = await JobMonitor.start("send-weekly-digest");

  try {
    const nyNow = DateTime.now().setZone("America/New_York");
    const weekStart = nyNow.startOf("day");
    const weekEnd = weekStart.plus({ days: 7 });
    
    // Use Sunday's date for idempotency tracking
    const weekDate = weekStart.toJSDate();
    weekDate.setHours(0, 0, 0, 0);

    console.log(`[Weekly Digest] Processing week: ${getWeekRange(weekStart, weekEnd)}`);

    // Get all users - emailOptInAt is a required field with default(now())
    // so all users have opted in to email at signup
    const users = await prisma.user.findMany();

    console.log(`[Weekly Digest] Found ${users.length} users`);

    // Fetch CityEvents for the upcoming week
    const cityEvents = await prisma.cityEvent.findMany({
      where: {
        status: { in: ["auto", "published"] },
        OR: [
          // Events starting this week
          {
            startsAt: {
              gte: weekStart.toJSDate(),
              lte: weekEnd.toJSDate(),
            },
          },
          // Events with deadlines this week
          {
            deadlineAt: {
              gte: weekStart.toJSDate(),
              lte: weekEnd.toJSDate(),
            },
          },
        ],
      },
      include: {
        evergreen: true,
      },
      orderBy: [{ insiderScore: "desc" }, { startsAt: "asc" }],
    });

    console.log(`[Weekly Digest] Found ${cityEvents.length} city events`);

    // Fetch AlertEvents for the week (parking, transit, etc.)
    const alertEvents = await prisma.alertEvent.findMany({
      where: {
        startsAt: {
          gte: weekStart.toJSDate(),
          lte: weekEnd.toJSDate(),
        },
      },
      include: {
        source: {
          include: { module: true },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    console.log(`[Weekly Digest] Found ${alertEvents.length} alert events`);

    // Fetch evergreen events that might be relevant (check anticipation days)
    const evergreenEvents = await prisma.evergreenEvent.findMany({
      where: {
        isActive: true,
      },
    });

    // Transform CityEvents to CityPulseEvent format
    const pulseEvents: CityPulseEvent[] = cityEvents.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description || e.evergreen?.insiderContext || undefined,
      startsAt: e.startsAt || undefined,
      endsAt: e.endsAt || undefined,
      deadlineAt: e.deadlineAt || undefined,
      category: mapCategory(e.category),
      venue: e.venue || undefined,
      neighborhood: e.neighborhood || undefined,
      insiderScore: e.insiderScore,
      isActionRequired: e.deadlineAt
        ? e.deadlineAt >= weekStart.toJSDate() && e.deadlineAt <= weekEnd.toJSDate()
        : false,
      ctaUrl: e.sourceUrl || undefined,
      tips: e.evergreen?.tips || undefined,
    }));

    // Transform AlertEvents to CityPulseEvent format
    const alertPulseEvents: CityPulseEvent[] = alertEvents.map((e) => {
      // Map module to category
      const moduleToCategory: Record<string, string> = {
        parking: "transit",
        transit: "transit",
        events: "culture",
        housing: "civic",
        food: "food",
        deals: "food",
      };

      return {
        id: e.id,
        title: e.title,
        description: e.body || undefined,
        startsAt: e.startsAt || undefined,
        endsAt: e.endsAt || undefined,
        category: moduleToCategory[e.source.moduleId] || "local",
        insiderScore: 50, // Default score for alert events
      };
    });

    // Combine all events
    const allEvents = [...pulseEvents, ...alertPulseEvents];

    // Group events by day for week at a glance
    const eventsByDay = new Map<string, CityPulseEvent[]>();
    for (const event of allEvents) {
      if (event.startsAt) {
        const dayKey = DateTime.fromJSDate(event.startsAt)
          .setZone("America/New_York")
          .toFormat("yyyy-MM-dd");
        if (!eventsByDay.has(dayKey)) {
          eventsByDay.set(dayKey, []);
        }
        eventsByDay.get(dayKey)!.push(event);
      }
    }

    // Group by category
    const byCategory: Record<string, CityPulseEvent[]> = {};
    for (const event of allEvents) {
      if (!byCategory[event.category]) {
        byCategory[event.category] = [];
      }
      byCategory[event.category].push(event);
    }

    // Sort each category by insider score
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].sort((a, b) => b.insiderScore - a.insiderScore);
    }

    // Identify action-required events (deadlines this week)
    const actionRequired = allEvents
      .filter((e) => e.isActionRequired && e.deadlineAt)
      .sort((a, b) => {
        if (!a.deadlineAt || !b.deadlineAt) return 0;
        return a.deadlineAt.getTime() - b.deadlineAt.getTime();
      });

    // Build "On Your Radar" - future events beyond this week
    const futureEvents = await prisma.cityEvent.findMany({
      where: {
        status: { in: ["auto", "published"] },
        startsAt: {
          gt: weekEnd.toJSDate(),
          lte: weekEnd.plus({ days: 60 }).toJSDate(),
        },
        insiderScore: { gte: 70 }, // Only high-value future events
      },
      include: {
        evergreen: true,
      },
      orderBy: { startsAt: "asc" },
      take: 5,
    });

    const onYourRadar: CityPulseEvent[] = futureEvents.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.startsAt
        ? `Coming ${DateTime.fromJSDate(e.startsAt).setZone("America/New_York").toFormat("MMM d")}`
        : undefined,
      category: mapCategory(e.category),
      insiderScore: e.insiderScore,
    }));

    // Generate editor's note based on the week's highlights using AI
    const editorNote = await generateEditorNote(allEvents, actionRequired);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const weekData: YourNYCWeekData = {
          weekRange: getWeekRange(weekStart, weekEnd),
          editorNote,
          weekAtGlance: buildWeekAtGlance(weekStart, eventsByDay),
          actionRequired: actionRequired.slice(0, 5),
          thisWeekByCategory: byCategory,
          onYourRadar,
          user: {
            neighborhood: user.inferredNeighborhood || undefined,
            tier: user.tier,
          },
        };

        const email = yourNYCWeek(weekData);

        // Send with idempotency tracking
        const result = await sendEmailTracked(
          {
            to: user.email,
            subject: email.subject,
            html: email.html,
            text: email.text,
          },
          "weekly_digest",
          weekDate,
          {
            userId: user.id,
            tier: user.tier,
          }
        );

        if (result.alreadySent) {
          skipped++;
          console.log(`[Weekly Digest] Skipped duplicate for ${user.email}`);
        } else if (result.success) {
          sent++;
          console.log(`[Weekly Digest] Sent to ${user.email}`);
        } else {
          failed++;
          console.error(`[Weekly Digest] Failed for ${user.email}: ${result.error}`);
        }
      } catch (error) {
        console.error(`[Weekly Digest] Failed to send to ${user.email}:`, error);
        failed++;
      }
    }

    console.log(
      `[Weekly Digest] Completed: ${users.length} users, ${sent} sent, ${skipped} skipped, ${failed} failed`
    );

    await jobMonitor.success({
      itemsProcessed: sent,
      itemsFailed: failed,
      metadata: {
        skipped,
        weekRange: getWeekRange(weekStart, weekEnd),
      },
    });

    await releaseJobLock("send-weekly-digest", lockId);

    return NextResponse.json({
      weekRange: getWeekRange(weekStart, weekEnd),
      users: users.length,
      sent,
      skipped,
      failed,
      events: {
        cityEvents: cityEvents.length,
        alertEvents: alertEvents.length,
        actionRequired: actionRequired.length,
      },
    });
  } catch (error) {
    console.error("[Weekly Digest] Job failed:", error);
    await jobMonitor.fail(error);
    await releaseJobLock("send-weekly-digest", lockId);
    return NextResponse.json(
      {
        error: "Job failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - alias to GET for flexibility.
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
