#!/usr/bin/env npx tsx
// scripts/seed-events-parades.ts
/**
 * NYC Parades, Festivals & Major Annual Events 2026 Seed Script
 *
 * Comprehensive database of NYC's biggest parades, street festivals,
 * cultural events, and seasonal celebrations for 2026.
 *
 * Data Sources:
 * - NYC Tourism (nyctourism.com)
 * - NYC.gov Events Calendar
 * - Official parade/festival websites
 * - Event organizer announcements
 *
 * Usage:
 *   npx tsx scripts/seed-events-parades.ts
 *
 * @module scripts/seed-events-parades
 */

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { analyzeEventWithHaiku } from "../src/lib/premium/haiku-events-curator";

// ============================================================================
// TYPES
// ============================================================================

interface ParadeEvent {
  title: string;
  description: string;
  category: "culture" | "sports" | "food" | "civic" | "weather" | "transit" | "seasonal" | "local";
  startsAt: Date;
  venue: string;
  neighborhood: string | null;
}

// ============================================================================
// 2026 NYC PARADES, FESTIVALS & MAJOR ANNUAL EVENTS
// ============================================================================

const NYC_PARADES_FESTIVALS_2026: ParadeEvent[] = [
  // ============================================================================
  // MAJOR PARADES
  // ============================================================================
  {
    title: "NYC Lunar New Year Parade & Festival",
    description: "28th annual parade celebrating the Year of the Fire Horse. Dragon dancers, firecrackers, floats march through Chinatown from Mott St to Grand St.",
    category: "culture",
    startsAt: new Date("2026-03-01T13:00:00"),
    venue: "Mott Street to Forsyth & Grand Streets",
    neighborhood: "Chinatown",
  },
  {
    title: "St. Patrick's Day Parade",
    description: "265th annual parade - world's oldest and largest St. Patrick's Day celebration. 150,000+ marchers on 5th Avenue from 44th to 79th Street.",
    category: "culture",
    startsAt: new Date("2026-03-17T11:00:00"),
    venue: "5th Avenue (44th to 79th Street)",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "Easter Parade and Bonnet Festival",
    description: "130+ year tradition on Fifth Avenue. Participants don elaborate handmade bonnets and period costumes around St. Patrick's Cathedral.",
    category: "culture",
    startsAt: new Date("2026-04-05T10:00:00"),
    venue: "5th Avenue (49th to 57th Street)",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "Greek Independence Day Parade",
    description: "Largest Greek Independence Day parade outside Greece. Celebrating 205th anniversary of Hellenic Revolution and 250th of American Revolution.",
    category: "culture",
    startsAt: new Date("2026-04-26T13:00:00"),
    venue: "5th Avenue (64th to 79th Street)",
    neighborhood: "Upper East Side",
  },
  {
    title: "Brooklyn Memorial Day Parade",
    description: "158th annual parade - oldest continuously run Memorial Day parade in a large US city. 21-gun salute at John Paul Jones Park.",
    category: "civic",
    startsAt: new Date("2026-05-25T11:00:00"),
    venue: "3rd Avenue to John Paul Jones Park",
    neighborhood: "Bay Ridge",
  },
  {
    title: "National Puerto Rican Day Parade",
    description: "69th annual celebration - largest Puerto Rican parade in the US. 35 city blocks of music, dance, and culture. 1M+ spectators.",
    category: "culture",
    startsAt: new Date("2026-06-14T11:00:00"),
    venue: "5th Avenue (44th to 79th Street)",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "Queens Pride Parade",
    description: "33rd annual LGBTQ+ celebration in Jackson Heights. Parade, festival, and community celebration.",
    category: "culture",
    startsAt: new Date("2026-06-07T12:00:00"),
    venue: "37th Avenue",
    neighborhood: "Jackson Heights",
  },
  {
    title: "NYC Pride March",
    description: "World's largest LGBTQ+ civil rights demonstration. Theme: 'For All of Us'. Route: 26th St & 5th Ave to 15th St & 7th Ave.",
    category: "culture",
    startsAt: new Date("2026-06-28T11:00:00"),
    venue: "5th Avenue to Christopher Street to 7th Avenue",
    neighborhood: "Greenwich Village",
  },
  {
    title: "Homecoming of Heroes Ticker Tape Parade",
    description: "Historic tribute honoring Post-9/11 combat veterans, first responders, and their families. Ticker tape parade on Broadway.",
    category: "civic",
    startsAt: new Date("2026-07-06T11:00:00"),
    venue: "Broadway (Canyon of Heroes)",
    neighborhood: "Financial District",
  },
  {
    title: "West Indian American Day Parade",
    description: "Annual Caribbean Carnival celebration drawing 1-3 million. Mas bands, steel drums, and colorful costumes on Eastern Parkway.",
    category: "culture",
    startsAt: new Date("2026-09-07T11:00:00"),
    venue: "Eastern Parkway to Grand Army Plaza",
    neighborhood: "Crown Heights",
  },
  {
    title: "Columbus Day Parade",
    description: "Celebration of Italian American heritage. 35,000 participants march on 5th Avenue with floats, bands, and marines.",
    category: "culture",
    startsAt: new Date("2026-10-12T11:30:00"),
    venue: "5th Avenue (44th to 72nd Street)",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "Village Halloween Parade",
    description: "53rd annual parade - NYC's largest Halloween celebration. 50,000+ costumed marchers, giant puppets, and bands on 6th Avenue.",
    category: "culture",
    startsAt: new Date("2026-10-31T19:00:00"),
    venue: "6th Avenue (Canal Street to 15th Street)",
    neighborhood: "Greenwich Village",
  },
  {
    title: "Veterans Day Parade",
    description: "Largest Veterans Day event in the nation. 20,000+ participants honor military service on Fifth Avenue.",
    category: "civic",
    startsAt: new Date("2026-11-11T12:30:00"),
    venue: "5th Avenue (26th to 48th Street)",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "Macy's Thanksgiving Day Parade",
    description: "100th annual parade - historic centennial celebration! Giant balloons, floats, and performances from Central Park West to Herald Square.",
    category: "seasonal",
    startsAt: new Date("2026-11-26T08:30:00"),
    venue: "Central Park West to Herald Square",
    neighborhood: "Upper West Side",
  },

  // ============================================================================
  // STREET FESTIVALS
  // ============================================================================
  {
    title: "Ninth Avenue International Food Festival",
    description: "Two-day food festival in Hell's Kitchen. Cuisines from around the world line Ninth Avenue for blocks.",
    category: "food",
    startsAt: new Date("2026-05-16T10:00:00"),
    venue: "9th Avenue (42nd to 57th Street)",
    neighborhood: "Hell's Kitchen",
  },
  {
    title: "Feast of San Gennaro",
    description: "100th anniversary celebration! 11-day Italian festival on Mulberry Street with food vendors, cannoli eating contests, and live music.",
    category: "food",
    startsAt: new Date("2026-09-17T11:00:00"),
    venue: "Mulberry Street (Houston to Canal)",
    neighborhood: "Little Italy",
  },
  {
    title: "Smorgasburg Williamsburg Opening Day",
    description: "America's largest weekly open-air food market returns. 70+ vendors serving international cuisine on the Williamsburg Waterfront.",
    category: "food",
    startsAt: new Date("2026-04-04T11:00:00"),
    venue: "Marsha P. Johnson State Park",
    neighborhood: "Williamsburg",
  },
  {
    title: "Smorgasburg Prospect Park Opening Day",
    description: "Sunday food market at Prospect Park Breeze Hill. 70+ vendors through October.",
    category: "food",
    startsAt: new Date("2026-04-05T11:00:00"),
    venue: "Breeze Hill, Prospect Park",
    neighborhood: "Prospect Heights",
  },

  // ============================================================================
  // CULTURAL FESTIVALS
  // ============================================================================
  {
    title: "Chinatown Lunar New Year Firecracker Festival",
    description: "Firecracker ceremony and cultural festival marking the first day of the Year of the Fire Horse at Sara D. Roosevelt Park.",
    category: "culture",
    startsAt: new Date("2026-02-17T11:00:00"),
    venue: "Sara D. Roosevelt Park",
    neighborhood: "Chinatown",
  },
  {
    title: "New York Fashion Week (Fall/Winter)",
    description: "60+ runway shows for Fall 2026 collections. World's top designers debut at venues across Manhattan.",
    category: "culture",
    startsAt: new Date("2026-02-11T09:00:00"),
    venue: "Various venues",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "Sakura Matsuri Cherry Blossom Festival",
    description: "Annual celebration of Japanese culture at Brooklyn Botanic Garden during peak cherry blossom season. Traditional performances and food.",
    category: "culture",
    startsAt: new Date("2026-04-25T10:00:00"),
    venue: "Brooklyn Botanic Garden",
    neighborhood: "Prospect Heights",
  },
  {
    title: "Tribeca Festival",
    description: "12-day film festival founded by Robert De Niro. 100+ films, TV, games, audio storytelling, and immersive experiences in Lower Manhattan.",
    category: "culture",
    startsAt: new Date("2026-06-03T10:00:00"),
    venue: "Various venues in Tribeca",
    neighborhood: "Tribeca",
  },
  {
    title: "Governors Ball Music Festival",
    description: "16th annual 3-day music festival featuring Lorde, A$AP Rocky, Stray Kids, Kali Uchis, and 60+ artists.",
    category: "culture",
    startsAt: new Date("2026-06-05T12:00:00"),
    venue: "Flushing Meadows-Corona Park",
    neighborhood: "Corona",
  },
  {
    title: "Shakespeare in the Park: Romeo and Juliet",
    description: "Free outdoor Shakespeare at the newly renovated Delacorte Theater. Directed by Saheem Ali. Free tickets distributed at noon.",
    category: "culture",
    startsAt: new Date("2026-05-15T20:00:00"),
    venue: "Delacorte Theater, Central Park",
    neighborhood: "Central Park",
  },
  {
    title: "Shakespeare in the Park: The Winter's Tale",
    description: "Free outdoor Shakespeare directed by Tony winner Daniel Sullivan. Free tickets distributed at noon daily.",
    category: "culture",
    startsAt: new Date("2026-07-10T20:00:00"),
    venue: "Delacorte Theater, Central Park",
    neighborhood: "Central Park",
  },
  {
    title: "SummerStage Season Opening",
    description: "40th anniversary season of NYC's beloved free outdoor performing arts festival. 80+ free and benefit concerts across all five boroughs.",
    category: "culture",
    startsAt: new Date("2026-06-01T18:00:00"),
    venue: "Rumsey Playfield, Central Park",
    neighborhood: "Central Park",
  },
  {
    title: "New York Fashion Week (Spring/Summer)",
    description: "Spring/Summer 2027 collections debut. Major designers present at venues throughout Manhattan.",
    category: "culture",
    startsAt: new Date("2026-09-09T09:00:00"),
    venue: "Various venues",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "Open House New York Weekend",
    description: "Citywide celebration of architecture and urban design. 320+ buildings unlock their doors across all five boroughs.",
    category: "culture",
    startsAt: new Date("2026-10-16T10:00:00"),
    venue: "Citywide",
    neighborhood: null,
  },

  // ============================================================================
  // SEASONAL EVENTS
  // ============================================================================
  {
    title: "Times Square New Year's Eve Ball Drop",
    description: "122nd annual celebration with the new 'Constellation Ball'. Area closes 3pm. Dress warm - expect 8+ hour wait.",
    category: "seasonal",
    startsAt: new Date("2026-12-31T18:00:00"),
    venue: "Times Square",
    neighborhood: "Times Square",
  },
  {
    title: "Times Square America250 Ball Drop",
    description: "Special second ball drop celebrating America's 250th anniversary. Red, white, and blue confetti release.",
    category: "seasonal",
    startsAt: new Date("2026-07-03T23:00:00"),
    venue: "Times Square",
    neighborhood: "Times Square",
  },
  {
    title: "Macy's 4th of July Fireworks",
    description: "50th golden anniversary fireworks spectacular! Launched from Brooklyn Bridge and East River barges. Free tickets available.",
    category: "seasonal",
    startsAt: new Date("2026-07-04T21:25:00"),
    venue: "Brooklyn Bridge and East River",
    neighborhood: "Lower Manhattan",
  },
  {
    title: "Bryant Park Winter Village Opening",
    description: "Holiday market with 180+ vendors, free ice skating rink, and The Lodge. European-inspired holiday shopping through March.",
    category: "seasonal",
    startsAt: new Date("2026-10-30T11:00:00"),
    venue: "Bryant Park",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "Rockefeller Center Christmas Tree Lighting",
    description: "Iconic tree lighting ceremony broadcast live. 50,000+ LED lights illuminate the 70+ foot Norway Spruce.",
    category: "seasonal",
    startsAt: new Date("2026-12-02T19:00:00"),
    venue: "Rockefeller Center",
    neighborhood: "Midtown Manhattan",
  },
  {
    title: "SantaCon NYC",
    description: "Annual charitable bar crawl with 30,000+ Santas invading Midtown. Benefits local charities. Full costume required.",
    category: "seasonal",
    startsAt: new Date("2026-12-12T10:00:00"),
    venue: "Various bars in Midtown",
    neighborhood: "Midtown Manhattan",
  },

  // ============================================================================
  // SPORTS EVENTS
  // ============================================================================
  {
    title: "NYC Half Marathon",
    description: "13.1 miles through Manhattan from Central Park to South Street Seaport. Major road closures in Lower Manhattan.",
    category: "sports",
    startsAt: new Date("2026-03-15T07:00:00"),
    venue: "Central Park to South Street Seaport",
    neighborhood: "Manhattan",
  },
  {
    title: "TCS NYC Marathon",
    description: "World's largest marathon. 26.2 miles through all 5 boroughs. 50,000+ runners, 1M+ spectators. Citywide street closures.",
    category: "sports",
    startsAt: new Date("2026-11-01T08:00:00"),
    venue: "Staten Island to Central Park",
    neighborhood: "Citywide",
  },

  // ============================================================================
  // LOCAL/NEIGHBORHOOD EVENTS
  // ============================================================================
  {
    title: "Brooklyn Flea Opening Day",
    description: "Iconic vintage and artisan market returns to DUMBO Archway. Antiques, handmade goods, and local food.",
    category: "local",
    startsAt: new Date("2026-04-04T10:00:00"),
    venue: "DUMBO Archway",
    neighborhood: "DUMBO",
  },
  {
    title: "J'Ouvert Festival",
    description: "Pre-dawn Caribbean celebration marking the start of Carnival. Colorful paint and powder celebration through Crown Heights.",
    category: "culture",
    startsAt: new Date("2026-09-07T06:00:00"),
    venue: "Crown Heights streets",
    neighborhood: "Crown Heights",
  },
  {
    title: "NYC Restaurant Week Winter",
    description: "Prix-fixe menus at 400+ top NYC restaurants. $30 lunch, $45 dinner. Book early for popular spots.",
    category: "food",
    startsAt: new Date("2026-01-20T00:00:00"),
    venue: "Citywide restaurants",
    neighborhood: null,
  },
  {
    title: "NYC Restaurant Week Summer",
    description: "Summer edition of prix-fixe dining at 400+ restaurants. $30 lunch, $45 dinner deals citywide.",
    category: "food",
    startsAt: new Date("2026-07-20T00:00:00"),
    venue: "Citywide restaurants",
    neighborhood: null,
  },
];

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     NYC Parades & Festivals 2026 - Haiku-Curated Seeder     ║
╚══════════════════════════════════════════════════════════════╝

  Events to seed: ${NYC_PARADES_FESTIVALS_2026.length}
  Using Haiku analysis for optimal alert timing...
