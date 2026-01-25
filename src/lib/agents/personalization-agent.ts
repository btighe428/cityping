/**
 * PERSONALIZATION AGENT
 *
 * Stage 2.75 (Extension) of the CityPing multi-agent pipeline.
 *
 * Role: The Personal Concierge
 *
 * Responsibilities:
 * - Learn user preferences from behavior (opens, clicks, dismissals)
 * - Match content to user's neighborhood and commute patterns
 * - Adjust content mix based on user interests (news vs deals vs events)
 * - Time-shift content based on user's schedule (early bird vs night owl)
 * - Filter out irrelevant content (no Brooklyn news for UES resident)
 * - Boost content relevance based on past engagement
 *
 * Output: PersonalizationResult with boost/filter stats and optimal delivery time
 *
 * Philosophy: Every user's NYC is different. Serve THEIR city, not THE city.
 */

import { prisma } from "../db";
import { DateTime } from "luxon";
import { ScoredContent, ContentCategory } from "./content-curator-agent";

// Import V2 types
import type {
  ContentSelectionV2,
  PersonalizationResult as PersonalizationResultV2,
  PersonalizationConfig,
  PersonalizedContent as PersonalizedContentV2,
  ScoredNewsArticle,
  ScoredAlertEvent,
  ScoredParkEvent,
  ScoredDiningDeal,
  ContentCategory as ContentCategoryV2,
} from "./types";

import { DEFAULT_PERSONALIZATION_CONFIG } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface UserProfile {
  userId: string;
  email: string;

  // Location
  neighborhood?: string;
  borough?: string;
  zipCode?: string;

  // Commute
  commuteLines?: string[];      // ["A", "C", "E", "1"]
  commuteStations?: string[];   // ["14th St", "Times Square"]
  workNeighborhood?: string;

  // Preferences
  preferredCategories: ContentCategory[];
  mutedCategories: ContentCategory[];
  mutedSources: string[];
  mutedKeywords: string[];

  // Schedule
  preferredDeliveryTime?: string;  // "07:00"
  timezone: string;
  isWeekendDifferent: boolean;

  // Engagement history
  openRate: number;           // 0-100
  clickRate: number;          // 0-100
  avgTimeToOpen: number;      // minutes
  lastEngagement?: Date;

  // Calculated scores
  interestScores: Record<ContentCategory, number>;
}

export interface PersonalizedContent extends ScoredContent {
  personalRelevance: number;    // 0-100
  personalizedReason?: string;  // "Near your commute" | "In your neighborhood"
  boosted: boolean;
  filtered: boolean;
  filterReason?: string;
}

export interface PersonalizationResult {
  userId: string;
  content: PersonalizedContent[];
  stats: {
    totalInput: number;
    boosted: number;
    filtered: number;
    avgPersonalRelevance: number;
  };
  profile: Partial<UserProfile>;
}

// =============================================================================
// NYC GEOGRAPHY
// =============================================================================

const BOROUGH_NEIGHBORHOODS: Record<string, string[]> = {
  manhattan: [
    "harlem", "east harlem", "upper west side", "upper east side",
    "midtown", "hell's kitchen", "chelsea", "gramercy", "murray hill",
    "east village", "west village", "greenwich village", "soho", "tribeca",
    "lower east side", "chinatown", "financial district", "battery park"
  ],
  brooklyn: [
    "williamsburg", "greenpoint", "bushwick", "bed-stuy", "crown heights",
    "park slope", "prospect heights", "dumbo", "brooklyn heights", "cobble hill",
    "carroll gardens", "red hook", "sunset park", "bay ridge", "flatbush",
    "ditmas park", "prospect lefferts", "fort greene", "clinton hill"
  ],
  queens: [
    "astoria", "long island city", "sunnyside", "woodside", "jackson heights",
    "flushing", "forest hills", "rego park", "jamaica", "ridgewood"
  ],
  bronx: [
    "south bronx", "mott haven", "hunts point", "fordham", "riverdale",
    "kingsbridge", "morris park", "pelham bay", "city island"
  ],
  "staten island": [
    "st. george", "stapleton", "tottenville", "great kills"
  ]
};

