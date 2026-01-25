# Enhanced Daily Digest: Semantic Clustering + Proactive Horizon

## Overview

Transform the daily email digest from a flat list of alerts into a curated magazine-style experience with:

1. **THE HORIZON** — Proactive alerts from NYC's civic calendar (7-day lookahead)
2. **THE DEEP DIVE** — LLM-clustered story analysis grouping related news
3. **THE BRIEFING** — Quick-hit alerts and updates
4. **THE AGENDA** — Events and activities for the next 48-72 hours

```
┌─────────────────────────────────────────────────────────────────┐
│  CITYPING DAILY                               Friday, Jan 24   │
├─────────────────────────────────────────────────────────────────┤
│  THE HORIZON                                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🚗 ASP Suspended Monday (MLK Day)                         │ │
│  │ 🏢 Property Tax Deadline in 6 Days                        │ │
│  │ 🗳️ School Board Vote Tuesday — affects class sizes        │ │
│  └───────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  THE DEEP DIVE                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🚇 MTA's Congestion Pricing Countdown                     │ │
│  │    With 10 days until tolls begin, here's what's...       │ │
│  │    → 5 related stories                                    │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ 🏠 Housing Lottery Surge in Brooklyn                      │ │
│  │    Three new affordable developments opened...            │ │
│  │    → 3 related stories                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  THE BRIEFING                                                   │
│  • L train delays expected through Tuesday                     │
│  • Snow forecast: 2-4" Saturday evening                        │
│  • Free museum admission Sunday (Culture Pass)                 │
├─────────────────────────────────────────────────────────────────┤
│  THE AGENDA                                                     │
│  Fri: Brooklyn Night Market opens 6pm                          │
│  Sat: Lunar New Year Parade, Chinatown 1pm                     │
│  Sun: Free admission at The Met                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  NYC Knowledge   │     │  selectBest-     │     │   NewsArticle    │
│  Base (static)   │     │  ContentV2       │     │   + AlertEvent   │
│                  │     │  Semantic        │     │                  │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Horizon Agent   │     │  Clustering      │     │  Content         │
│  (proactive      │     │  Agent           │     │  Selection       │
│   alerts)        │     │  (LLM groups)    │     │  (existing)      │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  Daily Digest            │
                    │  Orchestrator            │
                    │  (coordinates all)       │
                    └──────────────┬───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  Email Template          │
                    │  (magazine layout)       │
                    └──────────────────────────┘
```

---

## Component 1: NYC Knowledge Base

### Purpose

Static TypeScript configuration containing NYC's predictable civic calendar—things we KNOW will happen that scrapers might miss or report too late.

### File: `src/config/nyc-knowledge.ts`

