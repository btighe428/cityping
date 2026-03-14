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
import { cardImageUrl } from "../cards/url-builder";
import type {
  TrafficCardData,
  CitiBikeCardData,
  AirportCardData,
  EnvironmentalCardData,
  FerryCardData,
  CoatCardData,
  MoneySaverCardData,
} from "../cards/types";
import { aggregateMoneySavers } from "../agents/money-saver-agent";

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

    const cardData: AirportCardData = {
      delays: activeDelays.map((d) => ({
        airportCode: d.airportCode,
        status: d.status as "delays" | "ground_stop",
        reason: d.delayReason,
        avgMinutes: d.avgDelayMinutes,
      })),
    };
    const imgUrl = cardImageUrl("airport", cardData);
    const html = `<div style="margin: 8px 0;">
      <img src="${imgUrl}" alt="Airport Delays: ${delayLines.join(', ')}"
        width="600" style="width:100%;max-width:600px;height:auto;display:block;border-radius:12px;" />
    </div>`;

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

    const cardData: CoatCardData = {
      coat: decision.coat,
      umbrella: decision.umbrella,
      summary: decision.summary,
      temperature: decision.details.temperature,
      feelsLike: decision.details.feelsLike,
      precipProbability: decision.details.precipProbability,
      conditions: decision.details.conditions,
    };
    const imgUrl = cardImageUrl("coat", cardData);
    const html = `<div style="margin: 8px 0;">
      <img src="${imgUrl}" alt="What to Wear: ${decision.summary}"
        width="600" style="width:100%;max-width:600px;height:auto;display:block;border-radius:12px;" />
    </div>`;

    return {
      type: "coat_umbrella",
      title: "What to Wear",
      priority: 85,
      html,
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
      <div style="background-color: #1C1C1E; padding: 16px; border-radius: 12px; margin: 12px 0;">
        <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 12px;">
          📡 Live Weather Radar & Satellite
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <!-- Radar -->
            <td width="50%" style="padding-right: 8px; vertical-align: top;">
              <div style="font-size: 11px; color: #8E8E93; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">NYC Radar (Live)</div>
              <a href="https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJ3ZWF0aGVyIiwiY2VudGVyIjpbLTczLjk1LDQwLjc1XSwiem9vbSI6OX19" style="display: block;">
                <img src="${staticRadarUrl}" alt="NYC Weather Radar" width="260" style="width: 100%; max-width: 260px; border-radius: 8px; display: block;" />
              </a>
              <div style="font-size: 10px; color: #636366; margin-top: 4px;">Tap for animated radar →</div>
            </td>
            <!-- Satellite -->
            <td width="50%" style="padding-left: 8px; vertical-align: top;">
              <div style="font-size: 11px; color: #8E8E93; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Northeast Satellite</div>
              <a href="https://www.star.nesdis.noaa.gov/goes/sector.php?sat=G16&sector=ne" style="display: block;">
                <img src="${satelliteUrl}" alt="Northeast Satellite" width="260" style="width: 100%; max-width: 260px; border-radius: 8px; display: block;" />
              </a>
              <div style="font-size: 10px; color: #636366; margin-top: 4px;">GOES-16 GEOCOLOR →</div>
            </td>
          </tr>
        </table>
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #2C2C2E; font-size: 11px; color: #636366;">
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
    const cardData: EnvironmentalCardData = {};

    if (readings.pollen && readings.pollen.category !== "None") {
      items.push(`Pollen (${readings.pollen.type}): ${readings.pollen.category}`);
      cardData.pollen = { type: readings.pollen.type, category: readings.pollen.category };
    }

    if (readings.uv) {
      items.push(`UV Index: ${readings.uv.value} (${readings.uv.category})`);
      cardData.uv = { value: readings.uv.value, category: readings.uv.category };
    }

    const imgUrl = cardImageUrl("environmental", cardData);
    const html = `<div style="margin: 8px 0;">
      <img src="${imgUrl}" alt="Environmental: ${items.join(', ')}"
        width="600" style="width:100%;max-width:600px;height:auto;display:block;border-radius:12px;" />
    </div>`;

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

    const cardData: TrafficCardData = {
      averageScore: summary.averageScore,
      label: summary.label,
      worstRegion: summary.worstRegion ?? undefined,
      worstScore: summary.worstScore,
      boroughs: boroughItems,
      crz: { rate: crz.rate, period: crz.period },
    };
    const imgUrl = cardImageUrl("traffic", cardData);
    const html = `<div style="margin: 8px 0;">
      <img src="${imgUrl}" alt="NYC Traffic: ${summary.label} (${summary.averageScore}/10)"
        width="600" style="width:100%;max-width:600px;height:auto;display:block;border-radius:12px;" />
    </div>`;

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
  if (pct >= 50) return { color: "#30D158", indicator: "●", status: "Good" };
  if (pct >= 25) return { color: "#FF9F0A", indicator: "●", status: "Low" };
  return { color: "#FF453A", indicator: "●", status: "Critical" };
}

