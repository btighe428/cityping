// trigger/email/index.ts
/**
 * Email Tasks Index
 *
 * Re-exports all email delivery tasks for Trigger.dev registration.
 */

export { morningDigestTask } from "./morning-digest";
export { noonPulseTask } from "./noon-pulse";
export { eveningPreviewTask } from "./evening-preview";
export { notificationsTask, remindersTask } from "./notifications";
