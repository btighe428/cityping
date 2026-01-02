# NYCPing Platform Design

**Date:** 2026-01-01
**Status:** Approved
**Supersedes:** 2025-12-13-curbcue-mvp-design.md

---

## Executive Summary

NYCPing is a multi-module alert platform positioned as "the definitive NYC alerts platform." It expands the existing ASP parking alert system into six alert categories: Parking, Transit, Events, Housing, Food/Sample Sales, and Deals.

### Key Decisions

| Aspect | Decision |
|--------|----------|
| **Positioning** | Category ownership — "one app watches NYC so you don't have to" |
| **Launch scope** | Wide & shallow (6 modules, 1-2 sources each), architected for depth |
| **UX model** | Progressive disclosure — zip code inference, smart defaults, contextual customization |
| **Pricing** | Freemium ($0) + Premium ($7/mo) — SMS is the premium unlock |
| **Free tier** | All modules, email digest, 24-hour delay |
| **Premium tier** | All modules, instant SMS + email |
| **Ingestion** | Hybrid — cron (daily/hourly) + streaming (realtime for MTA) |
| **Client surface** | Web dashboard + SMS + Email (no native app) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Cron Jobs   │  │ Stream Poll │  │ Webhook Receivers   │  │
│  │ (daily/hrly)│  │ (60-90 sec) │  │ (push from sources) │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         └────────────────┴─────────────────────┘            │
│                          ▼                                  │
│              ┌───────────────────────┐                      │
│              │  Normalized AlertEvent │                      │
│              │  (unified schema)      │                      │
│              └───────────┬───────────┘                      │
└──────────────────────────┼──────────────────────────────────┘
                           ▼
┌──────────────────────────┼──────────────────────────────────┐
│                    MATCHING LAYER                           │
│              ┌───────────────────────┐                      │
│              │    Preference Engine   │                     │
│              │  • User prefs (explicit)│                    │
│              │  • Inferred defaults    │                    │
│              │  • Deduplication        │                    │
│              └───────────┬───────────┘                      │
│                          ▼                                  │
│              ┌───────────────────────┐                      │
│              │   Notification Queue   │                     │
│              │  • Tier routing        │                     │
│              │  • Timing (instant/delay)│                   │
│              └───────────┬───────────┘                      │
└──────────────────────────┼──────────────────────────────────┘
                           ▼
┌──────────────────────────┼──────────────────────────────────┐
│                    DELIVERY LAYER                           │
│         ┌────────────────┴────────────────┐                 │
│         ▼                                 ▼                 │
│  ┌─────────────┐                  ┌─────────────┐           │
│  │ SMS (Twilio)│                  │Email (Resend)│          │
│  │  Premium    │                  │  Free+Premium │          │
│  │  Instant    │                  │  Digest/Instant│         │
│  └─────────────┘                  └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

All scrapers normalize to a single `AlertEvent` schema. The matching layer is source-agnostic.

---

## Database Schema

### Core Entities

```prisma
// MODULES — The 6 alert categories
model Module {
  id          String   @id  // "parking", "transit", "events", "housing", "food", "deals"
  name        String        // "Parking & Driving"
  description String
  icon        String        // Emoji or icon identifier
  sortOrder   Int
  sources     AlertSource[]
  preferences UserModulePreference[]
}

// ALERT SOURCES — Individual data feeds within modules
model AlertSource {
  id            String   @id @default(cuid())
  moduleId      String
  module        Module   @relation(fields: [moduleId], references: [id])
  slug          String   @unique  // "asp-calendar", "mta-subway", "citibike-availability"
  name          String            // "Alternate Side Parking"
  frequency     SourceFrequency   // realtime, hourly, daily
  enabled       Boolean  @default(true)
  config        Json              // Source-specific config (URLs, API keys ref, etc.)
  lastPolledAt  DateTime?
  lastEventAt   DateTime?
  events        AlertEvent[]
}

enum SourceFrequency {
  realtime  // Poll every 60-90 sec
  hourly    // Cron hourly
  daily     // Cron daily
}

// ALERT EVENTS — Normalized events from all sources
model AlertEvent {
  id            String   @id @default(cuid())
  sourceId      String
  source        AlertSource @relation(fields: [sourceId], references: [id])
  externalId    String?     // Dedup key from source (e.g., MTA alert ID)
  title         String
  body          String?
  startsAt      DateTime?   // When the event/alert begins
  endsAt        DateTime?   // When it ends (nullable for point-in-time alerts)
  neighborhoods String[]    // Affected areas (for geo-matching)
  metadata      Json        // Source-specific data (subway lines, lottery income brackets, etc.)
  createdAt     DateTime @default(now())
  expiresAt     DateTime?   // When alert becomes irrelevant

  notifications NotificationOutbox[]

  @@unique([sourceId, externalId])  // Prevent duplicate ingestion
  @@index([sourceId, createdAt])
  @@index([startsAt])
}
```

