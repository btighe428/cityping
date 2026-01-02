# NYCPing City Pulse - Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform NYCPing from reactive alerts into proactive city intelligence - the insider's guide to what's happening in NYC.

**Architecture:** AI-powered ingestion from 20+ sources, unified canonical calendar, intelligence layer for curation, daily + weekly email delivery.

**Tech Stack:** Extends existing Next.js/Prisma/Resend stack with Claude API for extraction/generation, Vercel Cron for scheduling.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DELIVERY LAYER                           │
│  Daily Email (7am) │ Weekly Email (Sun 8am) │ Future: App   │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────┐
│                   CURATION LAYER                            │
│  AI Outlook Generator │ Relevance Scoring │ Personalization │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────┐
│                 CANONICAL CALENDAR                          │
│  Unified event store │ Deduplication │ Category tagging     │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────┐
│                   INGESTION LAYER                           │
│  Scrapers │ API Pollers │ RSS Readers │ AI Extractors       │
└─────────────────────────────────────────────────────────────┘
```

---

## Ingestion Layer

### Source Categories & Methods

| Category | Sources | Method | Frequency |
|----------|---------|--------|-----------|
| **Government** | NYC.gov, Parks, MTA, DOT | API + RSS | Daily |
| **Weather** | NWS API, OpenWeather | API | Every 6 hours |
| **Sports** | ESPN API, team sites | API + scrape | Daily |
| **Cultural** | MoMA, Met, Lincoln Center | Scrape + iCal feeds | Daily |
| **Editorial** | TimeOut, Gothamist, Eater | RSS + AI extraction | Every 4 hours |
| **Community** | Nonsense NYC, Reddit r/nyc | RSS + AI extraction | Every 2 hours |
| **Social** | Twitter trends, Instagram | API (if available) | Hourly |

### AI Extraction Pipeline

For unstructured sources (articles, newsletters, social posts):

1. **Fetch** raw content (HTML, RSS, API response)
2. **Prompt LLM** to extract structured event data:
   - What: Event name/description
   - When: Date(s), time(s), deadlines
   - Where: Venue, neighborhood, borough
   - Action: Signup required? Free? Tickets?
   - Category: Sports, culture, food, civic, weather
3. **Confidence score** each extraction (high/medium/low)
4. **Route** based on category rules (auto-publish or review queue)

### Evergreen Calendar Seed

~150 pre-loaded annual NYC events with typical dates:
- Rockefeller Tree Lighting (late Nov)
- Macy's Thanksgiving Parade
- NYC Marathon (first Sun Nov)
- Open House NY (Oct weekend)
- Museum free days (MoMA Fridays, etc.)

AI monitors for official date announcements and updates the seed.

---

## Curation Layer (The Intelligence)

### The "Insider Score" Framework

Every event gets scored on three dimensions:

| Dimension | What It Measures | Examples |
|-----------|------------------|----------|
| **Scarcity** | Limited access, sells out, requires action | TKTS lottery, Open House NY signup, sample sales |
| **Timing** | Why *now* matters | "Signup opens tomorrow", "Last weekend", "First snowfall" |
| **Cultural cachet** | Would a savvy New Yorker care? | Niche gallery opening > generic street fair |

Events scoring high on 2+ dimensions get surfaced. Low scores get filtered out.

### "Ah-Ha" Trigger Patterns

```
PATTERN: "signup_opens_soon"
→ "Open House NY registration opens in 48 hours - buildings fill fast"

PATTERN: "weather_unlocks_experience"
→ "First snow tomorrow - Washington Square transforms. Hot cocoa at Joe's."

PATTERN: "cultural_moment"
→ "Knicks clinch playoff spot tonight - watch parties citywide"

PATTERN: "local_secret"
→ "MoMA is free every Friday 5:30-9pm. Most NYers don't know this."

