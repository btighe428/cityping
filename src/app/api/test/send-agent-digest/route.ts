// /api/test/send-agent-digest
/**
 * Test endpoint that sends a digest using the full 4-agent pipeline:
 * 1. Robustness Agent - ensures data freshness
 * 2. Data Quality Agent - selects best content
 * 3. Content Editor Agent - ensures human substance
 * 4. LLM Summarizer Agent - generates nano-app subject
 *
 * Usage:
 *   GET /api/test/send-agent-digest?email=you@example.com
 */

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { orchestrateDigest } from "@/lib/agents/agent-orchestrator";
import { editDigestContent, validateContentQuality } from "@/lib/agents/content-editor-agent";
import { type ContentSelection } from "@/lib/agents/data-quality-agent";
import { fetchNYCWeatherForecast } from "@/lib/weather";
import { DateTime } from "luxon";
import type { ContentSelectionV2 } from "@/lib/agents/types";

/**
 * Convert ContentSelectionV2 to legacy ContentSelection format
 * for compatibility with content-editor-agent.
 */
function adaptSelectionV2ToLegacy(selection: ContentSelectionV2): ContentSelection {
  return {
    news: selection.news.map(n => ({
      id: n.id,
      title: n.title,
      score: n.scores.overall,
    })),
    alerts: selection.alerts.map(a => ({
      id: a.id,
      title: a.title ?? "",
      score: a.scores.overall,
    })),
    events: selection.events.map(e => ({
      id: e.id,
      name: e.name, // ParkEvent uses 'name' not 'title'
      score: e.scores.overall,
    })),
    dining: selection.dining.map(d => ({
      id: d.id,
      brand: d.restaurant, // DiningDeal uses 'restaurant' not 'brand'
      score: d.scores.overall,
    })),
    summary: {
      total: selection.summary.totalEvaluated,
      selected: selection.summary.totalSelected,
      totalSelected: selection.summary.totalSelected,
      totalEvaluated: selection.summary.totalEvaluated,
      averageQuality: selection.summary.averageQuality,
      topSources: selection.summary.topSources,
      categories: selection.summary.categoryBreakdown as Record<string, number>,
    },
  };
}