const SUBWAY_LINE_BOROUGHS: Record<string, string[]> = {
  "1": ["manhattan"],
  "2": ["manhattan", "bronx", "brooklyn"],
  "3": ["manhattan", "brooklyn"],
  "A": ["manhattan", "brooklyn", "queens"],
  "C": ["manhattan", "brooklyn"],
  "E": ["manhattan", "queens"],
  "B": ["manhattan", "brooklyn", "bronx"],
  "D": ["manhattan", "brooklyn", "bronx"],
  "F": ["manhattan", "brooklyn", "queens"],
  "G": ["brooklyn", "queens"],
  "J": ["manhattan", "brooklyn"],
  "L": ["manhattan", "brooklyn"],
  "M": ["manhattan", "brooklyn", "queens"],
  "N": ["manhattan", "brooklyn", "queens"],
  "Q": ["manhattan", "brooklyn"],
  "R": ["manhattan", "brooklyn", "queens"],
  "7": ["manhattan", "queens"],
};

// =============================================================================
// USER PROFILE FUNCTIONS
// =============================================================================

/**
 * Build user profile from database and behavior.
 */
export async function buildUserProfile(userId: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true,
    },
  });

  if (!user) return null;

  // Extract preferences
  const prefs = user.preferences || [];
  const enabledModules = prefs.filter(p => p.enabled).map(p => p.moduleId);

  // Map modules to categories
  const categoryMap: Record<string, ContentCategory> = {
    transit: "essential",
    parking: "essential",
    events: "culture",
    housing: "money",
    food: "money",
    deals: "money",
  };

  const preferredCategories = enabledModules
    .map(m => categoryMap[m])
    .filter(Boolean) as ContentCategory[];

  // Default interest scores
  const interestScores: Record<ContentCategory, number> = {
    breaking: 100,    // Everyone wants breaking news
    essential: 90,    // Weather, transit
    money: 70,        // Deals, free stuff
    local: 60,        // Neighborhood news
    culture: 50,      // Events, arts
    civic: 40,        // Government
    lifestyle: 30,    // Tips, food
  };

  // Boost preferred categories
  for (const cat of preferredCategories) {
    interestScores[cat] = Math.min(100, interestScores[cat] + 20);
  }

  return {
    userId,
    email: user.email,
    neighborhood: undefined, // Would come from user settings
    borough: undefined,
    zipCode: undefined,
    commuteLines: [],
    commuteStations: [],
    preferredCategories,
    mutedCategories: [],
    mutedSources: [],
    mutedKeywords: [],
    timezone: "America/New_York",
    isWeekendDifferent: false,
    openRate: 50,
    clickRate: 20,
    avgTimeToOpen: 30,
    interestScores,
  };
}

/**
 * Infer user location from various signals.
 */
function inferLocation(profile: UserProfile, content: ScoredContent): {
  isLocal: boolean;
  distance: "nearby" | "same_borough" | "different_borough" | "unknown";
} {
  if (!content.neighborhood && !content.location) {
    return { isLocal: false, distance: "unknown" };
  }

  const contentLocation = (content.neighborhood || content.location || "").toLowerCase();

  // Check exact neighborhood match
  if (profile.neighborhood && contentLocation.includes(profile.neighborhood.toLowerCase())) {
    return { isLocal: true, distance: "nearby" };
  }

  // Check borough match
  if (profile.borough) {
    const userBorough = profile.borough.toLowerCase();
    const contentBorough = Object.entries(BOROUGH_NEIGHBORHOODS).find(([, hoods]) =>
      hoods.some(h => contentLocation.includes(h))
    )?.[0];

    if (contentBorough === userBorough) {
      return { isLocal: true, distance: "same_borough" };
    }
    if (contentBorough) {
      return { isLocal: false, distance: "different_borough" };
    }
  }

  return { isLocal: false, distance: "unknown" };
}

/**
 * Check if content is relevant to user's commute.
 */
