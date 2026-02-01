/**
 * CityPing Morning Brief - Example Content & Copy Guide
 * 
 * This file contains real-world example content for each section
 * of the 9am Morning Brief email. Use these as templates when
 * generating actual email content.
 */

import type {
  MorningBriefData,
  MorningParkingStatus,
  MorningTransitAlert,
  MorningWeather,
  MorningDayAhead,
} from "./morning-template";

// =============================================================================
// SECTION 1: PARKING STATUS
// =============================================================================

export const PARKING_STATUS_EXAMPLES: Record<string, MorningParkingStatus> = {
  /** Holiday suspension - Christmas */
  christmas: {
    aspSuspended: true,
    reason: "Christmas Day",
    metersSuspended: true,
    nextMoveRequired: {
      date: "December 26",
      time: "8:30 AM",
      dayOfWeek: "Thursday",
    },
  },

  /** Legal holiday - less major */
  legalHoliday: {
    aspSuspended: true,
    reason: "Legal holiday",
    metersSuspended: false,
  },

  /** Religious holiday */
  yomKippur: {
    aspSuspended: true,
    reason: "Yom Kippur",
    metersSuspended: true,
  },

  /** Weather suspension */
  snowEmergency: {
    aspSuspended: true,
    reason: "Snow emergency",
    metersSuspended: false,
    overnightChanges: [
      "Move to odd-numbered side by 9 PM tonight",
      "Snow emergency routes are no-parking zones",
    ],
  },

  /** Summer suspension */
  summerBreak: {
    aspSuspended: true,
    reason: "Summer suspension",
  },

  /** Regular active day */
  regularDay: {
    aspSuspended: false,
    nextMoveRequired: {
      date: "March 15",
      time: "9:00 AM",
      dayOfWeek: "Today",
    },
  },

  /** Active with overnight changes */
  activeWithChanges: {
    aspSuspended: false,
    nextMoveRequired: {
      date: "March 15",
      time: "11:00 AM",
      dayOfWeek: "Today",
    },
    overnightChanges: [
      "Street cleaning time changed from 9 AM to 11 AM",
    ],
  },

  /** Street fair/block party */
  streetFair: {
    aspSuspended: false,
    overnightChanges: [
      "No parking 6 AM - 6 PM for street fair on your block",
    ],
  },

  /** Film shoot */
  filmShoot: {
    aspSuspended: false,
    overnightChanges: [
      "Film shoot: No parking 7 AM - 10 PM on east side of street",
    ],
  },
};

// Copy variations for ASP suspended
export const ASP_SUSPENDED_COPY = {
  headlines: [
    "ASP is suspended today.",
    "Your car gets a break today.",
    "No street cleaning today.",
    "Park it and leave it.",
    "Sleep in! No rush to move the car.",
    "Extra coffee time — your car's fine.",
    "No early alarm needed today.",
  ],

  // Context-aware variations
  holiday: [
    "Happy holidays! Leave the car where it is.",
    "Enjoy the day off from street cleaning.",
    "Holiday parking = free parking today.",
  ],

  longWeekend: [
    "3-day weekend starts now. Car stays put.",
    "Leave it parked through Monday.",
    "Your car's on vacation too.",
  ],

  snow: [
    "ASP suspended for snow operations.",
    "Stay off the roads if you can.",
    "Snow day = parking freedom.",
  ],

  heat: [
    "Suspension for extreme heat. Check on neighbors.",
    "Too hot for street sweepers. Stay cool.",
  ],
};

// Copy variations for ASP active
export const ASP_ACTIVE_COPY = {
  headlines: [
    "ASP is in effect today.",
    "Regular parking rules apply.",
    "Street cleaning is on today.",
    "Move your car per usual schedule.",
  ],

  timing: [
    "Move by {time} today.",
    "Street cleaning at {time}.",
    "Don't forget — {time} move today.",
  ],

  gentleReminders: [
    "Regular Tuesday shuffle.",
    "Back to the routine today.",
    "The usual — move the car by {time}.",
  ],
};

