/**
 * NYCPing Email Design System
 *
 * A comprehensive design system for alert emails, digests, and notifications.
 * Based on research from:
 *
 * DESIGN PRINCIPLES:
 * - Edward Tufte: Maximize data-ink ratio, eliminate chartjunk, sparklines for trends
 * - Morning Brew/theSkimm: Conversational, scannable, self-contained
 * - Robinhood: Informational only, full context, no engagement tricks
 * - Inverted Pyramid: Most important info first, descending significance
 *
 * NOTIFICATION UX (Smashing Magazine, Toptal):
 * - Classify by urgency: HIGH (immediate action), MEDIUM (important), LOW (nice-to-know)
 * - Personalization increases open rates 9x
 * - 71% uninstall apps due to annoying notifications
 *
 * SOURCES:
 * - https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/
 * - https://www.toptal.com/designers/ux/notification-design
 * - https://sendpulse.com/blog/email-digest-design
 * - https://chamaileon.io/resources/how-to-use-the-inverted-pyramid-method-in-your-email-design/
 * - https://reallygoodemails.com/categories/email-digest
 */

// =============================================================================
// DESIGN TOKENS
// =============================================================================

export const COLORS = {
  // Brand
  navy: {
    900: "#0f172a", // Primary text
    800: "#1e3a5f", // Headers, CTAs
    700: "#334155", // Secondary text
    600: "#475569", // Muted text
    400: "#94a3b8", // Disabled/hints
    200: "#e2e8f0", // Borders
    100: "#f8fafc", // Backgrounds
  },
  // Urgency (Notification UX best practice)
  urgency: {
    high: "#dc2626", // Red - immediate action required
    medium: "#f59e0b", // Amber - important, not urgent
    low: "#3b82f6", // Blue - informational
  },
  // Status
  status: {
    success: "#16a34a", // Green - positive outcomes
    warning: "#f59e0b", // Amber - caution
    error: "#dc2626", // Red - errors
    info: "#3b82f6", // Blue - neutral info
  },
  // Module-specific (consistent visual identity)
  modules: {
    parking: "#16a34a", // Green - "go" for parking
    transit: "#f59e0b", // Amber - MTA-inspired
    events: "#8b5cf6", // Purple - entertainment
    housing: "#ec4899", // Pink - home/warmth
    food: "#f97316", // Orange - appetite
    deals: "#06b6d4", // Cyan - money/value
  },
} as const;

export const TYPOGRAPHY = {
  // Font stack (system fonts for email compatibility)
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",

  // Sizes (mobile-first, readable on small screens)
  sizes: {
    hero: "28px", // Main headline only
    h1: "24px", // Section headers
    h2: "20px", // Module titles
    h3: "16px", // Item titles
    body: "15px", // Primary content
    small: "13px", // Meta info, timestamps
    micro: "11px", // Legal, footer
  },

  // Line heights (1.5-1.6 for readability)
  lineHeights: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.6",
  },

  // Weights
  weights: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export const SPACING = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
} as const;

// =============================================================================
// URGENCY CLASSIFICATION
// Per Smashing Magazine notification UX guidelines
// =============================================================================

export type UrgencyLevel = "high" | "medium" | "low";

export interface AlertClassification {
  level: UrgencyLevel;
  icon: string;
  color: string;
  label: string;
}

