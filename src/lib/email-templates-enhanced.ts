// src/lib/email-templates-enhanced.ts
/**
 * ENHANCED EMAIL TEMPLATE BUILDER
 *
 * Magazine-style email template for the enhanced daily digest with:
 * - THE HORIZON: Proactive alerts from NYC knowledge base
 * - THE DEEP DIVE: Clustered story analysis
 * - THE BRIEFING: Quick-hit alerts and news
 * - THE AGENDA: Upcoming events
 *
 * Design Philosophy:
 * - Edward Tufte principles: maximize data-ink ratio, clear hierarchy
 * - Mobile-responsive with inline styles for email client compatibility
 * - Urgency colors: Red (high), Orange (medium), Blue (low)
 * - Section headers with distinct visual treatments
 */

import { DateTime } from "luxon";
import type {
  DailyDigestContent,
  HorizonAlert,
  BriefingItem,
  AgendaEvent,
} from "./agents/daily-digest-orchestrator";
import type { ClusterForEmail } from "./agents/clustering-agent";

// =============================================================================
// HTML UTILITIES
// =============================================================================

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format a DateTime for display.
 */
function formatDate(dt: DateTime): string {
  return dt.toFormat("EEEE, MMMM d");
}

/**
 * Format a DateTime with time.
 */
function formatDateTime(dt: DateTime): string {
  return dt.toFormat("EEE, MMM d 'at' h:mm a");
}

// =============================================================================
// STYLE CONSTANTS
// =============================================================================

const COLORS = {
  primary: "#1e3a5f", // Dark blue for headers
  secondary: "#4b5563", // Gray for body text
  accent: "#2563eb", // Blue accent
  urgencyHigh: "#dc2626", // Red
  urgencyMedium: "#ea580c", // Orange
  urgencyLow: "#2563eb", // Blue
  background: "#f8fafc", // Light gray background
  white: "#ffffff",
  border: "#e2e8f0",
  muted: "#6b7280",
};