```typescript
// =============================================================================
// NYC CIVIC KNOWLEDGE BASE
// =============================================================================

import { DateTime } from "luxon";

/**
 * Recurrence pattern types for NYC civic events.
 */
export type RecurrenceType =
  | "fixed-date"      // Same date every year (Jan 1, Jul 4)
  | "nth-weekday"     // "Third Monday of January" (MLK Day)
  | "manual"          // Manually maintained list of dates
  | "weekly"          // Every week on specific day(s)
  | "monthly";        // Specific day each month

/**
 * A known NYC civic event with recurrence rules.
 */
export interface KnownEvent {
  id: string;

  // Display
  title: string;
  shortTitle: string;          // For compact display ("ASP Suspended")
  description: string;

  // Categorization
  category: "parking" | "transit" | "civic" | "tax" | "education" |
            "culture" | "weather" | "safety" | "holiday";
  icon: string;                // Emoji for visual scanning

  // Timing
  recurrence: RecurrenceRule;
  alertDaysBefore: number[];   // [7, 3, 1] = alert 7, 3, and 1 days before

  // Content
  messageTemplate: string;     // "ASP suspended {date} for {holiday}"
  actionUrl?: string;          // Link for more info
  premium?: boolean;           // Gate behind subscription

  // Metadata
  source: string;              // "nyc.gov/dot" for attribution
  lastVerified: string;        // ISO date when rule was verified
}

/**
 * Recurrence rule definition.
 */
export type RecurrenceRule =
  | { type: "fixed-date"; month: number; day: number }
  | { type: "nth-weekday"; month: number; weekday: number; nth: number }
  | { type: "manual"; dates: string[] }  // ISO dates
  | { type: "weekly"; weekdays: number[] }
  | { type: "monthly"; day: number };

// =============================================================================
// RECURRENCE CALCULATORS
// =============================================================================

/**
 * Get next occurrence of an event from a reference date.
 */
export function getNextOccurrence(
  rule: RecurrenceRule,
  from: DateTime = DateTime.now()
): DateTime | null {
  switch (rule.type) {
    case "fixed-date": {
      let next = from.set({ month: rule.month, day: rule.day });
      if (next <= from) {
        next = next.plus({ years: 1 });
      }
      return next;
    }

    case "nth-weekday": {
      // Find nth weekday of month (e.g., 3rd Monday of January)
      let target = from.set({ month: rule.month, day: 1 });
      if (target.month < from.month ||
          (target.month === from.month && getNthWeekday(target, rule.weekday, rule.nth) <= from)) {
        target = target.plus({ years: 1 });
      }
      return getNthWeekday(target, rule.weekday, rule.nth);
    }

    case "manual": {
      const upcoming = rule.dates
        .map(d => DateTime.fromISO(d))
        .filter(d => d > from)
        .sort((a, b) => a.toMillis() - b.toMillis());
      return upcoming[0] || null;
    }

    case "weekly": {
      // Find next occurrence of any listed weekday
      for (let i = 1; i <= 7; i++) {
        const candidate = from.plus({ days: i });
        if (rule.weekdays.includes(candidate.weekday)) {
          return candidate;
        }
      }
      return null;
    }

    case "monthly": {
      let next = from.set({ day: rule.day });
      if (next <= from) {
        next = next.plus({ months: 1 });
      }
      return next;
    }
  }
}

function getNthWeekday(monthStart: DateTime, weekday: number, nth: number): DateTime {
  let current = monthStart.startOf("month");
  let count = 0;

  while (current.month === monthStart.month) {
    if (current.weekday === weekday) {
      count++;
      if (count === nth) return current;
    }
    current = current.plus({ days: 1 });
  }

  return monthStart; // Fallback (shouldn't happen with valid nth)
}

// =============================================================================
// NYC CIVIC CALENDAR
// =============================================================================

export const NYC_KNOWLEDGE_BASE: KnownEvent[] = [
  // ---------------------------------------------------------------------------
  // PARKING (ASP Suspensions)
  // ---------------------------------------------------------------------------
  {
    id: "asp-new-years",
    title: "Alternate Side Parking Suspended - New Year's Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "fixed-date", month: 1, day: 1 },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for New Year's Day. No need to move your car.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-mlk",
    title: "Alternate Side Parking Suspended - MLK Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 1, weekday: 1, nth: 3 }, // 3rd Monday
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Martin Luther King Jr. Day.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-presidents",
    title: "Alternate Side Parking Suspended - Presidents Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 2, weekday: 1, nth: 3 },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Presidents Day.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-memorial",
    title: "Alternate Side Parking Suspended - Memorial Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 5, weekday: 1, nth: 4 }, // Last Monday (approx)
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Memorial Day.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-independence",
    title: "Alternate Side Parking Suspended - Independence Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "fixed-date", month: 7, day: 4 },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Independence Day.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-labor",
    title: "Alternate Side Parking Suspended - Labor Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 9, weekday: 1, nth: 1 },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Labor Day.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-columbus",
    title: "Alternate Side Parking Suspended - Columbus Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 10, weekday: 1, nth: 2 },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Columbus Day.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-veterans",
    title: "Alternate Side Parking Suspended - Veterans Day",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "fixed-date", month: 11, day: 11 },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Veterans Day.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-thanksgiving",
    title: "Alternate Side Parking Suspended - Thanksgiving",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "nth-weekday", month: 11, weekday: 4, nth: 4 },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Thanksgiving.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-christmas",
    title: "Alternate Side Parking Suspended - Christmas",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended citywide",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "fixed-date", month: 12, day: 25 },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Christmas Day.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },

  // Religious holidays (ASP suspended but schools may be open)
  {
    id: "asp-rosh-hashanah-2026",
    title: "Alternate Side Parking Suspended - Rosh Hashanah",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Rosh Hashanah",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-09-12", "2026-09-13"] },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Rosh Hashanah.",
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
    messageTemplate: "ASP suspended {date} for Yom Kippur.",
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
    messageTemplate: "ASP suspended {date} for Diwali.",
    source: "nyc.gov/dot",
    lastVerified: "2026-01-01",
  },
  {
    id: "asp-lunar-new-year-2026",
    title: "Alternate Side Parking Suspended - Lunar New Year",
    shortTitle: "ASP Suspended",
    description: "Street cleaning rules suspended for Lunar New Year",
    category: "parking",
    icon: "🚗",
    recurrence: { type: "manual", dates: ["2026-02-17"] },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Lunar New Year.",
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
    recurrence: { type: "manual", dates: ["2026-03-20"] },
    alertDaysBefore: [3, 1],
    messageTemplate: "ASP suspended {date} for Eid al-Fitr.",
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
    messageTemplate: "Property tax due {date}. Pay at nyc.gov/finance to avoid penalties.",
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
    messageTemplate: "Property tax due {date}. Pay at nyc.gov/finance to avoid penalties.",
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
    messageTemplate: "Property tax due {date}. Pay at nyc.gov/finance to avoid penalties.",
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
    messageTemplate: "Property tax due {date}. Pay at nyc.gov/finance to avoid penalties.",
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
    messageTemplate: "Federal taxes due {date}. File at irs.gov or request extension.",
    actionUrl: "https://www.irs.gov/filing",
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
    messageTemplate: "First day of school {date}. Check your child's schedule at schools.nyc.gov.",
    actionUrl: "https://www.schools.nyc.gov/calendar",
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
    recurrence: { type: "manual", dates: ["2026-04-06"] }, // Start date
    alertDaysBefore: [14, 7],
    messageTemplate: "Spring break begins {date}. Schools closed through April 10.",
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
    messageTemplate: "Last day of school {date}. Summer begins!",
    source: "schools.nyc.gov",
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
    messageTemplate: "MTA fares increase {date}. Base fare goes to $3.00.",
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
    recurrence: { type: "manual", dates: ["2026-01-05"] }, // Already passed
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate: "Congestion pricing starts {date}. $9 peak, $2.25 off-peak below 60th St.",
    actionUrl: "https://new.mta.info/congestion-pricing",
    source: "mta.info",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // CIVIC / VOTING
  // ---------------------------------------------------------------------------
  {
    id: "voter-registration-deadline-general-2026",
    title: "Voter Registration Deadline - General Election",
    shortTitle: "Register to Vote",
    description: "Last day to register for November general election",
    category: "civic",
    icon: "🗳️",
    recurrence: { type: "manual", dates: ["2026-10-09"] },
    alertDaysBefore: [30, 14, 7, 3, 1],
    messageTemplate: "Register to vote by {date} to participate in the November election.",
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
    messageTemplate: "Election Day {date}. Polls open 6am-9pm. Find your poll site at vote.nyc.",
    actionUrl: "https://vote.nyc/page/find-your-poll-site",
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
    messageTemplate: "Primary Election {date}. Polls open 6am-9pm.",
    actionUrl: "https://vote.nyc/page/find-your-poll-site",
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
    id: "smithsonian-free-museum-day-2026",
    title: "Smithsonian Museum Day - Free Admission",
    shortTitle: "Free Museums",
    description: "Free admission at participating museums nationwide",
    category: "culture",
    icon: "🏛️",
    recurrence: { type: "manual", dates: ["2026-09-19"] },
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate: "Museum Day {date}! Free admission at participating NYC museums with ticket from smithsonianmag.com.",
    actionUrl: "https://www.smithsonianmag.com/museumday/",
    source: "smithsonianmag.com",
    lastVerified: "2026-01-01",
  },
  {
    id: "broadway-week-winter-2026",
    title: "NYC Broadway Week - 2-for-1 Tickets",
    shortTitle: "Broadway Week",
    description: "2-for-1 tickets at Broadway shows",
    category: "culture",
    icon: "🎭",
    recurrence: { type: "manual", dates: ["2026-01-21"] }, // Start date
    alertDaysBefore: [14, 7, 3],
    messageTemplate: "Broadway Week starts {date}! 2-for-1 tickets available at nycgo.com/broadway-week.",
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
    messageTemplate: "Broadway Week starts {date}! 2-for-1 tickets available at nycgo.com/broadway-week.",
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
    messageTemplate: "Restaurant Week starts {date}! $30 lunch, $45 dinner at 400+ restaurants.",
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
    messageTemplate: "Restaurant Week starts {date}! $30 lunch, $45 dinner at 400+ restaurants.",
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
    messageTemplate: "Shakespeare in the Park starts {date}. Free tickets via lottery at publictheater.org.",
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
    messageTemplate: "SummerStage season begins {date}. Free concerts in Central Park through September.",
    actionUrl: "https://cityparksfoundation.org/summerstage/",
    source: "cityparksfoundation.org",
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
    recurrence: { type: "manual", dates: ["2026-02-22"] }, // Sunday after LNY
    alertDaysBefore: [7, 3, 1],
    messageTemplate: "Lunar New Year Parade {date} in Chinatown! Starts 1pm on Mott Street.",
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
    messageTemplate: "St. Patrick's Day Parade {date}! 5th Ave from 44th to 79th St, 11am start.",
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
    recurrence: { type: "manual", dates: ["2026-06-28"] }, // Last Sunday of June
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate: "NYC Pride March {date}! Starts noon at 25th & 5th Ave.",
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
    messageTemplate: "Macy's Thanksgiving Parade {date}! Starts 9am at 77th & Central Park West.",
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
    recurrence: { type: "nth-weekday", month: 11, weekday: 7, nth: 1 }, // First Sunday
    alertDaysBefore: [14, 7, 3, 1],
    messageTemplate: "NYC Marathon {date}! Expect major street closures across all 5 boroughs.",
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
    messageTemplate: "Times Square Ball Drop {date}! Access starts 3pm, ball drops midnight.",
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
    messageTemplate: "Daylight Saving Time begins {date}. Set clocks FORWARD 1 hour at 2am.",
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
    messageTemplate: "Daylight Saving Time ends {date}. Set clocks BACK 1 hour at 2am.",
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
    recurrence: { type: "manual", dates: ["2026-12-02"] }, // First Wed after Thanksgiving
    alertDaysBefore: [7, 3, 1],
    messageTemplate: "Rockefeller Tree Lighting {date}! Ceremony starts 7pm, expect crowds.",
    source: "rockefellercenter.com",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // HOUSING / RENT
  // ---------------------------------------------------------------------------
  {
    id: "rent-stabilization-renewal-deadline",
    title: "Rent Stabilization Lease Renewal Deadline",
    shortTitle: "Lease Renewal",
    description: "Annual deadline for landlords to offer rent-stabilized lease renewals",
    category: "housing",
    icon: "🏠",
    recurrence: { type: "monthly", day: 1 }, // Monthly reminder
    alertDaysBefore: [30],
    messageTemplate: "Reminder: Landlords must offer rent-stabilized lease renewals 90-150 days before lease expires.",
    actionUrl: "https://rentguidelinesboard.cityofnewyork.us/",
    premium: true,
    source: "nyc.gov/hpd",
    lastVerified: "2026-01-01",
  },
  {
    id: "rgb-vote-2026",
    title: "Rent Guidelines Board Vote",
    shortTitle: "Rent Vote",
    description: "Annual vote setting rent increases for stabilized apartments",
    category: "housing",
    icon: "📊",
    recurrence: { type: "manual", dates: ["2026-06-24"] },
    alertDaysBefore: [30, 14, 7, 1],
    messageTemplate: "Rent Guidelines Board votes {date} on rent increases for 1M+ apartments.",
    actionUrl: "https://rentguidelinesboard.cityofnewyork.us/",
    source: "rentguidelinesboard.cityofnewyork.us",
    lastVerified: "2026-01-01",
  },

  // ---------------------------------------------------------------------------
  // SAFETY / EMERGENCY
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
    messageTemplate: "Hurricane season starts {date}. Review emergency plans at nyc.gov/notifynyc.",
    actionUrl: "https://a]www.nyc.gov/notifynyc",
    source: "noaa.gov",
    lastVerified: "2026-01-01",
  },
  {
    id: "air-quality-alert-season",
    title: "Ozone Season Begins",
    shortTitle: "Air Quality Season",
    description: "Peak ozone season begins - air quality alerts more common",
    category: "weather",
    icon: "🌫️",
    recurrence: { type: "fixed-date", month: 5, day: 1 },
    alertDaysBefore: [7],
    messageTemplate: "Ozone season begins {date}. Sign up for air quality alerts at airnow.gov.",
    actionUrl: "https://www.airnow.gov/",
    source: "airnow.gov",
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
    categories?: KnownEvent["category"][];
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
    let checkDate = start;
    while (checkDate <= end) {
      const next = getNextOccurrence(event.recurrence, checkDate.minus({ days: 1 }));
      if (!next || next > end) break;
      if (next >= start) {
        results.push({ event, date: next });
      }
      checkDate = next.plus({ days: 1 });
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
    categories?: KnownEvent["category"][];
    includePremium?: boolean;
  }
): Array<{ event: KnownEvent; eventDate: DateTime; daysUntil: number }> {
  const results: Array<{ event: KnownEvent; eventDate: DateTime; daysUntil: number }> = [];
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
```