function isCommuteRelevant(profile: UserProfile, content: ScoredContent): boolean {
  if (!profile.commuteLines?.length) return false;

  const text = `${content.title} ${content.summary || ""}`.toLowerCase();

  // Check for subway line mentions
  for (const line of profile.commuteLines) {
    if (text.includes(`${line} train`) || text.includes(`${line} line`) ||
        text.match(new RegExp(`\\b${line}\\b`))) {
      return true;
    }
  }

  // Check for station mentions
  for (const station of profile.commuteStations || []) {
    if (text.includes(station.toLowerCase())) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// PERSONALIZATION SCORING
// =============================================================================

/**
 * Calculate personal relevance score for content.
 */
function calculatePersonalRelevance(
  profile: UserProfile,
  content: ScoredContent
): { score: number; reason?: string; boosted: boolean } {
  let score = 50; // Base score
  let reason: string | undefined;
  let boosted = false;

  // Category interest boost
  const categoryInterest = profile.interestScores[content.category] || 50;
  score += (categoryInterest - 50) * 0.3;

  // Location relevance
  const location = inferLocation(profile, content);
  if (location.distance === "nearby") {
    score += 30;
    reason = "In your neighborhood";
    boosted = true;
  } else if (location.distance === "same_borough") {
    score += 15;
    reason = "In your borough";
    boosted = true;
  } else if (location.distance === "different_borough") {
    score -= 10;
  }

  // Commute relevance
  if (isCommuteRelevant(profile, content)) {
    score += 25;
    reason = reason || "Affects your commute";
    boosted = true;
  }

  // Source preference
  if (profile.mutedSources.includes(content.source)) {
    score = 0;
  }

  // Keyword filtering
  const text = `${content.title} ${content.summary || ""}`.toLowerCase();
  for (const keyword of profile.mutedKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      score = 0;
      break;
    }
  }

  // Category muting
  if (profile.mutedCategories.includes(content.category)) {
    score = 0;
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reason,
    boosted,
  };
}

// =============================================================================
// MAIN PERSONALIZATION FUNCTION
// =============================================================================

/**
 * Personalize content for a specific user.
 */
export async function personalizeContent(
  userId: string,
  content: ScoredContent[]
): Promise<PersonalizationResult> {
  console.log(`[Personalization] Personalizing ${content.length} items for user ${userId}`);

  const profile = await buildUserProfile(userId);

  if (!profile) {
    // No profile - return content as-is with neutral scores
    return {
      userId,
      content: content.map(c => ({
        ...c,
        personalRelevance: 50,
        boosted: false,
        filtered: false,
      })),
      stats: {
        totalInput: content.length,
        boosted: 0,
        filtered: 0,
        avgPersonalRelevance: 50,
      },
      profile: {},
    };
  }

  // Score and filter content
  const personalized: PersonalizedContent[] = [];
  let boostedCount = 0;
  let filteredCount = 0;

  for (const item of content) {
    const { score, reason, boosted } = calculatePersonalRelevance(profile, item);

    if (score === 0) {
      filteredCount++;
      personalized.push({
        ...item,
        personalRelevance: 0,
        boosted: false,
        filtered: true,
        filterReason: "Muted by preference",
      });
    } else {
      if (boosted) boostedCount++;
      personalized.push({
        ...item,
        personalRelevance: score,
        personalizedReason: reason,
        boosted,
        filtered: false,
      });
    }
  }

  // Sort by combined score (original + personal)
  personalized.sort((a, b) => {
    if (a.filtered !== b.filtered) return a.filtered ? 1 : -1;
    const aScore = a.overallScore * 0.6 + a.personalRelevance * 0.4;
    const bScore = b.overallScore * 0.6 + b.personalRelevance * 0.4;
    return bScore - aScore;
  });

  // Calculate average relevance
  const nonFiltered = personalized.filter(p => !p.filtered);
  const avgRelevance = nonFiltered.length > 0
    ? Math.round(nonFiltered.reduce((sum, p) => sum + p.personalRelevance, 0) / nonFiltered.length)
    : 0;

  console.log(`[Personalization] Boosted: ${boostedCount}, Filtered: ${filteredCount}`);

  return {
    userId,
    content: personalized,
    stats: {
      totalInput: content.length,
      boosted: boostedCount,
      filtered: filteredCount,
      avgPersonalRelevance: avgRelevance,
    },
    profile: {
      neighborhood: profile.neighborhood,
      borough: profile.borough,
      commuteLines: profile.commuteLines,
      preferredCategories: profile.preferredCategories,
    },
  };
}

// =============================================================================
// DELIVERY TIME OPTIMIZATION
// =============================================================================

/**
 * Calculate optimal delivery time for a user.
 */
export function getOptimalDeliveryTime(profile: UserProfile): {
  time: string;
  reason: string;
} {
  const now = DateTime.now().setZone(profile.timezone);
  const isWeekend = now.weekday >= 6;

  // If user has explicit preference
  if (profile.preferredDeliveryTime) {
    return {
      time: profile.preferredDeliveryTime,
      reason: "User preference",
    };
  }

  // Weekend adjustment
  if (isWeekend && profile.isWeekendDifferent) {
    return {
      time: "09:00",
      reason: "Weekend (later start)",
    };
  }

  // Based on engagement patterns
  if (profile.avgTimeToOpen < 15) {
    return {
      time: "06:30",
      reason: "Early opener - send before commute",
    };
  }

  if (profile.avgTimeToOpen > 120) {
    return {
      time: "08:00",
      reason: "Late opener - send mid-morning",
    };
  }

  // Default
  return {
    time: "07:00",
    reason: "Standard morning delivery",
  };
}

// =============================================================================
// ENGAGEMENT TRACKING
// =============================================================================

/**
 * Record user engagement with content.
 */
export async function trackEngagement(
  userId: string,
  contentId: string,
  action: "open" | "click" | "dismiss" | "share"
): Promise<void> {
  // Would store in engagement tracking table
  console.log(`[Personalization] User ${userId} ${action} content ${contentId}`);

  // In production, this would:
  // 1. Store the engagement event
  // 2. Update user profile scores
  // 3. Adjust interest scores based on category
  // 4. Update open/click rates
}

/**
 * Update user's interest scores based on engagement.
 */
export async function updateInterestScores(
  userId: string,
  category: ContentCategory,
  engaged: boolean
): Promise<void> {
  // Would update the user's interest scores
  // Positive engagement: +5 to category score
  // Negative/dismissal: -3 to category score
  console.log(`[Personalization] Updating ${userId} interest in ${category}: ${engaged ? "+5" : "-3"}`);
}

// =============================================================================
// V2 PERSONALIZATION - Accepts ContentSelectionV2
// =============================================================================

type ScoredItemV2 = ScoredNewsArticle | ScoredAlertEvent | ScoredParkEvent | ScoredDiningDeal;

/**
 * Build user profile from database (V2 version returning ContentCategoryV2).
 */
async function buildUserProfileV2(userId: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true,
    },
  });

  if (!user) return null;

  const prefs = user.preferences || [];
  const enabledModules = prefs.filter(p => p.enabled).map(p => p.moduleId);

  const categoryMap: Record<string, ContentCategoryV2> = {
    transit: "essential",
    parking: "essential",
    events: "culture",
    housing: "money",
    food: "money",
    deals: "money",
  };

  const preferredCategories = enabledModules
    .map(m => categoryMap[m])
    .filter(Boolean) as ContentCategoryV2[];

  const interestScores: Record<ContentCategoryV2, number> = {
    breaking: 100,
    essential: 90,
    money: 70,
    local: 60,
    culture: 50,
    civic: 40,
    lifestyle: 30,
  };

  for (const cat of preferredCategories) {
    interestScores[cat] = Math.min(100, interestScores[cat] + 20);
  }

  return {
    userId,
    email: user.email,
    neighborhood: user.inferredNeighborhood || undefined,
    borough: undefined,
    zipCode: undefined,
    commuteLines: [],
    commuteStations: [],
    preferredCategories: preferredCategories as ContentCategory[],
    mutedCategories: [],
    mutedSources: [],
    mutedKeywords: [],
    timezone: "America/New_York",
    isWeekendDifferent: false,
    openRate: 50,
    clickRate: 20,
    avgTimeToOpen: 30,
    interestScores: interestScores as Record<ContentCategory, number>,
  };
}

