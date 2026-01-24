/**
 * NYC NEWS SOURCES REGISTRY
 *
 * A comprehensive catalog of NYC news sources organized by tier and category.
 * Each source includes RSS feed URL, editorial focus, and relevance scoring hints.
 *
 * TIER SYSTEM:
 * - Tier 1: Essential daily reads - high volume, broad NYC coverage
 * - Tier 2: Specialized beats - transit, housing, policy, borough-specific
 * - Tier 3: Niche/hyperlocal - neighborhood-level, specific communities
 *
 * CATEGORY TAXONOMY:
 * - general: Broad NYC news coverage
 * - transit: Subway, buses, bikes, streets
 * - housing: Real estate, rentals, policy, lotteries
 * - policy: City government, budgets, elections
 * - borough: Borough-specific coverage
 * - business: NYC economy, startups, jobs
 * - culture: Arts, food, entertainment
 * - crime: Public safety, courts
 */

export interface NewsSource {
  id: string;
  name: string;
  rssUrl: string;
  tier: 1 | 2 | 3;
  category: "general" | "transit" | "housing" | "policy" | "borough" | "business" | "culture" | "crime";
  borough?: "manhattan" | "brooklyn" | "queens" | "bronx" | "staten_island" | "all";
  description: string;
  /** Base relevance multiplier (1.0 = neutral, >1 = boosted, <1 = reduced) */
  relevanceMultiplier: number;
  /** Topics this source excels at */
  strongTopics: string[];
  /** Whether this source is currently active */
  enabled: boolean;
}

// =============================================================================
// TIER 1: ESSENTIAL NYC NEWS (Daily, High Volume, Broad Coverage)
// =============================================================================

const TIER_1_SOURCES: NewsSource[] = [
  {
    id: "gothamist",
    name: "Gothamist",
    rssUrl: "https://gothamist.com/feed",
    tier: 1,
    category: "general",
    borough: "all",
    description: "WNYC-owned NYC news. Gold standard for local coverage since 2003.",
    relevanceMultiplier: 1.2,
    strongTopics: ["transit", "housing", "politics", "culture", "food"],
    enabled: true,
  },
  {
    id: "thecity",
    name: "THE CITY",
    rssUrl: "https://www.thecity.nyc/feed/",
    tier: 1,
    category: "policy",
    borough: "all",
    description: "Nonprofit investigative journalism. Deep dives on housing, education, accountability.",
    relevanceMultiplier: 1.3,
    strongTopics: ["housing", "education", "government", "investigations", "tenant-rights"],
    enabled: true,
  },
  {
    id: "nypost",
    name: "New York Post",
    rssUrl: "https://nypost.com/feed/",
    tier: 1,
    category: "general",
    borough: "all",
    description: "Tabloid with breaking news. Fast on crime, transit delays, city drama.",
    relevanceMultiplier: 0.9, // Slightly reduced - sensationalism filter
    strongTopics: ["crime", "transit", "breaking", "sports", "celebrities"],
    enabled: true,
  },
  {
    id: "nydailynews",
    name: "NY Daily News",
    rssUrl: "https://www.nydailynews.com/feed/",
    tier: 1,
    category: "general",
    borough: "all",
    description: "NYC tabloid since 1919. Strong on local politics, crime, sports.",
    relevanceMultiplier: 0.9,
    strongTopics: ["politics", "crime", "sports", "transit"],
    enabled: true,
  },
  {
    id: "amny",
    name: "amNewYork",
    rssUrl: "https://www.amny.com/feed/",
    tier: 1,
    category: "general",
    borough: "all",
    description: "Free daily commuter paper. Quick hits on transit, events, deals.",
    relevanceMultiplier: 1.0,
    strongTopics: ["transit", "events", "deals", "commute"],
    enabled: true,
  },
  {
    id: "hellgate",
    name: "Hell Gate",
    rssUrl: "https://hellgatenyc.com/all-posts/rss/",
    tier: 1,
    category: "general",
    borough: "all",
    description: "Independent NYC news by ex-Gothamist/DNAinfo reporters. Sharp, local, irreverent.",
    relevanceMultiplier: 1.2,
    strongTopics: ["politics", "housing", "transit", "culture", "labor"],
    enabled: true,
  },
];

// =============================================================================
// TIER 2: SPECIALIZED BEATS (Transit, Housing, Policy, Borough)
// =============================================================================