PATTERN: "seasonal_first"
→ "Rockefeller tree lighting date announced: Nov 29. Avoid 5th Ave that week."
```

### Anti-Patterns (What Gets Filtered)

- Generic recurring events (weekly comedy shows, ongoing exhibits)
- Tourist traps without local angle
- Events without clear "why now"
- Anything requiring $100+ without exceptional value

### Category-Based Publishing Rules

| Category | Rule | Rationale |
|----------|------|-----------|
| Weather | Auto-publish | Objective, time-sensitive |
| Sports scores/schedules | Auto-publish | Factual, API-sourced |
| Transit alerts | Auto-publish | Already validated by MTA |
| Cultural recommendations | Review queue | Subjective, needs taste |
| "Best of" lists | Review queue | Editorial judgment needed |
| Signup deadlines | Auto-publish | Factual with high urgency |

---

## The NYCPing Voice

**Not this (generic):**
> "Rockefeller Center Christmas Tree Lighting - November 29, 2025"

**This (insider):**
> "Rockefeller tree lights up Nov 29. Skip the crowds - the tree stays lit through Jan. Best viewing: weekday 6am, empty plaza, coffee from Joe's across the street."

**Not this:**
> "Free MoMA admission on Fridays"

**This:**
> "MoMA is secretly free every Friday 5:30-9pm. Go at 7, most tourists have left, grab a martini at Terrace 5 after."

**Not this:**
> "Snow expected tomorrow"

**This:**
> "4-6 inches overnight. ASP suspended. Central Park at dawn will be magical - bring a sled to Pilgrim Hill before the crowds."

### Contextual Layering

| Event | Added Context |
|-------|---------------|
| Macy's Parade | "Best views: 77th & Central Park West. Arrive by 7am. Pro tip: bathrooms at the Museum of Natural History." |
| US Open | "Grounds pass = great deal. Arthur Ashe overrated - watch rising stars on Court 17." |
| Housing lottery deadline | "Apply even if you think you won't qualify. Income bands are wider than you think." |
| First beach day | "Rockaway A train takes 90 min. Drive to Jacob Riis instead - parking free before 9am." |

---

## Email Formats

### Daily Email: "NYC Today" (7am, weekdays)

**Goal:** 60-second scan before leaving home. High signal, zero fluff.

```
┌─────────────────────────────────────────────────────────────┐
│  NYC TODAY · Thursday, Jan 16                    ☀️ 42°→51° │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ WHAT MATTERS TODAY                                      │
│  ─────────────────────                                      │
│  • ASP in effect (moved your car?)                         │
│  • L train: delays btwn Bedford & 8th Ave til noon         │
│  • Rangers vs Bruins 7pm - clinch playoff spot tonight     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🎯 DON'T MISS                                              │
│  ─────────────────                                          │
│  Open House NY registration opens 10am                      │
│  → Last year sold out in 3 hours. Set an alarm.            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📍 TONIGHT IN NYC                                          │
│  ─────────────────                                          │
│  Free · MoMA after 5:30 (it's Friday eve, close enough)    │
│  $25 · Jazz at Smalls, 10pm - no cover if you eat          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🌤️ LOOK AHEAD                                              │
│  ─────────────────                                          │
│  Sat: High 55°, perfect for the Highline                   │
│  Sun: Rain by 4pm - morning plans only                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Sections:**
1. **What Matters Today** - Transit, parking, weather, urgent
2. **Don't Miss** - One high-priority action item (if any)
3. **Tonight** - 2-3 curated evening options
4. **Look Ahead** - Weekend weather + one teaser

### Weekly Email: "Your NYC Week" (Sunday 8am)

**Goal:** 5-minute read with coffee. Plan your week, feel informed.

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR NYC WEEK · Jan 19-25                                  │
│  "Quiet week - perfect for catching up on museum shows     │
│   before the February crowds hit."                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 THE WEEK AT A GLANCE                                    │
│  ────────────────────────                                   │
│  Mon   Tue   Wed   Thu   Fri   Sat   Sun                   │
│  38°   41°   45°   42°   ❄️40° 35°   38°                   │
│   ·     ·    🎭    ⚾    🎨    ·    🏃                      │
│                                                             │
│  🎭 Wed: Broadway Week tix on sale                          │
│  ⚾ Thu: Yankees spring training tix drop                   │
│  🎨 Fri: MoMA Free Friday + new Basquiat show              │
│  🏃 Sun: Brooklyn Half registration closes                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🎯 ACTION REQUIRED                                         │
│  ─────────────────────                                      │
│                                                             │
│  ▸ Brooklyn Half Marathon                                   │
│    Registration closes Sunday midnight                      │
│    $85 now → lottery only after                            │
│    → SIGN UP                                                │
│                                                             │
│  ▸ Housing Lottery: 1 Bergen Street                        │
│    Studios from $1,200 in Boerum Hill                      │
│    Deadline: Friday Jan 24                                  │
│    → APPLY NOW                                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🗽 THIS WEEK IN NYC                                        │
│  ─────────────────────                                      │
│                                                             │
│  CULTURE                                                    │
│  New: Basquiat retrospective opens at MoMA (Fri)           │
│  Last chance: Manet/Degas closes at the Met (Sun)          │
│  Free: Lincoln Center atrium concerts daily 12:30pm        │
│                                                             │
│  FOOD & DRINK                                               │
│  Opening: Tatiana 2.0 in Hudson Yards (Tues)               │
│  Deal: Restaurant Week extended through Friday             │
│                                                             │
│  SPORTS                                                     │
│  Knicks vs Heat (Wed 7:30) - playoff seeding game          │
│  Rangers clinch watch: need 1 win in next 2                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  👀 ON YOUR RADAR                                           │
│  ─────────────────                                          │
│  Things to know about, not act on yet:                     │
│                                                             │
│  • Cherry blossoms: Peak bloom forecast Mar 28-Apr 5       │
│  • Governors Island reopens May 1 - ferry tix live Apr 1   │
│  • NYC Marathon lottery opens Mar 15                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Sections:**
1. **Editor's Note** - One-line vibe for the week
2. **Week at a Glance** - Visual calendar with weather + icons
3. **Action Required** - Deadlines with clear CTAs
4. **This Week** - Curated by category (Culture, Food, Sports)
5. **On Your Radar** - Future things to be aware of

---

## Data Model

### Core Event Schema

```typescript
interface CityEvent {
  id: string;

  // What
  title: string;                    // "Open House NY 2025"
  description: string;              // AI-generated insider copy
  rawDescription?: string;          // Original source text

  // When
  startsAt: Date;                   // Event start
  endsAt?: Date;                    // Event end (if applicable)
  deadlineAt?: Date;                // Signup/action deadline
  announcedAt?: Date;               // When we learned about it

  // Where
  venue?: string;                   // "MoMA"
  neighborhood?: string;            // "Midtown"
  borough?: string;                 // "Manhattan"
  coordinates?: {lat, lng};

  // Classification
  category: Category;               // culture, sports, food, civic, weather
  subcategory?: string;             // "museum", "basketball", "signup"
  tags: string[];                   // ["free", "outdoor", "family"]

  // Intelligence
  insiderScore: number;             // 0-100 composite score
  scarcityScore: number;            // Sells out? Limited access?
  timingScore: number;              // Why now matters
  cachetScore: number;              // Cultural relevance

  // Curation
  status: "auto" | "review" | "published" | "rejected";
  aiConfidence: number;             // Extraction confidence
  editorNotes?: string;             // Human review notes

  // Source
  sourceId: string;                 // Link to source
  externalId: string;               // Dedup key
  sourceUrl?: string;               // Original link

  // Evergreen
  isRecurring: boolean;             // Annual event?
  recurrenceRule?: string;          // "first Sunday November"
  parentEventId?: string;           // Links to evergreen template
}

type Category =
  | "culture"      // Museums, galleries, theater, music
  | "sports"       // Games, playoffs, marathons
  | "food"         // Restaurant openings, deals, food events
  | "civic"        // Housing lotteries, signups, voting
  | "weather"      // Forecasts, snow days, heat waves
  | "transit"      // Service changes, new routes
  | "seasonal"     // Holidays, tree lightings, parades
  | "local"        // Neighborhood-specific, community
  ;
```

### Evergreen Event Template

```typescript
interface EvergreenEvent {
  id: string;
  name: string;                     // "Rockefeller Tree Lighting"
  typicalDate: string;              // "last Wednesday of November"
  typicalTime?: string;             // "7pm"
  category: Category;
  insiderContext: string;           // Local wisdom to include
  anticipationDays: number[];       // When to mention: [30, 7, 1]
  sources: string[];                // Where to watch for announcements
}
```

---

## AI Pipeline

### Daily Ingestion Flow

```
6:00 AM  ┌─────────────────────────────────────────────────────┐
         │ INGEST: Fetch all sources (APIs, RSS, scrapers)     │
         └──────────────────────┬──────────────────────────────┘
                                ▼
6:15 AM  ┌─────────────────────────────────────────────────────┐
         │ EXTRACT: LLM parses unstructured → CityEvent        │
         │ • Batch process articles/posts                      │
         │ • Score confidence (high/med/low)                   │
         └──────────────────────┬──────────────────────────────┘
                                ▼
6:30 AM  ┌─────────────────────────────────────────────────────┐
         │ DEDUPE: Match against existing events               │
         │ • Same event from multiple sources → merge          │
         │ • Update dates if source is authoritative           │
         └──────────────────────┬──────────────────────────────┘
                                ▼
6:35 AM  ┌─────────────────────────────────────────────────────┐
         │ SCORE: Calculate insider scores                     │
         │ • Scarcity (sells out? deadline?)                   │
         │ • Timing (why today matters)                        │
         │ • Cachet (cultural relevance)                       │
         └──────────────────────┬──────────────────────────────┘
                                ▼
6:40 AM  ┌─────────────────────────────────────────────────────┐
         │ ROUTE: Category-based publishing rules              │
         │ • Factual (weather, sports) → auto-publish          │
         │ • Subjective (recommendations) → review queue       │
         └──────────────────────┬──────────────────────────────┘
                                ▼
6:45 AM  ┌─────────────────────────────────────────────────────┐
         │ GENERATE: AI writes daily email                     │
         │ • Select top events by score                        │
         │ • Write insider copy with context                   │
         │ • Format into email template                        │
         └──────────────────────┬──────────────────────────────┘
                                ▼
7:00 AM  ┌─────────────────────────────────────────────────────┐
         │ SEND: Deliver to all subscribers                    │
         └─────────────────────────────────────────────────────┘
```

### LLM Prompts

**Event Extraction:**
```
You are extracting NYC events from this article.

For each event found, return:
- title: Event name
- date: When it happens (ISO format)
- deadline: Signup deadline if any
- venue: Location
- category: culture|sports|food|civic|weather|seasonal
- action_required: Does user need to do something?
- confidence: high|medium|low

Article:
{raw_content}
```

**Insider Copy Generation:**
```
You are a savvy NYC local writing for other New Yorkers.

Event: {event_title}
Date: {date}
Venue: {venue}
Raw description: {description}

Write a 1-2 sentence insider take. Include:
- Why this matters NOW
- A local tip most people don't know
- Skip generic descriptions

Voice: Helpful friend, not marketing copy. Assume reader is smart.
```

---

## Tech Stack

```
Existing (no changes):
├── Next.js 15 + Vercel
├── Prisma + Supabase (PostgreSQL)
├── Resend (email delivery)
├── Tailwind CSS

New additions:
├── Claude API (extraction + generation)
├── Vercel Cron (scheduled ingestion + email jobs)
├── Upstash Redis (optional: job queue, rate limiting)
└── Admin UI route (/admin/review) for curation queue
```

---

## Phased Rollout

| Phase | Scope |
|-------|-------|
| **Phase 1: Seed + Manual** | Load 150 evergreen events, manually curate weekly email, prove the format |
| **Phase 2: Weather + Sports** | Auto-ingest NWS forecasts, ESPN schedules - factual, low risk |
| **Phase 3: Editorial Sources** | Add TimeOut, Gothamist RSS - AI extraction with review |
| **Phase 4: Daily Email** | Launch daily "NYC Today" alongside weekly |
| **Phase 5: Full Automation** | Tune confidence thresholds, reduce manual review |

---

## Success Metrics

- **Open rate:** >50% (industry avg 20%)
- **"Reply to share feedback":** Qualitative signal
- **Unsubscribe rate:** <1% per month
- **User quotes:** "I feel like an insider" / "How did you know about X?"

---

## Summary

**NYCPing City Pulse** transforms the app from reactive alerts into proactive city intelligence:

- AI-powered ingestion from 20+ sources
- Category-based auto-publish rules (facts) + review queue (subjective)
- Insider Score framework (scarcity, timing, cultural cachet)
- Daily + Weekly emails with savvy local voice
- Evergreen calendar of 150+ annual NYC events
- Built on existing stack - extends current infrastructure
