// trigger/orchestrators/data-orchestrator.ts
/**
 * Data Orchestrator Task
 *
 * Ensures all data sources are fresh before digest send.
 * Triggers parallel refreshes for stale sources.
 * Reports overall data quality health.
 *
 * Schedule: Every 30 minutes + forced run at 6am ET
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { orchestrateDataRefresh, getDataQualityReport } from "@/lib/data-orchestrator";

// Regular data freshness check (every 30 minutes)
export const dataOrchestratorTask = schedules.task({
  id: "data-orchestrator",
  cron: {
    pattern: "*/30 * * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async () => {
    console.log("[Data Orchestrator] Starting freshness check...");

    const result = await orchestrateDataRefresh({
      forceRefresh: false,
    });

    console.log(
      `[Data Orchestrator] Complete: ${result.overallHealth} - ${result.summary.healthy}/${result.summary.total} healthy`
    );

    return {
      overallHealth: result.overallHealth,
      readyForDigest: result.readyForDigest,
      duration: result.duration,
      summary: result.summary,
    };
  },
});

// Forced refresh before morning email (6am ET)
export const morningDataRefreshTask = schedules.task({
  id: "morning-data-refresh",
  cron: {
    pattern: "0 6 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 15000,
    maxTimeoutInMs: 120000,
  },
  run: async () => {
    console.log("[Morning Data Refresh] Starting forced refresh...");

    const result = await orchestrateDataRefresh({
      forceRefresh: true,
    });

    console.log(
      `[Morning Data Refresh] Complete: ${result.overallHealth} - ready for digest: ${result.readyForDigest}`
    );

    return {
      overallHealth: result.overallHealth,
      readyForDigest: result.readyForDigest,
      duration: result.duration,
      summary: result.summary,
    };
  },
});

// Data quality report (for monitoring, runs after morning refresh)
export const dataQualityReportTask = schedules.task({
  id: "data-quality-report",
  cron: {
    pattern: "15 6 * * *",
    timezone: "America/New_York",
  },
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async () => {
    console.log("[Data Quality Report] Generating report...");

    const report = await getDataQualityReport();

    console.log(
      `[Data Quality Report] Ready for digest: ${report.readyForDigest}, Recommendations: ${report.recommendations.length}`
    );

    // Log recommendations for visibility
    if (report.recommendations.length > 0) {
      console.log("[Data Quality Report] Recommendations:");
      report.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    return {
      readyForDigest: report.readyForDigest,
      recommendations: report.recommendations,
      sources: report.sources.map((s) => ({
        name: s.name,
        healthy: s.healthy,
        itemCount: s.itemCount,
      })),
    };
  },
});
