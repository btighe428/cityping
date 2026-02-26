// src/app/api/admin/dashboard/route.ts
/**
 * Ops Dashboard API
 *
 * Returns system health, job status, email stats, and recent failures
 * for the /admin dashboard UI.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSystemHealth, JOB_CONFIGS } from "@/lib/job-monitor";

// Job category mapping
const JOB_CATEGORIES: Record<string, string> = {
  "ingest-mta-alerts": "scraper",
  "scrape-ferry": "scraper",
  "ingest-nyc-events": "scraper",
  "ingest-sample-sales": "scraper",
  "ingest-housing-lotteries": "scraper",
  "ingest-news": "scraper",
  "scrape-311": "scraper",
  "scrape-air-quality": "scraper",
  "scrape-dining": "scraper",
  "scrape-parks": "scraper",
  "curate-news": "processing",
  "send-daily-pulse": "email",
  "send-day-ahead": "email",
  "send-daily-digest": "email",
  "email-timeslot-morning": "email",
  "email-timeslot-noon": "email",
  "email-timeslot-evening": "email",
};

export async function GET() {
  try {
    const health = await getSystemHealth();

    // Get last run details (duration, items) for each job
    const jobNames = Object.keys(JOB_CONFIGS);
    const lastRuns = await prisma.jobRun.findMany({
      where: {
        jobName: { in: jobNames },
      },
      orderBy: { startedAt: "desc" },
      distinct: ["jobName"],
    });

    const lastRunMap = new Map(lastRuns.map((r) => [r.jobName, r]));

    // Build job list with categories and run details
    const jobs = health.jobs.map((job) => {
      const lastRun = lastRunMap.get(job.jobName);
      return {
        name: job.jobName,
        displayName: job.displayName,
        category: JOB_CATEGORIES[job.jobName] ?? "other",
        status: job.status,
        lastRun: job.lastRun?.toISOString() ?? "",
        lastStatus: job.lastStatus ?? "",
        expectedFrequency: job.expectedFrequency,
        missedRuns: job.missedRuns,
        consecutiveFailures: job.consecutiveFailures,
        durationMs: lastRun?.durationMs ?? 0,
        itemsProcessed: lastRun?.itemsProcessed ?? 0,
        itemsFailed: lastRun?.itemsFailed ?? 0,
      };
    });

    // Email stats for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const emailStats = await prisma.emailOutbox.groupBy({
      by: ["status", "emailType"],
      where: {
        targetDate: { gte: today },
      },
      _count: { _all: true },
    });

    // Aggregate today totals
    const emailToday = { sent: 0, failed: 0, pending: 0, skipped: 0 };
    const byType: Record<string, { sent: number; failed: number; pending: number; skipped: number }> = {};

    for (const row of emailStats) {
      const count = row._count._all;
      const status = row.status as string;
      const type = row.emailType as string;

      if (status === "sent") emailToday.sent += count;
      else if (status === "failed") emailToday.failed += count;
      else if (status === "pending") emailToday.pending += count;
      else if (status === "skipped") emailToday.skipped += count;

      if (!byType[type]) byType[type] = { sent: 0, failed: 0, pending: 0, skipped: 0 };
      if (status === "sent") byType[type].sent += count;
      else if (status === "failed") byType[type].failed += count;
      else if (status === "pending") byType[type].pending += count;
      else if (status === "skipped") byType[type].skipped += count;
    }

    // Recent failures (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailures = await prisma.jobRun.findMany({
      where: {
        status: { in: ["failed", "timeout"] },
        startedAt: { gte: yesterday },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    // Build summary
    const summary = {
      totalJobs: jobs.length,
      healthy: jobs.filter((j) => j.status === "healthy").length,
      warning: jobs.filter((j) => j.status === "warning").length,
      critical: jobs.filter((j) => j.status === "critical").length,
      unknown: jobs.filter((j) => j.status === "unknown").length,
    };

    return NextResponse.json({
      status: health.status,
      updatedAt: new Date().toISOString(),
      summary,
      jobs,
      email: {
        today: emailToday,
        byType,
      },
      recentFailures: recentFailures.map((f) => ({
        jobName: f.jobName,
        errorMessage: f.errorMessage ?? "Unknown error",
        startedAt: f.startedAt.toISOString(),
        durationMs: f.durationMs ?? 0,
      })),
    });
  } catch (error) {
    console.error("[AdminDashboard] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
