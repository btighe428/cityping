# CurbCue MVP Design

**Date:** 2025-12-13
**Status:** Validated

## Overview

CurbCue is an SMS-based service that alerts NYC drivers the evening before Alternate Side Parking (ASP) is suspended. Users pay $1.99/month after a free 30-day trial.

## Brand & Tone

- **Name:** CurbCue (may change)
- **Visual:** Civic/official aesthetic — navy blue palette, clean sans-serif typography, trustworthy utility feel
- **Voice:** Friendly/casual in SMS ("Hey! Tomorrow's Christmas — ASP is OFF. Sleep in, your car's fine. 🎄")
- **Landing message:** Problem-focused ("Never get a parking ticket on a holiday again")

## Pricing

- Free 30-day trial (invisible — no reminder texts about trial ending)
- $1.99/month charged after trial
- Card collected upfront via Stripe Checkout

## Pages

### Landing Page (`/`)

**Header**
- Logo: "CurbCue" in clean sans-serif, navy blue
- City dropdown (top right): "NYC" selected, other cities greyed/coming soon

**Hero**
- Headline: "Never get a parking ticket on a holiday again"
- Subhead: "We text you the night before ASP is suspended. That's it."
- Price badge: "Free for 30 days, then $1.99/month"

**Two-Step Signup**
- Step 1 visible on load: Large "Start Free Trial" button
- Click reveals Step 2: Phone number input (formatted, validated) + "Continue" button → Stripe Checkout

**Social Proof**
- "Join 1,000+ NYC drivers" (placeholder, update with real count)
- Optional: 2-3 short testimonials

**Upcoming Suspensions Preview**
- Card showing next 2-3 suspension dates from public calendar
- "Next: MLK Day (Jan 20), Presidents Day (Feb 17)"

**FAQ Section**
- How does it work?
- Can I cancel anytime?
- What about snow days? (Coming soon)
- Is my info safe?

**Footer**
- Links: Terms, Privacy, Contact
- "Made in NYC"

### Dashboard (`/dashboard` and `/m/[token]`)

**Access Methods**
- Direct after checkout: `/dashboard?session_id=...`
- Via SMS: Reply "MANAGE" → receive secure link `/m/[token]` (15-min expiry, one-time use)

**Layout**

*Top Bar*
- Phone number (masked): •••-•••-1234
- Status pill: "Active" (green) or "Pending Confirmation" (yellow)
- "Manage Billing" link → Stripe Customer Portal

*Calendar Section (main focus)*
- Month grid view, current month displayed
- Suspension days highlighted (navy blue fill)
- Hover/tap shows reason: "Christmas Day"
- Nav arrows for future months
- Legend: "● ASP Suspended"

*Preferences Panel*
- Reminder time: Dropdown, default 6:00 PM, options 5pm–9pm in 30-min increments
- City toggles: NYC (on) — future cities appear automatically
- Save button

*Message History*
- Collapsible: "Recent Messages"
- Last 10 sent SMS with date, type, preview
- "View all" expands

*Footer*
- "Cancel subscription" → Stripe portal
- "Need help? Text HELP or email support@curbcue.com"

### Static Pages

- `/terms` — Terms of service
- `/privacy` — Privacy policy

## Signup Flow

1. User clicks "Start Free Trial" on landing page
2. Button expands to reveal phone input field
3. User enters phone (auto-formatted, validated E.164)
4. User clicks "Continue to Checkout" → redirected to Stripe Checkout
5. Stripe Checkout: subscription mode, 30-day trial, $1.99/month after
6. On success: redirected to `/dashboard?session_id=...`
7. Parallel: Stripe webhook creates account/subscription/phone (pending)
8. Parallel: SMS sent: "CurbCue here! Reply YES to start getting alerts."
9. Dashboard shows "Confirm your phone" banner
10. User replies YES via SMS
11. Twilio webhook updates phone to confirmed
12. Dashboard banner disappears
13. Confirmation SMS: "You're all set! We'll text you the evening before ASP suspensions. 🚗"

## SMS Messages

### Templates

**Opt-in request (after checkout):**
> CurbCue here! Reply YES to start getting alerts. STOP to cancel, HELP for help.

**Confirmation (after YES):**
> You're all set! We'll text you the evening before ASP suspensions. 🚗

**Reminder (6pm night before):**
> Hey! Tomorrow's Christmas — ASP is OFF. Sleep in, your car's fine. 🎄

