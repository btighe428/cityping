/**
 * INTELLIGENT CLUSTER NAMING SERVICE
 *
 * Generates descriptive names for topic clusters instead of using the first article's title.
 * Examples:
 * - "Subway Fire at Union Square" (not just "Fire on L Train")
 * - "Budget Vote at City Hall" (not just "Council Meets Today")
 * - "Accident on Brooklyn Bridge" (not just "Traffic Delay")
 */

// NYC location patterns for extraction
const LOCATION_PATTERNS = [
  // Major landmarks
  /\b(Union Square|Times Square|Central Park|Grand Central|Penn Station|JFK Airport|LaGuardia|Newark Airport|Brooklyn Bridge|Manhattan Bridge|Williamsburg Bridge|George Washington Bridge)\b/gi,
  // Neighborhoods
  /\b(Upper East Side|Upper West Side|Midtown|Downtown|East Village|West Village|SoHo|TriBeCa|NoHo|NoLita|Harlem|East Harlem|Chelsea|Gramercy|Murray Hill|Kips Bay|Lower East Side|Chinatown|Little Italy|Financial District|Battery Park|Two Bridges)\b/gi,
  // Brooklyn neighborhoods
  /\b(Williamsburg|Greenpoint|Bushwick|Bed-Stuy|Bedford-Stuyvesant|Crown Heights|Park Slope|Prospect Heights|DUMBO|Brooklyn Heights|Cobble Hill|Carroll Gardens|Red Hook|Sunset Park|Bay Ridge|Flatbush|Ditmas Park|Prospect Lefferts|Fort Greene|Clinton Hill|Gowanus|Boerum Hill|Downtown Brooklyn|Brownsville|East New York|Coney Island|Brighton Beach)\b/gi,
  // Queens neighborhoods
  /\b(Astoria|Long Island City|LIC|Sunnyside|Woodside|Jackson Heights|Flushing|Forest Hills|Rego Park|Jamaica|Ridgewood|Maspeth|Elmhurst|Corona|Bayside|Fresh Meadows|Howard Beach|Rockaways)\b/gi,
  // Bronx neighborhoods
  /\b(South Bronx|Mott Haven|Hunts Point|Fordham|Riverdale|Kingsbridge|Morris Park|Pelham Bay|City Island|Highbridge|Tremont|Belmont|West Farms)\b/gi,
  // Staten Island neighborhoods
  /\b(St. George|Tomkinsville|Stapleton|Rosebank|South Beach|Tottenville|Great Kills|New Dorp)\b/gi,
  // Boroughs
  /\b(Queens|Brooklyn|Bronx|Staten Island|Manhattan)\b/gi,
  // Transit
  /\b([A-Z]\s+train|subway station|subway|metro|bus route|ferry terminal)\b/gi,
  // Generic location patterns
  /\b(?:in|at|on|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g,
];

// Event type patterns with priority order
const EVENT_PATTERNS = [
  { pattern: /\b(emergency|evacuation|shelter\s+in\s+place)\b/gi, name: "Emergency", priority: 100 },
  { pattern: /\b(fire|blaze|burning|flames)\b/gi, name: "Fire", priority: 95 },
  { pattern: /\b(shooting|gunfire|shots\s+fired)\b/gi, name: "Shooting", priority: 95 },
  { pattern: /\b(bomb|explosion|explosive)\b/gi, name: "Explosion", priority: 95 },
  { pattern: /\b(crash|collision|wreck|pileup)\b/gi, name: "Accident", priority: 90 },
  { pattern: /\b(delay|delays|suspended|service.*change|signal.*problem)\b/gi, name: "Transit Disruption", priority: 85 },
  { pattern: /\b(arrest|arrested|apprehended|in\s+custody)\b/gi, name: "Arrest", priority: 80 },
  { pattern: /\b(protest|demonstration|rally|march)\b/gi, name: "Protest", priority: 80 },
  { pattern: /\b(strike|walkout|picket)\b/gi, name: "Strike", priority: 80 },
  { pattern: /\b(budget|funding|appropriation)\b/gi, name: "Budget", priority: 75 },
  { pattern: /\b(vote|voting|election|ballot|passed|rejected)\b/gi, name: "Vote", priority: 75 },
  { pattern: /\b(hearing|testimony|inquiry|investigation)\b/gi, name: "Hearing", priority: 70 },
  { pattern: /\b(housing|rent|affordable|lottery|tenant|landlord)\b/gi, name: "Housing", priority: 70 },
  { pattern: /\b(weather|storm|snow|rain|heat|hurricane|tornado|flood)\b/gi, name: "Weather Alert", priority: 85 },
  { pattern: /\b(closure|closed|shut\s+down|suspended)\b/gi, name: "Closure", priority: 75 },
  { pattern: /\b(opening|opens|launched|debut)\b/gi, name: "Opening", priority: 70 },
  { pattern: /\b(deadline|due|expires|last\s+day)\b/gi, name: "Deadline", priority: 75 },
  { pattern: /\b(free|complimentary|no\s+charge)\b/gi, name: "Free Event", priority: 65 },
  { pattern: /\b(sale|discount|deal|promotion)\b/gi, name: "Sale", priority: 60 },
  { pattern: /\b(meeting|council|committee|board)\b/gi, name: "Meeting", priority: 60 },
  { pattern: /\b(construction|renovation|repair|maintenance)\b/gi, name: "Construction", priority: 60 },
];

// Stop words to exclude from extracted terms
const STOP_WORDS = new Set([
  "after", "before", "during", "while", "where", "when", "what", "about",
  "says", "said", "say", "according", "report", "reports", "news", "nyc", "city",
  "york", "new", "update", "breaking", "latest", "more", "some", "many",
  "most", "other", "such", "only", "own", "same", "than", "too", "very",
  "just", "now", "then", "here", "there", "up", "down", "out", "off", "over",
  "under", "again", "further", "once", "who", "which", "whom", "this", "that",
]);

interface ClusterArticle {
  id: string;
  title: string;
  snippet?: string | null;
  source: string;
  score?: number;
}

interface ClusterNameResult {
  name: string;
  confidence: number; // 0-1
  eventType?: string;
  location?: string;
  sources: string[];
}

/**
 * Generate an intelligent name for a cluster of related articles.
 */
export function generateClusterName(
  clusterId: string,
  articles: ClusterArticle[]
): ClusterNameResult {
  if (articles.length === 0) {
    return { name: "Unknown Topic", confidence: 0, sources: [] };
  }
  
  if (articles.length === 1) {
    return { 
      name: articles[0].title, 
      confidence: 1, 
      sources: [articles[0].source] 
    };
  }

  // Combine all text for analysis
  const allTitles = articles.map(a => a.title).join(" ");
  const allSnippets = articles.map(a => a.snippet || "").join(" ");
  const combinedText = `${allTitles} ${allSnippets}`;

  // Extract event type (highest priority match)
  let eventType = "";
  let highestPriority = 0;
  for (const { pattern, name, priority } of EVENT_PATTERNS) {
    if (pattern.test(combinedText) && priority > highestPriority) {
      eventType = name;
      highestPriority = priority;
    }
  }

  // Extract location (most frequently mentioned across articles)
  let location = "";
  let locationCount = 0;
  const locationMatches = new Map<string, number>();

  for (const pattern of LOCATION_PATTERNS) {
    const matches = combinedText.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Clean up the match
        const cleanMatch = match
          .replace(/^(in|at|on|near)\s+/i, "")
        .trim();
        if (cleanMatch.length > 2) {
          const count = (locationMatches.get(cleanMatch) || 0) + 1;
          locationMatches.set(cleanMatch, count);
          if (count > locationCount) {
            location = cleanMatch;
            locationCount = count;
          }
        }
      }
    }
  }

  // Also check for locations mentioned in majority of individual articles
  // (more reliable than just frequency)
  const perArticleLocations = new Map<string, number>();
  for (const article of articles) {
    const text = `${article.title} ${article.snippet || ""}`;
    const foundInArticle = new Set<string>();
    for (const pattern of LOCATION_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanMatch = match.replace(/^(in|at|on|near)\s+/i, "").trim();
          if (cleanMatch.length > 2) {
            foundInArticle.add(cleanMatch);
          }
        }
      }
    }
    for (const loc of foundInArticle) {
      perArticleLocations.set(loc, (perArticleLocations.get(loc) || 0) + 1);
    }
  }

  // Prefer locations appearing in majority of articles
  const majorityThreshold = Math.ceil(articles.length * 0.4); // 40% of articles
  for (const [loc, count] of perArticleLocations) {
    if (count >= majorityThreshold && count > (locationMatches.get(location) || 0)) {
      location = loc;
      locationCount = count;
    }
  }

  // Generate name based on what we found
  let name = "";
  let confidence = 0.5;

  if (eventType && location) {
    name = `${eventType} at ${location}`;
    confidence = 0.9;
  } else if (eventType) {
    name = `${eventType} (Multiple Locations)`;
    confidence = 0.75;
  } else if (location) {
    name = `Incident at ${location}`;
    confidence = 0.6;
  } else {
    // Fallback: Extract most common significant words
    name = extractCommonTheme(articles);
    confidence = 0.4;
  }

  // Add source diversity indicator if multiple sources
  const uniqueSources = [...new Set(articles.map(a => a.source))];
  if (uniqueSources.length > 2 && confidence > 0.5) {
    // Name is good, keep it
  }

  return {
    name,
    confidence,
    eventType: eventType || undefined,
    location: location || undefined,
    sources: uniqueSources,
  };
}

