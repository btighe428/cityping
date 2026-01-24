// src/lib/agents/agent-orchestrator.ts
/**
 * AGENT ORCHESTRATOR
 *
 * The master conductor that coordinates all three specialized agents:
 *
 * 1. ROBUSTNESS AGENT → Ensures data freshness with self-healing
 * 2. DATA QUALITY AGENT → Filters, dedupes, and scores content
 * 3. LLM SUMMARIZER AGENT → Creates personalized, relevant summaries
 *
 * Pipeline Flow:
 * ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
 * │   ROBUSTNESS    │───▶│  DATA QUALITY   │───▶│ LLM SUMMARIZER  │
 * │  Heal + Verify  │    │ Filter + Score  │    │  Personalize    │
 * └─────────────────┘    └─────────────────┘    └─────────────────┘
 *         │                      │                      │
 *         ▼                      ▼                      ▼
 *   Fresh Data (healed)   Quality Content       Ready-to-Send Email
 *
 * Philosophy: "Every email should feel like a trusted friend who knows
 * the city is giving you the inside scoop."
 */

import { DateTime } from "luxon";

// Import agents
import {
  getSystemHealth,
  checkDataFreshness,
  healStaleData,
  type SourceHealth,
  type HealingAction,
  type DataFreshnessStatus,
} from "./robustness-agent";

import {
  selectBestContent,
  getDataQualityReport,
  type ContentSelection,
  type QualityScore,
  type SelectionConfig,
} from "./data-quality-agent";

import {
  generateDigestContent,
  generateSubjectLine,
  type DigestContent,
  type SummarizationConfig,
} from "./llm-summarizer-agent";

// =============================================================================
// TYPES
// =============================================================================

export interface OrchestrationConfig {
  /** Heal stale data before proceeding? */
  autoHeal?: boolean;
  /** Selection parameters for data quality agent */
  selectionConfig?: SelectionConfig;
  /** Summarization parameters for LLM agent */
  summarizationConfig?: SummarizationConfig;
  /** Skip LLM summarization (use raw data) */
  skipSummarization?: boolean;
}

export interface OrchestrationResult {
  success: boolean;
  digest?: DigestContent;
  selection?: ContentSelection;
  metrics: OrchestrationMetrics;
  errors: string[];
  warnings: string[];
}

