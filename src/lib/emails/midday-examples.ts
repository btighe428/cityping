/**
 * Midday Email Section Examples
 * 
 * Sample content for each section of the midday email.
 * Use these as templates when generating real content.
 */

// =============================================================================
// BREAKING UPDATES - ASP STATUS CHANGES
// =============================================================================

export const ASP_STATUS_EXAMPLES = {
  /** ASP suspended mid-day */
  suspended: {
    type: "asp_status" as const,
    headline: "ASP just suspended",
    details: "Mayor announced emergency suspension for snow removal",
    actionRequired: "Your car is fine where it is — no need to move",
  },
  
  /** ASP reinstated */
  reinstated: {
    type: "asp_status" as const,
    headline: "ASP back in effect",
    details: "Suspension lifted — normal rules resume immediately",
    actionRequired: "Move car by 6 PM if on ASP side",
  },
  
  /** Holiday surprise */
  holiday: {
    type: "asp_status" as const,
    headline: "ASP suspended for holiday",
    details: "Religious observance — no street cleaning citywide",
    actionRequired: "Leave the car — you're good until tomorrow",
  },
  
  /** Meter change */
  metersOnly: {
    type: "asp_status" as const,
    headline: "Meters suspended, ASP still on",
    details: "Parking meters free today but street cleaning active",
    actionRequired: "Still need to move for ASP — meters are free",
  },
};

// =============================================================================
// BREAKING UPDATES - TRANSIT EMERGENCIES
// =============================================================================

export const TRANSIT_EMERGENCY_EXAMPLES = {
  /** Full suspension */
  suspended: {
    type: "transit_major" as const,
    headline: "F train suspended",
    details: "Signal malfunction at York St — no service between Manhattan and Brooklyn",
    actionRequired: "Use A/C or 4/5 as alternate",
  },
  
  /** Partial suspension */
  partial: {
    type: "transit_major" as const,
    headline: "No N/Q/R in Queens",
    details: "Track fire at 39th Ave — Manhattan-bound only from Astoria",
    actionRequired: "Take M60 bus or ferry to Manhattan",
  },
  
  /** Station closure */
  stationClosed: {
    type: "transit_major" as const,
    headline: "14th St Union Sq closed",
    details: "Police activity — all lines skipping station",
    actionRequired: "Use 6th Ave or 3rd Ave stations instead",
  },
  
  /** Express to local */
  expressCancelled: {
    type: "transit_major" as const,
    headline: "No express service",
    details: "2/3 running local only due to mechanical issue",
    actionRequired: "Add 15-20 min to your commute",
  },
};

// =============================================================================
// BREAKING UPDATES - WEATHER WARNINGS
// =============================================================================

export const WEATHER_WARNING_EXAMPLES = {
  /** Thunderstorm */
  thunderstorm: {
    type: "weather_warning" as const,
    headline: "Severe thunderstorm warning",
    details: "NWS issued warning until 3 PM — wind gusts to 60mph",
    actionRequired: "Seek shelter if outdoors, indoor lunch recommended",
  },
  
  /** Flash flood */
  flood: {
    type: "weather_warning" as const,
    headline: "Flash flood warning",
    details: "Heavy rain causing street flooding in low-lying areas",
    actionRequired: "Avoid basement venues, use subway over bus",
  },
  
  /** Heat advisory */
  heat: {
    type: "weather_warning" as const,
    headline: "Heat advisory in effect",
    details: "Feels like 102° — heat index warning until 6 PM",
    actionRequired: "Stay hydrated, seek A/C during lunch",
  },
  
  /** Snow squall */
  snow: {
    type: "weather_warning" as const,
    headline: "Snow squall warning",
    details: "Brief intense snowfall reducing visibility to near zero",
    actionRequired: "Delay travel if possible — 30 min window",
  },
};

// =============================================================================
// BREAKING UPDATES - PARKING EMERGENCIES
// =============================================================================

