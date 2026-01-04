# CityPing Strategic Improvements Design

**Date:** 2026-01-04
**Status:** Approved
**Author:** Claude + Human Collaboration

## Executive Summary

This document specifies seven strategic improvements to the CityPing platform, addressing infrastructure resilience, content intelligence, user personalization, and growth mechanics. The features are ordered by implementation priority: infrastructure first (Zod validation), then content intelligence (Hype Level, Feedback Loop), then user-facing features (Morning Commute, Weather Integration, Vibe Slider), and finally growth (Referral Program).

---

## 1. Zod Scraper Resilience

### Problem
Scrapers (MTA, Housing Connect, Sample Sales) can break silently when external sites change their DOM structure or API schema. A single schema change could mean users miss critical alerts.

### Design Decisions
- **Alert mechanism:** Email via Resend to admin
- **Failure behavior:** Partial ingestion (validate each item individually, ingest valid items, skip invalid, alert on failures)

### Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  External API   │────▶│  Zod Schema  │────▶│  AlertEvent DB  │
│  (MTA, 260, HC) │     │  Validation  │     │                 │
└─────────────────┘     └──────┬───────┘     └─────────────────┘
                               │
                        ┌──────▼───────┐
                        │ Partial Fail │
                        │   Handler    │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ Resend Email │
                        │   to Admin   │
                        └──────────────┘
```

### Implementation

1. Create `src/lib/schemas/` directory with Zod schemas for each scraper:
   - `mta-alert.schema.ts`
   - `sample-sale.schema.ts`
   - `housing-listing.schema.ts`

2. Wrap each scraper's parse logic in `safeParse()`

3. Accumulate validation errors, send digest email if any failures

4. New environment variable: `ADMIN_ALERT_EMAIL`

### Schema Example (MTA)

```typescript
import { z } from "zod";

export const MtaAlertSchema = z.object({
  id: z.string(),
  header: z.string().min(1),
  description: z.string().optional(),
  affectedLines: z.array(z.string()).min(1),
  activePeriod: z.object({
    start: z.number(),
    end: z.number().optional(),
  }).optional(),
});

export type MtaAlert = z.infer<typeof MtaAlertSchema>;
```

### Alert Email Template

Subject: `[CityPing] Scraper Validation Failures - {source} ({count} errors)`

Body includes: timestamp, source name, error count, sample of failed payloads (first 3), validation error messages.

---

## 2. Hype Level Scoring for Sample Sales

### Problem
A Hermès sample sale and a generic warehouse sale are treated identically. Users can't distinguish high-value events from noise.

### Design Decisions
- **Approach:** Hybrid (brand tier baseline + Claude Haiku adjustment ±20 points)

### Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Sample Sale    │────▶│  Brand Tier  │────▶│  Base Score     │
│  (brand, desc)  │     │  Lookup      │     │  (0-100)        │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                        ┌──────────────┐              │
                        │ Claude Haiku │◀─────────────┘
                        │  Adjustment  │
                        │   (±20 pts)  │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ Final Hype   │
                        │ Score 0-100  │
                        └──────────────┘
```

### Schema Changes (Prisma)

```prisma
model AlertEvent {
  // ... existing fields
  hypeScore      Int?      @map("hype_score")  // 0-100
  hypeFactors    Json?     @map("hype_factors") // { brandTier: 80, scarcity: +15, aiAdj: +5 }
}
```

### Brand Tier Lookup

| Tier | Score | Examples |
|------|-------|----------|
| Luxury | 90-100 | Hermès, Chanel, Louis Vuitton, Brunello Cucinelli |
| Designer | 70-89 | Proenza Schouler, The Row, Alexander Wang, Phillip Lim |
| Contemporary | 50-69 | Theory, Vince, Rag & Bone, Equipment, AllSaints |
| Fast Fashion | 30-49 | Zara, H&M, COS, & Other Stories |
| Unknown | 40 | Default for unrecognized brands |

