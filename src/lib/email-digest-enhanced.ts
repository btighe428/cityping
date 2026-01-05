// src/lib/email-digest-enhanced.ts
/**
 * Enhanced Email Digest Builder
 *
 * Integrates all Phase 1-7 features into a cohesive daily digest:
 * - Weather context and venue-aware scoring
 * - Hype scores for sample sales
 * - Commute alerts with fallback routes
 * - Vibe-based copy (Transplant/Regular/Local)
 * - Feedback links (thumbs up/down)
 * - Referral program CTA
 */

import { fetchNYCWeatherForecast, DayForecast } from "./weather";
import { generateCommuteAlert, MtaAlertInput } from "./commute-alerts";
import { getVibePrompt, VIBE_LABELS } from "./vibe-prompts";
import { calculateWeatherScore, isWeatherSafe, VenueType, WeatherData } from "./weather-scoring";

export interface EnhancedEvent {
  id: string;
  title: string;
  body?: string;
  location?: string;
  hypeScore?: number;
  hypeFactors?: { brandTier: number; scarcity: number; ai: number };
  venueType?: VenueType;
  moduleId: string;
  moduleName: string;
  moduleIcon: string;
}

export interface EnhancedDigestOptions {
  userName?: string;
  userId?: string;
  zipCode?: string;
  vibePreset?: "TRANSPLANT" | "REGULAR" | "LOCAL";
  referralCode?: string;
  feedbackTokens?: Record<string, string>;
}

/**
 * Build weather summary for email header
 */
function buildWeatherHeader(forecast: DayForecast | null): string {
  if (!forecast) {
    return `<div style="background: #f0f4f8; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
      <span style="font-size: 14px; color: #666;">Weather data unavailable</span>
    </div>`;
  }

  const temp = forecast.temperature;
  const condition = forecast.shortForecast;
  const precip = forecast.probabilityOfPrecipitation;

  // Determine weather emoji
  let emoji = "☀️";
  const condLower = condition.toLowerCase();
  if (condLower.includes("rain") || condLower.includes("shower")) emoji = "🌧️";
  else if (condLower.includes("snow")) emoji = "❄️";
  else if (condLower.includes("cloud")) emoji = "☁️";
  else if (condLower.includes("partly")) emoji = "⛅";
  else if (condLower.includes("thunder")) emoji = "⛈️";

  // Determine if it's an indoor day
  const isIndoorDay = (precip && precip > 50) || temp < 35 || temp > 90;
  const dayType = isIndoorDay ? "Indoor Day" : "Great day to be outside";

  return `<div style="background: linear-gradient(135deg, #1a365d 0%, #2d4a6f 100%); color: white; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
    <div style="font-size: 28px; font-weight: bold; margin-bottom: 4px;">
      ${emoji} ${temp}°F — ${dayType}
    </div>
    <div style="font-size: 14px; opacity: 0.9;">
      ${condition}${precip ? ` • ${precip}% chance of precipitation` : ""}
    </div>
  </div>`;
}

/**
 * Build commute alert section
 */
function buildCommuteSection(
  zipCode: string | undefined,
  alerts: MtaAlertInput[],
  vibePreset: string
): string {
  if (!zipCode || alerts.length === 0) return "";

  const commuteAlert = generateCommuteAlert(zipCode, alerts);
  if (!commuteAlert) return "";

  const vibeLabel = vibePreset === "TRANSPLANT" ? "☕" : vibePreset === "LOCAL" ? "🚇" : "☕";

  return `<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">
      ${vibeLabel} MORNING COMMUTE
    </div>
    <div style="color: #856404; font-size: 14px; line-height: 1.5;">
      ${commuteAlert.aiCopy || `${commuteAlert.affectedLines.join(", ")} ${commuteAlert.affectedLines.length === 1 ? "is" : "are"} affected. ${commuteAlert.fallbacks[0]?.suggestedAction || "Check MTA.info for updates."}`}
    </div>
  </div>`;
}

/**
 * Build hype badge for sample sales
 */
function buildHypeBadge(score: number | undefined): string {
  if (!score) return "";

  let color = "#6c757d"; // gray
  let label = "Meh";

  if (score >= 85) { color = "#dc3545"; label = "🔥 HOT"; }
  else if (score >= 70) { color = "#fd7e14"; label = "Worth it"; }
  else if (score >= 50) { color = "#28a745"; label = "Solid"; }

  return `<span style="background: ${color}; color: white; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${label} ${score}</span>`;
}

/**
 * Build weather safety indicator
 */
function buildWeatherIndicator(venueType: VenueType | undefined, weather: WeatherData | null): string {
  if (!venueType || !weather) return "";

  const safe = isWeatherSafe(venueType, weather);

  if (venueType === "INDOOR") {
    return `<span style="color: #28a745; font-size: 12px;">✓ Indoor</span>`;
  } else if (venueType === "OUTDOOR" && !safe) {
    return `<span style="color: #dc3545; font-size: 12px;">⚠️ Weather risk</span>`;
  } else if (venueType === "OUTDOOR") {
    return `<span style="color: #28a745; font-size: 12px;">☀️ Perfect weather</span>`;
  }
  return "";
}

/**
 * Build feedback links
 */
function buildFeedbackLinks(eventId: string, token: string | undefined, appBaseUrl: string): string {
  if (!token) return "";

  return `<span style="margin-left: 12px;">
    <a href="${appBaseUrl}/api/feedback?token=${token}&rating=up" style="text-decoration: none; font-size: 14px;">👍</a>
    <a href="${appBaseUrl}/api/feedback?token=${token}&rating=down" style="text-decoration: none; font-size: 14px; margin-left: 4px;">👎</a>
  </span>`;
}

