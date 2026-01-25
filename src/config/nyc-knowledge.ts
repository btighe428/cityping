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

  // ---------------------------------------------------------------------------
  // MAJOR SPORTS - MORE OPENERS & EVENTS
  // ---------------------------------------------------------------------------
  {
    id: "knicks-season-opener-2026",
    title: "Knicks Season Opener",
    shortTitle: "Knicks Opener",
    description: "New York Knicks NBA season home opener at Madison Square Garden",
    category: "culture",
    icon: "🏀",
    recurrence: { type: "manual", dates: ["2026-10-22"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Knicks season opener is {date}! Expect heavy traffic around MSG.",
    actionUrl: "https://www.nba.com/knicks",
    source: "nba.com/knicks",
    lastVerified: "2026-01-01",
  },
  {
    id: "nets-season-opener-2026",
    title: "Brooklyn Nets Season Opener",
    shortTitle: "Nets Opener",
    description: "Brooklyn Nets NBA season home opener at Barclays Center",
    category: "culture",
    icon: "🏀",
    recurrence: { type: "manual", dates: ["2026-10-24"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Nets season opener is {date}! Expect crowds at Barclays Center.",
    actionUrl: "https://www.nba.com/nets",
    source: "nba.com/nets",
    lastVerified: "2026-01-01",
  },
  {
    id: "rangers-season-opener-2026",
    title: "Rangers Season Opener",
    shortTitle: "Rangers Opener",
    description: "New York Rangers NHL season home opener at Madison Square Garden",
    category: "culture",
    icon: "🏒",
    recurrence: { type: "manual", dates: ["2026-10-10"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Rangers season opener is {date}! Hockey is back at MSG.",
    actionUrl: "https://www.nhl.com/rangers",
    source: "nhl.com/rangers",
    lastVerified: "2026-01-01",
  },
  {
    id: "islanders-season-opener-2026",
    title: "NY Islanders Season Opener",
    shortTitle: "Isles Opener",
    description: "New York Islanders NHL season home opener at UBS Arena",
    category: "culture",
    icon: "🏒",
    recurrence: { type: "manual", dates: ["2026-10-12"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Islanders season opener is {date}! UBS Arena in Belmont Park.",
    actionUrl: "https://www.nhl.com/islanders",
    source: "nhl.com/islanders",
    lastVerified: "2026-01-01",
  },
  {
    id: "giants-season-opener-2026",
    title: "NY Giants Season Opener",
    shortTitle: "Giants Opener",
    description: "New York Giants NFL season home opener at MetLife Stadium",
    category: "culture",
    icon: "🏈",
    recurrence: { type: "manual", dates: ["2026-09-13"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Giants season opener is {date}! Expect heavy traffic to MetLife Stadium.",
    actionUrl: "https://www.giants.com",
    source: "giants.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "jets-season-opener-2026",
    title: "NY Jets Season Opener",
    shortTitle: "Jets Opener",
    description: "New York Jets NFL season home opener at MetLife Stadium",
    category: "culture",
    icon: "🏈",
    recurrence: { type: "manual", dates: ["2026-09-20"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Jets season opener is {date}! MetLife Stadium game day.",
    actionUrl: "https://www.newyorkjets.com",
    source: "newyorkjets.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "liberty-season-opener-2026",
    title: "NY Liberty Season Opener",
    shortTitle: "Liberty Opener",
    description: "New York Liberty WNBA season home opener at Barclays Center",
    category: "culture",
    icon: "🏀",
    recurrence: { type: "manual", dates: ["2026-05-16"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Liberty season opener is {date}! WNBA champions return to Barclays.",
    actionUrl: "https://liberty.wnba.com",
    source: "liberty.wnba.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "nycfc-season-opener-2026",
    title: "NYCFC Season Opener",
    shortTitle: "NYCFC Opener",
    description: "New York City FC MLS season home opener",
    category: "culture",
    icon: "⚽",
    recurrence: { type: "manual", dates: ["2026-03-01"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "NYCFC season opener is {date}! MLS soccer returns to NYC.",
    actionUrl: "https://www.newyorkcityfc.com",
    source: "newyorkcityfc.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "red-bulls-season-opener-2026",
    title: "NY Red Bulls Season Opener",
    shortTitle: "Red Bulls Opener",
    description: "New York Red Bulls MLS season home opener at Red Bull Arena",
    category: "culture",
    icon: "⚽",
    recurrence: { type: "manual", dates: ["2026-03-07"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Red Bulls season opener is {date}! Red Bull Arena in Harrison.",
    actionUrl: "https://www.newyorkredbulls.com",
    source: "newyorkredbulls.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "belmont-stakes-2026",
    title: "Belmont Stakes",
    shortTitle: "Belmont Stakes",
    description: "Third leg of horse racing's Triple Crown at Belmont Park",
    category: "culture",
    icon: "🏇",
    recurrence: { type: "manual", dates: ["2026-06-06"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Belmont Stakes is {date}! The 'Test of the Champion' at Belmont Park.",
    actionUrl: "https://www.belmontstakes.com",
    premium: true,
    source: "belmontstakes.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "nyc-triathlon-2026",
    title: "NYC Triathlon",
    shortTitle: "NYC Triathlon",
    description: "Triathlon through Manhattan - swim, bike, run",
    category: "culture",
    icon: "🏊",
    recurrence: { type: "manual", dates: ["2026-07-19"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "NYC Triathlon is {date}! Expect West Side Highway and Central Park closures.",
    actionUrl: "https://www.nyctri.com",
    source: "nyctri.com",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // ICONIC NYC EVENTS
  // ---------------------------------------------------------------------------
  {
    id: "fleet-week-2026",
    title: "Fleet Week New York",
    shortTitle: "Fleet Week",
    description: "US Navy ships dock in NYC, sailors and Marines visit the city",
    category: "culture",
    icon: "⚓",
    recurrence: { type: "manual", dates: ["2026-05-20"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Fleet Week starts {date}! Free ship tours at Intrepid and piers through Memorial Day weekend.",
    actionUrl: "https://www.fleetweeknewyork.com",
    source: "fleetweeknewyork.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "macys-fourth-of-july-2026",
    title: "Macy's Fourth of July Fireworks",
    shortTitle: "July 4th Fireworks",
    description: "Annual Independence Day fireworks display over the East River",
    category: "culture",
    icon: "🎆",
    recurrence: { type: "fixed-date", month: 7, day: 4 },
    alertDaysBefore: [7, 3, 1, 0],
    messageTemplate:
      "Macy's 4th of July Fireworks is {date}! Best views from FDR Drive, Brooklyn Bridge Park, and Williamsburg waterfront.",
    source: "macys.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "coney-island-mermaid-parade-2026",
    title: "Coney Island Mermaid Parade",
    shortTitle: "Mermaid Parade",
    description: "Nation's largest art parade celebrating the beginning of summer",
    category: "culture",
    icon: "🧜‍♀️",
    recurrence: { type: "manual", dates: ["2026-06-20"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Mermaid Parade is {date}! The kickoff to summer at Coney Island - costumes encouraged!",
    actionUrl: "https://www.coneyisland.com/mermaid-parade",
    source: "coneyisland.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "nathan-hot-dog-contest-2026",
    title: "Nathan's Hot Dog Eating Contest",
    shortTitle: "Hot Dog Contest",
    description: "Annual competitive eating contest at Coney Island",
    category: "culture",
    icon: "🌭",
    recurrence: { type: "fixed-date", month: 7, day: 4 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Nathan's Hot Dog Contest is {date}! Competitive eating at Coney Island, noon start.",
    source: "nathansfamous.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "easter-parade-2026",
    title: "Easter Parade & Bonnet Festival",
    shortTitle: "Easter Parade",
    description: "Traditional Easter Parade on Fifth Avenue",
    category: "culture",
    icon: "🐣",
    recurrence: { type: "manual", dates: ["2026-04-05"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Easter Parade is {date}! 5th Ave from 49th to 57th St, 10am-4pm. Wear your fanciest bonnet!",
    source: "nycgo.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "tompkins-halloween-dog-parade-2026",
    title: "Tompkins Square Halloween Dog Parade",
    shortTitle: "Dog Parade",
    description: "Largest dog costume parade in the country",
    category: "culture",
    icon: "🐕",
    recurrence: { type: "manual", dates: ["2026-10-24"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Tompkins Square Dog Parade is {date}! Hundreds of costumed dogs in the East Village.",
    source: "tompkinssquaredogrun.com",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // MUSIC FESTIVALS & CONCERTS
  // ---------------------------------------------------------------------------
  {
    id: "electric-zoo-2026",
    title: "Electric Zoo Festival",
    shortTitle: "Electric Zoo",
    description: "Electronic music festival on Randall's Island",
    category: "culture",
    icon: "🎧",
    recurrence: { type: "manual", dates: ["2026-09-04"] },
    alertDaysBefore: [30, 14, 7, 3],
    messageTemplate:
      "Electric Zoo starts {date}! Three days of EDM on Randall's Island.",
    actionUrl: "https://www.electriczoo.com",
    premium: true,
    source: "electriczoo.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "afropunk-fest-2026",
    title: "AFROPUNK Fest Brooklyn",
    shortTitle: "AFROPUNK",
    description: "Music and culture festival at Commodore Barry Park",
    category: "culture",
    icon: "🎸",
    recurrence: { type: "manual", dates: ["2026-08-22"] },
    alertDaysBefore: [30, 14, 7, 3],
    messageTemplate:
      "AFROPUNK Fest is {date}! Brooklyn's celebration of Black culture and music.",
    actionUrl: "https://afropunk.com",
    premium: true,
    source: "afropunk.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "celebrate-brooklyn-2026",
    title: "Celebrate Brooklyn! Festival Opens",
    shortTitle: "Celebrate BK",
    description: "Free outdoor concerts at Prospect Park Bandshell",
    category: "culture",
    icon: "🎶",
    recurrence: { type: "manual", dates: ["2026-06-03"] },
    alertDaysBefore: [14, 7],
    messageTemplate:
      "Celebrate Brooklyn! starts {date}. Free concerts at Prospect Park through August.",
    actionUrl: "https://www.bfrp.org/celebrate-brooklyn",
    source: "bfrf.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "lincoln-center-midsummer-swing-2026",
    title: "Midsummer Night Swing at Lincoln Center",
    shortTitle: "Midsummer Swing",
    description: "Outdoor dancing under the stars at Lincoln Center",
    category: "culture",
    icon: "💃",
    recurrence: { type: "manual", dates: ["2026-06-23"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Midsummer Night Swing starts {date}! Dance outdoors at Lincoln Center through July.",
    actionUrl: "https://www.lincolncenter.org/series/midsummer-night-swing",
    source: "lincolncenter.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "philharmonic-parks-2026",
    title: "NY Philharmonic Concerts in the Parks",
    shortTitle: "Philharmonic Free",
    description: "Free outdoor concerts by the New York Philharmonic",
    category: "culture",
    icon: "🎻",
    recurrence: { type: "manual", dates: ["2026-06-15"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "NY Philharmonic free concerts start {date}! Performances across all five boroughs.",
    actionUrl: "https://nyphil.org",
    source: "nyphil.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "met-opera-opening-night-2026",
    title: "Metropolitan Opera Opening Night",
    shortTitle: "Met Opening",
    description: "Gala opening of the Metropolitan Opera season",
    category: "culture",
    icon: "🎭",
    recurrence: { type: "manual", dates: ["2026-09-21"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Met Opera Opening Night is {date}! The cultural event of the fall season.",
    actionUrl: "https://www.metopera.org",
    premium: true,
    source: "metopera.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "nutcracker-opens-2026",
    title: "NYC Ballet Nutcracker Opens",
    shortTitle: "Nutcracker",
    description: "George Balanchine's The Nutcracker at Lincoln Center",
    category: "culture",
    icon: "🩰",
    recurrence: { type: "manual", dates: ["2026-11-27"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "NYC Ballet Nutcracker opens {date}! A holiday tradition at Lincoln Center through January 3.",
    actionUrl: "https://www.nycballet.com",
    source: "nycballet.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "make-music-ny-2026",
    title: "Make Music New York",
    shortTitle: "Make Music NY",
    description: "Free citywide celebration of music on the summer solstice",
    category: "culture",
    icon: "🎵",
    recurrence: { type: "fixed-date", month: 6, day: 21 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Make Music New York is {date}! Free concerts across the city for the summer solstice.",
    actionUrl: "https://www.makemusicny.org",
    source: "makemusicny.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // FILM FESTIVALS
  // ---------------------------------------------------------------------------
  {
    id: "new-york-film-festival-2026",
    title: "New York Film Festival",
    shortTitle: "NYFF",
    description: "Annual film festival at Lincoln Center",
    category: "culture",
    icon: "🎬",
    recurrence: { type: "manual", dates: ["2026-09-25"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "New York Film Festival starts {date}! World premieres at Lincoln Center through October 11.",
    actionUrl: "https://www.filmlinc.org/nyff",
    premium: true,
    source: "filmlinc.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "doc-nyc-2026",
    title: "DOC NYC Documentary Festival",
    shortTitle: "DOC NYC",
    description: "America's largest documentary film festival",
    category: "culture",
    icon: "📽️",
    recurrence: { type: "manual", dates: ["2026-11-11"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "DOC NYC starts {date}! 200+ documentaries over 10 days.",
    actionUrl: "https://www.docnyc.net",
    premium: true,
    source: "docnyc.net",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // MORE PARADES & CULTURAL CELEBRATIONS
  // ---------------------------------------------------------------------------
  {
    id: "indian-day-parade-2026",
    title: "India Day Parade",
    shortTitle: "India Day",
    description: "Celebrating Indian Independence Day on Madison Avenue",
    category: "culture",
    icon: "🇮🇳",
    recurrence: { type: "manual", dates: ["2026-08-16"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "India Day Parade is {date}! Madison Ave from 38th to 27th St.",
    source: "fianyc.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "pakistan-day-parade-2026",
    title: "Pakistan Day Parade",
    shortTitle: "Pakistan Day",
    description: "Celebrating Pakistani Independence on Madison Avenue",
    category: "culture",
    icon: "🇵🇰",
    recurrence: { type: "manual", dates: ["2026-08-02"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Pakistan Day Parade is {date}! Madison Ave from 41st to 26th St.",
    source: "pakistanparade.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "brazilian-day-2026",
    title: "Brazilian Day NYC",
    shortTitle: "Brazilian Day",
    description: "Largest Brazilian festival outside of Brazil",
    category: "culture",
    icon: "🇧🇷",
    recurrence: { type: "manual", dates: ["2026-09-06"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Brazilian Day is {date}! Little Brazil Street on West 46th St, plus concert on 6th Ave.",
    actionUrl: "https://www.brazilianday.com",
    source: "brazilianday.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "african-american-day-parade-2026",
    title: "African American Day Parade",
    shortTitle: "AA Day Parade",
    description: "Harlem's celebration of African American culture",
    category: "culture",
    icon: "✊",
    recurrence: { type: "manual", dates: ["2026-09-20"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "African American Day Parade is {date}! Adam Clayton Powell Jr. Blvd in Harlem.",
    source: "africanamericandayparade.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "hispanic-day-parade-2026",
    title: "Hispanic Day Parade",
    shortTitle: "Hispanic Parade",
    description: "Celebrating Hispanic heritage on Fifth Avenue",
    category: "culture",
    icon: "🌎",
    recurrence: { type: "manual", dates: ["2026-10-11"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Hispanic Day Parade is {date}! 5th Ave from 44th to 72nd St.",
    source: "hispanicparade.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "steuben-parade-2026",
    title: "German-American Steuben Parade",
    shortTitle: "Steuben Parade",
    description: "German-American celebration on Fifth Avenue",
    category: "culture",
    icon: "🇩🇪",
    recurrence: { type: "manual", dates: ["2026-09-19"] },
    alertDaysBefore: [7, 3],
    messageTemplate:
      "Steuben Parade is {date}! German-American heritage on 5th Ave.",
    source: "germanparadenyc.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "columbus-day-parade-2026",
    title: "Columbus Day Parade",
    shortTitle: "Columbus Parade",
    description: "Annual parade celebrating Italian-American heritage",
    category: "culture",
    icon: "🇮🇹",
    recurrence: { type: "nth-weekday", month: 10, weekday: 1, nth: 2 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Columbus Day Parade is {date}! 5th Ave from 44th to 72nd St.",
    source: "columbuscitizensfd.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "veterans-day-parade-2026",
    title: "NYC Veterans Day Parade",
    shortTitle: "Veterans Parade",
    description: "America's largest Veterans Day parade on Fifth Avenue",
    category: "civic",
    icon: "🎖️",
    recurrence: { type: "fixed-date", month: 11, day: 11 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Veterans Day Parade is {date}! 5th Ave from 26th to 45th St. Honor our veterans.",
    source: "uwvc.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "memorial-day-parade-2026",
    title: "Memorial Day Parade",
    shortTitle: "Memorial Parade",
    description: "Annual parade honoring fallen service members",
    category: "civic",
    icon: "🇺🇸",
    recurrence: { type: "nth-weekday", month: 5, weekday: 1, nth: 4 },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Memorial Day Parade is {date}! Multiple parades across all five boroughs.",
    source: "nycgo.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "philippines-independence-parade-2026",
    title: "Philippine Independence Day Parade",
    shortTitle: "Filipino Parade",
    description: "Annual celebration of Philippine Independence",
    category: "culture",
    icon: "🇵🇭",
    recurrence: { type: "manual", dates: ["2026-06-07"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Philippine Independence Day Parade is {date}! Madison Ave celebration.",
    source: "pidpny.com",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // PRIDE EVENTS BY BOROUGH
  // ---------------------------------------------------------------------------
  {
    id: "brooklyn-pride-2026",
    title: "Brooklyn Pride",
    shortTitle: "Brooklyn Pride",
    description: "Brooklyn's LGBTQ+ pride celebration",
    category: "culture",
    icon: "🏳️‍🌈",
    recurrence: { type: "manual", dates: ["2026-06-13"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Brooklyn Pride is {date}! Festival and parade in Park Slope.",
    actionUrl: "https://www.brooklynpride.org",
    source: "brooklynpride.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "queens-pride-2026",
    title: "Queens Pride",
    shortTitle: "Queens Pride",
    description: "Queens LGBTQ+ pride celebration in Jackson Heights",
    category: "culture",
    icon: "🏳️‍🌈",
    recurrence: { type: "manual", dates: ["2026-06-07"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Queens Pride is {date}! Parade and festival in Jackson Heights.",
    actionUrl: "https://www.queenspride.org",
    source: "queenspride.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // ART FAIRS & EXHIBITIONS
  // ---------------------------------------------------------------------------
  {
    id: "armory-show-2026",
    title: "The Armory Show",
    shortTitle: "Armory Show",
    description: "Premier modern and contemporary art fair at Javits Center",
    category: "culture",
    icon: "🎨",
    recurrence: { type: "manual", dates: ["2026-09-04"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "The Armory Show opens {date}! Contemporary art from 200+ galleries.",
    actionUrl: "https://www.thearmoryshow.com",
    premium: true,
    source: "thearmoryshow.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "frieze-new-york-2026",
    title: "Frieze New York",
    shortTitle: "Frieze NY",
    description: "International contemporary art fair in Manhattan",
    category: "culture",
    icon: "🖼️",
    recurrence: { type: "manual", dates: ["2026-05-01"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "Frieze New York opens {date}! World-class contemporary art fair.",
    actionUrl: "https://www.frieze.com/fairs/frieze-new-york",
    premium: true,
    source: "frieze.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "ny-auto-show-2026",
    title: "New York International Auto Show",
    shortTitle: "Auto Show",
    description: "Annual auto show at Javits Center",
    category: "culture",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-04-10"] },
    alertDaysBefore: [30, 14, 7, 3],
    messageTemplate:
      "NY Auto Show opens {date}! New vehicles and concept cars at Javits Center through April 19.",
    actionUrl: "https://www.autoshowny.com",
    source: "autoshowny.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "ny-fashion-week-feb-2026",
    title: "New York Fashion Week - February",
    shortTitle: "Fashion Week",
    description: "Fall/Winter collections showcase",
    category: "culture",
    icon: "👗",
    recurrence: { type: "manual", dates: ["2026-02-12"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "New York Fashion Week starts {date}! Fall/Winter collections across the city.",
    actionUrl: "https://nyfw.com",
    premium: true,
    source: "nyfw.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "ny-fashion-week-sep-2026",
    title: "New York Fashion Week - September",
    shortTitle: "Fashion Week",
    description: "Spring/Summer collections showcase",
    category: "culture",
    icon: "👗",
    recurrence: { type: "manual", dates: ["2026-09-09"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "New York Fashion Week starts {date}! Spring/Summer collections across the city.",
    actionUrl: "https://nyfw.com",
    premium: true,
    source: "nyfw.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "museum-mile-festival-2026",
    title: "Museum Mile Festival",
    shortTitle: "Museum Mile",
    description: "Free admission to 9 museums on Fifth Avenue",
    category: "culture",
    icon: "🏛️",
    recurrence: { type: "manual", dates: ["2026-06-09"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "Museum Mile Festival is {date}! Free admission to 9 museums from 82nd to 105th St, 6-9pm.",
    actionUrl: "https://www.museummilefestival.org",
    source: "museummilefestival.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "westminster-dog-show-2026",
    title: "Westminster Kennel Club Dog Show",
    shortTitle: "Westminster",
    description: "Annual prestigious dog show",
    category: "culture",
    icon: "🐕",
    recurrence: { type: "manual", dates: ["2026-05-09"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Westminster Dog Show starts {date}! Best in Show competition May 12.",
    actionUrl: "https://www.westminsterkennelclub.org",
    premium: true,
    source: "westminsterkennelclub.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // CHARITY WALKS & RUNS
  // ---------------------------------------------------------------------------
  {
    id: "aids-walk-ny-2026",
    title: "AIDS Walk New York",
    shortTitle: "AIDS Walk",
    description: "Fundraising walk through Central Park",
    category: "culture",
    icon: "🎗️",
    recurrence: { type: "manual", dates: ["2026-05-17"] },
    alertDaysBefore: [30, 14, 7, 3],
    messageTemplate:
      "AIDS Walk New York is {date}! Register to walk or donate at aidswalk.net.",
    actionUrl: "https://www.aidswalk.net/newyork",
    source: "aidswalk.net",
    lastVerified: "2026-01-01",
  },
  {
    id: "great-saunter-2026",
    title: "The Great Saunter",
    shortTitle: "Great Saunter",
    description: "32-mile walk around the entire Manhattan shoreline",
    category: "culture",
    icon: "🚶",
    recurrence: { type: "manual", dates: ["2026-05-02"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "The Great Saunter is {date}! Walk the entire 32-mile Manhattan shoreline.",
    actionUrl: "https://shorewalkers.org",
    source: "shorewalkers.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "avon-walk-2026",
    title: "Making Strides Against Breast Cancer Walk",
    shortTitle: "Breast Cancer Walk",
    description: "American Cancer Society fundraising walk in Central Park",
    category: "culture",
    icon: "🎀",
    recurrence: { type: "manual", dates: ["2026-10-18"] },
    alertDaysBefore: [30, 14, 7, 3],
    messageTemplate:
      "Making Strides Walk is {date}! Central Park fundraiser for breast cancer research.",
    actionUrl: "https://www.cancer.org/involved/fundraise/making-strides-against-breast-cancer.html",
    source: "cancer.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // MORE FOOD FESTIVALS
  // ---------------------------------------------------------------------------
  {
    id: "smorgasburg-opens-2026",
    title: "Smorgasburg Season Opens",
    shortTitle: "Smorgasburg",
    description: "Brooklyn's premier open-air food market returns",
    category: "culture",
    icon: "🍔",
    recurrence: { type: "manual", dates: ["2026-04-04"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Smorgasburg opens {date}! 100+ food vendors at Williamsburg and Prospect Park through October.",
    actionUrl: "https://www.smorgasburg.com",
    source: "smorgasburg.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "9th-ave-food-festival-2026",
    title: "Ninth Avenue International Food Festival",
    shortTitle: "9th Ave Food Fest",
    description: "One of NYC's largest street fairs with food from around the world",
    category: "culture",
    icon: "🌮",
    recurrence: { type: "manual", dates: ["2026-05-16"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "9th Ave Food Festival is {date}! 20 blocks of international cuisine from 42nd to 57th St.",
    source: "ninthavenuefoodfestival.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "vendy-awards-2026",
    title: "Vendy Awards",
    shortTitle: "Vendys",
    description: "Street food competition and tasting event",
    category: "culture",
    icon: "🚚",
    recurrence: { type: "manual", dates: ["2026-09-12"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Vendy Awards is {date}! Best street food vendors compete for the crown.",
    actionUrl: "https://streetvendor.org/vendys",
    premium: true,
    source: "streetvendor.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // BAM & PERFORMING ARTS FESTIVALS
  // ---------------------------------------------------------------------------
  {
    id: "bam-next-wave-2026",
    title: "BAM Next Wave Festival",
    shortTitle: "Next Wave",
    description: "Brooklyn Academy of Music's avant-garde performing arts festival",
    category: "culture",
    icon: "🎭",
    recurrence: { type: "manual", dates: ["2026-10-07"] },
    alertDaysBefore: [30, 14, 7],
    messageTemplate:
      "BAM Next Wave Festival starts {date}! Cutting-edge performance through December.",
    actionUrl: "https://www.bam.org/nextwave",
    premium: true,
    source: "bam.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "under-the-radar-2026",
    title: "Under the Radar Festival",
    shortTitle: "Under Radar",
    description: "Innovative theater festival at The Public",
    category: "culture",
    icon: "🎭",
    recurrence: { type: "manual", dates: ["2026-01-08"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Under the Radar Festival starts {date}! Experimental theater at The Public through January 18.",
    actionUrl: "https://publictheater.org/programs/under-the-radar/",
    premium: true,
    source: "publictheater.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // OUTDOOR MOVIES & SUMMER ACTIVITIES
  // ---------------------------------------------------------------------------
  {
    id: "movies-with-a-view-2026",
    title: "Movies With a View at Brooklyn Bridge Park",
    shortTitle: "Movies w/ View",
    description: "Free outdoor movies with Manhattan skyline backdrop",
    category: "culture",
    icon: "🎬",
    recurrence: { type: "manual", dates: ["2026-07-09"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Movies With a View starts {date}! Free Thursday night films at Brooklyn Bridge Park through August.",
    actionUrl: "https://www.brooklynbridgepark.org/things-to-do/events/movies-with-a-view",
    source: "brooklynbridgepark.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "bryant-park-movie-nights-2026",
    title: "Bryant Park Movie Nights",
    shortTitle: "Bryant Movies",
    description: "Free Monday night movies on the lawn",
    category: "culture",
    icon: "🎥",
    recurrence: { type: "manual", dates: ["2026-06-15"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Bryant Park Movie Nights start {date}! Free films every Monday through August.",
    actionUrl: "https://bryantpark.org/programs/hbo-bryant-park-movie-nights",
    source: "bryantpark.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "central-park-conservancy-film-2026",
    title: "Central Park Film Festival",
    shortTitle: "CP Film Fest",
    description: "Free movies on the Great Lawn",
    category: "culture",
    icon: "🎬",
    recurrence: { type: "manual", dates: ["2026-08-17"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Central Park Film Festival starts {date}! Free films on the Great Lawn through August 21.",
    actionUrl: "https://www.centralparknyc.org",
    source: "centralparknyc.org",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // FORMULA E & MOTORSPORTS
  // ---------------------------------------------------------------------------
  {
    id: "nyc-e-prix-2026",
    title: "New York City E-Prix",
    shortTitle: "NYC E-Prix",
    description: "Formula E electric car racing at Brooklyn Navy Yard",
    category: "culture",
    icon: "🏎️",
    recurrence: { type: "manual", dates: ["2026-07-11"] },
    alertDaysBefore: [30, 14, 7, 3],
    messageTemplate:
      "NYC E-Prix is {date}! Formula E racing at Red Hook through July 12.",
    actionUrl: "https://www.fiaformulae.com",
    premium: true,
    source: "fiaformulae.com",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // BOROUGH-SPECIFIC CELEBRATIONS
  // ---------------------------------------------------------------------------
  {
    id: "bronx-week-2026",
    title: "Bronx Week",
    shortTitle: "Bronx Week",
    description: "Annual celebration of the Bronx with parade and events",
    category: "culture",
    icon: "🗽",
    recurrence: { type: "manual", dates: ["2026-05-10"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Bronx Week starts {date}! Walk of Fame inductions, parade, and festivities through May 17.",
    source: "bronxboropres.nyc.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "queens-county-fair-2026",
    title: "Queens County Fair",
    shortTitle: "Queens Fair",
    description: "Old-fashioned county fair at Queens County Farm Museum",
    category: "culture",
    icon: "🎡",
    recurrence: { type: "manual", dates: ["2026-09-19"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Queens County Fair is {date}! Agricultural exhibits, rides, and pie-eating at Queens Farm.",
    actionUrl: "https://www.queensfarm.org",
    source: "queensfarm.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "staten-island-ferry-hawks-2026",
    title: "Staten Island FerryHawks Opening Day",
    shortTitle: "FerryHawks Opener",
    description: "Staten Island FerryHawks minor league baseball home opener",
    category: "culture",
    icon: "⚾",
    recurrence: { type: "manual", dates: ["2026-05-01"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "FerryHawks home opener is {date}! Minor league baseball with views of the Statue of Liberty.",
    actionUrl: "https://www.siferryhawks.com",
    source: "siferryhawks.com",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // ADDITIONAL CIVIC & PRACTICAL
  // ---------------------------------------------------------------------------
  {
    id: "nyc-marathon-lottery-opens-2026",
    title: "NYC Marathon Lottery Opens",
    shortTitle: "Marathon Lottery",
    description: "Entry lottery opens for the TCS New York City Marathon",
    category: "culture",
    icon: "🎰",
    recurrence: { type: "manual", dates: ["2026-01-29"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate:
      "NYC Marathon lottery opens {date}! Apply by February 13 for your chance to run.",
    actionUrl: "https://www.nyrr.org/tcsnycmarathon",
    source: "nyrr.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "brooklyn-half-lottery-2026",
    title: "Brooklyn Half Marathon Lottery Opens",
    shortTitle: "BK Half Lottery",
    description: "Entry lottery opens for the RBC Brooklyn Half",
    category: "culture",
    icon: "🎰",
    recurrence: { type: "manual", dates: ["2026-01-07"] },
    alertDaysBefore: [7, 3, 1],
    messageTemplate:
      "Brooklyn Half Marathon lottery opens {date}! Prospect Park to Coney Island boardwalk finish.",
    actionUrl: "https://www.nyrr.org/races/rbcbrooklynhalfmarathon",
    source: "nyrr.org",
    lastVerified: "2026-01-01",
  },
  {
    id: "idea-week-2026",
    title: "NYC Civic Innovation Week",
    shortTitle: "Civic Innovation",
    description: "Week of events showcasing city technology and civic engagement",
    category: "civic",
    icon: "💡",
    recurrence: { type: "manual", dates: ["2026-04-20"] },
    alertDaysBefore: [14, 7, 3],
    messageTemplate:
      "Civic Innovation Week starts {date}! Tours, talks, and demos of city technology.",
    actionUrl: "https://www.nyc.gov/oti",
    source: "nyc.gov/oti",
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