export const URGENCY_CONFIG: Record<string, AlertClassification> = {
  // HIGH: Requires immediate action or awareness
  asp_suspended_tomorrow: {
    level: "high",
    icon: "🚨",
    color: COLORS.urgency.high,
    label: "Tomorrow",
  },
  transit_major_delay: {
    level: "high",
    icon: "⚠️",
    color: COLORS.urgency.high,
    label: "Now",
  },
  lottery_deadline_24h: {
    level: "high",
    icon: "⏰",
    color: COLORS.urgency.high,
    label: "24h left",
  },

  // MEDIUM: Important but not time-critical
  asp_suspended_week: {
    level: "medium",
    icon: "📅",
    color: COLORS.urgency.medium,
    label: "This week",
  },
  transit_planned_changes: {
    level: "medium",
    icon: "🚇",
    color: COLORS.urgency.medium,
    label: "Planned",
  },
  event_upcoming: {
    level: "medium",
    icon: "🎉",
    color: COLORS.urgency.medium,
    label: "Upcoming",
  },
  sample_sale: {
    level: "medium",
    icon: "🛍️",
    color: COLORS.urgency.medium,
    label: "Limited time",
  },

  // LOW: Nice to know, no action required
  new_lottery: {
    level: "low",
    icon: "🏠",
    color: COLORS.urgency.low,
    label: "New",
  },
  deal_available: {
    level: "low",
    icon: "💳",
    color: COLORS.urgency.low,
    label: "Deal",
  },
  event_free: {
    level: "low",
    icon: "🆓",
    color: COLORS.urgency.low,
    label: "Free",
  },
};

// =============================================================================
// MODULE STYLING
// Consistent visual identity per module (Morning Brew pattern)
// =============================================================================

export interface ModuleStyle {
  icon: string;
  color: string;
  gradient: string;
  name: string;
}

export const MODULE_STYLES: Record<string, ModuleStyle> = {
  parking: {
    icon: "🚗",
    color: COLORS.modules.parking,
    gradient: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
    name: "Parking & Driving",
  },
  transit: {
    icon: "🚇",
    color: COLORS.modules.transit,
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
    name: "Transit",
  },
  events: {
    icon: "🎭",
    color: COLORS.modules.events,
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
    name: "Events & Culture",
  },
  housing: {
    icon: "🏠",
    color: COLORS.modules.housing,
    gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
    name: "Housing & Lotteries",
  },
  food: {
    icon: "🛍️",
    color: COLORS.modules.food,
    gradient: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
    name: "Sample Sales",
  },
  deals: {
    icon: "💰",
    color: COLORS.modules.deals,
    gradient: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
    name: "Deals & Money",
  },
};

// =============================================================================
// LAYOUT COMPONENTS (Inline styles for email compatibility)
// =============================================================================

/**
 * Base container - centers content, max-width for readability
 * Per Tufte: maximize data density within readable bounds
 */
export const containerStyle = `
  font-family: ${TYPOGRAPHY.fontFamily};
  max-width: 600px;
  margin: 0 auto;
  padding: ${SPACING.lg};
  background: #ffffff;
  color: ${COLORS.navy[900]};
`;

/**
 * Hero block - Inverted Pyramid top (most important info)
 * Per Morning Brew: brand identity + main message
 */
