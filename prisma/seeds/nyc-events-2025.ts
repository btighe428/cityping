/**
 * NYC Major Events 2025 Seed Data
 *
 * Curated list of NYC's biggest free and noteworthy events.
 * Sources:
 * - nyc.gov/events
 * - SummerStage (cityparksfoundation.org/summerstage)
 * - NYC Tourism (nyctourism.com/annual-events)
 * - MoMA, Whitney, Met museum schedules
 * - TCS NYC Marathon (nyrr.org)
 *
 * This data populates the AlertEvent table for the "events" module,
 * enabling users to receive timely notifications about major city happenings.
 */

export const NYC_EVENTS_2025 = [
  // ============================================================================
  // MAJOR ANNUAL EVENTS
  // ============================================================================
  {
    title: "TCS NYC Marathon",
    body: "World's largest marathon. 26.2 miles through all 5 boroughs. 1M+ spectators. Major street closures citywide.",
    startsAt: new Date("2025-11-02T08:00:00-05:00"),
    endsAt: new Date("2025-11-02T18:00:00-05:00"),
    category: "sports",
    neighborhoods: ["Staten Island", "Brooklyn", "Queens", "Bronx", "Manhattan"],
    metadata: {
      url: "https://www.nyrr.org/tcsnycmarathon",
      streetClosures: true,
      transitImpact: "heavy",
    },
  },
  {
    title: "Macy's Thanksgiving Day Parade",
    body: "Giant balloons, floats, and performances from Central Park West to Herald Square. Starts 8:30am.",
    startsAt: new Date("2025-11-27T08:30:00-05:00"),
    endsAt: new Date("2025-11-27T12:00:00-05:00"),
    category: "parade",
    neighborhoods: ["Upper West Side", "Midtown"],
    metadata: {
      url: "https://www.macys.com/social/parade",
      streetClosures: true,
      route: "Central Park West to 34th St",
    },
  },
  {
    title: "Times Square New Year's Eve Ball Drop",
    body: "Iconic countdown. Area closes 3pm. No bags, no alcohol. Dress warm - you'll wait 8+ hours.",
    startsAt: new Date("2025-12-31T18:00:00-05:00"),
    endsAt: new Date("2026-01-01T01:00:00-05:00"),
    category: "celebration",
    neighborhoods: ["Times Square", "Midtown"],
    metadata: {
      url: "https://www.timessquarenyc.org/times-square-new-years-eve",
      streetClosures: true,
    },
  },
  {
    title: "NYC Pride March",
    body: "World's largest LGBTQ+ parade. 5th Ave from 25th St to Greenwich Village. 2M+ attendees.",
    startsAt: new Date("2025-06-29T12:00:00-04:00"),
    endsAt: new Date("2025-06-29T18:00:00-04:00"),
    category: "parade",
    neighborhoods: ["Flatiron", "Greenwich Village", "Chelsea"],
    metadata: {
      url: "https://www.nycpride.org",
      streetClosures: true,
    },
  },
  {
    title: "Tribeca Festival",
    body: "Robert De Niro's film festival. 100+ films, free outdoor screenings, panels. Lower Manhattan.",
    startsAt: new Date("2025-06-04T00:00:00-04:00"),
    endsAt: new Date("2025-06-15T23:59:00-04:00"),
    category: "film",
    neighborhoods: ["Tribeca", "Financial District"],
    metadata: {
      url: "https://tribecafilm.com/festival",
      free: "outdoor screenings",
    },
  },

  // ============================================================================
  // SUMMERSTAGE 2025 (Free Concerts)
  // Season: May 17 - October 9
  // ============================================================================
  {
    title: "SummerStage Opening Night: Marcus Miller, Tank and the Bangas",
    body: "FREE. New Orleans-themed celebration with jazz great Marcus Miller + The Soul Rebels. Central Park.",
    startsAt: new Date("2025-06-04T19:00:00-04:00"),
    endsAt: new Date("2025-06-04T22:00:00-04:00"),
    category: "concert",
    neighborhoods: ["Central Park", "Upper East Side"],
    metadata: {
      url: "https://cityparksfoundation.org/summerstage",
      free: true,
      venue: "Rumsey Playfield, Central Park",
    },
  },
  {
    title: "SummerStage: Rhiannon Giddens & Lido Pimienta",
    body: "FREE. Grammy-winning folk/Americana artist Rhiannon Giddens. Central Park Rumsey Playfield.",
    startsAt: new Date("2025-06-25T19:00:00-04:00"),
    endsAt: new Date("2025-06-25T22:00:00-04:00"),
    category: "concert",
    neighborhoods: ["Central Park", "Upper East Side"],
    metadata: { free: true, venue: "Rumsey Playfield" },
  },
  {
    title: "SummerStage: Femi Kuti & The Positive Force + dead prez",
    body: "FREE. Afrobeat royalty meets hip-hop legends. Central Park.",
    startsAt: new Date("2025-07-27T17:00:00-04:00"),
    endsAt: new Date("2025-07-27T21:00:00-04:00"),
    category: "concert",
    neighborhoods: ["Central Park"],
    metadata: { free: true, venue: "Rumsey Playfield" },
  },
  {
    title: "SummerStage: Morgan Freeman's Symphonic Blues",
    body: "FREE. Morgan Freeman presents a symphonic twist on Delta blues. Central Park.",
    startsAt: new Date("2025-08-02T19:00:00-04:00"),
    endsAt: new Date("2025-08-02T22:00:00-04:00"),
    category: "concert",
    neighborhoods: ["Central Park"],
    metadata: { free: true, venue: "Rumsey Playfield" },
  },
  {
    title: "Charlie Parker Jazz Festival",
    body: "FREE. 3 days of world-class jazz. Ron Carter, Dee Dee Bridgewater. Marcus Garvey Park + Tompkins Square.",
    startsAt: new Date("2025-08-22T15:00:00-04:00"),
    endsAt: new Date("2025-08-24T21:00:00-04:00"),
    category: "concert",
    neighborhoods: ["Harlem", "East Village"],
    metadata: { free: true, url: "https://cityparksfoundation.org/charlie-parker" },
  },
  {
    title: "SummerStage: Soccer Mommy + Hurray for the Riff Raff",
    body: "FREE. Indie rock double header. Central Park Rumsey Playfield.",
    startsAt: new Date("2025-09-16T18:00:00-04:00"),
    endsAt: new Date("2025-09-16T21:00:00-04:00"),
    category: "concert",
    neighborhoods: ["Central Park"],
    metadata: { free: true },
  },

  // ============================================================================
  // FREE MUSEUM NIGHTS (Weekly Recurring)
  // ============================================================================
  {
    title: "MoMA UNIQLO Free Fridays",
    body: "FREE for NY State residents 5:30-8:30pm. Must reserve tickets in advance. Proof of residency required.",
    startsAt: new Date("2025-01-10T17:30:00-05:00"),
    endsAt: new Date("2025-12-26T20:30:00-05:00"),
    category: "museum",
    neighborhoods: ["Midtown"],
    metadata: {
      url: "https://www.moma.org/calendar/events/10253",
      free: true,
      recurring: "weekly-friday",
      reservationRequired: true,
    },
  },
  {
    title: "Whitney Free Friday Nights",
    body: "FREE admission 5-10pm every Friday. No reservation needed.",
    startsAt: new Date("2025-01-03T17:00:00-05:00"),
    endsAt: new Date("2025-12-26T22:00:00-05:00"),
    category: "museum",
    neighborhoods: ["Meatpacking District", "Chelsea"],
    metadata: {
      url: "https://whitney.org",
      free: true,
      recurring: "weekly-friday",
    },
  },

  // ============================================================================
  // SUMMER FOR THE CITY (Lincoln Center)
  // ============================================================================
  {
    title: "Summer for the City at Lincoln Center",
    body: "200+ free events through Aug 9. Dance parties, jazz nights, outdoor films, kids events. Nearly all free.",
    startsAt: new Date("2025-06-01T00:00:00-04:00"),
    endsAt: new Date("2025-08-09T23:59:00-04:00"),
    category: "festival",
    neighborhoods: ["Lincoln Center", "Upper West Side"],
    metadata: {
      url: "https://www.lincolncenter.org/series/summer-for-the-city",
      free: true,
    },
  },

  // ============================================================================
  // OTHER MAJOR FREE EVENTS
  // ============================================================================
  {
    title: "Celebrate Brooklyn at Prospect Park",
    body: "FREE outdoor concerts, film, dance at Prospect Park Bandshell. 40+ year tradition.",
    startsAt: new Date("2025-06-07T19:00:00-04:00"),
    endsAt: new Date("2025-08-16T22:00:00-04:00"),
    category: "concert",
    neighborhoods: ["Park Slope", "Prospect Heights"],
    metadata: {
      url: "https://www.bfreerooklyn.org",
      free: true,
      venue: "Prospect Park Bandshell",
    },
  },
  {
    title: "Summer Streets",
    body: "FREE. Park Ave closed to cars 7am-1pm. 7 miles open for biking, walking, activities.",
    startsAt: new Date("2025-08-02T07:00:00-04:00"),
    endsAt: new Date("2025-08-02T13:00:00-04:00"),
    category: "outdoor",
    neighborhoods: ["Park Ave", "Brooklyn Bridge"],
    metadata: {
      url: "https://www.nyc.gov/summerstreets",
      free: true,
      recurring: "3 Saturdays in August",
    },
  },
  {
    title: "NYC Restaurant Week",
    body: "$30 lunch, $45 dinner at 400+ top restaurants. Book early - popular spots fill fast.",
    startsAt: new Date("2025-01-21T00:00:00-05:00"),
    endsAt: new Date("2025-02-09T23:59:00-05:00"),
    category: "food",
    neighborhoods: ["Citywide"],
    metadata: {
      url: "https://www.nycgo.com/restaurant-week",
    },
  },
  {
    title: "NYC Restaurant Week (Summer)",
    body: "$30 lunch, $45 dinner at 400+ top restaurants. Book early.",
    startsAt: new Date("2025-07-22T00:00:00-04:00"),
    endsAt: new Date("2025-08-17T23:59:00-04:00"),
    category: "food",
    neighborhoods: ["Citywide"],
    metadata: {
      url: "https://www.nycgo.com/restaurant-week",
    },
  },
  {
    title: "New York Music Month",
    body: "50+ FREE events celebrating NYC music. Emerging artists, industry panels, workshops.",
    startsAt: new Date("2025-06-01T00:00:00-04:00"),
    endsAt: new Date("2025-06-30T23:59:00-04:00"),
    category: "concert",
    neighborhoods: ["Citywide"],
    metadata: {
      url: "https://www.nyc.gov/site/mome/industries/music.page",
      free: true,
    },
  },

  // ============================================================================
  // STREET FAIRS & FESTIVALS
  // ============================================================================
  {
    title: "San Gennaro Festival (Little Italy)",
    body: "11-day Italian street festival. Cannoli eating contests, live music, 100+ vendors on Mulberry St.",
    startsAt: new Date("2025-09-11T00:00:00-04:00"),
    endsAt: new Date("2025-09-21T23:00:00-04:00"),
    category: "festival",
    neighborhoods: ["Little Italy", "Chinatown"],
    metadata: {
      url: "https://sangennaro.nyc",
      free: true,
    },
  },
  {
    title: "Lunar New Year Parade (Chinatown)",
    body: "Dragon dancers, firecrackers, floats. Mott Street to Sara D. Roosevelt Park. Year of the Snake.",
    startsAt: new Date("2025-02-09T13:00:00-05:00"),
    endsAt: new Date("2025-02-09T16:00:00-05:00"),
    category: "parade",
    neighborhoods: ["Chinatown", "Lower East Side"],
    metadata: {
      free: true,
      streetClosures: true,
    },
  },
  {
    title: "St. Patrick's Day Parade",
    body: "World's oldest & largest St. Patrick's Day Parade. 5th Ave from 44th-79th St. 150,000+ marchers.",
    startsAt: new Date("2025-03-17T11:00:00-04:00"),
    endsAt: new Date("2025-03-17T17:00:00-04:00"),
    category: "parade",
    neighborhoods: ["Midtown", "Upper East Side"],
    metadata: {
      url: "https://nycstpatricksparade.org",
      streetClosures: true,
    },
  },
];

/**
 * Seeds NYC events into the AlertEvent table.
 * Call from prisma/seeds/index.ts or run standalone.
 */
export async function seedNYCEvents2025(prisma: any) {
  // Find the events module source
  const source = await prisma.alertSource.findFirst({
    where: { moduleId: "events" },
  });

  if (!source) {
    console.log("  ⚠️  No alert source found for 'events' module. Run module seeds first.");
    return;
  }

  let created = 0;
  const updated = 0;

  for (const event of NYC_EVENTS_2025) {
    const externalId = `nyc-2025-${event.title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50)}`;

    const result = await prisma.alertEvent.upsert({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId,
        },
      },
      update: {
        title: event.title,
        body: event.body,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        neighborhoods: event.neighborhoods,
        metadata: event.metadata,
      },
      create: {
        sourceId: source.id,
        externalId,
        title: event.title,
        body: event.body,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        neighborhoods: event.neighborhoods,
        metadata: event.metadata,
      },
    });

    if (result.createdAt.getTime() === result.createdAt.getTime()) {
      // Upsert doesn't tell us if created or updated, so we count all
      created++;
    }
  }

  console.log(`  ✓ events: ${NYC_EVENTS_2025.length} NYC events seeded`);
}
