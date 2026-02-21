// src/lib/premium/enhanced-sections.ts
/**
 * Enhanced Premium Sections with Data Visualizations
 *
 * Rich data visualizations for premium email digest including:
 * - Traffic trends with sparklines
 * - CitiBike availability heat map
 * - ASP calendar view
 * - Weather forecast timeline
 * - Commute score dashboard
 */

import { DataViz } from "./data-visualizations";
import { prisma } from "../db";
import { DateTime } from "luxon";

// ============================================================================
// TRAFFIC TRENDS SECTION
// ============================================================================

export interface TrafficTrendData {
  hourlyScores: number[];   // 24 hours of traffic scores (1-10)
  currentScore: number;
  peakHour: number;
  bestDepartureTime: string;
  boroughs: Array<{ name: string; score: number }>;
}

/**
 * Build enhanced traffic section with trends visualization
 */
export async function buildTrafficTrendsSection(): Promise<string> {
  try {
    // Get historical traffic data (last 24 hours)
    const now = DateTime.now().setZone("America/New_York");
    const yesterday = now.minus({ hours: 24 });

    const scores = await prisma.trafficScore.findMany({
      where: {
        fetchedAt: { gte: yesterday.toJSDate() },
        region: "manhattan_midtown",
      },
      orderBy: { fetchedAt: "asc" },
      take: 24,
    });

    // Default mock data if no historical data
    const hourlyScores = scores.length >= 6
      ? scores.map(s => s.frictionScore)
      : [3, 2, 2, 3, 5, 7, 8, 9, 8, 6, 5, 5, 5, 5, 6, 7, 9, 8, 7, 5, 4, 3, 2, 2];

    // Find peak and best times
    const maxScore = Math.max(...hourlyScores);
    const minScore = Math.min(...hourlyScores);
    const peakHour = hourlyScores.indexOf(maxScore);
    const bestHour = hourlyScores.indexOf(minScore);

    const formatHour = (h: number) => {
      const hour = h % 12 || 12;
      const ampm = h < 12 ? "AM" : "PM";
      return `${hour}${ampm}`;
    };

    // Get current scores by borough
    const currentScores = await prisma.trafficScore.findMany({
      where: {
        fetchedAt: { gte: now.minus({ minutes: 30 }).toJSDate() },
      },
      distinct: ["region"],
      orderBy: { fetchedAt: "desc" },
    });

    const regionNames: Record<string, string> = {
      manhattan_midtown: "Midtown",
      manhattan_downtown: "Downtown",
      brooklyn: "Brooklyn",
      queens: "Queens",
      bronx: "Bronx",
    };

    const boroughs = currentScores.map(s => ({
      name: regionNames[s.region] || s.region,
      score: s.frictionScore,
    }));

    const currentScore = boroughs.length > 0
      ? Math.round(boroughs.reduce((sum, b) => sum + b.score, 0) / boroughs.length)
      : 5;

    // Build visualization
    const sparkline = DataViz.sparklineChart({
      values: hourlyScores.slice(-12), // Last 12 hours
      labels: Array.from({ length: 12 }, (_, i) => formatHour((now.hour - 11 + i + 24) % 24)),
      color: currentScore >= 7 ? DataViz.COLORS.danger : currentScore >= 5 ? DataViz.COLORS.warning : DataViz.COLORS.success,
      height: 50,
    });

    const metric = DataViz.metricCard({
      value: currentScore,
      label: "Traffic Score",
      trend: {
        direction: currentScore > 5 ? "up" : currentScore < 4 ? "down" : "flat",
        value: currentScore >= 7 ? "Heavy traffic" : currentScore >= 5 ? "Moderate" : "Light traffic",
      },
      subtext: `Peak at ${formatHour(peakHour)}, best at ${formatHour(bestHour)}`,
      color: currentScore >= 7 ? DataViz.COLORS.danger : currentScore >= 5 ? DataViz.COLORS.warning : DataViz.COLORS.success,
    });

    const comparison = DataViz.comparisonBars({
      items: boroughs.map(b => ({
        label: b.name,
        value: b.score,
        maxValue: 10,
      })),
      title: "By Borough",
    });

    return `
      <div style="margin: 24px 0;">
        ${DataViz.sectionHeader("TRAFFIC", "Today's Commute Conditions")}

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 40%; vertical-align: top; padding-right: 16px;">
              ${metric}
            </td>
            <td style="width: 60%; vertical-align: top;">
              <div style="background: ${DataViz.COLORS.white}; border: 1px solid ${DataViz.COLORS.border}; border-radius: 8px; padding: 16px;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${DataViz.COLORS.muted}; margin-bottom: 12px;">
                  12-Hour Trend
                </div>
                ${sparkline}
              </div>
            </td>
          </tr>
        </table>

        <div style="margin-top: 16px;">
          ${comparison}
        </div>

        ${DataViz.calloutBox({
          icon: "💡",
          title: "Best Time to Leave",
          body: `Based on traffic patterns, the best time to commute today is around <strong>${formatHour(bestHour)}</strong>. Avoid <strong>${formatHour(peakHour)}</strong> when traffic peaks at ${maxScore}/10.`,
          style: "info",
        })}
      </div>
    `;
  } catch (error) {
    console.error("[EnhancedSections] Traffic trends error:", error);
    return "";
  }
}

