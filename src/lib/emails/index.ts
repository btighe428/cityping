/**
 * CityPing Email Templates - Index
 * 
 * This directory contains all email templates for CityPing.
 * 
 * TEMPLATES:
 * - morning-template.ts    → 9am daily brief
 * - morning-examples.ts    → Example content & copy guide
 * - midday-template.ts     → 12pm midday update (NEW)
 * - midday-examples.ts     → Midday content examples
 * 
 * LEGACY TEMPLATES (in /src/lib/):
 * - email-templates.ts     → Original ASP-focused templates
 * - email-templates-v2.ts  → NYC Today / City Pulse (7am daily)
 * - email-templates-enhanced.ts → Enhanced digests
 * 
 * DESIGN SYSTEM:
 * - email-design-system.ts → Shared colors, typography, spacing
 */

// =============================================================================
// MORNING EMAIL (9am)
// =============================================================================

export { morningBrief, MORNING_BRIEF_EXAMPLES, MORNING_SUBJECT_VARIANTS } from "./morning-template";
export type { 
  MorningBriefData, 
  MorningParkingStatus, 
  MorningTransitAlert, 
  MorningWeather, 
  MorningDayAhead 
} from "./morning-template";

export { 
  PARKING_STATUS_EXAMPLES,
  TRANSIT_ALERT_EXAMPLES,
  WEATHER_EXAMPLES,
  DAY_AHEAD_EXAMPLES,
  COMPLETE_EXAMPLES,
  SUBJECT_LINE_SCENARIOS,
  ASP_SUSPENDED_COPY,
  ASP_ACTIVE_COPY,
  TRANSIT_ALERT_COPY,
  WEATHER_RECOMMENDATIONS,
  DAY_AHEAD_COPY,
  OVERNIGHT_CHANGE_EXAMPLES,
} from "./morning-examples";

// =============================================================================
// MIDDAY EMAIL (12pm)
// =============================================================================

export { middayUpdate, MIDDAY_EXAMPLES, MIDDAY_SUBJECT_VARIANTS } from "./midday-template";
export type { 
  MiddayUpdateData, 
  MiddayBreakingUpdate, 
  MiddayTransitAlert, 
  MiddayLunchSpot,
  MiddayAfternoonPreview 
} from "./midday-template";

export { 
  ASP_STATUS_EXAMPLES,
  TRANSIT_EMERGENCY_EXAMPLES,
  WEATHER_WARNING_EXAMPLES,
  PARKING_EMERGENCY_EXAMPLES,
  TRANSIT_STATUS_EXAMPLES,
  LUNCH_SPOT_EXAMPLES,
  AFTERNOON_PREVIEW_EXAMPLES,
  SCENARIO_EXAMPLES,
  SUBJECT_LINE_SCENARIOS as MIDDAY_SUBJECT_LINE_SCENARIOS,
} from "./midday-examples";
