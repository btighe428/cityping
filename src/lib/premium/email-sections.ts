// src/lib/premium/email-sections.ts
/**
 * Premium Email Sections Builder
 *
 * Builds premium-exclusive sections for email digests.
 * Free users see teasers, premium users see full content.
 *
 * Premium Sections:
 * 1. Airport Delays (priority 95) - when active delays
 * 2. Coat/Umbrella (priority 85) - daily decision
 * 3. Environmental (priority 75) - pollen/UV alerts
 * 4. Traffic (priority 70) - commute score
 * 5. CitiBike (priority 65) - dock availability
 * 6. Congestion Pricing (priority 60) - CRZ rate
 * 7. One Thing (priority 45) - daily curated event
 */

import { getCurrentAirportStatus, hasSignificantDelays, formatDelayForDigest } from "../scrapers/faa-airports";
import { getUserStationStatus } from "../scrapers/citibike";
import { getTodaysEnvironmentalReadings, hasEnvironmentalAlerts } from "../scrapers/environmental";
import { getNYCTrafficSummary, getCongestionPricingInfo, formatTrafficForDigest } from "../scrapers/traffic";
import { getActiveFerryAlerts, formatFerryAlertsForDigest } from "../scrapers/ferry";
import { getTodaysWearDecision, formatWearDecisionForDigest, getQuickWearLine } from "./coat-umbrella";
import { getTodaysOneThing, formatOneThingForDigest } from "./one-thing-curator";
import { prisma } from "../db";

// ============================================================================
// TYPES
// ============================================================================

export interface PremiumSection {
  type: string;
  title: string;
  priority: number;
  html: string;
  text: string;
  isPremiumOnly: boolean;
}

export interface PremiumSectionsResult {
  sections: PremiumSection[];
  teaser: {
    html: string;
    text: string;
    featureCount: number;
  } | null;
}

// ============================================================================
// SECTION BUILDERS
// ============================================================================

/**
 * Build airport delays section (premium, shows when delays exist)
 */
async function buildAirportSection(): Promise<PremiumSection | null> {
  try {
    const hasDelays = await hasSignificantDelays();
    if (!hasDelays) return null;

    const statuses = await getCurrentAirportStatus();
    const activeDelays = statuses.filter((s) => s.status !== "normal");

    if (activeDelays.length === 0) return null;

    const delayLines = activeDelays.map(formatDelayForDigest);

    const html = `
      <div style="background-color: #F5F1E8; padding: 12px 16px; border-radius: 8px; margin: 8px 0; border-left: 4px solid #8B7355;">
        <div style="font-size: 14px; font-weight: 600; color: #2d2d2d; margin-bottom: 8px;">
          ✈️ Airport Delays
        </div>
        ${delayLines.map((line) => `<div style="font-size: 13px; color: #5a5a5a; margin: 4px 0;">${line}</div>`).join("")}
      </div>
    `;

    const text = `✈️ AIRPORT DELAYS\n${delayLines.join("\n")}`;

    return {
      type: "airport_delays",
      title: "Airport Delays",
      priority: 95,
      html,
      text,
      isPremiumOnly: true,
    };
  } catch (error) {
    console.error("[PremiumSections] Airport section error:", error);
    return null;
  }
}

/**
 * Build coat/umbrella section (premium)
 */
async function buildCoatUmbrellaSection(): Promise<PremiumSection | null> {
  try {
    const decision = await getTodaysWearDecision();
    if (!decision) return null;

    const formatted = formatWearDecisionForDigest(decision);

    return {
      type: "coat_umbrella",
      title: "What to Wear",
      priority: 85,
      html: formatted.html,
      text: formatted.text,
      isPremiumOnly: true,
    };
  } catch (error) {
    console.error("[PremiumSections] Coat/umbrella section error:", error);
    return null;
  }
}

/**
 * Build weather radar section (premium)
 * Uses NWS radar imagery for NYC area (OKX station)
 */
