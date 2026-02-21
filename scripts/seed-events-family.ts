#!/usr/bin/env npx tsx
/**
 * NYC Family & Kids Events Seed Script for 2026
 *
 * Comprehensive collection of family-friendly events across:
 * - School calendar (first day, breaks, graduation)
 * - Kid-friendly museum events
 * - Children's theater and shows
 * - Zoo events (Bronx Zoo, Central Park Zoo)
 * - Aquarium events
 * - Science fairs and STEM events
 * - Kid-friendly festivals
 * - Playground openings
 * - Summer camp registration deadlines
 * - Family-friendly concerts and performances
 *
 * Usage:
 *   npx tsx scripts/seed-events-family.ts
 *   npx tsx scripts/seed-events-family.ts --dry-run
 *
 * @module scripts/seed-events-family
 */

import "dotenv/config";
import { PrismaClient, EventCategory } from "@prisma/client";

const prisma = new PrismaClient();

interface FamilyEvent {
  title: string;
  description: string;
  category: EventCategory;
  startsAt: Date;
  endsAt?: Date;
  deadlineAt?: Date;
  venue: string;
  neighborhood: string;
  borough?: string;
}

const familyEvents: FamilyEvent[] = [
  // ============================================================================
  // SCHOOL CALENDAR EVENTS
  // ============================================================================

  {
    title: "NYC Public Schools 2025-2026 School Year Begins",
    description:
      "First day of the 2025-2026 school year for all NYC public schools. Students return to classrooms across all five boroughs.",
    category: "civic" as const,
    startsAt: new Date("2025-09-04"),
    venue: "Schools throughout NYC",
    neighborhood: "All",
    borough: "All",
  },

  {
    title: "Spring Break Recess Week",
    description:
      "NYC Public Schools spring break. Schools closed. Perfect time for family trips or local activities.",
    category: "local" as const,
    startsAt: new Date("2026-04-02"),
    endsAt: new Date("2026-04-10"),
    venue: "Schools throughout NYC",
    neighborhood: "All",
    borough: "All",
  },

  {
    title: "NYC Schools Summer Break Begins",
    description:
      "Last day of the 2025-2026 school year. Summer vacation officially begins for all NYC public school students.",
    category: "civic" as const,
    startsAt: new Date("2026-06-26"),
    venue: "Schools throughout NYC",
    neighborhood: "All",
    borough: "All",
  },

  // ============================================================================
  // MUSEUM & CULTURAL EVENTS
  // ============================================================================

  {
    title: "Children's Museum of Manhattan Spring Programs",
    description:
      "Interactive learning and play for ages 0-10. Features hands-on art, music, water play, and literacy workshops on the Upper West Side.",
    category: "culture" as const,
    startsAt: new Date("2026-03-01"),
    endsAt: new Date("2026-05-31"),
    venue: "Children's Museum of Manhattan",
    neighborhood: "Upper West Side",
    borough: "Manhattan",
  },

  {
    title: "American Museum of Natural History Discovery Room",
    description:
      "Hands-on discovery room designed for ages 4-12. Open daily with interactive exhibits about nature, dinosaurs, and the world around us.",
    category: "culture" as const,
    startsAt: new Date("2026-01-15"),
    endsAt: new Date("2026-12-31"),
    venue: "American Museum of Natural History",
    neighborhood: "Upper West Side",
    borough: "Manhattan",
  },

  {
    title: "Children's Museum of the Arts Free Community Art Making",
    description:
      "100% free public art programs. Kids create, curate, and exhibit their own artwork across five boroughs.",
    category: "culture" as const,
    startsAt: new Date("2026-02-01"),
    endsAt: new Date("2026-12-31"),
    venue: "Children's Museum of the Arts",
    neighborhood: "SoHo",
    borough: "Manhattan",
  },

  // ============================================================================
  // THEATER & BROADWAY SHOWS
  // ============================================================================

  {
    title: "Kids' Night on Broadway NYC",
    description:
      "Kids and teens 18 and under attend a participating Broadway show FREE when accompanied by a full-paying adult. Plus dining deals at 16 Theater District restaurants.",
    category: "culture" as const,
    startsAt: new Date("2026-02-24"),
    endsAt: new Date("2026-03-01"),
    venue: "Broadway Theater District",
    neighborhood: "Times Square",
    borough: "Manhattan",
  },

  {
    title: "The Lion King Broadway",
    description:
      "The iconic Disney musical recommended for ages 6 and up. Experience the Pride Lands on stage in this spectacular production.",
    category: "culture" as const,
    startsAt: new Date("2026-01-15"),
    endsAt: new Date("2026-12-31"),
    venue: "Minskoff Theatre",
    neighborhood: "Times Square",
    borough: "Manhattan",
  },

  {
    title: "Aladdin Broadway",
    description:
      "A Whole New World awaits! Disney's Aladdin is perfect for families with kids ages 6+. Full of magic, music, and adventure.",
    category: "culture" as const,
    startsAt: new Date("2026-01-15"),
    endsAt: new Date("2026-12-31"),
    venue: "New Amsterdam Theatre",
    neighborhood: "Times Square",
    borough: "Manhattan",
  },

  {
    title: "Blue Man Group Theater Show",
    description:
      "Combines theater, art, and technology into a fascinatingly original performance. Recommended for ages 8 and up.",
    category: "culture" as const,
    startsAt: new Date("2026-02-01"),
    endsAt: new Date("2026-12-31"),
    venue: "Astor Place Theatre",
    neighborhood: "East Village",
    borough: "Manhattan",
  },

  {
    title: "Gazillion Bubble Show",
    description:
      "Mind-blowing bubble magic, spectacular laser light effects, and the chance to be INSIDE a bubble yourself!",
    category: "culture" as const,
    startsAt: new Date("2026-02-15"),
    endsAt: new Date("2026-12-31"),
    venue: "Theater District Venue",
    neighborhood: "Times Square",
    borough: "Manhattan",
  },

  {
    title: "New York City Children's Theater Winter Saturday Program",
    description:
      "Children ages 6-14 present songs, scenes, and dances. Family-friendly performances every Saturday at BCT Studios.",
    category: "culture" as const,
    startsAt: new Date("2026-03-21"),
    startsAt: new Date("2026-03-21"),
    venue: "BCT Studios",
    neighborhood: "Brooklyn",
    borough: "Brooklyn",
  },

  // ============================================================================
  // ZOO EVENTS
  // ============================================================================

  {
    title: "Bronx Zoo Summer Camp Sessions",
    description:
      "Week-long summer camp with up-close animal encounters, hands-on investigations, and zoo exploration. June through early September.",
    category: "local" as const,
    startsAt: new Date("2026-06-15"),
    endsAt: new Date("2026-09-04"),
    venue: "Bronx Zoo",
    neighborhood: "Bronx",
    borough: "Bronx",
  },

  {
    title: "Bronx Zoo Run for the Wild 5K",
    description:
      "Annual charity run/walk through the Bronx Zoo. 5K race at 8am, 3K Family Fun Run/Walk at 9am. Support wildlife conservation.",
    category: "civic" as const,
    startsAt: new Date("2026-05-10"),
    venue: "Bronx Zoo",
    neighborhood: "Bronx",
    borough: "Bronx",
  },

  {
    title: "Central Park Zoo Summer Camp",
    description:
      "Week-long summer camp starting June 1st with up-close animal encounters, art experiences, hands-on investigations, and zoo exploration.",
    category: "local" as const,
    startsAt: new Date("2026-06-01"),
    endsAt: new Date("2026-08-31"),
    venue: "Central Park Zoo",
    neighborhood: "Midtown",
    borough: "Manhattan",
  },

  // ============================================================================
  // AQUARIUM EVENTS
  // ============================================================================

  {
    title: "New York Aquarium Summer Camp - Ages 6-8",
    description:
      "Drop-off camp for kids entering 1st-2nd grade. Sessions run June 29-July 3, July 13-17, July 27-31, and Aug 24-28. 9am-3pm daily.",
    category: "local" as const,
    startsAt: new Date("2026-06-29"),
    venue: "New York Aquarium",
    neighborhood: "Coney Island",
    borough: "Brooklyn",
  },

  {
    title: "DramA-quarium Performance Camp",
    description:
      "Kids create ocean-inspired performances through acting, storytelling, and hands-on eco-activities. Spotlight marine conservation.",
    category: "culture" as const,
    startsAt: new Date("2026-07-01"),
    endsAt: new Date("2026-07-31"),
    venue: "New York Aquarium",
    neighborhood: "Coney Island",
    borough: "Brooklyn",
  },

  {
    title: "PlayQuarium Touch Pool Experience",
    description:
      "Interactive touch pool where kids meet local marine invertebrates like crabs, marine snails, and horseshoe crabs. Year-round program.",
    category: "culture" as const,
    startsAt: new Date("2026-01-01"),
    endsAt: new Date("2026-12-31"),
    venue: "New York Aquarium",
    neighborhood: "Coney Island",
    borough: "Brooklyn",
  },

  // ============================================================================
  // SCIENCE FAIRS & STEM EVENTS
  // ============================================================================

  {
    title: "NYC CS Fair - Computer Science Showcase",
    description:
      "Nearly 2,000 high school students showcase computer science projects. Features cutting-edge tech and coding demonstrations.",
    category: "civic" as const,
    startsAt: new Date("2026-04-21"),
    venue: "168th Street Armory",
    neighborhood: "Washington Heights",
    borough: "Manhattan",
  },

  {
    title: "NYSSEF Science & Engineering Fair",
    description:
      "New York State Science and Engineering Fair with Round 2 in-person judging at New York Hall of Science in Queens.",
    category: "civic" as const,
    startsAt: new Date("2026-03-30"),
    venue: "New York Hall of Science",
    neighborhood: "Flushing Meadows",
    borough: "Queens",
  },

  {
    title: "PS 20 The Clinton Hill School Science Fair",
    description:
      "Annual science fair showcasing innovative student projects and experiments. Friday, March 27, 2026.",
    category: "local" as const,
    startsAt: new Date("2026-03-27"),
    venue: "PS 20 The Clinton Hill School",
    neighborhood: "Clinton Hill",
    borough: "Brooklyn",
  },

  {
    title: "Intrepid Museum Kids Week STEAM Festival",
    description:
      "Full week of STEAM-focused activities for kids at the Intrepid Sea, Air & Space Museum. Hands-on learning and exploration.",
    category: "culture" as const,
    startsAt: new Date("2026-02-14"),
    endsAt: new Date("2026-02-21"),
    venue: "Intrepid Sea, Air & Space Museum",
    neighborhood: "Midtown West",
    borough: "Manhattan",
  },

  // ============================================================================
  // FESTIVALS & SEASONAL EVENTS
  // ============================================================================

  {
    title: "Lunar New Year Parade & Cultural Festival",
    description:
      "The 28th annual Firecracker Ceremony and Cultural Festival celebrates Lunar New Year with parades, performances, and cultural activities.",
    category: "culture" as const,
    startsAt: new Date("2026-03-01"),
    endsAt: new Date("2026-03-08"),
    venue: "Sara D. Roosevelt Park & Chinatown",
    neighborhood: "Chinatown",
    borough: "Manhattan",
  },

  {
    title: "NYC Saint Patrick's Day Parade",
    description:
      "The oldest and largest St. Patrick's Day Parade in the world! Spectacular bagpipers, magnificent floats, and marching bands.",
    category: "culture" as const,
    startsAt: new Date("2026-03-17"),
    venue: "Fifth Avenue",
    neighborhood: "Midtown",
    borough: "Manhattan",
  },

  {
    title: "Macy's Flower Show Spring",
    description:
      "Thousands of stunning flowers and lush plants transform Herald Square. One of NYC's most colorful springtime destinations.",
    category: "culture" as const,
    startsAt: new Date("2026-03-15"),
    endsAt: new Date("2026-03-29"),
    venue: "Macy's Herald Square",
    neighborhood: "Herald Square",
    borough: "Manhattan",
  },

  {
    title: "CAMPTOPIA Summer Camp Fair Brooklyn",
    description:
      "Ultimate summer camp experience fair with 30+ free kids' activities: STEM, robotics, arts, crafts, soccer, music, and animation.",
    category: "local" as const,
    startsAt: new Date("2026-04-15"),
    endsAt: new Date("2026-04-16"),
    venue: "Brooklyn Event Venue",
    neighborhood: "Downtown Brooklyn",
    borough: "Brooklyn",
  },

  // ============================================================================
  // MUSIC & PERFORMANCE EVENTS
  // ============================================================================

  {
    title: "Lincoln Center Kids & Family Programs Spring",
    description:
      "Lively music concerts, hands-on workshops, sensory-friendly performances, and outdoor film series throughout spring.",
    category: "culture" as const,
    startsAt: new Date("2026-03-01"),
    endsAt: new Date("2026-05-31"),
    venue: "Lincoln Center",
    neighborhood: "Upper West Side",
    borough: "Manhattan",
  },

  {
    title: "New York Philharmonic Young People's Concerts",
    description:
      "Concerts designed for ages 6+ and Very Young People's Concerts for ages 3-5. Learn about music through live performances.",
    category: "culture" as const,
    startsAt: new Date("2026-02-01"),
    endsAt: new Date("2026-12-31"),
    venue: "David Geffen Hall",
    neighborhood: "Upper West Side",
    borough: "Manhattan",
  },

  {
    title: "NYC Ballet for Kids - Family Matinees",
    description:
      "Interactive presentations and excerpts of iconic ballets for kids ages 5+. On select Saturdays with pre-show activities.",
    category: "culture" as const,
    startsAt: new Date("2026-03-01"),
    endsAt: new Date("2026-12-31"),
    venue: "David H. Koch Theater",
    neighborhood: "Upper West Side",
    borough: "Manhattan",
  },

  {
    title: "Little Orchestra Society Lolli-Pops",
    description:
      "Music education shows for kids ages 3-5 featuring characters like Buzz the Bee. Learn about music and orchestral instruments.",
    category: "culture" as const,
    startsAt: new Date("2026-03-15"),
    endsAt: new Date("2026-11-30"),
    venue: "Various Venues",
    neighborhood: "Manhattan",
    borough: "Manhattan",
  },

  {
    title: "Summer Concert Series - Hans Christian Andersen Storytelling",
    description:
      "Weekly storytelling sessions in Central Park every Saturday from early June through early August, 11am-12pm.",
    category: "local" as const,
    startsAt: new Date("2026-06-05"),
    endsAt: new Date("2026-08-01"),
    venue: "Central Park",
    neighborhood: "Midtown",
    borough: "Manhattan",
  },

  // ============================================================================
  // SUMMER CAMP REGISTRATION DEADLINES
  // ============================================================================

  {
    title: "YMCA Summer Camp Early Bird Registration Deadline",
    description:
      "Early bird deadline for YMCA of Greater New York summer camp programs. Receive 10% discount if you register and pay by this date.",
    category: "local" as const,
    deadlineAt: new Date("2026-04-18"),
    startsAt: new Date("2026-04-01"),
    endsAt: new Date("2026-04-18"),
    venue: "YMCA locations throughout NYC",
    neighborhood: "All",
    borough: "All",
  },

  {
    title: "DEC Summer Camps 2026 Registration Opens",
    description:
      "Online registration opens for DEC's 2026 Summer Camps program. Week-long adventures in conservation education for ages 11-17. Only $350 per child.",
    category: "local" as const,
    startsAt: new Date("2026-03-22"),
    deadlineAt: new Date("2026-06-30"),
    venue: "State Parks throughout NY",
    neighborhood: "Various",
    borough: "All",
  },

  {
    title: "BEAM Discovery Program Math Camp Deadline",
    description:
      "Registration deadline for BEAM's free summer math program for current 6th and 7th graders. Five weeks of intensive math learning.",
    category: "civic" as const,
    deadlineAt: new Date("2026-03-15"),
    startsAt: new Date("2026-03-01"),
    endsAt: new Date("2026-03-15"),
    venue: "BEAM Program Locations",
    neighborhood: "Various",
    borough: "All",
  },
];

