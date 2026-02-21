// src/lib/premium/data-visualizations.ts
/**
 * Premium Data Visualization Components
 *
 * Minimalist, editorial-style data visualizations for email digests.
 * Inspired by elegant pitch deck aesthetics - clean typography,
 * muted colors, generous whitespace, and sophisticated data presentation.
 *
 * Design System:
 * - Primary: #1e293b (slate-800)
 * - Accent: #0369a1 (sky-700)
 * - Background: #faf9f7 (warm cream)
 * - Muted: #94a3b8 (slate-400)
 * - Success: #16a34a
 * - Warning: #ca8a04
 * - Danger: #dc2626
 */

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const COLORS = {
  primary: "#1e293b",
  accent: "#0369a1",
  background: "#faf9f7",
  backgroundAlt: "#f1f0ee",
  muted: "#94a3b8",
  border: "#e2e0dc",
  success: "#16a34a",
  warning: "#ca8a04",
  danger: "#dc2626",
  white: "#ffffff",
};

const FONTS = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ============================================================================
// SPARKLINE CHART (CSS-based mini chart)
// ============================================================================

export interface SparklineData {
  values: number[];
  labels?: string[];
  color?: string;
  height?: number;
}

/**
 * Generate a CSS sparkline chart for trends
 * Uses inline bars to show trend over time
 */
