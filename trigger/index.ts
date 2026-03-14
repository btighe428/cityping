// trigger/index.ts
/**
 * Trigger.dev Task Registry
 *
 * Main entry point for all background tasks.
 * Re-exports all tasks from subdirectories for Trigger.dev registration.
 *
 * Task Categories:
 * - Scrapers: Data ingestion from external APIs
 * - Orchestrators: Data quality and pipeline management
 * - Email: Digest and notification delivery
 *
 * Migration from Vercel Cron:
 * These tasks replace the 36 cron definitions in vercel.json.
 * After Trigger.dev is stable, remove crons from vercel.json.
 */

// =============================================================================
// SCRAPERS (13 tasks)
// =============================================================================

export {
  mtaAlertsTask,
  ferryAlertsTask,
  citibikeTask,
  airportsTask,
  trafficTask,
  airQualityTask,
  environmentalTask,
  newsTier1Task,
  newsTier2Task,
  newsTier3Task,
  newsCurationTask,
  serviceAlertsTask,
  parksTask,
  diningTask,
  emergencyTask,
  eventsTask,
} from "./scrapers";

// =============================================================================
// ORCHESTRATORS (6 tasks)
// =============================================================================

export {
  dataOrchestratorTask,
  morningDataRefreshTask,
  dataQualityReportTask,
  morningDigestPipelineTask,
  noonDigestPipelineTask,
  eveningDigestPipelineTask,
} from "./orchestrators";

// =============================================================================
// EMAIL DELIVERY (5 tasks)
// =============================================================================

export {
  morningDigestTask,
  noonPulseTask,
  eveningPreviewTask,
  notificationsTask,
  remindersTask,
} from "./email";
