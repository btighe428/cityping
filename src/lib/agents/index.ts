// src/lib/agents/index.ts
/**
 * CityPing Agent System
 *
 * Three specialized agents + orchestrator working together:
 *
 * 1. ROBUSTNESS AGENT - Ensures data pipelines are bulletproof
 *    - Automatic retry with exponential backoff
 *    - Circuit breaker for failing sources
 *    - Self-healing capabilities
 *
 * 2. DATA QUALITY AGENT - Ensures only the best content reaches users
 *    - Source evaluation and ranking
 *    - Deduplication across sources
 *    - NYC relevance scoring
 *
 * 3. LLM SUMMARIZER AGENT - Creates personalized, relevant content
 *    - AI-powered summarization
 *    - "Why you should care" insights
 *    - Tone adaptation
 *
 * 4. AGENT ORCHESTRATOR - Coordinates all agents into a unified pipeline
 *    - Stages: Heal → Quality Filter → AI Summarize
 *    - Produces ready-to-send digest content
 *    - Comprehensive metrics and error handling
 *
 * Usage:
 *   import { orchestrateDigest } from "@/lib/agents";
 *   const result = await orchestrateDigest();
 */

// Robustness Agent - data freshness and healing
export {
  healStaleData,
  checkDataFreshness,
  getSystemHealth,
  type HealingAction,
  type DataFreshnessStatus,
  type SourceHealth,
} from "./robustness-agent";

// Data Quality Agent - content selection and scoring
export {
  selectBestContent,
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

// LLM Summarizer Agent - AI-powered content generation
export {
  generateDigestContent,
  generateSubjectLine,
  type DigestContent,
  type SummarizationConfig,
} from "./llm-summarizer-agent";

// Agent Orchestrator - pipeline coordination
export {
  orchestrateDigest,
  checkOrchestrationHealth,
  getFullQualityReport,
  type OrchestrationConfig,
  type OrchestrationResult,
  type OrchestrationMetrics,
} from "./agent-orchestrator";

// Subject Line Nano App
export {
  generateNanoAppSubject,
  generateTemplateSubject,
} from "./subject-line-nano-app";