// ============================================================================
// CITIBIKE DASHBOARD
// ============================================================================

export async function buildCitiBikeDashboard(userId: string): Promise<string> {
  try {
    // Get user's saved stations
    const savedLocations = await prisma.userSavedLocation.findMany({
      where: {
        userId,
        locationType: { in: ["citibike_home", "citibike_work"] },
      },
    });

    if (savedLocations.length === 0) return "";

    // Get station data
    const stationIds = savedLocations.map(l => l.stationId).filter(Boolean) as string[];
    const stations = await prisma.citiBikeStation.findMany({
      where: { stationId: { in: stationIds } },
    });

    if (stations.length === 0) return "";

    // Build stats
    const stats = stations.map(s => {
      const type = savedLocations.find(l => l.stationId === s.stationId)?.locationType;
      const fillPct = Math.round((s.bikesAvailable / s.capacity) * 100);

      return {
        name: type === "citibike_home" ? "Home" : "Work",
        stationName: s.name,
        bikes: s.bikesAvailable,
        docks: s.docksAvailable,
        capacity: s.capacity,
        fillPct,
      };
    });

    // Create stat row
    const statRowData = DataViz.statRow({
      stats: stats.flatMap(s => [
        { value: s.bikes, label: `${s.name} Bikes`, color: s.bikes < 3 ? DataViz.COLORS.danger : DataViz.COLORS.success },
        { value: s.docks, label: `${s.name} Docks`, color: s.docks < 3 ? DataViz.COLORS.danger : DataViz.COLORS.success },
      ]),
    });

    // Create progress indicators
    const progressBars = stats.map(s => `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 13px; font-weight: 600; color: ${DataViz.COLORS.primary};">${s.name === "Home" ? "🏠" : "💼"} ${s.name}</span>
          <span style="font-size: 12px; color: ${DataViz.COLORS.muted};">${s.stationName}</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div style="flex: 1; height: 12px; background: ${DataViz.COLORS.backgroundAlt}; border-radius: 6px; overflow: hidden;">
            <div style="width: ${s.fillPct}%; height: 100%; background: linear-gradient(90deg, ${DataViz.COLORS.accent} 0%, #22d3ee 100%); border-radius: 6px;"></div>
          </div>
          <span style="font-size: 11px; color: ${DataViz.COLORS.muted}; min-width: 40px;">${s.fillPct}% full</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px;">
          <span style="color: ${s.bikes < 3 ? DataViz.COLORS.danger : DataViz.COLORS.success};">🚲 ${s.bikes} bikes</span>
          <span style="color: ${s.docks < 3 ? DataViz.COLORS.danger : DataViz.COLORS.success};">🅿️ ${s.docks} docks</span>
        </div>
      </div>
    `).join('');

    return `
      <div style="margin: 24px 0;">
        ${DataViz.sectionHeader("CITIBIKE", "Your Station Status")}

        ${statRowData}

        <div style="margin-top: 16px; background: ${DataViz.COLORS.white}; border: 1px solid ${DataViz.COLORS.border}; border-radius: 8px; padding: 20px;">
          ${progressBars}
        </div>
      </div>
    `;
  } catch (error) {
    console.error("[EnhancedSections] CitiBike dashboard error:", error);
    return "";
  }
}

