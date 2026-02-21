// src/lib/premium/index.ts
/**
 * Premium Features Module
 *
 * Exports all premium feature utilities for easy importing.
 */

// Coat/Umbrella Decision
export {
  getTodaysWearDecision,
  getTomorrowsWearDecision,
  formatWearDecisionForDigest,
  getQuickWearLine,
  type WearDecision,
  type CoatLevel,
} from "./coat-umbrella";

// One Thing Curator
export {
  curateOneThing,
  getTodaysOneThing,
  formatOneThingForDigest,
  type CuratedOneThing,
} from "./one-thing-curator";

// Email Sections Builder
export {
  buildPremiumSections,
  getPremiumQuickSummary,
  isUserPremium,
  type PremiumSection,
  type PremiumSectionsResult,
} from "./email-sections";