`);

  let created = 0;
  let skipped = 0;
  let analyzed = 0;

  for (const event of NYC_PARADES_FESTIVALS_2026) {
    // Check if event already exists
    const existing = await prisma.cityEvent.findFirst({
      where: {
        title: event.title,
        startsAt: event.startsAt,
      },
    });

    if (existing) {
      console.log(`  [SKIP] ${event.title} (already exists)`);
      skipped++;
      continue;
    }

    // Analyze with Haiku for optimal alert timing
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
        sourceName: "NYC Parades & Festivals 2026",
      },
    });

    console.log(`  [CREATED] ${event.title}`);
    console.log(`            Alert days: [${analysis.alertDays.join(", ")}]`);
    console.log(`            Transit impact: ${analysis.transitImpact}`);
    if (analysis.insiderTip) {
      console.log(`            Tip: ${analysis.insiderTip}`);
    }
    created++;

    // Rate limit between Haiku calls
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    Seeding Complete                          ║
╚══════════════════════════════════════════════════════════════╝

  Created: ${created}
  Skipped: ${skipped}
  Analyzed: ${analyzed}

  Categories seeded:
  - Major Parades: St. Patrick's, Pride, Puerto Rican Day, Thanksgiving, etc.
  - Street Festivals: San Gennaro, 9th Ave Food Festival, Smorgasburg
  - Cultural Festivals: Tribeca, Fashion Week, SummerStage, Shakespeare
  - Seasonal Events: Tree Lighting, Ball Drop, July 4th Fireworks
  - Sports: NYC Marathon, Half Marathon

  Next steps:
  - Run digest preview: npx tsx scripts/demo-v2-digest.ts <email>
  - Check events: SELECT * FROM "CityEvent" WHERE "sourceType" = 'haiku-curator';
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