export interface OrchestrationMetrics {
  totalDuration: number;
  stages: {
    robustness: {
      duration: number;
      healthBefore: number;
      healthAfter: number;
      healingActions: HealingAction[];
    };
    quality: {
      duration: number;
      itemsEvaluated: number;
      itemsSelected: number;
      averageQuality: number;
    };
    summarization: {
      duration: number;
      llmCallCount: number;
    };
  };
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: OrchestrationConfig = {
  autoHeal: true,
  selectionConfig: {
    maxNews: 5,
    maxAlerts: 3,
    maxDeals: 3,
    maxEvents: 4,
    minQualityScore: 40,
    lookbackHours: 48,
  },
  summarizationConfig: {
    tone: "casual",
    maxNewsItems: 5,
    includeWhyCare: true,
  },
  skipSummarization: false,
};

// =============================================================================
// MAIN ORCHESTRATION FUNCTION
// =============================================================================

/**
 * Run the full 3-agent pipeline to generate a personalized email digest.
 *
 * This is the main entry point for digest generation:
 * 1. Robustness Agent ensures all data sources are fresh
 * 2. Data Quality Agent selects the best content
 * 3. LLM Summarizer Agent creates personalized content
 */
export async function orchestrateDigest(
  config: OrchestrationConfig = {}
): Promise<OrchestrationResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           CityPing 3-Agent Digest Orchestration              ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Time: ${DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss ZZZZ").padEnd(48)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // =========================================================================
  // STAGE 1: ROBUSTNESS - Ensure data is fresh
  // =========================================================================
  console.log("\n┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 1: ROBUSTNESS AGENT - Ensuring data freshness        │");
  console.log("└──────────────────────────────────────────────────────────────┘");

  const robustnessStart = Date.now();
  let healthBefore = 0;
  let healthAfter = 0;
  let healingActions: HealingAction[] = [];

  try {
    // Check current health
    const healthStatus = await getSystemHealth();
    healthBefore = healthStatus.overall;
    console.log(`[Orchestrator] Current system health: ${healthBefore}%`);

    // Heal if needed and configured
    if (cfg.autoHeal && healthBefore < 50) {
      console.log("[Orchestrator] Health below 50%, initiating self-healing...");
      healingActions = await healStaleData();
      console.log(`[Orchestrator] Healing complete: ${healingActions.filter(a => a.success).length}/${healingActions.length} successful`);

      // Re-check health
      const healthAfterStatus = await getSystemHealth();
      healthAfter = healthAfterStatus.overall;
      console.log(`[Orchestrator] Health after healing: ${healthAfter}%`);
    } else {
      healthAfter = healthBefore;
      console.log("[Orchestrator] Data sufficiently fresh, skipping heal");
    }

    // Warn if still unhealthy
    if (healthAfter < 30) {
      warnings.push(`Low data health: ${healthAfter}%. Digest may have limited content.`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(`Robustness stage failed: ${msg}`);
    console.error("[Orchestrator] Robustness error:", msg);
  }

  const robustnessDuration = Date.now() - robustnessStart;

  // =========================================================================
  // STAGE 2: DATA QUALITY - Select best content
  // =========================================================================
  console.log("\n┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 2: DATA QUALITY AGENT - Selecting best content       │");
  console.log("└──────────────────────────────────────────────────────────────┘");

  const qualityStart = Date.now();
  let selection: ContentSelection | undefined;
  let itemsEvaluated = 0;
  let itemsSelected = 0;
  let averageQuality = 0;

  try {
    selection = await selectBestContent(cfg.selectionConfig);
    itemsEvaluated = selection.summary.totalEvaluated;
    itemsSelected = selection.summary.totalSelected;
    averageQuality = selection.summary.averageQuality;

    console.log(`[Orchestrator] Evaluated ${itemsEvaluated} items, selected ${itemsSelected}`);
    console.log(`[Orchestrator] Average quality score: ${averageQuality}`);
    console.log(`[Orchestrator] Top sources: ${selection.summary.topSources.join(", ")}`);

    if (itemsSelected === 0) {
      warnings.push("No content met quality threshold. Check data sources.");
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(`Quality stage failed: ${msg}`);
    console.error("[Orchestrator] Quality error:", msg);
  }

  const qualityDuration = Date.now() - qualityStart;

  // =========================================================================
  // STAGE 3: LLM SUMMARIZATION - Generate personalized content
  // =========================================================================
  console.log("\n┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 3: LLM SUMMARIZER AGENT - Personalizing content      │");
  console.log("└──────────────────────────────────────────────────────────────┘");

  const summarizationStart = Date.now();
  let digest: DigestContent | undefined;
  let llmCallCount = 0;

  if (selection && !cfg.skipSummarization) {
    try {
      digest = await generateDigestContent(selection, cfg.summarizationConfig);
      // Estimate LLM calls: 1 subject + 1 commute + top 3 news why-care
      llmCallCount = 2 + Math.min(3, selection.news.length);
      console.log(`[Orchestrator] Generated digest with subject: "${digest.subject}"`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Summarization stage failed: ${msg}`);
      console.error("[Orchestrator] Summarization error:", msg);
    }
  } else if (cfg.skipSummarization) {
    console.log("[Orchestrator] Skipping LLM summarization as configured");
  }

  const summarizationDuration = Date.now() - summarizationStart;
  const totalDuration = Date.now() - startTime;

  // =========================================================================
  // FINAL REPORT
  // =========================================================================
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    ORCHESTRATION COMPLETE                    ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`.padEnd(63) + "║");
  console.log(`║  Robustness: ${(robustnessDuration / 1000).toFixed(2)}s (${healthBefore}% → ${healthAfter}%)`.padEnd(63) + "║");
  console.log(`║  Quality: ${(qualityDuration / 1000).toFixed(2)}s (${itemsEvaluated} → ${itemsSelected} items)`.padEnd(63) + "║");
  console.log(`║  Summarization: ${(summarizationDuration / 1000).toFixed(2)}s (${llmCallCount} LLM calls)`.padEnd(63) + "║");
  console.log(`║  Errors: ${errors.length}, Warnings: ${warnings.length}`.padEnd(63) + "║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  return {
    success: errors.length === 0 && (digest !== undefined || cfg.skipSummarization === true),
    digest,
    selection,
    metrics: {
      totalDuration,
      stages: {
        robustness: {
          duration: robustnessDuration,
          healthBefore,
          healthAfter,
          healingActions,
        },
        quality: {
          duration: qualityDuration,
          itemsEvaluated,
          itemsSelected,
          averageQuality,
        },
        summarization: {
          duration: summarizationDuration,
          llmCallCount,
        },
      },
    },
    errors,
    warnings,
  };
}

/**
 * Quick health check without running full pipeline.
 */
export async function checkOrchestrationHealth(): Promise<{
  ready: boolean;
  health: number;
  freshness: DataFreshnessStatus[];
  recommendations: string[];
}> {
  const freshness = await checkDataFreshness();
  const health = await getSystemHealth();

  const recommendations: string[] = [];

  // Check critical sources
  const newsFresh = freshness.find(f => f.sourceId === "news");
  const mtaFresh = freshness.find(f => f.sourceId === "mta");

  if (newsFresh?.isStale) {
    recommendations.push("Run news scraper before digest generation");
  }
  if (mtaFresh?.isStale) {
    recommendations.push("MTA alerts may be outdated - consider refreshing");
  }
  if (health.overall < 30) {
    recommendations.push("System health critical - run healStaleData()");
  }

  return {
    ready: health.overall >= 30 && !newsFresh?.isStale,
    health: health.overall,
    freshness,
    recommendations,
  };
}

/**
 * Get detailed quality report across all data sources.
 */
export async function getFullQualityReport(): Promise<{
  timestamp: string;
  health: SourceHealth[];
  quality: Awaited<ReturnType<typeof getDataQualityReport>>;
  readyForDigest: boolean;
}> {
  const health = await getSystemHealth();
  const quality = await getDataQualityReport();

  // Ready if health > 30% and we have news content
  const readyForDigest = health.overall >= 30 && (quality.sources[0]?.itemCount24h ?? 0) > 0;

  return {
    timestamp: DateTime.now().toISO()!,
    health: health.sources,
    quality,
    readyForDigest,
  };
}
