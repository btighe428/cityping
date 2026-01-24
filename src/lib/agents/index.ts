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

// Export all from each agent module
export * from "./robustness-agent";
export * from "./data-quality-agent";
export * from "./llm-summarizer-agent";
export * from "./agent-orchestrator";
export * from "./subject-line-nano-app";

// Convenient named exports for main entry points
export {
  orchestrateDigest,
  checkOrchestrationHealth,
  getFullQualityReport,
} from "./agent-orchestrator";

export {
  selectBestContent,
  getDataQualityReport,
} from "./data-quality-agent";

export {
  generateDigestContent,
  generateSubjectLine,
} from "./llm-summarizer-agent";

export {
  healStaleData,
  checkDataFreshness,
  getSystemHealth,
} from "./robustness-agent";

export {
  generateNanoAppSubject,
  generateTemplateSubject,
} from "./subject-line-nano-app";
