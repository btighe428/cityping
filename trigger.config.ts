// trigger.config.ts
/**
 * Trigger.dev Configuration for CityPing
 *
 * This configuration file defines the Trigger.dev project settings,
 * including task directories, retry policies, and runtime configuration.
 *
 * Trigger.dev handles background jobs that previously ran on Vercel cron:
 * - Data scrapers (MTA, ferry, citibike, airports, traffic, etc.)
 * - Email delivery (daily digest, notifications)
 * - Data orchestration (freshness checks, AI curation)
 *
 * Benefits over Vercel Cron:
 * - No timeout limits (hours vs 10-60s)
 * - Built-in exponential backoff retries
 * - Task chaining and dependencies
 * - Real-time dashboard and observability
 * - Queue management with concurrency limits
 */

import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  // Project identifier - matches your Trigger.dev dashboard project
  project: "cityping",

  // Directories containing task definitions
  dirs: ["trigger"],

  // Runtime configuration
  runtime: "node",
  build: {
    // External packages that should not be bundled
    external: ["@prisma/client", "prisma"],
  },

  // Default retry configuration for all tasks
  // Individual tasks can override these settings
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 60000,
    },
  },

  // Machine configuration for task execution
  machine: "small-1x",

  // Maximum duration for task execution (in seconds)
  // Set high to handle complex operations
  maxDuration: 300, // 5 minutes

  // Telemetry configuration
  telemetry: {
    exporters: [],
  },
});