// Build full HTML email with edited content
function buildEditedDigestHtml(content: Awaited<ReturnType<typeof editDigestContent>>, subject: string): string {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  // Hype badge colors
  const hypeBadge = (label: string, score: number) => {
    const colors: Record<string, string> = {
      HOT: "background:#dc2626;color:white",
      "Worth it": "background:#2563eb;color:white",
      Meh: "background:#6b7280;color:white",
    };
    return `<span style="${colors[label] || colors.Meh};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;margin-left:8px;">${label} ${score}</span>`;
  };

  // Indoor badge
  const indoorBadge = (isIndoor: boolean) =>
    isIndoor
      ? '<span style="color:#16a34a;font-size:13px;">✓ Indoor</span>'
      : '<span style="color:#7c3aed;font-size:13px;">☀️ Perfect weather</span>';

  // Weather card
  const weatherCard = `
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:12px;padding:24px;color:white;margin:20px 0;">
      <div style="font-size:36px;font-weight:700;">${content.weather.emoji} ${content.weather.temp}°F — ${content.weather.assessment}</div>
      <div style="font-size:14px;opacity:0.9;margin-top:8px;">${content.weather.details}</div>
    </div>
  `;

  // Commute section
  const commuteSection = content.commute.alerts.length > 0 ? `
    <div style="border-left:4px solid #f59e0b;background:#fef3c7;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
      <div style="font-weight:600;color:#92400e;">🚇 MORNING COMMUTE</div>
      ${content.commute.alerts.map(a => `
        <div style="margin-top:8px;">
          <strong>Alert:</strong> ${a.message}
          ${a.alternative ? `<div style="color:#6b7280;font-size:14px;margin-top:4px;">${a.alternative}</div>` : ""}
        </div>
      `).join("")}
    </div>
  ` : "";

  // Sample sales section
  const sampleSalesSection = content.sampleSales.length > 0 ? `
    <div style="margin:30px 0;">
      <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;">🛍️ Sample Sales</h2>
      ${content.sampleSales.map(sale => `
        <div style="border-bottom:1px solid #e5e7eb;padding:16px 0;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <strong style="font-size:16px;">${sale.brand}</strong>
            ${hypeBadge(sale.hypeLabel, sale.hypeScore)}
          </div>
          <div style="color:#dc2626;font-size:14px;margin-top:4px;">📍 ${sale.location}${sale.address ? `, ${sale.address}` : ""}</div>
          <div style="margin-top:8px;">${sale.highlights}. ${sale.discount}. ${sale.dates}${sale.waitTime ? `. Expect ${sale.waitTime}.` : ""}</div>
          <div style="margin-top:8px;">${indoorBadge(sale.isIndoor)}</div>
        </div>
      `).join("")}
    </div>
  ` : "";

  // Events section
  const eventsSection = content.events.length > 0 ? `
    <div style="margin:30px 0;">
      <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;">🎭 Events</h2>
      ${content.events.map(event => `
        <div style="border-bottom:1px solid #e5e7eb;padding:16px 0;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <strong style="font-size:16px;">${event.name}</strong>
            ${hypeBadge(event.hypeLabel, event.hypeScore)}
          </div>
          <div style="color:#dc2626;font-size:14px;margin-top:4px;">📍 ${event.venue}${event.address ? `, ${event.address}` : ""}</div>
          <div style="margin-top:8px;">${event.description || event.price}. ${event.dateTime}.</div>
          <div style="margin-top:8px;">${indoorBadge(event.isIndoor)}</div>
        </div>
      `).join("")}
    </div>
  ` : "";

  // Housing section
  const housingSection = content.housing.length > 0 ? `
    <div style="margin:30px 0;">
      <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;">🏠 Housing</h2>
      ${content.housing.map(h => `
        <div style="border-bottom:1px solid #e5e7eb;padding:16px 0;">
          <strong>${h.name}</strong>
          <div style="color:#dc2626;font-size:14px;margin-top:4px;">📍 ${h.neighborhood}</div>
          <div style="margin-top:8px;">${h.unitTypes}, ${h.priceRange}. Deadline: ${h.deadline}</div>
        </div>
      `).join("")}
    </div>
  ` : "";

  // News section with "why care" boxes
  const newsSection = content.news.length > 0 ? `
    <div style="margin:30px 0;">
      <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;">📰 NYC News</h2>
      ${content.news.map(story => `
        <div style="margin-bottom:24px;">
          <a href="${story.url}" style="font-size:16px;font-weight:600;color:#1e40af;text-decoration:none;">${story.headline}</a>
          <div style="color:#6b7280;font-size:12px;text-transform:uppercase;margin-top:4px;">${story.source}</div>
          <div style="margin-top:8px;color:#374151;">${story.summary}</div>
          ${story.whyCare ? `
            <div style="background:#fef9c3;border-left:3px solid #eab308;padding:12px;margin-top:12px;border-radius:0 8px 8px 0;">
              <span style="font-size:14px;">💡 <em>${story.whyCare}</em></span>
            </div>
          ` : ""}
        </div>
      `).join("")}
    </div>
  ` : "";

  // CTA section
  const ctaSection = `
    <div style="text-align:center;padding:30px;background:#f9fafb;border-radius:12px;margin:30px 0;">
      <div style="font-size:16px;margin-bottom:8px;">⚡ Get alerts instantly via SMS</div>
      <div style="color:#6b7280;font-size:14px;margin-bottom:16px;">Premium users got these alerts yesterday.</div>
      <a href="${appBaseUrl}/upgrade" style="display:inline-block;background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Upgrade for $7/mo</a>
    </div>
  `;

  // Referral section
  const referralSection = `
    <div style="background:#16a34a;color:white;padding:24px;border-radius:12px;text-align:center;margin:30px 0;">
      <div style="font-size:18px;font-weight:600;">💌 Know someone who'd love this?</div>
      <div style="margin-top:8px;">Share your link and get 1 month free when they subscribe!</div>
      <div style="background:white;color:#16a34a;padding:12px;border-radius:8px;margin-top:16px;font-family:monospace;">${appBaseUrl}/r/NYC-TEST1</div>
    </div>
  `;

  // Footer
  const footer = `
    <div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
      <a href="${appBaseUrl}/preferences" style="color:#6b7280;">Manage preferences</a> ·
      <a href="${appBaseUrl}/unsubscribe" style="color:#6b7280;">Unsubscribe</a>
      <div style="margin-top:8px;">CityPing · The definitive NYC alerts platform</div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:24px;font-weight:700;">🗽 NYC TODAY</div>
        <div style="color:#6b7280;">${content.date}</div>
      </div>

      ${weatherCard}
      ${commuteSection}

      <div style="color:#374151;margin:20px 0;">Here's your NYC rundown for today.</div>

      ${sampleSalesSection}
      ${eventsSection}
      ${housingSection}
      ${newsSection}
      ${ctaSection}
      ${referralSection}
      ${footer}
    </body>
    </html>
  `;
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Email parameter required (e.g., ?email=you@example.com)" },
      { status: 400 }
    );
  }

  try {
    console.log(`[Agent Digest] Running 4-agent pipeline for ${email}...`);

    // 1. Run the orchestrator (Robustness + Data Quality + LLM Summarizer)
    const result = await orchestrateDigest({
      autoHeal: false,
      skipSummarization: false,
    });

    if (!result.success || !result.digest || !result.selection) {
      return NextResponse.json({
        success: false,
        error: "Orchestration failed",
        errors: result.errors,
        warnings: result.warnings,
      }, { status: 500 });
    }

    // 2. Fetch weather for Content Editor
    const forecast = await fetchNYCWeatherForecast();
    const todayWeather = forecast?.days[0];
    const weather = todayWeather ? {
      temp: todayWeather.temperature,
      condition: todayWeather.shortForecast,
      precipChance: todayWeather.probabilityOfPrecipitation || 0,
    } : null;

    // 3. Run Content Editor Agent (using adapter for V2 selection)
    const legacySelection = adaptSelectionV2ToLegacy(result.selection);
    const editedContent = await editDigestContent(legacySelection, weather);

    // 4. Validate quality
    const quality = validateContentQuality(editedContent);
    console.log(`[Agent Digest] Content quality: ${quality.score}/100, passes: ${quality.passes}`);
    if (quality.issues.length > 0) {
      console.log(`[Agent Digest] Quality issues: ${quality.issues.join("; ")}`);
    }

    // 5. Build HTML email
    const html = buildEditedDigestHtml(editedContent, result.digest.subject);

    // 6. Send email with nano-app subject
    const emailResult = await sendEmail({
      to: email,
      subject: result.digest.subject,
      html,
    });

    console.log(`[Agent Digest] Email sent with ID: ${emailResult.id}`);

    return NextResponse.json({
      success: true,
      email,
      emailId: emailResult.id,
      nanoAppSubject: {
        text: result.digest.subject,
        length: result.digest.subject.length,
      },
      contentQuality: {
        score: quality.score,
        passes: quality.passes,
        issues: quality.issues,
        sectionsWithContent: editedContent.qualityReport.sectionsWithContent,
        totalItems: editedContent.qualityReport.totalItems,
        editorNotes: editedContent.qualityReport.editorNotes,
      },
      content: {
        sampleSales: editedContent.sampleSales.length,
        events: editedContent.events.length,
        housing: editedContent.housing.length,
        news: editedContent.news.length,
        newsHeadlines: editedContent.news.slice(0, 3).map(n => n.headline),
      },
      weather: editedContent.weather,
      metrics: {
        totalDuration: `${(result.metrics.totalDuration / 1000).toFixed(2)}s`,
      },
      timestamp: DateTime.now().toISO(),
    });

  } catch (error) {
    console.error("[Agent Digest] Failed:", error);
    return NextResponse.json({
      success: false,
      error: "Internal error",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