export const PARKING_EMERGENCY_EXAMPLES = {
  /** Film shoot */
  filmShoot: {
    type: "parking_emergency" as const,
    headline: "Film shoot on your block",
    details: "No parking 2 PM - 11 PM on your side of the street",
    actionRequired: "Move car by 2 PM or risk immediate tow",
  },
  
  /** Snow emergency */
  snowEmergency: {
    type: "parking_emergency" as const,
    headline: "Snow emergency declared",
    details: "Move to odd-numbered side by 9 PM tonight",
    actionRequired: "Find alternate side now — towing starts at 9 PM",
  },
  
  /** Street closure */
  streetClosed: {
    type: "parking_emergency" as const,
    headline: "Street closure announced",
    details: "Your block closing 6 PM for water main repair",
    actionRequired: "Move car before 6 PM or be stuck until morning",
  },
  
  /** Construction surprise */
  construction: {
    type: "parking_emergency" as const,
    headline: "Emergency construction",
    details: "Con Ed work — no parking 24 hours starting now",
    actionRequired: "Move immediately — tow trucks en route",
  },
};

// =============================================================================
// MID-DAY TRANSIT STATUS
// =============================================================================

export const TRANSIT_STATUS_EXAMPLES = {
  /** Good service */
  good: {
    line: "F/G",
    status: "good" as const,
    headline: "Running normally",
  },
  
  /** Minor delays */
  minorDelays: {
    line: "4/5/6",
    status: "delays" as const,
    headline: "Signal problems at 59th St",
    delayTime: "10-15 min",
  },
  
  /** Major delays */
  majorDelays: {
    line: "A/C/E",
    status: "delays" as const,
    headline: "Track maintenance, reduced service",
    delayTime: "20-25 min",
  },
  
  /** Avoid entirely */
  avoid: {
    line: "L",
    status: "avoid" as const,
    headline: "Suspended Brooklyn-bound",
    delayTime: "Use J/M/Z",
  },
  
  /** Crowding */
  crowded: {
    line: "1/2/3",
    status: "delays" as const,
    headline: "Heavy crowds due to alternate route",
    delayTime: "5-10 min",
  },
  
  /** Weekend changes */
  weekend: {
    line: "N/Q/R/W",
    status: "delays" as const,
    headline: "Weekend service changes in effect",
    delayTime: "Expect gaps",
  },
};

// =============================================================================
// LUNCH SPOTS
// =============================================================================

export const LUNCH_SPOT_EXAMPLES = {
  /** Restaurant deal */
  restaurantDeal: {
    name: "Prince Street Pizza",
    type: "restaurant" as const,
    distance: "0.2 mi",
    walkTime: "4 min",
    offer: "Slice + drink $6",
    endsAt: "3 PM",
  },
  
  /** Quick bite */
  quickBite: {
    name: "Chopt",
    type: "restaurant" as const,
    distance: "0.1 mi",
    walkTime: "2 min",
    offer: "App order ready in 5 min",
  },
  
  /** Food event */
  foodEvent: {
    name: "Smorgasburg",
    type: "event" as const,
    distance: "0.5 mi",
    walkTime: "10 min",
    endsAt: "5 PM",
  },
  
  /** Pop-up */
  popup: {
    name: "Ugly Baby Thai Pop-up",
    type: "popup" as const,
    distance: "0.3 mi",
    walkTime: "6 min",
    offer: "Lunch prix fixe $18",
    endsAt: "2:30 PM",
  },
  
  /** Happy hour */
  happyHour: {
    name: "The Dead Rabbit",
    type: "restaurant" as const,
    distance: "0.4 mi",
    walkTime: "8 min",
    offer: "Lunch + pint $15",
    endsAt: "4 PM",
  },
  
  /** Food hall */
  foodHall: {
    name: "Urban Hawker",
    type: "event" as const,
    distance: "0.6 mi",
    walkTime: "12 min",
  },
  
  /** Sample sale */
  sampleSale: {
    name: "AllSaints Sample Sale",
    type: "deal" as const,
    distance: "0.3 mi",
    walkTime: "6 min",
    offer: "Up to 70% off",
    endsAt: "7 PM",
  },
  
  /** Outdoor */
  outdoor: {
    name: "Shake Shack Madison Sq",
    type: "restaurant" as const,
    distance: "0.2 mi",
    walkTime: "4 min",
    offer: "Perfect patio weather",
  },
};

