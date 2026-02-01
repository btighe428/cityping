/**
 * CityPing Evening Wind-Down - 7pm Email Template
 * 
 * Designed for the "couch check" — relaxed evening reading while planning tomorrow.
 * Longer form, conversational, future-focused. Time to breathe and plan.
 * 
 * Information hierarchy (planning-oriented):
 * 1. TOMORROW'S ASP - First thing to know for planning
 * 2. TONIGHT'S SCENE - What's still happening 
 * 3. TOMORROW'S WEATHER - Plan your outfit/day
 * 4. TONIGHT/TOMORROW TRANSIT - Getting around
 * 5. DINING/DRINKS - Evening recommendations
 * 6. DAY RECAP - Today's highlights (optional)
 */

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  containerStyle,
  footer,
  MODULE_STYLES,
} from "../email-design-system";

// =============================================================================
// TYPES
// =============================================================================

export interface EveningAspPreview {
  /** Is ASP suspended tomorrow? */
  suspended: boolean;
  /** Holiday or reason for suspension */
  reason?: string;
  /** Day of week */
  dayOfWeek: string;
  /** Date string */
  date: string;
  /** When they need to move the car */
  moveBy?: {
    time: string;
    location?: string;
  };
  /** Weekend/long weekend flag */
  isLongWeekend?: boolean;
  /** Days until next suspension */
  daysUntilNextBreak?: number;
}

export interface EveningEvent {
  id: string;
  name: string;
  venue: string;
  startTime: string;
  endTime?: string;
  neighborhood: string;
  price?: string;
  category: "music" | "comedy" | "art" | "food" | "free" | "late-night";
  url?: string;
}

export interface EveningTransit {
  /** Current status for tonight */
  tonight: {
    lines: string[];
    status: "good" | "delays" | "planned-work";
    note?: string;
  };
  /** Tomorrow morning outlook */
  tomorrowMorning: {
    lines: string[];
    status: "good" | "delays" | "planned-work";
    note?: string;
  };
  /** Planned work this weekend */
  weekendWork?: string[];
}

export interface EveningWeather {
  /** Tonight's forecast */
  tonight: {
    temp: number;
    condition: string;
    icon: string;
    note?: string;
  };
  /** Tomorrow's forecast */
  tomorrow: {
    temp: number;
    condition: string;
    icon: string;
    high: number;
    low: number;
    precipChance: number;
    recommendation?: string;
  };
  /** Extended outlook */
  extended?: {
    day: string;
    icon: string;
    high: number;
    low: number;
  }[];
}

export interface EveningDining {
  /** Restaurant highlights */
  restaurants: {
    name: string;
    cuisine: string;
    neighborhood: string;
    price: "$" | "$$" | "$$$" | "$$$$";
    highlight: string;
    reservationNote?: string;
  }[];
  /** Bar highlights */
  bars?: {
    name: string;
    type: string;
    neighborhood: string;
    vibe: string;
    note?: string;
  }[];
  /** Late night options */
  lateNight?: {
    name: string;
    type: string;
    closes: string;
    neighborhood: string;
  }[];
}

export interface EveningDayRecap {
  /** Notable events that happened today */
  topStories?: string[];
  /** Traffic/parking incidents */
  trafficIncidents?: string[];
  /** Social media buzz */
  buzz?: string[];
  /** Fun fact or NYC trivia */
  nycTrivia?: string;
}

export interface EveningWindDownData {
  date: Date;
  user: {
    neighborhood?: string;
    zipCode?: string;
    firstName?: string;
  };
  tomorrowAsp: EveningAspPreview;
  weather: EveningWeather;
  transit: EveningTransit;
  tonightEvents: EveningEvent[];
  dining: EveningDining;
  recap?: EveningDayRecap;
}

// =============================================================================
// COPY VARIATIONS - Relaxed evening tone
// =============================================================================

const RELAXED_OPENERS = [
  "Evening plans? We've got you.",
  "Time to unwind and plan ahead.",
  "Hope your day treated you well.",
  "Settling in? Here's what's up.",
  "Evening — let's see what tomorrow holds.",
];

const ASP_SUSPENDED_TOMORROW_LINES = [
  "Tomorrow's looking easy — no ASP.",
  "Sleep in tomorrow. ASP's off.",
  "Your car gets another day off.",
  "No alarm needed for street cleaning tomorrow.",
];

const ASP_ACTIVE_TOMORROW_LINES = [
  "ASP's back tomorrow — plan accordingly.",
  "Regular rules resume tomorrow.",
  "Don't forget — street cleaning tomorrow.",
];

const WEEKEND_VIBES = [
  "Weekend mode activated 🎉",
  "The weekend is here. Finally.",
  "Time to exhale — it's the weekend.",
];

const DINING_INTROS = [
  "Hungry? Here's where we'd go:",
  "Tonight's table recommendations:",
  "If you're heading out to eat:",
  "Our dinner picks for tonight:",
];

function getRelaxedOpener(): string {
  return RELAXED_OPENERS[Math.floor(Math.random() * RELAXED_OPENERS.length)];
}

