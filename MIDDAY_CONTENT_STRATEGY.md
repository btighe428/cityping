# CityPing Midday Email Content Strategy

## Overview

CityPing is restructuring to send 3 daily update emails at **9am, noon, and 7pm**. This document defines the content strategy for the **noon slot** — the mid-day check-in email.

---

## The Noon Moment: Understanding User Context

### When Users Check Midday Email
- **Primary window:** 11:45am - 1:30pm (lunch break)
- **Secondary window:** 2:00pm - 3:00pm (afternoon break)
- **Context:** On mobile, possibly outdoors, limited attention span
- **Mental state:** Brief mental break from work, planning afternoon/evening

### What Users Need at Noon vs Other Times

| Time Slot | User State | Primary Need |
|-----------|------------|--------------|
| **9am** | Starting day | "What do I need to know before leaving home?" |
| **Noon** | Mid-day break | "What's changed since morning? What's happening now?" |
| **7pm** | Winding down | "What's happening tonight/tomorrow? What did I miss?" |

---

## Noon Content Strategy: "NYC Now"

### Core Philosophy
> **Live updates over static information. What matters *right now* that wasn't true at 9am.**

The noon email isn't a condensed 9am email — it's a fundamentally different product focused on **midday relevance**.

---

## Information Hierarchy (Priority Order)

### 1. 🚨 URGENT NOW (If Any)
**Content:** Breaking developments since 9am that require immediate action

**Examples:**
- Transit service suspended in last 3 hours
- Severe weather alerts just issued
- Emergency parking rule changes
- Street closures just announced

**Display:** Red alert banner, top of email
**Max items:** 0-2 (only if truly urgent)

---

### 2. 🔄 WHAT'S CHANGED (The Core Value)
**Content:** Updates to information sent at 9am

**Examples:**
| Morning Alert | Noon Update |
|---------------|-------------|
| "L train delays expected" | ✅ **RESOLVED:** L train running normally |
| "ASP suspended tomorrow" | ⚠️ **UPDATE:** ASP suspension now extended through Friday |
| "No weather alerts" | 🌧️ **NEW:** Thunderstorm warning issued for 2-4pm |

**Display:** Brief comparison format — "Was / Now"
**Max items:** 3-5

---

### 3. 🍽️ LUNCH-HOUR OPPORTUNITIES
**Content:** Things happening *right now* that users can act on during lunch

**Examples:**
- Pop-up food events within 10-min walk of major business districts
- Free museum entry during lunch hours
- Sample sales ending today
- Flash deals expiring at 2pm
- Food truck locations (real-time)

**Display:** Location-aware, time-sensitive
**Max items:** 2-3

---

### 4. 🚇 AFTERNOON TRANSIT CHANGES
**Content:** Transit updates affecting the commute home (4pm-7pm)

**Examples:**
- Express trains switching to local at 3pm
- Track maintenance starting 4pm
- Weekend service changes preview
- Bus route detours for evening events

**Display:** Route-specific, time-bounded
**Max items:** 2-3

---

### 5. 📊 THE MID-DAY SNAPSHOT
**Content:** Brief digest of NYC "vibe" right now

**Examples:**
- Current wait times at popular lunch spots
- Street fair / market activity
- Protest/march locations (if ongoing)
- Congestion pricing updates
- Real-time parking availability (if data available)

**Display:** Visual, scannable
**Max items:** 3-4 bullet points

---

## Content Types to EXCLUDE at Noon

| Exclude | Reason |
|---------|--------|
| Full weather forecast | Already sent at 9am; only include *changes* |
| Breaking news from this morning | Stale by noon; covered in 9am or 7pm digest |
| Events happening tonight | Save for 7pm email (users plan evening then) |
| Tomorrow's ASP status | Static info; 9am email covers this |
| Long-form content | Users are on mobile, time-constrained |
| General city announcements | Unless time-sensitive |

---

## How Noon Differs from 9am and 7pm

### 9am Email: "NYC Today" (Foundation)
- **Tone:** Comprehensive briefing
- **Content:** Full weather, all-day transit status, morning news, tonight preview
- **Length:** 5-7 minute read
- **Goal:** Prepare user for the day

### Noon Email: "NYC Now" (Live Pulse)
- **Tone:** Quick updates, actionable now
- **Content:** What's changed, lunch opportunities, afternoon transit
- **Length:** 60-90 second scan
- **Goal:** Keep user informed of developments, enable lunch-hour actions

### 7pm Email: "NYC Tonight" (Evening Planning)
- **Tone:** Discovery and planning
- **Content:** Evening events, tomorrow preview, day-in-review
- **Length:** 3-4 minute read
- **Goal:** Help user plan evening and tomorrow

