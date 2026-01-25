// src/config/nyc-knowledge.ts
/**
 * NYC CIVIC KNOWLEDGE BASE
 *
 * Static TypeScript configuration containing NYC's predictable civic calendar.
 * These are events we KNOW will happen that scrapers might miss or report too late.
 *
 * Maintenance: Update this file annually for:
 * - Religious holidays (dates shift each year)
 * - School calendar changes
 * - New recurring events
 *
 * Last verified: 2026-01-24
 */

import { DateTime } from "luxon";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Recurrence pattern types for NYC civic events.
 */
export type RecurrenceType =
  | "fixed-date" // Same date every year (Jan 1, Jul 4)
  | "nth-weekday" // "Third Monday of January" (MLK Day)
  | "manual" // Manually maintained list of dates
  | "weekly" // Every week on specific day(s)
  | "monthly"; // Specific day each month

/**
 * Recurrence rule definition.
 */
export type RecurrenceRule =
  | { type: "fixed-date"; month: number; day: number }
  | { type: "nth-weekday"; month: number; weekday: number; nth: number } // weekday: 1=Mon, 7=Sun
  | { type: "manual"; dates: string[] } // ISO dates
  | { type: "weekly"; weekdays: number[] } // weekday: 1=Mon, 7=Sun
  | { type: "monthly"; day: number };

/**
 * Event categories for filtering and display.
 */
export type EventCategory =
  | "parking"
  | "transit"
  | "civic"
  | "tax"
  | "education"
  | "culture"
  | "weather"
  | "safety"
  | "holiday"
  | "housing";

/**
 * A known NYC civic event with recurrence rules.
 */
export interface KnownEvent {
  id: string;

  // Display
  title: string;
  shortTitle: string; // For compact display ("ASP Suspended")
  description: string;

  // Categorization
  category: EventCategory;
  icon: string; // Emoji for visual scanning

  // Timing
  recurrence: RecurrenceRule;
  alertDaysBefore: number[]; // [7, 3, 1] = alert 7, 3, and 1 days before

  // Content
  messageTemplate: string; // "ASP suspended {date} for {holiday}"
  actionUrl?: string; // Link for more info
  premium?: boolean; // Gate behind subscription

  // Metadata
  source: string; // "nyc.gov/dot" for attribution
  lastVerified: string; // ISO date when rule was verified
}

// =============================================================================
// RECURRENCE CALCULATORS
// =============================================================================

/**
 * Get the nth occurrence of a weekday in a given month.
 * @param monthStart - DateTime set to the first day of the target month
 * @param weekday - Luxon weekday (1=Monday, 7=Sunday)
 * @param nth - Which occurrence (1=first, 2=second, etc.)
 */
function getNthWeekday(
  monthStart: DateTime,
  weekday: number,
  nth: number
): DateTime {
  let current = monthStart.startOf("month");
  let count = 0;

  while (current.month === monthStart.month) {
    if (current.weekday === weekday) {
      count++;
      if (count === nth) return current;
    }
    current = current.plus({ days: 1 });
  }

  // Return last occurrence if nth doesn't exist
  return monthStart.endOf("month");
}

/**
 * Get next occurrence of an event from a reference date.
 * @param rule - The recurrence rule
 * @param from - Reference date (defaults to now)
 * @returns Next occurrence DateTime or null if no future occurrence
 */
export function getNextOccurrence(
  rule: RecurrenceRule,
  from: DateTime = DateTime.now()
): DateTime | null {
  switch (rule.type) {
    case "fixed-date": {
      let next = from.set({ month: rule.month, day: rule.day }).startOf("day");
      if (next <= from) {
        next = next.plus({ years: 1 });
      }
      return next;
    }

    case "nth-weekday": {
      // Find nth weekday of month (e.g., 3rd Monday of January)
      let targetYear = from.year;
      let target = DateTime.fromObject({
        year: targetYear,
        month: rule.month,
        day: 1,
      });

      let result = getNthWeekday(target, rule.weekday, rule.nth);
      if (result <= from) {
        targetYear++;
        target = DateTime.fromObject({
          year: targetYear,
          month: rule.month,
          day: 1,
        });
        result = getNthWeekday(target, rule.weekday, rule.nth);
      }
      return result;
    }

    case "manual": {
      const upcoming = rule.dates
        .map((d) => DateTime.fromISO(d).startOf("day"))
        .filter((d) => d > from)
        .sort((a, b) => a.toMillis() - b.toMillis());
      return upcoming[0] || null;
    }

    case "weekly": {
      // Find next occurrence of any listed weekday
      for (let i = 1; i <= 7; i++) {
        const candidate = from.plus({ days: i }).startOf("day");
        if (rule.weekdays.includes(candidate.weekday)) {
          return candidate;
        }
      }
      return null;
    }

    case "monthly": {
      let next = from.set({ day: rule.day }).startOf("day");
      if (next <= from) {
        next = next.plus({ months: 1 });
      }
      return next;
    }
  }
}

/**
 * Get all occurrences of an event within a date range.
 */
export function getOccurrencesInRange(
  rule: RecurrenceRule,
  start: DateTime,
  end: DateTime
): DateTime[] {
  const occurrences: DateTime[] = [];
  let current = start.minus({ days: 1 });

  while (true) {
    const next = getNextOccurrence(rule, current);
    if (!next || next > end) break;
    if (next >= start) {
      occurrences.push(next);
    }
    current = next;
  }

  return occurrences;
}

// =============================================================================
// NYC CIVIC CALENDAR
// =============================================================================