### AI Adjustment Prompt

```
Given this sample sale: "{brand}" - "{description}"
Base score: {baseScore}

Adjust -20 to +20 based on:
- Scarcity signals ("one day only", "first 100 customers"): +5 to +15
- Deep discounts ("80% off"): +5 to +10
- VIP/early access: +10
- Multi-day/generic: -5 to -10

Return JSON: { "adjustment": <number>, "reason": "<brief>" }
```

### Files to Create
- `src/lib/brand-tiers.ts` - Brand lookup table
- `src/lib/hype-scoring.ts` - Scoring logic + AI call

---

## 3. Feedback Loop (Per-Item Thumbs Up/Down)

### Problem
No signal on which alerts users actually value. The inference engine is static—it can't learn that Williamsburg users love vintage sales but ignore housing lotteries.

### Design Decisions
- **Collection:** Per-item inline (👍/👎 next to each event in email)
- **Utilization:** Auto-adjust inference weights at zip code level

### Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Email Digest   │────▶│  User Clicks │────▶│  FeedbackEvent  │
│  👍 👎 links    │     │  /api/fb/... │     │     Table       │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                        ┌──────────────┐              │
                        │  Monthly     │◀─────────────┘
                        │  Aggregation │
                        │    Job       │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ ZIP_PROFILES │
                        │   Weights    │
                        └──────────────┘
```

### Schema Changes (Prisma)

```prisma
model FeedbackEvent {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  eventId   String   @map("event_id")
  moduleId  String   @map("module_id")
  rating    Int      // +1 (thumbs up) or -1 (thumbs down)
  zipCode   String   @map("zip_code")  // Denormalized for aggregation
  createdAt DateTime @default(now()) @map("created_at")

  user  User       @relation(fields: [userId], references: [id])
  event AlertEvent @relation(fields: [eventId], references: [id])

  @@unique([userId, eventId])
  @@index([zipCode, moduleId])
  @@map("feedback_events")
}
```

### Email HTML Template

```html
<tr>
  <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
    <strong>Theory Sample Sale</strong>
    <span style="color: #666;">260 Fifth Ave • Jan 15-18</span>
  </td>
  <td style="width: 60px; text-align: right;">
    <a href="{{baseUrl}}/api/feedback?e={{eventId}}&u={{userId}}&r=1">👍</a>
    <a href="{{baseUrl}}/api/feedback?e={{eventId}}&u={{userId}}&r=-1">👎</a>
  </td>
</tr>
```

### Auto-Adjustment Logic

Monthly cron job aggregates feedback:
- If >70% of users in a zip thumbs-down a module → reduce default weight
- If >70% thumbs-up → increase default weight
- Minimum threshold: 10 feedback events per zip/module pair

### Files to Create
- `src/app/api/feedback/route.ts` - Feedback capture endpoint
- `src/app/api/jobs/aggregate-feedback/route.ts` - Monthly aggregation job
- Update `src/lib/email-digest.ts` - Add feedback links to template

---

## 4. Morning Commute (Time-to-Leave Logic)

### Problem
Transit alerts are generic ("L train delays"). Users want contextual advice: "L is delayed at Bedford—your stop. Take the G from Lorimer instead."

### Design Decisions
- **Route intelligence:** Departure station inference from zip code
- **Alternative routes:** Hybrid (static fallback line map + AI-generated copy)

### Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  User Zip Code  │────▶│  Station     │────▶│  Home Station   │
│    (11211)      │     │  Inference   │     │  (Bedford Ave)  │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
┌─────────────────┐     ┌──────────────┐              │
│  MTA Alert      │────▶│  Affected    │──────────────┤
│  (L delayed)    │     │  Stations    │              │
└─────────────────┘     └──────────────┘              │
                                                      │
                        ┌──────────────┐              │
                        │  Fallback    │◀─────────────┘
                        │  Line Map    │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ Claude Haiku │
                        │  Copy Gen    │
                        └──────────────┘
```