// =============================================================================
// SECTION 2: TRANSIT ALERTS
// =============================================================================

export const TRANSIT_ALERT_EXAMPLES: Record<string, MorningTransitAlert[]> = {
  /** All good */
  allGood: [
    { line: "F/G", status: "good", headline: "Weekend schedule, running normally" },
    { line: "2/3", status: "good", headline: "Normal service" },
  ],

  /** Minor delays */
  minorDelays: [
    { line: "4/5/6", status: "delays", headline: "10-15 min delays", details: "Signal maintenance at 14th St" },
    { line: "L", status: "good", headline: "On schedule" },
  ],

  /** Major issues */
  majorIssues: [
    { line: "A/C", status: "skip", headline: "Service suspended", details: "Track fire at 145th St — use 1/B/D instead" },
    { line: "7", status: "delays", headline: "30+ min delays", details: "Switch problems at Queensboro Plaza" },
  ],

  /** Planned work */
  plannedWork: [
    { line: "1", status: "delays", headline: "Local service only", details: "Weekend express suspension" },
  ],

  /** Multiple boroughs */
  multiBorough: [
    { line: "N/Q/R/W", status: "delays", headline: "15 min delays", details: "Manhattan Bridge construction" },
    { line: "B/D/F/M", status: "good", headline: "Alternative via 6th Ave" },
  ],
};

// Copy patterns for transit alerts
export const TRANSIT_ALERT_COPY = {
  good: [
    "Running normally",
    "On schedule",
    "Good service",
    "All clear",
  ],

  delays: {
    headline: [
      "Delays on {line}",
      "{line}: Allow extra time",
      "{line} running slow",
    ],
    details: [
      "Signal problems at {location}",
      "Track maintenance",
      "Equipment issue",
      "Rerouted due to construction",
    ],
  },

  skip: {
    headline: [
      "Avoid {line}",
      "{line}: Major disruption",
      "Find alternate routes",
    ],
    details: [
      "Use {alternate} instead",
      "Shuttle buses available",
      "Consider bus or ferry",
    ],
  },
};

// =============================================================================
// SECTION 3: WEATHER
// =============================================================================

export const WEATHER_EXAMPLES: Record<string, MorningWeather> = {
  /** Perfect day */
  perfect: {
    temp: 72,
    condition: "Sunny & clear",
    icon: "☀️",
    precipChance: 0,
  },

  /** Nice but hot */
  hotSummer: {
    temp: 88,
    condition: "Hot & humid",
    icon: "☀️",
    precipChance: 10,
    gearRecommendation: "Light clothes, water bottle",
  },

  /** Rain coming */
  rainLikely: {
    temp: 64,
    condition: "Rain likely",
    icon: "🌧️",
    precipChance: 80,
    gearRecommendation: "Waterproof jacket + umbrella",
  },

  /** Light rain */
  drizzle: {
    temp: 58,
    condition: "Light rain",
    icon: "🌦️",
    precipChance: 60,
    gearRecommendation: "Bring an umbrella just in case",
  },

  /** Storm */
  thunderstorm: {
    temp: 75,
    condition: "Thunderstorms",
    icon: "⛈️",
    precipChance: 90,
    gearRecommendation: "Full rain gear — heavy downpours expected",
  },

  /** Snow */
  lightSnow: {
    temp: 32,
    condition: "Light snow",
    icon: "🌨️",
    precipChance: 70,
    gearRecommendation: "Boots with grip, allow extra time",
  },

  heavySnow: {
    temp: 26,
    condition: "Heavy snow",
    icon: "❄️",
    precipChance: 95,
    gearRecommendation: "Heavy coat, waterproof boots",
  },

  /** Cold clear */
  cold: {
    temp: 28,
    condition: "Cold & clear",
    icon: "🥶",
    precipChance: 0,
    gearRecommendation: "Heavy coat, hat, gloves",
  },

  /** Foggy */
  fog: {
    temp: 55,
    condition: "Foggy",
    icon: "🌫️",
    precipChance: 20,
    gearRecommendation: "Visibility may affect driving",
  },

  /** Windy */
  windy: {
    temp: 45,
    condition: "Windy",
    icon: "💨",
    precipChance: 10,
    gearRecommendation: "Secure loose items, hold onto that hat",
  },
};