### User & Preference Entities

```prisma
// USER — Extended from existing model
model User {
  id                String   @id @default(cuid())
  phone             String?  @unique  // E.164 format
  email             String   @unique
  zipCode           String              // Primary for inference
  tier              UserTier @default(free)
  stripeCustomerId  String?  @unique

  // Inferred profile (computed from zip, updated periodically)
  inferredNeighborhood  String?
  inferredSubwayLines   String[]  // Nearest lines
  inferredHasParking    Boolean @default(false)  // Based on neighborhood density

  preferences       UserModulePreference[]
  notifications     NotificationOutbox[]

  smsOptInStatus    SmsOptInStatus @default(pending)
  smsOptInAt        DateTime?
  emailOptInAt      DateTime @default(now())

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum UserTier {
  free     // Email digest, 24hr delay
  premium  // SMS + Email, instant
}

// USER MODULE PREFERENCES — Per-user, per-module settings
model UserModulePreference {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  moduleId    String
  module      Module   @relation(fields: [moduleId], references: [id])
  enabled     Boolean  @default(true)  // User can disable entire module
  settings    Json     // Module-specific prefs (subway lines, income bracket, etc.)
  isInferred  Boolean  @default(true)  // True until user explicitly customizes
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, moduleId])
}

// NOTIFICATION OUTBOX — Queued notifications
model NotificationOutbox {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  eventId      String
  event        AlertEvent @relation(fields: [eventId], references: [id])
  channel      NotificationChannel
  scheduledFor DateTime
  sentAt       DateTime?
  status       NotificationStatus @default(pending)

  @@unique([userId, eventId, channel])  // Prevent duplicate sends
  @@index([status, scheduledFor])        // For delivery job queries
}

enum NotificationChannel { sms, email }
enum NotificationStatus { pending, sent, failed, skipped }
```

### Settings JSON Examples by Module

```typescript
// Transit settings
{ subwayLines: ["G", "L", "7"], citibike: true, weekendAlerts: true }

// Housing settings
{ incomeBracket: "60-80", householdSize: 2, neighborhoods: ["bed-stuy", "crown-heights"] }

// Parking settings
{ aspAlerts: true, garageRates: false, gasAlerts: false }

// Events settings
{ types: ["free", "outdoor"], neighborhoods: ["williamsburg", "greenpoint"] }

// Food settings
{ sampleSales: true, brands: ["theory", "vince"], restaurantWeek: false }

// Deals settings
{ creditCards: true, utilities: false }
```

---

## Inference Engine

When a user signs up with only a zip code, the system infers defaults:

```typescript
// lib/inference.ts
interface InferredProfile {
  neighborhood: string;           // "Williamsburg"
  borough: string;                // "Brooklyn"
  subwayLines: string[];          // ["G", "L", "J", "M"]
  nearestStations: string[];      // ["Bedford Ave", "Lorimer St"]
  parkingRelevance: "high" | "medium" | "low";
  housingMarket: "rental" | "mixed" | "ownership";
  medianIncome: number;
}

async function inferProfileFromZip(zipCode: string): Promise<InferredProfile> {
  return ZIP_PROFILE_MAP[zipCode] ?? DEFAULT_MANHATTAN_PROFILE;
}

function generateDefaultPreferences(profile: InferredProfile): ModuleDefaults {
  return {
    parking: {
      enabled: profile.parkingRelevance !== "low",
      aspAlerts: true
    },
    transit: {
      enabled: true,
      subwayLines: profile.subwayLines.slice(0, 4)
    },
    events: {
      enabled: true,
      neighborhoods: [profile.neighborhood]
    },
    housing: {
      enabled: profile.housingMarket === "rental",
      incomeBracket: inferBracketFromMedian(profile.medianIncome)
    },
    food: { enabled: false },    // Opt-in only (too noisy as default)
    deals: { enabled: false }    // Opt-in only
  };
}
```

### Inference Data Sources (one-time build)

- NYC Planning ZipCode → NTA (Neighborhood Tabulation Area) mapping
- Census ACS 5-year estimates for income/housing tenure
- MTA GTFS static feed for station locations
- NYC Open Data for parking meter density

---

## Notification Pipeline

### Event Matching

```typescript
async function matchEventToUsers(event: AlertEvent): Promise<void> {
  const source = await db.alertSource.findUnique({
    where: { id: event.sourceId },
    include: { module: true }
  });

  const eligibleUsers = await db.userModulePreference.findMany({
    where: {
      moduleId: source.moduleId,
      enabled: true,
    },
    include: { user: true }
  });

  for (const pref of eligibleUsers) {
    if (matchesUserPreferences(event, pref)) {
      await queueNotification(pref.user, event);
    }
  }
}

function matchesUserPreferences(event: AlertEvent, pref: UserModulePreference): boolean {
  const settings = pref.settings as Record<string, any>;
  const meta = event.metadata as Record<string, any>;

  switch (event.source.module.id) {
    case "transit":
      return meta.affectedLines?.some(line => settings.subwayLines?.includes(line));
    case "housing":
      return meta.incomeBrackets?.includes(settings.incomeBracket);
    case "events":
      return event.neighborhoods.some(n => settings.neighborhoods?.includes(n));
    default:
      return true;
  }
}
```