/**
 * Build CitiBike section (premium, personalized)
 */
async function buildCitiBikeSection(userId: string): Promise<PremiumSection | null> {
  try {
    const stations = await getUserStationStatus(userId);

    // Only show if user has saved stations
    if (!stations.home && !stations.work) return null;

    const items: string[] = [];
    const cardStations: CitiBikeCardData["stations"] = [];

    if (stations.home) {
      const bikeStatus = getAvailabilityStatus(stations.home.bikesAvailable, stations.home.capacity);
      items.push(`Home (${stations.home.name}): ${stations.home.bikesAvailable}/${stations.home.capacity} bikes (${bikeStatus.status}), ${stations.home.docksAvailable} docks`);
      cardStations.push({
        type: "home",
        name: stations.home.name,
        bikesAvailable: stations.home.bikesAvailable,
        docksAvailable: stations.home.docksAvailable,
        capacity: stations.home.capacity,
      });
    }

    if (stations.work) {
      const bikeStatus = getAvailabilityStatus(stations.work.bikesAvailable, stations.work.capacity);
      items.push(`Work (${stations.work.name}): ${stations.work.bikesAvailable}/${stations.work.capacity} bikes (${bikeStatus.status}), ${stations.work.docksAvailable} docks`);
      cardStations.push({
        type: "work",
        name: stations.work.name,
        bikesAvailable: stations.work.bikesAvailable,
        docksAvailable: stations.work.docksAvailable,
        capacity: stations.work.capacity,
      });
    }

    const cardData: CitiBikeCardData = { stations: cardStations };
    const imgUrl = cardImageUrl("citibike", cardData);
    const html = `<div style="margin: 8px 0;">
      <img src="${imgUrl}" alt="CitiBike: ${items.join('; ')}"
        width="600" style="width:100%;max-width:600px;height:auto;display:block;border-radius:12px;" />
    </div>`;

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

    const cardData: FerryCardData = {
      alerts: alerts.map((a) => ({
        severity: a.severity,
        routeName: a.routeName,
        title: a.title,
      })),
    };
    const imgUrl = cardImageUrl("ferry", cardData);
    const statusLabel = alerts.length === 0 ? "All Clear" : `${alerts.length} alert${alerts.length > 1 ? "s" : ""}`;
    const html = `<div style="margin: 8px 0;">
      <img src="${imgUrl}" alt="Ferry Status: ${statusLabel}"
        width="600" style="width:100%;max-width:600px;height:auto;display:block;border-radius:12px;" />
    </div>`;

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

/**
 * Build money saver section (premium)
 */
async function buildMoneySaverSection(): Promise<PremiumSection | null> {
  try {
    const result = await aggregateMoneySavers();

    // Only show if there are active deals
    if (result.totalSavings === 0) return null;

    const cardData: MoneySaverCardData = {
      totalCount: result.totalSavings,
      diningDeals: result.diningDeals.count,
      freeEvents: result.freeEvents.count,
      topDeal: result.diningDeals.topItems[0]?.title,
    };
    const imgUrl = cardImageUrl("money-saver", cardData);

    const summaryParts: string[] = [];
    if (result.diningDeals.count > 0) summaryParts.push(`${result.diningDeals.count} dining deals`);
    if (result.freeEvents.count > 0) summaryParts.push(`${result.freeEvents.count} free events`);

    const html = `<div style="margin: 8px 0;">
      <img src="${imgUrl}" alt="Money Saver: ${summaryParts.join(', ')}"
        width="600" style="width:100%;max-width:600px;height:auto;display:block;border-radius:12px;" />
    </div>`;

    const text = `💰 MONEY SAVER\n${result.totalSavings} active deals: ${summaryParts.join(", ")}`;

    return {
      type: "money_saver",
      title: "Money Saver",
      priority: 55,
      html,
      text,
      isPremiumOnly: true,
    };
  } catch (error) {
    console.error("[PremiumSections] Money saver section error:", error);
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
    moneySaverSection,
  ] = await Promise.all([
    buildAirportSection(),
    buildCoatUmbrellaSection(),
    buildWeatherRadarSection(),
    buildEnvironmentalSection(),
    buildFerrySection(),
    buildTrafficSection(),
    buildCitiBikeSection(userId),
    buildOneThingSection(),
    buildMoneySaverSection(),
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
    moneySaverSection,
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
