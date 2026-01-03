/**
 * NYCPing Email Templates v2
 *
 * Research-backed email templates implementing:
 * - Inverted Pyramid structure (most important first)
 * - Tufte data density principles (sparklines, small multiples)
 * - Morning Brew/theSkimm scannability patterns
 * - Robinhood informational philosophy (no engagement tricks)
 * - Notification UX urgency classification
 *
 * @see email-design-system.ts for tokens and components
 */

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  MODULE_STYLES,
  containerStyle,
  heroBlock,
  summaryStats,
  moduleHeader,
  alertCard,
  ctaButton,
  tierBadge,
  footer,
  timeUntil,
  UrgencyLevel,
} from "./email-design-system";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface AlertItem {
  id: string;
  title: string;
  body?: string;
  startsAt: Date;
  moduleId: string;
  metadata?: Record<string, unknown>;
}

export interface DigestData {
  user: {
    email: string;
    neighborhood?: string;
    tier: "free" | "premium";
  };
  alerts: AlertItem[];
  date: Date;
}

// =============================================================================
// WELCOME EMAIL
// First impression - sets expectations, shows value immediately
// =============================================================================

export function welcomeEmail(config: {
  neighborhood: string;
  alertsByModule: Record<string, AlertItem[]>;
  preferencesUrl: string;
  tier: "free" | "premium";
}): { subject: string; html: string; text: string } {
  const totalAlerts = Object.values(config.alertsByModule).flat().length;
  const moduleCount = Object.keys(config.alertsByModule).filter(
    (k) => config.alertsByModule[k].length > 0
  ).length;

  // Build module sections
  const moduleSections = Object.entries(config.alertsByModule)
    .filter(([, alerts]) => alerts.length > 0)
    .map(([moduleId, alerts]) => {
      const style = MODULE_STYLES[moduleId] || MODULE_STYLES.events;

      const alertItems = alerts
        .slice(0, 15) // Show up to 15 per module - content-rich email
        .map((alert) => {
          const time = timeUntil(alert.startsAt);
          return alertCard({
            title: alert.title,
            body: alert.body,
            urgency: time.urgency,
            meta: time.text,
          });
        })
        .join("");

      return `
        <div style="margin-bottom: ${SPACING.xl};">
          ${moduleHeader(moduleId, alerts.length)}
          ${alertItems}
        </div>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin: 0; padding: 0; background: #f3f4f6;">
      <div style="${containerStyle}">

        ${heroBlock({
          title: "Welcome to NYCPing 🗽",
          subtitle: "Your personalized NYC alerts are ready",
        })}

        <!-- Location Context (Inverted Pyramid: key context first) -->
        <div style="
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 8px;
          padding: ${SPACING.md};
          margin-bottom: ${SPACING.lg};
        ">
          <p style="margin: 0; color: ${COLORS.navy[800]};">
            <strong>📍 ${config.neighborhood}</strong><br>
            <span style="font-size: ${TYPOGRAPHY.sizes.small};">Based on your zip code, here's what's relevant to you:</span>
          </p>
        </div>

        <!-- Summary Stats (Tufte: data density) -->
        ${summaryStats([
          { label: "Active Alerts", value: String(totalAlerts), color: COLORS.modules.events },
          { label: "Modules", value: String(moduleCount), color: COLORS.navy[800] },
          { label: "Your Tier", value: config.tier === "premium" ? "Pro" : "Free" },
        ])}

        <!-- Module Sections (Scannable, hierarchical) -->
        ${moduleSections}

        <!-- Tier Explanation (Transparent, Robinhood-style) -->
        <div style="
          background: ${config.tier === "free" ? "#fef3c7" : "#ecfdf5"};
          border-radius: 8px;
          padding: ${SPACING.md};
          margin: ${SPACING.lg} 0;
        ">
          ${tierBadge(config.tier)}
          <p style="margin: ${SPACING.sm} 0 0 0; font-size: ${TYPOGRAPHY.sizes.body}; color: ${COLORS.navy[700]};">
            ${config.tier === "free"
              ? `You'll receive a <strong>daily email digest</strong> each morning. Premium users get instant SMS alerts.`
              : `You're getting <strong>instant SMS + email alerts</strong>. Thank you for your support!`
            }
          </p>
        </div>

        ${ctaButton("Customize Your Alerts", config.preferencesUrl)}

        ${footer(config.preferencesUrl)}

      </div>
    </body>
    </html>
  `;

  // Plain text version
  const text = `
WELCOME TO NYCPING 🗽

Your personalized NYC alerts are ready.

📍 ${config.neighborhood}

${Object.entries(config.alertsByModule)
  .filter(([, alerts]) => alerts.length > 0)
  .map(([moduleId, alerts]) => {
    const style = MODULE_STYLES[moduleId];
    return `${style?.icon || "•"} ${style?.name || moduleId.toUpperCase()} (${alerts.length})
${alerts.slice(0, 15).map((a) => `  • ${a.title}`).join("\n")}`;
  })
  .join("\n\n")}

---
Customize: ${config.preferencesUrl}
  `.trim();

  return {
    subject: `🗽 Welcome to NYCPing — ${totalAlerts} alerts ready for ${config.neighborhood}`,
    html,
    text,
  };
}

// =============================================================================
// DAILY DIGEST
// The core product email for free tier users
// =============================================================================

export function dailyDigest(data: DigestData): { subject: string; html: string; text: string } {
  const { user, alerts, date } = data;

  // Group alerts by urgency, then by module
  const highUrgency = alerts.filter((a) => timeUntil(a.startsAt).urgency === "high");
  const mediumUrgency = alerts.filter((a) => timeUntil(a.startsAt).urgency === "medium");
  const lowUrgency = alerts.filter((a) => timeUntil(a.startsAt).urgency === "low");

  // Group by module for section display
  const byModule: Record<string, AlertItem[]> = {};
  alerts.forEach((alert) => {
    if (!byModule[alert.moduleId]) byModule[alert.moduleId] = [];
    byModule[alert.moduleId].push(alert);
  });

  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Build priority section (HIGH urgency items)
  const prioritySection =
    highUrgency.length > 0
      ? `
      <div style="
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border-radius: 8px;
        padding: ${SPACING.md};
        margin-bottom: ${SPACING.lg};
        border-left: 4px solid ${COLORS.urgency.high};
      ">
        <h2 style="margin: 0 0 ${SPACING.sm} 0; font-size: ${TYPOGRAPHY.sizes.h2}; color: ${COLORS.urgency.high};">
          🚨 Action Required
        </h2>
        ${highUrgency
          .map((alert) =>
            alertCard({
              title: alert.title,
              body: alert.body,
              urgency: "high",
              meta: timeUntil(alert.startsAt).text,
            })
          )
          .join("")}
      </div>
    `
      : "";

  // Build module sections
  const moduleSections = Object.entries(byModule)
    .map(([moduleId, moduleAlerts]) => {
      const nonHighAlerts = moduleAlerts.filter(
        (a) => timeUntil(a.startsAt).urgency !== "high"
      );
      if (nonHighAlerts.length === 0) return "";

      return `
        <div style="margin-bottom: ${SPACING.lg};">
          ${moduleHeader(moduleId, nonHighAlerts.length)}
          ${nonHighAlerts
            .slice(0, 5)
            .map((alert) => {
              const time = timeUntil(alert.startsAt);
              return alertCard({
                title: alert.title,
                body: alert.body,
                urgency: time.urgency,
                meta: time.text,
              });
            })
            .join("")}
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  const appBaseUrl = process.env.APP_BASE_URL || "https://nycping-app.vercel.app";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin: 0; padding: 0; background: #f3f4f6;">
      <div style="${containerStyle}">

        <!-- Header (Morning Brew style: date + branding) -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: ${SPACING.lg};
          padding-bottom: ${SPACING.md};
          border-bottom: 2px solid ${COLORS.navy[200]};
        ">
          <div>
            <h1 style="margin: 0; font-size: ${TYPOGRAPHY.sizes.h1}; color: ${COLORS.navy[800]};">
              NYCPing Daily
            </h1>
            <p style="margin: 4px 0 0 0; font-size: ${TYPOGRAPHY.sizes.small}; color: ${COLORS.navy[400]};">
              ${dateStr}
            </p>
          </div>
          ${user.neighborhood ? `<p style="margin: 0; font-size: ${TYPOGRAPHY.sizes.small}; color: ${COLORS.navy[600]};">📍 ${user.neighborhood}</p>` : ""}
        </div>

        <!-- Summary (Tufte: show the data) -->
        ${summaryStats([
          { label: "Today", value: String(highUrgency.length), color: COLORS.urgency.high },
          { label: "This Week", value: String(mediumUrgency.length), color: COLORS.urgency.medium },
          { label: "Coming Up", value: String(lowUrgency.length), color: COLORS.navy[600] },
        ])}

        <!-- Priority Section (Inverted Pyramid: most important first) -->
        ${prioritySection}

        <!-- Module Sections -->
        ${moduleSections}

        ${ctaButton("View All Alerts", `${appBaseUrl}/dashboard`, "secondary")}

        ${footer(`${appBaseUrl}/preferences`, `${appBaseUrl}/unsubscribe`)}

      </div>
    </body>
    </html>
  `;

  // Plain text
  const text = `
NYCPING DAILY — ${dateStr}
${user.neighborhood ? `📍 ${user.neighborhood}` : ""}

${highUrgency.length > 0 ? `🚨 ACTION REQUIRED (${highUrgency.length})
${highUrgency.map((a) => `• ${a.title} — ${timeUntil(a.startsAt).text}`).join("\n")}

` : ""}${Object.entries(byModule)
    .map(([moduleId, moduleAlerts]) => {
      const style = MODULE_STYLES[moduleId];
      return `${style?.icon || "•"} ${style?.name || moduleId.toUpperCase()}
${moduleAlerts.map((a) => `• ${a.title}`).join("\n")}`;
    })
    .join("\n\n")}

---
View all: ${appBaseUrl}/dashboard
Preferences: ${appBaseUrl}/preferences
  `.trim();

  return {
    subject: `${highUrgency.length > 0 ? "🚨 " : "📬 "}Your NYC Alerts — ${dateStr} (${alerts.length} new)`,
    html,
    text,
  };
}

// =============================================================================
// INSTANT ALERT (Premium SMS + Email)
// Single high-priority alert notification
// =============================================================================

export function instantAlert(config: {
  alert: AlertItem;
  user: { neighborhood?: string };
}): { subject: string; html: string; text: string; sms: string } {
  const { alert, user } = config;
  const style = MODULE_STYLES[alert.moduleId] || MODULE_STYLES.events;
  const time = timeUntil(alert.startsAt);
  const appBaseUrl = process.env.APP_BASE_URL || "https://nycping-app.vercel.app";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin: 0; padding: 0; background: #f3f4f6;">
      <div style="${containerStyle}">

        ${heroBlock({
          title: `${style.icon} ${alert.title}`,
          subtitle: time.text,
          gradient: style.gradient,
        })}

        ${alert.body ? `
          <p style="
            font-size: ${TYPOGRAPHY.sizes.body};
            line-height: ${TYPOGRAPHY.lineHeights.relaxed};
            color: ${COLORS.navy[700]};
            margin-bottom: ${SPACING.lg};
          ">${alert.body}</p>
        ` : ""}

        ${user.neighborhood ? `
          <p style="
            font-size: ${TYPOGRAPHY.sizes.small};
            color: ${COLORS.navy[400]};
          ">📍 Relevant to ${user.neighborhood}</p>
        ` : ""}

        ${footer(`${appBaseUrl}/preferences`)}

      </div>
    </body>
    </html>
  `;

  // SMS (160 char limit, Robinhood style: full info, no click required)
  const sms = `${style.icon} ${alert.title} — ${time.text}${alert.body ? `. ${alert.body.slice(0, 80)}` : ""}`.slice(
    0,
    160
  );

  return {
    subject: `${style.icon} ${alert.title} — ${time.text}`,
    html,
    text: `${style.icon} ${alert.title}\n${time.text}\n\n${alert.body || ""}\n\n---\n${appBaseUrl}/preferences`,
    sms,
  };
}

// =============================================================================
// WEEKLY PREVIEW
// Sunday morning look-ahead (theSkimm pattern)
// =============================================================================

export function weeklyPreview(config: {
  weekRange: string;
  alertsByDay: Record<string, AlertItem[]>;
  preferencesUrl: string;
}): { subject: string; html: string; text: string } {
  const { weekRange, alertsByDay, preferencesUrl } = config;

  const totalAlerts = Object.values(alertsByDay).flat().length;
  const daysWithAlerts = Object.keys(alertsByDay).filter(
    (d) => alertsByDay[d].length > 0
  ).length;

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const daySections = dayOrder
    .filter((day) => alertsByDay[day]?.length > 0)
    .map((day) => {
      const dayAlerts = alertsByDay[day];
      return `
        <div style="margin-bottom: ${SPACING.md};">
          <h3 style="
            margin: 0 0 ${SPACING.sm} 0;
            font-size: ${TYPOGRAPHY.sizes.h3};
            color: ${COLORS.navy[800]};
            font-weight: ${TYPOGRAPHY.weights.semibold};
          ">${day}</h3>
          ${dayAlerts
            .map((alert) => {
              const style = MODULE_STYLES[alert.moduleId];
              return `
                <div style="
                  display: flex;
                  align-items: flex-start;
                  gap: ${SPACING.sm};
                  padding: ${SPACING.xs} 0;
                ">
                  <span style="font-size: 14px;">${style?.icon || "•"}</span>
                  <span style="font-size: ${TYPOGRAPHY.sizes.body}; color: ${COLORS.navy[700]};">
                    ${alert.title}
                  </span>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin: 0; padding: 0; background: #f3f4f6;">
      <div style="${containerStyle}">

        ${heroBlock({
          title: "Week Ahead 📅",
          subtitle: weekRange,
        })}

        ${summaryStats([
          { label: "Alerts", value: String(totalAlerts), color: COLORS.modules.events },
          { label: "Days", value: String(daysWithAlerts), color: COLORS.navy[800] },
        ])}

        ${daySections}

        ${ctaButton("View Details", preferencesUrl.replace("/preferences", "/dashboard"))}

        ${footer(preferencesUrl)}

      </div>
    </body>
    </html>
  `;

  const text = `
WEEK AHEAD — ${weekRange}

${totalAlerts} alerts across ${daysWithAlerts} days

${dayOrder
  .filter((day) => alertsByDay[day]?.length > 0)
  .map((day) => `${day}:\n${alertsByDay[day].map((a) => `  • ${a.title}`).join("\n")}`)
  .join("\n\n")}

---
${preferencesUrl}
  `.trim();

  return {
    subject: `📅 Week Ahead: ${totalAlerts} NYC Alerts (${weekRange})`,
    html,
    text,
  };
}

// =============================================================================
// CITY PULSE: YOUR NYC WEEK (Sunday 8am)
// The insider's guide to the week ahead - 5-minute read with coffee
// =============================================================================

export interface CityPulseEvent {
  id: string;
  title: string;
  description?: string; // AI-generated insider copy
  startsAt?: Date;
  endsAt?: Date;
  deadlineAt?: Date; // Signup deadline
  category: string;
  venue?: string;
  neighborhood?: string;
  insiderScore: number;
  isActionRequired?: boolean;
  ctaUrl?: string;
  ctaText?: string;
  tips?: string[];
}

export interface WeekAtGlanceDay {
  date: Date;
  dayName: string;
  highTemp?: number;
  lowTemp?: number;
  weatherIcon?: string;
  hasEvents: boolean;
  eventIcons: string[];
}

export interface YourNYCWeekData {
  weekRange: string; // "Jan 19-25"
  editorNote: string; // One-line vibe
  weekAtGlance: WeekAtGlanceDay[];
  actionRequired: CityPulseEvent[];
  thisWeekByCategory: Record<string, CityPulseEvent[]>;
  onYourRadar: CityPulseEvent[]; // Future events to be aware of
  user: {
    neighborhood?: string;
    tier: "free" | "premium";
  };
}

const CATEGORY_STYLES: Record<string, { icon: string; label: string; color: string }> = {
  culture: { icon: "🎭", label: "CULTURE", color: "#8b5cf6" },
  sports: { icon: "⚾", label: "SPORTS", color: "#f59e0b" },
  food: { icon: "🍽️", label: "FOOD & DRINK", color: "#f97316" },
  civic: { icon: "🏛️", label: "CIVIC", color: "#06b6d4" },
  seasonal: { icon: "🎄", label: "SEASONAL", color: "#16a34a" },
  weather: { icon: "🌤️", label: "WEATHER", color: "#3b82f6" },
  local: { icon: "📍", label: "LOCAL", color: "#ec4899" },
  transit: { icon: "🚇", label: "TRANSIT", color: "#f59e0b" },
};

function formatDeadline(date: Date): string {
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function yourNYCWeek(data: YourNYCWeekData): { subject: string; html: string; text: string } {
  const {
    weekRange,
    editorNote,
    weekAtGlance,
    actionRequired,
    thisWeekByCategory,
    onYourRadar,
    user,
  } = data;

  const appBaseUrl = process.env.APP_BASE_URL || "https://nycping-app.vercel.app";

  // Week at a glance - using table layout for email client compatibility
  const weekGlanceHtml = `
    <div style="
      background: ${COLORS.navy[100]};
      border-radius: 8px;
      padding: ${SPACING.md};
      margin-bottom: ${SPACING.lg};
    ">
      <h2 style="
        margin: 0 0 ${SPACING.md} 0;
        font-size: ${TYPOGRAPHY.sizes.h3};
        color: ${COLORS.navy[800]};
      ">
        📅 THE WEEK AT A GLANCE
      </h2>
      <table width="100%" cellpadding="0" cellspacing="4" style="border-collapse: separate;">
        <tr>
          ${weekAtGlance.map(day => `
            <td style="
              text-align: center;
              padding: 8px 4px;
              background: ${day.hasEvents ? 'white' : 'transparent'};
              border-radius: 6px;
              width: 14.28%;
              vertical-align: top;
            ">
              <div style="
                font-size: 12px;
                color: ${COLORS.navy[600]};
                font-weight: 600;
                margin-bottom: 4px;
              ">${day.dayName.slice(0, 3)}</div>
              ${day.highTemp ? `
                <div style="
                  font-size: 16px;
                  color: ${COLORS.navy[800]};
                  margin: 4px 0;
                ">${day.weatherIcon || '☀️'} ${day.highTemp}°</div>
              ` : ''}
              <div style="
                font-size: 16px;
                min-height: 24px;
                line-height: 24px;
              ">${day.eventIcons.slice(0, 3).join(' ')}</div>
            </td>
          `).join('')}
        </tr>
      </table>
    </div>
  `;

  // Action Required section - deadlines with CTAs
  const actionRequiredHtml = actionRequired.length > 0 ? `
    <div style="
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border-radius: 8px;
      padding: ${SPACING.md};
      margin-bottom: ${SPACING.lg};
      border-left: 4px solid ${COLORS.urgency.high};
    ">
      <h2 style="
        margin: 0 0 ${SPACING.md} 0;
        font-size: ${TYPOGRAPHY.sizes.h2};
        color: ${COLORS.urgency.high};
      ">🎯 ACTION REQUIRED</h2>
      ${actionRequired.map(event => {
        const catStyle = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.culture;
        return `
          <div style="
            background: white;
            border-radius: 8px;
            padding: ${SPACING.md};
            margin-bottom: ${SPACING.sm};
          ">
            <div style="
              font-size: ${TYPOGRAPHY.sizes.h3};
              font-weight: ${TYPOGRAPHY.weights.semibold};
              color: ${COLORS.navy[900]};
              margin-bottom: ${SPACING.xs};
            ">▸ ${event.title}</div>
            ${event.description ? `
              <div style="
                font-size: ${TYPOGRAPHY.sizes.body};
                color: ${COLORS.navy[600]};
                line-height: ${TYPOGRAPHY.lineHeights.relaxed};
                margin-bottom: ${SPACING.sm};
              ">${event.description}</div>
            ` : ''}
            ${event.deadlineAt ? `
              <div style="
                font-size: ${TYPOGRAPHY.sizes.small};
                color: ${COLORS.urgency.high};
                font-weight: ${TYPOGRAPHY.weights.medium};
                margin-bottom: ${SPACING.sm};
              ">⏰ Deadline: ${formatDeadline(event.deadlineAt)}</div>
            ` : ''}
            ${event.ctaUrl ? `
              <a href="${event.ctaUrl}" style="
                display: inline-block;
                background: ${COLORS.navy[800]};
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                text-decoration: none;
                font-size: ${TYPOGRAPHY.sizes.small};
                font-weight: ${TYPOGRAPHY.weights.semibold};
              ">${event.ctaText || 'TAKE ACTION'} →</a>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  // This Week by Category - all categories including transit
  const categoryOrder = ['transit', 'culture', 'food', 'sports', 'civic', 'seasonal', 'local', 'weather'];
  const thisWeekHtml = `
    <div style="margin-bottom: ${SPACING.lg};">
      <h2 style="
        margin: 0 0 ${SPACING.md} 0;
        font-size: ${TYPOGRAPHY.sizes.h2};
        color: ${COLORS.navy[800]};
        padding-bottom: ${SPACING.sm};
        border-bottom: 2px solid ${COLORS.navy[200]};
      ">🗽 THIS WEEK IN NYC</h2>
      ${categoryOrder
        .filter(cat => thisWeekByCategory[cat]?.length > 0)
        .map(cat => {
          const events = thisWeekByCategory[cat];
          const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.culture;
          return `
            <div style="margin-bottom: ${SPACING.md};">
              <h3 style="
                margin: 0 0 ${SPACING.sm} 0;
                font-size: ${TYPOGRAPHY.sizes.h3};
                color: ${style.color};
                font-weight: ${TYPOGRAPHY.weights.semibold};
              ">${style.label}</h3>
              ${events.slice(0, 12).map(event => `
                <div style="
                  padding: ${SPACING.xs} 0;
                  border-bottom: 1px solid ${COLORS.navy[100]};
                ">
                  <span style="
                    font-size: ${TYPOGRAPHY.sizes.body};
                    color: ${COLORS.navy[800]};
                  ">${event.title}</span>
                  ${event.startsAt ? `
                    <span style="
                      font-size: ${TYPOGRAPHY.sizes.small};
                      color: ${COLORS.navy[400]};
                      margin-left: ${SPACING.sm};
                    ">(${event.startsAt.toLocaleDateString('en-US', { weekday: 'short' })})</span>
                  ` : ''}
                  ${event.description ? `
                    <div style="
                      font-size: ${TYPOGRAPHY.sizes.small};
                      color: ${COLORS.navy[600]};
                      margin-top: 2px;
                    ">${event.description}</div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
    </div>
  `;

  // On Your Radar - future awareness
  const onRadarHtml = onYourRadar.length > 0 ? `
    <div style="
      background: ${COLORS.navy[100]};
      border-radius: 8px;
      padding: ${SPACING.md};
      margin-bottom: ${SPACING.lg};
    ">
      <h2 style="
        margin: 0 0 ${SPACING.sm} 0;
        font-size: ${TYPOGRAPHY.sizes.h2};
        color: ${COLORS.navy[800]};
      ">👀 ON YOUR RADAR</h2>
      <p style="
        margin: 0 0 ${SPACING.md} 0;
        font-size: ${TYPOGRAPHY.sizes.small};
        color: ${COLORS.navy[400]};
      ">Things to know about, not act on yet:</p>
      ${onYourRadar.map(event => {
        const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.culture;
        return `
          <div style="
            display: flex;
            align-items: flex-start;
            gap: ${SPACING.sm};
            padding: ${SPACING.xs} 0;
          ">
            <span style="font-size: 14px;">${style.icon}</span>
            <div>
              <span style="
                font-size: ${TYPOGRAPHY.sizes.body};
                color: ${COLORS.navy[700]};
              ">${event.title}</span>
              ${event.description ? `
                <span style="
                  font-size: ${TYPOGRAPHY.sizes.small};
                  color: ${COLORS.navy[400]};
                  margin-left: ${SPACING.xs};
                ">- ${event.description}</span>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin: 0; padding: 0; background: #f3f4f6;">
      <div style="${containerStyle}">

        <!-- Header with week range -->
        <div style="
          text-align: center;
          margin-bottom: ${SPACING.md};
          padding-bottom: ${SPACING.md};
          border-bottom: 2px solid ${COLORS.navy[200]};
        ">
          <h1 style="
            margin: 0;
            font-size: ${TYPOGRAPHY.sizes.h1};
            color: ${COLORS.navy[800]};
          ">YOUR NYC WEEK</h1>
          <p style="
            margin: ${SPACING.xs} 0 0 0;
            font-size: ${TYPOGRAPHY.sizes.body};
            color: ${COLORS.navy[600]};
          ">${weekRange}</p>
        </div>

        <!-- Editor's note - the insider vibe -->
        <div style="
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 8px;
          padding: ${SPACING.md};
          margin-bottom: ${SPACING.lg};
          font-style: italic;
        ">
          <p style="
            margin: 0;
            font-size: ${TYPOGRAPHY.sizes.body};
            color: ${COLORS.navy[700]};
            line-height: ${TYPOGRAPHY.lineHeights.relaxed};
          ">"${editorNote}"</p>
        </div>

        ${weekGlanceHtml}

        ${actionRequiredHtml}

        ${thisWeekHtml}

        ${onRadarHtml}

        ${ctaButton("View Full Calendar", `${appBaseUrl}/calendar`)}

        ${footer(`${appBaseUrl}/preferences`, `${appBaseUrl}/unsubscribe`)}

      </div>
    </body>
    </html>
  `;

  // Plain text version
  const text = `
YOUR NYC WEEK — ${weekRange}

"${editorNote}"

${user.neighborhood ? `📍 ${user.neighborhood}` : ''}

${actionRequired.length > 0 ? `🎯 ACTION REQUIRED
${actionRequired.map(e => `• ${e.title}${e.deadlineAt ? ` (Deadline: ${formatDeadline(e.deadlineAt)})` : ''}`).join('\n')}

` : ''}🗽 THIS WEEK IN NYC
${categoryOrder
  .filter(cat => thisWeekByCategory[cat]?.length > 0)
  .map(cat => {
    const style = CATEGORY_STYLES[cat];
    return `${style.label}
${thisWeekByCategory[cat].slice(0, 12).map(e => `• ${e.title}`).join('\n')}`;
  }).join('\n\n')}

${onYourRadar.length > 0 ? `
👀 ON YOUR RADAR
${onYourRadar.map(e => `• ${e.title}${e.description ? ` - ${e.description}` : ''}`).join('\n')}
` : ''}
---
View calendar: ${appBaseUrl}/calendar
Preferences: ${appBaseUrl}/preferences
  `.trim();

  return {
    subject: `📅 Your NYC Week: ${weekRange}${actionRequired.length > 0 ? ` (${actionRequired.length} action${actionRequired.length > 1 ? 's' : ''} required)` : ''}`,
    html,
    text,
  };
}

// =============================================================================
// CITY PULSE: NYC TODAY (Daily 7am)
// 60-second scan before leaving home. High signal, zero fluff.
// =============================================================================

export interface NYCTodayEvent {
  id: string;
  title: string;
  description?: string;
  time?: string;
  category: string;
  isUrgent?: boolean;
  isFree?: boolean;
  price?: string;
  venue?: string;
}

export interface NYCTodayData {
  date: Date;
  weather?: {
    high: number;
    low: number;
    icon: string;
    summary: string;
  };
  whatMattersToday: NYCTodayEvent[]; // Transit, parking, urgent items
  dontMiss?: {
    title: string;
    description: string;
    ctaUrl?: string;
  };
  tonightInNYC: NYCTodayEvent[];
  lookAhead: {
    day: string;
    forecast: string;
    tip?: string;
  }[];
  user: {
    neighborhood?: string;
    tier: "free" | "premium";
  };
}

export function nycToday(data: NYCTodayData): { subject: string; html: string; text: string } {
  const { date, weather, whatMattersToday, dontMiss, tonightInNYC, lookAhead, user } = data;

  const appBaseUrl = process.env.APP_BASE_URL || "https://nycping-app.vercel.app";

  const dateStr = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const shortDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // What Matters Today section
  const whatMattersHtml = whatMattersToday.length > 0 ? `
    <div style="margin-bottom: ${SPACING.lg};">
      <h2 style="
        margin: 0 0 ${SPACING.md} 0;
        font-size: ${TYPOGRAPHY.sizes.h3};
        color: ${COLORS.navy[800]};
        display: flex;
        align-items: center;
        gap: ${SPACING.sm};
      ">⚡ WHAT MATTERS TODAY</h2>
      ${whatMattersToday.map(event => `
        <div style="
          padding: ${SPACING.sm} 0;
          border-bottom: 1px solid ${COLORS.navy[100]};
          display: flex;
          align-items: flex-start;
          gap: ${SPACING.sm};
        ">
          <span style="color: ${event.isUrgent ? COLORS.urgency.high : COLORS.navy[600]};">•</span>
          <div>
            <span style="
              font-size: ${TYPOGRAPHY.sizes.body};
              color: ${COLORS.navy[800]};
              ${event.isUrgent ? `font-weight: ${TYPOGRAPHY.weights.semibold};` : ''}
            ">${event.title}</span>
            ${event.description ? `
              <span style="
                font-size: ${TYPOGRAPHY.sizes.small};
                color: ${COLORS.navy[600]};
              "> — ${event.description}</span>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // Don't Miss section (single highlight)
  const dontMissHtml = dontMiss ? `
    <div style="
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 8px;
      padding: ${SPACING.md};
      margin-bottom: ${SPACING.lg};
      border-left: 4px solid ${COLORS.urgency.medium};
    ">
      <h2 style="
        margin: 0 0 ${SPACING.sm} 0;
        font-size: ${TYPOGRAPHY.sizes.h3};
        color: ${COLORS.navy[800]};
      ">🎯 DON'T MISS</h2>
      <p style="
        margin: 0 0 ${SPACING.sm} 0;
        font-size: ${TYPOGRAPHY.sizes.body};
        color: ${COLORS.navy[800]};
        font-weight: ${TYPOGRAPHY.weights.semibold};
      ">${dontMiss.title}</p>
      <p style="
        margin: 0;
        font-size: ${TYPOGRAPHY.sizes.small};
        color: ${COLORS.navy[700]};
        line-height: ${TYPOGRAPHY.lineHeights.relaxed};
      ">→ ${dontMiss.description}</p>
      ${dontMiss.ctaUrl ? `
        <a href="${dontMiss.ctaUrl}" style="
          display: inline-block;
          margin-top: ${SPACING.sm};
          color: ${COLORS.navy[800]};
          font-weight: ${TYPOGRAPHY.weights.semibold};
          text-decoration: none;
          font-size: ${TYPOGRAPHY.sizes.small};
        ">Take action →</a>
      ` : ''}
    </div>
  ` : '';

  // Tonight in NYC
  const tonightHtml = tonightInNYC.length > 0 ? `
    <div style="margin-bottom: ${SPACING.lg};">
      <h2 style="
        margin: 0 0 ${SPACING.md} 0;
        font-size: ${TYPOGRAPHY.sizes.h3};
        color: ${COLORS.navy[800]};
      ">📍 TONIGHT IN NYC</h2>
      ${tonightInNYC.map(event => `
        <div style="
          padding: ${SPACING.sm} 0;
          border-bottom: 1px solid ${COLORS.navy[100]};
        ">
          <span style="
            font-size: ${TYPOGRAPHY.sizes.small};
            color: ${event.isFree ? COLORS.status.success : COLORS.navy[600]};
            font-weight: ${TYPOGRAPHY.weights.medium};
          ">${event.isFree ? 'Free' : event.price || ''}</span>
          <span style="
            font-size: ${TYPOGRAPHY.sizes.small};
            color: ${COLORS.navy[400]};
          "> · </span>
          <span style="
            font-size: ${TYPOGRAPHY.sizes.body};
            color: ${COLORS.navy[800]};
          ">${event.title}</span>
          ${event.description ? `
            <div style="
              font-size: ${TYPOGRAPHY.sizes.small};
              color: ${COLORS.navy[600]};
              margin-top: 2px;
            ">${event.description}</div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  // Look Ahead
  const lookAheadHtml = lookAhead.length > 0 ? `
    <div style="
      background: ${COLORS.navy[100]};
      border-radius: 8px;
      padding: ${SPACING.md};
      margin-bottom: ${SPACING.lg};
    ">
      <h2 style="
        margin: 0 0 ${SPACING.sm} 0;
        font-size: ${TYPOGRAPHY.sizes.h3};
        color: ${COLORS.navy[800]};
      ">🌤️ LOOK AHEAD</h2>
      ${lookAhead.map(day => `
        <div style="
          padding: ${SPACING.xs} 0;
        ">
          <span style="
            font-size: ${TYPOGRAPHY.sizes.body};
            color: ${COLORS.navy[800]};
            font-weight: ${TYPOGRAPHY.weights.medium};
          ">${day.day}:</span>
          <span style="
            font-size: ${TYPOGRAPHY.sizes.body};
            color: ${COLORS.navy[700]};
          "> ${day.forecast}</span>
          ${day.tip ? `
            <span style="
              font-size: ${TYPOGRAPHY.sizes.small};
              color: ${COLORS.navy[600]};
            "> — ${day.tip}</span>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin: 0; padding: 0; background: #f3f4f6;">
      <div style="${containerStyle}">

        <!-- Header -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: ${SPACING.lg};
          padding-bottom: ${SPACING.md};
          border-bottom: 2px solid ${COLORS.navy[200]};
        ">
          <div>
            <h1 style="
              margin: 0;
              font-size: ${TYPOGRAPHY.sizes.h1};
              color: ${COLORS.navy[800]};
            ">NYC TODAY</h1>
            <p style="
              margin: 4px 0 0 0;
              font-size: ${TYPOGRAPHY.sizes.small};
              color: ${COLORS.navy[600]};
            ">${dateStr}</p>
          </div>
          ${weather ? `
            <div style="text-align: right;">
              <span style="font-size: 24px;">${weather.icon}</span>
              <p style="
                margin: 0;
                font-size: ${TYPOGRAPHY.sizes.body};
                color: ${COLORS.navy[700]};
              ">${weather.low}° → ${weather.high}°</p>
            </div>
          ` : ''}
        </div>

        ${whatMattersHtml}

        ${dontMissHtml}

        ${tonightHtml}

        ${lookAheadHtml}

        ${footer(`${appBaseUrl}/preferences`, `${appBaseUrl}/unsubscribe`)}

      </div>
    </body>
    </html>
  `;

  // Plain text
  const text = `
NYC TODAY — ${shortDate}
${weather ? `${weather.icon} ${weather.low}° → ${weather.high}°` : ''}

⚡ WHAT MATTERS TODAY
${whatMattersToday.map(e => `• ${e.title}${e.description ? ` — ${e.description}` : ''}`).join('\n')}

${dontMiss ? `🎯 DON'T MISS
${dontMiss.title}
→ ${dontMiss.description}

` : ''}📍 TONIGHT IN NYC
${tonightInNYC.map(e => `${e.isFree ? 'Free' : e.price || '•'} · ${e.title}`).join('\n')}

🌤️ LOOK AHEAD
${lookAhead.map(d => `${d.day}: ${d.forecast}${d.tip ? ` — ${d.tip}` : ''}`).join('\n')}

---
${appBaseUrl}/preferences
  `.trim();

  return {
    subject: `🗽 NYC Today: ${shortDate}${dontMiss ? ' — ' + dontMiss.title : ''}`,
    html,
    text,
  };
}

export default {
  welcomeEmail,
  dailyDigest,
  instantAlert,
  weeklyPreview,
  yourNYCWeek,
  nycToday,
};