const TIER_2_SOURCES: NewsSource[] = [
  // --- TRANSIT ---
  {
    id: "streetsblog",
    name: "Streetsblog NYC",
    rssUrl: "https://nyc.streetsblog.org/feed/",
    tier: 2,
    category: "transit",
    borough: "all",
    description: "Urbanist lens on transit, bikes, pedestrians, streets. Policy-focused.",
    relevanceMultiplier: 1.3,
    strongTopics: ["subway", "buses", "bikes", "congestion-pricing", "vision-zero", "dot"],
    enabled: true,
  },
  {
    id: "secondavenuesagas",
    name: "Second Avenue Sagas",
    rssUrl: "https://secondavenuesagas.com/feed/",
    tier: 2,
    category: "transit",
    borough: "all",
    description: "Deep MTA analysis. Capital projects, service changes, transit history.",
    relevanceMultiplier: 1.2,
    strongTopics: ["mta", "subway", "capital-projects", "service-changes"],
    enabled: true,
  },

  // --- HOUSING & REAL ESTATE ---
  {
    id: "curbed",
    name: "Curbed NY",
    rssUrl: "https://www.curbed.com/rss/index.xml",
    tier: 2,
    category: "housing",
    borough: "all",
    description: "Real estate, architecture, neighborhoods. Now part of NY Mag.",
    relevanceMultiplier: 1.1,
    strongTopics: ["development", "architecture", "neighborhoods", "rent", "housing-market"],
    enabled: true,
  },
  {
    id: "therealdeal",
    name: "The Real Deal",
    rssUrl: "https://therealdeal.com/new-york/feed/",
    tier: 2,
    category: "housing",
    borough: "all",
    description: "NYC real estate industry bible. Deals, developers, market data.",
    relevanceMultiplier: 1.0,
    strongTopics: ["real-estate", "development", "luxury", "commercial", "deals"],
    enabled: true,
  },
  {
    id: "citylimits",
    name: "City Limits",
    rssUrl: "https://citylimits.org/feed/",
    tier: 2,
    category: "housing",
    borough: "all",
    description: "Nonprofit housing policy journalism. Tenant rights, affordable housing, homelessness.",
    relevanceMultiplier: 1.3,
    strongTopics: ["affordable-housing", "tenant-rights", "homelessness", "nycha", "vouchers"],
    enabled: true,
  },

  // --- POLICY & GOVERNMENT ---
  {
    id: "cityandstateny",
    name: "City & State NY",
    rssUrl: "https://www.cityandstateny.com/rss.xml",
    tier: 2,
    category: "policy",
    borough: "all",
    description: "Albany and City Hall coverage. Politics, policy, power players.",
    relevanceMultiplier: 1.1,
    strongTopics: ["albany", "city-council", "elections", "lobbying", "budget"],
    enabled: false, // No public RSS feed available
  },
  {
    id: "politicony",
    name: "POLITICO New York",
    rssUrl: "https://rss.politico.com/new-york-playbook.xml",
    tier: 2,
    category: "policy",
    borough: "all",
    description: "Daily political newsletter. Albany, City Hall, power dynamics.",
    relevanceMultiplier: 1.0,
    strongTopics: ["politics", "elections", "albany", "city-hall"],
    enabled: true,
  },

  // --- BOROUGH-SPECIFIC ---
  {
    id: "brooklynpaper",
    name: "Brooklyn Paper",
    rssUrl: "https://www.brooklynpaper.com/feed/",
    tier: 2,
    category: "borough",
    borough: "brooklyn",
    description: "Brooklyn community news since 1978. Local politics, development, events.",
    relevanceMultiplier: 1.0,
    strongTopics: ["brooklyn", "development", "local-politics", "events"],
    enabled: true,
  },
  {
    id: "queensdailyeagle",
    name: "Queens Daily Eagle",
    rssUrl: "https://queenseagle.com/all?format=rss",
    tier: 2,
    category: "borough",
    borough: "queens",
    description: "Queens legal and political news. Courts, government, community.",
    relevanceMultiplier: 1.0,
    strongTopics: ["queens", "courts", "politics", "community"],
    enabled: true,
  },
  {
    id: "bronxtimes",
    name: "Bronx Times",
    rssUrl: "https://www.bxtimes.com/feed/",
    tier: 2,
    category: "borough",
    borough: "bronx",
    description: "Bronx community newspaper. Local news, events, development.",
    relevanceMultiplier: 1.0,
    strongTopics: ["bronx", "community", "development", "local-news"],
    enabled: true,
  },
  {
    id: "siadvance",
    name: "Staten Island Advance",
    rssUrl: "https://www.silive.com/arc/outboundfeeds/rss/?outputType=xml",
    tier: 2,
    category: "borough",
    borough: "staten_island",
    description: "Staten Island's paper of record. Community news, politics, events.",
    relevanceMultiplier: 1.0,
    strongTopics: ["staten-island", "community", "politics", "ferry"],
    enabled: true,
  },

  // --- BUSINESS ---
  {
    id: "crainsny",
    name: "Crain's New York Business",
    rssUrl: "https://feeds.crainsnewyork.com/crainsnewyork/news",
    tier: 2,
    category: "business",
    borough: "all",
    description: "NYC business news. Companies, economy, real estate, healthcare.",
    relevanceMultiplier: 1.0,
    strongTopics: ["business", "economy", "jobs", "healthcare", "real-estate"],
    enabled: false, // RSS feed requires authentication
  },
];

