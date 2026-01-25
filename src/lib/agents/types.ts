// src/lib/agents/types.ts
/**
 * UNIFIED TYPE DEFINITIONS FOR CITYPING MULTI-AGENT SYSTEM
 *
 * This file is the single source of truth for all inter-agent interfaces.
 * All agents import types from here to ensure consistency across the pipeline:
 *
 * Stage 1: ROBUSTNESS → Stage 2: DATA QUALITY → [Curation] → [Personalization] → Stage 3: LLM SUMMARIZER
 *      ↓                      ↓                     ↓              ↓                    ↓
 *  HealthReport         ContentSelectionV2    CurationResult  PersonalizationResult  DigestContentV2
 *
 * Key improvements over legacy types:
 * 1. ContentSelectionV2 includes full Prisma records (not just IDs)
 * 2. OrchestrationError with severity levels for proper error handling
 * 3. Explicit stage interfaces for pipeline communication
 * 4. CurationResult and PersonalizationResult for extension stages
 */

import type { NewsArticle, AlertEvent, ParkEvent, DiningDeal } from "@prisma/client";

// =============================================================================
// ERROR HANDLING
// =============================================================================

export type ErrorSeverity = "warning" | "error" | "critical";

export interface OrchestrationError {
  stage: "robustness" | "quality" | "curation" | "personalization" | "summarization";
  severity: ErrorSeverity;
  message: string;
  code?: string;
  sourceId?: string;
  timestamp: Date;
  recoverable: boolean;
}

// =============================================================================
// DATA SOURCE CONFIGURATION
// =============================================================================

export interface DataSourceConfig {
  id: string;
  name: string;
  /** Prisma table/model this source writes to */
  model: "NewsArticle" | "AlertEvent" | "ServiceAlert" | "AirQualityReading" | "DiningDeal" | "ParkEvent";
  /** Module ID for AlertEvent sources (maps to AlertEventSource.moduleId) */
  moduleId?: string;
  /** Hours before data is considered stale */
  freshnessThresholdHours: number;
  /** Priority for healing (1 = highest) */
  priority: 1 | 2 | 3;
  /** Is this source critical for digest generation? */
  criticalForDigest: boolean;
  /** Expected update frequency */
  expectedFrequency: "realtime" | "hourly" | "daily" | "weekly";
}

// =============================================================================
// STAGE 1: ROBUSTNESS AGENT OUTPUT
// =============================================================================

export interface SourceFreshness {
  sourceId: string;
  name: string;
  isStale: boolean;
  lastDataAt: Date | null;
  thresholdHours: number;
  hoursOld: number | null;
  itemCount: number;
}

export interface HealingActionV2 {
  type: "refresh_data" | "retry_failed" | "purge_stale" | "alert_admin";
  sourceId: string;
  reason: string;
  executed: boolean;
  success: boolean;
  result?: string;
  duration?: number;
  error?: OrchestrationError;
}

export interface HealthReport {
  timestamp: Date;
  overallHealth: number; // 0-100 percentage
  status: "healthy" | "degraded" | "critical";
  sources: SourceFreshness[];
  healingActions: HealingActionV2[];
  readyForNextStage: boolean;
  errors: OrchestrationError[];
  recommendations: string[];
}

// =============================================================================
// STAGE 2: DATA QUALITY AGENT OUTPUT
// =============================================================================

export interface ContentScores {
  recency: number;      // 0-100 based on age
  relevance: number;    // 0-100 NYC keywords, neighborhoods, transit
  impact: number;       // 0-100 policy, safety, money, urgency
  completeness: number; // 0-100 data quality (title, body, url)
  overall: number;      // Weighted average
}

export type ContentCategory =
  | "breaking"      // Urgent: delays, closures, emergencies
  | "essential"     // Must-know: weather, major transit
  | "money"         // Deals, sales, free stuff
  | "local"         // Neighborhood news
  | "civic"         // Government, policy
  | "culture"       // Events, arts, entertainment
  | "lifestyle";    // Food, health, tips

export interface ScoredNewsArticle extends NewsArticle {
  scores: ContentScores;
  category: ContentCategory;
  dedupKey: string;
}

export interface ScoredAlertEvent extends AlertEvent {
  scores: ContentScores;
  category: ContentCategory;
  dedupKey: string;
}

export interface ScoredParkEvent extends ParkEvent {
  scores: ContentScores;
  category: ContentCategory;
  dedupKey: string;
}

export interface ScoredDiningDeal extends DiningDeal {
  scores: ContentScores;
  category: ContentCategory;
  dedupKey: string;
}