function getAspSuspendedLine(): string {
  return ASP_SUSPENDED_TOMORROW_LINES[Math.floor(Math.random() * ASP_SUSPENDED_TOMORROW_LINES.length)];
}

function getAspActiveLine(): string {
  return ASP_ACTIVE_TOMORROW_LINES[Math.floor(Math.random() * ASP_ACTIVE_TOMORROW_LINES.length)];
}

function getWeekendVibe(): string {
  return WEEKEND_VIBES[Math.floor(Math.random() * WEEKEND_VIBES.length)];
}

function getDiningIntro(): string {
  return DINING_INTROS[Math.floor(Math.random() * DINING_INTROS.length)];
}

// =============================================================================
// SUBJECT LINE VARIANTS
// =============================================================================

export const EVENING_SUBJECT_VARIANTS = {
  /** When tomorrow is a holiday/ASP suspended */
  aspSuspendedTomorrow: (reason?: string) => {
    const variants = [
      `🌙 Tomorrow: No ASP${reason ? ` (${reason})` : ""}`,
      `😴 Sleep in tomorrow${reason ? ` — it's ${reason}` : ""}`,
      `🎉 Your car gets a break tomorrow`,
      `✅ No street cleaning tomorrow${reason ? ` (${reason})` : ""}`,
      `🗓️ Tomorrow looks easy + tonight's happenings`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** When ASP is active tomorrow */
  aspActiveTomorrow: (moveBy?: string) => {
    const variants = [
      `🚗 Tomorrow: ASP in effect${moveBy ? ` — move by ${moveBy}` : ""}`,
      `📋 Street cleaning tomorrow${moveBy ? ` (by ${moveBy})` : ""}`,
      `⏰ Plan ahead: ASP resumes tomorrow`,
      `🗓️ Tomorrow's heads up + tonight's scene`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** Weekend edition */
  weekend: (isLongWeekend?: boolean) => {
    const variants = [
      `🎉 Weekend vibes + what's still open`,
      `🌙 Friday evening: Weekend preview inside`,
      `🍸 The weekend starts now`,
      isLongWeekend ? `🇺🇸 Long weekend ahead — here's the scene` : `🗓️ Your weekend preview`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** Weather-focused */
  weatherFocus: (condition?: string) => {
    const variants = [
      `🌤️ Tomorrow: ${condition || "Weather update"} + tonight's picks`,
      `☔ Rain tomorrow? We've got you covered`,
      `🌡️ Weekend weather check + evening plans`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** Default evening */
  default: () => {
    const variants = [
      `🌙 Your evening wind-down`,
      `☕ Tonight's scene + tomorrow's plan`,
      `🗽 Evening check-in: NYC after dark`,
      `📋 Unwind + plan ahead`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },
};

// =============================================================================
// TEMPLATE RENDERER
// =============================================================================

export function eveningWindDown(data: EveningWindDownData): { 
  subject: string; 
  html: string; 
  text: string;
  preheader: string;
} {
  const { date, user, tomorrowAsp, weather, transit, tonightEvents, dining, recap } = data;

  const appBaseUrl = process.env.APP_BASE_URL || "https://cityping.net";
  
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const isFriday = date.getDay() === 5;
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  // Determine subject line
  let subject: string;
  let preheader: string;
  
  if (isFriday || (tomorrowAsp.isLongWeekend && tomorrowAsp.suspended)) {
    subject = EVENING_SUBJECT_VARIANTS.weekend(tomorrowAsp.isLongWeekend);
    preheader = `${tomorrowAsp.suspended ? "No ASP" : "ASP in effect"} tomorrow • ${weather.tomorrow.condition}, ${weather.tomorrow.high}°`;
  } else if (tomorrowAsp.suspended) {
    subject = EVENING_SUBJECT_VARIANTS.aspSuspendedTomorrow(tomorrowAsp.reason);
    preheader = `Plus: ${weather.tomorrow.condition} tomorrow, ${tonightEvents.length} events still happening`;
  } else if (weather.tomorrow.precipChance > 60) {
    subject = EVENING_SUBJECT_VARIANTS.weatherFocus(weather.tomorrow.condition);
    preheader = `Move car by ${tomorrowAsp.moveBy?.time || "tomorrow"} • Transit updates + tonight's dining picks`;
  } else {
    subject = EVENING_SUBJECT_VARIANTS.aspActiveTomorrow(tomorrowAsp.moveBy?.time);
    preheader = `${weather.tomorrow.condition} tomorrow, high of ${weather.tomorrow.high}° • ${tonightEvents.length} evening events`;
  }

  // Status colors
  const aspColor = tomorrowAsp.suspended ? COLORS.status?.success || "#16a34a" : COLORS.navy?.[600] || "#475569";
  const aspBg = tomorrowAsp.suspended ? "#f0fdf4" : "#f8fafc";

  // ==========================================================================
  // HTML EMAIL
  // ==========================================================================
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Evening Wind-Down</title>
    </head>
    <body style="margin: 0; padding: 0; background: #f3f4f6;">
      <div style="${containerStyle}">

        <!-- Relaxed Header -->
        <div style="
          text-align: center;
          margin-bottom: ${SPACING.lg};
          padding-bottom: ${SPACING.md};
          border-bottom: 1px solid ${COLORS.navy?.[200] || "#e2e8f0"};
        ">
          <p style="
            margin: 0;
            font-size: 12px;
            color: ${COLORS.navy?.[400] || "#94a3b8"};
            text-transform: uppercase;
            letter-spacing: 1px;
          ">🌙 Evening Wind-Down</p>
          <h1 style="
            margin: 8px 0 0 0;
            font-size: 22px;
            font-weight: 400;
            color: ${COLORS.navy?.[800] || "#1e293b"};
          ">${getRelaxedOpener()}</h1>
          ${user.neighborhood ? `
            <p style="
              margin: 8px 0 0 0;
              font-size: ${TYPOGRAPHY?.sizes?.small || "13px"};
              color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
            ">📍 ${user.neighborhood} · ${dateStr}</p>
          ` : ""}
        </div>

        <!-- 1. TOMORROW'S ASP - The planning anchor -->
        <div style="
          background: ${aspBg};
          border-radius: 12px;
          padding: 24px;
          margin-bottom: ${SPACING.lg};
          border-left: 4px solid ${aspColor};
        ">
          <div style="
            display: flex;
            align-items: flex-start;
            gap: 16px;
          ">
            <span style="font-size: 32px;">${tomorrowAsp.suspended ? "😴" : "⏰"}</span>
            <div style="flex: 1;">
              <h2 style="
                margin: 0 0 8px 0;
                font-size: 17px;
                font-weight: 600;
                color: ${COLORS.navy?.[800] || "#1e293b"};
              ">
                Tomorrow (${tomorrowAsp.dayOfWeek}): ${tomorrowAsp.suspended ? "No ASP" : "ASP in Effect"}
              </h2>
              
              <p style="
                margin: 0;
                font-size: 15px;
                color: ${COLORS.navy?.[700] || "#334155"};
                line-height: 1.5;
              ">
                ${tomorrowAsp.suspended 
                  ? `${getAspSuspendedLine()}${tomorrowAsp.reason ? ` <em>(${tomorrowAsp.reason})</em>` : ""}`
                  : `${getAspActiveLine()}`
                }
              </p>

              ${!tomorrowAsp.suspended && tomorrowAsp.moveBy ? `
                <p style="
                  margin: 12px 0 0 0;
                  font-size: 14px;
                  color: ${COLORS.navy?.[600] || "#475569"};
                ">
                  📍 Move by <strong>${tomorrowAsp.moveBy.time}</strong>${tomorrowAsp.moveBy.location ? ` on ${tomorrowAsp.moveBy.location}` : ""}
                </p>
              ` : ""}

              ${tomorrowAsp.daysUntilNextBreak !== undefined && !tomorrowAsp.suspended ? `
                <p style="
                  margin: 12px 0 0 0;
                  font-size: 13px;
                  color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                ">
                  💡 Next break: ${tomorrowAsp.daysUntilNextBreak === 0 ? "Tomorrow!" : `In ${tomorrowAsp.daysUntilNextBreak} days`}
                </p>
              ` : ""}

              ${tomorrowAsp.isLongWeekend ? `
                <p style="
                  margin: 16px 0 0 0;
                  padding: 12px;
                  background: #fef3c7;
                  border-radius: 8px;
                  font-size: 14px;
                  color: #92400e;
                ">
                  🎉 ${getWeekendVibe()}
                </p>
              ` : ""}
            </div>
          </div>
        </div>

        <!-- 2. TOMORROW'S WEATHER - Plan ahead -->
        <div style="
          background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: ${SPACING.lg};
          color: white;
        ">
          <h3 style="
            margin: 0 0 16px 0;
            font-size: 13px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.9;
          ">Tomorrow's Weather</h3>
          
          <div style="
            display: flex;
            align-items: center;
            gap: 20px;
          ">
            <div style="text-align: center;">
              <span style="font-size: 48px;">${weather.tomorrow.icon}</span>
            </div>
            <div>
              <div style="
                font-size: 36px;
                font-weight: 300;
                line-height: 1;
              ">${weather.tomorrow.high}°</div>
              <div style="
                font-size: 15px;
                opacity: 0.9;
                margin-top: 4px;
              ">${weather.tomorrow.condition}</div>
              <div style="
                font-size: 13px;
                opacity: 0.7;
                margin-top: 4px;
              ">Low: ${weather.tomorrow.low}°</div>
            </div>
            <div style="
              margin-left: auto;
              text-align: right;
              padding-left: 16px;
              border-left: 1px solid rgba(255,255,255,0.3);
            ">
              ${weather.tomorrow.precipChance > 0 ? `
                <div style="
                  font-size: 14px;
                  margin-bottom: 4px;
                ">☔ ${weather.tomorrow.precipChance}% rain</div>
              ` : `
                <div style="
                  font-size: 14px;
                  margin-bottom: 4px;
                ">☀️ Clear skies</div>
              `}
              ${weather.tomorrow.recommendation ? `
                <div style="
                  font-size: 13px;
                  opacity: 0.8;
                ">${weather.tomorrow.recommendation}</div>
              ` : ""}
            </div>
          </div>

          ${weather.extended && weather.extended.length > 0 ? `
            <div style="
              margin-top: 20px;
              padding-top: 16px;
              border-top: 1px solid rgba(255,255,255,0.2);
              display: flex;
              justify-content: space-around;
            ">
              ${weather.extended.map(day => `
                <div style="text-align: center;">
                  <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">${day.day}</div>
                  <div style="font-size: 20px;">${day.icon}</div>
                  <div style="font-size: 13px; margin-top: 2px;">${day.high}°</div>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>

        <!-- 3. TRANSIT - Tonight & Tomorrow -->
        <div style="margin-bottom: ${SPACING.lg};">
          <h3 style="
            margin: 0 0 16px 0;
            font-size: 14px;
            font-weight: 600;
            color: ${COLORS.navy?.[800] || "#1e293b"};
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">🚇 Getting Around</h3>

          <!-- Tonight -->
          <div style="
            background: ${COLORS.navy?.[100] || "#f1f5f9"};
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: ${transit.tonight.note ? "8px" : "0"};
            ">
              <span style="
                font-size: 12px;
                font-weight: 600;
                color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                text-transform: uppercase;
              ">Tonight</span>
              <span style="
                color: ${transit.tonight.status === "good" ? COLORS.status?.success || "#16a34a" : transit.tonight.status === "delays" ? COLORS.status?.warning || "#f59e0b" : COLORS.navy?.[600] || "#475569"};
                font-size: 14px;
              ">
                ${transit.tonight.status === "good" ? "✅ Smooth" : transit.tonight.status === "delays" ? "⚠️ Delays" : "🔧 Planned work"}
              </span>
              <span style="
                font-size: 13px;
                color: ${COLORS.navy?.[600] || "#475569"};
              ">${transit.tonight.lines.join(", ")}</span>
            </div>
            ${transit.tonight.note ? `
              <p style="
                margin: 8px 0 0 0;
                font-size: 13px;
                color: ${COLORS.navy?.[600] || "#475569"};
                padding-left: 56px;
              ">${transit.tonight.note}</p>
            ` : ""}
          </div>

          <!-- Tomorrow Morning -->
          <div style="
            background: ${COLORS.navy?.[100] || "#f1f5f9"};
            border-radius: 8px;
            padding: 16px;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: ${transit.tomorrowMorning.note ? "8px" : "0"};
            ">
              <span style="
                font-size: 12px;
                font-weight: 600;
                color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                text-transform: uppercase;
              ">Tomorrow AM</span>
              <span style="
                color: ${transit.tomorrowMorning.status === "good" ? COLORS.status?.success || "#16a34a" : transit.tomorrowMorning.status === "delays" ? COLORS.status?.warning || "#f59e0b" : COLORS.navy?.[600] || "#475569"};
                font-size: 14px;
              ">
                ${transit.tomorrowMorning.status === "good" ? "✅ Smooth" : transit.tomorrowMorning.status === "delays" ? "⚠️ Delays" : "🔧 Planned work"}
              </span>
              <span style="
                font-size: 13px;
                color: ${COLORS.navy?.[600] || "#475569"};
              ">${transit.tomorrowMorning.lines.join(", ")}</span>
            </div>
            ${transit.tomorrowMorning.note ? `
              <p style="
                margin: 8px 0 0 0;
                font-size: 13px;
                color: ${COLORS.navy?.[600] || "#475569"};
                padding-left: 84px;
              ">${transit.tomorrowMorning.note}</p>
            ` : ""}
          </div>

          ${transit.weekendWork && transit.weekendWork.length > 0 ? `
            <div style="
              margin-top: 12px;
              padding: 12px;
              background: #fef3c7;
              border-radius: 8px;
            ">
              <p style="
                margin: 0;
                font-size: 13px;
                color: #92400e;
              ">🚧 Weekend work: ${transit.weekendWork.join("; ")}</p>
            </div>
          ` : ""}
        </div>

        <!-- 4. TONIGHT'S EVENTS - Still happening -->
        ${tonightEvents.length > 0 ? `
          <div style="margin-bottom: ${SPACING.lg};">
            <h3 style="
              margin: 0 0 16px 0;
              font-size: 14px;
              font-weight: 600;
              color: ${COLORS.navy?.[800] || "#1e293b"};
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">🎭 Still Happening Tonight</h3>
            
            ${tonightEvents.slice(0, 4).map(event => `
              <div style="
                background: ${event.category === "free" ? "#f0fdf4" : COLORS.navy?.[100] || "#f1f5f9"};
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 10px;
              ">
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                ">
                  <div style="flex: 1;">
                    <h4 style="
                      margin: 0 0 4px 0;
                      font-size: 15px;
                      font-weight: 600;
                      color: ${COLORS.navy?.[800] || "#1e293b"};
                    ">${event.name}</h4>
                    <p style="
                      margin: 0;
                      font-size: 13px;
                      color: ${COLORS.navy?.[600] || "#475569"};
                    ">📍 ${event.venue} · ${event.neighborhood}</p>
                    <p style="
                      margin: 6px 0 0 0;
                      font-size: 13px;
                      color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                    ">
                      🕐 ${event.startTime}${event.endTime ? `–${event.endTime}` : ""}
                      ${event.price ? ` · ${event.price}` : ""}
                      ${event.category === "free" ? " · 🆓 Free" : ""}
                    </p>
                  </div>
                  ${event.category === "late-night" ? `
                    <span style="
                      font-size: 11px;
                      background: #1e293b;
                      color: white;
                      padding: 4px 8px;
                      border-radius: 4px;
                    ">Late</span>
                  ` : ""}
                </div>
              </div>
            `).join("")}
            
            ${tonightEvents.length > 4 ? `
              <p style="
                margin: 12px 0 0 0;
                font-size: 13px;
                text-align: center;
              ">
                <a href="${appBaseUrl}/events" style="
                  color: ${COLORS.navy?.[600] || "#475569"};
                  text-decoration: none;
                ">+ ${tonightEvents.length - 4} more events →</a>
              </p>
            ` : ""}
          </div>
        ` : ""}

        <!-- 5. DINING PICKS - Tonight -->
        ${dining.restaurants.length > 0 ? `
          <div style="margin-bottom: ${SPACING.lg};">
            <h3 style="
              margin: 0 0 16px 0;
              font-size: 14px;
              font-weight: 600;
              color: ${COLORS.navy?.[800] || "#1e293b"};
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">🍽️ ${getDiningIntro()}</h3>
            
            ${dining.restaurants.slice(0, 3).map(restaurant => `
              <div style="
                background: white;
                border: 1px solid ${COLORS.navy?.[200] || "#e2e8f0"};
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 10px;
              ">
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 6px;
                ">
                  <h4 style="
                    margin: 0;
                    font-size: 15px;
                    font-weight: 600;
                    color: ${COLORS.navy?.[800] || "#1e293b"};
                  ">${restaurant.name}</h4>
                  <span style="
                    font-size: 13px;
                    color: ${COLORS.navy?.[400] || "#94a3b8"};
                  ">${restaurant.price}</span>
                </div>
                <p style="
                  margin: 0 0 6px 0;
                  font-size: 13px;
                  color: ${COLORS.navy?.[600] || "#475569"};
                ">${restaurant.cuisine} · ${restaurant.neighborhood}</p>
                <p style="
                  margin: 0;
                  font-size: 13px;
                  color: ${COLORS.navy?.[700] || "#334155"};
                  font-style: italic;
                ">${restaurant.highlight}</p>
                ${restaurant.reservationNote ? `
                  <p style="
                    margin: 8px 0 0 0;
                    font-size: 12px;
                    color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                  ">📝 ${restaurant.reservationNote}</p>
                ` : ""}
              </div>
            `).join("")}

            ${dining.bars && dining.bars.length > 0 ? `
              <h4 style="
                margin: 20px 0 12px 0;
                font-size: 13px;
                font-weight: 600;
                color: ${COLORS.navy?.[600] || "#475569"};
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">🍸 Drinks After?</h4>
              
              ${dining.bars.slice(0, 2).map(bar => `
                <div style="
                  background: ${COLORS.navy?.[100] || "#f1f5f9"};
                  border-radius: 6px;
                  padding: 12px;
                  margin-bottom: 8px;
                ">
                  <p style="
                    margin: 0;
                    font-size: 14px;
                    color: ${COLORS.navy?.[800] || "#1e293b"};
                  "><strong>${bar.name}</strong> · ${bar.type}</p>
                  <p style="
                    margin: 4px 0 0 0;
                    font-size: 12px;
                    color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                  ">${bar.neighborhood} · ${bar.vibe}${bar.note ? ` · ${bar.note}` : ""}</p>
                </div>
              `).join("")}
            ` : ""}

            ${dining.lateNight && dining.lateNight.length > 0 ? `
              <div style="
                margin-top: 16px;
                padding: 12px;
                background: #1e293b;
                border-radius: 8px;
              ">
                <p style="
                  margin: 0;
                  font-size: 13px;
                  color: white;
                  font-weight: 500;
                ">🌙 Late night bites:</p>
                <p style="
                  margin: 8px 0 0 0;
                  font-size: 12px;
                  color: rgba(255,255,255,0.8);
                ">
                  ${dining.lateNight.slice(0, 3).map(spot => `${spot.name} (${spot.type}, until ${spot.closes})`).join(" · ")}
                </p>
              </div>
            ` : ""}
          </div>
        ` : ""}

        <!-- 6. DAY RECAP - Optional -->
        ${recap ? `
          <div style="
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: ${SPACING.lg};
          ">
            <h3 style="
              margin: 0 0 16px 0;
              font-size: 14px;
              font-weight: 600;
              color: ${COLORS.navy?.[800] || "#1e293b"};
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">📰 Today in NYC</h3>
            
            ${recap.topStories && recap.topStories.length > 0 ? `
              <div style="margin-bottom: 16px;">
                <p style="
                  margin: 0 0 8px 0;
                  font-size: 12px;
                  font-weight: 600;
                  color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                  text-transform: uppercase;
                ">Headlines</p>
                ${recap.topStories.map(story => `
                  <p style="
                    margin: 6px 0;
                    font-size: 13px;
                    color: ${COLORS.navy?.[700] || "#334155"};
                  ">• ${story}</p>
                `).join("")}
              </div>
            ` : ""}

            ${recap.buzz && recap.buzz.length > 0 ? `
              <div style="margin-bottom: 16px;">
                <p style="
                  margin: 0 0 8px 0;
                  font-size: 12px;
                  font-weight: 600;
                  color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                  text-transform: uppercase;
                ">The Buzz</p>
                ${recap.buzz.map(item => `
                  <p style="
                    margin: 6px 0;
                    font-size: 13px;
                    color: ${COLORS.navy?.[700] || "#334155"};
                  ">💬 ${item}</p>
                `).join("")}
              </div>
            ` : ""}

            ${recap.nycTrivia ? `
              <div style="
                padding: 12px;
                background: white;
                border-radius: 6px;
                border-left: 3px solid ${COLORS.modules?.events || "#8b5cf6"};
              ">
                <p style="
                  margin: 0;
                  font-size: 12px;
                  font-weight: 600;
                  color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                  text-transform: uppercase;
                ">NYC Trivia</p>
                <p style="
                  margin: 8px 0 0 0;
                  font-size: 13px;
                  color: ${COLORS.navy?.[700] || "#334155"};
                  font-style: italic;
                ">${recap.nycTrivia}</p>
              </div>
            ` : ""}
          </div>
        ` : ""}

        <!-- Closing -->
        <div style="
          text-align: center;
          padding: 24px 0;
          border-top: 1px solid ${COLORS.navy?.[200] || "#e2e8f0"};
          margin-top: ${SPACING.lg};
        ">
          <p style="
            margin: 0;
            font-size: 15px;
            color: ${COLORS.navy?.[700] || "#334155"};
          ">Enjoy your evening${user.firstName ? `, ${user.firstName}` : ""} 🌙</p>
          <p style="
            margin: 8px 0 0 0;
            font-size: 13px;
            color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
          ">See you in the morning</p>
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
EVENING WIND-DOWN — ${dateStr}
${user.neighborhood ? `📍 ${user.neighborhood}` : ""}

═══════════════════════════════════════
TOMORROW (${tomorrowAsp.dayOfWeek.toUpperCase()})
═══════════════════════════════════════

${tomorrowAsp.suspended 
  ? `😴 ${getAspSuspendedLine()}${tomorrowAsp.reason ? ` (${tomorrowAsp.reason})` : ""}`
  : `⏰ ${getAspActiveLine()}`
}
${!tomorrowAsp.suspended && tomorrowAsp.moveBy ? `
📍 Move by ${tomorrowAsp.moveBy.time}${tomorrowAsp.moveBy.location ? ` on ${tomorrowAsp.moveBy.location}` : ""}` : ""}
${tomorrowAsp.daysUntilNextBreak !== undefined && !tomorrowAsp.suspended ? `
💡 Next break: ${tomorrowAsp.daysUntilNextBreak === 0 ? "Tomorrow!" : `In ${tomorrowAsp.daysUntilNextBreak} days`}` : ""}
${tomorrowAsp.isLongWeekend ? `
🎉 ${getWeekendVibe()}` : ""}

═══════════════════════════════════════
TOMORROW'S WEATHER
═══════════════════════════════════════

${weather.tomorrow.icon} ${weather.tomorrow.condition}
High: ${weather.tomorrow.high}° | Low: ${weather.tomorrow.low}°
${weather.tomorrow.precipChance > 0 ? `Rain: ${weather.tomorrow.precipChance}%` : "Clear skies"}
${weather.tomorrow.recommendation ? `\n${weather.tomorrow.recommendation}` : ""}

${weather.extended ? `
Extended:\n${weather.extended.map(d => `${d.day}: ${d.icon} ${d.high}°/${d.low}°`).join("\n")}` : ""}

═══════════════════════════════════════
GETTING AROUND
═══════════════════════════════════════

Tonight (${transit.tonight.lines.join(", ")}):
${transit.tonight.status === "good" ? "✅ Smooth sailing" : transit.tonight.status === "delays" ? "⚠️ Expect delays" : "🔧 Planned work"}
${transit.tonight.note ? transit.tonight.note : ""}

Tomorrow AM (${transit.tomorrowMorning.lines.join(", ")}):
${transit.tomorrowMorning.status === "good" ? "✅ Smooth sailing" : transit.tomorrowMorning.status === "delays" ? "⚠️ Expect delays" : "🔧 Planned work"}
${transit.tomorrowMorning.note ? transit.tomorrowMorning.note : ""}

${transit.weekendWork ? `\nWeekend work: ${transit.weekendWork.join("; ")}` : ""}

${tonightEvents.length > 0 ? `
═══════════════════════════════════════
STILL HAPPENING TONIGHT
═══════════════════════════════════════

${tonightEvents.slice(0, 4).map(e => `${e.name}
📍 ${e.venue} · ${e.neighborhood}
🕐 ${e.startTime}${e.endTime ? `–${e.endTime}` : ""}${e.price ? ` · ${e.price}` : ""}${e.category === "free" ? " · 🆓 Free" : ""}`).join("\n\n")}
` : ""}

${dining.restaurants.length > 0 ? `
═══════════════════════════════════════
TONIGHT'S DINING PICKS
═══════════════════════════════════════

${dining.restaurants.slice(0, 3).map(r => `${r.name} ${r.price}
${r.cuisine} · ${r.neighborhood}
${r.highlight}${r.reservationNote ? `\n📝 ${r.reservationNote}` : ""}`).join("\n\n")}
` : ""}

${dining.bars && dining.bars.length > 0 ? `
DRINKS AFTER?
${dining.bars.slice(0, 2).map(b => `${b.name} · ${b.type}
${b.neighborhood} · ${b.vibe}${b.note ? ` · ${b.note}` : ""}`).join("\n\n")}
` : ""}

${dining.lateNight && dining.lateNight.length > 0 ? `
LATE NIGHT BITES:
${dining.lateNight.slice(0, 3).map(s => `• ${s.name} (${s.type}, until ${s.closes})`).join("\n")}
` : ""}

${recap ? `
═══════════════════════════════════════
TODAY IN NYC
═══════════════════════════════════════

${recap.topStories ? `HEADLINES:\n${recap.topStories.map(s => `• ${s}`).join("\n")}\n` : ""}
${recap.buzz ? `\nTHE BUZZ:\n${recap.buzz.map(b => `💬 ${b}`).join("\n")}\n` : ""}
${recap.nycTrivia ? `\nNYC TRIVIA:\n${recap.nycTrivia}` : ""}
` : ""}

═══════════════════════════════════════

Enjoy your evening${user.firstName ? `, ${user.firstName}` : ""} 🌙
See you in the morning

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

export const EVENING_WINDDOWN_EXAMPLES = {
  /** Friday evening - weekend vibes */
  fridayEvening: (): EveningWindDownData => ({
    date: new Date("2025-12-05T19:00:00"),
    user: { neighborhood: "Park Slope, Brooklyn", zipCode: "11215", firstName: "Alex" },
    tomorrowAsp: {
      suspended: true,
      reason: "Saturday",
      dayOfWeek: "Saturday",
      date: "December 6",
      isLongWeekend: false,
    },
    weather: {
      tonight: { temp: 48, condition: "Clear", icon: "🌙", note: "Perfect for a night out" },
      tomorrow: {
        temp: 52,
        condition: "Partly cloudy",
        icon: "⛅",
        high: 55,
        low: 42,
        precipChance: 10,
        recommendation: "Light jacket weather",
      },
      extended: [
        { day: "Sun", icon: "☀️", high: 58, low: 45 },
        { day: "Mon", icon: "🌧️", high: 50, low: 40 },
      ],
    },
    transit: {
      tonight: { lines: ["F/G", "2/3"], status: "good", note: "Weekend schedule starts at 10 PM" },
      tomorrowMorning: { lines: ["F/G", "2/3"], status: "good" },
    },
    tonightEvents: [
      { id: "1", name: "Jazz at the Blue Note", venue: "Blue Note Jazz Club", startTime: "8:00 PM", neighborhood: "Greenwich Village", price: "$45+", category: "music" },
      { id: "2", name: "Comedy Cellar", venue: "Comedy Cellar", startTime: "9:30 PM", neighborhood: "West Village", price: "$25+", category: "comedy" },
      { id: "3", name: "Late Night at the Met", venue: "Metropolitan Museum", startTime: "7:00 PM", endTime: "9:00 PM", neighborhood: "Upper East Side", category: "art" },
      { id: "4", name: "Brooklyn Night Market", venue: "Industry City", startTime: "6:00 PM", neighborhood: "Sunset Park", category: "food" },
    ],
    dining: {
      restaurants: [
        { name: "Lilia", cuisine: "Italian", neighborhood: "Williamsburg", price: "$$$", highlight: "Handmade pasta that lives up to the hype", reservationNote: "Walk-ins welcome at the bar after 9 PM" },
        { name: "Olmsted", cuisine: "New American", neighborhood: "Prospect Heights", price: "$$$", highlight: "Garden-to-table in a cozy backyard setting" },
        { name: "Casa Ora", cuisine: "Venezuelan", neighborhood: "Williamsburg", price: "$$", highlight: "Arepas and empanadas worth the trip" },
      ],
      bars: [
        { name: "Dead Rabbit", type: "Cocktail Bar", neighborhood: "Financial District", vibe: "Three stories of Irish-inspired cocktails", note: "Live music upstairs" },
        { name: "Bohemian Hall", type: "Beer Garden", neighborhood: "Astoria", vibe: "Historic Czech beer garden", note: "Outdoor seating still open" },
      ],
      lateNight: [
        { name: "Kopitiam", type: "Malaysian", closes: "2 AM", neighborhood: "Chinatown" },
        { name: "Corner Bistro", type: "Burgers", closes: "4 AM", neighborhood: "West Village" },
      ],
    },
    recap: {
      topStories: ["NYC marathon registration opens Monday", "New ferry route to Coney Island launches", "Central Park ice skating rink opens this weekend"],
      buzz: ["Everyone's talking about the new museum exhibit", "That viral pizza spot in Greenpoint"],
      nycTrivia: "The NYC subway system has 472 stations — more than any other system in the world.",
    },
  }),

  /** Sunday evening - long weekend ending */
  sundayEvening: (): EveningWindDownData => ({
    date: new Date("2025-12-28T19:00:00"),
    user: { neighborhood: "Astoria, Queens", zipCode: "11105" },
    tomorrowAsp: {
      suspended: false,
      dayOfWeek: "Monday",
      date: "December 29",
      moveBy: { time: "8:30 AM" },
      daysUntilNextBreak: 1, // New Year's Eve
    },
    weather: {
      tonight: { temp: 38, condition: "Partly cloudy", icon: "☁️" },
      tomorrow: {
        temp: 42,
        condition: "Rain likely",
        icon: "🌧️",
        high: 45,
        low: 36,
        precipChance: 70,
        recommendation: "Pack the umbrella ☔",
      },
    },
    transit: {
      tonight: { lines: ["N/W"], status: "good" },
      tomorrowMorning: { lines: ["N/W"], status: "delays", note: "Signal maintenance at 39th Ave" },
    },
    tonightEvents: [
      { id: "1", name: "Sunday Sessions: Live Jazz", venue: "Village Vanguard", startTime: "9:00 PM", neighborhood: "West Village", price: "$35", category: "music" },
    ],
    dining: {
      restaurants: [
        { name: "Taverna Kyclades", cuisine: "Greek", neighborhood: "Astoria", price: "$$", highlight: "The grilled octopus is legendary" },
        { name: "Milkflower", cuisine: "Pizza", neighborhood: "Astoria", price: "$$", highlight: "Wood-fired Neapolitan pies" },
      ],
    },
  }),

  /** Holiday Monday - everything suspended */
  holidayMonday: (): EveningWindDownData => ({
    date: new Date("2025-01-20T19:00:00"),
    user: { neighborhood: "Upper West Side, Manhattan", zipCode: "10025" },
    tomorrowAsp: {
      suspended: true,
      reason: "Martin Luther King Jr. Day",
      dayOfWeek: "Tuesday",
      date: "January 21",
    },
    weather: {
      tonight: { temp: 32, condition: "Clear", icon: "🌙" },
      tomorrow: {
        temp: 38,
        condition: "Sunny",
        icon: "☀️",
        high: 40,
        low: 28,
        precipChance: 0,
        recommendation: "Bundle up — brisk but beautiful",
      },
    },
    transit: {
      tonight: { lines: ["1/2/3", "A/B/C"], status: "good" },
      tomorrowMorning: { lines: ["1/2/3", "A/B/C"], status: "good" },
      weekendWork: ["No planned work — holiday schedule"],
    },
    tonightEvents: [
      { id: "1", name: "MLK Day Concert", venue: "Riverside Church", startTime: "7:00 PM", neighborhood: "Morningside Heights", category: "free" },
    ],
    dining: {
      restaurants: [
        { name: "Barney Greengrass", cuisine: "Jewish Deli", neighborhood: "Upper West Side", price: "$$", highlight: "The Sturgeon King since 1908" },
      ],
    },
  }),

  /** Rainy Tuesday - weather focus */
  rainyTuesday: (): EveningWindDownData => ({
    date: new Date("2025-03-15T19:00:00"),
    user: { neighborhood: "Crown Heights, Brooklyn", zipCode: "11213" },
    tomorrowAsp: {
      suspended: false,
      dayOfWeek: "Wednesday",
      date: "March 16",
      moveBy: { time: "8:30 AM" },
      daysUntilNextBreak: 4,
    },
    weather: {
      tonight: { temp: 45, condition: "Light rain", icon: "🌧️" },
      tomorrow: {
        temp: 48,
        condition: "Heavy rain",
        icon: "⛈️",
        high: 50,
        low: 42,
        precipChance: 85,
        recommendation: "Waterproof everything. Maybe work from home?",
      },
      extended: [
        { day: "Thu", icon: "🌧️", high: 52, low: 45 },
        { day: "Fri", icon: "⛅", high: 55, low: 40 },
      ],
    },
    transit: {
      tonight: { lines: ["3/4"], status: "delays", note: "Wet conditions — slower service" },
      tomorrowMorning: { lines: ["3/4"], status: "delays", note: "Expect crowded cars" },
    },
    tonightEvents: [
      { id: "1", name: "Indoor Trivia Night", venue: "Franklin Park", startTime: "8:00 PM", neighborhood: "Crown Heights", price: "Free", category: "free" },
    ],
    dining: {
      restaurants: [
        { name: "Chavela's", cuisine: "Mexican", neighborhood: "Crown Heights", price: "$$", highlight: "Cozy vibes + margaritas = rainy day win" },
        { name: "Mayfield", cuisine: "American", neighborhood: "Crown Heights", price: "$$", highlight: "Comfort food done right" },
      ],
    },
  }),
};

export default eveningWindDown;