// =============================================================================
// TIER 3: HYPERLOCAL & NICHE (Neighborhood-level, Specific Communities)
// =============================================================================

const TIER_3_SOURCES: NewsSource[] = [
  // --- PATCH NEIGHBORHOOD FEEDS ---
  {
    id: "patch-nyc",
    name: "Patch NYC",
    rssUrl: "https://patch.com/new-york/new-york-city/rss",
    tier: 3,
    category: "general",
    borough: "all",
    description: "Hyperlocal news network. Breaking news, police reports, community.",
    relevanceMultiplier: 0.8,
    strongTopics: ["breaking", "crime", "community", "events"],
    enabled: false, // Patch has no native RSS - disabled
  },
  {
    id: "patch-uws",
    name: "Patch Upper West Side",
    rssUrl: "https://patch.com/new-york/upper-west-side/rss",
    tier: 3,
    category: "general",
    borough: "manhattan",
    description: "Upper West Side hyperlocal news.",
    relevanceMultiplier: 0.8,
    strongTopics: ["uws", "community", "local"],
    enabled: false, // Patch has no native RSS
  },
  {
    id: "patch-ues",
    name: "Patch Upper East Side",
    rssUrl: "https://patch.com/new-york/upper-east-side-ny/rss",
    tier: 3,
    category: "general",
    borough: "manhattan",
    description: "Upper East Side hyperlocal news.",
    relevanceMultiplier: 0.8,
    strongTopics: ["ues", "community", "local"],
    enabled: false, // Patch has no native RSS
  },
  {
    id: "patch-eastvillage",
    name: "Patch East Village",
    rssUrl: "https://patch.com/new-york/east-village/rss",
    tier: 3,
    category: "general",
    borough: "manhattan",
    description: "East Village hyperlocal news.",
    relevanceMultiplier: 0.8,
    strongTopics: ["east-village", "community", "local"],
    enabled: false, // Patch has no native RSS
  },
  {
    id: "patch-williamsburg",
    name: "Patch Williamsburg",
    rssUrl: "https://patch.com/new-york/williamsburg/rss",
    tier: 3,
    category: "general",
    borough: "brooklyn",
    description: "Williamsburg hyperlocal news.",
    relevanceMultiplier: 0.8,
    strongTopics: ["williamsburg", "community", "local"],
    enabled: false, // Patch has no native RSS
  },
  {
    id: "patch-parkslope",
    name: "Patch Park Slope",
    rssUrl: "https://patch.com/new-york/park-slope/rss",
    tier: 3,
    category: "general",
    borough: "brooklyn",
    description: "Park Slope hyperlocal news.",
    relevanceMultiplier: 0.8,
    strongTopics: ["park-slope", "community", "local"],
    enabled: false, // Patch has no native RSS
  },
  {
    id: "patch-astoria",
    name: "Patch Astoria-Long Island City",
    rssUrl: "https://patch.com/new-york/astoria-long-island-city/rss",
    tier: 3,
    category: "general",
    borough: "queens",
    description: "Astoria/LIC hyperlocal news.",
    relevanceMultiplier: 0.8,
    strongTopics: ["astoria", "lic", "community", "local"],
    enabled: false, // Patch has no native RSS
  },

  // --- MANHATTAN HYPERLOCAL ---
  {
    id: "westsiderag",
    name: "West Side Rag",
    rssUrl: "https://www.westsiderag.com/feed",
    tier: 3,
    category: "general",
    borough: "manhattan",
    description: "Upper West Side community blog. Neighborhood character, local politics.",
    relevanceMultiplier: 0.9,
    strongTopics: ["uws", "community", "development", "restaurants"],
    enabled: true,
  },
  {
    id: "thelodownny",
    name: "The Lo-Down",
    rssUrl: "https://www.thelodownny.com/leslog/feed/",
    tier: 3,
    category: "general",
    borough: "manhattan",
    description: "Lower East Side community news. Local business, development, culture.",
    relevanceMultiplier: 0.9,
    strongTopics: ["les", "community", "restaurants", "development"],
    enabled: true,
  },
  {
    id: "evgrieve",
    name: "EV Grieve",
    rssUrl: "https://evgrieve.com/feeds/posts/default?alt=rss",
    tier: 3,
    category: "general",
    borough: "manhattan",
    description: "East Village community blog. Neighborhood preservation, local business.",
    relevanceMultiplier: 0.9,
    strongTopics: ["east-village", "community", "development", "restaurants"],
    enabled: true,
  },

  // --- BROOKLYN HYPERLOCAL ---
  {
    id: "bklyner",
    name: "Bklyner",
    rssUrl: "https://bklyner.com/feed/",
    tier: 3,
    category: "general",
    borough: "brooklyn",
    description: "Brooklyn neighborhood news. Community board coverage, local politics.",
    relevanceMultiplier: 0.9,
    strongTopics: ["brooklyn", "community-boards", "development", "local"],
    enabled: true,
  },
  {
    id: "brownstoner",
    name: "Brownstoner",
    rssUrl: "https://www.brownstoner.com/feed/",
    tier: 3,
    category: "housing",
    borough: "brooklyn",
    description: "Brooklyn real estate and architecture. Brownstone renovations, market.",
    relevanceMultiplier: 0.9,
    strongTopics: ["brownstones", "real-estate", "architecture", "brooklyn"],
    enabled: true,
  },

  // --- QUEENS HYPERLOCAL ---
  {
    id: "qns",
    name: "QNS.com",
    rssUrl: "https://qns.com/feed/",
    tier: 3,
    category: "general",
    borough: "queens",
    description: "Queens community news. Neighborhoods, events, local business.",
    relevanceMultiplier: 0.9,
    strongTopics: ["queens", "community", "events", "local"],
    enabled: true,
  },

  // --- CULTURE & FOOD ---
  {
    id: "eaborhood",
    name: "Eater NY",
    rssUrl: "https://ny.eater.com/rss/index.xml",
    tier: 3,
    category: "culture",
    borough: "all",
    description: "NYC restaurant news. Openings, closings, reviews, trends.",
    relevanceMultiplier: 0.8,
    strongTopics: ["restaurants", "food", "bars", "openings", "closings"],
    enabled: true,
  },
  {
    id: "timeout",
    name: "Time Out New York",
    rssUrl: "https://www.timeout.com/newyork/blog/feed.rss",
    tier: 3,
    category: "culture",
    borough: "all",
    description: "NYC events, restaurants, things to do. Weekend planning.",
    relevanceMultiplier: 0.7,
    strongTopics: ["events", "restaurants", "bars", "things-to-do"],
    enabled: true,
  },
];