---

## Component 2: Horizon Agent

### Purpose

Generates proactive alerts from the NYC Knowledge Base, creating natural-language messages for events approaching within the configured window.

### File: `src/lib/agents/horizon-agent.ts`

```typescript
// =============================================================================
// HORIZON AGENT
// =============================================================================

import { DateTime } from "luxon";
import { getOpenAI } from "../embeddings/openai-client";
import {
  getAlertsForToday,
  KnownEvent,
  NYC_KNOWLEDGE_BASE
} from "../../config/nyc-knowledge";

export interface HorizonAlert {
  id: string;
  event: KnownEvent;
  eventDate: DateTime;
  daysUntil: number;
  message: string;          // LLM-generated natural language
  urgency: "high" | "medium" | "low";
  premium: boolean;
}

export interface HorizonResult {
  alerts: HorizonAlert[];
  generatedAt: DateTime;
  tokensUsed: number;
}

/**
 * Generate horizon alerts for today's digest.
 */
export async function generateHorizonAlerts(options?: {
  today?: DateTime;
  includePremium?: boolean;
  maxAlerts?: number;
}): Promise<HorizonResult> {
  const today = options?.today || DateTime.now();
  const maxAlerts = options?.maxAlerts || 5;

  // Get events that should alert today
  const todayAlerts = getAlertsForToday(today, {
    includePremium: options?.includePremium,
  });

  // Sort by urgency (closer events first), limit
  const prioritized = todayAlerts
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, maxAlerts);

  if (prioritized.length === 0) {
    return {
      alerts: [],
      generatedAt: today,
      tokensUsed: 0,
    };
  }

  // Generate natural language messages via LLM
  const openai = getOpenAI();
  const prompt = buildHorizonPrompt(prioritized, today);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a helpful NYC assistant writing brief, actionable alerts for a daily email digest.
Write in a friendly but concise style. Each message should be 1-2 sentences max.
Focus on the action the reader should take or the impact on their day.
Use the provided template as a starting point but make it sound natural.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || "";
  const messages = parseHorizonResponse(content, prioritized.length);

  // Build final alerts
  const alerts: HorizonAlert[] = prioritized.map((item, i) => ({
    id: `horizon-${item.event.id}-${item.eventDate.toISODate()}`,
    event: item.event,
    eventDate: item.eventDate,
    daysUntil: item.daysUntil,
    message: messages[i] || item.event.messageTemplate.replace("{date}", formatDate(item.eventDate)),
    urgency: item.daysUntil <= 1 ? "high" : item.daysUntil <= 3 ? "medium" : "low",
    premium: item.event.premium || false,
  }));

  return {
    alerts,
    generatedAt: today,
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

function buildHorizonPrompt(
  alerts: Array<{ event: KnownEvent; eventDate: DateTime; daysUntil: number }>,
  today: DateTime
): string {
  const lines = alerts.map((a, i) => {
    const dateStr = formatDate(a.eventDate);
    const daysStr = a.daysUntil === 0 ? "TODAY" :
                    a.daysUntil === 1 ? "TOMORROW" :
                    `in ${a.daysUntil} days`;
    return `${i + 1}. Event: ${a.event.title}
   Date: ${dateStr} (${daysStr})
   Category: ${a.event.category}
   Template: ${a.event.messageTemplate}
   Action URL: ${a.event.actionUrl || "none"}`;
  });

  return `Today is ${today.toFormat("EEEE, MMMM d, yyyy")}.

