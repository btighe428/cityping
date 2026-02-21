#!/usr/bin/env npx tsx
// scripts/seed-events-sports-entertainment.ts
/**
 * Sports & Entertainment Events Seeder for 2026
 *
 * Seeds the CityEvent database with major NYC sports and entertainment events for 2026.
 * Uses the Haiku Events Curator for intelligent alert timing analysis.
 *
 * Categories covered:
 * - Major sports events (NYC Marathon, US Open, team openers)
 * - Concert series (SummerStage, Celebrate Brooklyn)
 * - Comedy festivals
 * - Museum exhibitions
 * - Broadway openings
 * - Film festivals
 *
 * Usage:
 *   npx tsx scripts/seed-events-sports-entertainment.ts
 *
 * @module scripts/seed-events-sports-entertainment
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { analyzeEventWithHaiku } from "../src/lib/premium/haiku-events-curator";

const prisma = new PrismaClient();

// ============================================================================
// EVENT DATA - Sports & Entertainment 2026
// ============================================================================

const sportsEntertainmentEvents = [
  // ==================== MAJOR SPORTS EVENTS ====================
  {
    title: "TCS New York City Marathon",
    description:
      "World's largest marathon with 50,000+ runners through all five boroughs. Major road closures citywide. Finish line in Central Park.",
    category: "sports" as const,
    startsAt: new Date("2026-11-01T09:00:00"),
    venue: "Fort Wadsworth to Central Park",
    neighborhood: "Citywide",
  },
  {
    title: "NYC Half Marathon",
    description:
      "13.1-mile race through Manhattan with major road closures from Central Park to South Street Seaport.",
    category: "sports" as const,
    startsAt: new Date("2026-03-15T07:00:00"),
    venue: "Central Park to South Street Seaport",
    neighborhood: "Manhattan",
  },
  {
    title: "US Open Tennis Championship",
    description:
      "Tennis Grand Slam tournament at the USTA Billie Jean King National Tennis Center. Two weeks of world-class tennis.",
    category: "sports" as const,
    startsAt: new Date("2026-08-31T10:00:00"),
    venue: "USTA Billie Jean King National Tennis Center",
    neighborhood: "Flushing Meadows",
  },
  {
    title: "New York Mets Home Opener",
    description:
      "Mets kick off home season against the Pittsburgh Pirates at Citi Field. Opening Day festivities and ceremony.",
    category: "sports" as const,
    startsAt: new Date("2026-03-26T13:00:00"),
    venue: "Citi Field",
    neighborhood: "Flushing",
  },
  {
    title: "New York Yankees Home Opener",
    description:
      "Yankees open home season against the Miami Marlins at Yankee Stadium. Expect sellout crowds and traffic.",
    category: "sports" as const,
    startsAt: new Date("2026-04-03T13:00:00"),
    venue: "Yankee Stadium",
    neighborhood: "South Bronx",
  },
  {
    title: "FIFA World Cup 2026 - Brazil vs Morocco",
    description:
      "World Cup Group C match at MetLife Stadium. First of 8 World Cup matches in NY/NJ area. 82,500 capacity.",
    category: "sports" as const,
    startsAt: new Date("2026-06-13T18:00:00"),
    venue: "MetLife Stadium",
    neighborhood: "East Rutherford",
  },
  {
    title: "FIFA World Cup 2026 - France vs Senegal",
    description:
      "World Cup Group I match featuring France at MetLife Stadium. Expect massive crowds and transit impact.",
    category: "sports" as const,
    startsAt: new Date("2026-06-16T15:00:00"),
    venue: "MetLife Stadium",
    neighborhood: "East Rutherford",
  },
  {
    title: "FIFA World Cup 2026 - England vs Panama",
    description:
      "World Cup Group L match with England at MetLife Stadium. Huge British fan presence expected.",
    category: "sports" as const,
    startsAt: new Date("2026-06-27T17:00:00"),
    venue: "MetLife Stadium",
    neighborhood: "East Rutherford",
  },
  {
    title: "FIFA World Cup 2026 - THE FINAL",
    description:
      "The FIFA World Cup Final at MetLife Stadium. The biggest sporting event in NYC history. 1.2M fans expected in metro area.",
    category: "sports" as const,
    startsAt: new Date("2026-07-19T15:00:00"),
    venue: "MetLife Stadium",
    neighborhood: "East Rutherford",
  },
  {
    title: "New York Knicks Season Opener",
    description:
      "NBA season tips off at Madison Square Garden. First home game of the 2026-27 season.",
    category: "sports" as const,
    startsAt: new Date("2026-10-22T19:30:00"),
    venue: "Madison Square Garden",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "New York Rangers Season Opener",
    description:
      "NHL season begins at The Garden. Home opener for the 2026-27 Rangers campaign.",
    category: "sports" as const,
    startsAt: new Date("2026-10-15T19:00:00"),
    venue: "Madison Square Garden",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "New York Liberty WNBA Season Opener",
    description:
      "WNBA season tips off for the defending champions. Basketball returns to Barclays Center.",
    category: "sports" as const,
    startsAt: new Date("2026-05-16T19:00:00"),
    venue: "Barclays Center",
    neighborhood: "Downtown Brooklyn",
  },

  // ==================== CONCERT SERIES ====================
  {
    title: "SummerStage 40th Anniversary Opening Concert",
    description:
      "Capital One City Parks Foundation SummerStage celebrates 40 years with special opening concert in Central Park. Free admission.",
    category: "culture" as const,
    startsAt: new Date("2026-06-06T18:00:00"),
    venue: "Rumsey Playfield, Central Park",
    neighborhood: "Upper East Side",
  },
  {
    title: "SummerStage: The Martinez Brothers",
    description:
      "The Bronx-born DJ duo returns home for SummerStage's 40th anniversary celebration. Electronic music in Central Park.",
    category: "culture" as const,
    startsAt: new Date("2026-06-13T18:00:00"),
    venue: "Rumsey Playfield, Central Park",
    neighborhood: "Upper East Side",
  },
  {
    title: "SummerStage: Dreamland Pride - Purple Disco Machine",
    description:
      "Pride celebration at SummerStage featuring Purple Disco Machine. Dance music party in Central Park.",
    category: "culture" as const,
    startsAt: new Date("2026-06-28T15:00:00"),
    venue: "Rumsey Playfield, Central Park",
    neighborhood: "Upper East Side",
  },
  {
    title: "SummerStage: Blues Traveler & Gin Blossoms",
    description:
      "90s rock legends take over Central Park. Blues Traveler and Gin Blossoms with Spin Doctors.",
    category: "culture" as const,
    startsAt: new Date("2026-08-15T18:00:00"),
    venue: "Rumsey Playfield, Central Park",
    neighborhood: "Upper East Side",
  },
  {
    title: "Celebrate Brooklyn Opening Night",
    description:
      "Annual summer concert series kicks off at the Lena Horne Bandshell in Prospect Park. Mix of free and benefit shows.",
    category: "culture" as const,
    startsAt: new Date("2026-06-04T19:00:00"),
    venue: "Lena Horne Bandshell, Prospect Park",
    neighborhood: "Prospect Heights",
  },

  // ==================== COMEDY FESTIVALS ====================
  {
    title: "New York Comedy Festival",
    description:
      "10 days, 5 boroughs, 100+ shows, 200+ comedians. Major venues including Beacon Theatre, Carnegie Hall, and MSG.",
    category: "culture" as const,
    startsAt: new Date("2026-11-06T19:00:00"),
    venue: "Multiple Venues Citywide",
    neighborhood: "Citywide",
  },
  {
    title: "New York Comedy Film Festival",
    description:
      "NYC's first film festival dedicated entirely to comedy. Features, shorts, docs, and premieres at Asylum NYC.",
    category: "culture" as const,
    startsAt: new Date("2026-02-15T19:00:00"),
    venue: "Asylum NYC",
    neighborhood: "Flatiron",
  },
  {
    title: "YALL Comedy Fest",
    description:
      "Comedy festival celebrating humor that changes the world. Social justice meets stand-up at Asylum NYC.",
    category: "culture" as const,
    startsAt: new Date("2026-04-08T19:00:00"),
    venue: "Asylum NYC",
    neighborhood: "Flatiron",
  },
  {
    title: "New York Queer Comedy Festival",
    description:
      "World's biggest Queer Comedy Festival. Multiple nights across NYC venues celebrating LGBTQ+ comedians.",
    category: "culture" as const,
    startsAt: new Date("2026-02-11T20:00:00"),
    venue: "Multiple Venues",
    neighborhood: "Greenwich Village",
  },

  // ==================== MUSEUM EXHIBITIONS ====================
  {
    title: "Marcel Duchamp Retrospective Opens at MoMA",
    description:
      "First US retrospective since 1973 featuring 300 works including 'Nude Descending a Staircase.' Major art event.",
    category: "culture" as const,
    startsAt: new Date("2026-04-12T10:30:00"),
    venue: "Museum of Modern Art",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "Frida Kahlo & Diego Rivera at MoMA",
    description:
      "Exhibition surveying Kahlo's marriage to Diego Rivera. Opens alongside new opera at Met Opera in May.",
    category: "culture" as const,
    startsAt: new Date("2026-03-15T10:30:00"),
    venue: "Museum of Modern Art",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "Greater New York 2026 at MoMA PS1",
    description:
      "Signature survey of NYC artists returns for 6th edition, celebrating PS1's 50th anniversary. Site-specific installations.",
    category: "culture" as const,
    startsAt: new Date("2026-04-16T12:00:00"),
    venue: "MoMA PS1",
    neighborhood: "Long Island City",
  },
  {
    title: "Carol Bove Exhibition Opens at Guggenheim",
    description:
      "Largest museum survey of sculptor Carol Bove featuring new works made for the iconic rotunda.",
    category: "culture" as const,
    startsAt: new Date("2026-03-05T10:00:00"),
    venue: "Solomon R. Guggenheim Museum",
    neighborhood: "Upper East Side",
  },
  {
    title: "Raphael: Sublime Poetry at The Met",
    description:
      "Gathering of 200+ Raphael works at The Metropolitan Museum of Art. Once-in-a-lifetime exhibition.",
    category: "culture" as const,
    startsAt: new Date("2026-03-29T10:00:00"),
    venue: "The Metropolitan Museum of Art",
    neighborhood: "Upper East Side",
  },
  {
    title: "Whitney Biennial 2026 Opens",
    description:
      "Premier survey of contemporary American art returns. The most anticipated art event of the year.",
    category: "culture" as const,
    startsAt: new Date("2026-03-08T10:30:00"),
    venue: "Whitney Museum of American Art",
    neighborhood: "Meatpacking District",
  },

  // ==================== BROADWAY OPENINGS ====================
  {
    title: "Death of a Salesman Opens on Broadway",
    description:
      "Nathan Lane and Laurie Metcalf star in Arthur Miller's masterpiece. Directed by Joe Mantello at Winter Garden.",
    category: "culture" as const,
    startsAt: new Date("2026-04-09T19:00:00"),
    venue: "Winter Garden Theatre",
    neighborhood: "Times Square",
  },
  {
    title: "Dog Day Afternoon Opens on Broadway",
    description:
      "Jon Bernthal and Ebon Moss-Bachrach star in Stephen Adly Guirgis' new play at August Wilson Theatre.",
    category: "culture" as const,
    startsAt: new Date("2026-03-30T19:00:00"),
    venue: "August Wilson Theatre",
    neighborhood: "Times Square",
  },
  {
    title: "The Rocky Horror Show Opens on Broadway",
    description:
      "Revival of the legendary rock musical starring Luke Evans, Rachel Dratch, and Stephanie Hsu at Studio 54.",
    category: "culture" as const,
    startsAt: new Date("2026-04-23T20:00:00"),
    venue: "Studio 54",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "CATS: The Jellicle Ball Opens on Broadway",
    description:
      "Revolutionary revival reimagines Andrew Lloyd Webber's musical as a drag ballroom competition.",
    category: "culture" as const,
    startsAt: new Date("2026-04-07T19:00:00"),
    venue: "Broadhurst Theatre",
    neighborhood: "Times Square",
  },
  {
    title: "Proof Opens on Broadway",
    description:
      "Ayo Edebiri and Don Cheadle make Broadway debuts in David Auburn's Tony and Pulitzer Prize-winning play.",
    category: "culture" as const,
    startsAt: new Date("2026-04-16T19:00:00"),
    venue: "Booth Theatre",
    neighborhood: "Times Square",
  },
  {
    title: "Dreamgirls Returns to Broadway",
    description:
      "The electrifying musical returns to Broadway for a major revival. Theatre and dates TBA for Fall 2026.",
    category: "culture" as const,
    startsAt: new Date("2026-10-15T19:00:00"),
    venue: "Broadway Theatre TBA",
    neighborhood: "Times Square",
  },

  // ==================== FILM FESTIVALS ====================
  {
    title: "Tribeca Festival 2026 Opens",
    description:
      "25th anniversary of the Tribeca Festival. Two weeks of film premieres, talks, and events across lower Manhattan.",
    category: "culture" as const,
    startsAt: new Date("2026-06-03T18:00:00"),
    venue: "Multiple Venues",
    neighborhood: "Tribeca",
  },
  {
    title: "64th New York Film Festival Opens",
    description:
      "Film at Lincoln Center's prestigious festival showcasing essential cinema from around the world.",
    category: "culture" as const,
    startsAt: new Date("2026-09-25T18:00:00"),
    venue: "Film at Lincoln Center",
    neighborhood: "Lincoln Square",
  },
  {
    title: "New York Jewish Film Festival",
    description:
      "Two weeks of Jewish cinema at Film at Lincoln Center and The Jewish Museum.",
    category: "culture" as const,
    startsAt: new Date("2026-01-14T19:00:00"),
    venue: "Film at Lincoln Center",
    neighborhood: "Lincoln Square",
  },

  // ==================== PRIDE ====================
  {
    title: "NYC Pride March 2026",
    description:
      "World's largest LGBTQ+ pride parade. Theme: 'For All of Us.' Route from 26th & 5th Ave to Christopher Street.",
    category: "culture" as const,
    startsAt: new Date("2026-06-28T11:00:00"),
    venue: "5th Avenue & Christopher Street",
    neighborhood: "Greenwich Village",
  },
  {
    title: "PrideFest 2026",
    description:
      "Free street festival in Greenwich Village with vendors, entertainment, and activities celebrating equality.",
    category: "culture" as const,
    startsAt: new Date("2026-06-28T11:00:00"),
    venue: "Greenwich Village Streets",
    neighborhood: "Greenwich Village",
  },
  {
    title: "Youth Pride 2026",
    description:
      "Youth Pride celebration at South Street Seaport. Safe space for LGBTQ+ youth and allies.",
    category: "culture" as const,
    startsAt: new Date("2026-06-27T12:00:00"),
    venue: "Piers 16 & 17, South Street Seaport",
    neighborhood: "Financial District",
  },
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log(`
================================================================================
    SPORTS & ENTERTAINMENT EVENTS SEEDER - NYC 2026
================================================================================

  Loading ${sportsEntertainmentEvents.length} events...
`);

  let created = 0;
  let skipped = 0;
  let analyzed = 0;
  let errors = 0;

  for (const event of sportsEntertainmentEvents) {
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

      // Analyze with Haiku for intelligent alert timing
      console.log(`  [ANALYZE] ${event.title}...`);
      const analysis = await analyzeEventWithHaiku({
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
          venue: event.venue,
          neighborhood: event.neighborhood,
          status: "published",
          editorNotes: JSON.stringify({ haikuAnalysis: analysis }),
          sourceType: "haiku-curator",
          sourceName: "CityPing Sports & Entertainment Curator",
        },
      });

      console.log(
        `  [CREATE] ${event.title} -> alertDays: [${analysis.alertDays.join(", ")}]`
      );
      created++;

      // Rate limit to avoid overwhelming Haiku API
      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`  [ERROR] ${event.title}:`, error);
      errors++;
    }
  }

  // Summary
  console.log(`
================================================================================
    SEEDING COMPLETE
================================================================================

  Created:  ${created}
  Skipped:  ${skipped} (already exist)
  Analyzed: ${analyzed} (Haiku calls)
  Errors:   ${errors}

  Event Categories Seeded:
  - Major sports events (Marathon, US Open, team openers, FIFA World Cup)
  - Concert series (SummerStage 40th Anniversary, Celebrate Brooklyn)
  - Comedy festivals (NY Comedy Festival, YALL Comedy Fest)
  - Museum exhibitions (MoMA, Guggenheim, Met, Whitney)
  - Broadway openings (Death of a Salesman, Rocky Horror, CATS)
  - Film festivals (Tribeca, NYFF, Jewish Film Festival)
  - Pride events (March, PrideFest, Youth Pride)

  Next Steps:
  - Run 'npx tsx scripts/demo-v2-digest.ts <email>' to preview in email
  - Check events in database: SELECT * FROM city_events WHERE source_name = 'CityPing Sports & Entertainment Curator';
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