### Tier-Aware Queuing

```typescript
async function queueNotification(user: User, event: AlertEvent): Promise<void> {
  const deliverAt = user.tier === "premium"
    ? new Date()
    : addHours(new Date(), 24);

  await db.notificationOutbox.create({
    data: {
      userId: user.id,
      eventId: event.id,
      channel: user.tier === "premium" ? "sms" : "email",
      scheduledFor: deliverAt,
      status: "pending"
    }
  });
}
```

---

## Email Digest System

Free tier users receive a daily digest at 7am ET:

```typescript
async function sendDailyDigests(): Promise<void> {
  const freeUsers = await db.user.findMany({
    where: { tier: "free", emailOptInAt: { not: null } }
  });

  for (const user of freeUsers) {
    const pendingNotifications = await db.notificationOutbox.findMany({
      where: {
        userId: user.id,
        channel: "email",
        status: "pending",
        scheduledFor: { lte: new Date() }
      },
      include: { event: { include: { source: { include: { module: true } } } } }
    });

    if (pendingNotifications.length === 0) continue;

    const byModule = groupBy(pendingNotifications, n => n.event.source.moduleId);
    await sendDigestEmail(user, byModule);

    await db.notificationOutbox.updateMany({
      where: { id: { in: pendingNotifications.map(n => n.id) } },
      data: { status: "sent", sentAt: new Date() }
    });
  }
}
```

### Digest Email Structure

```
Subject: Your NYC Alerts — Dec 15

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚇 TRANSIT (2 alerts)

G Train: Delays at Hoyt-Schermerhorn
Weekend: L train suspended Manhattan-bound

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🅿️ PARKING (1 alert)

ASP suspended tomorrow — Christmas Day
No need to move your car tonight.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 HOUSING (1 alert)

New affordable housing lottery opened
The Crossing at Jamaica — 60-80% AMI
Apply by Jan 15 → [link]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ Get alerts instantly via SMS
Premium users received these yesterday.
Upgrade for $7/mo → [link]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Module Launch Scope

### Launch Sources (Wide & Shallow)

| Module | Launch Sources | Future Depth |
|--------|---------------|--------------|
| **Parking** | ASP calendar (existing), NYC 311 status | Garage rates, Gas prices |
| **Transit** | MTA service alerts, Weekend reroutes | Citibike, Elevator outages |
| **Events** | NYC Parks calendar, Street fairs | Museum free days, Restaurant week |
| **Housing** | Housing Connect lotteries | StreetEasy, HDFC listings |
| **Food** | 260 Sample Sale, Chicmi | Restaurant week, Farmers markets |
| **Deals** | Credit card bonuses (curated) | Con Ed rates, HYSA rates |

### Source Technical Details

| Source | Format | Frequency | Status |
|--------|--------|-----------|--------|
| ASP Calendar | ICS | Daily | ✓ Built |
| NYC 311 Status | JSON API | Hourly | ✓ Built |
| MTA Alerts | GTFS-RT Protobuf | Realtime (90s) | To build |
| NYC Parks Events | RSS/Scrape | Daily | To build |
| Housing Connect | Scrape | Daily | To build |
| 260 Sample Sale | Scrape | Every 4hr | To build |
| Street Fairs | Scrape | Weekly | To build |

---

## API Endpoints

```
/api/
├── auth/
│   └── signup/                 # Email + zip → create user, infer defaults
├── checkout/
│   └── create/                 # Stripe checkout for premium upgrade
├── webhooks/
│   ├── stripe/                 # Subscription lifecycle
│   └── twilio/inbound/         # STOP, HELP, YES (existing)
├── preferences/
│   ├── modules/                # GET/PUT module enable/disable
│   └── [moduleId]/             # GET/PUT module-specific settings
├── user/
│   ├── profile/                # GET/PUT zip, email, phone
│   └── upgrade/                # Initiate premium upgrade flow
├── jobs/
│   ├── ingest/
│   │   ├── asp-calendar/       # Existing
│   │   ├── mta-alerts/         # GTFS-RT polling
│   │   ├── housing-lotteries/  # Housing Connect scrape
│   │   ├── parks-events/       # NYC Parks scrape
│   │   └── sample-sales/       # 260/Chicmi scrape
│   ├── match-events/           # Process new events → notification queue
│   ├── send-sms/               # Send queued SMS (premium)
│   └── send-daily-digest/      # Send email digests (free)
└── admin/
    ├── sources/                # Manage alert sources
    └── events/                 # Manual event creation
