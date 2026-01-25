// src/app/api/agents/orchestrate-digest/route.ts
/**
 * AGENT-POWERED DIGEST ORCHESTRATION API
 *
 * This endpoint runs the full three-agent pipeline:
 * 1. ROBUSTNESS AGENT - Ensures data freshness with self-healing
 * 2. DATA QUALITY AGENT - Filters, dedupes, and scores content
 * 3. LLM SUMMARIZER AGENT - Creates personalized, AI-powered summaries
 *
 * Usage:
 *   GET  /api/agents/orchestrate-digest              - Run pipeline and return digest
 *   GET  /api/agents/orchestrate-digest?status=true  - Check system status only
 *   GET  /api/agents/orchestrate-digest?skip=llm     - Run without LLM summarization
 *   GET  /api/agents/orchestrate-digest?autoHeal=false - Skip auto-healing
 */

import { NextRequest, NextResponse } from "next/server";
import {
  orchestrateDigest,
  checkOrchestrationHealth,
  getFullQualityReport,
  type OrchestrationConfig,
} from "@/lib/agents/agent-orchestrator";
import { DateTime } from "luxon";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") === "true";
  const report = searchParams.get("report") === "true";
  const skipLlm = searchParams.get("skip") === "llm";
  const autoHeal = searchParams.get("autoHeal") !== "false";

  // Status check only
  if (status) {
    try {
      const health = await checkOrchestrationHealth();
      return NextResponse.json({
        timestamp: DateTime.now().toISO(),
        ...health,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Health check failed", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  }

  // Full quality report
  if (report) {
    try {
      const qualityReport = await getFullQualityReport();
      return NextResponse.json(qualityReport);
    } catch (error) {
      return NextResponse.json(
        { error: "Quality report failed", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  }

  // Run full pipeline
  try {
    const config: OrchestrationConfig = {
      autoHeal,
      skipSummarization: skipLlm,
    };

    const result = await orchestrateDigest(config);

    // Format response
    return NextResponse.json({
      success: result.success,
      timestamp: DateTime.now().toISO(),
      digest: result.digest
        ? {
            subject: result.digest.subject,
            subjectCharCount: result.digest.subject.length,
            preheader: result.digest.preheader,
            greeting: result.digest.greeting,
            weather: result.digest.weatherData
              ? `${result.digest.weatherData.emoji} ${result.digest.weatherData.temp}°F ${result.digest.weatherData.condition}`
              : null,
            commuteSummary: result.digest.commuteSummary,
            newsCount: result.digest.newsItems.length,
            topHeadlines: result.digest.newsItems.slice(0, 3).map((n) => n.headline),
            eventsHighlight: result.digest.eventsHighlight,
            signOff: result.digest.signOff,
            nanoAppBites: result.digest.nanoApp?.bites.length || 0,
          }
        : null,
      selection: result.selection
        ? {
            news: result.selection.news.length,
            alerts: result.selection.alerts.length,
            events: result.selection.events.length,
            dining: result.selection.dining.length,
            averageQuality: result.selection.summary.averageQuality,
            topSources: result.selection.summary.topSources,
          }
        : null,
      metrics: {
        totalDuration: `${(result.metrics.totalDuration / 1000).toFixed(2)}s`,
        robustness: {
          duration: `${(result.metrics.stages.robustness.duration / 1000).toFixed(2)}s`,
          healthBefore: result.metrics.stages.robustness.healthBefore,
          healthAfter: result.metrics.stages.robustness.healthAfter,
          healingActionsExecuted: result.metrics.stages.robustness.healingActionsExecuted,
          healingActionsSucceeded: result.metrics.stages.robustness.healingActionsSucceeded,
        },
        quality: {
          duration: `${(result.metrics.stages.quality.duration / 1000).toFixed(2)}s`,
          itemsEvaluated: result.metrics.stages.quality.itemsEvaluated,
          itemsSelected: result.metrics.stages.quality.itemsSelected,
          averageQuality: result.metrics.stages.quality.averageQuality,
        },
        summarization: {
          duration: `${(result.metrics.stages.summarization.duration / 1000).toFixed(2)}s`,
          llmCalls: result.metrics.stages.summarization.llmCallCount,
        },
      },
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error("[orchestrate-digest] Pipeline failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Orchestration failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config: OrchestrationConfig = {
      autoHeal: body.autoHeal ?? true,
      skipSummarization: body.skipSummarization ?? false,
      selection: body.selection ?? body.selectionConfig, // Support both old and new names
      summarization: body.summarization ?? body.summarizationConfig, // Support both old and new names
    };

    const result = await orchestrateDigest(config);

    return NextResponse.json({
      success: result.success,
      digest: result.digest,
      selection: result.selection
        ? {
            newsCount: result.selection.news.length,
            alertsCount: result.selection.alerts.length,
            eventsCount: result.selection.events.length,
            topSources: result.selection.summary.topSources,
            averageQuality: result.selection.summary.averageQuality,
          }
        : null,
      metrics: result.metrics,
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error("[orchestrate-digest] POST failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Orchestration failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