// Weather recommendation copy
export const WEATHER_RECOMMENDATIONS = {
  hot: [
    "Light clothes, stay hydrated",
    "Sunscreen recommended",
    "Seek shade during peak hours",
  ],

  rain: [
    "Waterproof jacket + umbrella",
    "Allow extra commute time",
    "Subway may be crowded",
  ],

  snow: [
    "Waterproof boots essential",
    "Allow extra travel time",
    "Watch for icy patches",
  ],

  cold: [
    "Bundle up — wind chill factor",
    "Layer up for variable temps",
    "Protect extremities",
  ],
};

// =============================================================================
// SECTION 4: DAY AHEAD PREVIEW
// =============================================================================

export const DAY_AHEAD_EXAMPLES: Record<string, MorningDayAhead> = {
  /** Regular day tomorrow */
  regular: {
    date: "Tomorrow",
    dayOfWeek: "Tuesday",
    aspSuspended: false,
    note: "Back to the usual schedule",
  },

  /** Holiday tomorrow */
  holiday: {
    date: "Tomorrow",
    dayOfWeek: "Thursday",
    aspSuspended: true,
    reason: "Thanksgiving Day",
    note: "4-day weekend continues",
  },

  /** Transition day */
  backToNormal: {
    date: "Tomorrow",
    dayOfWeek: "Tuesday",
    aspSuspended: false,
    note: "Holiday break is over — move your car by 9 AM",
  },

  /** Weekend */
  weekend: {
    date: "Tomorrow",
    dayOfWeek: "Saturday",
    aspSuspended: true,
    reason: "Weekend",
  },

  /** Weather note */
  weatherNote: {
    date: "Tomorrow",
    dayOfWeek: "Friday",
    aspSuspended: true,
    reason: "Legal holiday",
    note: "Storms expected — good day to stay in anyway",
  },
};

// Day ahead copy patterns
export const DAY_AHEAD_COPY = {
  suspended: {
    withReason: [
      "🎉 ASP suspended — {reason}",
      "Another day off from street cleaning ({reason})",
      "Leave the car — it's {reason}",
    ],
    withoutReason: [
      "🎉 ASP suspended tomorrow",
      "No street cleaning tomorrow",
      "Another parking break",
    ],
  },

  active: {
    standard: [
      "📋 Regular ASP rules",
      "Back to the usual schedule",
      "Street cleaning resumes",
    ],
    afterHoliday: [
      "Holiday break over — move by 9 AM",
      "Back to reality, back to moving the car",
      "Resume normal parking schedule",
    ],
    firstOfWeek: [
      "First move of the week",
      "Monday shuffle — you know the drill",
    ],
  },

  notes: {
    longWeekend: "3-day weekend continues",
    busy: "Heavy traffic expected",
    weather: "Weather may affect parking rules",
  },
};

// =============================================================================
// SECTION 5: OVERNIGHT PARKING CHANGES
// =============================================================================

export const OVERNIGHT_CHANGE_EXAMPLES = {
  /** Street cleaning time change */
  timeChange: "Street cleaning moved from 9 AM to 11 AM on your block",

  /** Block party */
  blockParty: "No parking 6 AM - 6 PM for street fair",

  /** Film shoot */
  filmShoot: "Film shoot: No parking 7 AM - 10 PM east side",

  /** Utility work */
  utilityWork: "Utility work: No parking 8 AM - 4 PM",

  /** Tree work */
  treeWork: "Tree trimming: Move cars by 7 AM",

  /** Emergency repairs */
  emergencyRepairs: "Emergency water main repair — tow zone",

  /** Snow ops */
  snowOps: "Move to odd side by 9 PM for snow removal",

  /** Holiday extension */
  holidayExtends: "ASP still suspended — holiday continues",
};

