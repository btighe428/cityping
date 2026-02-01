/**
 * CityPing Midday Update - 12pm Email Template
 * 
 * Designed for the "lunch break check" — quick scan between meetings or lunch.
 * Short, punchy, only what changed since morning. Time-sensitive only.
 * 
 * Information hierarchy (most important first):
 * 1. BREAKING CHANGES - ASP status changed, new alerts
 * 2. TRANSIT NOW - Active delays affecting afternoon commute
 * 3. LUNCH WINDOW - Quick food/event opportunities
 * 4. AFTERNOON PREVIEW - What's coming
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

export interface MiddayBreakingUpdate {
  /** What changed */
  type: "asp_status" | "transit_major" | "weather_warning" | "parking_emergency";
  /** Short headline */
  headline: string;
  /** Quick details */
  details?: string;
  /** Action needed? */
  actionRequired?: string;
  /** Link for more info */
  link?: string;
}

export interface MiddayTransitAlert {
  line: string;
  status: "good" | "delays" | "avoid";
  headline: string;
  /** Time estimate if delayed */
  delayTime?: string;
}

export interface MiddayLunchSpot {
  name: string;
  type: "restaurant" | "event" | "popup" | "deal";
  distance?: string;
  walkTime?: string;
  offer?: string;
  /** When it ends */
  endsAt?: string;
  link?: string;
}

export interface MiddayAfternoonPreview {
  /** Weather change */
  weatherShift?: string;
  /** Transit expected issues */
  transitOutlook?: string;
  /** Evening event worth noting */
  eveningNote?: string;
}

export interface MiddayUpdateData {
  date: Date;
  user: {
    neighborhood?: string;
    zipCode?: string;
    lat?: number;
    lng?: number;
  };
  /** Only if something actually changed */
  breakingUpdates?: MiddayBreakingUpdate[];
  transit: MiddayTransitAlert[];
  /** Nearby lunch opportunities */
  lunchSpots?: MiddayLunchSpot[];
  afternoon: MiddayAfternoonPreview;
}

// =============================================================================
// COPY VARIATIONS - Keep it fresh
// =============================================================================

const QUICK_CHECK_LINES = [
  "Quick check — here's what changed.",
  "Midday update: what's new since this morning.",
  "Your 30-second NYC update.",
];

const NO_CHANGES_LINES = [
  "All quiet — no major changes since this morning.",
  "Still smooth sailing from the morning brief.",
  "No updates: everything from your morning email still stands.",
];

const TRANSIT_CLEAR_LINES = [
  "Transit's looking good for the afternoon.",
  "Smooth ride home expected.",
  "No delays on your lines.",
];

const STAY_TUNED_LINES = [
  "Check back this afternoon.",
  "We'll ping you if anything changes.",
  "Afternoon update coming if needed.",
];

function getQuickCheckLine(): string {
  return QUICK_CHECK_LINES[Math.floor(Math.random() * QUICK_CHECK_LINES.length)];
}

function getNoChangesLine(): string {
  return NO_CHANGES_LINES[Math.floor(Math.random() * NO_CHANGES_LINES.length)];
}

function getTransitClearLine(): string {
  return TRANSIT_CLEAR_LINES[Math.floor(Math.random() * TRANSIT_CLEAR_LINES.length)];
}

function getStayTunedLine(): string {
  return STAY_TUNED_LINES[Math.floor(Math.random() * STAY_TUNED_LINES.length)];
}

// =============================================================================
// SUBJECT LINE VARIANTS
// =============================================================================

