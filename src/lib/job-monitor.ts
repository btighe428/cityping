/**
 * Job Monitoring Service
 *
 * Provides health tracking, failure detection, and alerting for cron jobs.
 * Implements the "heartbeat" pattern for distributed systems monitoring.
 *
 * Features:
 * - Tracks every job execution (start, success, failure, timeout)
 * - Detects stale jobs that haven't run in expected timeframe
 * - Sends alerts for failures and missed runs
 * - Provides health check endpoint data
 *
 * Usage:
 *   const job = await JobMonitor.start("send-daily-pulse");
 *   try {
 *     // ... do work ...
 *     await job.success({ itemsProcessed: 100 });
 *   } catch (error) {
 *     await job.fail(error);
 *   }
 */

import { prisma } from "./db";
import { Resend } from "resend";

// =============================================================================
// TYPES
// =============================================================================

export interface JobResult {
  itemsProcessed?: number;
  itemsFailed?: number;
  metadata?: Record<string, unknown>;
}

export interface JobHealth {
  jobName: string;
  displayName: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  lastRun: Date | null;
  lastStatus: string | null;
  expectedFrequency: string;
  missedRuns: number;
  consecutiveFailures: number;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "critical";
  jobs: JobHealth[];
  lastChecked: Date;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Job configuration with expected run frequencies.
 * Frequency format: "5m" (minutes), "1h" (hours), "24h" (daily)
 */
export const JOB_CONFIGS: Record<string, { displayName: string; frequency: string; alertAfterMissed: number }> = {
  "ingest-mta-alerts": { displayName: "MTA Alerts", frequency: "5m", alertAfterMissed: 3 },
  "ingest-nyc-events": { displayName: "NYC Events", frequency: "24h", alertAfterMissed: 2 },
  "ingest-sample-sales": { displayName: "Sample Sales", frequency: "24h", alertAfterMissed: 2 },
  "ingest-housing-lotteries": { displayName: "Housing Lotteries", frequency: "24h", alertAfterMissed: 2 },
  "ingest-news": { displayName: "News Ingestion", frequency: "24h", alertAfterMissed: 2 },
  "curate-news": { displayName: "News Curation", frequency: "24h", alertAfterMissed: 2 },
  "send-daily-pulse": { displayName: "Daily Pulse Email", frequency: "24h", alertAfterMissed: 1 },
  "send-day-ahead": { displayName: "Day Ahead Email", frequency: "24h", alertAfterMissed: 1 },
  "scrape-311": { displayName: "311 Alerts", frequency: "4h", alertAfterMissed: 2 },
  "scrape-air-quality": { displayName: "Air Quality", frequency: "8h", alertAfterMissed: 2 },
  "scrape-dining": { displayName: "Dining Deals", frequency: "24h", alertAfterMissed: 2 },
  "scrape-parks": { displayName: "Parks Events", frequency: "24h", alertAfterMissed: 2 },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse frequency string to milliseconds
 */
function parseFrequency(freq: string): number {
  const match = freq.match(/^(\d+)(m|h)$/);
  if (!match) return 24 * 60 * 60 * 1000; // Default to 24h

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case "m":
      return num * 60 * 1000;
    case "h":
      return num * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

/**
 * Send alert email for job failures or missed runs
 */
async function sendJobAlert(
  type: "failure" | "missed" | "recovered",
  jobName: string,
  details: { error?: string; missedCount?: number; lastRun?: Date }
): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;

  if (!adminEmail || !apiKey) {
    console.error(`[JobMonitor] Alert not sent - missing config. Type: ${type}, Job: ${jobName}`);
    return;
  }

  const resend = new Resend(apiKey);
  const config = JOB_CONFIGS[jobName];
  const displayName = config?.displayName || jobName;

  let subject: string;
  let html: string;

  switch (type) {
    case "failure":
      subject = `[CityPing] Job Failed: ${displayName}`;
      html = `
        <h1 style="color: #dc2626;">Job Execution Failed</h1>
        <p><strong>Job:</strong> ${displayName} (${jobName})</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Error:</strong></p>
        <pre style="background: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto;">
${details.error || "Unknown error"}
        </pre>
        <p style="color: #6b7280; font-size: 12px;">CityPing Job Monitor</p>
      `;
      break;

    case "missed":
      subject = `[CityPing] Job Not Running: ${displayName}`;
      html = `
        <h1 style="color: #f59e0b;">Job Missing Expected Runs</h1>
        <p><strong>Job:</strong> ${displayName} (${jobName})</p>
        <p><strong>Expected Frequency:</strong> ${config?.frequency || "unknown"}</p>
        <p><strong>Missed Runs:</strong> ${details.missedCount || "unknown"}</p>
        <p><strong>Last Successful Run:</strong> ${details.lastRun?.toISOString() || "Never"}</p>
        <p style="color: #6b7280; font-size: 12px;">CityPing Job Monitor</p>
      `;
      break;

    case "recovered":
      subject = `[CityPing] Job Recovered: ${displayName}`;
      html = `
        <h1 style="color: #16a34a;">Job Has Recovered</h1>
        <p><strong>Job:</strong> ${displayName} (${jobName})</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p>The job is now running successfully again.</p>
        <p style="color: #6b7280; font-size: 12px;">CityPing Job Monitor</p>
      `;
      break;
  }

  try {
    await resend.emails.send({
      from: "CityPing Alerts <alerts@cityping.net>",
      to: adminEmail,
      subject,
      html,
    });
    console.log(`[JobMonitor] Sent ${type} alert for ${jobName}`);
  } catch (error) {
    console.error(`[JobMonitor] Failed to send alert:`, error);
  }
}

// =============================================================================
// JOB MONITOR CLASS
// =============================================================================

export class JobMonitor {
  private jobRunId: string;
  private jobName: string;
  private startTime: Date;

  private constructor(jobRunId: string, jobName: string, startTime: Date) {
    this.jobRunId = jobRunId;
    this.jobName = jobName;
    this.startTime = startTime;
  }

  /**
   * Start tracking a job execution
   */
  static async start(jobName: string): Promise<JobMonitor> {
    const startTime = new Date();

    const jobRun = await prisma.jobRun.create({
      data: {
        jobName,
        status: "running",
        startedAt: startTime,
      },
    });

    console.log(`[JobMonitor] Started: ${jobName} (${jobRun.id})`);
    return new JobMonitor(jobRun.id, jobName, startTime);
  }

  /**
   * Mark job as successful
   */
  async success(result?: JobResult): Promise<void> {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - this.startTime.getTime();

    await prisma.jobRun.update({
      where: { id: this.jobRunId },
      data: {
        status: "success",
        completedAt,
        durationMs,
        itemsProcessed: result?.itemsProcessed,
        itemsFailed: result?.itemsFailed,
        metadata: (result?.metadata || {}) as object,
      },
    });

    console.log(
      `[JobMonitor] Success: ${this.jobName} (${durationMs}ms, ${result?.itemsProcessed || 0} processed)`
    );

    // Check if this is recovery from previous failures
    const recentFailures = await prisma.jobRun.count({
      where: {
        jobName: this.jobName,
        status: "failed",
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
        },
      },
    });

    if (recentFailures >= 2) {
      // We had failures but now recovered
      await sendJobAlert("recovered", this.jobName, {});
    }
  }

  /**
   * Mark job as failed
   */
  async fail(error: unknown): Promise<void> {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - this.startTime.getTime();
    const errorMessage = error instanceof Error ? error.message : String(error);

    await prisma.jobRun.update({
      where: { id: this.jobRunId },
      data: {
        status: "failed",
        completedAt,
        durationMs,
        errorMessage,
      },
    });

    console.error(`[JobMonitor] Failed: ${this.jobName} - ${errorMessage}`);

    // Check consecutive failures
    const recentRuns = await prisma.jobRun.findMany({
      where: { jobName: this.jobName },
      orderBy: { startedAt: "desc" },
      take: 3,
    });

    const consecutiveFailures = recentRuns.filter((r) => r.status === "failed").length;

    if (consecutiveFailures >= 2) {
      await sendJobAlert("failure", this.jobName, { error: errorMessage });
    }
  }

  /**
   * Mark job as timed out
   */
  async timeout(): Promise<void> {
    await prisma.jobRun.update({
      where: { id: this.jobRunId },
      data: {
        status: "timeout",
        completedAt: new Date(),
        durationMs: Date.now() - this.startTime.getTime(),
        errorMessage: "Job exceeded maximum execution time",
      },
    });

    console.error(`[JobMonitor] Timeout: ${this.jobName}`);
    await sendJobAlert("failure", this.jobName, { error: "Job exceeded maximum execution time" });
  }
}

// =============================================================================
// HEALTH CHECK FUNCTIONS
// =============================================================================

/**
 * Get health status for a single job
 */
async function getJobHealth(jobName: string): Promise<JobHealth> {
  const config = JOB_CONFIGS[jobName];
  if (!config) {
    return {
      jobName,
      displayName: jobName,
      status: "unknown",
      lastRun: null,
      lastStatus: null,
      expectedFrequency: "unknown",
      missedRuns: 0,
      consecutiveFailures: 0,
    };
  }

  const frequencyMs = parseFrequency(config.frequency);

  // Get last successful run
  const lastSuccessfulRun = await prisma.jobRun.findFirst({
    where: { jobName, status: "success" },
    orderBy: { startedAt: "desc" },
  });

  // Get recent runs to count failures
  const recentRuns = await prisma.jobRun.findMany({
    where: { jobName },
    orderBy: { startedAt: "desc" },
    take: 5,
  });

  const lastRun = recentRuns[0] || null;
  const consecutiveFailures = recentRuns.findIndex((r) => r.status === "success");
  const actualConsecutiveFailures = consecutiveFailures === -1 ? recentRuns.length : consecutiveFailures;

  // Calculate missed runs
  const timeSinceLastSuccess = lastSuccessfulRun
    ? Date.now() - lastSuccessfulRun.startedAt.getTime()
    : Infinity;

  const missedRuns = Math.floor(timeSinceLastSuccess / frequencyMs) - 1;

  // Determine status
  let status: "healthy" | "warning" | "critical" | "unknown";
  if (!lastSuccessfulRun) {
    status = "unknown";
  } else if (missedRuns >= config.alertAfterMissed || actualConsecutiveFailures >= 3) {
    status = "critical";
  } else if (missedRuns >= 1 || actualConsecutiveFailures >= 2) {
    status = "warning";
  } else {
    status = "healthy";
  }

  return {
    jobName,
    displayName: config.displayName,
    status,
    lastRun: lastRun?.startedAt || null,
    lastStatus: lastRun?.status || null,
    expectedFrequency: config.frequency,
    missedRuns: Math.max(0, missedRuns),
    consecutiveFailures: actualConsecutiveFailures,
  };
}

/**
 * Get overall system health
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const jobNames = Object.keys(JOB_CONFIGS);
  const jobs = await Promise.all(jobNames.map(getJobHealth));

  const criticalJobs = jobs.filter((j) => j.status === "critical").length;
  const warningJobs = jobs.filter((j) => j.status === "warning").length;

  let status: "healthy" | "degraded" | "critical";
  if (criticalJobs > 0) {
    status = "critical";
  } else if (warningJobs > 0) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  return {
    status,
    jobs,
    lastChecked: new Date(),
  };
}

/**
 * Check for stale jobs and send alerts
 * Should be called periodically (e.g., every 15 minutes)
 */
export async function checkStaleJobs(): Promise<void> {
  console.log("[JobMonitor] Checking for stale jobs...");

  for (const [jobName, config] of Object.entries(JOB_CONFIGS)) {
    const health = await getJobHealth(jobName);

    if (health.status === "critical" && health.missedRuns >= config.alertAfterMissed) {
      // Check if we already alerted recently
      const jobConfig = await prisma.jobConfig.findUnique({
        where: { jobName },
      });

      const hoursSinceLastAlert = jobConfig?.lastAlertedAt
        ? (Date.now() - jobConfig.lastAlertedAt.getTime()) / (1000 * 60 * 60)
        : Infinity;

      // Don't spam alerts - max once per 4 hours
      if (hoursSinceLastAlert >= 4) {
        await sendJobAlert("missed", jobName, {
          missedCount: health.missedRuns,
          lastRun: health.lastRun || undefined,
        });

        // Update last alerted time
        await prisma.jobConfig.upsert({
          where: { jobName },
          update: { lastAlertedAt: new Date() },
          create: {
            jobName,
            displayName: config.displayName,
            expectedFrequency: config.frequency,
            alertAfterMissed: config.alertAfterMissed,
            lastAlertedAt: new Date(),
          },
        });
      }
    }
  }
}

/**
 * Wrapper function for running jobs with monitoring
 */
export async function withJobMonitor<T>(
  jobName: string,
  fn: () => Promise<T & JobResult>
): Promise<T> {
  const monitor = await JobMonitor.start(jobName);

  try {
    const result = await fn();
    await monitor.success(result);
    return result;
  } catch (error) {
    await monitor.fail(error);
    throw error;
  }
}
