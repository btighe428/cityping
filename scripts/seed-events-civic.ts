#!/usr/bin/env npx tsx
// scripts/seed-events-civic.ts
/**
 * NYC Civic & Practical Events 2026 Seed Data
 *
 * This script seeds the CityEvent database with civic, practical, and lifestyle events
 * for NYC residents. Events are analyzed by Haiku for optimal alert timing.
 *
 * Categories covered:
 * - Tax deadlines (federal, state, city)
 * - School calendar dates
 * - Voter registration and election dates
 * - Alternate side parking suspensions
 * - Restaurant Week dates
 * - Permit renewal deadlines
 * - Daylight saving time changes
 * - Free museum days
 * - Farmers market openings
 * - Beach and pool seasons
 * - Outdoor dining season
 *
 * Usage:
 *   npx tsx scripts/seed-events-civic.ts
 *
 * Sources:
 * - NYC DOT Alternate Side Parking Calendar
 * - NYC DOE School Calendar 2025-2026
 * - NY State Board of Elections
 * - IRS / NY Dept of Taxation
 * - NYC Parks Department
 * - NYC Tourism / Restaurant Week
 */

import "dotenv/config";
import {
  analyzeEventWithHaiku,
  type HaikuEventAnalysis,
} from "../src/lib/premium/haiku-events-curator";
import { prisma } from "../src/lib/db";

// Valid categories: culture, sports, food, civic, weather, transit, seasonal, local
type EventCategory = "culture" | "sports" | "food" | "civic" | "weather" | "transit" | "seasonal" | "local";

interface CivicEvent {
  title: string;
  description: string;
  category: EventCategory;
  startsAt: Date;
  endsAt?: Date;
  venue: string | null;
  neighborhood: string | null;
}

// ============================================================================
// CIVIC EVENTS DATA - 2026
// ============================================================================

