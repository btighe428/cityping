/**
 * CityPing Morning Brief - 9am Email Template
 * 
 * Designed for the "coffee check" — scanning before leaving home.
 * Fast, scannable, action-oriented. No fluff.
 * 
 * Information hierarchy (most important first):
 * 1. PARKING STATUS - Can I leave my car where it is?
 * 2. TRANSIT ALERTS - Will my commute work?
 * 3. WEATHER - Do I need an umbrella/coat?
 * 4. TODAY'S TIMING - When do I actually need to move the car?
 * 5. DAY AHEAD - What's coming tomorrow
 */

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  containerStyle,
  footer,
} from "../email-design-system";

// =============================================================================
// TYPES
// =============================================================================

export interface MorningParkingStatus {
  /** Is ASP suspended today? */
  aspSuspended: boolean;
  /** Holiday or reason for suspension */
  reason?: string;
  /** Are meters suspended too? */
  metersSuspended?: boolean;
  /** Next time car needs to move */
  nextMoveRequired?: {
    date: string;
    time: string;
    dayOfWeek: string;
  };
  /** Any overnight changes user should know */
  overnightChanges?: string[];
}

export interface MorningTransitAlert {
  line: string;
  status: "good" | "delays" | "skip";
  headline: string;
  details?: string;
}

export interface MorningWeather {
  temp: number;
  condition: string;
  icon: string;
  precipChance?: number;
  /** Coat, umbrella, etc. */
  gearRecommendation?: string;
}

export interface MorningDayAhead {
  /** Tomorrow's date */
  date: string;
  dayOfWeek: string;
  aspSuspended: boolean;
  reason?: string;
  /** Any notable weather or events */
  note?: string;
}

export interface MorningBriefData {
  date: Date;
  user: {
    neighborhood?: string;
    zipCode?: string;
  };
  parking: MorningParkingStatus;
  transit: MorningTransitAlert[];
  weather: MorningWeather;
  dayAhead: MorningDayAhead;
}

// =============================================================================
// COPY VARIATIONS - Keep it fresh
// =============================================================================

const GOOD_NEWS_LINES = [
  "ASP is suspended today.",
  "Your car gets a break today.",
  "No street cleaning today.",
  "Park it and leave it.",
];

const MOVE_TODAY_LINES = [
  "ASP is in effect today.",
  "Regular parking rules apply.",
  "Street cleaning is on today.",
];

const SLEEP_IN_LINES = [
  "Sleep in! No rush to move the car.",
  "Extra coffee time — your car's fine.",
  "No early alarm needed today.",
];

const CLEAR_WEATHER_LINES = [
  "Clear skies ahead.",
  "Nice day out there.",
  "Weather's cooperating.",
];

const RAIN_LINES = [
  "Grab an umbrella.",
  "Don't forget the raincoat.",
  "Wet commute ahead.",
];

function getGoodNewsLine(): string {
  return GOOD_NEWS_LINES[Math.floor(Math.random() * GOOD_NEWS_LINES.length)];
}

function getMoveTodayLine(): string {
  return MOVE_TODAY_LINES[Math.floor(Math.random() * MOVE_TODAY_LINES.length)];
}

function getSleepInLine(): string {
  return SLEEP_IN_LINES[Math.floor(Math.random() * SLEEP_IN_LINES.length)];
}

// =============================================================================
// SUBJECT LINE VARIANTS
// =============================================================================