Generate a brief, natural message for each of these upcoming NYC events.
Keep each message to 1-2 sentences. Make them actionable and helpful.

Events:
${lines.join("\n\n")}

Respond with numbered messages (1., 2., etc.) matching the event order above.`;
}

function parseHorizonResponse(content: string, count: number): string[] {
  const messages: string[] = [];
  const lines = content.split("\n").filter(l => l.trim());

  for (let i = 1; i <= count; i++) {
    const pattern = new RegExp(`^${i}\\.\\s*(.+)`, "m");
    const match = content.match(pattern);
    if (match) {
      messages.push(match[1].trim());
    } else {
      messages.push(""); // Will fall back to template
    }
  }

  return messages;
}

function formatDate(dt: DateTime): string {
  return dt.toFormat("EEEE, MMMM d");
}
```

---

## Component 3: Clustering Agent

### Purpose

Groups related news articles into thematic clusters using GPT-4o, enabling "Deep Dive" sections that synthesize multiple stories into coherent narratives.

### File: `src/lib/agents/clustering-agent.ts`

```typescript
// =============================================================================
// CLUSTERING AGENT (LLM-based story grouping)
// =============================================================================

import { getOpenAI } from "../embeddings/openai-client";

export interface ClusterableArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: Date;
  score: number;
}

export interface StoryCluster {
  id: string;
  theme: string;              // LLM-generated theme name
  headline: string;           // LLM-generated summary headline
  summary: string;            // 2-3 sentence synthesis
  articles: ClusterableArticle[];
  representativeId: string;   // Best article to feature
  significance: number;       // 1-10 importance score
}

export interface ClusteringResult {
  clusters: StoryCluster[];
  unclustered: ClusterableArticle[];
  tokensUsed: number;
}

/**
 * Cluster articles into thematic groups using GPT-4o.
 */
export async function clusterArticles(
  articles: ClusterableArticle[],
  options?: {
    targetClusters?: number;
    minClusterSize?: number;
  }
): Promise<ClusteringResult> {
  const targetClusters = options?.targetClusters || 4;
  const minClusterSize = options?.minClusterSize || 2;

  if (articles.length < minClusterSize) {
    return {
      clusters: [],
      unclustered: articles,
      tokensUsed: 0,
    };
  }

  const openai = getOpenAI();

  const prompt = buildClusteringPrompt(articles, targetClusters);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert NYC news editor. Your job is to identify thematic clusters among news articles and create compelling summaries.

Output valid JSON only. No markdown, no explanation.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";

  let parsed: { clusters: Array<{
    theme: string;
    headline: string;
    summary: string;
    article_ids: string[];
    representative_id: string;
    significance: number;
  }> };

  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      clusters: [],
      unclustered: articles,
      tokensUsed: response.usage?.total_tokens || 0,
    };
  }

  // Build clusters with article objects
  const articleMap = new Map(articles.map(a => [a.id, a]));
  const clusteredIds = new Set<string>();

  const clusters: StoryCluster[] = (parsed.clusters || [])
    .filter(c => c.article_ids?.length >= minClusterSize)
    .map((c, i) => {
      const clusterArticles = c.article_ids
        .map(id => articleMap.get(id))
        .filter((a): a is ClusterableArticle => !!a);

      clusterArticles.forEach(a => clusteredIds.add(a.id));

      return {
        id: `cluster-${i}`,
        theme: c.theme,
        headline: c.headline,
        summary: c.summary,
        articles: clusterArticles,
        representativeId: c.representative_id,
        significance: c.significance,
      };
    })
    .sort((a, b) => b.significance - a.significance);

  const unclustered = articles.filter(a => !clusteredIds.has(a.id));

  return {
    clusters,
    unclustered,
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

function buildClusteringPrompt(
  articles: ClusterableArticle[],
  targetClusters: number
): string {
  const articleList = articles.map((a, i) =>
    `[${a.id}] "${a.title}" (${a.source}) - ${a.summary.slice(0, 150)}...`
  ).join("\n");

  return `Analyze these ${articles.length} NYC news articles and group them into ${targetClusters}-${targetClusters + 1} thematic clusters.