export interface SelectionConfigV2 {
  /** Maximum news articles to select */
  maxNews?: number;
  /** Maximum transit/alerts to select */
  maxAlerts?: number;
  /** Maximum dining deals to select */
  maxDeals?: number;
  /** Maximum events to select */
  maxEvents?: number;
  /** Minimum overall quality score (0-100) */
  minQualityScore?: number;
  /** Hours to look back for content */
  lookbackHours?: number;
  /** Include only these categories (null = all) */
  categories?: ContentCategory[] | null;
}

export interface ContentSelectionV2 {
  /** Full news article records with scores */
  news: ScoredNewsArticle[];
  /** Full alert event records with scores */
  alerts: ScoredAlertEvent[];
  /** Full park event records with scores */
  events: ScoredParkEvent[];
  /** Full dining deal records with scores */
  dining: ScoredDiningDeal[];
  /** Content grouped by category */
  byCategory: Record<ContentCategory, Array<ScoredNewsArticle | ScoredAlertEvent | ScoredParkEvent | ScoredDiningDeal>>;
  /** Selection statistics */
  summary: {
    totalEvaluated: number;
    totalSelected: number;
    averageQuality: number;
    topSources: string[];
    categoryBreakdown: Record<ContentCategory, number>;
  };
  /** Selection config that was applied */
  configApplied: SelectionConfigV2;
}

// =============================================================================
// STAGE 2.5: CURATION EXTENSION OUTPUT
// =============================================================================

export interface CurationConfig {
  enabled: boolean;
  /** Maximum stories per category */
  maxPerCategory?: number;
  /** Maximum total stories */
  maxTotal?: number;
  /** Generate "why you should care" explanations */
  generateWhyCare?: boolean;
}

export interface CuratedContent {
  item: ScoredNewsArticle | ScoredAlertEvent | ScoredParkEvent | ScoredDiningDeal;
  whyYouShouldCare?: string;
  curatorNotes?: string;
}

export interface CurationResult {
  curatedContent: CuratedContent[];
  byCategory: Record<ContentCategory, CuratedContent[]>;
  stats: {
    totalInput: number;
    afterDedup: number;
    selected: number;
    duplicatesRemoved: number;
    lowQualityFiltered: number;
    avgRelevance: number;
  };
  dropped: Array<{
    item: ScoredNewsArticle | ScoredAlertEvent | ScoredParkEvent | ScoredDiningDeal;
    reason: string;
  }>;
}

// =============================================================================
// STAGE 2.75: PERSONALIZATION EXTENSION OUTPUT
// =============================================================================

export interface PersonalizationConfig {
  enabled: boolean;
  userId?: string;
  /** Apply location-based boosting */
  locationBoosting?: boolean;
  /** Apply commute relevance detection */
  commuteRelevance?: boolean;
  /** Calculate optimal delivery time */
  deliveryTimeOptimization?: boolean;
}

export interface PersonalizedContent {
  item: ScoredNewsArticle | ScoredAlertEvent | ScoredParkEvent | ScoredDiningDeal;
  personalRelevance: number; // 0-100
  personalizedReason?: string;
  boosted: boolean;
  filtered: boolean;
  filterReason?: string;
}

export interface PersonalizationResult {
  userId: string;
  personalizedContent: PersonalizedContent[];
  stats: {
    totalInput: number;
    boosted: number;
    filtered: number;
    avgPersonalRelevance: number;
  };
  optimalDeliveryTime?: {
    time: string; // "07:00"
    reason: string;
  };
  userProfile: {
    neighborhood?: string;
    borough?: string;
    commuteLines?: string[];
    preferredCategories?: ContentCategory[];
  };
}

// =============================================================================
// STAGE 3: LLM SUMMARIZER OUTPUT
// =============================================================================

export interface WeatherDataV2 {
  temp: number;
  condition: string;
  emoji: string;
  high?: number;
  low?: number;
  precipitation?: number;
}

export interface NewsDigestItemV2 {
  headline: string;
  summary: string;
  whyCare: string;
  source: string;
  url: string;
  score: number;
  category: ContentCategory;
}

export interface SummarizationConfigV2 {
  tone?: "casual" | "professional" | "urgent";
  maxNewsItems?: number;
  includeWhyCare?: boolean;
  includeNanoApp?: boolean;
  userPreferences?: {
    interests?: string[];
    neighborhood?: string;
    commuteLines?: string[];
  };
}