// =============================================================================
// AFTERNOON PREVIEW
// =============================================================================

export const AFTERNOON_PREVIEW_EXAMPLES = {
  /** Weather change */
  weatherChange: {
    weatherShift: "Rain moving in around 4 PM — grab an umbrella before you leave",
  },
  
  /** Clearing up */
  clearing: {
    weatherShift: "Clouds clearing — nice evening ahead",
    eveningNote: "Sunset at 7:42 PM — good night for outdoor plans",
  },
  
  /** Heat continues */
  hot: {
    weatherShift: "Staying hot — 95° through 6 PM",
    transitOutlook: "Subway cars running hot — expect delays as crews slow down",
  },
  
  /** Transit outlook */
  transitOutlook: {
    transitOutlook: "Rush hour + rain = expect crowds. Leave 10 min early.",
  },
  
  /** Evening event */
  eveningEvent: {
    eveningNote: "Free concert in Prospect Park at 7 PM — gates open at 6",
  },
  
  /** Quiet evening */
  quiet: {
    weatherShift: "Cooling to 68° by 7 PM",
    eveningNote: "Nice night for a walk or outdoor dinner",
  },
  
  /** Full preview */
  full: {
    weatherShift: "Thunderstorms possible 3-5 PM, then clearing",
    transitOutlook: "Weekend service changes start at 8 PM",
    eveningNote: "Street fair on your block 6-10 PM — expect noise",
  },
  
  /** Nothing major */
  nothing: {
    // No fields — use stay tuned message
  },
};

// =============================================================================
// COMPLETE SCENARIO EXAMPLES
// =============================================================================

export const SCENARIO_EXAMPLES = {
  /** Scenario: Monday morning routine */
  mondayRoutine: {
    date: new Date("2025-02-03T12:00:00"),
    breakingUpdates: [],
    transit: [
      { line: "L", status: "good", headline: "Normal service" },
      { line: "G", status: "good", headline: "Normal service" },
    ],
    lunchSpots: [
      { name: "Black Seed Bagels", type: "restaurant", distance: "0.2 mi", walkTime: "4 min", offer: "Lunch sandwich $9" },
    ],
    afternoon: {
      weatherShift: "Partly cloudy, high of 45°",
      transitOutlook: "No issues expected for evening commute",
    },
  },
  
  /** Scenario: Storm rolling in */
  stormIncoming: {
    date: new Date("2025-03-15T12:00:00"),
    breakingUpdates: [
      {
        type: "weather_warning",
        headline: "High wind warning",
        details: "Gusts to 50 mph expected 2-6 PM",
        actionRequired: "Secure outdoor items, indoor lunch recommended",
      },
    ],
    transit: [
      { line: "1/2/3", status: "delays", headline: "Reduced speed due to wind", delayTime: "10 min" },
      { line: "A/C/E", status: "good", headline: "Normal service" },
    ],
    lunchSpots: [
      { name: "Eataly Food Hall", type: "event", distance: "0.3 mi", walkTime: "5 min", offer: "Indoor + air shielded" },
    ],
    afternoon: {
      weatherShift: "Winds peak 3-4 PM, then drop",
      transitOutlook: "Speed restrictions may continue through rush hour",
      eveningNote: "Ferry service suspended until winds die down",
    },
  },
  
  /** Scenario: Surprise ASP change */
  surpriseHoliday: {
    date: new Date("2025-06-19T12:00:00"),
    breakingUpdates: [
      {
        type: "asp_status",
        headline: "ASP suspended for Juneteenth",
        details: "Announced this morning — citywide suspension",
        actionRequired: "Leave your car — no need to move it today",
      },
    ],
    transit: [
      { line: "F/G", status: "good", headline: "Weekend schedule" },
    ],
    lunchSpots: [
      { name: "Juneteenth Block Party", type: "event", distance: "0.5 mi", walkTime: "10 min", endsAt: "6 PM" },
      { name: "Peaches BBQ", type: "restaurant", distance: "0.3 mi", walkTime: "6 min", offer: "Special menu today" },
    ],
    afternoon: {
      weatherShift: "Sunny and 78° — beautiful afternoon",
      eveningNote: "Fireworks at 9 PM in several boroughs",
    },
  },
  
  /** Scenario: Transit nightmare */
  transitNightmare: {
    date: new Date("2025-09-20T12:15:00"),
    breakingUpdates: [
      {
        type: "transit_major",
        headline: "Manhattan Bridge closure",
        details: "Police activity — all Brooklyn-Manhattan subway lines affected",
        actionRequired: "Plan alternate route home NOW",
      },
    ],
    transit: [
      { line: "B/D/Q", status: "avoid", headline: "No Manhattan service", delayTime: "Use Manhattan Bridge bus" },
      { line: "N/Q/R/W", status: "avoid", headline: "Queens only", delayTime: "Ferry or East River buses" },
      { line: "F", status: "delays", headline: "Packed — adding cars", delayTime: "20 min" },
      { line: "A/C", status: "delays", headline: "Rerouted via tunnel", delayTime: "15 min" },
    ],
    afternoon: {
      transitOutlook: "Bridge closure indefinite — monitor official channels",
    },
  },
  
  /** Scenario: Perfect summer day */
  perfectSummer: {
    date: new Date("2025-07-30T12:00:00"),
    breakingUpdates: [],
    transit: [
      { line: "4/5/6", status: "good", headline: "Normal service" },
      { line: "N/Q/R/W", status: "good", headline: "Normal service" },
    ],
    lunchSpots: [
      { name: "Bryant Park", type: "event", distance: "0.4 mi", walkTime: "7 min", offer: "Food kiosks + lawn" },
      { name: "The Halal Guys", type: "restaurant", distance: "0.2 mi", walkTime: "3 min" },
      { name: "Joe Coffee", type: "restaurant", distance: "0.1 mi", walkTime: "2 min", offer: "Iced coffee happy hour" },
    ],
    afternoon: {
      weatherShift: "Perfect 82° with light breeze",
      eveningNote: "Outdoor movie in the park starts at 8 PM",
    },
  },
};