/**
 * Build the complete enhanced digest HTML
 */
export async function buildEnhancedDigestHtml(
  events: EnhancedEvent[],
  mtaAlerts: MtaAlertInput[],
  options: EnhancedDigestOptions
): Promise<string> {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const vibePreset = options.vibePreset || "REGULAR";

  // Fetch weather
  const forecast = await fetchNYCWeatherForecast();
  const todayForecast = forecast?.days[0] || null;

  // Convert forecast to WeatherData for scoring
  const weatherData: WeatherData | null = todayForecast ? {
    temperature: todayForecast.temperature,
    precipitationProbability: todayForecast.probabilityOfPrecipitation || 0,
    windSpeed: 10, // Default, NWS doesn't always provide this
    condition: todayForecast.shortForecast.toLowerCase().includes("thunder") ? "thunderstorm" :
               todayForecast.shortForecast.toLowerCase().includes("rain") ? "rain" : "clear"
  } : null;

  // Build weather header
  const weatherHeader = buildWeatherHeader(todayForecast);

  // Build commute section
  const commuteSection = buildCommuteSection(options.zipCode, mtaAlerts, vibePreset);

  // Sort events by hype score (highest first) within each module
  const sortedEvents = [...events].sort((a, b) => (b.hypeScore || 0) - (a.hypeScore || 0));

  // Group by module
  const byModule: Record<string, EnhancedEvent[]> = {};
  for (const event of sortedEvents) {
    if (!byModule[event.moduleId]) byModule[event.moduleId] = [];
    byModule[event.moduleId].push(event);
  }

  // Build event sections
  const sections = Object.entries(byModule).map(([moduleId, moduleEvents]) => {
    const first = moduleEvents[0];

    const eventRows = moduleEvents.map(e => {
      const hypeBadge = buildHypeBadge(e.hypeScore);
      const weatherIndicator = buildWeatherIndicator(e.venueType, weatherData);
      const feedbackLinks = buildFeedbackLinks(e.id, options.feedbackTokens?.[e.id], appBaseUrl);

      return `<tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600; color: #1a1a1a;">
            ${escapeHtml(e.title)}${hypeBadge}
          </div>
          ${e.location ? `<div style="font-size: 13px; color: #666; margin-top: 2px;">📍 ${escapeHtml(e.location)}</div>` : ""}
          ${e.body ? `<div style="font-size: 13px; color: #666; margin-top: 4px;">${escapeHtml(e.body)}</div>` : ""}
          <div style="margin-top: 4px;">
            ${weatherIndicator}
            ${feedbackLinks}
          </div>
        </td>
      </tr>`;
    }).join("");

    return `<div style="margin-bottom: 28px;">
      <h2 style="color: #1a365d; font-size: 18px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
        ${first.moduleIcon} ${escapeHtml(first.moduleName)}
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${eventRows}
      </table>
    </div>`;
  }).join("");

  // Build vibe-specific greeting
  const greetings: Record<string, string> = {
    TRANSPLANT: `Good morning! Here's everything happening in the city today. We've sorted by what's worth your time. 🗽`,
    REGULAR: `Here's your NYC rundown for today.`,
    LOCAL: `Today's intel.`
  };
  const greeting = greetings[vibePreset] || greetings.REGULAR;

  // Build referral section
  const referralSection = options.referralCode ? `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin-top: 32px; border-radius: 12px; text-align: center;">
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
        💌 Know someone who'd love this?
      </div>
      <div style="font-size: 14px; opacity: 0.9; margin-bottom: 12px;">
        Share your link and get 1 month free when they subscribe!
      </div>
      <a href="${appBaseUrl}/r/${escapeHtml(options.referralCode)}"
         style="display: inline-block; background: white; color: #667eea; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        ${appBaseUrl}/r/${escapeHtml(options.referralCode)}
      </a>
    </div>
  ` : "";

  // Format date
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NYC Today - ${today}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">

  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #1a365d; font-size: 28px; margin: 0;">🗽 NYC TODAY</h1>
    <div style="color: #64748b; font-size: 14px;">${today}</div>
  </div>

  ${weatherHeader}

  ${commuteSection}

  <div style="color: #475569; font-size: 15px; margin-bottom: 24px; line-height: 1.5;">
    ${greeting}
  </div>

  ${sections}

  <div style="margin-top: 32px; padding: 20px; background: #f1f5f9; border-radius: 12px; text-align: center;">
    <div style="font-weight: bold; color: #1a365d; margin-bottom: 8px;">
      ⚡ Get alerts instantly via SMS
    </div>
    <div style="color: #64748b; font-size: 14px; margin-bottom: 12px;">
      Premium users got these alerts yesterday.
    </div>
    <a href="${appBaseUrl}/dashboard?upgrade=true"
       style="display: inline-block; background: #1a365d; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
      Upgrade for $7/mo
    </a>
  </div>

  ${referralSection}

  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
    <a href="${appBaseUrl}/preferences" style="color: #64748b;">Manage preferences</a> ·
    <a href="${appBaseUrl}/unsubscribe" style="color: #64748b;">Unsubscribe</a>
    <div style="margin-top: 8px;">NYCPing · The definitive NYC alerts platform</div>
  </div>

</body>
</html>`;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Build subject line with weather context
 */
export function buildEnhancedSubject(eventCount: number, weatherEmoji: string = "🗽"): string {
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${weatherEmoji} NYC Today: ${today} — ${eventCount} things worth knowing`;
}