### Zip-to-Station Mapping

```typescript
// src/lib/stations.ts
export const ZIP_STATIONS: Record<string, {
  primary: string;      // Station name
  lines: string[];      // Lines at that station
  lat: number;
  lng: number;
}> = {
  "11211": { primary: "Bedford Ave", lines: ["L"], lat: 40.717, lng: -73.957 },
  "11249": { primary: "Lorimer St", lines: ["L", "G"], lat: 40.714, lng: -73.950 },
  "11222": { primary: "Greenpoint Ave", lines: ["G"], lat: 40.731, lng: -73.954 },
  // ~50-80 key NYC zip codes
};
```

### Fallback Line Map

```typescript
// src/lib/fallback-routes.ts
export const LINE_ALTERNATIVES: Record<string, string[]> = {
  "L": ["G", "M", "J"],           // Williamsburg/Bushwick
  "G": ["L", "F", "A/C"],         // Brooklyn crosstown
  "1": ["2", "3", "A/C"],         // West side
  "4": ["5", "6", "2/3"],         // East side express
  "7": ["N/W", "E/F"],            // Queens
  // ... all 27 lines
};
```

### AI Copy Generation

```
Line: {line} is delayed. User's home station: {station}.
Alternative lines: {alternatives}.

Write a 1-sentence alert in {vibePreset} voice:
- transplant: Helpful, explains the alternative
- regular: Brief but clear
- local: Terse, assumes NYC knowledge

Example (local): "L's fucked at Bedford. G from Lorimer, transfer at Hoyt."
```

### Files to Create
- `src/lib/stations.ts` - Zip-to-station mapping
- `src/lib/fallback-routes.ts` - Alternative line lookup
- `src/lib/commute-alerts.ts` - Alert generation logic

---

## 5. Rainy Day Protocol (Full Weather Integration)

### Problem
Events are scored without weather context. A rooftop bar recommendation during a thunderstorm is useless; a museum suggestion during a heat wave is gold.

### Design Decisions
- **Filtering approach:** Full weather integration (temperature, precipitation, air quality all affect event scoring)

### Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  NWS Forecast   │────▶│  Weather     │────▶│  Condition      │
│  (existing)     │     │  Classifier  │     │  Tags           │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
┌─────────────────┐                                   │
│  Event/Venue    │─────────────────────────────────▶ │
│  Attributes     │                                   │
└─────────────────┘                                   │
                        ┌──────────────┐              │
                        │  Weather     │◀─────────────┘
                        │  Score Adj   │
                        └──────────────┘
```

### Weather Condition Types

```typescript
type WeatherCondition =
  | "clear"           // No adjustments
  | "rain"            // Outdoor events -30, indoor +10
  | "heavy_rain"      // Outdoor events -50, "cozy" venues +20
  | "snow"            // Outdoor -40, but "snow activities" +20
  | "extreme_cold"    // <20°F: outdoor -30, heated patios -20
  | "extreme_heat"    // >90°F: outdoor -30, AC venues +20, pools +30
  | "poor_air"        // AQI >100: outdoor -40, indoor +10
