// src/lib/agents/index.ts
/**
 * CityPing Multi-Agent System V2
 *
 * Unified pipeline with explicit stage interfaces:
 *
 * Stage 1: ROBUSTNESS → Stage 2: DATA QUALITY → [2.5 Curation] → [2.75 Personalization] → Stage 3: LLM SUMMARIZER
 *      ↓                      ↓                     ↓                   ↓                       ↓
 *  HealthReport         ContentSelectionV2    CurationResult   PersonalizationResult      DigestContentV2
 *
 * Key improvements over V1:
 * - Unified types in types.ts (single source of truth)
 * - Unified scoring in scoring.ts (consistent 0-100 scores)
 * - Unified data sources in data-sources.ts (8 sources with config)
 * - Full Prisma records in ContentSelectionV2 (not just IDs)
 * - Extension stages properly integrated (Curation, Personalization)
 *
 * Usage:
 *   import { orchestrateDigestV2, type OrchestrationResultV2 } from "@/lib/agents";
 *   const result = await orchestrateDigestV2({ curation: { enabled: true } });
 */

// =============================================================================
// UNIFIED TYPES (V2)
// =============================================================================

export type {
  // Error handling
  ErrorSeverity,
  OrchestrationError,
  // Data sources
  DataSourceConfig,
  // Stage 1: Robustness
  SourceFreshness,
  HealingActionV2,
  HealthReport,
  // Stage 2: Data Quality
  ContentScores,
  ContentCategory,
  ScoredNewsArticle,
  ScoredAlertEvent,
  ScoredParkEvent,
  ScoredDiningDeal,
  SelectionConfigV2,
  ContentSelectionV2,
  // Stage 2.5: Curation
  CurationConfig,
  CuratedContent,
  CurationResult,
  // Stage 2.75: Personalization
  PersonalizationConfig,
  PersonalizedContent,
  PersonalizationResult,
  // Stage 3: LLM Summarizer
  WeatherDataV2,
  NewsDigestItemV2,
  SummarizationConfigV2,
  SubjectLineBiteV2,
  NanoAppSubjectV2,
  DigestContentV2,
  // Orchestration
  OrchestrationConfigV2,
  OrchestrationMetricsV2,
  OrchestrationResultV2,
} from "./types";

export {
  DEFAULT_SELECTION_CONFIG,
  DEFAULT_CURATION_CONFIG,
  DEFAULT_PERSONALIZATION_CONFIG,
  DEFAULT_SUMMARIZATION_CONFIG,
  DEFAULT_ORCHESTRATION_CONFIG,
} from "./types";

// =============================================================================
// UNIFIED SCORING
// =============================================================================

export {
  scoreContent,
  scoreRecency,
  scoreRelevance,
  scoreImpact,
  scoreCompleteness,
  categorizeContent,
  generateDedupKey,
  areTitlesSimilar,
  meetsQualityThreshold,
} from "./scoring";

// =============================================================================
// UNIFIED DATA SOURCES
// =============================================================================

export {
  DATA_SOURCES,
  getDataSource,
  getCriticalSources,
  getSourcesByPriority,
  checkSourceFreshness,
  refreshSource,
} from "./data-sources";

// =============================================================================
// STAGE AGENTS (V2 FUNCTIONS)
// =============================================================================

// Robustness Agent - data freshness and healing
export {
  healStaleData,
  checkDataFreshness,
  getSystemHealth,
  produceHealthReport,
  type HealingAction,
  type DataFreshnessStatus,
  type SourceHealth,
} from "./robustness-agent";

// Data Quality Agent - content selection and scoring
export {
  selectBestContent,
  selectBestContentV2,
  getDataQualityReport,
  generateDataQualityReport,
  type ContentSelection,
  type QualityScore,
  type SelectionConfig,
  type DataSource,
  type DataQualityHealingAction,
  type Anomaly,
  type DataQualityReport,
} from "./data-quality-agent";

// Content Curator Agent - deduplication and enrichment
export {
  curateContentV2,
} from "./content-curator-agent";

// Personalization Agent - user-specific boosting
export {
  personalizeContentV2,
} from "./personalization-agent";

// LLM Summarizer Agent - AI-powered content generation
export {
  generateDigestContent,
  generateDigestContentV2,
  generateSubjectLine,
  type DigestContent,
  type SummarizationConfig,
} from "./llm-summarizer-agent";

// =============================================================================
// ORCHESTRATOR (V2)
// =============================================================================

export {
  orchestrateDigest,
  orchestrateDigestV2,
  checkOrchestrationHealth,
  getFullQualityReport,
  orchestrateCurationOnly,
  orchestrateForUser,
  // Legacy types (deprecated, use V2 from types.ts)
  type OrchestrationConfig,
  type OrchestrationResult,
  type OrchestrationMetrics,
} from "./agent-orchestrator";

// =============================================================================
// SUBJECT LINE NANO APP
// =============================================================================

export {
  generateNanoAppSubject,
  generateTemplateSubject,
} from "./subject-line-nano-app";