/**
 * Extract common theme from articles as fallback naming.
 */
function extractCommonTheme(articles: ClusterArticle[]): string {
  const allTitles = articles.map(a => a.title).join(" ");
  
  // Extract significant words
  const words = allTitles
    .toLowerCase()
    .match(/\b[a-z]{5,}\b/g) || [];
  
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    if (!STOP_WORDS.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }
  
  const topWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  
  if (topWords.length >= 2) {
    return `${topWords.join(" ")} Coverage`;
  }
  
  // Ultimate fallback: best article title
  const bestArticle = articles.reduce((best, current) => 
    (current.score || 0) > (best.score || 0) ? current : best
  );
  return bestArticle.title.slice(0, 60);
}

/**
 * Generate a summary description for a cluster.
 */
export function generateClusterSummary(
  articles: ClusterArticle[]
): string {
  if (articles.length === 0) return "";
  if (articles.length === 1) return articles[0].snippet || "";
  
  const { name, eventType, location, sources } = generateClusterName("temp", articles);
  const sourceList = sources.slice(0, 3).join(", ");
  const moreSources = sources.length > 3 ? ` and ${sources.length - 3} more` : "";
  
  let summary = `Coverage of ${name.toLowerCase()}`;
  if (eventType && location) {
    summary = `${eventType} reported at ${location}`;
  }
  
  return `${summary}. Reported by ${sourceList}${moreSources} (${articles.length} articles)`;
}