export function sparklineChart(data: SparklineData): string {
  const { values, labels, color = COLORS.accent, height = 40 } = data;
  if (values.length === 0) return "";

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const bars = values.map((val, i) => {
    const barHeight = Math.max(4, ((val - min) / range) * height);
    const isLast = i === values.length - 1;

    return `
      <td style="vertical-align: bottom; padding: 0 1px; width: ${100 / values.length}%;">
        <div style="
          height: ${barHeight}px;
          background: ${isLast ? color : `${color}60`};
          border-radius: 2px 2px 0 0;
          min-width: 6px;
        "></div>
        ${labels?.[i] ? `
          <div style="font-size: 9px; color: ${COLORS.muted}; text-align: center; margin-top: 2px;">
            ${labels[i]}
          </div>
        ` : ''}
      </td>
    `;
  }).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; height: ${height + 20}px;">
      <tr>${bars}</tr>
    </table>
  `;
}

// ============================================================================
// PROGRESS RING (Circular progress indicator)
// ============================================================================

export interface ProgressRingData {
  value: number;      // 0-100
  label?: string;
  size?: number;
  color?: string;
}

/**
 * Circular progress indicator using CSS
 * Note: Email clients have limited CSS support, using table-based approach
 */
export function progressRing(data: ProgressRingData): string {
  const { value, label, size = 60, color = COLORS.accent } = data;
  const cappedValue = Math.min(100, Math.max(0, value));

  // For email, we'll use a simplified horizontal bar representation
  return `
    <div style="text-align: center;">
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: conic-gradient(${color} ${cappedValue * 3.6}deg, ${COLORS.border} 0deg);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
      ">
        <div style="
          width: ${size - 12}px;
          height: ${size - 12}px;
          border-radius: 50%;
          background: ${COLORS.white};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${size / 3}px;
          font-weight: 700;
          color: ${COLORS.primary};
          font-family: ${FONTS.sans};
        ">${cappedValue}%</div>
      </div>
      ${label ? `<div style="font-size: 11px; color: ${COLORS.muted}; margin-top: 4px;">${label}</div>` : ''}
    </div>
  `;
}

// ============================================================================
// HEAT MAP CALENDAR (Week view with intensity colors)
// ============================================================================

export interface HeatMapData {
  days: Array<{
    label: string;     // "Mon", "Tue", etc.
    value: number;     // 0-10 intensity
    tooltip?: string;
  }>;
  title?: string;
}

/**
 * Week heat map showing intensity across days
 */
export function heatMapCalendar(data: HeatMapData): string {
  const { days, title } = data;

  const getHeatColor = (value: number): string => {
    if (value <= 2) return "#dcfce7"; // green-100
    if (value <= 4) return "#fef9c3"; // yellow-100
    if (value <= 6) return "#fed7aa"; // orange-100
    if (value <= 8) return "#fecaca"; // red-100
    return "#fca5a5"; // red-300
  };

  const cells = days.map(day => `
    <td style="
      width: 14.28%;
      text-align: center;
      padding: 8px 4px;
      background: ${getHeatColor(day.value)};
      border-radius: 4px;
    ">
      <div style="font-size: 10px; color: ${COLORS.muted}; text-transform: uppercase; letter-spacing: 0.5px;">
        ${day.label}
      </div>
      <div style="font-size: 16px; font-weight: 600; color: ${COLORS.primary}; margin-top: 2px;">
        ${day.value}
      </div>
      ${day.tooltip ? `<div style="font-size: 9px; color: ${COLORS.muted}; margin-top: 2px;">${day.tooltip}</div>` : ''}
    </td>
  `).join('');

  return `
    <div style="background: ${COLORS.background}; border-radius: 8px; padding: 16px;">
      ${title ? `
        <div style="
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: ${COLORS.muted};
          margin-bottom: 12px;
          font-family: ${FONTS.sans};
        ">${title}</div>
      ` : ''}
      <table style="width: 100%; border-collapse: separate; border-spacing: 4px;">
        <tr>${cells}</tr>
      </table>
    </div>
  `;
}

// ============================================================================
// METRIC CARD (Large number with context)
// ============================================================================

export interface MetricCardData {
  value: string | number;
  label: string;
  trend?: {
    direction: "up" | "down" | "flat";
    value: string;
  };
  subtext?: string;
  color?: string;
}

/**
 * Large metric display with optional trend indicator
 */
export function metricCard(data: MetricCardData): string {
  const { value, label, trend, subtext, color = COLORS.primary } = data;

  const trendIcon = trend?.direction === "up" ? "↑" : trend?.direction === "down" ? "↓" : "→";
  const trendColor = trend?.direction === "up" ? COLORS.success :
                     trend?.direction === "down" ? COLORS.danger : COLORS.muted;

  return `
    <div style="
      background: ${COLORS.white};
      border: 1px solid ${COLORS.border};
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    ">
      <div style="
        font-size: 36px;
        font-weight: 300;
        color: ${color};
        font-family: ${FONTS.serif};
        line-height: 1;
      ">${value}</div>
      <div style="
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: ${COLORS.muted};
        margin-top: 8px;
        font-family: ${FONTS.sans};
      ">${label}</div>
      ${trend ? `
        <div style="
          font-size: 13px;
          color: ${trendColor};
          margin-top: 8px;
          font-family: ${FONTS.sans};
        ">${trendIcon} ${trend.value}</div>
      ` : ''}
      ${subtext ? `
        <div style="
          font-size: 11px;
          color: ${COLORS.muted};
          margin-top: 6px;
          font-family: ${FONTS.sans};
        ">${subtext}</div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// TIMELINE (Vertical event timeline)
// ============================================================================

export interface TimelineEvent {
  time: string;
  title: string;
  description?: string;
  status?: "past" | "current" | "upcoming";
}

/**
 * Vertical timeline for events or schedules
 */
export function timeline(events: TimelineEvent[]): string {
  const items = events.map((event, i) => {
    const isLast = i === events.length - 1;
    const dotColor = event.status === "current" ? COLORS.accent :
                     event.status === "past" ? COLORS.muted : COLORS.primary;

    return `
      <tr>
        <td style="width: 60px; text-align: right; padding-right: 16px; vertical-align: top;">
          <div style="
            font-size: 12px;
            color: ${event.status === "current" ? COLORS.accent : COLORS.muted};
            font-weight: ${event.status === "current" ? "600" : "400"};
            font-family: ${FONTS.sans};
          ">${event.time}</div>
        </td>
        <td style="width: 20px; vertical-align: top; position: relative;">
          <div style="
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: ${dotColor};
            margin-top: 4px;
          "></div>
          ${!isLast ? `
            <div style="
              position: absolute;
              left: 4px;
              top: 18px;
              width: 2px;
              height: calc(100% - 10px);
              background: ${COLORS.border};
            "></div>
          ` : ''}
        </td>
        <td style="padding-bottom: 16px; vertical-align: top;">
          <div style="
            font-size: 14px;
            font-weight: 600;
            color: ${COLORS.primary};
            font-family: ${FONTS.sans};
          ">${event.title}</div>
          ${event.description ? `
            <div style="
              font-size: 13px;
              color: ${COLORS.muted};
              margin-top: 2px;
              font-family: ${FONTS.sans};
            ">${event.description}</div>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table style="width: 100%; border-collapse: collapse;">
      ${items}
    </table>
  `;
}

// ============================================================================
// COMPARISON BAR (Side-by-side comparison)
// ============================================================================

export interface ComparisonData {
  items: Array<{
    label: string;
    value: number;
    maxValue?: number;
  }>;
  title?: string;
}

/**
 * Horizontal bar comparison chart
 */
export function comparisonBars(data: ComparisonData): string {
  const { items, title } = data;
  const maxVal = Math.max(...items.map(i => i.maxValue || i.value));

  const bars = items.map(item => {
    const width = (item.value / maxVal) * 100;

    return `
      <div style="margin-bottom: 12px;">
        <div style="
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-family: ${FONTS.sans};
        ">
          <span style="font-size: 12px; color: ${COLORS.primary};">${item.label}</span>
          <span style="font-size: 12px; font-weight: 600; color: ${COLORS.primary};">${item.value}</span>
        </div>
        <div style="
          width: 100%;
          height: 8px;
          background: ${COLORS.backgroundAlt};
          border-radius: 4px;
          overflow: hidden;
        ">
          <div style="
            width: ${width}%;
            height: 100%;
            background: linear-gradient(90deg, ${COLORS.accent} 0%, #0ea5e9 100%);
            border-radius: 4px;
          "></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="background: ${COLORS.white}; border-radius: 8px; padding: 16px; border: 1px solid ${COLORS.border};">
      ${title ? `
        <div style="
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: ${COLORS.muted};
          margin-bottom: 16px;
          font-family: ${FONTS.sans};
        ">${title}</div>
      ` : ''}
      ${bars}
    </div>
  `;
}

// ============================================================================
// MINI CALENDAR (ASP/Event calendar)
// ============================================================================

export interface MiniCalendarData {
  month: string;
  days: Array<{
    date: number;
    status: "free" | "restricted" | "holiday" | "today";
    label?: string;
  }>;
  startDay?: number; // 0=Sun, 1=Mon
}

/**
 * Compact calendar grid for ASP or events
 */
export function miniCalendar(data: MiniCalendarData): string {
  const { month, days, startDay = 0 } = data;

  const statusColors: Record<string, { bg: string; text: string }> = {
    free: { bg: "#dcfce7", text: "#16a34a" },
    restricted: { bg: "#fee2e2", text: "#dc2626" },
    holiday: { bg: "#dbeafe", text: "#2563eb" },
    today: { bg: COLORS.primary, text: COLORS.white },
  };

  const dayHeaders = ["S", "M", "T", "W", "T", "F", "S"];
  const headers = dayHeaders.map(d => `
    <th style="
      width: 14.28%;
      font-size: 10px;
      color: ${COLORS.muted};
      padding: 4px;
      text-align: center;
      font-family: ${FONTS.sans};
    ">${d}</th>
  `).join('');

  // Build calendar grid
  const cells: string[] = [];

  // Add empty cells for offset
  for (let i = 0; i < startDay; i++) {
    cells.push(`<td style="padding: 4px;"></td>`);
  }

  // Add day cells
  for (const day of days) {
    const colors = statusColors[day.status] || statusColors.free;
    cells.push(`
      <td style="padding: 2px; text-align: center;">
        <div style="
          width: 28px;
          height: 28px;
          line-height: 28px;
          border-radius: 50%;
          background: ${colors.bg};
          color: ${colors.text};
          font-size: 12px;
          font-weight: ${day.status === "today" ? "600" : "400"};
          margin: 0 auto;
          font-family: ${FONTS.sans};
        ">${day.date}</div>
      </td>
    `);
  }

  // Build rows (7 cells per row)
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(`<tr>${cells.slice(i, i + 7).join('')}</tr>`);
  }

  return `
    <div style="background: ${COLORS.white}; border-radius: 8px; padding: 16px; border: 1px solid ${COLORS.border};">
      <div style="
        font-size: 14px;
        font-weight: 600;
        color: ${COLORS.primary};
        margin-bottom: 12px;
        font-family: ${FONTS.serif};
        text-align: center;
      ">${month}</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>${headers}</tr>
        ${rows.join('')}
      </table>
      <div style="
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px solid ${COLORS.border};
        font-size: 10px;
        color: ${COLORS.muted};
        text-align: center;
        font-family: ${FONTS.sans};
      ">
        <span style="color: #16a34a;">● Free</span>
        <span style="margin-left: 12px; color: #dc2626;">● Restricted</span>
        <span style="margin-left: 12px; color: #2563eb;">● Holiday</span>
      </div>
    </div>
  `;
}

// ============================================================================
// STAT ROW (Inline stats)
// ============================================================================

export interface StatRowData {
  stats: Array<{
    value: string | number;
    label: string;
    color?: string;
  }>;
}

/**
 * Horizontal row of stats
 */
export function statRow(data: StatRowData): string {
  const { stats } = data;

  const items = stats.map((stat, i) => `
    <td style="
      text-align: center;
      padding: 12px 8px;
      ${i < stats.length - 1 ? `border-right: 1px solid ${COLORS.border};` : ''}
    ">
      <div style="
        font-size: 24px;
        font-weight: 300;
        color: ${stat.color || COLORS.primary};
        font-family: ${FONTS.serif};
        line-height: 1;
      ">${stat.value}</div>
      <div style="
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: ${COLORS.muted};
        margin-top: 4px;
        font-family: ${FONTS.sans};
      ">${stat.label}</div>
    </td>
  `).join('');

  return `
    <table style="
      width: 100%;
      border-collapse: collapse;
      background: ${COLORS.background};
      border-radius: 8px;
      overflow: hidden;
    ">
      <tr>${items}</tr>
    </table>
  `;
}

// ============================================================================
// SECTION HEADER (Editorial style)
// ============================================================================

export function sectionHeader(title: string, subtitle?: string): string {
  return `
    <div style="margin: 32px 0 20px 0; text-align: center;">
      <div style="
        display: inline-block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: ${COLORS.muted};
        padding-bottom: 8px;
        border-bottom: 1px solid ${COLORS.border};
        font-family: ${FONTS.sans};
      ">${title}</div>
      ${subtitle ? `
        <div style="
          font-size: 22px;
          font-weight: 400;
          color: ${COLORS.primary};
          margin-top: 12px;
          font-family: ${FONTS.serif};
        ">${subtitle}</div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// CALLOUT BOX (Highlighted insight)
// ============================================================================

export interface CalloutData {
  icon?: string;
  title: string;
  body: string;
  style?: "info" | "warning" | "success";
}

export function calloutBox(data: CalloutData): string {
  const { icon, title, body, style = "info" } = data;

  const styles = {
    info: { bg: "#f0f9ff", border: "#0369a1", accent: "#0369a1" },
    warning: { bg: "#fef3c7", border: "#ca8a04", accent: "#92400e" },
    success: { bg: "#f0fdf4", border: "#16a34a", accent: "#166534" },
  };

  const s = styles[style];

  return `
    <div style="
      background: ${s.bg};
      border-left: 3px solid ${s.border};
      border-radius: 0 8px 8px 0;
      padding: 16px 20px;
      margin: 16px 0;
    ">
      <div style="
        font-size: 13px;
        font-weight: 600;
        color: ${s.accent};
        margin-bottom: 6px;
        font-family: ${FONTS.sans};
      ">${icon ? `${icon} ` : ''}${title}</div>
      <div style="
        font-size: 13px;
        color: ${COLORS.primary};
        line-height: 1.5;
        font-family: ${FONTS.sans};
      ">${body}</div>
    </div>
  `;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const DataViz = {
  sparklineChart,
  progressRing,
  heatMapCalendar,
  metricCard,
  timeline,
  comparisonBars,
  miniCalendar,
  statRow,
  sectionHeader,
  calloutBox,
  COLORS,
  FONTS,
};

export default DataViz;