export function heroBlock(config: {
  title: string;
  subtitle?: string;
  gradient?: string;
}): string {
  return `
    <div style="
      background: ${config.gradient || `linear-gradient(135deg, ${COLORS.navy[800]} 0%, #3b82f6 100%)`};
      border-radius: 12px;
      padding: ${SPACING.xl};
      margin-bottom: ${SPACING.lg};
      color: white;
      text-align: center;
    ">
      <h1 style="
        margin: 0 0 ${SPACING.sm} 0;
        font-size: ${TYPOGRAPHY.sizes.hero};
        font-weight: ${TYPOGRAPHY.weights.bold};
        line-height: ${TYPOGRAPHY.lineHeights.tight};
      ">${config.title}</h1>
      ${config.subtitle ? `<p style="margin: 0; font-size: ${TYPOGRAPHY.sizes.body}; opacity: 0.9;">${config.subtitle}</p>` : ""}
    </div>
  `;
}

/**
 * Summary stat block - Tufte-inspired data density
 * Shows key numbers at a glance (sparkline principle)
 */
export function summaryStats(stats: { label: string; value: string; color?: string }[]): string {
  const statItems = stats
    .map(
      (s) => `
      <div style="text-align: center; flex: 1; min-width: 80px;">
        <div style="
          font-size: ${TYPOGRAPHY.sizes.hero};
          font-weight: ${TYPOGRAPHY.weights.bold};
          color: ${s.color || COLORS.navy[800]};
          line-height: 1;
        ">${s.value}</div>
        <div style="
          font-size: ${TYPOGRAPHY.sizes.small};
          color: ${COLORS.navy[600]};
          margin-top: ${SPACING.xs};
        ">${s.label}</div>
      </div>
    `
    )
    .join("");

  return `
    <div style="
      display: flex;
      justify-content: space-around;
      background: ${COLORS.navy[100]};
      border-radius: 8px;
      padding: ${SPACING.md};
      margin-bottom: ${SPACING.lg};
    ">
      ${statItems}
    </div>
  `;
}

/**
 * Module section header - consistent branding per module
 * Per Morning Brew: emoji + name pattern
 */
export function moduleHeader(moduleId: string, alertCount?: number): string {
  const style = MODULE_STYLES[moduleId] || MODULE_STYLES.events;
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: ${SPACING.sm};
      padding-bottom: ${SPACING.sm};
      border-bottom: 2px solid ${style.color};
      margin-bottom: ${SPACING.md};
    ">
      <span style="font-size: 20px;">${style.icon}</span>
      <h2 style="
        margin: 0;
        font-size: ${TYPOGRAPHY.sizes.h2};
        font-weight: ${TYPOGRAPHY.weights.semibold};
        color: ${COLORS.navy[800]};
      ">${style.name}</h2>
      ${alertCount ? `<span style="
        background: ${style.color};
        color: white;
        font-size: ${TYPOGRAPHY.sizes.micro};
        padding: 2px 8px;
        border-radius: 12px;
        margin-left: auto;
      ">${alertCount}</span>` : ""}
    </div>
  `;
}

/**
 * Alert item card - scannable, hierarchical
 * Per theSkimm: bold title + supporting detail
 */
export function alertCard(config: {
  title: string;
  body?: string;
  urgency?: UrgencyLevel;
  meta?: string;
  highlight?: boolean;
}): string {
  const urgencyColor =
    config.urgency === "high"
      ? COLORS.urgency.high
      : config.urgency === "medium"
        ? COLORS.urgency.medium
        : COLORS.navy[400];

  return `
    <div style="
      background: ${config.highlight ? "#fef3c7" : COLORS.navy[100]};
      border-radius: 8px;
      padding: ${SPACING.md};
      margin-bottom: ${SPACING.sm};
      ${config.urgency === "high" ? `border-left: 4px solid ${urgencyColor};` : ""}
    ">
      <div style="
        font-size: ${TYPOGRAPHY.sizes.h3};
        font-weight: ${TYPOGRAPHY.weights.semibold};
        color: ${COLORS.navy[900]};
        margin-bottom: ${config.body ? SPACING.xs : "0"};
      ">${config.title}</div>
      ${config.body ? `<div style="
        font-size: ${TYPOGRAPHY.sizes.body};
        color: ${COLORS.navy[600]};
        line-height: ${TYPOGRAPHY.lineHeights.relaxed};
      ">${config.body}</div>` : ""}
      ${config.meta ? `<div style="
        font-size: ${TYPOGRAPHY.sizes.small};
        color: ${COLORS.navy[400]};
        margin-top: ${SPACING.xs};
      ">${config.meta}</div>` : ""}
    </div>
  `;
}

/**
 * CTA button - Inverted Pyramid conclusion
 * Single, clear action (Robinhood principle: no engagement tricks)
 */
export function ctaButton(text: string, url: string, variant: "primary" | "secondary" = "primary"): string {
  const isPrimary = variant === "primary";
  return `
    <div style="text-align: center; margin: ${SPACING.xl} 0;">
      <a href="${url}" style="
        display: inline-block;
        background: ${isPrimary ? COLORS.navy[800] : "transparent"};
        color: ${isPrimary ? "white" : COLORS.navy[800]};
        border: 2px solid ${COLORS.navy[800]};
        padding: 14px 28px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: ${TYPOGRAPHY.weights.semibold};
        font-size: ${TYPOGRAPHY.sizes.body};
      ">${text}</a>
    </div>
  `;
}

/**
 * Tier badge - transparent pricing communication
 */
export function tierBadge(tier: "free" | "premium"): string {
  const isFree = tier === "free";
  return `
    <span style="
      display: inline-block;
      background: ${isFree ? COLORS.navy[200] : COLORS.modules.deals};
      color: ${isFree ? COLORS.navy[700] : "white"};
      font-size: ${TYPOGRAPHY.sizes.micro};
      font-weight: ${TYPOGRAPHY.weights.medium};
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    ">${tier}</span>
  `;
}

/**
 * Footer - preferences + unsubscribe (compliance + UX)
 */
export function footer(preferencesUrl: string, unsubscribeUrl?: string): string {
  return `
    <div style="
      border-top: 1px solid ${COLORS.navy[200]};
      margin-top: ${SPACING.xl};
      padding-top: ${SPACING.lg};
      text-align: center;
    ">
      <p style="
        font-size: ${TYPOGRAPHY.sizes.small};
        color: ${COLORS.navy[400]};
        margin: 0;
      ">
        <a href="${preferencesUrl}" style="color: ${COLORS.navy[600]};">Manage preferences</a>
        ${unsubscribeUrl ? ` · <a href="${unsubscribeUrl}" style="color: ${COLORS.navy[400]};">Unsubscribe</a>` : ""}
      </p>
      <p style="
        font-size: ${TYPOGRAPHY.sizes.micro};
        color: ${COLORS.navy[400]};
        margin: ${SPACING.sm} 0 0 0;
      ">NYCPing · The definitive NYC alerts platform</p>
    </div>
  `;
}

// =============================================================================
// TUFTE-INSPIRED MICRO-VISUALIZATIONS
// Sparklines and inline data for information density
// =============================================================================

/**
 * Inline trend indicator - sparkline-inspired
 * Shows direction without taking space (Tufte principle)
 */
export function trendIndicator(direction: "up" | "down" | "flat", label?: string): string {
  const arrows = { up: "↑", down: "↓", flat: "→" };
  const colors = {
    up: COLORS.status.success,
    down: COLORS.status.error,
    flat: COLORS.navy[400],
  };

  return `<span style="color: ${colors[direction]}; font-weight: ${TYPOGRAPHY.weights.medium};">${arrows[direction]}${label ? ` ${label}` : ""}</span>`;
}

/**
 * Progress bar - visual representation of deadlines
 */
export function progressBar(percent: number, color?: string): string {
  return `
    <div style="
      background: ${COLORS.navy[200]};
      border-radius: 4px;
      height: 6px;
      overflow: hidden;
      margin: ${SPACING.xs} 0;
    ">
      <div style="
        background: ${color || COLORS.modules.deals};
        width: ${Math.min(100, Math.max(0, percent))}%;
        height: 100%;
        border-radius: 4px;
      "></div>
    </div>
  `;
}

/**
 * Time-until indicator - contextual urgency
 * Per notification UX: helps users prioritize
 */
export function timeUntil(date: Date): { text: string; urgency: UrgencyLevel } {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return { text: "Today", urgency: "high" };
  if (diffDays === 1) return { text: "Tomorrow", urgency: "high" };
  if (diffDays <= 3) return { text: `In ${diffDays} days`, urgency: "medium" };
  if (diffDays <= 7) return { text: `This week`, urgency: "medium" };
  if (diffDays <= 14) return { text: `In ${Math.ceil(diffDays / 7)} weeks`, urgency: "low" };
  return { text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), urgency: "low" };
}