ARTICLES:
${articleList}

For each cluster, provide:
- theme: Short theme name (e.g., "Transit Disruptions", "Housing Crisis")
- headline: Compelling headline summarizing the cluster (max 10 words)
- summary: 2-3 sentence synthesis of what's happening
- article_ids: Array of article IDs that belong to this cluster
- representative_id: The single best article to feature
- significance: 1-10 score of how important this is to NYC residents

Rules:
- Each article can only belong to one cluster
- Clusters must have at least 2 articles
- Leave truly unrelated articles unclustered
- Prioritize clusters that affect many people

Respond with JSON: { "clusters": [...] }`;
}
```

---

## Component 4: Daily Digest Orchestrator

### Purpose

Coordinates all components to produce the enhanced daily digest, adapting content depth based on day of week.

### File: `src/lib/agents/daily-digest-orchestrator.ts`

```typescript
// =============================================================================
// DAILY DIGEST ORCHESTRATOR
// =============================================================================

import { DateTime } from "luxon";
import { generateHorizonAlerts, HorizonAlert } from "./horizon-agent";
import { clusterArticles, StoryCluster, ClusterableArticle } from "./clustering-agent";
import { selectBestContentV2Semantic, ContentSelectionV2Semantic } from "./data-quality-agent";
import { prisma } from "../db";

export interface DailyDigestContent {
  // THE HORIZON - Proactive alerts
  horizon: {
    alerts: HorizonAlert[];
    premiumAlerts: HorizonAlert[];  // Gated behind subscription
  };

  // THE DEEP DIVE - Clustered stories
  deepDive: {
    clusters: StoryCluster[];
    featuredCluster: StoryCluster | null;
  };

  // THE BRIEFING - Quick hits
  briefing: {
    alerts: Array<{
      id: string;
      title: string;
      body: string;
      source: string;
      category: string;
    }>;
  };

  // THE AGENDA - Upcoming events
  agenda: {
    events: Array<{
      id: string;
      title: string;
      date: DateTime;
      venue?: string;
      category: string;
    }>;
    windowDays: number;
  };

  // Metadata
  meta: {
    generatedAt: DateTime;
    dayOfWeek: string;
    tokensUsed: number;
    estimatedCost: number;
  };
}

export interface DigestConfig {
  userId: string;
  isPremium: boolean;
  neighborhoods?: string[];
  today?: DateTime;
}

/**
 * Generate complete daily digest content.
 */
export async function generateDailyDigest(
  config: DigestConfig
): Promise<DailyDigestContent> {
  const today = config.today || DateTime.now();
  const dayOfWeek = today.weekday; // 1=Mon, 7=Sun

  // Adapt depth based on day
  const isWeekend = dayOfWeek >= 6;
  const targetClusters = isWeekend ? 5 : 3;
  const agendaWindowDays = getAgendaWindow(dayOfWeek);

  let totalTokens = 0;

  // 1. Generate Horizon alerts
  const horizonResult = await generateHorizonAlerts({
    today,
    includePremium: config.isPremium,
    maxAlerts: 5,
  });
  totalTokens += horizonResult.tokensUsed;

  // Separate premium alerts for gating
  const freeAlerts = horizonResult.alerts.filter(a => !a.premium);
  const premiumAlerts = horizonResult.alerts.filter(a => a.premium);

  // 2. Get content via semantic selection
  const contentResult = await selectBestContentV2Semantic({
    semanticEnabled: true,
    newsLimit: 30,
    alertLimit: 20,
    minScore: 40,
    neighborhoods: config.neighborhoods,
  });

  // 3. Cluster news articles
  const clusterableArticles: ClusterableArticle[] = contentResult.news.map(n => ({
    id: n.id,
    title: n.title,
    summary: n.summary || n.body?.slice(0, 200) || "",
    source: n.source || "Unknown",
    publishedAt: n.publishedAt || new Date(),
    score: n.scores?.overall || 50,
  }));

  const clusterResult = await clusterArticles(clusterableArticles, {
    targetClusters,
    minClusterSize: 2,
  });
  totalTokens += clusterResult.tokensUsed;

  // 4. Build briefing from alerts + unclustered news
  const briefingItems = [
    ...contentResult.alerts.slice(0, 5).map(a => ({
      id: a.id,
      title: a.title,
      body: a.body || "",
      source: a.source?.name || "CityPing",
      category: a.source?.moduleId || "alert",
    })),
    ...clusterResult.unclustered.slice(0, 3).map(n => ({
      id: n.id,
      title: n.title,
      body: n.summary,
      source: n.source,
      category: "news",
    })),
  ].slice(0, 8);

  // 5. Build agenda from events
  const agendaEnd = today.plus({ days: agendaWindowDays });
  const events = await prisma.event.findMany({
    where: {
      startsAt: {
        gte: today.toJSDate(),
        lte: agendaEnd.toJSDate(),
      },
    },
    orderBy: { startsAt: "asc" },
    take: 6,
  });

  const agendaEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    date: DateTime.fromJSDate(e.startsAt),
    venue: (e.metadata as any)?.venue,
    category: (e.metadata as any)?.category || "event",
  }));

  // Calculate cost (GPT-4o: $2.50/1M input, $10/1M output)
  const estimatedCost = (totalTokens / 1_000_000) * 5; // Rough average

  return {
    horizon: {
      alerts: freeAlerts,
      premiumAlerts: config.isPremium ? premiumAlerts : [],
    },
    deepDive: {
      clusters: clusterResult.clusters,
      featuredCluster: clusterResult.clusters[0] || null,
    },
    briefing: {
      alerts: briefingItems,
    },
    agenda: {
      events: agendaEvents,
      windowDays: agendaWindowDays,
    },
    meta: {
      generatedAt: today,
      dayOfWeek: today.toFormat("EEEE"),
      tokensUsed: totalTokens,
      estimatedCost,
    },
  };
}

/**
 * Get agenda window based on day of week.
 * Thu-Sat: Show through Sunday (weekend planning)
 * Sun-Wed: Show next 48 hours
 */
function getAgendaWindow(dayOfWeek: number): number {
  switch (dayOfWeek) {
    case 4: return 4;  // Thu: show Fri-Sun (4 days)
    case 5: return 3;  // Fri: show Fri-Sun (3 days)
    case 6: return 2;  // Sat: show Sat-Sun (2 days)
    case 7: return 1;  // Sun: show Sun (1 day)
    default: return 2; // Mon-Wed: 48 hours
  }
}
```