export const civicEvents: CivicEvent[] = [
  // ============================================================================
  // TAX DEADLINES
  // ============================================================================
  {
    title: "Federal & NY State Tax Filing Deadline",
    description: "Federal and New York State income tax returns due. File Form 1040 and IT-201. Extension requests also due today.",
    category: "civic",
    startsAt: new Date("2026-04-15T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "Q1 Estimated Tax Payment Due",
    description: "First quarterly estimated tax payment due for federal, NY State, and NYC taxes. Pay online at tax.ny.gov or IRS Direct Pay.",
    category: "civic",
    startsAt: new Date("2026-04-15T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "Q2 Estimated Tax Payment Due",
    description: "Second quarterly estimated tax payment due for federal, NY State, and NYC taxes.",
    category: "civic",
    startsAt: new Date("2026-06-15T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "Q3 Estimated Tax Payment Due",
    description: "Third quarterly estimated tax payment due for federal, NY State, and NYC taxes.",
    category: "civic",
    startsAt: new Date("2026-09-15T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "Extended Tax Returns Due",
    description: "Deadline for filing extended federal and NY State income tax returns. No further extensions available.",
    category: "civic",
    startsAt: new Date("2026-10-15T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "NYC Property Tax Due - Q1",
    description: "First quarterly NYC property tax payment due for properties assessed at $250,000 or less.",
    category: "civic",
    startsAt: new Date("2026-07-01T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "NYC Property Tax Due - Q2",
    description: "Second quarterly NYC property tax payment due. Pay early for 0.50% discount on remaining yearly taxes.",
    category: "civic",
    startsAt: new Date("2026-10-01T23:59:00"),
    venue: null,
    neighborhood: null,
  },

  // ============================================================================
  // NYC SCHOOL CALENDAR 2025-2026
  // ============================================================================
  {
    title: "NYC Public Schools - Midwinter Recess Begins",
    description: "NYC DOE schools closed for Midwinter Recess through February 20. Plan activities and childcare.",
    category: "civic",
    startsAt: new Date("2026-02-16T00:00:00"),
    endsAt: new Date("2026-02-20T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "NYC Public Schools - Spring Recess Begins",
    description: "NYC DOE schools closed for Spring Recess through April 10. Good Friday, Passover, and Easter included.",
    category: "civic",
    startsAt: new Date("2026-04-02T00:00:00"),
    endsAt: new Date("2026-04-10T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "NYC Public Schools - Last Day of School",
    description: "Final day of the 2025-2026 school year for NYC DOE students. Summer break begins!",
    category: "civic",
    startsAt: new Date("2026-06-26T08:00:00"),
    venue: null,
    neighborhood: null,
  },

  // ============================================================================
  // VOTER REGISTRATION & ELECTIONS
  // ============================================================================
  {
    title: "NY Party Enrollment Change Deadline",
    description: "Last day to change party enrollment for the June 2026 Primary Election. Changes after today take effect June 30.",
    category: "civic",
    startsAt: new Date("2026-02-14T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "NY Primary Election - Voter Registration Deadline",
    description: "Last day to register to vote in the June 23 Primary Election. Register at vote.nyc or any DMV.",
    category: "civic",
    startsAt: new Date("2026-06-13T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "NY Primary Election - Early Voting Begins",
    description: "Early voting opens for the NY Primary Election. Vote at any early voting site in your county through June 21.",
    category: "civic",
    startsAt: new Date("2026-06-13T08:00:00"),
    endsAt: new Date("2026-06-21T20:00:00"),
    venue: "Various Early Voting Sites",
    neighborhood: null,
  },
  {
    title: "NY Primary Election Day",
    description: "New York Primary Election. Polls open 6am-9pm. Find your polling place at vote.nyc.",
    category: "civic",
    startsAt: new Date("2026-06-23T06:00:00"),
    endsAt: new Date("2026-06-23T21:00:00"),
    venue: "Your Assigned Polling Place",
    neighborhood: null,
  },
  {
    title: "NY General Election - Early Voting Begins",
    description: "Early voting opens for the November General Election through November 1. Vote at any early voting site in your county.",
    category: "civic",
    startsAt: new Date("2026-10-24T08:00:00"),
    endsAt: new Date("2026-11-01T20:00:00"),
    venue: "Various Early Voting Sites",
    neighborhood: null,
  },
  {
    title: "NY General Election Day",
    description: "New York General Election. Polls open 6am-9pm. Governor, Congress, and state races on the ballot.",
    category: "civic",
    startsAt: new Date("2026-11-03T06:00:00"),
    endsAt: new Date("2026-11-03T21:00:00"),
    venue: "Your Assigned Polling Place",
    neighborhood: null,
  },

  // ============================================================================
  // ALTERNATE SIDE PARKING SUSPENSIONS (Major Holidays)
  // ============================================================================
  {
    title: "ASP Suspended - New Year's Day",
    description: "Alternate side parking rules suspended for New Year's Day. Meters remain in effect.",
    category: "transit",
    startsAt: new Date("2026-01-01T00:00:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Three Kings' Day",
    description: "Alternate side parking rules suspended for Three Kings' Day (Dia de los Reyes).",
    category: "transit",
    startsAt: new Date("2026-01-06T00:00:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - MLK Day",
    description: "Alternate side parking rules suspended for Martin Luther King Jr. Day.",
    category: "transit",
    startsAt: new Date("2026-01-19T00:00:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Lunar New Year",
    description: "Alternate side parking rules suspended for Lunar New Year. Year of the Horse!",
    category: "transit",
    startsAt: new Date("2026-02-17T00:00:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Presidents' Day",
    description: "Alternate side parking rules suspended for Washington's Birthday / Presidents' Day.",
    category: "transit",
    startsAt: new Date("2026-02-16T00:00:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Passover First Days",
    description: "Alternate side parking rules suspended for first days of Passover through April 3.",
    category: "transit",
    startsAt: new Date("2026-04-02T00:00:00"),
    endsAt: new Date("2026-04-03T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Good Friday",
    description: "Alternate side parking rules suspended for Good Friday.",
    category: "transit",
    startsAt: new Date("2026-04-03T00:00:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Eid al-Fitr",
    description: "Alternate side parking rules suspended for Eid al-Fitr (end of Ramadan). Dates may vary.",
    category: "transit",
    startsAt: new Date("2026-03-20T00:00:00"),
    endsAt: new Date("2026-03-21T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Memorial Day",
    description: "Alternate side parking rules suspended for Memorial Day.",
    category: "transit",
    startsAt: new Date("2026-05-25T00:00:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Eid al-Adha",
    description: "Alternate side parking rules suspended for Eid al-Adha.",
    category: "transit",
    startsAt: new Date("2026-05-27T00:00:00"),
    endsAt: new Date("2026-05-28T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Juneteenth",
    description: "Alternate side parking rules suspended for Juneteenth National Independence Day.",
    category: "transit",
    startsAt: new Date("2026-06-19T00:00:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Independence Day",
    description: "Alternate side parking rules suspended for Independence Day weekend (July 3-4).",
    category: "transit",
    startsAt: new Date("2026-07-03T00:00:00"),
    endsAt: new Date("2026-07-04T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Labor Day",
    description: "Alternate side parking rules suspended for Labor Day.",
    category: "transit",
    startsAt: new Date("2026-09-07T00:00:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Rosh Hashanah",
    description: "Alternate side parking rules suspended for Rosh Hashanah (September 12-13).",
    category: "transit",
    startsAt: new Date("2026-09-12T00:00:00"),
    endsAt: new Date("2026-09-13T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "ASP Suspended - Yom Kippur",
    description: "Alternate side parking rules suspended for Yom Kippur.",
    category: "transit",
    startsAt: new Date("2026-09-21T00:00:00"),
    venue: null,
    neighborhood: null,
  },

  // ============================================================================
  // DAYLIGHT SAVING TIME
  // ============================================================================
  {
    title: "Daylight Saving Time Begins",
    description: "Clocks spring forward 1 hour at 2am. You lose an hour of sleep! The earliest DST can begin.",
    category: "civic",
    startsAt: new Date("2026-03-08T02:00:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "Daylight Saving Time Ends",
    description: "Clocks fall back 1 hour at 2am. You gain an hour of sleep! The earliest DST can end.",
    category: "civic",
    startsAt: new Date("2026-11-01T02:00:00"),
    venue: null,
    neighborhood: null,
  },

  // ============================================================================
  // RESTAURANT WEEK
  // ============================================================================
  {
    title: "NYC Winter Restaurant Week 2026",
    description: "Prix-fixe dining at 600+ restaurants. $30, $45, or $60 for 2-3 course meals. Reserve early for popular spots!",
    category: "food",
    startsAt: new Date("2026-01-20T00:00:00"),
    endsAt: new Date("2026-02-12T23:59:00"),
    venue: "Citywide",
    neighborhood: null,
  },
  {
    title: "NYC Summer Restaurant Week 2026",
    description: "Summer edition of NYC Restaurant Week. Prix-fixe menus at hundreds of restaurants citywide.",
    category: "food",
    startsAt: new Date("2026-07-15T00:00:00"),
    endsAt: new Date("2026-08-09T23:59:00"),
    venue: "Citywide",
    neighborhood: null,
  },

  // ============================================================================
  // FREE MUSEUM DAYS & SCHEDULES
  // ============================================================================
  {
    title: "MoMA PS1 Now Free for Everyone",
    description: "As of January 1, 2026, MoMA PS1 in Long Island City is free for all visitors. Contemporary art in a historic building.",
    category: "culture",
    startsAt: new Date("2026-01-01T12:00:00"),
    venue: "MoMA PS1",
    neighborhood: "Long Island City, Queens",
  },
  {
    title: "Brooklyn Museum First Saturday",
    description: "Free admission 5-11pm with live music, dance parties, art activities, and gallery access. Monthly through 2026.",
    category: "culture",
    startsAt: new Date("2026-02-07T17:00:00"),
    endsAt: new Date("2026-02-07T23:00:00"),
    venue: "Brooklyn Museum",
    neighborhood: "Prospect Heights, Brooklyn",
  },

  // ============================================================================
  // SEASONAL - BEACH & POOL
  // ============================================================================
  {
    title: "NYC Beach Season Opens",
    description: "NYC public beaches open for swimming with lifeguards on duty 10am-6pm daily. Coney Island, Rockaway, and more.",
    category: "seasonal",
    startsAt: new Date("2026-05-23T10:00:00"),
    venue: "All NYC Public Beaches",
    neighborhood: null,
  },
  {
    title: "NYC Beach Season Ends",
    description: "Final day of NYC beach season. Lifeguards on duty until 6pm. Swimming prohibited after today.",
    category: "seasonal",
    startsAt: new Date("2026-09-13T10:00:00"),
    venue: "All NYC Public Beaches",
    neighborhood: null,
  },
  {
    title: "NYC Outdoor Pool Season Opens",
    description: "NYC Parks outdoor pools open for the summer! Free admission, open 11am-7pm daily with break 3-4pm.",
    category: "seasonal",
    startsAt: new Date("2026-06-27T11:00:00"),
    venue: "All NYC Outdoor Pools",
    neighborhood: null,
  },
  {
    title: "NYC Outdoor Pool Season Ends",
    description: "Last day of NYC outdoor pool season. Indoor pools remain open year-round.",
    category: "seasonal",
    startsAt: new Date("2026-09-07T11:00:00"),
    venue: "All NYC Outdoor Pools",
    neighborhood: null,
  },

  // ============================================================================
  // OUTDOOR DINING
  // ============================================================================
  {
    title: "NYC Roadway Dining Season Opens",
    description: "Outdoor roadway dining returns April 1. Restaurants can set up curbside seating through November 29.",
    category: "seasonal",
    startsAt: new Date("2026-04-01T00:00:00"),
    venue: "Citywide",
    neighborhood: null,
  },
  {
    title: "NYC Roadway Dining Season Ends",
    description: "Last day for roadway outdoor dining. All roadway cafes must be removed by November 30.",
    category: "seasonal",
    startsAt: new Date("2026-11-29T23:59:00"),
    venue: "Citywide",
    neighborhood: null,
  },

  // ============================================================================
  // FARMERS MARKETS
  // ============================================================================
  {
    title: "Union Square Greenmarket - Year Round",
    description: "The famous Union Square Greenmarket operates year-round! Mon, Wed, Fri, Sat 8am-6pm with 140+ vendors.",
    category: "local",
    startsAt: new Date("2026-01-01T08:00:00"),
    venue: "Union Square",
    neighborhood: "Union Square, Manhattan",
  },

  // ============================================================================
  // OPEN STREETS & SUMMER STREETS
  // ============================================================================
  {
    title: "Open Streets Application Deadline",
    description: "Deadline to apply for 2026 Open Streets and school-based Open Streets starting summer 2026.",
    category: "civic",
    startsAt: new Date("2026-01-31T23:59:00"),
    venue: null,
    neighborhood: null,
  },
  {
    title: "Summer Streets 2026 - Manhattan",
    description: "Park Avenue closed to cars 7am-3pm. Walk, bike, or play on 7 miles of car-free streets from Brooklyn Bridge to Central Park.",
    category: "seasonal",
    startsAt: new Date("2026-08-01T07:00:00"),
    endsAt: new Date("2026-08-01T15:00:00"),
    venue: "Park Avenue & Connecting Streets",
    neighborhood: "Manhattan",
  },

  // ============================================================================
  // PERMIT RENEWALS
  // ============================================================================
  {
    title: "NYCHA Parking Permit Renewal Opens",
    description: "Early renewal for NYCHA parking permits for 2026-2027 season begins. Renew online at nychaparking.com.",
    category: "civic",
    startsAt: new Date("2026-02-16T00:00:00"),
    venue: null,
    neighborhood: null,
  },
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log(`
================================================================================
  NYC Civic & Practical Events 2026 - Seed Script
================================================================================
  Events to seed: ${civicEvents.length}
  Categories: civic, transit, seasonal, food, culture, local
================================================================================
`);

  let created = 0;
  let skipped = 0;
  let analyzed = 0;
  let errors = 0;

  for (const event of civicEvents) {
    try {
      // Check if event already exists
      const existing = await prisma.cityEvent.findFirst({
        where: { title: event.title },
      });

      if (existing) {
        console.log(`  [SKIP] ${event.title} (already exists)`);
        skipped++;
        continue;
      }

      // Analyze with Haiku for optimal alert timing
      console.log(`  [ANALYZE] ${event.title}...`);
      const analysis: HaikuEventAnalysis = await analyzeEventWithHaiku({
        title: event.title,
        description: event.description,
        category: event.category,
        eventDate: event.startsAt,
        venue: event.venue,
        neighborhood: event.neighborhood,
      });
      analyzed++;

      // Create the event
      await prisma.cityEvent.create({
        data: {
          title: event.title,
          description: event.description,
          category: event.category,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          venue: event.venue,
          neighborhood: event.neighborhood,
          status: "published",
          editorNotes: JSON.stringify({ haikuAnalysis: analysis }),
          sourceType: "haiku-curator",
          sourceName: "CityPing Civic Events 2026",
        },
      });
      created++;

      console.log(`  [CREATED] ${event.title}`);
      console.log(`            Alert days: [${analysis.alertDays.join(", ")}]`);
      console.log(`            Importance: ${analysis.importanceScore}/10`);
      if (analysis.insiderTip) {
        console.log(`            Tip: ${analysis.insiderTip}`);
      }
      console.log("");

      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (error) {
      console.error(`  [ERROR] ${event.title}:`, error);
      errors++;
    }
  }

  console.log(`
================================================================================
  Seeding Complete
================================================================================
  Created:  ${created}
  Skipped:  ${skipped}
  Analyzed: ${analyzed}
  Errors:   ${errors}
================================================================================

  Next steps:
  - View events in the database: SELECT * FROM "CityEvent" WHERE "sourceType" = 'haiku-curator';
  - Test email digest: npx tsx scripts/demo-v2-digest.ts <your-email>
`);
}

// ============================================================================
// ENTRY POINT
// ============================================================================

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