export interface SubjectLineBiteV2 {
  category: "housing" | "transit" | "events" | "deals" | "news" | "weather" | "parks";
  emoji: string;
  hook: string;
  specifics: string;
  priority: number;
}

export interface NanoAppSubjectV2 {
  full: string;
  preheader: string;
  bites: SubjectLineBiteV2[];
  characterCount: number;
}

export interface DigestContentV2 {
  subject: string;
  preheader: string;
  greeting: string;
  weatherSummary: string;
  weatherData: WeatherDataV2 | null;
  commuteSummary: string;
  newsItems: NewsDigestItemV2[];
  eventsHighlight: string;
  signOff: string;
  generatedAt: string;
  nanoApp?: NanoAppSubjectV2;
  /** Number of LLM calls made during generation */
  llmCallCount: number;
  /** Any errors during summarization (non-fatal) */
  errors: OrchestrationError[];
}

// =============================================================================
// ORCHESTRATION CONFIGURATION
// =============================================================================

export interface OrchestrationConfigV2 {
  /** Automatically heal stale data if health < threshold */
  autoHeal?: boolean;
  /** Health threshold below which healing triggers (0-100) */
  healingThreshold?: number;

  /** Stage 2 selection configuration */
  selection?: SelectionConfigV2;

  /** Stage 2.5 curation configuration */
  curation?: CurationConfig;

  /** Stage 2.75 personalization configuration */
  personalization?: PersonalizationConfig;

  /** Stage 3 summarization configuration */
  summarization?: SummarizationConfigV2;

  /** Skip LLM summarization (return raw selection) */
  skipSummarization?: boolean;

  /** Abort pipeline on critical errors */
  abortOnCritical?: boolean;
}

// =============================================================================
// ORCHESTRATION RESULT
// =============================================================================

export interface OrchestrationMetricsV2 {
  totalDuration: number;
  stages: {
    robustness: {
      duration: number;
      healthBefore: number;
      healthAfter: number;
      healingActionsExecuted: number;
      healingActionsSucceeded: number;
    };
    quality: {
      duration: number;
      itemsEvaluated: number;
      itemsSelected: number;
      averageQuality: number;
    };
    curation?: {
      duration: number;
      duplicatesRemoved: number;
      itemsCurated: number;
    };
    personalization?: {
      duration: number;
      itemsBoosted: number;
      itemsFiltered: number;
    };
    summarization: {
      duration: number;
      llmCallCount: number;
    };
  };
}

export interface OrchestrationResultV2 {
  success: boolean;
  /** Stage 1 output */
  healthReport: HealthReport;
  /** Stage 2 output - full content with Prisma records */
  selection: ContentSelectionV2;
  /** Stage 2.5 output (if curation enabled) */
  curation?: CurationResult;
  /** Stage 2.75 output (if personalization enabled) */
  personalization?: PersonalizationResult;
  /** Stage 3 output */
  digest?: DigestContentV2;
  /** Pipeline metrics */
  metrics: OrchestrationMetricsV2;
  /** All errors across all stages */
  errors: OrchestrationError[];
  /** Non-critical warnings */
  warnings: string[];
  /** Config that was applied */
  configApplied: OrchestrationConfigV2;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

export const DEFAULT_SELECTION_CONFIG: SelectionConfigV2 = {
  maxNews: 5,
  maxAlerts: 3,
  maxDeals: 3,
  maxEvents: 4,
  minQualityScore: 40,
  lookbackHours: 48,
  categories: null,
};

export const DEFAULT_CURATION_CONFIG: CurationConfig = {
  enabled: false,
  maxPerCategory: 3,
  maxTotal: 12,
  generateWhyCare: true,
};

export const DEFAULT_PERSONALIZATION_CONFIG: PersonalizationConfig = {
  enabled: false,
  locationBoosting: true,
  commuteRelevance: true,
  deliveryTimeOptimization: false,
};

export const DEFAULT_SUMMARIZATION_CONFIG: SummarizationConfigV2 = {
  tone: "casual",
  maxNewsItems: 5,
  includeWhyCare: true,
  includeNanoApp: true,
};

export const DEFAULT_ORCHESTRATION_CONFIG: OrchestrationConfigV2 = {
  autoHeal: true,
  healingThreshold: 50,
  selection: DEFAULT_SELECTION_CONFIG,
  curation: DEFAULT_CURATION_CONFIG,
  personalization: DEFAULT_PERSONALIZATION_CONFIG,
  summarization: DEFAULT_SUMMARIZATION_CONFIG,
  skipSummarization: false,
  abortOnCritical: true,
};