// =============================================================================
// COMPLETE EMAIL EXAMPLES
// =============================================================================

export const COMPLETE_EXAMPLES = {
  /** Standard weekday - everything normal */
  normalTuesday: (): MorningBriefData => ({
    date: new Date("2025-03-04T09:00:00"),
    user: { neighborhood: "Bed-Stuy, Brooklyn" },
    parking: {
      aspSuspended: false,
      nextMoveRequired: { date: "March 4", time: "9:00 AM", dayOfWeek: "Today" },
    },
    transit: [
      { line: "A/C", status: "good", headline: "Running normally" },
      { line: "G", status: "good", headline: "On schedule" },
    ],
    weather: { temp: 52, condition: "Partly cloudy", icon: "⛅", precipChance: 10 },
    dayAhead: { date: "March 5", dayOfWeek: "Wednesday", aspSuspended: false },
  }),

  /** Friday before holiday weekend */
  fridayBeforeHoliday: (): MorningBriefData => ({
    date: new Date("2025-07-03T09:00:00"),
    user: { neighborhood: "Astoria, Queens" },
    parking: {
      aspSuspended: true,
      reason: "Independence Day observed",
      metersSuspended: true,
    },
    transit: [
      { line: "N/W", status: "delays", headline: "Weekend schedule", details: "Longer waits, plan accordingly" },
    ],
    weather: { temp: 85, condition: "Sunny", icon: "☀️", precipChance: 5, gearRecommendation: "Hot one today — water bottle" },
    dayAhead: {
      date: "July 4",
      dayOfWeek: "Saturday",
      aspSuspended: true,
      reason: "Independence Day",
      note: "Fireworks on East River — streets close early",
    },
  }),

  /** Snow day */
  snowDay: (): MorningBriefData => ({
    date: new Date("2025-02-18T09:00:00"),
    user: { neighborhood: "Harlem, Manhattan" },
    parking: {
      aspSuspended: true,
      reason: "Snow emergency",
      metersSuspended: false,
      overnightChanges: [
        "Move to odd-numbered side by 9 PM tonight",
        "Snow emergency routes are no-parking zones",
      ],
    },
    transit: [
      { line: "2/3", status: "delays", headline: "Local service only", details: "Express suspended due to weather" },
      { line: "A/B/C/D", status: "delays", headline: "Running with delays" },
      { line: "M1 bus", status: "skip", headline: "Suspended", details: "Use subway or wait for conditions to improve" },
    ],
    weather: { temp: 28, condition: "Heavy snow", icon: "❄️", precipChance: 95, gearRecommendation: "Heavy coat, waterproof boots" },
    dayAhead: {
      date: "February 19",
      dayOfWeek: "Wednesday",
      aspSuspended: true,
      reason: "Snow cleanup",
      note: "Alternate side suspended for snow removal",
    },
  }),

  /** First day back after holidays */
  backToReality: (): MorningBriefData => ({
    date: new Date("2026-01-05T09:00:00"),
    user: { neighborhood: "Park Slope, Brooklyn" },
    parking: {
      aspSuspended: false,
      nextMoveRequired: { date: "January 5", time: "9:00 AM", dayOfWeek: "Today" },
    },
    transit: [
      { line: "F/G", status: "good", headline: "Full service resumed" },
    ],
    weather: { temp: 38, condition: "Cloudy", icon: "☁️", precipChance: 20 },
    dayAhead: {
      date: "January 6",
      dayOfWeek: "Tuesday",
      aspSuspended: false,
      note: "Regular schedule all week",
    },
  }),

  /** Unexpected overnight change */
  surpriseChanges: (): MorningBriefData => ({
    date: new Date("2025-06-12T09:00:00"),
    user: { neighborhood: "Lower East Side, Manhattan" },
    parking: {
      aspSuspended: false,
      nextMoveRequired: { date: "June 12", time: "11:30 AM", dayOfWeek: "Today" },
      overnightChanges: [
        "Film shoot on your block: No parking until 10 PM",
        "Street cleaning delayed to 11:30 AM",
      ],
    },
    transit: [
      { line: "F", status: "delays", headline: "Downtown delays", details: "Signal work at 2nd Ave" },
      { line: "J/M/Z", status: "good", headline: "Alternative via Williamsburg Bridge" },
    ],
    weather: { temp: 78, condition: "Clear", icon: "☀️", precipChance: 0 },
    dayAhead: {
      date: "June 13",
      dayOfWeek: "Friday",
      aspSuspended: true,
      reason: "Legal holiday",
    },
  }),
};