---

## Component 5: Email Template

### File: `src/lib/email-templates-enhanced.ts`

Extends the existing email template system with sections for:

1. **THE HORIZON** - Proactive alerts with icons and urgency styling
2. **THE DEEP DIVE** - Clustered stories with expandable article lists
3. **THE BRIEFING** - Quick-hit bullet points
4. **THE AGENDA** - Calendar-style event listing

Key styling:
- Urgency colors: High=red, Medium=orange, Low=blue
- Cluster cards with "See X related stories" expand links
- Mobile-responsive tables for agenda

---

## Files to Create

| File | Lines | Purpose |
|------|-------|---------|
| `src/config/nyc-knowledge.ts` | ~800 | Static NYC civic calendar |
| `src/lib/agents/horizon-agent.ts` | ~150 | Proactive alert generation |
| `src/lib/agents/clustering-agent.ts` | ~200 | LLM story clustering |
| `src/lib/agents/daily-digest-orchestrator.ts` | ~250 | Coordinates all components |
| `src/lib/email-templates-enhanced.ts` | ~400 | Magazine-style email layout |
| `src/app/api/digest/preview/route.ts` | ~50 | Preview endpoint for testing |

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/jobs/send-daily-digest/route.ts` | Use orchestrator for enhanced users |
| `src/lib/email-digest.ts` | Import enhanced template builder |

---

## Cost Analysis (Daily)

| Component | Model | Tokens/Day | Cost/Day | Cost/Month |
|-----------|-------|------------|----------|------------|
| Horizon Agent | gpt-4o-mini | ~300 | $0.00015 | $0.0045 |
| Clustering Agent | gpt-4o | ~2,000 | $0.01 | $0.30 |
| **Total** | - | ~2,300 | ~$0.01 | **~$0.31** |

---

## Verification Checklist

1. [ ] NYC Knowledge Base has all federal holidays
2. [ ] Recurrence calculators handle edge cases (leap years, 5th weekday)
3. [ ] Horizon Agent respects premium gating
4. [ ] Clustering produces 3-5 meaningful clusters
5. [ ] Agenda window adapts correctly by day
6. [ ] Email renders correctly on mobile
7. [ ] Cost stays under $0.50/month at scale

---

## Execution Order

```
Task 1: Create src/config/nyc-knowledge.ts
Task 2: Create src/lib/agents/horizon-agent.ts
Task 3: Create src/lib/agents/clustering-agent.ts
Task 4: Create src/lib/agents/daily-digest-orchestrator.ts
Task 5: Create src/lib/email-templates-enhanced.ts
Task 6: Create preview API endpoint
Task 7: Integrate with existing daily digest job
Task 8: Test with sample data
```
