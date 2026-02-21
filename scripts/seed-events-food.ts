// NYC Food & Dining Events 2026 Seed Data
// Categories: food, culture, seasonal, local

import { prisma } from "../src/lib/db";
import { analyzeEventWithHaiku } from "../src/lib/premium/haiku-events-curator";

export const foodEvents = [
  // Restaurant Week Events
  {
    title: "NYC Winter Restaurant Week 2026",
    description:
      "Prix-fixe dining deals at over 400+ restaurants across Manhattan, Brooklyn, and beyond. Choose from $30, $45, and $60 price tiers for multi-course meals.",
    category: "food" as const,
    startsAt: new Date("2026-01-20"),
    endsAt: new Date("2026-02-12"),
    venue: "Multiple Locations",
    neighborhood: "Citywide",
  },
  {
    title: "NYC Summer Restaurant Week 2026",
    description:
      "Annual summer dining event featuring pre-fixe menus at premium restaurants. Lunch and dinner deals to celebrate NYC's culinary scene.",
    category: "food" as const,
    startsAt: new Date("2026-07-15"),
    endsAt: new Date("2026-08-15"),
    venue: "Multiple Locations",
    neighborhood: "Citywide",
  },

  // Wine & Food Festival
  {
    title: "Food Network NYC Wine & Food Festival",
    description:
      "5-day culinary event featuring 50+ events including seminars, wine pairings, cooking classes, and Grand Tasting events with hundreds of chefs and food vendors. Benefit for Food Bank for NYC.",
    category: "food" as const,
    startsAt: new Date("2026-10-14"),
    endsAt: new Date("2026-10-18"),
    venue: "South Street Seaport & Multiple Venues",
    neighborhood: "Lower Manhattan",
  },

  // Smorgasburg Events
  {
    title: "Smorgasburg Brooklyn - Williamsburg Season Opening",
    description:
      "Weekly outdoor food market with 50+ international food vendors. Every Saturday through October featuring street food from around the world.",
    category: "seasonal" as const,
    startsAt: new Date("2026-04-04"),
    endsAt: new Date("2026-10-31"),
    venue: "Kent Avenue Waterfront",
    neighborhood: "Williamsburg, Brooklyn",
  },
  {
    title: "Smorgasburg Brooklyn - Prospect Park Season Opening",
    description:
      "Smorgasburg returns to Breeze Hill at Prospect Park. Every Sunday with diverse food vendors and outdoor dining experience.",
    category: "seasonal" as const,
    startsAt: new Date("2026-04-05"),
    endsAt: new Date("2026-10-31"),
    venue: "Breeze Hill, Prospect Park",
    neighborhood: "Prospect Park, Brooklyn",
  },
  {
    title: "Smorgasburg Manhattan - World Trade Center",
    description:
      "Downtown Manhattan's weekend food market at the Oculus featuring local and international vendors. Every Friday through October.",
    category: "seasonal" as const,
    startsAt: new Date("2026-04-03"),
    endsAt: new Date("2026-10-30"),
    venue: "Oculus at World Trade Center",
    neighborhood: "Financial District, Manhattan",
  },

  // Queens Night Market
  {
    title: "Queens Night Market 2026",
    description:
      "NYC's only open-air night market in its 11th year! Experience affordable multicultural cuisine from 100+ vendors. Open Saturday nights 4pm-midnight through October.",
    category: "culture" as const,
    startsAt: new Date("2026-04-18"),
    endsAt: new Date("2026-10-31"),
    venue: "Flushing Meadows Corona Park",
    neighborhood: "Corona, Queens",
  },

  // Brewery & Beer Events
  {
    title: "NYC Beer Week 2026",
    description:
      "Week-long celebration of NYC's craft beer scene with brewery tap takeovers, beer tastings, and special events across the city.",
    category: "food" as const,
    startsAt: new Date("2026-02-21"),
    endsAt: new Date("2026-03-01"),
    venue: "Multiple Breweries Citywide",
    neighborhood: "Citywide",
  },
  {
    title: "Spring Tasting Fest 2026",
    description:
      "Over 100 beer, wine, and spirits samples with brewery representatives, sommeliers, and master distillers. Two sessions available.",
    category: "food" as const,
    startsAt: new Date("2026-04-26"),
    venue: "Chelsea Industrial",
    neighborhood: "Chelsea, Manhattan",
  },
  {
    title: "Summer Tasting Fest at the Intrepid Museum",
    description:
      "All-access tasting event featuring emerging and renowned breweries, wineries, and spirits with live entertainment, food, and interactive games.",
    category: "seasonal" as const,
    startsAt: new Date("2026-08-14"),
    venue: "Intrepid Sea, Air & Space Museum",
    neighborhood: "Hell's Kitchen, Manhattan",
  },

  // Street Fairs & Seasonal Markets
  {
    title: "Ninth Avenue International Food Festival",
    description:
      "One of NYC's oldest and largest food festivals taking over Ninth Avenue in Hell's Kitchen with international food vendors and street fare from around the world.",
    category: "seasonal" as const,
    startsAt: new Date("2026-05-10"),
    endsAt: new Date("2026-05-17"),
    venue: "Ninth Avenue (42nd-46th Streets)",
    neighborhood: "Hell's Kitchen, Manhattan",
  },
  {
    title: "Madison Square Parks Eats Your Heart Out",
    description:
      "Month-long outdoor food festival featuring diverse cuisines from raved-about NYC eateries. Daily 11am-9pm at Worth Square.",
    category: "seasonal" as const,
    startsAt: new Date("2026-05-03"),
    endsAt: new Date("2026-05-31"),
    venue: "Worth Square",
    neighborhood: "Flatiron, Manhattan",
  },
  {
    title: "Hester Street Fair 2026",
    description:
      "Seasonal street market on the Lower East Side with rotating artisanal food vendors, vintage clothing, and handmade crafts. Every Saturday April-October.",
    category: "local" as const,
    startsAt: new Date("2026-04-04"),
    endsAt: new Date("2026-10-31"),
    venue: "Hester Street (between Eldridge & Orchard)",
    neighborhood: "Lower East Side, Manhattan",
  },
  {
    title: "Uptown Night Market 2026",
    description:
      "Monthly food and culture market in West Harlem featuring 80+ vendors with local food, drinks, music, and merchandise. Second Thursday each month.",
    category: "local" as const,
    startsAt: new Date("2026-04-09"),
    endsAt: new Date("2026-10-08"),
    venue: "133rd Street & 12th Avenue",
    neighborhood: "West Harlem, Manhattan",
  },

  // Food Halls & Restaurant Openings
  {
    title: "Shaver Hall Grand Opening",
    description:
      "NYC's new mega food hall in Midtown Manhattan featuring Tallow Steakhouse, omakase by Chef B.K. Park, ZaZu Mediterranean Street Food, Pick & Cheese, Biddrina Gelato, and more.",
    category: "food" as const,
    startsAt: new Date("2026-03-15"),
    venue: "Amazon Hank Building, Fifth Avenue",
    neighborhood: "Midtown, Manhattan",
  },
  {
    title: "Pies 'n' Thighs Park Slope Opening",
    description:
      "Beloved Williamsburg restaurant opens its second location in Park Slope just in time for its 20th anniversary. Classic comfort food and brunch.",
    category: "local" as const,
    startsAt: new Date("2026-02-01"),
    venue: "244 Flatbush Avenue",
    neighborhood: "Park Slope, Brooklyn",
  },
  {
    title: "The Golden Steer NYC Opening",
    description:
      "Legendary Las Vegas steakhouse brings classic tableside service, vintage glamour, and prime steaks to Greenwich Village at this historic address.",
    category: "food" as const,
    startsAt: new Date("2026-02-15"),
    venue: "1 Fifth Avenue",
    neighborhood: "Greenwich Village, Manhattan",
  },

  // Rooftop Bar Season
  {
    title: "Rooftop Bar Season Opening - Leonessa",
    description:
      "FiDi's new Italian-infused rooftop opens at the Conrad Downtown with Amalfi vibes, Bathtub Gin spritzes, and complimentary nightly snacks like arancini.",
    category: "seasonal" as const,
    startsAt: new Date("2026-04-15"),
    venue: "Conrad Downtown",
    neighborhood: "Financial District, Manhattan",
  },
  {
    title: "Vintage Green Rooftop Season Opening",
    description:
      "Brand new rooftop bar in Murray Hill offering cocktails and dining with skyline views. Located on the corner of 37th and Lexington Avenue.",
    category: "seasonal" as const,
    startsAt: new Date("2026-05-01"),
    venue: "The Shelburne Hotel (37th & Lexington)",
    neighborhood: "Murray Hill, Manhattan",
  },
  {
    title: "Daintree Rooftop - Tropical Escape",
    description:
      "25th-floor tropical-themed rooftop with retractable glass roof and skyline views. Year-round dining and drinks destination.",
    category: "food" as const,
    startsAt: new Date("2026-04-10"),
    venue: "25th Floor, Midtown",
    neighborhood: "Midtown, Manhattan",
  },

  // Outdoor Dining Season
  {
    title: "NYC Roadway Dining Season Opening 2026",
    description:
      "Outdoor sidewalk and roadway dining season returns with street seating at hundreds of restaurants throughout the city.",
    category: "seasonal" as const,
    startsAt: new Date("2026-04-01"),
    endsAt: new Date("2026-11-29"),
    venue: "Multiple Locations Citywide",
    neighborhood: "Citywide",
  },

  // Food Tours & Crawls
  {
    title: "Greenwich Village Food Tour",
    description:
      "3-hour walking food tour exploring cozy bakeries, historic streets, and iconic food spots with tastings and stories of the neighborhood's cultural heritage.",
    category: "culture" as const,
    startsAt: new Date("2026-05-02"),
    venue: "Greenwich Village",
    neighborhood: "Greenwich Village, Manhattan",
  },
  {
    title: "Hell's Kitchen Food Crawl & History Tour",
    description:
      "Walking food tour with 6+ stops featuring local gems, generous tastings, and stories about Hell's Kitchen's criminal past and culinary rise.",
    category: "culture" as const,
    startsAt: new Date("2026-05-09"),
    venue: "Hell's Kitchen",
    neighborhood: "Hell's Kitchen, Manhattan",
  },
  {
    title: "Chinatown & Little Italy Historical Food Tour",
    description:
      "Explore family-owned restaurants and food vendors serving traditional dishes for generations in these historic neighborhoods.",
    category: "culture" as const,
    startsAt: new Date("2026-04-25"),
    venue: "Chinatown & Little Italy",
    neighborhood: "Lower Manhattan",
  },
  {
    title: "West Village Food & Wine Walking Tour",
    description:
      "Curated walk-through of West Village's best casual eateries, wine bars, and hidden culinary gems with local expert guide.",
    category: "culture" as const,
    startsAt: new Date("2026-06-13"),
    venue: "West Village",
    neighborhood: "West Village, Manhattan",
  },
  {
    title: "Williamsburg Brooklyn Food Tour",
    description:
      "Explore Brooklyn's trendiest neighborhood with food tastings at artisanal restaurants, craft breweries, and iconic local eateries.",
    category: "local" as const,
    startsAt: new Date("2026-05-16"),
    venue: "Williamsburg",
    neighborhood: "Williamsburg, Brooklyn",
  },
  {
    title: "NYC Winter Wine & Food Festival",
    description:
      "Curated selection of 100+ wines, artisanal bites, and small-plate food pairings celebrating winter cuisine and regional producers.",
    category: "food" as const,
    startsAt: new Date("2026-03-07"),
    venue: "Multiple Venues",
    neighborhood: "Citywide",
  },
];

// Main seeding function
async function main() {
  console.log("Seeding food & dining events...");
  let created = 0;

  for (const event of foodEvents) {
    // Check if exists
    const existing = await prisma.cityEvent.findFirst({
      where: { title: event.title },
    });

    if (existing) {
      console.log(`  Skipping: ${event.title}`);
      continue;
    }

    // Analyze with Haiku (uses smart defaults if no API key)
    const analysis = await analyzeEventWithHaiku({
      title: event.title,
      description: event.description,
      category: event.category,
      eventDate: event.startsAt,
      venue: event.venue,
      neighborhood: event.neighborhood,
    });

    // Create event
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
        sourceName: "CityPing Food & Dining 2026",
      },
    });
    created++;
    console.log(`  Created: ${event.title}`);
  }

  console.log(`\n✅ Seeded ${created} food events`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
