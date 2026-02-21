import { prisma } from "../src/lib/db";
import { analyzeEventWithHaiku } from "../src/lib/premium/haiku-events-curator";

// NYC Music & Nightlife Events 2026
// This script seeds the database with major music festivals, concerts, and nightlife events

const musicEvents = [
  // Winter & Early Spring Concerts
  {
    title: "Halsey at Hammerstein Ballroom",
    description: "Three nights of electrifying performances from pop star Halsey at the historic Hammerstein Ballroom",
    category: "culture" as const,
    startsAt: new Date("2026-01-13"),
    venue: "Hammerstein Ballroom",
    neighborhood: "Midtown",
  },
  {
    title: "Winter Jazzfest NYC 2026",
    description: "NYC's premier winter jazz festival spanning 6 days with marathon events in Manhattan and Brooklyn featuring emerging and established jazz artists",
    category: "culture" as const,
    startsAt: new Date("2026-01-08"),
    venue: "Multiple Venues",
    neighborhood: "Lower East Side & Brooklyn",
  },
  {
    title: "Brandi Carlile at Madison Square Garden - Night 1",
    description: "The Human Tour featuring Brandi Carlile with special guest The Head And The Heart",
    category: "culture" as const,
    startsAt: new Date("2026-02-13"),
    venue: "Madison Square Garden",
    neighborhood: "Midtown",
  },
  {
    title: "TWICE at UBS Arena",
    description: "K-Pop phenomenon TWICE takes over the UBS Arena at Belmont Park for three nights",
    category: "culture" as const,
    startsAt: new Date("2026-02-18"),
    venue: "UBS Arena at Belmont Park",
    neighborhood: "Queens",
  },
  {
    title: "Elevation Worship Spring Tour at Barclays Center",
    description: "Elevation Worship and Steven Furtick bring uplifting worship music to Brooklyn",
    category: "culture" as const,
    startsAt: new Date("2026-02-25"),
    venue: "Barclays Center",
    neighborhood: "Brooklyn",
  },

  // Spring Festivals & Major Events
  {
    title: "Lady Gaga - Mayhem Ball at Madison Square Garden",
    description: "Lady Gaga's Mayhem Ball brings theatrical pop spectacle to The Garden with multiple nights",
    category: "culture" as const,
    startsAt: new Date("2026-03-19"),
    venue: "Madison Square Garden",
    neighborhood: "Midtown",
  },
  {
    title: "The New Colossus Festival 2026",
    description: "NYC's indie music festival spanning March 3-8 showcasing emerging artists from around the world at independent Lower East Side venues",
    category: "local" as const,
    startsAt: new Date("2026-03-03"),
    venue: "Multiple LES Venues",
    neighborhood: "Lower East Side",
  },
  {
    title: "Lewis Capaldi at Madison Square Garden",
    description: "Scottish singer-songwriter Lewis Capaldi brings emotional indie-pop to Madison Square Garden",
    category: "culture" as const,
    startsAt: new Date("2026-04-16"),
    venue: "Madison Square Garden",
    neighborhood: "Midtown",
  },
  {
    title: "LANY - Soft World Tour at Barclays Center",
    description: "Los Angeles dream-pop band LANY brings their Soft World Tour to Brooklyn",
    category: "culture" as const,
    startsAt: new Date("2026-04-11"),
    venue: "Barclays Center",
    neighborhood: "Brooklyn",
  },
  {
    title: "Blue Note Jazz Festival",
    description: "NYC's legendary jazz club Blue Note hosts special festival programming featuring Grace Jones, Janelle Monáe, and Branford Marsalis",
    category: "culture" as const,
    startsAt: new Date("2026-05-27"),
    venue: "Blue Note Jazz Club",
    neighborhood: "Greenwich Village",
  },

  // Summer Major Festivals
  {
    title: "Governors Ball Music Festival 2026",
    description: "NYC's premier 3-day music festival returns to Flushing Meadows Corona Park with headliners Lorde, A$AP Rocky, and Stray Kids plus 70+ artists across multiple stages",
    category: "seasonal" as const,
    startsAt: new Date("2026-06-05"),
    venue: "Flushing Meadows Corona Park",
    neighborhood: "Queens",
  },
  {
    title: "Martin Garrix Americas Tour at Barclays Center",
    description: "Dutch DJ and producer Martin Garrix brings three nights of electronic dance music to Brooklyn",
    category: "culture" as const,
    startsAt: new Date("2026-06-11"),
    venue: "Barclays Center",
    neighborhood: "Brooklyn",
  },
  {
    title: "Young the Giant at The Rooftop at Pier 17",
    description: "Indie rock legends Young the Giant perform with special guests Cold War Kids and almost monday with NYC skyline backdrop",
    category: "culture" as const,
    startsAt: new Date("2026-06-18"),
    venue: "The Rooftop at Pier 17",
    neighborhood: "South Street Seaport",
  },
  {
    title: "Lupe Fiasco at The Rooftop at Pier 17",
    description: "Chicago hip-hop virtuoso Lupe Fiasco performs at the iconic rooftop venue overlooking the East River",
    category: "culture" as const,
    startsAt: new Date("2026-06-10"),
    venue: "The Rooftop at Pier 17",
    neighborhood: "South Street Seaport",
  },
  {
    title: "SummerStage Central Park - 40th Anniversary Season",
    description: "NYC's legendary free outdoor concert series celebrates its 40th anniversary with performances across all five boroughs featuring world-class artists in multiple genres",
    category: "seasonal" as const,
    startsAt: new Date("2026-05-01"),
    venue: "Rumsey Playfield, Central Park",
    neighborhood: "Upper East Side",
  },
  {
    title: "BRIC Celebrate Brooklyn - Royel Otis Benefit Concert",
    description: "NYC's longest-running free outdoor performing arts festival kicks off summer 2026 at Prospect Park's Lena Horne Bandshell with Australian indie pop duo Royel Otis",
    category: "seasonal" as const,
    startsAt: new Date("2026-07-18"),
    venue: "Lena Horne Bandshell, Prospect Park",
    neighborhood: "Prospect Heights, Brooklyn",
  },
  {
    title: "Poppy at The Rooftop at Pier 17",
    description: "Alternative pop artist Poppy performs with special guests LANDMVRKS and Thousand Below",
    category: "culture" as const,
    startsAt: new Date("2026-07-10"),
    venue: "The Rooftop at Pier 17",
    neighborhood: "South Street Seaport",
  },
  {
    title: "Dark Star Orchestra at The Rooftop at Pier 17",
    description: "Grateful Dead tribute band Dark Star Orchestra performs two nights of improvisational rock",
    category: "culture" as const,
    startsAt: new Date("2026-06-25"),
    venue: "The Rooftop at Pier 17",
    neighborhood: "South Street Seaport",
  },
  {
    title: "Wolf Alice at The Rooftop at Pier 17",
    description: "British indie rock band Wolf Alice brings their dynamic performances to NYC's premier rooftop venue",
    category: "culture" as const,
    startsAt: new Date("2026-07-29"),
    venue: "The Rooftop at Pier 17",
    neighborhood: "South Street Seaport",
  },

  // Late Summer Major Events
  {
    title: "My Chemical Romance - The Black Parade 2026 at Citi Field",
    description: "Emo legends My Chemical Romance celebrate the 20th anniversary of 'The Black Parade' album with special guest Franz Ferdinand at Citi Field in Queens",
    category: "culture" as const,
    startsAt: new Date("2026-08-09"),
    venue: "Citi Field",
    neighborhood: "Queens",
  },
  {
    title: "Electric Zoo Music Festival at Randall's Island",
    description: "NYC's premier electronic dance music festival draws over 100,000 music fans for Labor Day weekend featuring world-class EDM, techno, and house DJs and producers",
    category: "seasonal" as const,
    startsAt: new Date("2026-09-05"),
    venue: "Randall's Island Park",
    neighborhood: "East Harlem",
  },
  {
    title: "NoMad Jazz Festival 2026",
    description: "Manhattan's NoMad neighborhood celebrates jazz with festival week performances August 2-6 and mainstage festival at Madison Square Park August 7-8",
    category: "culture" as const,
    startsAt: new Date("2026-08-02"),
    venue: "Madison Square Park & NoMad Venues",
    neighborhood: "Flatiron & NoMad",
  },
  {
    title: "GOTHAM JAZZ FESTIVAL",
    description: "Spring jazz celebration featuring multiple performances across NYC venues",
    category: "culture" as const,
    startsAt: new Date("2026-04-19"),
    venue: "Three West Club & Multiple Venues",
    neighborhood: "Tribeca",
  },

  // Fall Jazz & Indie Events
  {
    title: "Inwood Jazz Festival 2026",
    description: "Free one-day outdoor jazz festival celebrating the vibrant music scene of Upper Manhattan",
    category: "local" as const,
    startsAt: new Date("2026-09-20"),
    venue: "Inwood Park & Venues",
    neighborhood: "Inwood",
  },
  {
    title: "Village Vanguard Jazz Series",
    description: "NYC's legendary jazz club features world-class performances including Ravi Coltrane, Immanuel Wilkins, and other jazz titans",
    category: "culture" as const,
    startsAt: new Date("2026-05-08"),
    venue: "Village Vanguard",
    neighborhood: "Greenwich Village",
  },
  {
    title: "Fred Again Residency at East End Studios",
    description: "English electronic music producer Fred Again kicks off a six-concert residency at Sunnyside's new state-of-the-art East End Studios",
    category: "culture" as const,
    startsAt: new Date("2026-01-16"),
    venue: "East End Studios",
    neighborhood: "Sunnyside, Queens",
  },
  {
    title: "Savion Glover at Blue Note Jazz Club",
    description: "Acclaimed tap dancer and percussionist Savion Glover performs at the legendary Greenwich Village jazz venue",
    category: "culture" as const,
    startsAt: new Date("2026-03-21"),
    venue: "Blue Note Jazz Club",
    neighborhood: "Greenwich Village",
  },

  // New Year's Eve & Holiday Events
  {
    title: "Times Square New Year's Eve 2026 with Diana Ross",
    description: "Music legend Diana Ross headlines the final moments before midnight in Times Square, with performances by Ciara, Maren Morris, Little Big Town, and Robyn throughout the night",
    category: "seasonal" as const,
    startsAt: new Date("2025-12-31"),
    venue: "Times Square",
    neighborhood: "Midtown",
  },
  {
    title: "Swing 46 New Year's Eve 2026",
    description: "Legendary swing club celebrates New Year's Eve with live jazz music from 9:30 PM to 2 AM plus dance lessons",
    category: "local" as const,
    startsAt: new Date("2025-12-31"),
    venue: "Swing 46",
    neighborhood: "Hell's Kitchen",
  },
];

export default musicEvents;

// Main seeding function
async function main() {
  console.log("Seeding music events...");
  let created = 0;

  for (const event of musicEvents) {
    const existing = await prisma.cityEvent.findFirst({
      where: { title: event.title },
    });
    if (existing) continue;

    const analysis = await analyzeEventWithHaiku({
      title: event.title,
      description: event.description || "",
      category: event.category || "culture",
      eventDate: event.startsAt,
      venue: event.venue,
      neighborhood: event.neighborhood,
    });

    await prisma.cityEvent.create({
      data: {
        title: event.title,
        description: event.description || "",
        category: event.category || "culture",
        startsAt: event.startsAt,
        venue: event.venue || null,
        neighborhood: event.neighborhood || null,
        status: "published",
        editorNotes: JSON.stringify({ haikuAnalysis: analysis }),
        sourceType: "haiku-curator",
        sourceName: "CityPing Music 2026",
      },
    });
    created++;
    console.log("  Created: " + event.title);
  }

  console.log("✅ Seeded " + created + " music events");
}

main().catch(console.error).finally(() => prisma.$disconnect());
