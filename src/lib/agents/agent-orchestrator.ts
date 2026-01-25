// src/lib/agents/agent-orchestrator.ts
/**
 * AGENT ORCHESTRATOR V2
 *
 * The master conductor that coordinates all specialized agents through
 * a unified pipeline with explicit stage interfaces:
 *
 * Stage 1: ROBUSTNESS → Stage 2: DATA QUALITY → [2.5 Curation] → [2.75 Personalization] → Stage 3: LLM SUMMARIZER
 *      ↓                      ↓                     ↓                   ↓                       ↓
 *  HealthReport         ContentSelectionV2    CurationResult   PersonalizationResult      DigestContentV2
 *
 * Key improvements over V1:
 * - All stages use unified types from types.ts
 * - ContentSelectionV2 includes full Prisma records (not just IDs)
 * - Extension stages (Curation, Personalization) properly integrated
 * - OrchestrationError with severity levels for proper error handling
 * - Accurate metrics tracking across all stages
 *
 * Philosophy: "Every email should feel like a trusted friend who knows
 * the city is giving you the inside scoop."
 */

import { DateTime } from "luxon";

// Import unified types
import {
  type OrchestrationConfigV2,
  type OrchestrationResultV2,
  type OrchestrationMetricsV2,
  type OrchestrationError,
  type HealthReport,
  type ContentSelectionV2,
  type CurationResult,
  type PersonalizationResult,
  type DigestContentV2,
  DEFAULT_ORCHESTRATION_CONFIG,
  DEFAULT_SELECTION_CONFIG,
  DEFAULT_CURATION_CONFIG,
  DEFAULT_PERSONALIZATION_CONFIG,
  DEFAULT_SUMMARIZATION_CONFIG,
} from "./types";

// Import stage agents
import {
  produceHealthReport,
  healStaleData,
  getSystemHealth,
  checkDataFreshness,
  type SourceHealth,
  type DataFreshnessStatus,
} from "./robustness-agent";

import {
  selectBestContentV2,
  getDataQualityReport,
} from "./data-quality-agent";

import { curateContentV2 } from "./content-curator-agent";

import { personalizeContentV2 } from "./personalization-agent";

import { generateDigestContentV2 } from "./llm-summarizer-agent";

// =============================================================================
// LEGACY TYPE EXPORTS (for backwards compatibility)
// =============================================================================

/** @deprecated Use OrchestrationConfigV2 from types.ts */
export type OrchestrationConfig = OrchestrationConfigV2;

/** @deprecated Use OrchestrationResultV2 from types.ts */
export type OrchestrationResult = OrchestrationResultV2;

/** @deprecated Use OrchestrationMetricsV2 from types.ts */
export type OrchestrationMetrics = OrchestrationMetricsV2;

// =============================================================================
// MAIN ORCHESTRATION FUNCTION
// =============================================================================

/**
 * Run the full multi-agent pipeline to generate a personalized email digest.
 *
 * This is the main entry point for digest generation with V2 interfaces:
 * 1. Robustness Agent ensures all data sources are fresh (with self-healing)
 * 2. Data Quality Agent selects and scores the best content
 * 3. Curation Agent (optional) deduplicates and adds "why you should care"
 * 4. Personalization Agent (optional) boosts content based on user profile
 * 5. LLM Summarizer Agent creates the final personalized digest
 *
 * @param config - Pipeline configuration with stage-specific settings
 * @returns Full pipeline result with outputs from each stage
 */