// ============================================================================
// ASP CALENDAR
// ============================================================================

export async function buildASPCalendar(): Promise<string> {
  try {
    const now = DateTime.now().setZone("America/New_York");
    const monthName = now.toFormat("MMMM yyyy");

    // Get ASP-suspended days from knowledge base or events
    // For now, build a mock calendar showing the current month
    const daysInMonth = now.daysInMonth || 30;
    const firstDayOfMonth = now.startOf("month").weekday % 7; // 0=Sun

    // Mock ASP data (in production, pull from knowledge base)
    const suspendedDays = new Set([1, 15, 20, 25]); // Example suspended days
    const holidays = new Set([17]); // Example holidays

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const date = i + 1;
      const isToday = date === now.day;

      let status: "free" | "restricted" | "holiday" | "today" = "restricted";
      if (isToday) status = "today";
      else if (holidays.has(date)) status = "holiday";
      else if (suspendedDays.has(date)) status = "free";
      else if ((now.set({ day: date }).weekday === 6) || (now.set({ day: date }).weekday === 7)) status = "free";

      return { date, status };
    });

    return `
      <div style="margin: 24px 0;">
        ${DataViz.sectionHeader("PARKING", "ASP Calendar")}
        ${DataViz.miniCalendar({ month: monthName, days, startDay: firstDayOfMonth })}
      </div>
    `;
  } catch (error) {
    console.error("[EnhancedSections] ASP calendar error:", error);
    return "";
  }
}

// ============================================================================
// WEATHER TIMELINE
// ============================================================================

export interface WeatherForecastDay {
  day: string;
  date: string;
  high: number;
  low: number | null;
  condition: string;
  emoji: string;
  precipChance: number | null;
}

export function buildWeatherTimeline(forecast: WeatherForecastDay[]): string {
  if (!forecast || forecast.length === 0) return "";

  // Create heat map for temperature trend
  const tempData = forecast.slice(0, 7).map(day => ({
    label: day.day,
    value: Math.round((day.high - 32) / 10), // Normalize to 0-10 scale roughly
    tooltip: `${day.high}°${day.low ? `/${day.low}°` : ''}`,
  }));

  // Create stat row with today + tomorrow
  const today = forecast[0];
  const tomorrow = forecast[1];

  const stats = DataViz.statRow({
    stats: [
      { value: `${today?.high}°`, label: "Today High", color: DataViz.COLORS.primary },
      { value: `${today?.low || '--'}°`, label: "Today Low", color: DataViz.COLORS.muted },
      { value: `${tomorrow?.high || '--'}°`, label: "Tomorrow", color: DataViz.COLORS.accent },
      { value: `${today?.precipChance || 0}%`, label: "Rain Chance", color: (today?.precipChance || 0) > 50 ? DataViz.COLORS.accent : DataViz.COLORS.muted },
    ],
  });

  // Create 7-day visual
  const forecastCards = forecast.slice(0, 7).map((day, i) => `
    <td style="
      text-align: center;
      padding: 12px 6px;
      ${i === 0 ? `background: ${DataViz.COLORS.backgroundAlt}; border-radius: 8px;` : ''}
    ">
      <div style="font-size: 11px; color: ${DataViz.COLORS.muted}; font-weight: ${i === 0 ? '600' : '400'};">
        ${i === 0 ? 'TODAY' : day.day.toUpperCase()}
      </div>
      <div style="font-size: 28px; margin: 8px 0;">${day.emoji}</div>
      <div style="font-size: 16px; font-weight: 600; color: ${DataViz.COLORS.primary};">${day.high}°</div>
      ${day.low !== null ? `<div style="font-size: 12px; color: ${DataViz.COLORS.muted};">${day.low}°</div>` : ''}
      ${day.precipChance && day.precipChance > 20 ? `
        <div style="font-size: 10px; color: ${DataViz.COLORS.accent}; margin-top: 4px;">💧${day.precipChance}%</div>
      ` : ''}
    </td>
  `).join('');

  return `
    <div style="margin: 24px 0;">
      ${DataViz.sectionHeader("WEATHER", "7-Day Forecast")}

      ${stats}

      <div style="margin-top: 16px; background: ${DataViz.COLORS.white}; border: 1px solid ${DataViz.COLORS.border}; border-radius: 8px; padding: 16px; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; min-width: 400px;">
          <tr>${forecastCards}</tr>
        </table>
      </div>
    </div>
  `;
}