export const NYC_KNOWLEDGE_BASE: KnownEvent[] = [
  // ---------------------------------------------------------------------------
  // PARKING - ASP Suspensions (Federal Holidays)
  // ---------------------------------------------------------------------------
  {
    id: "asp-new-years",
    title: "Alternate Side Parking Suspended - New Year's Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide for New Year's Day",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "fixed-date", month: 1, day: 1 },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for New Year's Day. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-mlk",
    title: "Alternate Side Parking Suspended - MLK Day",
    shortTitle: "ASP Suspended",
    description:
      "Street cleaning rules suspended citywide for Martin Luther King Jr. Day",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 1, weekday: 1, nth: 3 }, // 3rd Monday
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Martin Luther King Jr. Day. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-presidents",
    title: "Alternate Side Parking Suspended - Presidents Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide for Presidents Day",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 2, weekday: 1, nth: 3 }, // 3rd Monday
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Presidents Day. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-memorial",
    title: "Alternate Side Parking Suspended - Memorial Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide for Memorial Day",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 5, weekday: 1, nth: 4 }, // Last Monday (4th or 5th)
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Memorial Day. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-juneteenth",
    title: "Alternate Side Parking Suspended - Juneteenth",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide for Juneteenth",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "fixed-date", month: 6, day: 19 },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Juneteenth. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-independence",
    title: "Alternate Side Parking Suspended - Independence Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide for Independence Day",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "fixed-date", month: 7, day: 4 },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Independence Day. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-labor",
    title: "Alternate Side Parking Suspended - Labor Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide for Labor Day",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 9, weekday: 1, nth: 1 }, // 1st Monday
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Labor Day. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-columbus",
    title: "Alternate Side Parking Suspended - Columbus Day",
    shortTitle: "ASP Suspended",
    description:
      "Street cleaning rules suspended citywide for Columbus Day / Indigenous Peoples' Day",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 10, weekday: 1, nth: 2 }, // 2nd Monday
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Columbus Day / Indigenous Peoples' Day. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-veterans",
    title: "Alternate Side Parking Suspended - Veterans Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide for Veterans Day",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "fixed-date", month: 11, day: 11 },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Veterans Day. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-thanksgiving",
    title: "Alternate Side Parking Suspended - Thanksgiving",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide for Thanksgiving",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 11, weekday: 4, nth: 4 }, // 4th Thursday
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Thanksgiving. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-christmas",
    title: "Alternate Side Parking Suspended - Christmas",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide for Christmas Day",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "fixed-date", month: 12, day: 25 },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Christmas Day. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // PARKING - ASP Suspensions (Religious Holidays - 2026 dates)
  // ---------------------------------------------------------------------------
  {
    id: "asp-lunar-new-year-2026",
    title: "Alternate Side Parking Suspended - Lunar New Year",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Lunar New Year",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-02-17"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Lunar New Year. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-ash-wednesday-2026",
    title: "Alternate Side Parking Suspended - Ash Wednesday",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Ash Wednesday",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-02-18"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Ash Wednesday. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-purim-2026",
    title: "Alternate Side Parking Suspended - Purim",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Purim",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-03-05"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Purim. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-eid-al-fitr-2026",
    title: "Alternate Side Parking Suspended - Eid al-Fitr",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Eid al-Fitr",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-03-20", "2026-03-21"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Eid al-Fitr. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-good-friday-2026",
    title: "Alternate Side Parking Suspended - Good Friday",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Good Friday",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-04-03"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Good Friday. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-passover-2026",
    title: "Alternate Side Parking Suspended - Passover",
    shortTitle: "ASP Suspended",
    description:
      "Street cleaning rules suspended for Passover (first two and last two days)",
    category: "parking",
    icon: "🚗",
    recurrence: {
      type: "manual",
      dates: ["2026-04-02", "2026-04-03", "2026-04-08", "2026-04-09"],
    },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Passover. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-orthodox-good-friday-2026",
    title: "Alternate Side Parking Suspended - Orthodox Good Friday",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Orthodox Good Friday",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-04-10"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Orthodox Good Friday. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-eid-al-adha-2026",
    title: "Alternate Side Parking Suspended - Eid al-Adha",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Eid al-Adha",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-05-27"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Eid al-Adha. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-rosh-hashanah-2026",
    title: "Alternate Side Parking Suspended - Rosh Hashanah",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Rosh Hashanah",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-09-12", "2026-09-13"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Rosh Hashanah. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-yom-kippur-2026",
    title: "Alternate Side Parking Suspended - Yom Kippur",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Yom Kippur",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-09-21"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Yom Kippur. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-sukkot-2026",
    title: "Alternate Side Parking Suspended - Sukkot",
    shortTitle: "ASP Suspended",
    description:
      "Street cleaning rules suspended for Sukkot (first two and last two days)",
    category: "parking",
    icon: "🚗",
    recurrence: {
      type: "manual",
      dates: ["2026-09-26", "2026-09-27", "2026-10-03", "2026-10-04"],
    },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Sukkot. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-diwali-2026",
    title: "Alternate Side Parking Suspended - Diwali",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Diwali",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-10-20"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "ASP suspended {date} for Diwali. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // TAX DEADLINES
  // ---------------------------------------------------------------------------
  {
    id: "property-tax-q1",
    title: "Property Tax Payment Deadline - Q1",
    shortTitle: "Property Tax Due",
    description: "First quarter property tax payment due",
    category: "tax",
    icon: "🏢",
    recurrence: { type: "fixed-date", month: 7, day: 1 },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Property tax due {date}. Pay at nyc.gov/finance to avoid penalties.",
    actionUrl: "https://www.nyc.gov/site/finance/taxes/property.page",
    source: "nyc.gov/finance",
    lastVerified: "2026-01-01",
  },
  {
    id: "property-tax-q2",
    title: "Property Tax Payment Deadline - Q2",
    shortTitle: "Property Tax Due",
    description: "Second quarter property tax payment due",
    category: "tax",
    icon: "🏢",
    recurrence: { type: "fixed-date", month: 10, day: 1 },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Property tax due {date}. Pay at nyc.gov/finance to avoid penalties.",
    actionUrl: "https://www.nyc.gov/site/finance/taxes/property.page",
    source: "nyc.gov/finance",
    lastVerified: "2026-01-01",
  },
  {
    id: "property-tax-q3",
    title: "Property Tax Payment Deadline - Q3",
    shortTitle: "Property Tax Due",
    description: "Third quarter property tax payment due",
    category: "tax",
    icon: "🏢",
    recurrence: { type: "fixed-date", month: 1, day: 1 },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Property tax due {date}. Pay at nyc.gov/finance to avoid penalties.",
    actionUrl: "https://www.nyc.gov/site/finance/taxes/property.page",
    source: "nyc.gov/finance",
    lastVerified: "2026-01-01",
  },
  {
    id: "property-tax-q4",
    title: "Property Tax Payment Deadline - Q4",
    shortTitle: "Property Tax Due",
    description: "Fourth quarter property tax payment due",
    category: "tax",
    icon: "🏢",
    recurrence: { type: "fixed-date", month: 4, day: 1 },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Property tax due {date}. Pay at nyc.gov/finance to avoid penalties.",
    actionUrl: "https://www.nyc.gov/site/finance/taxes/property.page",
    source: "nyc.gov/finance",
    lastVerified: "2026-01-01",
  },
  {
    id: "federal-tax-deadline",
    title: "Federal Tax Filing Deadline",
    shortTitle: "Tax Day",
    description: "Federal income tax returns due",
    category: "tax",
    icon: "📋",
    recurrence: { type: "fixed-date", month: 4, day: 15 },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "Federal taxes due {date}. File at irs.gov or request an extension.",
    actionUrl: "https://www.irs.gov/filing",
    source: "irs.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "estimated-tax-q1",
    title: "Estimated Tax Payment - Q1",
    shortTitle: "Estimated Tax Due",
    description: "First quarter estimated tax payment due",
    category: "tax",
    icon: "📋",
    recurrence: { type: "fixed-date", month: 4, day: 15 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Q1 estimated taxes due {date} for self-employed and freelancers.",
    actionUrl: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
    premium: true,
    source: "irs.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "estimated-tax-q2",
    title: "Estimated Tax Payment - Q2",
    shortTitle: "Estimated Tax Due",
    description: "Second quarter estimated tax payment due",
    category: "tax",
    icon: "📋",
    recurrence: { type: "fixed-date", month: 6, day: 15 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Q2 estimated taxes due {date} for self-employed and freelancers.",
    actionUrl: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
    premium: true,
    source: "irs.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "estimated-tax-q3",
    title: "Estimated Tax Payment - Q3",
    shortTitle: "Estimated Tax Due",
    description: "Third quarter estimated tax payment due",
    category: "tax",
    icon: "📋",
    recurrence: { type: "fixed-date", month: 9, day: 15 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Q3 estimated taxes due {date} for self-employed and freelancers.",
    actionUrl: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
    premium: true,
    source: "irs.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "estimated-tax-q4",
    title: "Estimated Tax Payment - Q4",
    shortTitle: "Estimated Tax Due",
    description: "Fourth quarter estimated tax payment due",
    category: "tax",
    icon: "📋",
    recurrence: { type: "fixed-date", month: 1, day: 15 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Q4 estimated taxes due {date} for self-employed and freelancers.",
    actionUrl: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
    premium: true,
    source: "irs.gov",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // EDUCATION
  // ---------------------------------------------------------------------------
  {
    id: "doe-first-day-2026",
    title: "NYC Public Schools First Day",
    shortTitle: "School Starts",
    description: "First day of school for NYC public schools",
    category: "education",
    icon: "🎒",
    recurrence: { type: "manual", dates: ["2026-09-10"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "First day of school is {date}. Check your child's schedule at schools.nyc.gov.",
    actionUrl: "https://www.schools.nyc.gov/calendar",
    source: "schools.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "doe-winter-break-2026",
    title: "NYC Public Schools Winter Break Starts",
    shortTitle: "Winter Break",
    description: "Winter recess for NYC public schools begins",
    category: "education",
    icon: "❄️",
    recurrence: { type: "manual", dates: ["2026-12-24"] },
    alertDaysBefore: [7, 3],
    messageTemplate:
      "Winter break starts {date}. Schools closed through January 1.",
    source: "schools.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "doe-mid-winter-break-2026",
    title: "NYC Public Schools Mid-Winter Break",
    shortTitle: "Mid-Winter Break",
    description: "Mid-winter recess (February break) for NYC public schools",
    category: "education",
    icon: "🏔️",
    recurrence: { type: "manual", dates: ["2026-02-16"] },
    alertDaysBefore: [14, 7],
    messageTemplate:
      "Mid-winter break starts {date}. Schools closed through February 20.",
    source: "schools.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "doe-spring-break-2026",
    title: "NYC Public Schools Spring Break",
    shortTitle: "Spring Break",
    description: "Spring recess for NYC public schools",
    category: "education",
    icon: "🌸",
    recurrence: { type: "manual", dates: ["2026-04-06"] },
    alertDaysBefore: [14, 7],
    messageTemplate:
      "Spring break starts {date}. Schools closed through April 10.",
    source: "schools.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "doe-last-day-2026",
    title: "NYC Public Schools Last Day",
    shortTitle: "School Ends",
    description: "Last day of school for NYC public schools",
    category: "education",
    icon: "🎉",
    recurrence: { type: "manual", dates: ["2026-06-26"] },
    alertDaysBefore: [7, 1],
    messageTemplate: "Last day of school is {date}. Summer begins!",
    source: "schools.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "doe-regents-june-2026",
    title: "Regents Exams Begin - June",
    shortTitle: "Regents Exams",
    description: "New York State Regents examinations begin",
    category: "education",
    icon: "📝",
    recurrence: { type: "manual", dates: ["2026-06-17"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Regents exams begin {date}. Check schedule at nysed.gov.",
    actionUrl: "https://www.nysed.gov/state-assessment/high-school-regents-examinations",
    premium: true,
    source: "nysed.gov",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // TRANSIT
  // ---------------------------------------------------------------------------
  {
    id: "mta-fare-change-2026",
    title: "MTA Fare Increase",
    shortTitle: "Fare Increase",
    description: "MTA fare and toll increases take effect",
    category: "transit",
    icon: "🚇",
    recurrence: { type: "manual", dates: ["2026-08-01"] },
    alertDaysBefore: [30, 14, 7, 1],
    messageTemplate:
      "MTA fares increase {date}. Base fare goes to $3.00. Load your MetroCard now.",
    actionUrl: "https://new.mta.info/fares",
    premium: true,
    source: "mta.info",
    lastVerified: "2026-01-01",
  },
  {
    id: "congestion-pricing-start",
    title: "Congestion Pricing Begins",
    shortTitle: "Tolling Starts",
    description: "Manhattan congestion pricing tolls begin",
    category: "transit",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-01-05"] },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "Congestion pricing starts {date}. $9 peak, $2.25 off-peak below 60th St.",
    actionUrl: "https://new.mta.info/congestion-relief-zone",
    source: "mta.info",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // CIVIC / VOTING
  // ---------------------------------------------------------------------------
  {
    id: "voter-registration-primary-2026",
    title: "Voter Registration Deadline - Primary Election",
    shortTitle: "Register to Vote",
    description: "Last day to register for June primary election",
    category: "civic",
    icon: "🗳️",
    recurrence: { type: "manual", dates: ["2026-05-29"] },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "Register to vote by {date} to participate in the June primary.",
    actionUrl: "https://vote.nyc/page/register-vote",
    source: "vote.nyc",
    lastVerified: "2026-01-01",
  },
  {
    id: "primary-election-2026",
    title: "Primary Election Day",
    shortTitle: "Primary Day",
    description: "Vote in the primary election",
    category: "civic",
    icon: "🗳️",
    recurrence: { type: "manual", dates: ["2026-06-23"] },
    alertDaysBefore: [14, 7, 3, 1, 0],
    messageTemplate:
      "Primary Election is {date}. Polls open 6am-9pm. Find your poll site at vote.nyc.",
    actionUrl: "https://vote.nyc/page/find-your-poll-site",
    source: "vote.nyc",
    lastVerified: "2026-01-01",
  },
  {
    id: "voter-registration-general-2026",
    title: "Voter Registration Deadline - General Election",
    shortTitle: "Register to Vote",
    description: "Last day to register for November general election",
    category: "civic",
    icon: "🗳️",
    recurrence: { type: "manual", dates: ["2026-10-09"] },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "Register to vote by {date} to participate in the November election.",
    actionUrl: "https://vote.nyc/page/register-vote",
    source: "vote.nyc",
    lastVerified: "2026-01-01",
  },
  {
    id: "general-election-2026",
    title: "General Election Day",
    shortTitle: "Election Day",
    description: "Vote in the general election",
    category: "civic",
    icon: "🗳️",
    recurrence: { type: "manual", dates: ["2026-11-03"] },
    alertDaysBefore: [14, 7, 3, 1, 0],
    messageTemplate:
      "Election Day is {date}. Polls open 6am-9pm. Find your poll site at vote.nyc.",
    actionUrl: "https://vote.nyc/page/find-your-poll-site",
    source: "vote.nyc",
    lastVerified: "2026-01-01",
  },
  {
    id: "early-voting-general-2026",
    title: "Early Voting Begins - General Election",
    shortTitle: "Early Voting",
    description: "Early voting period begins for general election",
    category: "civic",
    icon: "🗳️",
    recurrence: { type: "manual", dates: ["2026-10-24"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Early voting starts {date}. Vote at any early voting site in your borough.",
    actionUrl: "https://vote.nyc/page/early-voting",
    source: "vote.nyc",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // CULTURE / FREE EVENTS
  // ---------------------------------------------------------------------------
  {
    id: "museum-free-first-friday",
    title: "Free Friday Night at MoMA",
    shortTitle: "Free MoMA",
    description: "MoMA is free every Friday from 5:30-9pm",
    category: "culture",
    icon: "🎨",
    recurrence: { type: "weekly", weekdays: [5] }, // Every Friday
    alertDaysBefore: [1, 0],
    messageTemplate: "Free admission at MoMA tonight 5:30-9pm.",
    actionUrl: "https://www.moma.org/visit",
    source: "moma.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "broadway-week-winter-2026",
    title: "NYC Broadway Week - 2-for-1 Tickets",
    shortTitle: "Broadway Week",
    description: "2-for-1 tickets at Broadway shows",
    category: "culture",
    icon: "🎭",
    recurrence: { type: "manual", dates: ["2026-01-21"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Broadway Week starts {date}! 2-for-1 tickets available at nycgo.com/broadway-week.",
    actionUrl: "https://www.nycgo.com/broadway-week",
    premium: true,
    source: "nycgo.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "broadway-week-fall-2026",
    title: "NYC Broadway Week Fall - 2-for-1 Tickets",
    shortTitle: "Broadway Week",
    description: "2-for-1 tickets at Broadway shows",
    category: "culture",
    icon: "🎭",
    recurrence: { type: "manual", dates: ["2026-09-08"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Broadway Week starts {date}! 2-for-1 tickets available at nycgo.com/broadway-week.",
    actionUrl: "https://www.nycgo.com/broadway-week",
    premium: true,
    source: "nycgo.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "restaurant-week-winter-2026",
    title: "NYC Restaurant Week - Winter",
    shortTitle: "Restaurant Week",
    description: "Prix-fixe menus at participating restaurants",
    category: "culture",
    icon: "🍽️",
    recurrence: { type: "manual", dates: ["2026-01-21"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Restaurant Week starts {date}! $30 lunch, $45 dinner at 400+ restaurants.",
    actionUrl: "https://www.nycgo.com/restaurant-week",
    source: "nycgo.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "restaurant-week-summer-2026",
    title: "NYC Restaurant Week - Summer",
    shortTitle: "Restaurant Week",
    description: "Prix-fixe menus at participating restaurants",
    category: "culture",
    icon: "🍽️",
    recurrence: { type: "manual", dates: ["2026-07-20"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Restaurant Week starts {date}! $30 lunch, $45 dinner at 400+ restaurants.",
    actionUrl: "https://www.nycgo.com/restaurant-week",
    source: "nycgo.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "shakespeare-in-park-2026",
    title: "Shakespeare in the Park Begins",
    shortTitle: "Free Shakespeare",
    description: "Free Shakespeare performances at Delacorte Theater",
    category: "culture",
    icon: "🎭",
    recurrence: { type: "manual", dates: ["2026-05-26"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "Shakespeare in the Park starts {date}. Free tickets via lottery at publictheater.org.",
    actionUrl: "https://publictheater.org/free-shakespeare-in-the-park/",
    source: "publictheater.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "summerstage-2026",
    title: "SummerStage Season Begins",
    shortTitle: "SummerStage",
    description: "Free outdoor concerts in Central Park",
    category: "culture",
    icon: "🎵",
    recurrence: { type: "manual", dates: ["2026-06-01"] },
    alertDaysBefore: [30, 14],
    messageTemplate:
      "SummerStage season begins {date}. Free concerts in Central Park through September.",
    actionUrl: "https://cityparksfoundation.org/summerstage/",
    source: "cityparksfoundation.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "smithsonian-free-museum-day-2026",
    title: "Smithsonian Museum Day - Free Admission",
    shortTitle: "Free Museums",
    description: "Free admission at participating museums nationwide",
    category: "culture",
    icon: "🏛️",
    recurrence: { type: "manual", dates: ["2026-09-19"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Museum Day is {date}! Free admission at participating NYC museums with ticket from smithsonianmag.com.",
    actionUrl: "https://www.smithsonianmag.com/museumday/",
    source: "smithsonianmag.com",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // ANNUAL EVENTS / PARADES
  // ---------------------------------------------------------------------------
  {
    id: "lunar-new-year-parade-2026",
    title: "Lunar New Year Parade - Chinatown",
    shortTitle: "Lunar New Year",
    description: "Annual Lunar New Year parade in Chinatown",
    category: "culture",
    icon: "🐉",
    recurrence: { type: "manual", dates: ["2026-02-22"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Lunar New Year Parade is {date} in Chinatown! Starts 1pm on Mott Street.",
    source: "betterchinatown.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "st-patricks-parade-2026",
    title: "St. Patrick's Day Parade",
    shortTitle: "St. Patrick's Parade",
    description: "World's largest St. Patrick's Day parade on 5th Ave",
    category: "culture",
    icon: "☘️",
    recurrence: { type: "fixed-date", month: 3, day: 17 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "St. Patrick's Day Parade is {date}! 5th Ave from 44th to 79th St, 11am start.",
    source: "nycstpatricksparade.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "pride-march-2026",
    title: "NYC Pride March",
    shortTitle: "Pride March",
    description: "Annual Pride march through Manhattan",
    category: "culture",
    icon: "🏳️‍🌈",
    recurrence: { type: "manual", dates: ["2026-06-28"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "NYC Pride March is {date}! Starts noon at 25th & 5th Ave.",
    actionUrl: "https://www.nycpride.org/",
    source: "nycpride.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "macy-thanksgiving-parade-2026",
    title: "Macy's Thanksgiving Day Parade",
    shortTitle: "Thanksgiving Parade",
    description: "Annual Macy's parade through Manhattan",
    category: "culture",
    icon: "🎈",
    recurrence: { type: "nth-weekday", month: 11, weekday: 4, nth: 4 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Macy's Thanksgiving Parade is {date}! Starts 9am at 77th & Central Park West.",
    source: "macys.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "nyc-marathon-2026",
    title: "TCS NYC Marathon",
    shortTitle: "NYC Marathon",
    description: "World's largest marathon through all 5 boroughs",
    category: "culture",
    icon: "🏃",
    recurrence: { type: "nth-weekday", month: 11, weekday: 7, nth: 1 },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "NYC Marathon is {date}! Expect major street closures across all 5 boroughs.",
    actionUrl: "https://www.nyrr.org/tcsnycmarathon",
    source: "nyrr.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "times-square-nye-2026",
    title: "Times Square New Year's Eve",
    shortTitle: "Ball Drop",
    description: "Times Square New Year's Eve celebration",
    category: "culture",
    icon: "🎆",
    recurrence: { type: "fixed-date", month: 12, day: 31 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Times Square Ball Drop is {date}! Access starts 3pm, ball drops midnight.",
    source: "timessquarenyc.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // SEASONAL
  // ---------------------------------------------------------------------------
  {
    id: "daylight-saving-spring-2026",
    title: "Daylight Saving Time Begins",
    shortTitle: "Clocks Forward",
    description: "Set clocks forward 1 hour",
    category: "holiday",
    icon: "⏰",
    recurrence: { type: "manual", dates: ["2026-03-08"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "Daylight Saving Time begins {date}. Set clocks FORWARD 1 hour at 2am.",
    source: "timeanddate.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "daylight-saving-fall-2026",
    title: "Daylight Saving Time Ends",
    shortTitle: "Clocks Back",
    description: "Set clocks back 1 hour",
    category: "holiday",
    icon: "⏰",
    recurrence: { type: "manual", dates: ["2026-11-01"] },
    alertDaysBefore: [3, 1],
    messageTemplate:
      "Daylight Saving Time ends {date}. Set clocks BACK 1 hour at 2am.",
    source: "timeanddate.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "rockefeller-tree-lighting-2026",
    title: "Rockefeller Center Tree Lighting",
    shortTitle: "Tree Lighting",
    description: "Annual Christmas tree lighting ceremony",
    category: "culture",
    icon: "🎄",
    recurrence: { type: "manual", dates: ["2026-12-02"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Rockefeller Tree Lighting is {date}! Ceremony starts 7pm, expect crowds.",
    source: "rockefellercenter.com",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // HOUSING
  // ---------------------------------------------------------------------------
  {
    id: "rgb-vote-2026",
    title: "Rent Guidelines Board Vote",
    shortTitle: "Rent Vote",
    description: "Annual vote setting rent increases for stabilized apartments",
    category: "housing",
    icon: "📊",
    recurrence: { type: "manual", dates: ["2026-06-24"] },
    alertDaysBefore: [30, 14, 7, 1],
    messageTemplate:
      "Rent Guidelines Board votes {date} on rent increases for 1M+ apartments.",
    actionUrl: "https://rentguidelinesboard.cityofnewyork.us/",
    source: "rentguidelinesboard.cityofnewyork.us",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // SAFETY / WEATHER
  // ---------------------------------------------------------------------------
  {
    id: "hurricane-season-start",
    title: "Atlantic Hurricane Season Begins",
    shortTitle: "Hurricane Season",
    description: "Atlantic hurricane season officially begins",
    category: "weather",
    icon: "🌀",
    recurrence: { type: "fixed-date", month: 6, day: 1 },
    alertDaysBefore: [7],
    messageTemplate:
      "Hurricane season starts {date}. Review emergency plans at nyc.gov/notifynyc.",
    actionUrl: "https://www.nyc.gov/site/em/ready/notify-nyc.page",
    source: "noaa.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "air-quality-season",
    title: "Ozone Season Begins",
    shortTitle: "Air Quality Season",
    description: "Peak ozone season begins - air quality alerts more common",
    category: "weather",
    icon: "🌫️",
    recurrence: { type: "fixed-date", month: 5, day: 1 },
    alertDaysBefore: [7],
    messageTemplate:
      "Ozone season begins {date}. Sign up for air quality alerts at airnow.gov.",
    actionUrl: "https://www.airnow.gov/",
    source: "airnow.gov",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // MORE PARADES & FESTIVALS
  // ---------------------------------------------------------------------------
  {
    id: "puerto-rican-day-parade-2026",
    title: "Puerto Rican Day Parade",
    shortTitle: "PR Day Parade",
    description: "Annual Puerto Rican Day parade on 5th Avenue",
    category: "culture",
    icon: "🇵🇷",
    recurrence: { type: "manual", dates: ["2026-06-14"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Puerto Rican Day Parade is {date}! 5th Ave from 44th to 79th St.",
    source: "nprdpinc.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "dominican-day-parade-2026",
    title: "Dominican Day Parade",
    shortTitle: "Dominican Parade",
    description: "Annual Dominican Day parade on 6th Avenue",
    category: "culture",
    icon: "🇩🇴",
    recurrence: { type: "manual", dates: ["2026-08-09"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Dominican Day Parade is {date}! 6th Ave from 36th to 56th St.",
    source: "dominicanparade.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "west-indian-day-parade-2026",
    title: "West Indian Day Parade",
    shortTitle: "Carnival",
    description: "Annual Caribbean carnival parade in Brooklyn",
    category: "culture",
    icon: "🎭",
    recurrence: { type: "nth-weekday", month: 9, weekday: 1, nth: 1 }, // Labor Day
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "West Indian Day Parade is {date}! Eastern Parkway, Brooklyn. Expect major closures.",
    source: "wiadcacarnival.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "greek-independence-parade-2026",
    title: "Greek Independence Day Parade",
    shortTitle: "Greek Parade",
    description: "Annual Greek Independence Day parade on 5th Avenue",
    category: "culture",
    icon: "🇬🇷",
    recurrence: { type: "manual", dates: ["2026-03-22"] },
    alertDaysBefore: [7, 3],
    messageTemplate:
      "Greek Independence Day Parade is {date}! 5th Ave, 1pm start.",
    source: "greekparade.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "israel-day-parade-2026",
    title: "Celebrate Israel Parade",
    shortTitle: "Israel Parade",
    description: "Annual Israel Day parade on 5th Avenue",
    category: "culture",
    icon: "🇮🇱",
    recurrence: { type: "manual", dates: ["2026-06-07"] },
    alertDaysBefore: [7, 3],
    messageTemplate:
      "Celebrate Israel Parade is {date}! 5th Ave from 57th to 74th St.",
    source: "celebrateisraelny.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "village-halloween-parade-2026",
    title: "Village Halloween Parade",
    shortTitle: "Halloween Parade",
    description: "Annual Halloween parade in Greenwich Village",
    category: "culture",
    icon: "🎃",
    recurrence: { type: "fixed-date", month: 10, day: 31 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Village Halloween Parade is {date}! 6th Ave from Spring to 16th St, 7pm. Costumes required to march!",
    actionUrl: "https://halloween-nyc.com/",
    source: "halloween-nyc.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "san-gennaro-2026",
    title: "Feast of San Gennaro",
    shortTitle: "San Gennaro",
    description: "Annual 11-day Italian-American festival in Little Italy",
    category: "culture",
    icon: "🍝",
    recurrence: { type: "manual", dates: ["2026-09-10"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Feast of San Gennaro starts {date}! 11 days of food, games, and festivities on Mulberry Street.",
    actionUrl: "https://www.sangennaro.nyc/",
    source: "sangennaro.nyc",
    lastVerified: "2026-01-01",
  },
  {
    id: "atlantic-antic-2026",
    title: "Atlantic Antic Street Fair",
    shortTitle: "Atlantic Antic",
    description: "Brooklyn's largest street fair on Atlantic Avenue",
    category: "culture",
    icon: "🎪",
    recurrence: { type: "manual", dates: ["2026-09-27"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Atlantic Antic is {date}! Atlantic Ave from Hicks to 4th Ave, 10am-6pm.",
    source: "atlanticave.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "cherry-blossom-festival-2026",
    title: "Brooklyn Botanic Garden Cherry Blossom Festival",
    shortTitle: "Sakura Matsuri",
    description: "Annual cherry blossom celebration at Brooklyn Botanic Garden",
    category: "culture",
    icon: "🌸",
    recurrence: { type: "manual", dates: ["2026-04-25"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Sakura Matsuri is {date}! Cherry blossom festival at Brooklyn Botanic Garden.",
    actionUrl: "https://www.bbg.org/visit/event/sakura_matsuri",
    source: "bbg.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // MORE FREE MUSEUM DAYS
  // ---------------------------------------------------------------------------
  {
    id: "brooklyn-museum-first-saturday",
    title: "Brooklyn Museum First Saturday",
    shortTitle: "Free Brooklyn Museum",
    description: "Free admission and events on first Saturday of each month",
    category: "culture",
    icon: "🏛️",
    recurrence: { type: "monthly", day: 1 }, // First Saturday approximation
    alertDaysBefore: [3, 1],
    messageTemplate:
      "Brooklyn Museum First Saturday is {date}! Free admission 5-11pm with live music and performances.",
    actionUrl: "https://www.brooklynmuseum.org/visit/first_saturdays",
    source: "brooklynmuseum.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "amnh-pay-what-you-wish",
    title: "American Museum of Natural History Pay-What-You-Wish",
    shortTitle: "Free AMNH",
    description: "Pay-what-you-wish admission every day for NYC residents",
    category: "culture",
    icon: "🦕",
    recurrence: { type: "weekly", weekdays: [1, 2, 3, 4, 5, 6, 7] },
    alertDaysBefore: [0],
    messageTemplate:
      "Reminder: AMNH has pay-what-you-wish admission for NYC residents anytime.",
    actionUrl: "https://www.amnh.org/plan-your-visit/admission",
    source: "amnh.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "met-pay-what-you-wish",
    title: "The Met Pay-What-You-Wish for NY Residents",
    shortTitle: "Free Met",
    description: "Pay-what-you-wish admission for NY state residents",
    category: "culture",
    icon: "🎨",
    recurrence: { type: "weekly", weekdays: [1, 2, 3, 4, 5, 6, 7] },
    alertDaysBefore: [0],
    messageTemplate:
      "Reminder: The Met has pay-what-you-wish admission for NY state residents.",
    actionUrl: "https://www.metmuseum.org/visit/plan-your-visit/tickets",
    source: "metmuseum.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "whitney-free-friday",
    title: "Whitney Museum Free Friday Nights",
    shortTitle: "Free Whitney",
    description: "Pay-what-you-wish admission Friday evenings 5-10pm",
    category: "culture",
    icon: "🖼️",
    recurrence: { type: "weekly", weekdays: [5] },
    alertDaysBefore: [1, 0],
    messageTemplate:
      "Whitney Museum is pay-what-you-wish tonight 5-10pm!",
    actionUrl: "https://whitney.org/visit",
    source: "whitney.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "guggenheim-pay-what-you-wish",
    title: "Guggenheim Pay-What-You-Wish Saturdays",
    shortTitle: "Free Guggenheim",
    description: "Pay-what-you-wish admission Saturday 4-6pm",
    category: "culture",
    icon: "🏛️",
    recurrence: { type: "weekly", weekdays: [6] },
    alertDaysBefore: [1, 0],
    messageTemplate:
      "Guggenheim is pay-what-you-wish today 4-6pm!",
    actionUrl: "https://www.guggenheim.org/plan-your-visit",
    source: "guggenheim.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // SPORTS
  // ---------------------------------------------------------------------------
  {
    id: "yankees-opening-day-2026",
    title: "Yankees Opening Day",
    shortTitle: "Yankees Opener",
    description: "New York Yankees home opener at Yankee Stadium",
    category: "culture",
    icon: "⚾",
    recurrence: { type: "manual", dates: ["2026-04-02"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Yankees Opening Day is {date}! Expect heavy traffic around Yankee Stadium.",
    source: "mlb.com/yankees",
    lastVerified: "2026-01-01",
  },
  {
    id: "mets-opening-day-2026",
    title: "Mets Opening Day",
    shortTitle: "Mets Opener",
    description: "New York Mets home opener at Citi Field",
    category: "culture",
    icon: "⚾",
    recurrence: { type: "manual", dates: ["2026-04-06"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Mets Opening Day is {date}! Expect heavy traffic around Citi Field.",
    source: "mlb.com/mets",
    lastVerified: "2026-01-01",
  },
  {
    id: "us-open-tennis-2026",
    title: "US Open Tennis Championship Begins",
    shortTitle: "US Open",
    description: "US Open tennis tournament at USTA Billie Jean King National Tennis Center",
    category: "culture",
    icon: "🎾",
    recurrence: { type: "manual", dates: ["2026-08-31"] },
    alertDaysBefore: [30, 14, 7, 1],
    messageTemplate:
      "US Open starts {date}! Two weeks of world-class tennis in Flushing.",
    actionUrl: "https://www.usopen.org/",
    premium: true,
    source: "usopen.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "nyc-half-marathon-2026",
    title: "United Airlines NYC Half Marathon",
    shortTitle: "NYC Half",
    description: "Half marathon through Manhattan and Brooklyn",
    category: "culture",
    icon: "🏃",
    recurrence: { type: "manual", dates: ["2026-03-15"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "NYC Half Marathon is {date}! Expect street closures in Lower Manhattan and Brooklyn.",
    actionUrl: "https://www.nyrr.org/races/unitedairlinesnychalfmarathon",
    source: "nyrr.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "brooklyn-half-marathon-2026",
    title: "RBC Brooklyn Half Marathon",
    shortTitle: "Brooklyn Half",
    description: "Half marathon through Prospect Park to Coney Island",
    category: "culture",
    icon: "🏃",
    recurrence: { type: "manual", dates: ["2026-05-16"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Brooklyn Half Marathon is {date}! Major street closures from Prospect Park to Coney Island.",
    actionUrl: "https://www.nyrr.org/races/rbcbrooklynhalfmarathon",
    source: "nyrr.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // CITY SERVICES & SEASONS
  // ---------------------------------------------------------------------------
  {
    id: "nyc-beaches-open-2026",
    title: "NYC Beaches Open for Swimming",
    shortTitle: "Beach Season",
    description: "NYC public beaches open for swimming with lifeguards",
    category: "culture",
    icon: "🏖️",
    recurrence: { type: "manual", dates: ["2026-05-23"] }, // Memorial Day weekend
    alertDaysBefore: [14, 7, 1],
    messageTemplate:
      "NYC beach season starts {date}! Lifeguards on duty at Coney Island, Rockaway, and all public beaches.",
    actionUrl: "https://www.nycgovparks.org/facilities/beaches",
    source: "nycgovparks.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "nyc-pools-open-2026",
    title: "NYC Public Pools Open",
    shortTitle: "Pool Season",
    description: "NYC public outdoor pools open for the summer",
    category: "culture",
    icon: "🏊",
    recurrence: { type: "manual", dates: ["2026-06-27"] },
    alertDaysBefore: [14, 7, 1],
    messageTemplate:
      "NYC public pools open {date}! Free admission at all 53 outdoor pools.",
    actionUrl: "https://www.nycgovparks.org/facilities/outdoor-pools",
    source: "nycgovparks.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "nyc-ice-rinks-open-2026",
    title: "NYC Public Ice Rinks Open",
    shortTitle: "Ice Rink Season",
    description: "NYC public ice rinks open for winter season",
    category: "culture",
    icon: "⛸️",
    recurrence: { type: "manual", dates: ["2026-11-14"] },
    alertDaysBefore: [7, 3],
    messageTemplate:
      "NYC public ice rinks open {date}! Free admission, skate rentals available.",
    actionUrl: "https://www.nycgovparks.org/facilities/icerinks",
    source: "nycgovparks.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "greenmarket-union-square-saturday",
    title: "Union Square Greenmarket",
    shortTitle: "Farmers Market",
    description: "Year-round farmers market at Union Square",
    category: "culture",
    icon: "🥬",
    recurrence: { type: "weekly", weekdays: [1, 3, 5, 6] }, // Mon, Wed, Fri, Sat
    alertDaysBefore: [0],
    messageTemplate:
      "Union Square Greenmarket is open today! Fresh produce from local farms.",
    actionUrl: "https://www.grownyc.org/greenmarket/manhattan-union-square-m",
    source: "grownyc.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // APPLICATION & ENROLLMENT DEADLINES
  // ---------------------------------------------------------------------------
  {
    id: "doe-gifted-talented-2026",
    title: "NYC Gifted & Talented Application Deadline",
    shortTitle: "G&T Deadline",
    description: "Application deadline for NYC gifted and talented programs",
    category: "education",
    icon: "📝",
    recurrence: { type: "manual", dates: ["2026-02-01"] },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "G&T application deadline is {date}! Apply at myschools.nyc.",
    actionUrl: "https://www.myschools.nyc/",
    premium: true,
    source: "schools.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "doe-kindergarten-2026",
    title: "NYC Kindergarten Application Deadline",
    shortTitle: "K Deadline",
    description: "Application deadline for NYC public kindergarten",
    category: "education",
    icon: "🎒",
    recurrence: { type: "manual", dates: ["2026-01-17"] },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "Kindergarten application deadline is {date}! Apply at myschools.nyc.",
    actionUrl: "https://www.myschools.nyc/",
    source: "schools.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "doe-middle-school-2026",
    title: "NYC Middle School Application Deadline",
    shortTitle: "MS Deadline",
    description: "Application deadline for NYC public middle schools",
    category: "education",
    icon: "🏫",
    recurrence: { type: "manual", dates: ["2026-12-07"] }, // Fall 2026 for 2027 entry
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "Middle school application deadline is {date}! Apply at myschools.nyc.",
    actionUrl: "https://www.myschools.nyc/",
    premium: true,
    source: "schools.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "doe-high-school-2026",
    title: "NYC High School Application Deadline",
    shortTitle: "HS Deadline",
    description: "Application deadline for NYC public high schools",
    category: "education",
    icon: "🎓",
    recurrence: { type: "manual", dates: ["2026-12-01"] },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "High school application deadline is {date}! Apply at myschools.nyc.",
    actionUrl: "https://www.myschools.nyc/",
    premium: true,
    source: "schools.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "shsat-registration-2026",
    title: "Specialized High Schools Test (SHSAT) Registration Deadline",
    shortTitle: "SHSAT Deadline",
    description: "Registration deadline for the specialized high schools admissions test",
    category: "education",
    icon: "📝",
    recurrence: { type: "manual", dates: ["2026-10-21"] },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "SHSAT registration deadline is {date}! Register through your school counselor.",
    actionUrl: "https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade/specialized-high-schools",
    premium: true,
    source: "schools.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "cuny-fall-deadline-2026",
    title: "CUNY Fall Application Deadline",
    shortTitle: "CUNY Deadline",
    description: "Regular application deadline for CUNY fall semester",
    category: "education",
    icon: "🎓",
    recurrence: { type: "fixed-date", month: 2, day: 1 },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "CUNY fall application deadline is {date}! Apply at cuny.edu/admissions.",
    actionUrl: "https://www.cuny.edu/admissions/",
    source: "cuny.edu",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // MORE TRANSIT & INFRASTRUCTURE
  // ---------------------------------------------------------------------------
  {
    id: "summer-streets-2026",
    title: "NYC Summer Streets",
    shortTitle: "Summer Streets",
    description: "Park Avenue closed to cars for pedestrians and cyclists",
    category: "transit",
    icon: "🚴",
    recurrence: { type: "manual", dates: ["2026-08-01", "2026-08-08", "2026-08-15"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Summer Streets is {date}! Park Ave from Brooklyn Bridge to Central Park is car-free 7am-1pm.",
    actionUrl: "https://www.nyc.gov/html/dot/summerstreets/html/home/home.shtml",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "car-free-earth-day-2026",
    title: "Car Free Earth Day NYC",
    shortTitle: "Car Free Day",
    description: "Major streets closed to cars for Earth Day celebration",
    category: "transit",
    icon: "🌍",
    recurrence: { type: "fixed-date", month: 4, day: 22 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Car Free Earth Day is {date}! Select streets closed to vehicles for pedestrians and bikes.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "five-boro-bike-tour-2026",
    title: "TD Five Boro Bike Tour",
    shortTitle: "5 Boro Bike",
    description: "40-mile bike tour through all five boroughs",
    category: "transit",
    icon: "🚴",
    recurrence: { type: "manual", dates: ["2026-05-03"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Five Boro Bike Tour is {date}! Expect major street closures across all 5 boroughs.",
    actionUrl: "https://www.bike.nyc/events/td-five-boro-bike-tour/",
    source: "bike.nyc",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // MORE HOUSING & CIVIC
  // ---------------------------------------------------------------------------
  {
    id: "heat-season-start",
    title: "NYC Heat Season Begins",
    shortTitle: "Heat Season",
    description: "Landlords must provide heat (68F daytime, 62F nighttime)",
    category: "housing",
    icon: "🌡️",
    recurrence: { type: "fixed-date", month: 10, day: 1 },
    alertDaysBefore: [7, 1],
    messageTemplate:
      "Heat season starts {date}! Landlords must provide heat when outdoor temp drops below 55F.",
    actionUrl: "https://www.nyc.gov/site/hpd/services-and-information/heat-and-hot-water.page",
    source: "nyc.gov/hpd",
    lastVerified: "2026-01-01",
  },
  {
    id: "heat-season-end",
    title: "NYC Heat Season Ends",
    shortTitle: "Heat Season Ends",
    description: "Required heating season ends",
    category: "housing",
    icon: "🌡️",
    recurrence: { type: "fixed-date", month: 5, day: 31 },
    alertDaysBefore: [7],
    messageTemplate:
      "Heat season ends {date}. Landlords no longer required to provide heat (but many continue).",
    source: "nyc.gov/hpd",
    lastVerified: "2026-01-01",
  },
  {
    id: "scrie-drie-renewal-2026",
    title: "SCRIE/DRIE Renewal Deadline",
    shortTitle: "SCRIE Renewal",
    description: "Senior/Disability Rent Increase Exemption renewal deadline",
    category: "housing",
    icon: "🏠",
    recurrence: { type: "manual", dates: ["2026-03-15"] },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate:
      "SCRIE/DRIE renewal deadline is {date}. Renew at nyc.gov/finance to maintain your benefit.",
    actionUrl: "https://www.nyc.gov/site/finance/benefits/renters-scrie.page",
    premium: true,
    source: "nyc.gov/finance",
    lastVerified: "2026-01-01",
  },
  {
    id: "community-board-meetings",
    title: "Community Board Meeting",
    shortTitle: "CB Meeting",
    description: "Monthly community board general meeting",
    category: "civic",
    icon: "🏛️",
    recurrence: { type: "monthly", day: 15 }, // Varies by board, approximate
    alertDaysBefore: [7, 3],
    messageTemplate:
      "Reminder: Check your Community Board's meeting schedule at nyc.gov/cau.",
    actionUrl: "https://www.nyc.gov/site/cau/community-boards/community-boards.page",
    source: "nyc.gov/cau",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // SEASONAL & MISCELLANEOUS
  // ---------------------------------------------------------------------------
  {
    id: "nyc-restaurant-week-summer-2026",
    title: "NYC Must-See Week - Summer",
    shortTitle: "Must-See Week",
    description: "2-for-1 tickets to attractions, tours, and performances",
    category: "culture",
    icon: "🎟️",
    recurrence: { type: "manual", dates: ["2026-01-21"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "NYC Must-See Week starts {date}! 2-for-1 tickets to attractions and tours.",
    actionUrl: "https://www.nycgo.com/must-see-week",
    source: "nycgo.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "nyc-hotel-week-winter-2026",
    title: "NYC Hotel Week - Winter",
    shortTitle: "Hotel Week",
    description: "Discounted hotel rates at participating NYC hotels",
    category: "culture",
    icon: "🏨",
    recurrence: { type: "manual", dates: ["2026-01-05"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "NYC Hotel Week starts {date}! $100-$300/night at 400+ hotels.",
    actionUrl: "https://www.nycgo.com/hotel-week",
    premium: true,
    source: "nycgo.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "open-house-new-york-2026",
    title: "Open House New York Weekend",
    shortTitle: "OHNY",
    description: "Free access to architectural landmarks and hidden spaces",
    category: "culture",
    icon: "🏛️",
    recurrence: { type: "manual", dates: ["2026-10-17"] },
    alertDaysBefore: [30, 14, 7, 3],
    messageTemplate:
      "Open House New York is {date}! Free tours of 200+ architectural sites.",
    actionUrl: "https://ohny.org/",
    source: "ohny.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "bryant-park-winter-village-2026",
    title: "Bryant Park Winter Village Opens",
    shortTitle: "Winter Village",
    description: "Holiday shops and ice rink at Bryant Park",
    category: "culture",
    icon: "⛸️",
    recurrence: { type: "manual", dates: ["2026-10-30"] },
    alertDaysBefore: [7, 3],
    messageTemplate:
      "Bryant Park Winter Village opens {date}! Free ice skating (bring your own skates) and holiday shopping.",
    actionUrl: "https://bryantpark.org/programs/the-rink",
    source: "bryantpark.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "columbus-circle-holiday-market-2026",
    title: "Columbus Circle Holiday Market Opens",
    shortTitle: "Holiday Market",
    description: "Annual holiday market at Columbus Circle",
    category: "culture",
    icon: "🎄",
    recurrence: { type: "manual", dates: ["2026-11-27"] },
    alertDaysBefore: [7, 3],
    messageTemplate:
      "Columbus Circle Holiday Market opens {date}! 100+ vendors through December 24.",
    source: "urbanspacenyc.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "union-square-holiday-market-2026",
    title: "Union Square Holiday Market Opens",
    shortTitle: "Union Sq Market",
    description: "Annual holiday market at Union Square",
    category: "culture",
    icon: "🎁",
    recurrence: { type: "manual", dates: ["2026-11-19"] },
    alertDaysBefore: [7, 3],
    messageTemplate:
      "Union Square Holiday Market opens {date}! 150+ vendors through December 24.",
    actionUrl: "https://urbanspacenyc.com/union-square-holiday-market",
    source: "urbanspacenyc.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "tribeca-film-festival-2026",
    title: "Tribeca Film Festival Begins",
    shortTitle: "Tribeca Fest",
    description: "Annual film festival in Lower Manhattan",
    category: "culture",
    icon: "🎬",
    recurrence: { type: "manual", dates: ["2026-06-10"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "Tribeca Film Festival starts {date}! Two weeks of films, talks, and events.",
    actionUrl: "https://www.tribecafilm.com/festival",
    premium: true,
    source: "tribecafilm.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "nyc-wine-food-festival-2026",
    title: "NYC Wine & Food Festival",
    shortTitle: "Wine & Food Fest",
    description: "Annual food and wine festival benefiting No Kid Hungry",
    category: "culture",
    icon: "🍷",
    recurrence: { type: "manual", dates: ["2026-10-15"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "NYC Wine & Food Festival starts {date}! Celebrity chef events throughout the city.",
    actionUrl: "https://nycwff.org/",
    premium: true,
    source: "nycwff.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "governors-ball-2026",
    title: "Governors Ball Music Festival",
    shortTitle: "Gov Ball",
    description: "Annual music festival at Flushing Meadows Corona Park",
    category: "culture",
    icon: "🎵",
    recurrence: { type: "manual", dates: ["2026-06-05"] },
    alertDaysBefore: [30, 14, 7, 3],
    messageTemplate:
      "Governors Ball starts {date}! Three days of music in Flushing Meadows.",
    actionUrl: "https://www.governorsballmusicfestival.com/",
    premium: true,
    source: "governorsballmusicfestival.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "nyc-comic-con-2026",
    title: "New York Comic Con",
    shortTitle: "NYCC",
    description: "Annual pop culture convention at Javits Center",
    category: "culture",
    icon: "🦸",
    recurrence: { type: "manual", dates: ["2026-10-08"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "New York Comic Con starts {date}! Four days of comics, cosplay, and pop culture.",
    actionUrl: "https://www.newyorkcomiccon.com/",
    premium: true,
    source: "newyorkcomiccon.com",
    lastVerified: "2026-01-01",
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all events occurring within a date range.
 */
export function getEventsInRange(
  start: DateTime,
  end: DateTime,
  options?: {
    categories?: EventCategory[];
    includePremium?: boolean;
  }
): Array<{ event: KnownEvent; date: DateTime }> {
  const results: Array<{ event: KnownEvent; date: DateTime }> = [];

  for (const event of NYC_KNOWLEDGE_BASE) {
    // Filter by category
    if (options?.categories && !options.categories.includes(event.category)) {
      continue;
    }

    // Filter premium
    if (event.premium && !options?.includePremium) {
      continue;
    }

    // Find occurrences in range
    const occurrences = getOccurrencesInRange(event.recurrence, start, end);
    for (const date of occurrences) {
      results.push({ event, date });
    }
  }

  return results.sort((a, b) => a.date.toMillis() - b.date.toMillis());
}

/**
 * Get events that should trigger alerts today based on alertDaysBefore.
 */
export function getAlertsForToday(
  today: DateTime = DateTime.now(),
  options?: {
    categories?: EventCategory[];
    includePremium?: boolean;
  }
): Array<{ event: KnownEvent; eventDate: DateTime; daysUntil: number }> {
  const results: Array<{
    event: KnownEvent;
    eventDate: DateTime;
    daysUntil: number;
  }> = [];
  const todayStart = today.startOf("day");

  for (const event of NYC_KNOWLEDGE_BASE) {
    // Filter by category
    if (options?.categories && !options.categories.includes(event.category)) {
      continue;
    }

    // Filter premium
    if (event.premium && !options?.includePremium) {
      continue;
    }

    // Find next occurrence
    const nextDate = getNextOccurrence(event.recurrence, todayStart.minus({ days: 1 }));
    if (!nextDate) continue;

    const daysUntil = Math.floor(nextDate.diff(todayStart, "days").days);

    // Check if today is an alert day
    if (event.alertDaysBefore.includes(daysUntil)) {
      results.push({ event, eventDate: nextDate, daysUntil });
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Get count of events by category.
 */
export function getEventCountByCategory(): Record<EventCategory, number> {
  const counts: Record<EventCategory, number> = {
    parking: 0,
    transit: 0,
    civic: 0,
    tax: 0,
    education: 0,
    culture: 0,
    weather: 0,
    safety: 0,
    holiday: 0,
    housing: 0,
  };

  for (const event of NYC_KNOWLEDGE_BASE) {
    counts[event.category]++;
  }

  return counts;
}

/**
 * Format a date for display in messages.
 */
export function formatEventDate(dt: DateTime): string {
  return dt.toFormat("EEEE, MMMM d");
}

/**
 * Apply template variables to a message.
 */
export function applyMessageTemplate(
  template: string,
  date: DateTime,
  extras?: Record<string, string>
): string {
  let result = template.replace("{date}", formatEventDate(date));

  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      result = result.replace(`{${key}}`, value);
    }
  }

  return result;
}