// =============================================================================
// SUBJECT LINE EXAMPLES BY SCENARIO
// =============================================================================

export const SUBJECT_LINE_SCENARIOS = {
  /** ASP changed mid-day */
  aspChanged: [
    "🎉 ASP just suspended — leave your car!",
    "✅ No street cleaning today (update)",
    "🚗 Good news: ASP status changed",
  ],
  
  /** Transit issue */
  transitIssue: [
    "🚇 L train down — alternate routes inside",
    "⚠️ Commute alert: Major delays",
    "🚨 Transit emergency — check before leaving",
  ],
  
  /** Weather warning */
  weatherAlert: [
    "🌩️ Storm warning until 3 PM",
    "⛈️ Severe weather heads up",
    "☔ Rain incoming — grab umbrella now",
  ],
  
  /** Parking emergency */
  parkingEmergency: [
    "🚨 Move your car NOW — film shoot",
    "⚠️ Parking emergency on your block",
    "🎬 Film shoot = towing starts 2 PM",
  ],
  
  /** Lunch focus */
  lunchFocus: [
    "🍽️ Lunch: 3 spots under 5 min walk",
    "☕ Quick lunch ideas near you",
    "🥡 Food hall pop-up ends at 2",
  ],
  
  /** Quiet day */
  quietDay: [
    "🗽 Midday check: All clear",
    "☕ Quick NYC update — no changes",
    "📋 Lunch break brief from CityPing",
  ],
};

export default {
  ASP_STATUS_EXAMPLES,
  TRANSIT_EMERGENCY_EXAMPLES,
  WEATHER_WARNING_EXAMPLES,
  PARKING_EMERGENCY_EXAMPLES,
  TRANSIT_STATUS_EXAMPLES,
  LUNCH_SPOT_EXAMPLES,
  AFTERNOON_PREVIEW_EXAMPLES,
  SCENARIO_EXAMPLES,
  SUBJECT_LINE_SCENARIOS,
};