async function buildWeatherRadarSection(): Promise<PremiumSection | null> {
  try {
    // NWS animated radar for NYC area (OKX station covers NYC)
    // Using NOAA's free radar imagery service
    const radarTimestamp = Date.now();
    const radarUrl = `https://radar.weather.gov/ridge/standard/KOKX_loop.gif?t=${radarTimestamp}`;
    const staticRadarUrl = `https://radar.weather.gov/ridge/standard/KOKX_0.gif?t=${radarTimestamp}`;

    // NWS satellite imagery - visible or IR based on time
    const hour = new Date().getHours();
    const isNighttime = hour < 6 || hour > 20;
    const satelliteType = isNighttime ? "GEOCOLOR" : "GEOCOLOR";  // GEOCOLOR works day and night
    const satelliteUrl = `https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/ne/GEOCOLOR/latest.jpg`;

    const html = `
      <div style="background-color: #F5F1E8; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <div style="font-size: 14px; font-weight: 600; color: #2d2d2d; margin-bottom: 12px;">
          📡 Live Weather Radar & Satellite
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <!-- Radar -->
            <td width="50%" style="padding-right: 8px; vertical-align: top;">
              <div style="font-size: 11px; color: #A59784; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">NYC Radar (Live)</div>
              <a href="https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJ3ZWF0aGVyIiwiY2VudGVyIjpbLTczLjk1LDQwLjc1XSwiem9vbSI6OX19" style="display: block;">
                <img src="${staticRadarUrl}" alt="NYC Weather Radar" width="260" style="width: 100%; max-width: 260px; border-radius: 6px; border: 1px solid #E8DFD1; display: block;" />
              </a>
              <div style="font-size: 10px; color: #A59784; margin-top: 4px;">Tap for animated radar →</div>
            </td>
            <!-- Satellite -->
            <td width="50%" style="padding-left: 8px; vertical-align: top;">
              <div style="font-size: 11px; color: #A59784; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Northeast Satellite</div>
              <a href="https://www.star.nesdis.noaa.gov/goes/sector.php?sat=G16&sector=ne" style="display: block;">
                <img src="${satelliteUrl}" alt="Northeast Satellite" width="260" style="width: 100%; max-width: 260px; border-radius: 6px; border: 1px solid #E8DFD1; display: block;" />
              </a>
              <div style="font-size: 10px; color: #A59784; margin-top: 4px;">GOES-16 GEOCOLOR →</div>
            </td>
          </tr>
        </table>
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #E8DFD1; font-size: 11px; color: #A59784;">
          💡 Green/blue = light rain • Yellow/orange = moderate • Red = heavy • Purple = severe
        </div>
      </div>
    `;

    const text = `📡 LIVE WEATHER RADAR & SATELLITE
Radar: https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJ3ZWF0aGVyIiwiY2VudGVyIjpbLTczLjk1LDQwLjc1XSwiem9vbSI6OX19
Satellite: https://www.star.nesdis.noaa.gov/goes/sector.php?sat=G16&sector=ne`;

    return {
      type: "weather_radar",
      title: "Weather Radar & Satellite",
      priority: 90, // Very high - appears right after airport delays
      html,
      text,
      isPremiumOnly: true,
    };
  } catch (error) {
    console.error("[PremiumSections] Weather radar section error:", error);
    return null;
  }
}

/**
 * Build environmental section (premium, shows when alerts exist)
 */