export const MORNING_SUBJECT_VARIANTS = {
  /** When ASP is suspended — lead with the win */
  aspSuspended: (reason?: string) => {
    const variants = [
      `🚗 No ASP today${reason ? ` (${reason})` : ""}`,
      `🎉 Your car can stay put${reason ? ` — ${reason}` : ""}`,
      `☕ Sleep in: ASP suspended${reason ? ` for ${reason}` : ""}`,
      `✅ ${reason || "No street cleaning"} — leave the car`,
      `🚗 ${reason || "Holiday"}: No need to move your car`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** When ASP is active — focus on timing */
  aspActive: (nextMove?: string) => {
    const variants = [
      `🚗 ASP in effect today${nextMove ? ` — move by ${nextMove}` : ""}`,
      `📋 Street cleaning today — plan your move`,
      `⏰ Regular parking rules today`,
      `🚗 Move your car today${nextMove ? ` (by ${nextMove})` : ""}`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** When there are transit issues */
  transitAlert: (line?: string) => {
    const variants = [
      `🚇 Transit alert${line ? `: ${line}` : ""} — check before you go`,
      `⚠️ Morning commute heads up`,
      `🚇 ${line || "Subway"} delays — alternate routes inside`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** When weather is the main story */
  weatherAlert: (condition?: string) => {
    const variants = [
      `☔ ${condition || "Rain"} today — bring an umbrella`,
      `🌤️ Weather heads up for your commute`,
      `❄️ Winter weather — transit + parking inside`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** Default/generic */
  default: () => {
    const variants = [
      `☕ Your NYC morning brief`,
      `🗽 Today in NYC: Parking, transit & weather`,
      `📋 Quick heads up for today`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },
};

// =============================================================================
// TEMPLATE RENDERER
// =============================================================================

export function morningBrief(data: MorningBriefData): { 
  subject: string; 
  html: string; 
  text: string;
  preheader: string;
} {
  const { date, user, parking, transit, weather, dayAhead } = data;

  const appBaseUrl = process.env.APP_BASE_URL || "https://cityping.net";
  
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Determine subject line priority
  const hasTransitIssues = transit.some(t => t.status === "skip" || t.status === "delays");
  const hasWeatherAlert = weather.precipChance && weather.precipChance > 50;
  
  let subject: string;
  let preheader: string;
  
  if (parking.aspSuspended) {
    subject = MORNING_SUBJECT_VARIANTS.aspSuspended(parking.reason);
    preheader = `Plus: ${weather.condition}, ${hasTransitIssues ? "transit alerts" : "smooth commute"}, and tomorrow's forecast`;
  } else if (hasTransitIssues) {
    subject = MORNING_SUBJECT_VARIANTS.transitAlert(transit.find(t => t.status !== "good")?.line);
    preheader = `Move your car by ${parking.nextMoveRequired?.time || "later"} + ${weather.condition} today`;
  } else if (hasWeatherAlert) {
    subject = MORNING_SUBJECT_VARIANTS.weatherAlert(weather.condition);
    preheader = `${parking.aspSuspended ? "ASP suspended" : "ASP in effect"} + transit status inside`;
  } else {
    subject = MORNING_SUBJECT_VARIANTS.default();
    preheader = `${parking.aspSuspended ? "Leave the car" : "Street cleaning today"} • ${weather.condition} • ${transit.filter(t => t.status === "good").length}/${transit.length} subway lines good`;
  }

  // Status color based on ASP
  const statusColor = parking.aspSuspended ? COLORS.status?.success || "#16a34a" : COLORS.navy?.[600] || "#475569";
  const statusBg = parking.aspSuspended ? "#f0fdf4" : "#f8fafc";

  // ==========================================================================
  // HTML EMAIL
  // ==========================================================================
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Morning Brief</title>
    </head>
    <body style="margin: 0; padding: 0; background: #f3f4f6;">
      <div style="${containerStyle}">

        <!-- Header -->
        <div style="
          text-align: center;
          margin-bottom: ${SPACING.md};
          padding-bottom: ${SPACING.md};
          border-bottom: 2px solid ${COLORS.navy?.[200] || "#e2e8f0"};
        ">
          <p style="
            margin: 0;
            font-size: 12px;
            color: ${COLORS.navy?.[400] || "#94a3b8"};
            text-transform: uppercase;
            letter-spacing: 1px;
          ">☕ Morning Brief</p>
          <h1 style="
            margin: 4px 0 0 0;
            font-size: 24px;
            color: ${COLORS.navy?.[800] || "#1e293b"};
          ">${dateStr}</h1>
          ${user.neighborhood ? `
            <p style="
              margin: 4px 0 0 0;
              font-size: ${TYPOGRAPHY?.sizes?.small || "13px"};
              color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
            ">📍 ${user.neighborhood}</p>
          ` : ""}
        </div>

        <!-- 1. PARKING STATUS - The main event -->
        <div style="
          background: ${statusBg};
          border-radius: 12px;
          padding: 24px;
          margin-bottom: ${SPACING.lg};
          border-left: 4px solid ${statusColor};
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
          ">
            <span style="font-size: 28px;">${parking.aspSuspended ? "✅" : "📋"}</span>
            <div>
              <h2 style="
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: ${parking.aspSuspended ? statusColor : COLORS.navy?.[800] || "#1e293b"};
              ">
                ${parking.aspSuspended ? getGoodNewsLine() : getMoveTodayLine()}
              </h2>
              ${parking.reason ? `
                <p style="
                  margin: 4px 0 0 0;
                  font-size: 14px;
                  color: ${COLORS.navy?.[600] || "#475569"};
                ">${parking.reason}</p>
              ` : ""}
            </div>
          </div>

          ${parking.metersSuspended ? `
            <p style="
              margin: 12px 0 0 0;
              font-size: 13px;
              color: ${COLORS.navy?.[600] || "#475569"};
              padding-left: 40px;
            ">
              Meters also suspended — free parking all day.
            </p>
          ` : ""}

          ${parking.nextMoveRequired && !parking.aspSuspended ? `
            <p style="
              margin: 12px 0 0 0;
              font-size: 14px;
              color: ${COLORS.navy?.[700] || "#334155"};
              padding-left: 40px;
              font-weight: 500;
            ">
              ⏰ Move by ${parking.nextMoveRequired.time} (${parking.nextMoveRequired.dayOfWeek})
            </p>
          ` : ""}

          ${parking.aspSuspended ? `
            <p style="
              margin: 12px 0 0 0;
              font-size: 14px;
              color: ${COLORS.navy?.[600] || "#475569"};
              padding-left: 40px;
            ">
              ${getSleepInLine()}
            </p>
          ` : ""}
        </div>

        ${parking.overnightChanges && parking.overnightChanges.length > 0 ? `
          <div style="
            background: #fef3c7;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: ${SPACING.lg};
            border-left: 3px solid #d97706;
          ">
            <p style="
              margin: 0 0 8px 0;
              font-size: 13px;
              font-weight: 600;
              color: #92400e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">⚠️ Overnight Changes</p>
            ${parking.overnightChanges.map(change => `
              <p style="
                margin: 4px 0;
                font-size: 14px;
                color: #78350f;
              ">• ${change}</p>
            `).join("")}
          </div>
        ` : ""}

        <!-- 2. WEATHER BAR - Quick scan -->
        <div style="
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 8px;
          padding: 16px 20px;
          margin-bottom: ${SPACING.lg};
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="font-size: 36px;">${weather.icon}</span>
            <div>
              <div style="
                font-size: 22px;
                font-weight: 700;
                color: ${COLORS.navy?.[800] || "#1e293b"};
              ">${weather.temp}°</div>
              <div style="
                font-size: 14px;
                color: ${COLORS.navy?.[600] || "#475569"};
              ">${weather.condition}</div>
            </div>
          </div>
          <div style="text-align: right;">
            ${weather.precipChance && weather.precipChance > 20 ? `
              <div style="
                font-size: 13px;
                color: ${weather.precipChance > 50 ? "#dc2626" : COLORS.navy?.[600] || "#475569"};
                font-weight: ${weather.precipChance > 50 ? "600" : "400"};
              ">
                ☔ ${weather.precipChance}% rain
              </div>
            ` : ""}
            ${weather.gearRecommendation ? `
              <div style="
                font-size: 13px;
                color: ${COLORS.navy?.[600] || "#475569"};
                margin-top: 4px;
              ">
                ${weather.gearRecommendation}
              </div>
            ` : ""}
          </div>
        </div>

        <!-- 3. TRANSIT ALERTS - Only if issues -->
        ${transit.some(t => t.status !== "good") ? `
          <div style="margin-bottom: ${SPACING.lg};">
            <h3 style="
              margin: 0 0 12px 0;
              font-size: 14px;
              font-weight: 600;
              color: ${COLORS.navy?.[800] || "#1e293b"};
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">🚇 Transit Status</h3>
            ${transit.filter(t => t.status !== "good").map(t => `
              <div style="
                background: ${t.status === "skip" ? "#fef2f2" : "#fffbeb"};
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 8px;
                border-left: 3px solid ${t.status === "skip" ? "#dc2626" : "#d97706"};
              ">
                <div style="
                  font-weight: 600;
                  color: ${t.status === "skip" ? "#dc2626" : "#92400e"};
                  font-size: 14px;
                  margin-bottom: 2px;
                ">
                  ${t.line}: ${t.status === "skip" ? "Major delays" : "Delays"}
                </div>
                <div style="
                  font-size: 13px;
                  color: ${COLORS.navy?.[700] || "#334155"};
                ">${t.headline}</div>
                ${t.details ? `
                  <div style="
                    font-size: 12px;
                    color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                    margin-top: 4px;
                  ">${t.details}</div>
                ` : ""}
              </div>
            `).join("")}
          </div>
        ` : ""}

        <!-- Good transit lines (collapsed) -->
        ${transit.filter(t => t.status === "good").length > 0 ? `
          <div style="
            background: #f0fdf4;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: ${SPACING.lg};
          ">
            <p style="
              margin: 0;
              font-size: 13px;
              color: #166534;
            ">
              ✅ ${transit.filter(t => t.status === "good").map(t => t.line).join(", ")} running normally
            </p>
          </div>
        ` : ""}

        <!-- 4. DAY AHEAD PREVIEW -->
        <div style="
          background: ${COLORS.navy?.[100] || "#f1f5f9"};
          border-radius: 8px;
          padding: 16px;
          margin-bottom: ${SPACING.lg};
        ">
          <h3 style="
            margin: 0 0 8px 0;
            font-size: 13px;
            font-weight: 600;
            color: ${COLORS.navy?.[800] || "#1e293b"};
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">📅 Tomorrow (${dayAhead.dayOfWeek})</h3>
          <p style="
            margin: 0;
            font-size: 14px;
            color: ${COLORS.navy?.[700] || "#334155"};
          ">
            ${dayAhead.aspSuspended 
              ? `🎉 ASP suspended${dayAhead.reason ? ` — ${dayAhead.reason}` : ""}` 
              : "📋 Regular ASP rules"}
          </p>
          ${dayAhead.note ? `
            <p style="
              margin: 8px 0 0 0;
              font-size: 13px;
              color: ${COLORS.navy?.[600] || "#475569"};
            ">${dayAhead.note}</p>
          ` : ""}
        </div>

        ${footer(`${appBaseUrl}/preferences`)}

      </div>
    </body>
    </html>
  `;

  // ==========================================================================
  // PLAIN TEXT VERSION
  // ==========================================================================
  
  const text = `
MORNING BRIEF — ${dateStr}
${user.neighborhood ? `📍 ${user.neighborhood}` : ""}

═══════════════════════════════════════
🚗 PARKING TODAY
═══════════════════════════════════════

${parking.aspSuspended 
  ? `✅ ${getGoodNewsLine()}${parking.reason ? ` (${parking.reason})` : ""}${parking.metersSuspended ? "\nMeters also suspended." : ""}\n\n${getSleepInLine()}`
  : `📋 ${getMoveTodayLine()}${parking.nextMoveRequired ? `\n\n⏰ Move by ${parking.nextMoveRequired.time} (${parking.nextMoveRequired.dayOfWeek})` : ""}`
}

${parking.overnightChanges && parking.overnightChanges.length > 0 
  ? `\n⚠️ OVERNIGHT CHANGES:\n${parking.overnightChanges.map(c => `• ${c}`).join("\n")}` 
  : ""}

═══════════════════════════════════════
🌤️ WEATHER: ${weather.icon} ${weather.temp}° — ${weather.condition}
═══════════════════════════════════════
${weather.precipChance && weather.precipChance > 20 ? `\n☔ ${weather.precipChance}% chance of rain` : ""}${weather.gearRecommendation ? `\n${weather.gearRecommendation}` : ""}

${transit.some(t => t.status !== "good") ? `\n═══════════════════════════════════════
🚇 TRANSIT ALERTS
═══════════════════════════════════════

${transit.filter(t => t.status !== "good").map(t => 
  `${t.line}: ${t.status === "skip" ? "MAJOR DELAYS" : "Delays"}\n${t.headline}${t.details ? `\n${t.details}` : ""}`
).join("\n\n")}` : ""}

${transit.filter(t => t.status === "good").length > 0 ? `\n✅ ${transit.filter(t => t.status === "good").map(t => t.line).join(", ")} — running normally` : ""}

═══════════════════════════════════════
📅 TOMORROW (${dayAhead.dayOfWeek})
═══════════════════════════════════════

${dayAhead.aspSuspended 
  ? `🎉 ASP suspended${dayAhead.reason ? ` — ${dayAhead.reason}` : ""}` 
  : "📋 Regular ASP rules"}${dayAhead.note ? `\n${dayAhead.note}` : ""}

---
Manage: ${appBaseUrl}/preferences
  `.trim();

  return {
    subject,
    html,
    text,
    preheader,
  };
}

// =============================================================================
// EXAMPLE DATA FOR TESTING
// =============================================================================

export const MORNING_BRIEF_EXAMPLES = {
  /** ASP suspended, clear weather, good transit */
  suspendedClearDay: (): MorningBriefData => ({
    date: new Date("2025-12-25T09:00:00"),
    user: { neighborhood: "Park Slope, Brooklyn", zipCode: "11215" },
    parking: {
      aspSuspended: true,
      reason: "Christmas Day",
      metersSuspended: true,
      nextMoveRequired: {
        date: "December 26",
        time: "8:30 AM",
        dayOfWeek: "Thursday",
      },
    },
    transit: [
      { line: "F/G", status: "good", headline: "Weekend schedule" },
      { line: "2/3", status: "good", headline: "Normal service" },
    ],
    weather: {
      temp: 42,
      condition: "Sunny",
      icon: "☀️",
      precipChance: 0,
    },
    dayAhead: {
      date: "December 26",
      dayOfWeek: "Thursday",
      aspSuspended: false,
      note: "Back to regular rules — move your car by 8:30 AM",
    },
  }),

  /** ASP active, rain, transit delays */
  activeRainyDay: (): MorningBriefData => ({
    date: new Date("2025-11-15T09:00:00"),
    user: { neighborhood: "Astoria, Queens", zipCode: "11105" },
    parking: {
      aspSuspended: false,
      nextMoveRequired: {
        date: "November 15",
        time: "9:00 AM",
        dayOfWeek: "Today",
      },
      overnightChanges: ["Street cleaning moved from 9 AM to 11 AM on your block"],
    },
    transit: [
      { line: "N/W", status: "delays", headline: "15-20 min delays", details: "Signal problems at 39th Ave" },
      { line: "M60 bus", status: "good", headline: "On schedule" },
    ],
    weather: {
      temp: 54,
      condition: "Rain",
      icon: "🌧️",
      precipChance: 80,
      gearRecommendation: "Waterproof jacket + umbrella",
    },
    dayAhead: {
      date: "November 16",
      dayOfWeek: "Saturday",
      aspSuspended: true,
      reason: "Legal holiday",
      note: "3-day weekend continues",
    },
  }),

  /** Snow emergency */
  snowEmergency: (): MorningBriefData => ({
    date: new Date("2025-01-28T09:00:00"),
    user: { neighborhood: "Upper West Side, Manhattan", zipCode: "10025" },
    parking: {
      aspSuspended: true,
      reason: "Snow emergency",
      metersSuspended: false,
      overnightChanges: [
        "Move to odd-numbered side of street by 9 PM",
        "No parking on snow emergency routes",
      ],
    },
    transit: [
      { line: "1/2/3", status: "delays", headline: "Local service only", details: "Express suspended due to weather" },
      { line: "A/B/C/D", status: "good", headline: "Running with delays" },
    ],
    weather: {
      temp: 28,
      condition: "Heavy snow",
      icon: "❄️",
      precipChance: 95,
      gearRecommendation: "Heavy coat, waterproof boots",
    },
    dayAhead: {
      date: "January 29",
      dayOfWeek: "Wednesday",
      aspSuspended: true,
      reason: "Snow cleanup",
      note: "Alternate side suspended for snow removal",
    },
  }),

  /** Summer quiet period */
  summerQuiet: (): MorningBriefData => ({
    date: new Date("2025-07-15T09:00:00"),
    user: { neighborhood: "Crown Heights, Brooklyn", zipCode: "11213" },
    parking: {
      aspSuspended: true,
      reason: "Summer suspension",
    },
    transit: [
      { line: "3/4", status: "good", headline: "Normal service" },
    ],
    weather: {
      temp: 88,
      condition: "Hot & humid",
      icon: "☀️",
      precipChance: 10,
      gearRecommendation: "Light clothes, stay hydrated",
    },
    dayAhead: {
      date: "July 16",
      dayOfWeek: "Wednesday",
      aspSuspended: true,
      reason: "Summer suspension",
    },
  }),
};

export default morningBrief;
