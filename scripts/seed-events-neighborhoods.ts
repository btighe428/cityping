import { prisma } from "../src/lib/db";
import { analyzeEventWithHaiku } from "../src/lib/premium/haiku-events-curator";

/**
 * NYC Neighborhood & Local Events for 2026
 *
 * This file seeds the database with neighborhood-specific events including:
 * - Street fairs and festivals
 * - Block parties and community events
 * - Open Streets dates
 * - Beach season openings
 * - Farmers markets
 * - Outdoor movie screenings
 * - Free fitness and yoga classes
 * - Flea markets and vintage shopping
 */

export const neighborhoodEvents = [
  // LUNAR NEW YEAR & CULTURAL CELEBRATIONS
  {
    title: "Lunar New Year Parade & Festival",
    description: "28th Annual Lunar New Year Parade celebrating the Year of the Fire Horse. Features dragon dance troupes, elaborate floats, marching bands, martial artists, and musicians. Festival booths along Bayard Street.",
    category: "culture" as const,
    startsAt: new Date("2026-03-01"),
    venue: "Mott Street & Canal Street to East Broadway",
    neighborhood: "Chinatown, Manhattan"
  },

  // SPRING FESTIVALS & STREET FAIRS
  {
    title: "Cinco de Mayo Street Festival",
    description: "NYC's largest Cinco de Mayo celebration featuring food vendors (tacos, quesadillas, street corn, churros), Mariachi band, margaritas, tequila, and Mexican beer. Rain or shine event with covered tents.",
    category: "food" as const,
    startsAt: new Date("2026-05-03"),
    venue: "Stone Street",
    neighborhood: "Financial District, Manhattan"
  },

  {
    title: "9th Avenue International Street Fair",
    description: "Annual food and cultural festival celebrating international cuisine. Live music, food vendors, and cultural performances along 9th Avenue.",
    category: "food" as const,
    startsAt: new Date("2026-05-17"),
    venue: "9th Avenue, 42nd to 57th Streets",
    neighborhood: "Hell's Kitchen, Manhattan"
  },

  // SUMMER EVENTS & BEACH SEASON
  {
    title: "NYC Public Beaches Open for Season",
    description: "Beach season officially opens with lifeguard coverage daily from 10am-6pm. Includes Coney Island, Rockaway Beach, Brighton Beach, Orchard Beach and all NYC public beaches.",
    category: "seasonal" as const,
    startsAt: new Date("2026-05-25"),
    venue: "All NYC Public Beaches",
    neighborhood: "Citywide"
  },

  {
    title: "Summer Streets Begins",
    description: "Recurring program with traffic-free streets and car-free zones across NYC. Past routes include Park Avenue, Lafayette Street, Fifth Avenue, and Adam Clayton Powell Boulevard with fitness classes, dining, and cultural programming.",
    category: "local" as const,
    startsAt: new Date("2026-07-11"),
    venue: "Multiple Borough Routes",
    neighborhood: "Citywide"
  },

  {
    title: "Hudson Farmers Market Outdoor Season Opens",
    description: "Farmers market opens outdoor venue with fresh produce, local vendors, and seasonal goods. Saturdays through November.",
    category: "food" as const,
    startsAt: new Date("2026-05-03"),
    venue: "Hudson NY",
    neighborhood: "Westchester"
  },

  {
    title: "Down to Earth Markets Spring Opening",
    description: "Year-round Sunday farmers market (9am-2pm) with organic produce, local goods, and community farmers. Multiple Brooklyn and Manhattan locations.",
    category: "food" as const,
    startsAt: new Date("2026-05-10"),
    venue: "Multiple Locations - Brooklyn & Manhattan",
    neighborhood: "East Village & Park Slope, Brooklyn"
  },

  {
    title: "Harvest Home Farmers Market Season",
    description: "Seasonal farmers market (May 12 - November 25) featuring local produce, artisan goods, and prepared foods. Weekly community gathering.",
    category: "food" as const,
    startsAt: new Date("2026-05-12"),
    venue: "Harvest Home Market Location",
    neighborhood: "Brooklyn"
  },

  {
    title: "Tompkins Square Park Greenmarket Open",
    description: "Year-round farmers market at Tompkins Square Park with vegetables, grass-fed meats, hard cider, and local vendors. Sundays 9am-4pm.",
    category: "food" as const,
    startsAt: new Date("2026-01-04"),
    venue: "E 7th Street & Avenue A",
    neighborhood: "East Village, Manhattan"
  },

  {
    title: "77th/79th Street Greenmarket",
    description: "Year-round farmers market featuring local produce and artisan goods. Open Sundays 9am-4pm.",
    category: "food" as const,
    startsAt: new Date("2026-01-04"),
    venue: "77th & 79th Streets",
    neighborhood: "Upper West Side, Manhattan"
  },

  // OUTDOOR ENTERTAINMENT
  {
    title: "Bryant Park Summer Movie Nights",
    description: "Free outdoor movie screenings. Lawn opens at 5pm, films start at 8pm every Monday. Bring blankets and enjoy classics and new releases under the stars.",
    category: "local" as const,
    startsAt: new Date("2026-06-15"),
    venue: "Bryant Park, 42nd & 6th Ave",
    neighborhood: "Midtown, Manhattan"
  },

  {
    title: "Movies With A View - Brooklyn Bridge Park",
    description: "Free outdoor movie screenings on Thursday evenings in July and August at Pier 1 Harbor View Lawn. Spectacular Manhattan skyline backdrop.",
    category: "local" as const,
    startsAt: new Date("2026-07-09"),
    venue: "Pier 1 Harbor View Lawn, Brooklyn Bridge Park",
    neighborhood: "DUMBO, Brooklyn"
  },

  // FITNESS & WELLNESS
  {
    title: "Shape Up NYC Outdoor Fitness Classes Begin",
    description: "Free group fitness classes including yoga, dance fitness, bodyweight circuit training, bootcamp, and Zumba. Over 1,155 events scheduled February-July at parks and community centers citywide.",
    category: "local" as const,
    startsAt: new Date("2026-02-20"),
    venue: "Multiple Parks & Community Centers",
    neighborhood: "Citywide"
  },

  {
    title: "Bryant Park Free Yoga - Tuesday Mornings",
    description: "Free yoga classes every Tuesday at 10am through September 25. All levels welcome. Bring your own mat.",
    category: "local" as const,
    startsAt: new Date("2026-03-03"),
    venue: "Bryant Park",
    neighborhood: "Midtown, Manhattan"
  },

  {
    title: "Bryant Park Free Yoga - Wednesday Evenings",
    description: "Free yoga classes every Wednesday at 6pm through September 25. Evening practice with Midtown skyline views.",
    category: "local" as const,
    startsAt: new Date("2026-03-04"),
    venue: "Bryant Park",
    neighborhood: "Midtown, Manhattan"
  },

  {
    title: "Randalls Island Park Yoga in the Park",
    description: "Free outdoor yoga classes every Tuesday at 6:30pm. No registration required. Bring mat or blanket.",
    category: "local" as const,
    startsAt: new Date("2026-03-03"),
    venue: "Randalls Island Park",
    neighborhood: "Randalls Island, Manhattan"
  },

  {
    title: "Time's Up Free Outdoor Yoga - La Plaza Community Garden",
    description: "Free one-hour outdoor yoga classes at La Plaza Community Garden. Sundays and Thursdays throughout winter and spring.",
    category: "local" as const,
    startsAt: new Date("2026-02-08"),
    venue: "La Plaza Community Garden (9th St & Ave C)",
    neighborhood: "East Village, Manhattan"
  },

  // FALL FESTIVALS & STREET FAIRS
  {
    title: "Atlantic Antic Street Festival",
    description: "NYC's largest street festival! Ten blocks of Atlantic Avenue spanning four neighborhoods in downtown Brooklyn featuring art & craft vendors, live music, food trucks, and thousands of visitors. Since 1974.",
    category: "culture" as const,
    startsAt: new Date("2026-10-03"),
    venue: "Atlantic Avenue, 10 blocks",
    neighborhood: "Boerum Hill, Cobble Hill, Carroll Gardens, Brooklyn Heights, Brooklyn"
  },

  {
    title: "Feast of San Gennaro - Little Italy",
    description: "100th Anniversary celebration of this iconic 11-day Italian street festival. Over 300 vendors, colorful street decorations, live music, entertainment, and traditional religious ceremonies. Famous sausage & pepper sandwiches and cannolis.",
    category: "culture" as const,
    startsAt: new Date("2026-09-17"),
    venue: "Mulberry Street, Houston to Canal Street",
    neighborhood: "Little Italy, Manhattan"
  },

  {
    title: "Ferragosto Festival - Bronx Little Italy",
    description: "Celebration of Italian culture and traditions with food, live entertainment, music performances, and community festivities on Arthur Avenue.",
    category: "culture" as const,
    startsAt: new Date("2026-09-13"),
    venue: "Arthur Avenue between East 187th & Crescent Avenue",
    neighborhood: "Belmont, Bronx"
  },

  // SHOPPING & VINTAGE MARKETS
  {
    title: "Brooklyn Flea Spring/Summer Season Opens",
    description: "Brooklyn Flea DUMBO opens with 75+ vendors selling vintage goods, antiques, crafts, and unique finds. Saturdays and Sundays, 10am-5pm (weather permitting).",
    category: "local" as const,
    startsAt: new Date("2026-04-05"),
    venue: "DUMBO, Brooklyn",
    neighborhood: "DUMBO, Brooklyn"
  },

  {
    title: "Chelsea Flea Market Year-Round",
    description: "NYC's largest indoor/outdoor flea market with 135 vendors selling historic collectibles, vintage items, and unique goods. Year-round operation Saturdays & Sundays, 8am-5pm.",
    category: "local" as const,
    startsAt: new Date("2026-01-03"),
    venue: "Chelsea Market Area",
    neighborhood: "Chelsea, Manhattan"
  },

  {
    title: "Grand Bazaar NYC - Weekly Flea Market",
    description: "One of NYC's oldest and largest marketplaces with 100+ local merchants selling vintage, antiques, collectibles, and handmade goods. Every Sunday all year.",
    category: "local" as const,
    startsAt: new Date("2026-01-04"),
    venue: "Grand Bazaar NYC Location",
    neighborhood: "Upper West Side, Manhattan"
  },

  {
    title: "Artists & Fleas Weekend Market",
    description: "Year-round flea market with 45+ sellers offering vintage, art, crafts, and unique finds. Live performances and entertainment. Saturdays & Sundays, 11am-7pm.",
    category: "local" as const,
    startsAt: new Date("2026-01-03"),
    venue: "Artists & Fleas Location",
    neighborhood: "Multiple Locations"
  },

  {
    title: "Malcolm Shabazz Harlem Market",
    description: "Year-round marketplace featuring traditional African crafts, textiles, art, and cultural goods. Support local merchants and discover authentic African culture.",
    category: "local" as const,
    startsAt: new Date("2026-01-03"),
    venue: "116th Street & Malcolm X Boulevard",
    neighborhood: "Harlem, Manhattan"
  },

  // COMMUNITY & BLOCK PARTIES
  {
    title: "NYC Summer Block Parties Season",
    description: "FDNY hosts classic New York City block parties across all five boroughs featuring games, food, educational outreach, presentations, and family fun throughout summer months.",
    category: "local" as const,
    startsAt: new Date("2026-06-01"),
    venue: "Various Neighborhoods - Citywide",
    neighborhood: "Citywide"
  },

  {
    title: "Holiday Open Streets - Fifth Avenue",
    description: "Car-free holiday celebration with pedestrian-only access to Fifth Avenue and adjacent side streets. Shopping, dining, and festive atmosphere.",
    category: "seasonal" as const,
    startsAt: new Date("2026-12-14"),
    venue: "Fifth Avenue & Adjacent Side Streets",
    neighborhood: "Midtown, Manhattan"
  },

  {
    title: "Beach Season Closes",
    description: "End of NYC beach season with final day of lifeguard coverage. Summer at Coney Island, Rockaway Beach, Brighton Beach, and all public beaches comes to a close.",
    category: "seasonal" as const,
    startsAt: new Date("2026-09-13"),
    venue: "All NYC Public Beaches",
    neighborhood: "Citywide"
  }
];