// =============================================================================
// COMBINED REGISTRY
// =============================================================================

export const ALL_NEWS_SOURCES: NewsSource[] = [
  ...TIER_1_SOURCES,
  ...TIER_2_SOURCES,
  ...TIER_3_SOURCES,
];

/**
 * Get all enabled news sources.
 */
export function getEnabledSources(): NewsSource[] {
  return ALL_NEWS_SOURCES.filter((s) => s.enabled);
}

/**
 * Get sources by tier.
 */
export function getSourcesByTier(tier: 1 | 2 | 3): NewsSource[] {
  return ALL_NEWS_SOURCES.filter((s) => s.enabled && s.tier === tier);
}

/**
 * Get sources by category.
 */
export function getSourcesByCategory(category: NewsSource["category"]): NewsSource[] {
  return ALL_NEWS_SOURCES.filter((s) => s.enabled && s.category === category);
}

/**
 * Get sources by borough.
 */
export function getSourcesByBorough(borough: NewsSource["borough"]): NewsSource[] {
  return ALL_NEWS_SOURCES.filter(
    (s) => s.enabled && (s.borough === borough || s.borough === "all")
  );
}

/**
 * Get source by ID.
 */
export function getSourceById(id: string): NewsSource | undefined {
  return ALL_NEWS_SOURCES.find((s) => s.id === id);
}

// =============================================================================
// STATISTICS
// =============================================================================

export function getSourceStats(): {
  total: number;
  enabled: number;
  byTier: Record<number, number>;
  byCategory: Record<string, number>;
  byBorough: Record<string, number>;
} {
  const enabled = getEnabledSources();

  const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const byCategory: Record<string, number> = {};
  const byBorough: Record<string, number> = {};

  for (const source of enabled) {
    byTier[source.tier]++;
    byCategory[source.category] = (byCategory[source.category] || 0) + 1;
    if (source.borough) {
      byBorough[source.borough] = (byBorough[source.borough] || 0) + 1;
    }
  }

  return {
    total: ALL_NEWS_SOURCES.length,
    enabled: enabled.length,
    byTier,
    byCategory,
    byBorough,
  };
}