(Dynamic: holiday name, contextual emoji)

**Monthly recap (1st of month):**
> CurbCue January recap: 4 suspension days (MLK Day, snow emergencies). February has Presidents Day coming up. 🚗

**HELP response:**
> CurbCue: NYC parking alerts. Reply MANAGE for settings, STOP to cancel. Questions? support@curbcue.com

**STOP confirmation:**
> You've been unsubscribed from CurbCue. Reply START to resubscribe anytime.

**MANAGE response:**
> Manage your CurbCue settings: https://curbcue.com/m/abc123 (link expires in 15 min)

### Timing

- Default: 6:00 PM local time (America/New_York)
- User-configurable: 5pm–9pm in 30-min increments
- Sent night before suspension

### Communication Cadence

- **Reminders:** Only when suspension tomorrow
- **Monthly recap:** 1st of each month
- **Silence otherwise:** No weekly "all clear" messages

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/checkout/create` | POST | Create Stripe Checkout session |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |
| `/api/webhooks/twilio/inbound` | POST | Incoming SMS handler |
| `/api/webhooks/twilio/status` | POST | Delivery status updates |
| `/api/manage/update` | POST | Save preferences (token auth) |
| `/api/stripe/portal` | POST | Create Stripe portal session |
| `/api/jobs/refresh-calendars` | GET | Cron: ICS ingestion |
| `/api/jobs/send-reminders` | GET | Cron: send alerts |
| `/api/jobs/send-monthly-recap` | GET | Cron: monthly summary |

## Cron Jobs

| Schedule | Endpoint | Purpose |
|----------|----------|---------|
| `0 2 * * *` | `/api/jobs/refresh-calendars` | 2am ET daily — fetch/parse ICS |
| `0 18 * * *` | `/api/jobs/send-reminders` | 6pm ET daily — send alerts |
| `0 10 1 * *` | `/api/jobs/send-monthly-recap` | 10am ET, 1st of month |

## Backend Architecture

### Calendar Ingestion

- Fetch NYC DOT ICS file nightly (use ETag/If-Modified-Since)
- Parse VEVENTs, expand multi-day events (DTEND exclusive)
- Upsert into `suspension_events` table
- On failure: keep existing data, log error

### Reminder Logic

1. Get current date in America/New_York
2. Calculate tomorrow
3. Check if suspension exists for tomorrow
4. Query eligible subscribers: active subscription + confirmed phone + city enabled
5. INSERT into `message_outbox` (unique constraint prevents dupes)
6. Send via Twilio, update status

### Compliance

- **Double opt-in:** Phone starts pending, confirmed only after YES
- **Consent logged:** timestamp, source, IP if available
- **STOP:** Honored immediately, no further messages
- **HELP:** Always responds with support info
- **Message format:** Includes brand name ("CurbCue:")

### Security

- Stripe webhook: signature verification
- Twilio webhook: signature verification
- Idempotency: `webhook_events` table with unique event_id
- Manage tokens: SHA-256 hashed, 15-min expiry, single-use
- PII minimal: phone + optional email only

## MVP Scope

### Included

- NYC only (dropdown visible, signals expansion coming)
- Scheduled suspensions from ICS calendar
- Free trial + $1.99/month subscription
- SMS reminders night before suspensions
- Monthly recap messages
- Dashboard with calendar view
- Responsive: mobile + desktop equal priority

### Deferred

- Emergency/snow day alerts (architecture supports, not MVP)
- Additional cities
- Annual billing option
- Admin dashboard
- Referral codes

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Database:** Postgres (Supabase)
- **ORM:** Prisma
- **Payments:** Stripe (Checkout + Customer Portal)
- **SMS:** Twilio (Messaging Service)
- **Dates:** Luxon
- **Calendar:** node-ical
- **Deployment:** Vercel + Vercel Cron

## Data Model

See original spec for complete schema. Key tables:
- `accounts` — Stripe customer linkage
- `phones` — E.164, opt-in status, consent logging
- `subscriptions` — Stripe subscription mirror
- `cities` — Multi-city ready (NYC seed)
- `phone_city_alerts` — Per-phone city preferences
- `calendar_sources` — ICS feed configuration
- `suspension_events` — Expanded day-by-day events
- `message_outbox` — SMS log with deduplication
- `webhook_events` — Idempotency tracking
- `manage_tokens` — Secure link tokens