// ============================================================================
// Main Seed Function
// ============================================================================

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           NYC Family & Kids Events Seed                      ║
╚══════════════════════════════════════════════════════════════╝

  Total events: ${familyEvents.length}
  Dry run: ${dryRun}
`);

  if (dryRun) {
    console.log("  [DRY RUN] Events to be seeded:\n");
    familyEvents.forEach((event, index) => {
      const date = event.startsAt.toLocaleDateString();
      console.log(`  ${index + 1}. ${event.title}`);
      console.log(`     Date: ${date}`);
      console.log(`     Category: ${event.category}`);
      console.log(`     Venue: ${event.venue}\n`);
    });
    return;
  }

  try {
    console.log("  Seeding family events to database...\n");

    let created = 0;
    let updated = 0;

    for (const event of familyEvents) {
      const upserted = await prisma.cityEvent.upsert({
        where: {
          sourceName_externalId: {
            sourceName: "seed-family-events",
            externalId: event.title,
          },
        },
        create: {
          title: event.title,
          description: event.description,
          category: event.category,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          deadlineAt: event.deadlineAt,
          venue: event.venue,
          neighborhood: event.neighborhood,
          borough: event.borough,
          sourceName: "seed-family-events",
          externalId: event.title,
          status: "published" as const,
        },
        update: {
          description: event.description,
          endsAt: event.endsAt,
          deadlineAt: event.deadlineAt,
        },
      });

      if (upserted.id) {
        created++;
      } else {
        updated++;
      }
    }

    console.log(`  ✅ Seeding complete!`);
    console.log(`  Events created/updated: ${created + updated}`);
  } catch (error) {
    console.error("  ❌ Error seeding events:", error);
    throw error;
  }
}

// ============================================================================
// Entry Point
// ============================================================================

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