async function buildEnvironmentalSection(): Promise<PremiumSection | null> {
  try {
    const readings = await getTodaysEnvironmentalReadings();
    if (!readings.pollen && !readings.uv) return null;

    // Only show if there are notable conditions
    const hasNotableConditions =
      (readings.pollen && readings.pollen.category !== "None" && readings.pollen.category !== "Low") ||
      (readings.uv && readings.uv.category !== "Low");

    if (!hasNotableConditions) return null;

    const items: string[] = [];
    let itemsHtml = "";

    if (readings.pollen && readings.pollen.category !== "None") {
      items.push(`Pollen (${readings.pollen.type}): ${readings.pollen.category}`);
      const pollenColor =
        readings.pollen.category === "High" || readings.pollen.category === "Very High"
          ? "#8B4513"
          : "#A0826D";
      itemsHtml += `
        <div style="margin: 4px 0; font-size: 13px;">
          <span style="color: ${pollenColor};">🌿 Pollen (${readings.pollen.type}): ${readings.pollen.category}</span>
        </div>
      `;
    }

    if (readings.uv) {
      items.push(`UV Index: ${readings.uv.value} (${readings.uv.category})`);
      const uvColor =
        readings.uv.category === "High" || readings.uv.category === "Very High" || readings.uv.category === "Extreme"
          ? "#8B4513"
          : "#A0826D";
      itemsHtml += `
        <div style="margin: 4px 0; font-size: 13px;">
          <span style="color: ${uvColor};">☀️ UV Index: ${readings.uv.value} (${readings.uv.category})</span>
        </div>
      `;
    }

    const html = `
      <div style="background-color: #F5F1E8; padding: 12px 16px; border-radius: 8px; margin: 8px 0;">
        <div style="font-size: 14px; font-weight: 600; color: #2d2d2d; margin-bottom: 8px;">
          🌡️ Environmental Conditions
        </div>
        ${itemsHtml}
      </div>
    `;

    const text = `🌡️ ENVIRONMENTAL\n${items.join("\n")}`;

    return {
      type: "environmental",
      title: "Environmental Conditions",
      priority: 75,
      html,
      text,
      isPremiumOnly: true,
    };
  } catch (error) {
    console.error("[PremiumSections] Environmental section error:", error);
    return null;
  }
}

/**
 * Build traffic section (premium) - with borough breakdown
 */
