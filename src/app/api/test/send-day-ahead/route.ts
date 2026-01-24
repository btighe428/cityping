// /api/test/send-day-ahead
/**
 * Test endpoint to send a day-ahead email with news to a specific address.
 * Only works in development mode.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { fetchDayAheadData, generateDayAheadEmailHtml } from "@/lib/day-ahead";
import { ingestAllNewsArticles } from "@/lib/scrapers/news";
import { curateNewsForDate } from "@/lib/news-curation";

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
    console.log(`[Test Day Ahead] Preparing email for ${email}...`);

    // Step 1: Scrape news (unless skipped)
    let scrapeResults = null;
    if (!skipScrape) {
      console.log("[Test Day Ahead] Scraping news...");
      scrapeResults = await ingestAllNewsArticles();
      console.log(`[Test Day Ahead] Scraped ${scrapeResults.total.created} new articles`);
    }

    // Step 2: Curate news (unless skipped)
    let curationResults = null;
    if (!skipCuration) {
      console.log("[Test Day Ahead] Curating news...");
      curationResults = await curateNewsForDate(new Date());
      console.log(`[Test Day Ahead] Curated ${curationResults.length} articles`);
    }

    // Step 3: Fetch day-ahead data (includes curated news)
    const dayAheadData = await fetchDayAheadData();

    if (!dayAheadData) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch day-ahead data",
      }, { status: 500 });
    }

    console.log(`[Test Day Ahead] Data ready: ${dayAheadData.news.length} news articles`);

    // Step 4: Generate and send email
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3001";
    const { subject, html, text } = generateDayAheadEmailHtml(
      dayAheadData,
      `${baseUrl}/dashboard`
    );

    await sendEmail({
      to: email,
      subject: `[TEST] ${subject}`,
      html,
      text,
    });

    return NextResponse.json({
      success: true,
      sentTo: email,
      date: dayAheadData.date,
      displayDate: dayAheadData.displayDate,
      summary: {
        asp: dayAheadData.summary.aspSummary,
        canSkipShuffle: dayAheadData.summary.canSkipShuffle,
        weather: dayAheadData.weather?.shortForecast || null,
        newsCount: dayAheadData.news.length,
        newsTitles: dayAheadData.news.map(n => n.title),
      },
      scrape: scrapeResults ? {
        created: scrapeResults.total.created,
        skipped: scrapeResults.total.skipped,
      } : "skipped",
      curation: curationResults ? {
        count: curationResults.length,
        articles: curationResults.map(a => a.title.substring(0, 50)),
      } : "skipped",
    });
  } catch (error) {
    console.error("[Test Day Ahead] Failed:", error);
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