/**
 * Get item title for any V2 scored item.
 */
function getItemTitleV2(item: ScoredItemV2): string {
  if ("title" in item) return item.title;
  if ("name" in item) return item.name;
  return "Unknown";
}

/**
 * Get item source for any V2 scored item.
 */
function getItemSourceV2(item: ScoredItemV2): string {
  if ("source" in item && typeof item.source === "string") return item.source;
  if ("sourceId" in item && item.sourceId) return item.sourceId;
  return "unknown";
}

/**
 * Check if item is relevant to user's commute (V2 version).
 */
function isCommuteRelevantV2(profile: UserProfile, item: ScoredItemV2): boolean {
  if (!profile.commuteLines?.length) return false;

  const title = getItemTitleV2(item);
  const body = "body" in item ? item.body :
               "summary" in item ? item.summary :
               "description" in item ? item.description : "";
  const text = `${title} ${body || ""}`.toLowerCase();

  for (const line of profile.commuteLines) {
    if (text.includes(`${line} train`) || text.includes(`${line} line`) ||
        text.match(new RegExp(`\\b${line}\\b`))) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate personal relevance for a V2 scored item.
 */
function calculatePersonalRelevanceV2(
  profile: UserProfile,
  item: ScoredItemV2
): { score: number; reason?: string; boosted: boolean } {
  let score = 50;
  let reason: string | undefined;
  let boosted = false;

  // Category interest boost
  const categoryInterest = (profile.interestScores as Record<ContentCategoryV2, number>)[item.category] || 50;
  score += (categoryInterest - 50) * 0.3;

  // Location relevance (simplified for V2)
  const title = getItemTitleV2(item);
  const body = "body" in item ? item.body :
               "summary" in item ? item.summary : "";
  const text = `${title} ${body || ""}`.toLowerCase();

  if (profile.neighborhood && text.includes(profile.neighborhood.toLowerCase())) {
    score += 30;
    reason = "In your neighborhood";
    boosted = true;
  } else if (profile.borough && text.includes(profile.borough.toLowerCase())) {
    score += 15;
    reason = "In your borough";
    boosted = true;
  }

  // Commute relevance
  if (isCommuteRelevantV2(profile, item)) {
    score += 25;
    reason = reason || "Affects your commute";
    boosted = true;
  }

  // Source filtering
  const source = getItemSourceV2(item);
  if (profile.mutedSources.includes(source)) {
    score = 0;
  }

  // Keyword filtering
  for (const keyword of profile.mutedKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      score = 0;
      break;
    }
  }

  // Category muting
  if ((profile.mutedCategories as ContentCategoryV2[]).includes(item.category)) {
    score = 0;
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reason,
    boosted,
  };
}

/**
 * Personalize content from ContentSelectionV2.
 *
 * This is the Stage 2.75 function for the V2 pipeline.
 *
 * Key improvements:
 * - Accepts pre-scored content from selectBestContentV2
 * - Returns PersonalizationResult with detailed stats
 * - Calculates optimal delivery time
 */
export async function personalizeContentV2(
  userId: string,
  selection: ContentSelectionV2,
  config: Partial<PersonalizationConfig> = {}
): Promise<PersonalizationResultV2> {
  const cfg = { ...DEFAULT_PERSONALIZATION_CONFIG, ...config };

  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 2.75: PERSONALIZATION - Personalizing for User       │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  console.log(`[Personalization] User: ${userId}`);

  const startTime = Date.now();

  // Build user profile
  const profile = await buildUserProfileV2(userId);

  // Combine all content
  const allContent: ScoredItemV2[] = [
    ...selection.news,
    ...selection.alerts,
    ...selection.events,
    ...selection.dining,
  ];

  const totalInput = allContent.length;

  if (!profile) {
    console.log(`[Personalization] No profile for user ${userId}, returning neutral scores`);
    return {
      userId,
      personalizedContent: allContent.map(item => ({
        item,
        personalRelevance: 50,
        boosted: false,
        filtered: false,
      })),
      stats: {
        totalInput,
        boosted: 0,
        filtered: 0,
        avgPersonalRelevance: 50,
      },
      userProfile: {},
    };
  }

  // Score and filter content
  const personalizedContent: PersonalizedContentV2[] = [];
  let boostedCount = 0;
  let filteredCount = 0;

  for (const item of allContent) {
    const { score, reason, boosted } = calculatePersonalRelevanceV2(profile, item);

    if (score === 0) {
      filteredCount++;
      personalizedContent.push({
        item,
        personalRelevance: 0,
        boosted: false,
        filtered: true,
        filterReason: "Muted by preference",
      });
    } else {
      if (boosted) boostedCount++;
      personalizedContent.push({
        item,
        personalRelevance: score,
        personalizedReason: reason,
        boosted,
        filtered: false,
      });
    }
  }

  // Sort by combined score (original + personal)
  personalizedContent.sort((a, b) => {
    if (a.filtered !== b.filtered) return a.filtered ? 1 : -1;
    const aScore = a.item.scores.overall * 0.6 + a.personalRelevance * 0.4;
    const bScore = b.item.scores.overall * 0.6 + b.personalRelevance * 0.4;
    return bScore - aScore;
  });

  // Calculate average relevance
  const nonFiltered = personalizedContent.filter(p => !p.filtered);
  const avgRelevance = nonFiltered.length > 0
    ? Math.round(nonFiltered.reduce((sum, p) => sum + p.personalRelevance, 0) / nonFiltered.length)
    : 0;

  // Calculate optimal delivery time
  let optimalDeliveryTime: PersonalizationResultV2["optimalDeliveryTime"];
  if (cfg.deliveryTimeOptimization) {
    const deliveryTime = getOptimalDeliveryTime(profile);
    optimalDeliveryTime = {
      time: deliveryTime.time,
      reason: deliveryTime.reason,
    };
  }

  const duration = Date.now() - startTime;
  console.log(`[Personalization] Boosted: ${boostedCount}, Filtered: ${filteredCount}`);
  console.log(`[Personalization] Completed in ${duration}ms`);

  return {
    userId,
    personalizedContent,
    stats: {
      totalInput,
      boosted: boostedCount,
      filtered: filteredCount,
      avgPersonalRelevance: avgRelevance,
    },
    optimalDeliveryTime,
    userProfile: {
      neighborhood: profile.neighborhood,
      borough: profile.borough,
      commuteLines: profile.commuteLines,
      preferredCategories: profile.preferredCategories as ContentCategoryV2[],
    },
  };
}
