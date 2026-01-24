// src/lib/neighborhoods.ts
/**
 * NYC Neighborhood Data for SEO Landing Pages
 *
 * This module provides comprehensive data for NYC neighborhood landing pages,
 * optimized for local SEO. Each neighborhood entry includes:
 * - Geographic and demographic context
 * - Relevant parking regulations (ASP schedules vary by location)
 * - Transit information (subway lines, key stations)
 * - Local character descriptions for rich content
 *
 * Historical Context:
 * NYC's neighborhoods evolved from distinct villages and ethnic enclaves.
 * The modern neighborhood boundaries roughly follow the Community District
 * system established in 1975 (Local Law 39), though popular perception
 * often differs from official boundaries.
 *
 * SEO Strategy:
 * These pages target long-tail keywords like "parking rules [neighborhood]"
 * and "[neighborhood] subway alerts" - queries with high commercial intent
 * and lower competition than generic NYC terms.
 */

export interface Neighborhood {
  slug: string;
  name: string;
  borough: "Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island";
  zipCodes: string[];
  subwayLines: string[];
  keyStations: string[];
  aspDays: string; // Typical ASP schedule
  description: string;
  highlights: string[];
  keywords: string[]; // For meta tags
}

export const neighborhoods: Neighborhood[] = [
  // MANHATTAN
  {
    slug: "upper-west-side",
    name: "Upper West Side",
    borough: "Manhattan",
    zipCodes: ["10023", "10024", "10025", "10069"],
    subwayLines: ["1", "2", "3", "A", "B", "C", "D"],
    keyStations: ["72nd St", "79th St", "86th St", "96th St", "Columbus Circle"],
    aspDays: "Mon/Thu or Tue/Fri depending on block",
    description: "The Upper West Side stretches from 59th to 110th Street between Central Park and the Hudson River. Known for its prewar architecture, cultural institutions like Lincoln Center, and family-friendly atmosphere, it's one of Manhattan's most desirable residential neighborhoods.",
    highlights: [
      "Lincoln Center & Metropolitan Opera",
      "American Museum of Natural History",
      "Riverside Park along the Hudson",
      "Columbia University nearby"
    ],
    keywords: ["upper west side parking", "uws subway", "lincoln center events", "riverside park"]
  },
  {
    slug: "upper-east-side",
    name: "Upper East Side",
    borough: "Manhattan",
    zipCodes: ["10021", "10028", "10065", "10075", "10128"],
    subwayLines: ["4", "5", "6", "Q"],
    keyStations: ["68th St-Hunter College", "77th St", "86th St", "96th St"],
    aspDays: "Mon/Thu or Tue/Fri depending on block",
    description: "The Upper East Side, running from 59th to 96th Street east of Fifth Avenue, is synonymous with old money elegance. Museum Mile runs along Fifth Avenue, and the neighborhood features some of NYC's most expensive real estate alongside more accessible Yorkville to the east.",
    highlights: [
      "Museum Mile (Met, Guggenheim, Whitney)",
      "Central Park access",
      "Second Avenue Subway (Q train)",
      "Carl Schurz Park & Gracie Mansion"
    ],
    keywords: ["upper east side parking", "ues subway", "museum mile", "yorkville"]
  },
  {
    slug: "east-village",
    name: "East Village",
    borough: "Manhattan",
    zipCodes: ["10003", "10009"],
    subwayLines: ["L", "6", "F", "M", "N", "R", "W"],
    keyStations: ["Astor Place", "1st Ave", "2nd Ave", "8th St-NYU"],
    aspDays: "Varies widely - many blocks have limited ASP",
    description: "The East Village, bounded roughly by 14th Street to the north and Houston to the south, emerged as NYC's bohemian epicenter in the 1960s. While gentrification has transformed much of the area, it retains its countercultural edge with dive bars, indie venues, and eclectic dining.",
    highlights: [
      "St. Marks Place nightlife",
      "Tompkins Square Park",
      "Ukrainian and Polish heritage (East 7th)",
      "Avant-garde theater and music venues"
    ],
    keywords: ["east village parking", "astor place subway", "st marks place", "tompkins square"]
  },
  {
    slug: "chelsea",
    name: "Chelsea",
    borough: "Manhattan",
    zipCodes: ["10001", "10011"],
    subwayLines: ["1", "2", "3", "A", "C", "E", "F", "M", "L"],
    keyStations: ["14th St", "23rd St", "28th St", "34th St-Penn Station"],
    aspDays: "Mon/Thu or Tue/Fri - heavy commercial ASP enforcement",
    description: "Chelsea spans 14th to 34th Street on Manhattan's west side, anchored by the High Line elevated park and the world's densest concentration of art galleries. The neighborhood blends industrial loft buildings with new high-rises and remains the heart of NYC's LGBTQ+ community.",
    highlights: [
      "The High Line elevated park",
      "Chelsea Market & gallery district",
      "Hudson Yards nearby",
      "Chelsea Piers sports complex"
    ],
    keywords: ["chelsea parking", "high line", "chelsea galleries", "hudson yards"]
  },
  {
    slug: "harlem",
    name: "Harlem",
    borough: "Manhattan",
    zipCodes: ["10026", "10027", "10029", "10030", "10031", "10035", "10037", "10039"],
    subwayLines: ["2", "3", "A", "B", "C", "D", "4", "5", "6"],
    keyStations: ["125th St", "135th St", "145th St", "116th St"],
    aspDays: "Varies - many residential blocks Mon/Thu",
    description: "Harlem, stretching from 110th to 155th Street, is the historic capital of Black America. The Harlem Renaissance of the 1920s made it a global cultural beacon, and today the neighborhood blends this rich heritage with ongoing revitalization. Central Harlem, West Harlem (Manhattanville), and East Harlem (El Barrio) each have distinct characters.",
    highlights: [
      "Apollo Theater on 125th Street",
      "Historic brownstone architecture",
      "Soul food and African cuisine",
      "Marcus Garvey Park"
    ],
    keywords: ["harlem parking", "125th street", "apollo theater", "soul food harlem"]
  },
  {
    slug: "tribeca",
    name: "Tribeca",
    borough: "Manhattan",
    zipCodes: ["10007", "10013"],
    subwayLines: ["1", "2", "3", "A", "C", "E"],
    keyStations: ["Chambers St", "Franklin St", "Canal St"],
    aspDays: "Varies - many commercial areas have daily regulations",
    description: "Tribeca (Triangle Below Canal) transformed from an industrial warehouse district to one of NYC's most expensive neighborhoods. The cast-iron buildings now house celebrity residents and upscale restaurants, anchored by the Tribeca Film Festival founded after 9/11 to revitalize the area.",
    highlights: [
      "Tribeca Film Festival (April)",
      "Converted loft living",
      "Fine dining destination",
      "Hudson River Park access"
    ],
    keywords: ["tribeca parking", "tribeca film festival", "tribeca restaurants", "canal street"]
  },
  // BROOKLYN
  {
    slug: "williamsburg",
    name: "Williamsburg",
    borough: "Brooklyn",
    zipCodes: ["11211", "11249"],
    subwayLines: ["L", "G", "J", "M", "Z"],
    keyStations: ["Bedford Ave", "Lorimer St", "Marcy Ave"],
    aspDays: "Mon/Thu or Tue/Fri - varies by block",
    description: "Williamsburg epitomizes Brooklyn's 21st-century transformation. Once an industrial and Hasidic Jewish enclave, the neighborhood became hipster ground zero in the 2000s. Today's Williamsburg blends luxury waterfront towers, Bedford Avenue's commercial strip, and remnants of its scrappier past.",
    highlights: [
      "Bedford Avenue shopping and dining",
      "Domino Park waterfront",
      "Brooklyn Brewery",
      "East River ferry service"
    ],
    keywords: ["williamsburg parking", "bedford ave", "brooklyn brewery", "domino park"]
  },
  {
    slug: "park-slope",
    name: "Park Slope",
    borough: "Brooklyn",
    zipCodes: ["11215", "11217"],
    subwayLines: ["F", "G", "R", "2", "3", "B", "Q"],
    keyStations: ["7th Ave", "Bergen St", "Grand Army Plaza", "4th Ave-9th St"],
    aspDays: "Mon/Thu or Tue/Fri - strictly enforced",
    description: "Park Slope, named for its location on the western slope of Prospect Park, is Brooklyn's quintessential brownstone neighborhood. Known for progressive politics, top-rated schools, and family-friendly streets, it consistently ranks among NYC's most livable areas.",
    highlights: [
      "Prospect Park (Olmsted & Vaux design)",
      "Brooklyn Botanic Garden",
      "Fifth Avenue shopping district",
      "Grand Army Plaza farmers market"
    ],
    keywords: ["park slope parking", "prospect park", "brooklyn botanic garden", "5th avenue brooklyn"]
  },
  {
    slug: "dumbo",
    name: "DUMBO",
    borough: "Brooklyn",
    zipCodes: ["11201"],
    subwayLines: ["F", "A", "C"],
    keyStations: ["York St", "High St"],
    aspDays: "Limited - mostly commercial metered parking",
    description: "DUMBO (Down Under the Manhattan Bridge Overpass) is a compact waterfront neighborhood between the Manhattan and Brooklyn Bridges. Once industrial, it's now a tech hub and tourist destination famous for its cobblestone streets, Brooklyn Bridge views, and the iconic Washington Street photo spot.",
    highlights: [
      "Brooklyn Bridge Park",
      "Washington Street photo spot",
      "Cobblestone streets & galleries",
      "Jane's Carousel"
    ],
    keywords: ["dumbo parking", "brooklyn bridge park", "dumbo brooklyn", "washington street dumbo"]
  },
  {
    slug: "bushwick",
    name: "Bushwick",
    borough: "Brooklyn",
    zipCodes: ["11206", "11221", "11237"],
    subwayLines: ["L", "J", "M", "Z"],
    keyStations: ["Morgan Ave", "Jefferson St", "Myrtle-Wyckoff", "Bushwick Ave"],
    aspDays: "Varies - less strict than Manhattan",
    description: "Bushwick has emerged as Brooklyn's arts frontier, with warehouse galleries, street murals, and DIY venues. Originally a German brewing neighborhood (Rheingold beer), it later became predominantly Latino before the current wave of artist-driven gentrification spread from neighboring Williamsburg.",
    highlights: [
      "The Bushwick Collective street art",
      "Maria Hernandez Park",
      "Brewery and distillery scene",
      "Live music and warehouse parties"
    ],
    keywords: ["bushwick parking", "bushwick collective", "bushwick art", "maria hernandez park"]
  },
  {
    slug: "brooklyn-heights",
    name: "Brooklyn Heights",
    borough: "Brooklyn",
    zipCodes: ["11201"],
    subwayLines: ["2", "3", "4", "5", "A", "C", "F", "R"],
    keyStations: ["Borough Hall", "Clark St", "High St", "Court St"],
    aspDays: "Mon/Thu or Tue/Fri - residential streets",
    description: "Brooklyn Heights, NYC's first designated historic district (1965), features pristine 19th-century rowhouses overlooking the East River. The Promenade offers iconic Manhattan skyline views, and the neighborhood retains a quiet, residential character unusual for its proximity to downtown.",
    highlights: [
      "Brooklyn Heights Promenade",
      "Historic brownstone architecture",
      "Montague Street shops",
      "Brooklyn Bridge pedestrian access"
    ],
    keywords: ["brooklyn heights parking", "brooklyn promenade", "montague street", "brooklyn heights brownstones"]
  },
  // QUEENS
  {
    slug: "astoria",
    name: "Astoria",
    borough: "Queens",
    zipCodes: ["11102", "11103", "11105", "11106"],
    subwayLines: ["N", "W"],
    keyStations: ["Astoria-Ditmars Blvd", "Astoria Blvd", "30th Ave", "Broadway", "Steinway St"],
    aspDays: "Mon/Thu or Tue/Fri - varies by block",
    description: "Astoria is Queens' most accessible neighborhood, just one subway stop from Manhattan via the N/W trains. Once the Greek capital of America, it's now remarkably diverse with Middle Eastern, South Asian, and Latin American communities alongside longtime residents. The beer gardens and rooftop bars make it a nightlife destination.",
    highlights: [
      "Museum of the Moving Image",
      "Bohemian Hall beer garden",
      "Astoria Park & Hell Gate Bridge views",
      "Steinway Street shopping"
    ],
    keywords: ["astoria parking", "astoria queens", "ditmars astoria", "steinway street"]
  },
  {
    slug: "long-island-city",
    name: "Long Island City",
    borough: "Queens",
    zipCodes: ["11101", "11109"],
    subwayLines: ["7", "E", "M", "G"],
    keyStations: ["Court Sq", "Queensboro Plaza", "Hunters Point Ave", "Vernon Blvd-Jackson Ave"],
    aspDays: "Commercial areas vary - residential similar to Astoria",
    description: "Long Island City has transformed from industrial waterfront to gleaming condo towers and cultural institutions. MoMA PS1, the Noguchi Museum, and Gantry Plaza State Park anchor the arts scene, while the skyline continues to rise with residential and commercial development.",
    highlights: [
      "MoMA PS1 contemporary art",
      "Gantry Plaza State Park",
      "Pepsi-Cola sign landmark",
      "East River ferry access"
    ],
    keywords: ["long island city parking", "lic queens", "moma ps1", "gantry plaza"]
  },
  {
    slug: "jackson-heights",
    name: "Jackson Heights",
    borough: "Queens",
    zipCodes: ["11372", "11373"],
    subwayLines: ["7", "E", "F", "M", "R"],
    keyStations: ["Jackson Heights-Roosevelt Ave", "74th St-Broadway", "82nd St-Jackson Heights"],
    aspDays: "Varies - many residential blocks Mon/Thu",
    description: "Jackson Heights is one of America's most ethnically diverse neighborhoods, home to thriving South Asian, Latin American, and LGBTQ+ communities. The historic garden apartment complexes (1920s-30s) were among the nation's first planned communities, and the commercial strips along Roosevelt and 37th Avenues showcase cuisines from around the world.",
    highlights: [
      "Little India/Little Bangladesh on 74th St",
      "Latin American food on Roosevelt Ave",
      "Historic garden apartments",
      "Diversity Plaza"
    ],
    keywords: ["jackson heights parking", "74th street", "jackson heights food", "roosevelt avenue queens"]
  },
  {
    slug: "flushing",
    name: "Flushing",
    borough: "Queens",
    zipCodes: ["11354", "11355", "11358"],
    subwayLines: ["7"],
    keyStations: ["Flushing-Main St"],
    aspDays: "Commercial center - metered parking dominant",
    description: "Flushing is the largest and oldest Chinatown in NYC, surpassing Manhattan's original. The neighborhood around Main Street is a bustling commercial hub with Chinese, Korean, and other Asian businesses. Nearby, Flushing Meadows-Corona Park hosts the US Open tennis championships.",
    highlights: [
      "Largest Chinatown in NYC",
      "Flushing Meadows-Corona Park",
      "US Open at Arthur Ashe Stadium",
      "New World Mall food court"
    ],
    keywords: ["flushing parking", "flushing chinatown", "main street flushing", "us open parking"]
  },
  // BRONX
  {
    slug: "south-bronx",
    name: "South Bronx",
    borough: "Bronx",
    zipCodes: ["10451", "10452", "10454", "10455", "10459"],
    subwayLines: ["2", "4", "5", "6", "B", "D"],
    keyStations: ["149th St-Grand Concourse", "138th St-Grand Concourse", "3rd Ave-138th St"],
    aspDays: "Varies - check street signs",
    description: "The South Bronx, birthplace of hip-hop, has undergone dramatic revitalization since its 1970s nadir. Yankee Stadium anchors the area, the Grand Concourse features Art Deco architecture, and new waterfront developments along the Harlem River are changing the skyline.",
    highlights: [
      "Yankee Stadium",
      "Grand Concourse Art Deco buildings",
      "Hip-hop birthplace",
      "Bronx Museum of the Arts"
    ],
    keywords: ["south bronx parking", "yankee stadium parking", "grand concourse", "149th street"]
  },
  {
    slug: "riverdale",
    name: "Riverdale",
    borough: "Bronx",
    zipCodes: ["10463", "10471"],
    subwayLines: ["1"],
    keyStations: ["231st St", "238th St", "Van Cortlandt Park-242nd St"],
    aspDays: "Residential areas - Mon/Thu or Tue/Fri",
    description: "Riverdale is the Bronx's most affluent neighborhood, featuring estate homes, private schools, and wooded areas along the Hudson River. Wave Hill, a public garden and cultural center, offers stunning river views and programming. The neighborhood feels suburban despite being in NYC.",
    highlights: [
      "Wave Hill gardens and cultural center",
      "Van Cortlandt Park",
      "Manhattan College",
      "Hudson River views"
    ],
    keywords: ["riverdale parking", "riverdale bronx", "wave hill", "van cortlandt park"]
  },
  // STATEN ISLAND
  {
    slug: "st-george",
    name: "St. George",
    borough: "Staten Island",
    zipCodes: ["10301", "10310"],
    subwayLines: ["SIR"], // Staten Island Railway
    keyStations: ["St. George Terminal"],
    aspDays: "Varies - less enforcement than other boroughs",
    description: "St. George is Staten Island's civic center and ferry terminal. The free Staten Island Ferry provides one of NYC's best free attractions - views of the Statue of Liberty and lower Manhattan skyline. The neighborhood features Victorian architecture, a minor league baseball stadium, and growing arts scene.",
    highlights: [
      "Staten Island Ferry (free)",
      "Richmond County Bank Ballpark",
      "National Lighthouse Museum",
      "Snug Harbor Cultural Center nearby"
    ],
    keywords: ["staten island ferry parking", "st george staten island", "snug harbor", "staten island parking"]
  }
];

/**
 * Get a neighborhood by slug
 */
export function getNeighborhoodBySlug(slug: string): Neighborhood | undefined {
  return neighborhoods.find(n => n.slug === slug);
}

/**
 * Get all neighborhoods for static path generation
 */
export function getAllNeighborhoodSlugs(): string[] {
  return neighborhoods.map(n => n.slug);
}

/**
 * Get neighborhoods by borough
 */
export function getNeighborhoodsByBorough(borough: Neighborhood["borough"]): Neighborhood[] {
  return neighborhoods.filter(n => n.borough === borough);
}
