// scripts/check-horizon-events.ts
// Debug what horizon events should appear for today

import { DateTime } from "luxon";
import {
  getAlertsForToday,
  NYC_KNOWLEDGE_BASE,
  getNextOccurrence
} from "../src/config/nyc-knowledge";

const today = DateTime.fromISO("2026-02-21");
console.log(`\n=== Checking horizon alerts for ${today.toFormat("EEEE, MMMM d, yyyy")} ===\n`);

// Get all alerts for today
const alerts = getAlertsForToday(today, { includePremium: true });
console.log(`Found ${alerts.length} alerts for today:\n`);

for (const a of alerts) {
  console.log(`${a.event.icon || "📅"} ${a.event.title}`);
  console.log(`   Date: ${a.eventDate.toFormat("MMMM d, yyyy")} (in ${a.daysUntil} days)`);
  console.log(`   Category: ${a.event.category}`);
  console.log(`   Alert days: [${a.event.alertDaysBefore.join(", ")}]`);
  console.log("");
}

// Check specific events
console.log("\n=== Checking specific events ===\n");

const eventsToCheck = [
  "st-patricks-parade-2026",
  "daylight-saving-spring-2026",
  "lunar-new-year-parade-2026",
];

for (const id of eventsToCheck) {
  const event = NYC_KNOWLEDGE_BASE.find(e => e.id === id);
  if (!event) {
    console.log(`❌ Event not found: ${id}`);
    continue;
  }

  const nextDate = getNextOccurrence(event.recurrence, today.minus({ days: 1 }));
  if (!nextDate) {
    console.log(`❌ ${event.title}: No next occurrence found`);
    continue;
  }

  const daysUntil = Math.floor(nextDate.diff(today.startOf("day"), "days").days);
  const willAlert = event.alertDaysBefore.includes(daysUntil);

  console.log(`${event.icon || "📅"} ${event.title}`);
  console.log(`   Next date: ${nextDate.toFormat("MMMM d, yyyy")} (in ${daysUntil} days)`);
  console.log(`   Alert days: [${event.alertDaysBefore.join(", ")}]`);
  console.log(`   Will alert today: ${willAlert ? "✅ YES" : "❌ NO"}`);
  console.log("");
}

// Show upcoming events in next 30 days
console.log("\n=== Events in next 30 days ===\n");

const upcoming: Array<{event: typeof NYC_KNOWLEDGE_BASE[0], date: DateTime, daysUntil: number}> = [];

for (const event of NYC_KNOWLEDGE_BASE) {
  const nextDate = getNextOccurrence(event.recurrence, today.minus({ days: 1 }));
  if (!nextDate) continue;

  const daysUntil = Math.floor(nextDate.diff(today.startOf("day"), "days").days);
  if (daysUntil >= 0 && daysUntil <= 30) {
    upcoming.push({ event, date: nextDate, daysUntil });
  }
}

upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

for (const u of upcoming.slice(0, 20)) {
  console.log(`${u.event.icon || "📅"} ${u.event.title} - ${u.date.toFormat("MMM d")} (${u.daysUntil} days)`);
}
