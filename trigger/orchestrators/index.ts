// trigger/orchestrators/index.ts
/**
 * Orchestrator Tasks Index
 *
 * Re-exports all orchestrator tasks for Trigger.dev registration.
 */

export {
  dataOrchestratorTask,
  morningDataRefreshTask,
  dataQualityReportTask,
} from "./data-orchestrator";

export {
  morningDigestPipelineTask,
  noonDigestPipelineTask,
  eveningDigestPipelineTask,
} from "./digest-orchestrator";