export async function orchestrateDigestV2(
  config: OrchestrationConfigV2 = {}
): Promise<OrchestrationResultV2> {
  // Merge with defaults
  const cfg: OrchestrationConfigV2 = {
    autoHeal: config.autoHeal ?? DEFAULT_ORCHESTRATION_CONFIG.autoHeal,
    healingThreshold: config.healingThreshold ?? DEFAULT_ORCHESTRATION_CONFIG.healingThreshold,
    selection: { ...DEFAULT_SELECTION_CONFIG, ...config.selection },
    curation: { ...DEFAULT_CURATION_CONFIG, ...config.curation },
    personalization: { ...DEFAULT_PERSONALIZATION_CONFIG, ...config.personalization },
    summarization: { ...DEFAULT_SUMMARIZATION_CONFIG, ...config.summarization },
    skipSummarization: config.skipSummarization ?? DEFAULT_ORCHESTRATION_CONFIG.skipSummarization,
    abortOnCritical: config.abortOnCritical ?? DEFAULT_ORCHESTRATION_CONFIG.abortOnCritical,
  };

  const startTime = Date.now();
  const errors: OrchestrationError[] = [];
  const warnings: string[] = [];

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║        CityPing Multi-Agent Digest Orchestration V2         ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Time: ${DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss ZZZZ").padEnd(48)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Initialize metrics tracking
  const metrics: OrchestrationMetricsV2 = {
    totalDuration: 0,
    stages: {
      robustness: {
        duration: 0,
        healthBefore: 0,
        healthAfter: 0,
        healingActionsExecuted: 0,
        healingActionsSucceeded: 0,
      },
      quality: {
        duration: 0,
        itemsEvaluated: 0,
        itemsSelected: 0,
        averageQuality: 0,
      },
      summarization: {
        duration: 0,
        llmCallCount: 0,
      },
    },
  };

  // Stage outputs
  let healthReport: HealthReport | undefined;
  let selection: ContentSelectionV2 | undefined;
  let curation: CurationResult | undefined;
  let personalization: PersonalizationResult | undefined;
  let digest: DigestContentV2 | undefined;

  // =========================================================================
  // STAGE 1: ROBUSTNESS - Ensure data is fresh
  // =========================================================================
  console.log("\n┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 1: ROBUSTNESS AGENT - Ensuring data freshness        │");
  console.log("└──────────────────────────────────────────────────────────────┘");

  const robustnessStart = Date.now();

  try {
    healthReport = await produceHealthReport(
      cfg.autoHeal ?? true,
      cfg.healingThreshold ?? 50
    );

    metrics.stages.robustness.healthBefore = healthReport.overallHealth;
    metrics.stages.robustness.healthAfter = healthReport.overallHealth;
    metrics.stages.robustness.healingActionsExecuted = healthReport.healingActions.length;
    metrics.stages.robustness.healingActionsSucceeded = healthReport.healingActions.filter(a => a.success).length;

    console.log(`[Orchestrator] System health: ${healthReport.overallHealth}% (${healthReport.status})`);
    console.log(`[Orchestrator] Healing actions: ${metrics.stages.robustness.healingActionsSucceeded}/${metrics.stages.robustness.healingActionsExecuted} succeeded`);
    console.log(`[Orchestrator] Ready for next stage: ${healthReport.readyForNextStage}`);

    // Collect any robustness errors
    errors.push(...healthReport.errors);

    // Add warnings from recommendations
    warnings.push(...healthReport.recommendations);

    // Check for critical errors
    const criticalErrors = healthReport.errors.filter(e => e.severity === "critical");
    if (criticalErrors.length > 0 && cfg.abortOnCritical) {
      console.error("[Orchestrator] Critical errors in robustness stage, aborting pipeline");
      return buildResult(false, healthReport, undefined, undefined, undefined, undefined, metrics, errors, warnings, cfg, startTime);
    }

    // Warn if not ready to proceed
    if (!healthReport.readyForNextStage) {
      warnings.push("Robustness check indicates data may not be ready - proceeding with caution");
    }
  } catch (error) {
    const errorObj: OrchestrationError = {
      stage: "robustness",
      severity: "critical",
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      recoverable: false,
    };
    errors.push(errorObj);
    console.error("[Orchestrator] Robustness stage failed:", errorObj.message);

    if (cfg.abortOnCritical) {
      return buildResult(false, undefined, undefined, undefined, undefined, undefined, metrics, errors, warnings, cfg, startTime);
    }
  }

  metrics.stages.robustness.duration = Date.now() - robustnessStart;

  // =========================================================================
  // STAGE 2: DATA QUALITY - Select best content
  // =========================================================================
  console.log("\n┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 2: DATA QUALITY AGENT - Selecting best content       │");
  console.log("└──────────────────────────────────────────────────────────────┘");

  const qualityStart = Date.now();

  try {
    selection = await selectBestContentV2(cfg.selection);

    metrics.stages.quality.itemsEvaluated = selection.summary.totalEvaluated;
    metrics.stages.quality.itemsSelected = selection.summary.totalSelected;
    metrics.stages.quality.averageQuality = selection.summary.averageQuality;

    console.log(`[Orchestrator] Evaluated ${selection.summary.totalEvaluated} items, selected ${selection.summary.totalSelected}`);
    console.log(`[Orchestrator] Average quality score: ${selection.summary.averageQuality.toFixed(1)}`);
    console.log(`[Orchestrator] Top sources: ${selection.summary.topSources.slice(0, 3).join(", ")}`);
    console.log(`[Orchestrator] Category breakdown: ${JSON.stringify(selection.summary.categoryBreakdown)}`);

    if (selection.summary.totalSelected === 0) {
      warnings.push("No content met quality threshold. Check data sources and adjust minQualityScore if needed.");
    }
  } catch (error) {
    const errorObj: OrchestrationError = {
      stage: "quality",
      severity: "critical",
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      recoverable: false,
    };
    errors.push(errorObj);
    console.error("[Orchestrator] Quality stage failed:", errorObj.message);

    if (cfg.abortOnCritical) {
      return buildResult(false, healthReport, undefined, undefined, undefined, undefined, metrics, errors, warnings, cfg, startTime);
    }
  }

  metrics.stages.quality.duration = Date.now() - qualityStart;

  // =========================================================================
  // STAGE 2.5: CURATION (if enabled)
  // =========================================================================
  if (cfg.curation?.enabled && selection) {
    console.log("\n┌──────────────────────────────────────────────────────────────┐");
    console.log("│  STAGE 2.5: CURATION AGENT - Deduplicating & enriching      │");
    console.log("└──────────────────────────────────────────────────────────────┘");

    const curationStart = Date.now();

    try {
      curation = await curateContentV2(selection, cfg.curation);

      metrics.stages.curation = {
        duration: 0,
        duplicatesRemoved: curation.stats.duplicatesRemoved,
        itemsCurated: curation.stats.selected,
      };

      console.log(`[Orchestrator] Curated ${curation.stats.selected} items (${curation.stats.duplicatesRemoved} duplicates removed)`);
      console.log(`[Orchestrator] Low quality filtered: ${curation.stats.lowQualityFiltered}`);
      console.log(`[Orchestrator] Average relevance: ${curation.stats.avgRelevance.toFixed(1)}`);
    } catch (error) {
      const errorObj: OrchestrationError = {
        stage: "curation",
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        recoverable: true,
      };
      errors.push(errorObj);
      console.error("[Orchestrator] Curation stage failed:", errorObj.message);
      // Continue without curation - it's optional
    }

    if (metrics.stages.curation) {
      metrics.stages.curation.duration = Date.now() - curationStart;
    }
  }

  // =========================================================================
  // STAGE 2.75: PERSONALIZATION (if enabled and userId provided)
  // =========================================================================
  if (cfg.personalization?.enabled && cfg.personalization?.userId && selection) {
    console.log("\n┌──────────────────────────────────────────────────────────────┐");
    console.log("│  STAGE 2.75: PERSONALIZATION AGENT - Tailoring content      │");
    console.log("└──────────────────────────────────────────────────────────────┘");

    const personalizationStart = Date.now();

    try {
      personalization = await personalizeContentV2(
        cfg.personalization.userId,
        selection,
        cfg.personalization
      );

      metrics.stages.personalization = {
        duration: 0,
        itemsBoosted: personalization.stats.boosted,
        itemsFiltered: personalization.stats.filtered,
      };

      console.log(`[Orchestrator] Personalized for user: ${personalization.userId}`);
      console.log(`[Orchestrator] Boosted: ${personalization.stats.boosted}, Filtered: ${personalization.stats.filtered}`);
      console.log(`[Orchestrator] Average personal relevance: ${personalization.stats.avgPersonalRelevance.toFixed(1)}`);

      if (personalization.optimalDeliveryTime) {
        console.log(`[Orchestrator] Optimal delivery time: ${personalization.optimalDeliveryTime.time} (${personalization.optimalDeliveryTime.reason})`);
      }
    } catch (error) {
      const errorObj: OrchestrationError = {
        stage: "personalization",
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        recoverable: true,
      };
      errors.push(errorObj);
      console.error("[Orchestrator] Personalization stage failed:", errorObj.message);
      // Continue without personalization - it's optional
    }

    if (metrics.stages.personalization) {
      metrics.stages.personalization.duration = Date.now() - personalizationStart;
    }
  }

  // =========================================================================
  // STAGE 3: LLM SUMMARIZATION - Generate personalized content
  // =========================================================================
  console.log("\n┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 3: LLM SUMMARIZER AGENT - Generating digest          │");
  console.log("└──────────────────────────────────────────────────────────────┘");

  const summarizationStart = Date.now();

  if (selection && !cfg.skipSummarization) {
    try {
      digest = await generateDigestContentV2(selection, cfg.summarization);

      metrics.stages.summarization.llmCallCount = digest.llmCallCount;

      console.log(`[Orchestrator] Generated digest with subject: "${digest.subject}"`);
      console.log(`[Orchestrator] LLM calls made: ${digest.llmCallCount}`);
      console.log(`[Orchestrator] News items in digest: ${digest.newsItems.length}`);

      // Collect any summarization errors (non-fatal)
      errors.push(...digest.errors);

      if (digest.nanoApp) {
        console.log(`[Orchestrator] NanoApp subject generated: ${digest.nanoApp.bites.length} bites`);
      }
    } catch (error) {
      const errorObj: OrchestrationError = {
        stage: "summarization",
        severity: "critical",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        recoverable: false,
      };
      errors.push(errorObj);
      console.error("[Orchestrator] Summarization stage failed:", errorObj.message);
    }
  } else if (cfg.skipSummarization) {
    console.log("[Orchestrator] Skipping LLM summarization as configured");
  } else {
    console.log("[Orchestrator] No content selection available for summarization");
  }

  metrics.stages.summarization.duration = Date.now() - summarizationStart;

  // =========================================================================
  // FINAL REPORT
  // =========================================================================
  return buildResult(
    errors.filter(e => e.severity === "critical").length === 0 && (digest !== undefined || cfg.skipSummarization === true),
    healthReport,
    selection,
    curation,
    personalization,
    digest,
    metrics,
    errors,
    warnings,
    cfg,
    startTime
  );
}

/**
 * Legacy orchestration function for backwards compatibility.
 * @deprecated Use orchestrateDigestV2 for full pipeline control.
 */
export async function orchestrateDigest(
  config: OrchestrationConfigV2 = {}
): Promise<OrchestrationResultV2> {
  return orchestrateDigestV2(config);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildResult(
  success: boolean,
  healthReport: HealthReport | undefined,
  selection: ContentSelectionV2 | undefined,
  curation: CurationResult | undefined,
  personalization: PersonalizationResult | undefined,
  digest: DigestContentV2 | undefined,
  metrics: OrchestrationMetricsV2,
  errors: OrchestrationError[],
  warnings: string[],
  config: OrchestrationConfigV2,
  startTime: number
): OrchestrationResultV2 {
  const totalDuration = Date.now() - startTime;
  metrics.totalDuration = totalDuration;

  // Print final report
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    ORCHESTRATION COMPLETE                    ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Success: ${success ? "✓" : "✗"}`.padEnd(63) + "║");
  console.log(`║  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`.padEnd(63) + "║");
  console.log(`║  Robustness: ${(metrics.stages.robustness.duration / 1000).toFixed(2)}s (${metrics.stages.robustness.healthBefore}% → ${metrics.stages.robustness.healthAfter}%)`.padEnd(63) + "║");
  console.log(`║  Quality: ${(metrics.stages.quality.duration / 1000).toFixed(2)}s (${metrics.stages.quality.itemsEvaluated} → ${metrics.stages.quality.itemsSelected} items)`.padEnd(63) + "║");
  if (metrics.stages.curation) {
    console.log(`║  Curation: ${(metrics.stages.curation.duration / 1000).toFixed(2)}s (${metrics.stages.curation.itemsCurated} curated, ${metrics.stages.curation.duplicatesRemoved} deduped)`.padEnd(63) + "║");
  }
  if (metrics.stages.personalization) {
    console.log(`║  Personalization: ${(metrics.stages.personalization.duration / 1000).toFixed(2)}s (${metrics.stages.personalization.itemsBoosted} boosted, ${metrics.stages.personalization.itemsFiltered} filtered)`.padEnd(63) + "║");
  }
  console.log(`║  Summarization: ${(metrics.stages.summarization.duration / 1000).toFixed(2)}s (${metrics.stages.summarization.llmCallCount} LLM calls)`.padEnd(63) + "║");
  console.log(`║  Errors: ${errors.filter(e => e.severity === "critical").length} critical, ${errors.filter(e => e.severity === "error").length} errors, ${errors.filter(e => e.severity === "warning").length} warnings`.padEnd(63) + "║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Build the result object
  const result: OrchestrationResultV2 = {
    success,
    healthReport: healthReport ?? {
      timestamp: new Date(),
      overallHealth: 0,
      status: "critical",
      sources: [],
      healingActions: [],
      readyForNextStage: false,
      errors: [],
      recommendations: ["Health report unavailable"],
    },
    selection: selection ?? {
      news: [],
      alerts: [],
      events: [],
      dining: [],
      byCategory: {
        breaking: [],
        essential: [],
        money: [],
        local: [],
        civic: [],
        culture: [],
        lifestyle: [],
      },
      summary: {
        totalEvaluated: 0,
        totalSelected: 0,
        averageQuality: 0,
        topSources: [],
        categoryBreakdown: {
          breaking: 0,
          essential: 0,
          money: 0,
          local: 0,
          civic: 0,
          culture: 0,
          lifestyle: 0,
        },
      },
      configApplied: config.selection ?? {},
    },
    curation,
    personalization,
    digest,
    metrics,
    errors,
    warnings,
    configApplied: config,
  };

  return result;
}

// =============================================================================
// HEALTH CHECK FUNCTIONS
// =============================================================================

/**
 * Quick health check without running full pipeline.
 * Useful for pre-flight checks before scheduling digest generation.
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
 * Combines health metrics with quality assessment.
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

/**
 * Run the pipeline with curation only (skip personalization and summarization).
 * Useful for testing the content selection and curation stages.
 */
export async function orchestrateCurationOnly(
  config: Partial<OrchestrationConfigV2> = {}
): Promise<OrchestrationResultV2> {
  return orchestrateDigestV2({
    ...config,
    curation: { enabled: true, ...config.curation },
    personalization: { enabled: false },
    skipSummarization: true,
  });
}

/**
 * Run the pipeline for a specific user with full personalization.
 * Convenience wrapper that enables personalization with user ID.
 */
export async function orchestrateForUser(
  userId: string,
  config: Partial<OrchestrationConfigV2> = {}
): Promise<OrchestrationResultV2> {
  return orchestrateDigestV2({
    ...config,
    personalization: {
      enabled: true,
      userId,
      locationBoosting: true,
      commuteRelevance: true,
      deliveryTimeOptimization: true,
      ...config.personalization,
    },
  });
}