```

### Schema Changes (Prisma)

```prisma
model AlertEvent {
  // ... existing
  venueType    String?   @map("venue_type")  // outdoor, indoor, hybrid, rooftop
  weatherTags  String[]  @map("weather_tags") // ["ac", "heated", "covered", "cozy", "pool"]
}
```

### Scoring Matrix

| Condition | Outdoor | Indoor | Rooftop | "Cozy" Tag | "AC" Tag |
|-----------|---------|--------|---------|------------|----------|
| Rain | -30 | +10 | -40 | +20 | — |
| Heavy Rain | -50 | +10 | -60 | +30 | — |
| Extreme Heat | -30 | +5 | -40 | — | +25 |
| Extreme Cold | -30 | +5 | -50 | +20 | — |
| Poor Air | -40 | +15 | -40 | — | — |

### Bonus Section Injection

When precipitation detected, inject "Rainy Day Picks" section in digest:
- Top-scoring indoor events
- Hardcoded suggestions: "Museums with no lines", "Cozy dive bars with fireplaces"

### Files to Create
- `src/lib/weather-scoring.ts` - Weather condition classification + score adjustments
- Update `src/lib/weather.ts` - Add condition classification
- Update `src/lib/email-digest.ts` - Add weather-aware sections

---

## 6. Vibe Slider (AI Personality Tuner)

### Problem
One-size-fits-all copy. A 10-year Bushwick resident doesn't need "Did you know the L train connects Brooklyn to Manhattan?" but a newcomer might.

### Design Decisions
- **Personality presets:** Three personas (Transplant / Regular / Local)

### Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  User Settings  │────▶│  vibePreset  │────▶│  Prompt         │
│  (preferences)  │     │  Selection   │     │  Template       │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
┌─────────────────┐                                   │
│  Raw Event      │─────────────────────────────────▶ │
│  Data           │                                   │
└─────────────────┘                                   │
                        ┌──────────────┐              │
                        │ Claude Haiku │◀─────────────┘
                        │  Generation  │
                        └──────────────┘
```

### Schema Changes (Prisma)

```prisma
enum VibePreset {
  transplant  // Helpful, explanatory, "Did you know?"
  regular     // Balanced, clear, efficient
  local       // Terse, cynical, assumes knowledge

  @@map("vibe_preset")
}

model User {
  // ... existing
  vibePreset   VibePreset  @default(regular) @map("vibe_preset")
}
```

### Persona Definitions

| Preset | Tone | Local Knowledge | Verbosity | Example |
|--------|------|-----------------|-----------|---------|
| **Transplant** | Warm, helpful | Explains everything | High | "The L train (which runs through Williamsburg to Union Square) is experiencing delays at Bedford Ave. You might want to take the G train as an alternative—it runs parallel through Brooklyn." |
| **Regular** | Friendly, clear | Some context | Medium | "L train delayed at Bedford Ave. The G runs parallel if you need an alternative." |
| **Local** | Blunt, efficient | Assumes full knowledge | Low | "L's fucked at Bedford. G from Lorimer." |

### System Prompts

```typescript
// src/lib/vibe-prompts.ts
export const VIBE_SYSTEM_PROMPTS: Record<VibePreset, string> = {
  transplant: `You're a friendly NYC guide helping someone new to the city.
    Explain local knowledge, give context, use encouraging tone.
    It's okay to be a bit wordy if it helps understanding.`,

  regular: `You're a helpful NYC local giving a friend quick info.
    Be clear and efficient, include key context, skip obvious stuff.
    Friendly but not verbose.`,

  local: `You're a jaded New Yorker. Terse, no fluff, assume they know the city.
    Cynical humor okay. Never explain what the subway is.
    If something sucks, say it sucks.`,
};
```

### UI: Preferences Page

Simple radio group with user-friendly labels:
- 🌱 **New to NYC** — Helpful explanations, local tips
- 🏠 **Been here a while** — Clear and efficient
- 🗽 **True Local** — Just the facts, no hand-holding

### Files to Create
- `src/lib/vibe-prompts.ts` - Persona definitions and system prompts
- Update `src/app/preferences/page.tsx` - Add vibe selector UI
- Update `src/lib/ai-copy.ts` - Integrate vibe into generation

---

## 7. Referral Program

### Problem
No viral growth mechanism. Word-of-mouth is the best channel for local utility apps, but there's no incentive to share.

### Design Decisions
- **Credits mechanism:** Stripe coupon codes (100% off, 1 month, single-use)
- **Tracking:** `referredBy` field on User + `ReferralEvent` table

### Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  User A shares  │────▶│  Unique      │────▶│  User B signs   │
│  referral link  │     │  Referral    │     │  up with code   │
└─────────────────┘     │  Code        │     └────────┬────────┘
                        └──────────────┘              │
                                                      │
                        ┌──────────────┐              │
                        │  User B      │◀─────────────┘
                        │  Converts to │
                        │  Premium     │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ Stripe Coupon│
                        │ Generated    │
                        │ for User A   │
                        └──────────────┘
```

