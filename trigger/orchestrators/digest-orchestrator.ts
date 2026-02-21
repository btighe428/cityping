// trigger/orchestrators/digest-orchestrator.ts
/**
 * Digest Orchestrator Task
 *
 * Pre-email pipeline that prepares content for daily digests.
 * Handles AI curation, content embedding, and quality checks.
 *
 * This task chains together:
 * 1. News curation (AI selection)
 * 2. Content embedding (vector generation)
 * 3. Quality validation
 * 4. Email readiness flag
 *
 * Schedule: Runs before each email slot
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { getDataQualityReport } from "@/lib/data-orchestrator";

// Pre-morning digest pipeline (runs at 8am, before 9am email)
export const morningDigestPipelineTask = schedules.task({
  id: "morning-digest-pipeline",
  cron: {
    pattern: "0 8 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 15000,
    maxTimeoutInMs: 120000,
  },
  run: async () => {
    console.log("[Morning Digest Pipeline] Starting pre-email preparation...");

    // 1. Check data quality
    const qualityReport = await getDataQualityReport();

    if (!qualityReport.readyForDigest) {
      console.error("[Morning Digest Pipeline] Data quality check failed");
      console.error("Missing requirements:", qualityReport.recommendations);
      return {
        success: false,
        stage: "quality_check",
        error: "Data quality requirements not met",
        recommendations: qualityReport.recommendations,
      };
    }

    // 2. Ensure news is curated for today
    const { curateFromDatabase } = await import("@/lib/agents/content-curator-agent");
    const curationResult = await curateFromDatabase();

    if (curationResult.stats.selected < 3) {
      console.warn(
        `[Morning Digest Pipeline] Only ${curationResult.stats.selected} articles curated (need 3)`
      );
    }

    // 3. Run content embedding for new articles
    const { processUnembeddedContent } = await import("@/lib/embeddings");
    const embeddingResult = await processUnembeddedContent();

    const totalEmbedded = embeddingResult.newsProcessed + embeddingResult.alertsProcessed;

    console.log(
      `[Morning Digest Pipeline] Complete: ${curationResult.stats.selected} curated, ${totalEmbedded} embedded`
    );

    return {
      success: true,
      dataQuality: qualityReport.readyForDigest,
      curation: {
        selected: curationResult.stats.selected,
        totalConsidered: curationResult.stats.totalInput,
      },
      embedding: {
        newsProcessed: embeddingResult.newsProcessed,
        alertsProcessed: embeddingResult.alertsProcessed,
      },
    };
  },
});

// Pre-noon digest pipeline (runs at 11am, before 12pm email)
export const noonDigestPipelineTask = schedules.task({
  id: "noon-digest-pipeline",
  cron: {
    pattern: "0 11 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async () => {
    console.log("[Noon Digest Pipeline] Starting pre-email preparation...");

    // Check data quality
    const qualityReport = await getDataQualityReport();

    // Noon is less critical, just log warnings
    if (!qualityReport.readyForDigest) {
      console.warn("[Noon Digest Pipeline] Data quality degraded");
    }

    console.log(
      `[Noon Digest Pipeline] Complete: ready=${qualityReport.readyForDigest}`
    );

    return {
      success: true,
      dataQuality: qualityReport.readyForDigest,
      recommendations: qualityReport.recommendations,
    };
  },
});

// Pre-evening digest pipeline (runs at 6pm, before 7pm email)
export const eveningDigestPipelineTask = schedules.task({
  id: "evening-digest-pipeline",
  cron: {
    pattern: "0 18 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async () => {
    console.log("[Evening Digest Pipeline] Starting pre-email preparation...");

    // Check data quality
    const qualityReport = await getDataQualityReport();

    // Run "One Thing" curation for tomorrow
    const { curateOneThing } = await import("@/lib/premium/one-thing-curator");
    const oneThing = await curateOneThing();

    console.log(
      `[Evening Digest Pipeline] Complete: oneThing=${!!oneThing}, ready=${qualityReport.readyForDigest}`
    );

    return {
      success: true,
      dataQuality: qualityReport.readyForDigest,
      oneThing: oneThing ? { title: oneThing.title } : null,
    };
  },
});