```

---

## Migration Strategy

Existing NYC Ping users migrate as follows:

1. **Create new schema** — Module, AlertSource, AlertEvent, User, UserModulePreference
2. **Migrate users** — Existing Phone/Account → new User model
3. **Set parking preference** — All existing users get `parking.enabled = true, isInferred = false`
4. **Generate defaults** — Infer other module preferences from zip code
5. **Set tier** — Stripe customers → premium, others → free
6. **Migrate events** — SuspensionEvent → AlertEvent with parking module source

```typescript
async function migrateToNycPing(): Promise<void> {
  await seedModules();
  await seedAlertSources();

  const existingUsers = await db.phone.findMany({
    include: { account: true, phoneCityAlerts: true }
  });

  for (const phone of existingUsers) {
    const user = await db.user.create({
      data: {
        phone: phone.e164,
        email: phone.account?.email,
        zipCode: await inferZipFromCity(phone.phoneCityAlerts[0]?.cityId),
        tier: phone.account?.stripeCustomerId ? "premium" : "free",
        stripeCustomerId: phone.account?.stripeCustomerId,
        smsOptInStatus: phone.smsOptInStatus,
        smsOptInAt: phone.smsOptInAt,
      }
    });

    // Parking = explicit (they signed up for this)
    await db.userModulePreference.create({
      data: {
        userId: user.id,
        moduleId: "parking",
        enabled: true,
        isInferred: false,
        settings: { aspAlerts: true }
      }
    });

    // Other modules = inferred defaults
    const profile = await inferProfileFromZip(user.zipCode);
    const defaults = generateDefaultPreferences(profile);

    for (const [moduleId, settings] of Object.entries(defaults)) {
      if (moduleId === "parking") continue;
      await db.userModulePreference.create({
        data: {
          userId: user.id,
          moduleId,
          enabled: settings.enabled,
          isInferred: true,
          settings
        }
      });
    }
  }

  await migrateSuspensionEvents();
}
```

---

## Pricing Implementation

### Stripe Configuration

```typescript
const PRODUCTS = {
  premium: {
    priceId: "price_nycping_premium_monthly",
    amount: 700,  // $7.00
    interval: "month"
  }
};
```

### Upgrade Flow

```typescript
async function createUpgradeCheckout(userId: string): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId } });

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{ price: PRODUCTS.premium.priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${APP_URL}/dashboard`,
    metadata: { userId }
  });

  return session.url;
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata.userId;

  await db.user.update({
    where: { id: userId },
    data: {
      tier: "premium",
      stripeCustomerId: session.customer as string
    }
  });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (user.phone && user.smsOptInStatus === "pending") {
    await sendSmsOptInMessage(user.phone);
  }
}
```

---

## Landing Page Structure

```
NYCPING — Never Miss What Matters in NYC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Hero]
One app watches NYC so you don't have to.
Parking rules • Subway delays • Housing lotteries • Sample sales • Events • Deals

Enter your zip code → [10001] [Get Started Free]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Module Grid — 6 cards]

🅿️ Parking & Driving          🚇 Transit
ASP suspensions, street        Your subway lines,
cleaning, meter rules          weekend reroutes, delays

🎭 Events & Culture            🏠 Housing & Lotteries
Free concerts, street          Affordable housing,
fairs, museum days             rent drops, HDFC

🛍️ Sample Sales               💰 Deals & Money
Fashion sample sales,          Credit card bonuses,
designer discounts             rate changes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[How It Works]

1. Enter your zip code
   We figure out your neighborhood, nearby subways, and what matters.

2. Get alerts automatically
   No setup required. Smart defaults based on where you live.

3. Customize as you go
   Too many transit alerts? One tap to adjust.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Pricing]

FREE                          PREMIUM $7/mo
All 6 alert types             All 6 alert types
Daily email digest            Instant SMS alerts
24-hour delay                 Real-time delivery

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Social Proof]
"Finally, one app instead of checking 10 different sites."

[Footer]
Terms • Privacy • Manage Alerts • About
```

---

## Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| Free signups | 5,000 |
| Premium conversions | 500 (10% conversion) |
| MRR | $3,500 |
| Email open rate | >40% |
| SMS delivery rate | >98% |
| Module adoption | Avg 3.5 modules enabled per user |

---

## Open Questions (Post-MVP)

1. **Multi-city expansion** — Schema supports it; which city next (LA, Chicago, SF)?
2. **Native app** — When does App Store presence become necessary for positioning?
3. **B2B tier** — Property managers, real estate agents, relocation services?
4. **API access** — Developers want programmatic access to alert data?
5. **Community features** — User-submitted events, tips, local knowledge?