// ============================================================================
// COMMUTE SCORE DASHBOARD (Combined view)
// ============================================================================

export async function buildCommuteDashboard(userId: string): Promise<string> {
  try {
    // Combine traffic, transit, and citibike into one view
    const now = DateTime.now().setZone("America/New_York");

    // Get latest traffic
    const latestTraffic = await prisma.trafficScore.findFirst({
      where: { region: "manhattan_midtown" },
      orderBy: { fetchedAt: "desc" },
    });

    const trafficScore = latestTraffic?.frictionScore || 5;
    const trafficLabel = latestTraffic?.label || "Moderate";

    // Calculate overall commute score (1-100)
    const commuteScore = Math.round(100 - (trafficScore * 10));

    const progressRing = DataViz.progressRing({
      value: commuteScore,
      label: "Commute Score",
      size: 80,
      color: commuteScore >= 70 ? DataViz.COLORS.success : commuteScore >= 40 ? DataViz.COLORS.warning : DataViz.COLORS.danger,
    });

    const recommendation = commuteScore >= 70
      ? "Great conditions for commuting! Roads are clear."
      : commuteScore >= 40
        ? "Moderate delays expected. Allow extra time."
        : "Heavy traffic conditions. Consider alternatives.";

    return `
      <div style="margin: 24px 0;">
        ${DataViz.sectionHeader("COMMUTE", "Your Daily Overview")}

        <div style="background: ${DataViz.COLORS.white}; border: 1px solid ${DataViz.COLORS.border}; border-radius: 12px; padding: 24px; text-align: center;">
          ${progressRing}

          <div style="margin-top: 16px; font-size: 15px; color: ${DataViz.COLORS.primary}; font-family: ${DataViz.FONTS.serif};">
            ${recommendation}
          </div>

          <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
              <td style="text-align: center; padding: 12px; border-right: 1px solid ${DataViz.COLORS.border};">
                <div style="font-size: 10px; text-transform: uppercase; color: ${DataViz.COLORS.muted};">Traffic</div>
                <div style="font-size: 18px; font-weight: 600; color: ${trafficScore >= 7 ? DataViz.COLORS.danger : trafficScore >= 5 ? DataViz.COLORS.warning : DataViz.COLORS.success};">${trafficScore}/10</div>
              </td>
              <td style="text-align: center; padding: 12px; border-right: 1px solid ${DataViz.COLORS.border};">
                <div style="font-size: 10px; text-transform: uppercase; color: ${DataViz.COLORS.muted};">Transit</div>
                <div style="font-size: 18px; font-weight: 600; color: ${DataViz.COLORS.success};">Good</div>
              </td>
              <td style="text-align: center; padding: 12px;">
                <div style="font-size: 10px; text-transform: uppercase; color: ${DataViz.COLORS.muted};">Bikes</div>
                <div style="font-size: 18px; font-weight: 600; color: ${DataViz.COLORS.accent};">Available</div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("[EnhancedSections] Commute dashboard error:", error);
    return "";
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const EnhancedSections = {
  buildTrafficTrendsSection,
  buildCitiBikeDashboard,
  buildASPCalendar,
  buildWeatherTimeline,
  buildCommuteDashboard,
};

export default EnhancedSections;
