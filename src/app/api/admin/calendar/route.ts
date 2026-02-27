import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  category: string;
  source: "city_event" | "parks" | "dining" | "311";
  venue?: string;
  borough?: string;
  url?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month"); // e.g. "2026-02"

    const now = new Date();
    const year = monthParam
      ? parseInt(monthParam.split("-")[0], 10)
      : now.getFullYear();
    const month = monthParam
      ? parseInt(monthParam.split("-")[1], 10) - 1
      : now.getMonth();

    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 1));

    // Query all sources in parallel
    const [cityEvents, parkEvents, diningDeals, serviceAlerts] =
      await Promise.all([
        prisma.cityEvent.findMany({
          where: {
            OR: [
              { startsAt: { gte: startOfMonth, lt: endOfMonth } },
              {
                endsAt: { gte: startOfMonth },
                startsAt: { lt: endOfMonth },
              },
            ],
          },
          orderBy: { startsAt: "asc" },
        }),
        prisma.parkEvent.findMany({
          where: {
            date: { gte: startOfMonth, lt: endOfMonth },
          },
          orderBy: { date: "asc" },
        }),
        prisma.diningDeal.findMany({
          where: {
            OR: [
              {
                startDate: { gte: startOfMonth, lt: endOfMonth },
              },
              {
                endDate: { gte: startOfMonth },
                startDate: { lt: endOfMonth },
              },
              {
                startDate: null,
                isActive: true,
                createdAt: { gte: startOfMonth, lt: endOfMonth },
              },
            ],
          },
          orderBy: { startDate: "asc" },
        }),
        prisma.serviceAlert.findMany({
          where: {
            createdDate: { gte: startOfMonth, lt: endOfMonth },
          },
          orderBy: { createdDate: "desc" },
          take: 200,
        }),
      ]);

    const events: CalendarEvent[] = [];

    for (const e of cityEvents) {
      events.push({
        id: e.id,
        title: e.title,
        date: (e.startsAt ?? e.createdAt).toISOString().split("T")[0],
        endDate: e.endsAt
          ? e.endsAt.toISOString().split("T")[0]
          : undefined,
        category: e.category,
        source: "city_event",
        venue: e.venue ?? undefined,
        borough: e.borough ?? undefined,
        url: e.sourceUrl ?? undefined,
      });
    }

    for (const e of parkEvents) {
      events.push({
        id: e.id,
        title: e.name,
        date: e.date.toISOString().split("T")[0],
        category: "parks",
        source: "parks",
        venue: e.parkName ?? undefined,
        borough: e.borough ?? undefined,
        url: e.url ?? undefined,
      });
    }

    for (const e of diningDeals) {
      events.push({
        id: e.id,
        title: e.title,
        date: e.startDate
          ? e.startDate.toISOString().split("T")[0]
          : e.createdAt.toISOString().split("T")[0],
        endDate: e.endDate
          ? e.endDate.toISOString().split("T")[0]
          : undefined,
        category: "dining",
        source: "dining",
        venue: e.restaurant ?? undefined,
        borough: e.borough ?? undefined,
        url: e.url ?? undefined,
      });
    }

    for (const e of serviceAlerts) {
      events.push({
        id: e.id,
        title: `${e.complaintType}${e.descriptor ? `: ${e.descriptor}` : ""}`,
        date: e.createdDate.toISOString().split("T")[0],
        endDate: e.resolvedDate
          ? e.resolvedDate.toISOString().split("T")[0]
          : undefined,
        category: "civic",
        source: "311",
        venue: e.address ?? undefined,
        borough: e.borough ?? undefined,
      });
    }

    // Count by category
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    }

    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

    return NextResponse.json({ month: monthStr, events, counts });
  } catch (error) {
    console.error("[AdminCalendar] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