### Schema Changes (Prisma)

```prisma
model User {
  // ... existing
  referralCode   String    @unique @default(cuid()) @map("referral_code")
  referredBy     String?   @map("referred_by")  // referralCode of referrer

  referrals      ReferralEvent[]  @relation("Referrer")
}

model ReferralEvent {
  id             String   @id @default(cuid())
  referrerId     String   @map("referrer_id")
  refereeId      String   @unique @map("referee_id")  // One referral per user
  status         ReferralStatus @default(pending)
  couponId       String?  @map("coupon_id")  // Stripe coupon ID when rewarded
  convertedAt    DateTime? @map("converted_at")
  createdAt      DateTime @default(now()) @map("created_at")

  referrer       User     @relation("Referrer", fields: [referrerId], references: [id])

  @@map("referral_events")
}

enum ReferralStatus {
  pending     // User B signed up but not premium
  converted   // User B went premium, coupon issued
  redeemed    // User A used the coupon

  @@map("referral_status")
}
```

### Flow

1. **User A** gets unique link: `cityping.com/r/{referralCode}`
2. **User B** clicks link → signup form pre-fills `referredBy`
3. **User B** signs up (free tier) → `ReferralEvent` created with `status: pending`
4. **User B** converts to premium → Stripe webhook triggers:
   - Create Stripe coupon: `100% off, 1 month, single-use`
   - Update `ReferralEvent.status = converted`, store `couponId`
   - Email User A: "Your friend upgraded! Here's your free month"
5. **User A** uses coupon on next billing cycle

### Email Digest Footer

```html
<div style="background: #f5f5f5; padding: 16px; margin-top: 24px; border-radius: 8px;">
  <strong>Know someone who'd love CityPing?</strong><br>
  Share your link: cityping.com/r/{{referralCode}}<br>
  <span style="color: #666;">They sign up, you get a free month of Premium.</span>
</div>
```

### Files to Create
- `src/app/r/[code]/page.tsx` - Referral landing page (redirects to signup with code)
- `src/app/api/referrals/route.ts` - Referral tracking endpoints
- Update `src/app/api/webhooks/stripe/route.ts` - Handle conversion events
- `src/lib/referrals.ts` - Coupon generation + notification logic

---

## Implementation Order

1. **Zod Scraper Resilience** (Foundation)
2. **Hype Level Scoring** (Content intelligence)
3. **Feedback Loop** (Data collection for learning)
4. **Morning Commute** (High-value user feature)
5. **Rainy Day Protocol** (Weather integration)
6. **Vibe Slider** (Personalization)
7. **Referral Program** (Growth)

---

## Dependencies

| Feature | External Dependencies |
|---------|----------------------|
| Zod Resilience | `zod` (add to package.json) |
| Hype Level | Claude Haiku API (existing Anthropic integration) |
| Feedback Loop | None new |
| Morning Commute | Claude Haiku API |
| Weather Integration | NWS API (existing) |
| Vibe Slider | Claude Haiku API |
| Referral Program | Stripe Coupons API (existing Stripe integration) |

---

## Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Zod Resilience | Silent failures per week | 0 (all caught) |
| Hype Level | Click-through on high-hype events | >2x baseline |
| Feedback Loop | Feedback rate per digest | >5% |
| Morning Commute | Transit alert engagement | >15% increase |
| Weather Integration | Outdoor event clicks on bad weather days | >20% reduction |
| Vibe Slider | User preference set rate | >30% of users |
| Referral Program | Referral conversion rate | >10% |