export const MIDDAY_SUBJECT_VARIANTS = {
  /** When there's a breaking update */
  breaking: (headline?: string) => {
    const variants = [
      `🚨 Breaking: ${headline || "NYC update"}`,
      `⚠️ Just in: ${headline || "Heads up"}`,
      `📢 Update: ${headline || "What changed"}`,
      `🔄 New: ${headline || "Since this morning"}`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** When ASP status flipped */
  aspChanged: (newStatus: "suspended" | "active") => {
    const variants = newStatus === "suspended" 
      ? [
          `🎉 ASP just suspended`,
          `🚗 Good news: No street cleaning`,
          `✅ Leave your car — ASP update`,
        ]
      : [
          `⚠️ Heads up: ASP now in effect`,
          `📋 Street cleaning update`,
          `🚗 Move your car — ASP changed`,
        ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** When transit is the main story */
  transitAlert: (line?: string) => {
    const variants = [
      `🚇 ${line || "Transit"} delays — afternoon impact`,
      `⚠️ Commute alert: ${line || "Subway"} issues`,
      `🚇 Heads up for your ride home`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** When there's a good lunch deal */
  lunchOpportunity: (venue?: string) => {
    const variants = [
      `🍽️ Lunch: ${venue || "Nearby spots"}`,
      `☕ Quick lunch break ideas`,
      `🥡 ${venue || "Food"} near you`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },

  /** Default/generic — most common */
  default: () => {
    const variants = [
      `🗽 Midday check: NYC update`,
      `☕ Quick update from CityPing`,
      `📋 Lunch break NYC brief`,
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  },
};

// =============================================================================
// ICONS FOR UPDATE TYPES
// =============================================================================

const UPDATE_ICONS: Record<string, string> = {
  asp_status: "🚗",
  transit_major: "🚇",
  weather_warning: "🌦️",
  parking_emergency: "🚨",
};

const UPDATE_COLORS: Record<string, string> = {
  asp_status: "#16a34a",      // green
  transit_major: "#d97706",   // amber
  weather_warning: "#2563eb", // blue
  parking_emergency: "#dc2626", // red
};

// =============================================================================
// TEMPLATE RENDERER
// =============================================================================

export function middayUpdate(data: MiddayUpdateData): { 
  subject: string; 
  html: string; 
  text: string;
  preheader: string;
} {
  const { date, user, breakingUpdates, transit, lunchSpots, afternoon } = data;

  const appBaseUrl = process.env.APP_BASE_URL || "https://cityping.net";
  
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Determine subject line priority
  const hasBreaking = breakingUpdates && breakingUpdates.length > 0;
  const hasTransitIssues = transit.some(t => t.status === "avoid" || t.status === "delays");
  const hasLunchDeals = lunchSpots && lunchSpots.length > 0;
  
  let subject: string;
  let preheader: string;
  
  if (hasBreaking) {
    const breakingHeadline = breakingUpdates![0].headline;
    subject = MIDDAY_SUBJECT_VARIANTS.breaking(breakingHeadline);
    preheader = `Plus: ${transit.filter(t => t.status === "good").length}/${transit.length} transit lines good`;
  } else if (hasTransitIssues) {
    subject = MIDDAY_SUBJECT_VARIANTS.transitAlert(transit.find(t => t.status !== "good")?.line);
    preheader = `Check before you leave work + ${lunchSpots?.length || 0} lunch spots nearby`;
  } else if (hasLunchDeals) {
    subject = MIDDAY_SUBJECT_VARIANTS.lunchOpportunity(lunchSpots?.[0]?.name);
    preheader = `All clear on transit — plus your afternoon outlook`;
  } else {
    subject = MIDDAY_SUBJECT_VARIANTS.default();
    preheader = `No major changes — afternoon commute looks smooth`;
  }

  // ==========================================================================
  // HTML EMAIL
  // ==========================================================================
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Midday Update</title>
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
          ">🕐 Midday Update</p>
          <h1 style="
            margin: 4px 0 0 0;
            font-size: 22px;
            color: ${COLORS.navy?.[800] || "#1e293b"};
          ">${timeStr}</h1>
          ${user.neighborhood ? `
            <p style="
              margin: 4px 0 0 0;
              font-size: ${TYPOGRAPHY?.sizes?.small || "13px"};
              color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
            ">📍 ${user.neighborhood}</p>
          ` : ""}
        </div>

        <!-- 1. BREAKING UPDATES - Only if something changed -->
        ${hasBreaking ? `
          <div style="margin-bottom: ${SPACING.lg};">
            <h2 style="
              margin: 0 0 12px 0;
              font-size: 12px;
              font-weight: 700;
              color: ${COLORS.navy?.[800] || "#1e293b"};
              text-transform: uppercase;
              letter-spacing: 1px;
            ">🚨 Breaking</h2>
            ${breakingUpdates!.map(update => `
              <div style="
                background: ${UPDATE_COLORS[update.type] + "15" || "#f8fafc"};
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 8px;
                border-left: 3px solid ${UPDATE_COLORS[update.type] || COLORS.navy?.[400] || "#94a3b8"};
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  margin-bottom: 4px;
                ">
                  <span style="font-size: 18px;">${UPDATE_ICONS[update.type] || "📢"}</span>
                  <span style="
                    font-weight: 600;
                    color: ${UPDATE_COLORS[update.type] || COLORS.navy?.[800] || "#1e293b"};
                    font-size: 15px;
                  ">${update.headline}</span>
                </div>
                ${update.details ? `
                  <p style="
                    margin: 4px 0 0 0;
                    font-size: 14px;
                    color: ${COLORS.navy?.[600] || "#475569"};
                    padding-left: 26px;
                  ">${update.details}</p>
                ` : ""}
                ${update.actionRequired ? `
                  <p style="
                    margin: 8px 0 0 0;
                    font-size: 13px;
                    font-weight: 600;
                    color: ${UPDATE_COLORS[update.type] || COLORS.navy?.[700] || "#334155"};
                    padding-left: 26px;
                  ">👉 ${update.actionRequired}</p>
                ` : ""}
              </div>
            `).join("")}
          </div>
        ` : `
          <!-- No breaking updates -->
          <div style="
            background: #f0fdf4;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: ${SPACING.lg};
            text-align: center;
          ">
            <p style="
              margin: 0;
              font-size: 14px;
              color: #166534;
            ">✅ ${getNoChangesLine()}</p>
          </div>
        `}

        <!-- 2. TRANSIT STATUS - What's happening NOW -->
        <div style="margin-bottom: ${SPACING.lg};">
          <h2 style="
            margin: 0 0 12px 0;
            font-size: 12px;
            font-weight: 700;
            color: ${COLORS.navy?.[800] || "#1e293b"};
            text-transform: uppercase;
            letter-spacing: 1px;
          ">🚇 Transit Now</h2>
          
          ${transit.some(t => t.status !== "good") ? `
            ${transit.filter(t => t.status !== "good").map(t => `
              <div style="
                background: ${t.status === "avoid" ? "#fef2f2" : "#fffbeb"};
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 8px;
                border-left: 3px solid ${t.status === "avoid" ? "#dc2626" : "#d97706"};
              ">
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                ">
                  <span style="
                    font-weight: 600;
                    color: ${t.status === "avoid" ? "#dc2626" : "#92400e"};
                    font-size: 14px;
                  ">${t.line}</span>
                  <span style="
                    font-size: 12px;
                    font-weight: 600;
                    color: ${t.status === "avoid" ? "#dc2626" : "#92400e"};
                    background: ${t.status === "avoid" ? "#fecaca" : "#fde68a"};
                    padding: 2px 8px;
                    border-radius: 4px;
                  ">${t.status === "avoid" ? "AVOID" : "DELAYS"}</span>
                </div>
                <p style="
                  margin: 4px 0 0 0;
                  font-size: 13px;
                  color: ${COLORS.navy?.[700] || "#334155"};
                ">${t.headline}</p>
                ${t.delayTime ? `
                  <p style="
                    margin: 4px 0 0 0;
                    font-size: 12px;
                    color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                  ">⏱️ Add ~${t.delayTime} to your trip</p>
                ` : ""}
              </div>
            `).join("")}
          ` : `
            <div style="
              background: #f0fdf4;
              border-radius: 8px;
              padding: 12px 16px;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              <span style="font-size: 18px;">✅</span>
              <span style="font-size: 14px; color: #166534;">${getTransitClearLine()}</span>
            </div>
          `}
          
          <!-- Quick summary of good lines -->
          ${transit.filter(t => t.status === "good").length > 0 ? `
            <p style="
              margin: 8px 0 0 0;
              font-size: 12px;
              color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
              text-align: center;
            ">
              ${transit.filter(t => t.status === "good").map(t => t.line).join(" • ")} — normal
            </p>
          ` : ""}
        </div>

        <!-- 3. LUNCH WINDOW - Quick opportunities -->
        ${hasLunchDeals ? `
          <div style="margin-bottom: ${SPACING.lg};">
            <h2 style="
              margin: 0 0 12px 0;
              font-size: 12px;
              font-weight: 700;
              color: ${COLORS.navy?.[800] || "#1e293b"};
              text-transform: uppercase;
              letter-spacing: 1px;
            ">🍽️ Lunch Window</h2>
            ${lunchSpots!.slice(0, 3).map(spot => `
              <div style="
                background: white;
                border: 1px solid ${COLORS.navy?.[200] || "#e2e8f0"};
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 8px;
              ">
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                ">
                  <div>
                    <div style="
                      font-weight: 600;
                      font-size: 14px;
                      color: ${COLORS.navy?.[800] || "#1e293b"};
                    ">${spot.name}</div>
                    <div style="
                      font-size: 12px;
                      color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                      margin-top: 2px;
                    ">
                      ${spot.type === "restaurant" ? "🍴" : spot.type === "event" ? "🎭" : spot.type === "popup" ? "🎪" : "🏷️"}
                      ${spot.distance ? ` ${spot.distance}` : ""}
                      ${spot.walkTime ? ` • ${spot.walkTime} walk` : ""}
                    </div>
                  </div>
                  ${spot.offer ? `
                    <span style="
                      background: #fef3c7;
                      color: #92400e;
                      font-size: 11px;
                      font-weight: 600;
                      padding: 2px 8px;
                      border-radius: 4px;
                      white-space: nowrap;
                    ">${spot.offer}</span>
                  ` : ""}
                </div>
                ${spot.endsAt ? `
                  <p style="
                    margin: 8px 0 0 0;
                    font-size: 11px;
                    color: ${((COLORS.navy as Record<number, string>)?.[500]) || "#64748b"};
                  ">⏰ Ends at ${spot.endsAt}</p>
                ` : ""}
              </div>
            `).join("")}
          </div>
        ` : ""}

        <!-- 4. AFTERNOON PREVIEW -->
        <div style="
          background: ${COLORS.navy?.[100] || "#f1f5f9"};
          border-radius: 8px;
          padding: 16px;
          margin-bottom: ${SPACING.lg};
        ">
          <h2 style="
            margin: 0 0 12px 0;
            font-size: 12px;
            font-weight: 700;
            color: ${COLORS.navy?.[800] || "#1e293b"};
            text-transform: uppercase;
            letter-spacing: 1px;
          ">📅 Afternoon</h2>
          
          ${afternoon.weatherShift ? `
            <p style="
              margin: 0 0 8px 0;
              font-size: 13px;
              color: ${COLORS.navy?.[700] || "#334155"};
            ">🌤️ ${afternoon.weatherShift}</p>
          ` : ""}
          
          ${afternoon.transitOutlook ? `
            <p style="
              margin: 0 0 8px 0;
              font-size: 13px;
              color: ${COLORS.navy?.[700] || "#334155"};
            ">🚇 ${afternoon.transitOutlook}</p>
          ` : ""}
          
          ${afternoon.eveningNote ? `
            <p style="
              margin: 0;
              font-size: 13px;
              color: ${COLORS.navy?.[700] || "#334155"};
            ">🌙 ${afternoon.eveningNote}</p>
          ` : `
            <p style="
              margin: 0;
              font-size: 13px;
              color: ${COLORS.navy?.[600] || "#475569"};
            ">${getStayTunedLine()}</p>
          `}
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
MIDDAY UPDATE — ${timeStr}
${user.neighborhood ? `📍 ${user.neighborhood}` : ""}

═══════════════════════════════════════
${hasBreaking ? "🚨 BREAKING UPDATES" : "✅ NO MAJOR CHANGES"}
═══════════════════════════════════════

${hasBreaking 
  ? breakingUpdates!.map(u => 
      `${UPDATE_ICONS[u.type] || "📢"} ${u.headline}\n${u.details ? `   ${u.details}\n` : ""}${u.actionRequired ? `   👉 ${u.actionRequired}\n` : ""}`
    ).join("\n")
  : getNoChangesLine()
}

═══════════════════════════════════════
🚇 TRANSIT NOW
═══════════════════════════════════════

${transit.some(t => t.status !== "good")
  ? transit.filter(t => t.status !== "good").map(t => 
      `${t.line}: ${t.status.toUpperCase()}\n${t.headline}${t.delayTime ? `\nAdd ~${t.delayTime}` : ""}`
    ).join("\n\n")
  : getTransitClearLine()
}

${transit.filter(t => t.status === "good").length > 0 ? `\n✅ Normal: ${transit.filter(t => t.status === "good").map(t => t.line).join(", ")}` : ""}

${hasLunchDeals ? `
═══════════════════════════════════════
🍽️ LUNCH WINDOW
═══════════════════════════════════════

${lunchSpots!.slice(0, 3).map(s => 
  `${s.name}${s.offer ? ` — ${s.offer}` : ""}\n${s.distance ? `${s.distance}` : ""}${s.walkTime ? ` • ${s.walkTime} walk` : ""}${s.endsAt ? ` (ends ${s.endsAt})` : ""}`
).join("\n\n")}
` : ""}

═══════════════════════════════════════
📅 AFTERNOON PREVIEW
═══════════════════════════════════════

${afternoon.weatherShift ? `🌤️ ${afternoon.weatherShift}\n` : ""}${afternoon.transitOutlook ? `🚇 ${afternoon.transitOutlook}\n` : ""}${afternoon.eveningNote ? `🌙 ${afternoon.eveningNote}` : getStayTunedLine()}

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

export const MIDDAY_EXAMPLES = {
  /** ASP status changed mid-day */
  aspChanged: (): MiddayUpdateData => ({
    date: new Date("2025-01-15T12:00:00"),
    user: { neighborhood: "Park Slope, Brooklyn", zipCode: "11215" },
    breakingUpdates: [
      {
        type: "asp_status",
        headline: "ASP just suspended",
        details: "Mayor announced suspension for snow removal operations",
        actionRequired: "Your car is fine where it is",
      },
    ],
    transit: [
      { line: "F/G", status: "good", headline: "Normal service" },
      { line: "2/3", status: "good", headline: "Normal service" },
    ],
    lunchSpots: [
      { name: "Baker's Dozen", type: "restaurant", distance: "0.3 mi", walkTime: "6 min", offer: "Lunch special $12" },
      { name: "Smorgasburg Winter Market", type: "popup", distance: "0.5 mi", walkTime: "10 min", endsAt: "3 PM" },
    ],
    afternoon: {
      weatherShift: "Rain expected around 4 PM — bring an umbrella for the commute home",
      transitOutlook: "Rush hour starting early due to weather",
    },
  }),

  /** Transit emergency */
  transitEmergency: (): MiddayUpdateData => ({
    date: new Date("2025-03-10T12:15:00"),
    user: { neighborhood: "Astoria, Queens", zipCode: "11105" },
    breakingUpdates: [
      {
        type: "transit_major",
        headline: "N/Q/R/W suspended in Queens",
        details: "Track fire at 39th Ave — no service between Manhattan and Astoria",
        actionRequired: "Use M60 bus or ferry as alternate",
      },
    ],
    transit: [
      { line: "N/Q/R/W", status: "avoid", headline: "Suspended in Queens — use alternate", delayTime: "45+ min" },
      { line: "M60 bus", status: "delays", headline: "Crowded but running", delayTime: "15 min" },
    ],
    afternoon: {
      transitOutlook: "No ETA for restoration — plan alternate route home",
    },
  }),

  /** Quiet midday — no changes */
  quietDay: (): MiddayUpdateData => ({
    date: new Date("2025-06-15T12:00:00"),
    user: { neighborhood: "Crown Heights, Brooklyn", zipCode: "11213" },
    transit: [
      { line: "3/4", status: "good", headline: "Normal service" },
    ],
    lunchSpots: [
      { name: "Chavela's", type: "restaurant", distance: "0.2 mi", walkTime: "4 min", offer: "Happy hour 12-4" },
      { name: "Brooklyn Museum", type: "event", distance: "0.4 mi", walkTime: "8 min", endsAt: "6 PM" },
    ],
    afternoon: {
      weatherShift: "Heating up — 92° expected by 3 PM",
      eveningNote: "Sunset at 8:24 PM — nice night for a walk",
    },
  }),

  /** Weather warning */
  weatherWarning: (): MiddayUpdateData => ({
    date: new Date("2025-07-22T12:00:00"),
    user: { neighborhood: "Upper West Side, Manhattan", zipCode: "10025" },
    breakingUpdates: [
      {
        type: "weather_warning",
        headline: "Severe thunderstorm warning",
        details: "NWS issued warning until 3 PM — wind gusts to 60mph",
        actionRequired: "Avoid outdoor dining, seek shelter if commuting",
      },
    ],
    transit: [
      { line: "1/2/3", status: "delays", headline: "Reduced speed due to weather", delayTime: "10 min" },
    ],
    lunchSpots: [
      { name: "Indoor Food Hall", type: "restaurant", distance: "0.3 mi", walkTime: "5 min", offer: "Dry + air conditioned" },
    ],
    afternoon: {
      weatherShift: "Storms clearing by 4 PM",
      transitOutlook: "Service should normalize by evening rush",
    },
  }),

  /** Multiple breaking updates */
  multiUpdate: (): MiddayUpdateData => ({
    date: new Date("2025-09-10T12:30:00"),
    user: { neighborhood: "Williamsburg, Brooklyn", zipCode: "11211" },
    breakingUpdates: [
      {
        type: "parking_emergency",
        headline: "Film shoot on your block",
        details: "No parking 2 PM - 11 PM on Bedford Ave (North 7th to 8th)",
        actionRequired: "Move car by 2 PM or risk tow",
      },
      {
        type: "transit_major",
        headline: "L train delays",
        details: "Signal problems at Bedford Ave",
        actionRequired: "Add 15 min to afternoon commute",
      },
    ],
    transit: [
      { line: "L", status: "delays", headline: "Signal problems at Bedford", delayTime: "15-20 min" },
      { line: "G", status: "good", headline: "Normal service" },
      { line: "J/M/Z", status: "good", headline: "Normal service" },
    ],
    afternoon: {
      transitOutlook: "L train issues expected to continue through rush hour",
      eveningNote: "Street fair on Bedford 5-10 PM — expect crowds",
    },
  }),

  /** Lunch-focused */
  lunchFocus: (): MiddayUpdateData => ({
    date: new Date("2025-04-12T12:00:00"),
    user: { neighborhood: "Greenwich Village, Manhattan", zipCode: "10012" },
    transit: [
      { line: "A/C/E", status: "good", headline: "Normal service" },
      { line: "1/2/3", status: "good", headline: "Normal service" },
    ],
    lunchSpots: [
      { name: "Joe's Pizza", type: "restaurant", distance: "0.1 mi", walkTime: "2 min", offer: "Classic slice $3.50" },
      { name: "Washington Square Park", type: "event", distance: "0.2 mi", walkTime: "3 min", endsAt: "Sunset" },
      { name: "Mamoun's Falafel", type: "restaurant", distance: "0.3 mi", walkTime: "5 min", offer: "Lunch combo $10" },
    ],
    afternoon: {
      weatherShift: "Perfect 72° and sunny all afternoon",
      eveningNote: "Free jazz in the park starts at 6 PM",
    },
  }),
};

export default middayUpdate;