// =============================================================================
// SUBJECT LINE EXAMPLES BY SCENARIO
// =============================================================================

export const SUBJECT_LINE_SCENARIOS = {
  /** Best case: suspended + good weather + good transit */
  bestDay: {
    scenario: "Holiday, clear weather, no transit issues",
    subjects: [
      "🚗 No ASP today (Labor Day)",
      "🎉 Your car can stay put — Labor Day",
      "☕ Sleep in: ASP suspended for Labor Day",
    ],
  },

  /** Challenging day: active + rain + delays */
  toughDay: {
    scenario: "Active ASP, rain, transit delays",
    subjects: [
      "🚗 ASP in effect — move by 9 AM + rain today",
      "☔ Rain + delays: Check before you go",
      "📋 Street cleaning today + transit alerts",
    ],
  },

  /** Winter emergency */
  snowEmergency: {
    scenario: "Snow day with parking restrictions",
    subjects: [
      "❄️ Snow emergency: Move to odd side by 9 PM",
      "🚗 ASP suspended but move your car tonight",
      "⚠️ Snow ops + transit delays",
    ],
  },

  /** Quiet summer */
  summerQuiet: {
    scenario: "Summer suspension, nice weather",
    subjects: [
      "☀️ ASP suspended + beautiful day ahead",
      "🚗 Summer break continues",
      "📋 Your NYC morning brief",
    ],
  },

  /** Back to work */
  postHoliday: {
    scenario: "First day back, active ASP",
    subjects: [
      "🚗 Back to reality: ASP in effect today",
      "⏰ Move your car today — holiday's over",
      "📋 Street cleaning resumes",
    ],
  },
};

// =============================================================================
// EMAIL LENGTH GUIDELINES
// =============================================================================

export const EMAIL_LENGTH_GUIDELINES = {
  /** Target: Under 30 seconds to scan */
  targetReadTime: "20-30 seconds",

  /** Character limits */
  limits: {
    subject: "60 characters max",
    preheader: "100 characters max",
    parkingHeadline: "50 characters",
    transitAlert: "80 characters per line",
    weatherLine: "40 characters",
    dayAhead: "60 characters",
  },

  /** Visual guidelines */
  visuals: {
    maxSections: 5,
    useIcons: true,
    highlightUrgency: true,
    suppressGoodNews: false, // Show good transit status
  },
};

// =============================================================================
// SEND TIME CONSIDERATIONS
// =============================================================================

export const SEND_TIME_GUIDELANCE = {
  /** Optimal: 9:00 AM */
  optimal: {
    time: "9:00 AM",
    reason: "After coffee, before leaving home",
  },

  /** Acceptable range */
  acceptable: "8:30 AM - 9:30 AM",

  /** Avoid */
  avoid: [
    "Before 8 AM (too early)",
    "After 10 AM (too late to be useful)",
  ],

  /** Daylight savings adjustments */
  dst: {
    spring: "Keep at 9 AM (feels earlier)",
    fall: "Consider 8:30 AM (feels later)",
  },
};

export default {
  PARKING_STATUS_EXAMPLES,
  TRANSIT_ALERT_EXAMPLES,
  WEATHER_EXAMPLES,
  DAY_AHEAD_EXAMPLES,
  COMPLETE_EXAMPLES,
  SUBJECT_LINE_SCENARIOS,
};