---

## Subject Line Strategy

| Slot | Pattern | Example |
|------|---------|---------|
| 9am | "NYC Today: [Date]" | "NYC Today: Saturday, Jan 31" |
| **Noon** | **"NYC Now: [Key Update]"** | **"NYC Now: L train restored + 2 lunch pop-ups"** |
| 7pm | "NYC Tonight: [Hook]" | "NYC Tonight: 5 free events + tomorrow's alerts" |

### Noon Subject Rules:
- Lead with the biggest change since 9am
- Use "+" to separate multiple updates
- Keep under 50 characters for mobile
- Avoid emojis (professional tone per CONTENT_IMPROVEMENTS.md)

---

## Technical Requirements

### Data Sources Needed
1. **MTA Real-Time API** - Service changes since 9am
2. **Weather Alert API** - New warnings/updates
3. **Event APIs with real-time status** - Pop-ups, food trucks
4. **Traffic/ASP status feeds** - Real-time parking data
5. **News APIs** - Breaking news in last 3 hours

### Smart Batching Logic
- **Suppress noon email** if no significant changes since 9am
- **Threshold:** At least 2 meaningful updates required to send
- **Exception:** Always send if breaking/urgent alert exists

### Frequency Cap
- Max 1 noon email per day
- Skip if user already received 9am email AND no new developments
- Never duplicate content from 9am email verbatim

---

## Template Structure

```
┌─────────────────────────────────────┐
│  NYC NOW — Thursday, Jan 31         │  ← Date + branding
├─────────────────────────────────────┤
│  🚨 URGENT                          │  ← If breaking news
│  Snow emergency declared            │  ← Only if exists
├─────────────────────────────────────┤
│  WHAT'S CHANGED                     │  ← Core section
│  ✅ L train: Delays resolved        │  ← Morning status → Now
│  ⚠️ ASP: Extended through Friday    │  ← Morning status → Now
├─────────────────────────────────────┤
│  LUNCH-HOUR                         │  ← Time-sensitive
│  • Ramen pop-up @ Bryant Park       │  ← Until 2pm
│  • Sample sale ends today           │  ← 20% off till close
├─────────────────────────────────────┤
│  AFTERNOON TRANSIT                  │  ← Evening commute
│  • 4pm: F express → local           │  ← Time-specific
├─────────────────────────────────────┤
│  [Optional] MID-DAY SNAPSHOT        │  ← If data available
│  • High congestion: Midtown         │
├─────────────────────────────────────┤
│  Tonight preview →                  │  ← Tease 7pm email
│  Manage preferences | Unsubscribe   │  ← Footer
└─────────────────────────────────────┘
```

---

## Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Open rate | 45-55% | Higher than 9am (lower competition at lunch) |
| Click-through | 15-20% | Action-oriented content |
| Time to open | <30 min | Immediacy of content |
| Unsubscribe rate | <0.1% | Relevant, non-spammy |
| Reply rate | Track qualitative | "Thanks for the heads up" = success |

---

## Content Decision Framework

### Should this go in the noon email?

```
Is it breaking/urgent?
├── YES → Include (top priority)
└── NO → Is it an update to 9am content?
    ├── YES → Include (WHAT'S CHANGED section)
    └── NO → Is it actionable during lunch?
        ├── YES → Include (LUNCH-HOUR section)
        └── NO → Is it an afternoon transit change?
            ├── YES → Include (AFTERNOON TRANSIT section)
            └── NO → Save for 7pm email or tomorrow
```

---

## Implementation Notes

### Dependencies
- Requires diff engine to compare 9am → noon state
- Real-time data sources for transit, weather, events
- Location detection for lunch recommendations

### Files to Create/Modify
- `src/lib/email-templates-v2.ts` - Add `nycNow()` template
- `src/app/api/jobs/send-midday-pulse/route.ts` - New cron job
- `src/lib/midday-aggregator.ts` - New: what's changed detection

### Cron Schedule
```
# Weekdays at 12:00 PM ET (17:00 UTC)
0 17 * * 1-5
```

---

## Summary

The noon CityPing email is **not** a shorter 9am email. It's a **delta report** focused on:

1. **Changes since morning** (the core value prop)
2. **Right-now opportunities** (lunch hour)
3. **Afternoon planning** (evening commute)

Keep it **short, scannable, and strictly time-sensitive**. If the user could have read it at 9am, it doesn't belong in the noon email.

---

*Document created: January 31, 2026*
*Based on analysis of CityPing codebase and email restructuring requirements*