async function buildTrafficSection(): Promise<PremiumSection | null> {
  try {
    const summary = await getNYCTrafficSummary();
    const crz = await getCongestionPricingInfo();
    const { getCurrentTrafficScores } = await import("../scrapers/traffic");
    const allScores = await getCurrentTrafficScores();

    // Skip if traffic data unavailable
    if (summary.label === "Data unavailable") return null;

    // Color based on friction score
    const getScoreColor = (score: number) =>
      score >= 7 ? "#8B4513" : score >= 5 ? "#A0826D" : "#8B7355";

    const getScoreEmoji = (score: number) =>
      score >= 7 ? "🔴" : score >= 5 ? "🟡" : "🟢";

    // Build borough breakdown
    const regionNames: Record<string, string> = {
      manhattan_midtown: "Midtown",
      manhattan_downtown: "Downtown",
      brooklyn: "Brooklyn",
      queens: "Queens",
      bronx: "Bronx",
    };

    const boroughItems = allScores
      .filter(s => s.label !== "Data unavailable")
      .map(s => ({
        name: regionNames[s.region] || s.region,
        score: s.frictionScore,
        label: s.label,
      }))
      .sort((a, b) => b.score - a.score); // Worst first

    const boroughHtml = boroughItems.map(b => `
      <div style="display: inline-block; margin: 2px 6px 2px 0; padding: 4px 8px; background: ${getScoreColor(b.score)}15; border-radius: 4px; font-size: 12px;">
        <span style="color: ${getScoreColor(b.score)};">${getScoreEmoji(b.score)}</span>
        <span style="color: #2d2d2d; font-weight: 500;">${b.name}</span>
        <span style="color: #A59784;">${b.score}/10</span>
      </div>
    `).join("");

    // CRZ info with rate styling
    const crzColor = crz.rate >= 9 ? "#8B4513" : "#8B7355";
    const savingsNote = crz.period === "peak"
      ? "Leave before 5am or after 9pm to save $6.75"
      : crz.period === "overnight"
        ? "Best rate - overnight pricing active"
        : "";

    const html = `
      <div style="background-color: #FAF7F2; padding: 12px 16px; border-radius: 8px; margin: 8px 0;">
        <div style="font-size: 14px; font-weight: 600; color: #2d2d2d; margin-bottom: 4px;">
          🚗 Driving Conditions
        </div>
        <div style="font-size: 11px; color: #A59784; margin-bottom: 10px;">Real-time traffic across NYC</div>

        <!-- Overall Score -->
        <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: white; border-radius: 6px; border: 1px solid #E8DFD1;">
          <div style="font-size: 28px; font-weight: 700; color: ${getScoreColor(summary.averageScore)}; margin-right: 12px;">
            ${summary.averageScore}/10
          </div>
          <div>
            <div style="font-weight: 600; color: #2d2d2d;">${summary.label}</div>
            ${summary.worstRegion && summary.worstScore >= 6
              ? `<div style="font-size: 12px; color: #8B4513;">⚠️ ${summary.worstRegion} slowest (${summary.worstScore}/10)</div>`
              : `<div style="font-size: 12px; color: #8B7355;">✓ No major delays</div>`
            }
          </div>
        </div>

        <!-- Borough Breakdown -->
        <div style="margin-bottom: 12px;">
          ${boroughHtml}
        </div>

        <!-- CRZ Pricing -->
        <div style="padding: 8px 10px; background: ${crzColor}10; border-radius: 6px; border-left: 3px solid ${crzColor};">
          <div style="font-size: 13px;">
            <span style="font-weight: 600; color: ${crzColor};">CRZ: $${crz.rate.toFixed(2)}</span>
            <span style="color: #64748b; margin-left: 8px;">${crz.period} rate</span>
          </div>
          ${savingsNote ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">💡 ${savingsNote}</div>` : ""}
        </div>
      </div>
    `;

    const boroughText = boroughItems.map(b => `  ${b.name}: ${b.score}/10 (${b.label})`).join("\n");
    const text = `🚗 DRIVING CONDITIONS\nOverall: ${summary.averageScore}/10 - ${summary.label}\n${boroughText}\nCRZ: $${crz.rate.toFixed(2)} (${crz.period})`;

    return {
      type: "traffic",
      title: "Driving Conditions",
      priority: 70,
      html,
      text,
      isPremiumOnly: true,
    };
  } catch (error) {
    console.error("[PremiumSections] Traffic section error:", error);
    return null;
  }
}

/**
 * Get availability status color and indicator
 */
function getAvailabilityStatus(available: number, capacity: number): { color: string; indicator: string; status: string } {
  const pct = capacity > 0 ? (available / capacity) * 100 : 0;
  if (pct >= 50) return { color: "#16a34a", indicator: "●", status: "Good" };
  if (pct >= 25) return { color: "#ca8a04", indicator: "●", status: "Low" };
  return { color: "#dc2626", indicator: "●", status: "Critical" };
}

/**
 * Build CitiBike section (premium, personalized)
 */
async function buildCitiBikeSection(userId: string): Promise<PremiumSection | null> {
  try {
    const stations = await getUserStationStatus(userId);

    // Only show if user has saved stations
    if (!stations.home && !stations.work) return null;

    let itemsHtml = "";
    const items: string[] = [];

    if (stations.home) {
      const bikeStatus = getAvailabilityStatus(stations.home.bikesAvailable, stations.home.capacity);
      const dockStatus = getAvailabilityStatus(stations.home.docksAvailable, stations.home.capacity);
      const fillPct = Math.round((stations.home.bikesAvailable / stations.home.capacity) * 100);

      items.push(`Home (${stations.home.name}): ${stations.home.bikesAvailable}/${stations.home.capacity} bikes (${bikeStatus.status}), ${stations.home.docksAvailable} docks`);
      itemsHtml += `
        <div style="font-size: 13px; margin: 8px 0; padding: 10px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: 600; color: #1e40af; margin-bottom: 6px;">🏠 Home Station</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${stations.home.name}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="color: ${bikeStatus.color}; font-size: 16px;">${bikeStatus.indicator}</span>
              <strong style="font-size: 18px; color: #111827;">${stations.home.bikesAvailable}</strong>
              <span style="color: #64748b; font-size: 12px;">bikes</span>
            </div>
            <div style="text-align: center; padding: 0 12px;">
              <div style="width: 60px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                <div style="width: ${fillPct}%; height: 100%; background: ${bikeStatus.color};"></div>
              </div>
              <span style="font-size: 10px; color: #64748b;">${fillPct}% full</span>
            </div>
            <div>
              <span style="color: ${dockStatus.color}; font-size: 16px;">${dockStatus.indicator}</span>
              <strong style="font-size: 18px; color: #111827;">${stations.home.docksAvailable}</strong>
              <span style="color: #64748b; font-size: 12px;">docks</span>
            </div>
          </div>
        </div>
      `;
    }

    if (stations.work) {
      const bikeStatus = getAvailabilityStatus(stations.work.bikesAvailable, stations.work.capacity);
      const dockStatus = getAvailabilityStatus(stations.work.docksAvailable, stations.work.capacity);
      const fillPct = Math.round((stations.work.bikesAvailable / stations.work.capacity) * 100);

      items.push(`Work (${stations.work.name}): ${stations.work.bikesAvailable}/${stations.work.capacity} bikes (${bikeStatus.status}), ${stations.work.docksAvailable} docks`);
      itemsHtml += `
        <div style="font-size: 13px; margin: 8px 0; padding: 10px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: 600; color: #1e40af; margin-bottom: 6px;">💼 Work Station</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${stations.work.name}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="color: ${bikeStatus.color}; font-size: 16px;">${bikeStatus.indicator}</span>
              <strong style="font-size: 18px; color: #111827;">${stations.work.bikesAvailable}</strong>
              <span style="color: #64748b; font-size: 12px;">bikes</span>
            </div>
            <div style="text-align: center; padding: 0 12px;">
              <div style="width: 60px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                <div style="width: ${fillPct}%; height: 100%; background: ${bikeStatus.color};"></div>
              </div>
              <span style="font-size: 10px; color: #64748b;">${fillPct}% full</span>
            </div>
            <div>
              <span style="color: ${dockStatus.color}; font-size: 16px;">${dockStatus.indicator}</span>
              <strong style="font-size: 18px; color: #111827;">${stations.work.docksAvailable}</strong>
              <span style="color: #64748b; font-size: 12px;">docks</span>
            </div>
          </div>
        </div>
      `;
    }

    const html = `
      <div style="background-color: #eff6ff; padding: 12px 16px; border-radius: 8px; margin: 8px 0;">
        <div style="font-size: 14px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">
          🚲 CitiBike Status
        </div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">Real-time availability at your saved stations</div>
        ${itemsHtml}
      </div>
    `;

    const text = `🚲 CITIBIKE\n${items.join("\n")}`;

    return {
      type: "citibike",
      title: "CitiBike Status",
      priority: 65,
      html,
      text,
      isPremiumOnly: true,
    };
  } catch (error) {
    console.error("[PremiumSections] CitiBike section error:", error);
    return null;
  }
}

/**
 * Build One Thing section (premium)
 */
async function buildOneThingSection(): Promise<PremiumSection | null> {
  try {
    const oneThing = await getTodaysOneThing();
    if (!oneThing) return null;

    const formatted = formatOneThingForDigest(oneThing);

    return {
      type: "one_thing",
      title: "One Thing To Do",
      priority: 45,
      html: formatted.html,
      text: formatted.text,
      isPremiumOnly: true,
    };
  } catch (error) {
    console.error("[PremiumSections] One Thing section error:", error);
    return null;
  }
}

/**
 * Build ferry status section (premium, shows when alerts exist)
 */
async function buildFerrySection(): Promise<PremiumSection | null> {
  try {
    const { alerts, hasSignificantAlerts } = await getActiveFerryAlerts();

    // Always show for premium - either alerts or "all clear"
    const formatted = formatFerryAlertsForDigest(alerts);

    // Determine background color based on status
    const bgColor = alerts.length === 0
      ? "#f0fdf4" // Green tint for all clear
      : hasSignificantAlerts
        ? "#fef2f2" // Red tint for significant
        : "#fffbeb"; // Yellow tint for minor

    const borderColor = alerts.length === 0
      ? "#16a34a"
      : hasSignificantAlerts
        ? "#dc2626"
        : "#f59e0b";

    const html = `
      <div style="background-color: ${bgColor}; padding: 12px 16px; border-radius: 8px; margin: 8px 0; border-left: 4px solid ${borderColor};">
        <div style="font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px;">
          &#128674; Ferry Status
        </div>
        ${formatted.html}
      </div>
    `;

    const text = `FERRY STATUS\n${formatted.text}`;

    return {
      type: "ferry_status",
      title: "Ferry Status",
      priority: 72, // Between environmental (75) and traffic (70)
      html,
      text,
      isPremiumOnly: true,
    };
  } catch (error) {
    console.error("[PremiumSections] Ferry section error:", error);
    return null;
  }
}

// ============================================================================
// MAIN BUILDERS
// ============================================================================

/**
 * Build all premium sections for a user
 */
export async function buildPremiumSections(
  userId: string,
  isPremium: boolean
): Promise<PremiumSectionsResult> {
  // Build all sections in parallel
  const [
    airportSection,
    coatUmbrellaSection,
    weatherRadarSection,
    environmentalSection,
    ferrySection,
    trafficSection,
    citiBikeSection,
    oneThingSection,
  ] = await Promise.all([
    buildAirportSection(),
    buildCoatUmbrellaSection(),
    buildWeatherRadarSection(),
    buildEnvironmentalSection(),
    buildFerrySection(),
    buildTrafficSection(),
    buildCitiBikeSection(userId),
    buildOneThingSection(),
  ]);

  const allSections = [
    airportSection,
    coatUmbrellaSection,
    weatherRadarSection,
    environmentalSection,
    ferrySection,
    trafficSection,
    citiBikeSection,
    oneThingSection,
  ].filter((s): s is PremiumSection => s !== null);

  // Sort by priority
  allSections.sort((a, b) => b.priority - a.priority);

  if (isPremium) {
    // Premium users get full sections
    return {
      sections: allSections,
      teaser: null,
    };
  }

  // Free users get teaser
  const premiumFeatureCount = allSections.length;

  if (premiumFeatureCount === 0) {
    return { sections: [], teaser: null };
  }

  const featureNames = allSections.slice(0, 3).map((s) => s.title).join(", ");

  const teaserHtml = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 12px; margin: 16px 0; color: white; text-align: center;">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">
        ✨ ${premiumFeatureCount} Premium Features Available
      </div>
      <div style="font-size: 12px; opacity: 0.9; margin-bottom: 12px;">
        ${featureNames}${premiumFeatureCount > 3 ? `, and ${premiumFeatureCount - 3} more` : ""}
      </div>
      <a href="https://cityping.net/premium" style="display: inline-block; background: white; color: #764ba2; padding: 8px 20px; border-radius: 20px; text-decoration: none; font-size: 13px; font-weight: 600;">
        Upgrade for $0.99/mo
      </a>
    </div>
  `;

  const teaserText = `
✨ ${premiumFeatureCount} PREMIUM FEATURES AVAILABLE
${featureNames}${premiumFeatureCount > 3 ? `, and ${premiumFeatureCount - 3} more` : ""}

Upgrade at https://cityping.net/premium - just $0.99/mo
  `.trim();

  return {
    sections: [],
    teaser: {
      html: teaserHtml,
      text: teaserText,
      featureCount: premiumFeatureCount,
    },
  };
}

/**
 * Get quick premium summary for email header
 */
export async function getPremiumQuickSummary(userId: string): Promise<string | null> {
  try {
    const [decision, summary] = await Promise.all([
      getTodaysWearDecision(),
      getNYCTrafficSummary(),
    ]);

    const parts: string[] = [];

    if (decision) {
      parts.push(getQuickWearLine(decision));
    }

    if (summary && summary.label !== "Data unavailable" && summary.averageScore >= 6) {
      parts.push(`Traffic: ${summary.label}`);
    }

    return parts.length > 0 ? parts.join(" • ") : null;
  } catch {
    return null;
  }
}

/**
 * Check if user is premium
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  return user?.tier === "premium";
}