const FONTS = {
  system:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

// =============================================================================
// SECTION BUILDERS
// =============================================================================

/**
 * Build THE HORIZON section - proactive alerts from knowledge base.
 */
function buildHorizonSection(
  alerts: HorizonAlert[],
  premiumAlerts: HorizonAlert[],
  isPremium: boolean
): string {
  if (alerts.length === 0 && premiumAlerts.length === 0) {
    return "";
  }

  const alertItems = alerts
    .map((alert) => {
      const urgencyColor =
        alert.urgency === "high"
          ? COLORS.urgencyHigh
          : alert.urgency === "medium"
            ? COLORS.urgencyMedium
            : COLORS.urgencyLow;

      const daysLabel =
        alert.daysUntil === 0
          ? "TODAY"
          : alert.daysUntil === 1
            ? "TOMORROW"
            : `In ${alert.daysUntil} days`;

      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid ${COLORS.border};">
            <div style="display: flex; align-items: center;">
              <span style="font-size: 20px; margin-right: 12px;">${escapeHtml(alert.event.icon)}</span>
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">
                  ${escapeHtml(alert.event.shortTitle)}
                  <span style="
                    background: ${urgencyColor};
                    color: white;
                    font-size: 10px;
                    font-weight: 600;
                    padding: 2px 6px;
                    border-radius: 4px;
                    margin-left: 8px;
                    text-transform: uppercase;
                  ">${daysLabel}</span>
                </div>
                <div style="font-size: 13px; color: ${COLORS.secondary}; line-height: 1.5;">
                  ${escapeHtml(alert.message)}
                </div>
                ${
                  alert.event.actionUrl
                    ? `<a href="${escapeHtml(alert.event.actionUrl)}" style="font-size: 12px; color: ${COLORS.accent}; text-decoration: none;">Learn more &rarr;</a>`
                    : ""
                }
              </div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  // Premium teaser if user is not premium and there are premium alerts
  const premiumTeaser =
    !isPremium && premiumAlerts.length > 0
      ? `
        <tr>
          <td style="padding: 12px; background: #fef3c7; border-radius: 6px; margin-top: 12px;">
            <div style="font-size: 13px; color: #92400e;">
              <strong>+${premiumAlerts.length} more alerts</strong> available for premium subscribers
              (tax deadlines, Broadway deals, and more)
            </div>
          </td>
        </tr>
      `
      : "";

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="
        color: ${COLORS.primary};
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 3px solid ${COLORS.urgencyHigh};
      ">
        THE HORIZON
      </h2>
      <p style="font-size: 13px; color: ${COLORS.muted}; margin: 0 0 16px 0;">
        What's coming up that you should know about
      </p>
      <table style="width: 100%; border-collapse: collapse;">
        ${alertItems}
        ${premiumTeaser}
      </table>
    </div>
  `;
}

/**
 * Build THE DEEP DIVE section - clustered story analysis.
 */
function buildDeepDiveSection(clusters: ClusterForEmail[]): string {
  if (clusters.length === 0) {
    return "";
  }

  const clusterItems = clusters
    .map((cluster, index) => {
      const relatedList =
        cluster.relatedTitles.length > 0
          ? `
          <div style="margin-top: 8px; padding-left: 12px; border-left: 2px solid ${COLORS.border};">
            <div style="font-size: 11px; color: ${COLORS.muted}; text-transform: uppercase; margin-bottom: 4px;">
              ${cluster.articleCount} related stories
            </div>
            ${cluster.relatedTitles
              .map(
                (title) => `
              <div style="font-size: 12px; color: ${COLORS.secondary}; margin-bottom: 2px;">
                &bull; ${escapeHtml(title)}
              </div>
            `
              )
              .join("")}
          </div>
        `
          : "";

      return `
        <div style="
          margin-bottom: 20px;
          padding: 16px;
          background: ${index === 0 ? "#f0f9ff" : COLORS.white};
          border: 1px solid ${index === 0 ? "#bae6fd" : COLORS.border};
          border-radius: 8px;
        ">
          <div style="font-size: 11px; color: ${COLORS.accent}; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">
            ${escapeHtml(cluster.theme)}
          </div>
          <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #111827; line-height: 1.3;">
            ${escapeHtml(cluster.headline)}
          </h3>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: ${COLORS.secondary}; line-height: 1.5;">
            ${escapeHtml(cluster.summary)}
          </p>
          <div style="font-size: 12px; color: ${COLORS.muted};">
            Source: ${escapeHtml(cluster.representativeArticle.source)}
          </div>
          ${relatedList}
        </div>
      `;
    })
    .join("");

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="
        color: ${COLORS.primary};
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 3px solid ${COLORS.accent};
      ">
        THE DEEP DIVE
      </h2>
      <p style="font-size: 13px; color: ${COLORS.muted}; margin: 0 0 16px 0;">
        The stories shaping NYC right now
      </p>
      ${clusterItems}
    </div>
  `;
}

/**
 * Build THE BRIEFING section - quick hit alerts and news.
 */
function buildBriefingSection(items: BriefingItem[]): string {
  if (items.length === 0) {
    return "";
  }

  const briefingItems = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
            <div style="display: flex; align-items: flex-start;">
              <span style="font-size: 16px; margin-right: 8px;">${item.icon || "📌"}</span>
              <div>
                <div style="font-weight: 500; color: #111827; font-size: 14px;">
                  ${escapeHtml(item.title)}
                </div>
                ${
                  item.whyYouShouldCare
                    ? `<div style="font-size: 13px; color: ${COLORS.secondary}; margin-top: 2px; line-height: 1.4;">
                    ${escapeHtml(item.whyYouShouldCare)}
                  </div>`
                    : item.body
                      ? `<div style="font-size: 13px; color: ${COLORS.secondary}; margin-top: 2px; line-height: 1.4;">
                    ${escapeHtml(item.body.slice(0, 150))}${item.body.length > 150 ? "..." : ""}
                  </div>`
                      : ""
                }
              </div>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="
        color: ${COLORS.primary};
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 3px solid ${COLORS.muted};
      ">
        THE BRIEFING
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${briefingItems}
      </table>
    </div>
  `;
}

/**
 * Build THE AGENDA section - upcoming events.
 */
function buildAgendaSection(
  events: AgendaEvent[],
  windowDays: number
): string {
  if (events.length === 0) {
    return "";
  }

  // Group events by date
  const eventsByDate = new Map<string, AgendaEvent[]>();
  for (const event of events) {
    const dateKey = event.date.toISODate();
    if (!dateKey) continue;
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(event);
  }

  const dateBlocks = Array.from(eventsByDate.entries())
    .map(([dateKey, dateEvents]) => {
      const date = DateTime.fromISO(dateKey);
      const isToday = date.hasSame(DateTime.now(), "day");
      const dayLabel = isToday ? "Today" : date.toFormat("EEE, MMM d");

      const eventItems = dateEvents
        .map(
          (event) => `
          <div style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
            <div style="font-weight: 500; color: #111827; font-size: 14px;">
              ${escapeHtml(event.title)}
            </div>
            <div style="font-size: 12px; color: ${COLORS.muted}; margin-top: 2px;">
              ${event.time ? `${event.time}` : ""}
              ${event.venue ? ` &bull; ${escapeHtml(event.venue)}` : ""}
              ${event.neighborhood ? ` &bull; ${escapeHtml(event.neighborhood)}` : ""}
            </div>
          </div>
        `
        )
        .join("");

      return `
        <div style="margin-bottom: 16px;">
          <div style="
            font-size: 12px;
            font-weight: 600;
            color: ${isToday ? COLORS.urgencyHigh : COLORS.muted};
            text-transform: uppercase;
            margin-bottom: 8px;
          ">
            ${dayLabel}
          </div>
          ${eventItems}
        </div>
      `;
    })
    .join("");

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="
        color: ${COLORS.primary};
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 3px solid #16a34a;
      ">
        THE AGENDA
      </h2>
      <p style="font-size: 13px; color: ${COLORS.muted}; margin: 0 0 16px 0;">
        What's happening in the next ${windowDays} day${windowDays > 1 ? "s" : ""}
      </p>
      ${dateBlocks}
    </div>
  `;
}

// =============================================================================
// MAIN TEMPLATE BUILDER
// =============================================================================

export interface EnhancedDigestOptions {
  appBaseUrl?: string;
  userId?: string;
  userName?: string;
  isPremium?: boolean;
  referralCode?: string | null;
}

/**
 * Build the complete enhanced daily digest HTML email.
 */
export function buildEnhancedDigestHtml(
  digest: DailyDigestContent,
  options: EnhancedDigestOptions = {}
): string {
  const appBaseUrl = options.appBaseUrl || process.env.APP_BASE_URL || "http://localhost:3000";
  const isPremium = options.isPremium || false;

  // Format today's date
  const dateStr = digest.meta.generatedAt.toFormat("EEEE, MMMM d, yyyy");

  // Build sections
  const horizonSection = buildHorizonSection(
    digest.horizon.alerts,
    digest.horizon.premiumAlerts,
    isPremium
  );

  const deepDiveSection = buildDeepDiveSection(digest.deepDive.clustersForEmail);

  const briefingSection = buildBriefingSection(digest.briefing.items);

  const agendaSection = buildAgendaSection(
    digest.agenda.events,
    digest.agenda.windowDays
  );

  // Build referral section if code provided
  const referralSection = options.referralCode
    ? `
      <div style="
        margin: 24px 0;
        padding: 20px;
        background: #ecfdf5;
        border-radius: 8px;
        text-align: center;
      ">
        <div style="font-weight: 600; color: #065f46; margin-bottom: 8px;">
          Know someone who'd love NYC alerts?
        </div>
        <div style="font-size: 13px; color: #047857; margin-bottom: 12px;">
          Share your link and get 1 month free when they subscribe
        </div>
        <a href="${appBaseUrl}/r/${escapeHtml(options.referralCode)}" style="
          display: inline-block;
          background: #059669;
          color: white;
          padding: 10px 20px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 500;
        ">
          Share CityPing
        </a>
      </div>
    `
    : "";

  // Build upgrade CTA for non-premium users
  const upgradeCta = !isPremium
    ? `
      <div style="
        margin: 24px 0;
        padding: 20px;
        background: #f3f4f6;
        border-radius: 8px;
        text-align: center;
      ">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">
          Get more from CityPing
        </div>
        <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">
          Premium alerts, tax reminders, deal notifications, and more
        </div>
        <a href="${appBaseUrl}/pricing" style="
          display: inline-block;
          background: ${COLORS.primary};
          color: white;
          padding: 10px 20px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 500;
        ">
          Upgrade for $7/mo
        </a>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>CityPing Daily - ${dateStr}</title>
    </head>
    <body style="
      margin: 0;
      padding: 0;
      font-family: ${FONTS.system};
      background: ${COLORS.background};
      color: ${COLORS.secondary};
      line-height: 1.6;
    ">
      <div style="
        max-width: 600px;
        margin: 0 auto;
        padding: 24px 16px;
        background: ${COLORS.white};
      ">
        <!-- Header -->
        <div style="
          text-align: center;
          padding-bottom: 24px;
          border-bottom: 2px solid ${COLORS.primary};
          margin-bottom: 24px;
        ">
          <h1 style="
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 700;
            color: ${COLORS.primary};
            letter-spacing: -0.5px;
          ">
            CityPing Daily
          </h1>
          <div style="font-size: 14px; color: ${COLORS.muted};">
            ${dateStr}
          </div>
          ${digest.weather ? `
            <div style="
              margin-top: 12px;
              padding: 10px 16px;
              background: #f0f9ff;
              border-radius: 8px;
              display: inline-block;
            ">
              <span style="font-size: 24px;">${digest.weather.emoji}</span>
              <span style="font-size: 18px; font-weight: 600; color: #0369a1; margin-left: 8px;">
                ${digest.weather.high}°/${digest.weather.low}°
              </span>
              <span style="font-size: 14px; color: #64748b; margin-left: 8px;">
                ${escapeHtml(digest.weather.condition)}
              </span>
            </div>
          ` : ""}</div>

        <!-- Main Content -->
        ${horizonSection}
        ${deepDiveSection}
        ${briefingSection}
        ${agendaSection}

        <!-- Upgrade CTA -->
        ${upgradeCta}

        <!-- Referral Section -->
        ${referralSection}

        <!-- Footer -->
        <div style="
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid ${COLORS.border};
          text-align: center;
          font-size: 12px;
          color: ${COLORS.muted};
        ">
          <p style="margin: 0 0 8px 0;">
            <a href="${appBaseUrl}/settings" style="color: ${COLORS.muted}; text-decoration: none;">
              Manage preferences
            </a>
            &nbsp;&bull;&nbsp;
            <a href="${appBaseUrl}/unsubscribe${options.userId ? `?userId=${options.userId}` : ""}" style="color: ${COLORS.muted}; text-decoration: none;">
              Unsubscribe
            </a>
          </p>
          <p style="margin: 0;">
            CityPing &bull; Your daily NYC intel
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Build a plain text version of the digest for email clients that don't support HTML.
 */
export function buildEnhancedDigestText(
  digest: DailyDigestContent
): string {
  const lines: string[] = [];
  const dateStr = digest.meta.generatedAt.toFormat("EEEE, MMMM d, yyyy");

  lines.push(`CITYPING DAILY - ${dateStr}`);
  lines.push("=".repeat(50));
  lines.push("");

  // Weather
  if (digest.weather) {
    lines.push(`${digest.weather.emoji} ${digest.weather.high}°/${digest.weather.low}° ${digest.weather.condition}`);
    lines.push("");
  }

  // Horizon
  if (digest.horizon.alerts.length > 0) {
    lines.push("THE HORIZON");
    lines.push("-".repeat(30));
    for (const alert of digest.horizon.alerts) {
      const daysLabel =
        alert.daysUntil === 0
          ? "TODAY"
          : alert.daysUntil === 1
            ? "TOMORROW"
            : `In ${alert.daysUntil} days`;
      lines.push(`${alert.event.icon} ${alert.event.shortTitle} [${daysLabel}]`);
      lines.push(`   ${alert.message}`);
      lines.push("");
    }
  }

  // Deep Dive
  if (digest.deepDive.clustersForEmail.length > 0) {
    lines.push("THE DEEP DIVE");
    lines.push("-".repeat(30));
    for (const cluster of digest.deepDive.clustersForEmail) {
      lines.push(`[${cluster.theme}]`);
      lines.push(cluster.headline);
      lines.push(cluster.summary);
      lines.push(`(${cluster.articleCount} related stories)`);
      lines.push("");
    }
  }

  // Briefing
  if (digest.briefing.items.length > 0) {
    lines.push("THE BRIEFING");
    lines.push("-".repeat(30));
    for (const item of digest.briefing.items) {
      lines.push(`${item.icon || "*"} ${item.title}`);
      if (item.body) {
        lines.push(`   ${item.body.slice(0, 100)}...`);
      }
    }
    lines.push("");
  }

  // Agenda
  if (digest.agenda.events.length > 0) {
    lines.push("THE AGENDA");
    lines.push("-".repeat(30));
    for (const event of digest.agenda.events) {
      const dateStr = event.date.toFormat("EEE, MMM d");
      lines.push(`${dateStr}: ${event.title}`);
      if (event.venue) {
        lines.push(`   ${event.venue}`);
      }
    }
  }

  return lines.join("\n");
}
