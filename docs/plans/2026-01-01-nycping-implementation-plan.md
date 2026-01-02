# NYCPing Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand NYC Ping from a single-purpose ASP alert system into a multi-module NYC alerts platform with freemium pricing.

**Architecture:** Three-layer system (Ingestion → Matching → Delivery) with unified AlertEvent schema. Hybrid ingestion using cron for daily/hourly sources and streaming for realtime MTA data. Freemium model with email digest (free, 24hr delay) and instant SMS (premium, $7/mo).

**Tech Stack:** Next.js 16, React 19, Prisma 6, PostgreSQL, Twilio, Stripe, Resend, Vercel Cron

---

## Phase 1: Database Schema Evolution

### Task 1.1: Create Module and AlertSource Tables

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add Module model to schema**

Add after existing models in `prisma/schema.prisma`:

```prisma
// ============================================
// NYCPING MULTI-MODULE ARCHITECTURE
// ============================================

model Module {
  id          String   @id  // "parking", "transit", "events", "housing", "food", "deals"
  name        String        // "Parking & Driving"
  description String
  icon        String        // Emoji identifier
  sortOrder   Int

  sources     AlertSource[]
  preferences UserModulePreference[]
}

model AlertSource {
  id            String          @id @default(cuid())
  moduleId      String
  module        Module          @relation(fields: [moduleId], references: [id])
  slug          String          @unique  // "asp-calendar", "mta-subway"
  name          String                   // "Alternate Side Parking"
  frequency     SourceFrequency
  enabled       Boolean         @default(true)
  config        Json            @default("{}")
  lastPolledAt  DateTime?
  lastEventAt   DateTime?

  events        AlertEvent[]
}

enum SourceFrequency {
  realtime  // Poll every 60-90 sec
  hourly    // Cron hourly
  daily     // Cron daily
}
```

**Step 2: Run Prisma format to validate syntax**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npx prisma format`
Expected: Schema formatted successfully

**Step 3: Commit schema addition**

```bash
git add prisma/schema.prisma
git commit -m "schema: add Module and AlertSource models"
```

---

### Task 1.2: Create AlertEvent Table

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add AlertEvent model**

Add after AlertSource model:

```prisma
model AlertEvent {
  id            String       @id @default(cuid())
  sourceId      String
  source        AlertSource  @relation(fields: [sourceId], references: [id])
  externalId    String?      // Dedup key from source
  title         String
  body          String?
  startsAt      DateTime?
  endsAt        DateTime?
  neighborhoods String[]     // For geo-matching
  metadata      Json         @default("{}")
  createdAt     DateTime     @default(now())
  expiresAt     DateTime?

  notifications NotificationOutbox[]

  @@unique([sourceId, externalId])
  @@index([sourceId, createdAt])
  @@index([startsAt])
}
```

**Step 2: Run Prisma format**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npx prisma format`
Expected: Schema formatted successfully

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: add AlertEvent model"
```

---

### Task 1.3: Create User Model (New Unified Model)

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add User model and UserTier enum**

Add after AlertEvent:

```prisma
enum UserTier {
  free     // Email digest, 24hr delay
  premium  // SMS + Email, instant
}

model User {
  id                    String    @id @default(cuid())
  phone                 String?   @unique  // E.164 format
  email                 String    @unique
  zipCode               String
  tier                  UserTier  @default(free)
  stripeCustomerId      String?   @unique

  // Inferred profile
  inferredNeighborhood  String?
  inferredSubwayLines   String[]
  inferredHasParking    Boolean   @default(false)

  smsOptInStatus        SmsOptInStatus @default(pending)
  smsOptInAt            DateTime?
  emailOptInAt          DateTime  @default(now())

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  preferences           UserModulePreference[]
  notifications         NotificationOutbox[]
}
```

**Step 2: Run Prisma format**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npx prisma format`
Expected: Schema formatted successfully

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: add User model with tier and inferred profile"
```

---

### Task 1.4: Create UserModulePreference Table

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add UserModulePreference model**

Add after User model:

```prisma
model UserModulePreference {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  moduleId    String
  module      Module   @relation(fields: [moduleId], references: [id])
  enabled     Boolean  @default(true)
  settings    Json     @default("{}")
  isInferred  Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, moduleId])
}
```

**Step 2: Run Prisma format**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npx prisma format`
Expected: Schema formatted successfully

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: add UserModulePreference model"
```

---

### Task 1.5: Create NotificationOutbox Table

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add NotificationOutbox model and enums**

Add after UserModulePreference:

```prisma
enum NotificationChannel {
  sms
  email
}

enum NotificationStatus {
  pending
  sent
  failed
  skipped
}

model NotificationOutbox {
  id           String              @id @default(cuid())
  userId       String
  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  eventId      String
  event        AlertEvent          @relation(fields: [eventId], references: [id], onDelete: Cascade)
  channel      NotificationChannel
  scheduledFor DateTime
  sentAt       DateTime?
  status       NotificationStatus  @default(pending)

  @@unique([userId, eventId, channel])
  @@index([status, scheduledFor])
}
```

**Step 2: Run Prisma format**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npx prisma format`
Expected: Schema formatted successfully

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: add NotificationOutbox model"
```

---

### Task 1.6: Generate and Apply Migration

**Files:**
- Create: `prisma/migrations/YYYYMMDDHHMMSS_nycping_multi_module/migration.sql`

**Step 1: Generate migration**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npx prisma migrate dev --name nycping_multi_module`
Expected: Migration created and applied successfully

**Step 2: Verify migration applied**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npx prisma migrate status`
Expected: All migrations applied

**Step 3: Commit migration**

```bash
git add prisma/migrations/
git commit -m "migration: add nycping multi-module tables"
```

---

## Phase 2: Seed Data

### Task 2.1: Create Module Seed Data

**Files:**
- Create: `prisma/seeds/modules.ts`

**Step 1: Create modules seed file**

```typescript
// prisma/seeds/modules.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULES = [
  {
    id: "parking",
    name: "Parking & Driving",
    description: "ASP suspensions, street cleaning, meter rules",
    icon: "🅿️",
    sortOrder: 1,
  },
  {
    id: "transit",
    name: "Transit",
    description: "Subway alerts, weekend reroutes, delays",
    icon: "🚇",
    sortOrder: 2,
  },
  {
    id: "events",
    name: "Events & Culture",
    description: "Free concerts, street fairs, museum days",
    icon: "🎭",
    sortOrder: 3,
  },
  {
    id: "housing",
    name: "Housing & Lotteries",
    description: "Affordable housing lotteries, rent drops",
    icon: "🏠",
    sortOrder: 4,
  },
  {
    id: "food",
    name: "Sample Sales",
    description: "Fashion sample sales, designer discounts",
    icon: "🛍️",
    sortOrder: 5,
  },
  {
    id: "deals",
    name: "Deals & Money",
    description: "Credit card bonuses, rate changes",
    icon: "💰",
    sortOrder: 6,
  },
] as const;

export async function seedModules() {
  for (const module of MODULES) {
    await prisma.module.upsert({
      where: { id: module.id },
      update: module,
      create: module,
    });
  }
  console.log(`Seeded ${MODULES.length} modules`);
}
```

**Step 2: Commit seed file**

```bash
git add prisma/seeds/modules.ts
git commit -m "seed: add module definitions"
```

---

### Task 2.2: Create AlertSource Seed Data

**Files:**
- Create: `prisma/seeds/sources.ts`

**Step 1: Create sources seed file**

```typescript
// prisma/seeds/sources.ts
import { PrismaClient, SourceFrequency } from "@prisma/client";

const prisma = new PrismaClient();

export const ALERT_SOURCES = [
  // Parking module
  {
    slug: "asp-calendar",
    moduleId: "parking",
    name: "Alternate Side Parking",
    frequency: SourceFrequency.daily,
    config: {
      icsUrl: "https://www.nyc.gov/assets/dca/downloads/pdf/consumers/ASP-Schedule.ics",
    },
  },
  {
    slug: "nyc-311-status",
    moduleId: "parking",
    name: "NYC 311 City Status",
    frequency: SourceFrequency.hourly,
    config: {
      apiUrl: "https://api.nyc.gov/calendar",
    },
  },
  // Transit module
  {
    slug: "mta-subway-alerts",
    moduleId: "transit",
    name: "MTA Subway Alerts",
    frequency: SourceFrequency.realtime,
    config: {
      gtfsRtUrl: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts",
    },
  },
  {
    slug: "mta-weekend-service",
    moduleId: "transit",
    name: "Weekend Service Changes",
    frequency: SourceFrequency.daily,
    config: {
      scrapeUrl: "https://new.mta.info/planned-service-changes",
    },
  },
  // Events module
  {
    slug: "nyc-parks-events",
    moduleId: "events",
    name: "NYC Parks Events",
    frequency: SourceFrequency.daily,
    config: {
      apiUrl: "https://www.nycgovparks.org/events/",
    },
  },
  {
    slug: "street-fairs",
    moduleId: "events",
    name: "Street Fairs",
    frequency: SourceFrequency.daily,
    config: {
      scrapeUrl: "https://www.nyc.gov/site/cecm/permitting/street-activity-permit-office.page",
    },
  },
  // Housing module
  {
    slug: "housing-connect-lotteries",
    moduleId: "housing",
    name: "Housing Connect Lotteries",
    frequency: SourceFrequency.daily,
    config: {
      scrapeUrl: "https://housingconnect.nyc.gov/PublicWeb/search-lotteries",
    },
  },
  // Food/Sample Sales module
  {
    slug: "260-sample-sale",
    moduleId: "food",
    name: "260 Sample Sale",
    frequency: SourceFrequency.hourly,
    config: {
      scrapeUrl: "https://260samplesale.com/",
    },
  },
  {
    slug: "chicmi-sample-sales",
    moduleId: "food",
    name: "Chicmi Sample Sales",
    frequency: SourceFrequency.hourly,
    config: {
      scrapeUrl: "https://www.chicmi.com/new-york/",
    },
  },
  // Deals module
  {
    slug: "credit-card-bonuses",
    moduleId: "deals",
    name: "Credit Card Bonuses",
    frequency: SourceFrequency.daily,
    config: {
      manual: true, // Curated manually
    },
  },
] as const;

export async function seedAlertSources() {
  for (const source of ALERT_SOURCES) {
    await prisma.alertSource.upsert({
      where: { slug: source.slug },
      update: {
        name: source.name,
        frequency: source.frequency,
        config: source.config,
      },
      create: {
        slug: source.slug,
        moduleId: source.moduleId,
        name: source.name,
        frequency: source.frequency,
        config: source.config,
      },
    });
  }
  console.log(`Seeded ${ALERT_SOURCES.length} alert sources`);
}
```

**Step 2: Commit seed file**

```bash
git add prisma/seeds/sources.ts
git commit -m "seed: add alert source definitions"
```

---

### Task 2.3: Create Zip Code Inference Data

**Files:**
- Create: `prisma/seeds/zip-profiles.ts`

**Step 1: Create zip profile seed file with NYC zip codes**

```typescript
// prisma/seeds/zip-profiles.ts

export interface ZipProfile {
  zipCode: string;
  neighborhood: string;
  borough: string;
  subwayLines: string[];
  parkingRelevance: "high" | "medium" | "low";
  housingMarket: "rental" | "mixed" | "ownership";
  medianIncome: number;
}

// Partial dataset - expand as needed
export const ZIP_PROFILES: Record<string, ZipProfile> = {
  // Brooklyn
  "11201": {
    zipCode: "11201",
    neighborhood: "Brooklyn Heights",
    borough: "Brooklyn",
    subwayLines: ["2", "3", "4", "5", "A", "C", "F", "R"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 120000,
  },
  "11211": {
    zipCode: "11211",
    neighborhood: "Williamsburg",
    borough: "Brooklyn",
    subwayLines: ["G", "L", "J", "M"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 75000,
  },
  "11215": {
    zipCode: "11215",
    neighborhood: "Park Slope",
    borough: "Brooklyn",
    subwayLines: ["F", "G", "R", "D", "N"],
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 130000,
  },
  "11238": {
    zipCode: "11238",
    neighborhood: "Prospect Heights",
    borough: "Brooklyn",
    subwayLines: ["2", "3", "4", "B", "Q", "S"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 85000,
  },
  "11216": {
    zipCode: "11216",
    neighborhood: "Bedford-Stuyvesant",
    borough: "Brooklyn",
    subwayLines: ["A", "C", "G"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 55000,
  },
  "11221": {
    zipCode: "11221",
    neighborhood: "Bushwick",
    borough: "Brooklyn",
    subwayLines: ["J", "M", "Z", "L"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 45000,
  },
  // Manhattan
  "10001": {
    zipCode: "10001",
    neighborhood: "Chelsea",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "A", "C", "E", "F", "M"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 95000,
  },
  "10003": {
    zipCode: "10003",
    neighborhood: "East Village",
    borough: "Manhattan",
    subwayLines: ["4", "5", "6", "L", "N", "Q", "R", "W"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 85000,
  },
  "10011": {
    zipCode: "10011",
    neighborhood: "West Village",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "A", "C", "E", "F", "M", "L"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 110000,
  },
  "10019": {
    zipCode: "10019",
    neighborhood: "Midtown West",
    borough: "Manhattan",
    subwayLines: ["1", "A", "B", "C", "D", "N", "Q", "R", "W"],
    parkingRelevance: "low",
    housingMarket: "rental",
    medianIncome: 90000,
  },
  "10025": {
    zipCode: "10025",
    neighborhood: "Upper West Side",
    borough: "Manhattan",
    subwayLines: ["1", "2", "3", "B", "C"],
    parkingRelevance: "medium",
    housingMarket: "mixed",
    medianIncome: 105000,
  },
  "10029": {
    zipCode: "10029",
    neighborhood: "East Harlem",
    borough: "Manhattan",
    subwayLines: ["4", "5", "6"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 35000,
  },
  // Queens
  "11101": {
    zipCode: "11101",
    neighborhood: "Long Island City",
    borough: "Queens",
    subwayLines: ["7", "E", "M", "G"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 75000,
  },
  "11106": {
    zipCode: "11106",
    neighborhood: "Astoria",
    borough: "Queens",
    subwayLines: ["N", "W"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 65000,
  },
  "11375": {
    zipCode: "11375",
    neighborhood: "Forest Hills",
    borough: "Queens",
    subwayLines: ["E", "F", "M", "R"],
    parkingRelevance: "high",
    housingMarket: "ownership",
    medianIncome: 85000,
  },
  // Bronx
  "10451": {
    zipCode: "10451",
    neighborhood: "South Bronx",
    borough: "Bronx",
    subwayLines: ["2", "4", "5", "B", "D"],
    parkingRelevance: "medium",
    housingMarket: "rental",
    medianIncome: 25000,
  },
  "10463": {
    zipCode: "10463",
    neighborhood: "Kingsbridge",
    borough: "Bronx",
    subwayLines: ["1"],
    parkingRelevance: "high",
    housingMarket: "rental",
    medianIncome: 45000,
  },
  // Staten Island
  "10301": {
    zipCode: "10301",
    neighborhood: "St. George",
    borough: "Staten Island",
    subwayLines: [], // No subway, ferry access
    parkingRelevance: "high",
    housingMarket: "mixed",
    medianIncome: 55000,
  },
};

export const DEFAULT_PROFILE: ZipProfile = {
  zipCode: "10001",
  neighborhood: "Manhattan",
  borough: "Manhattan",
  subwayLines: ["1", "2", "3"],
  parkingRelevance: "low",
  housingMarket: "rental",
  medianIncome: 75000,
};
```

**Step 2: Commit seed file**

```bash
git add prisma/seeds/zip-profiles.ts
git commit -m "seed: add NYC zip code profile data"
```

---

### Task 2.4: Create Master Seed Script

**Files:**
- Create: `prisma/seeds/index.ts`
- Modify: `package.json` (add seed script)

**Step 1: Create master seed file**

```typescript
// prisma/seeds/index.ts
import { PrismaClient } from "@prisma/client";
import { seedModules } from "./modules";
import { seedAlertSources } from "./sources";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  await seedModules();
  await seedAlertSources();

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 2: Add seed script to package.json**

Add to scripts section:

```json
"db:seed:modules": "npx tsx prisma/seeds/index.ts"
```

**Step 3: Run the seed**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npm run db:seed:modules`
Expected: "Seeded 6 modules" and "Seeded 10 alert sources"

**Step 4: Commit**

```bash
git add prisma/seeds/index.ts package.json
git commit -m "seed: add master seed script for modules and sources"
```

---

## Phase 3: Inference Engine

### Task 3.1: Create Inference Library

**Files:**
- Create: `src/lib/inference.ts`

**Step 1: Write the inference test**

```typescript
// src/lib/__tests__/inference.test.ts
import { inferProfileFromZip, generateDefaultPreferences } from "../inference";

describe("inferProfileFromZip", () => {
  it("returns profile for known NYC zip code", () => {
    const profile = inferProfileFromZip("11211");
    expect(profile.neighborhood).toBe("Williamsburg");
    expect(profile.borough).toBe("Brooklyn");
    expect(profile.subwayLines).toContain("G");
    expect(profile.subwayLines).toContain("L");
  });

  it("returns default profile for unknown zip code", () => {
    const profile = inferProfileFromZip("90210");
    expect(profile.neighborhood).toBe("Manhattan");
  });
});

describe("generateDefaultPreferences", () => {
  it("enables parking for high parking relevance areas", () => {
    const profile = inferProfileFromZip("11211"); // Williamsburg - high parking
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.parking.enabled).toBe(true);
  });

  it("disables parking for low parking relevance areas", () => {
    const profile = inferProfileFromZip("10001"); // Chelsea - low parking
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.parking.enabled).toBe(false);
  });

  it("enables housing for rental markets", () => {
    const profile = inferProfileFromZip("11211");
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.housing.enabled).toBe(true);
  });

  it("limits subway lines to top 4 nearest", () => {
    const profile = inferProfileFromZip("10001"); // Has many lines
    const prefs = generateDefaultPreferences(profile);
    expect(prefs.transit.settings.subwayLines.length).toBeLessThanOrEqual(4);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npm test -- src/lib/__tests__/inference.test.ts`
Expected: FAIL - module not found

**Step 3: Write the inference implementation**

```typescript
// src/lib/inference.ts
import { ZIP_PROFILES, DEFAULT_PROFILE, ZipProfile } from "../../prisma/seeds/zip-profiles";

export interface ModulePreference {
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface DefaultPreferences {
  parking: ModulePreference;
  transit: ModulePreference;
  events: ModulePreference;
  housing: ModulePreference;
  food: ModulePreference;
  deals: ModulePreference;
}

export function inferProfileFromZip(zipCode: string): ZipProfile {
  return ZIP_PROFILES[zipCode] ?? DEFAULT_PROFILE;
}

function inferIncomeBracket(medianIncome: number): string {
  if (medianIncome < 40000) return "0-30";
  if (medianIncome < 60000) return "30-50";
  if (medianIncome < 80000) return "50-80";
  if (medianIncome < 100000) return "80-100";
  return "100+";
}

export function generateDefaultPreferences(profile: ZipProfile): DefaultPreferences {
  return {
    parking: {
      enabled: profile.parkingRelevance !== "low",
      settings: {
        aspAlerts: true,
        garageRates: false,
        gasAlerts: false,
      },
    },
    transit: {
      enabled: true,
      settings: {
        subwayLines: profile.subwayLines.slice(0, 4),
        citibike: false,
        weekendAlerts: true,
      },
    },
    events: {
      enabled: true,
      settings: {
        types: ["free", "outdoor"],
        neighborhoods: [profile.neighborhood.toLowerCase().replace(/\s+/g, "-")],
      },
    },
    housing: {
      enabled: profile.housingMarket === "rental",
      settings: {
        incomeBracket: inferIncomeBracket(profile.medianIncome),
        householdSize: 1,
        neighborhoods: [profile.neighborhood.toLowerCase().replace(/\s+/g, "-")],
      },
    },
    food: {
      enabled: false, // Opt-in only - too noisy as default
      settings: {
        sampleSales: true,
        brands: [],
        restaurantWeek: false,
      },
    },
    deals: {
      enabled: false, // Opt-in only
      settings: {
        creditCards: false,
        utilities: false,
      },
    },
  };
}

export async function createUserWithInferredPreferences(
  db: typeof import("./db").db,
  userData: {
    email: string;
    zipCode: string;
    phone?: string;
  }
) {
  const profile = inferProfileFromZip(userData.zipCode);
  const defaults = generateDefaultPreferences(profile);

  const user = await db.user.create({
    data: {
      email: userData.email,
      phone: userData.phone,
      zipCode: userData.zipCode,
      tier: "free",
      inferredNeighborhood: profile.neighborhood,
      inferredSubwayLines: profile.subwayLines,
      inferredHasParking: profile.parkingRelevance !== "low",
    },
  });

  // Create preferences for each module
  for (const [moduleId, pref] of Object.entries(defaults)) {
    await db.userModulePreference.create({
      data: {
        userId: user.id,
        moduleId,
        enabled: pref.enabled,
        settings: pref.settings,
        isInferred: true,
      },
    });
  }

  return user;
}
```

**Step 4: Run test to verify it passes**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npm test -- src/lib/__tests__/inference.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/inference.ts src/lib/__tests__/inference.test.ts
git commit -m "feat: add zip code inference engine"
```

---

## Phase 4: User Migration

### Task 4.1: Create Migration Script for Existing Users

**Files:**
- Create: `scripts/migrate-users-to-nycping.ts`

**Step 1: Create migration script**

```typescript
// scripts/migrate-users-to-nycping.ts
import { PrismaClient } from "@prisma/client";
import { inferProfileFromZip, generateDefaultPreferences } from "../src/lib/inference";

const prisma = new PrismaClient();

// Map old city IDs to zip codes (expand as needed)
const CITY_TO_ZIP: Record<string, string> = {
  nyc: "10001", // Default Manhattan zip
};

async function migrateUsers() {
  console.log("🔄 Starting user migration...");

  // Get existing Phone records with their accounts
  const existingPhones = await prisma.phone.findMany({
    include: {
      account: true,
      phoneCityAlerts: true,
    },
  });

  console.log(`Found ${existingPhones.length} existing phone records`);

  let migrated = 0;
  let skipped = 0;

  for (const phone of existingPhones) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: phone.e164 },
    });

    if (existingUser) {
      console.log(`  Skipping ${phone.e164} - already migrated`);
      skipped++;
      continue;
    }

    // Determine zip code from city
    const cityId = phone.phoneCityAlerts[0]?.cityId ?? "nyc";
    const zipCode = CITY_TO_ZIP[cityId] ?? "10001";

    // Get inferred profile
    const profile = inferProfileFromZip(zipCode);
    const defaults = generateDefaultPreferences(profile);

    // Create new User
    const user = await prisma.user.create({
      data: {
        phone: phone.e164,
        email: phone.account?.email ?? `${phone.e164.replace("+", "")}@placeholder.nycping.com`,
        zipCode,
        tier: phone.account?.stripeCustomerId ? "premium" : "free",
        stripeCustomerId: phone.account?.stripeCustomerId,
        inferredNeighborhood: profile.neighborhood,
        inferredSubwayLines: profile.subwayLines,
        inferredHasParking: profile.parkingRelevance !== "low",
        smsOptInStatus: phone.smsOptInStatus,
        smsOptInAt: phone.smsOptInAt,
      },
    });

    // Create parking preference (explicit - they signed up for this)
    await prisma.userModulePreference.create({
      data: {
        userId: user.id,
        moduleId: "parking",
        enabled: true,
        isInferred: false, // Explicit - they were ASP users
        settings: { aspAlerts: true, garageRates: false, gasAlerts: false },
      },
    });

    // Create inferred preferences for other modules
    for (const [moduleId, pref] of Object.entries(defaults)) {
      if (moduleId === "parking") continue; // Already created

      await prisma.userModulePreference.create({
        data: {
          userId: user.id,
          moduleId,
          enabled: pref.enabled,
          settings: pref.settings,
          isInferred: true,
        },
      });
    }

    console.log(`  ✅ Migrated ${phone.e164} → ${user.id}`);
    migrated++;
  }

  console.log(`\n📊 Migration complete: ${migrated} migrated, ${skipped} skipped`);
}

migrateUsers()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 2: Add migration script to package.json**

Add to scripts:

```json
"migrate:users": "npx tsx scripts/migrate-users-to-nycping.ts"
```

**Step 3: Commit (DO NOT RUN YET - test in staging first)**

```bash
git add scripts/migrate-users-to-nycping.ts package.json
git commit -m "feat: add user migration script for nycping transition"
```

---

## Phase 5: Preference System APIs

### Task 5.1: Create Module List API

**Files:**
- Create: `src/app/api/modules/route.ts`

**Step 1: Create modules API endpoint**

```typescript
// src/app/api/modules/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const modules = await db.module.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      sources: {
        where: { enabled: true },
        select: {
          slug: true,
          name: true,
          frequency: true,
        },
      },
    },
  });

  return NextResponse.json({ modules });
}
```

**Step 2: Commit**

```bash
git add src/app/api/modules/route.ts
git commit -m "api: add GET /api/modules endpoint"
```

---

### Task 5.2: Create User Preferences API

**Files:**
- Create: `src/app/api/preferences/route.ts`
- Create: `src/app/api/preferences/[moduleId]/route.ts`

**Step 1: Create preferences list endpoint**

```typescript
// src/app/api/preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await db.userModulePreference.findMany({
    where: { userId: user.id },
    include: {
      module: {
        select: {
          id: true,
          name: true,
          icon: true,
          description: true,
        },
      },
    },
  });

  return NextResponse.json({ preferences });
}
```

**Step 2: Create single module preference endpoint**

```typescript
// src/app/api/preferences/[moduleId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preference = await db.userModulePreference.findUnique({
    where: {
      userId_moduleId: {
        userId: user.id,
        moduleId: params.moduleId,
      },
    },
    include: {
      module: {
        include: {
          sources: {
            where: { enabled: true },
          },
        },
      },
    },
  });

  if (!preference) {
    return NextResponse.json({ error: "Preference not found" }, { status: 404 });
  }

  return NextResponse.json({ preference });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { enabled, settings } = body;

  const preference = await db.userModulePreference.update({
    where: {
      userId_moduleId: {
        userId: user.id,
        moduleId: params.moduleId,
      },
    },
    data: {
      enabled: enabled ?? undefined,
      settings: settings ?? undefined,
      isInferred: false, // User explicitly customized
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ preference });
}
```

**Step 3: Commit**

```bash
git add src/app/api/preferences/
git commit -m "api: add user preferences endpoints"
```

---

## Phase 6: Notification Pipeline

### Task 6.1: Create Event Matching Engine

**Files:**
- Create: `src/lib/matching.ts`

**Step 1: Write the matching test**

```typescript
// src/lib/__tests__/matching.test.ts
import { matchesUserPreferences } from "../matching";

describe("matchesUserPreferences", () => {
  it("matches transit event when user has affected subway line", () => {
    const event = {
      source: { module: { id: "transit" } },
      metadata: { affectedLines: ["G", "L"] },
    };
    const preference = {
      settings: { subwayLines: ["G", "7"] },
    };
    expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
  });

  it("does not match transit event when user lacks affected lines", () => {
    const event = {
      source: { module: { id: "transit" } },
      metadata: { affectedLines: ["G", "L"] },
    };
    const preference = {
      settings: { subwayLines: ["7", "N"] },
    };
    expect(matchesUserPreferences(event as any, preference as any)).toBe(false);
  });

  it("matches housing event when income bracket matches", () => {
    const event = {
      source: { module: { id: "housing" } },
      metadata: { incomeBrackets: ["50-80", "80-100"] },
    };
    const preference = {
      settings: { incomeBracket: "50-80" },
    };
    expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
  });

  it("matches parking events for all users with module enabled", () => {
    const event = {
      source: { module: { id: "parking" } },
      metadata: {},
    };
    const preference = {
      settings: { aspAlerts: true },
    };
    expect(matchesUserPreferences(event as any, preference as any)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npm test -- src/lib/__tests__/matching.test.ts`
Expected: FAIL - module not found

**Step 3: Write the matching implementation**

```typescript
// src/lib/matching.ts
import { AlertEvent, UserModulePreference, AlertSource, Module } from "@prisma/client";
import { db } from "./db";
import { addHours } from "date-fns";

type EventWithSource = AlertEvent & {
  source: AlertSource & { module: Module };
};

type PreferenceWithUser = UserModulePreference & {
  user: { id: string; tier: string };
};

export function matchesUserPreferences(
  event: EventWithSource,
  preference: PreferenceWithUser
): boolean {
  const settings = preference.settings as Record<string, unknown>;
  const meta = event.metadata as Record<string, unknown>;
  const moduleId = event.source.module.id;

  switch (moduleId) {
    case "transit": {
      const userLines = (settings.subwayLines as string[]) ?? [];
      const affectedLines = (meta.affectedLines as string[]) ?? [];
      return affectedLines.some((line) => userLines.includes(line));
    }

    case "housing": {
      const userBracket = settings.incomeBracket as string;
      const eventBrackets = (meta.incomeBrackets as string[]) ?? [];
      return eventBrackets.includes(userBracket);
    }

    case "events": {
      const userNeighborhoods = (settings.neighborhoods as string[]) ?? [];
      return event.neighborhoods.some((n) => userNeighborhoods.includes(n));
    }

    case "food": {
      // Sample sales: check if user wants this type
      if (!settings.sampleSales) return false;
      const userBrands = (settings.brands as string[]) ?? [];
      const eventBrands = (meta.brands as string[]) ?? [];
      // If user has no brand preferences, match all; otherwise filter
      if (userBrands.length === 0) return true;
      return eventBrands.some((b) => userBrands.includes(b.toLowerCase()));
    }

    // For parking and deals, if module is enabled, user gets all alerts
    default:
      return true;
  }
}

export async function matchEventToUsers(event: EventWithSource): Promise<void> {
  // Find users with this module enabled
  const eligiblePreferences = await db.userModulePreference.findMany({
    where: {
      moduleId: event.source.moduleId,
      enabled: true,
    },
    include: {
      user: {
        select: { id: true, tier: true },
      },
    },
  });

  for (const pref of eligiblePreferences) {
    if (!matchesUserPreferences(event, pref)) {
      continue;
    }

    await queueNotification(pref.user, event);
  }
}

async function queueNotification(
  user: { id: string; tier: string },
  event: AlertEvent
): Promise<void> {
  const isPremium = user.tier === "premium";
  const deliverAt = isPremium ? new Date() : addHours(new Date(), 24);

  // Insert with conflict handling (idempotent)
  await db.notificationOutbox.upsert({
    where: {
      userId_eventId_channel: {
        userId: user.id,
        eventId: event.id,
        channel: isPremium ? "sms" : "email",
      },
    },
    create: {
      userId: user.id,
      eventId: event.id,
      channel: isPremium ? "sms" : "email",
      scheduledFor: deliverAt,
      status: "pending",
    },
    update: {}, // No update if exists - idempotent
  });
}
```

**Step 4: Run test to verify it passes**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npm test -- src/lib/__tests__/matching.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/matching.ts src/lib/__tests__/matching.test.ts
git commit -m "feat: add event matching engine with preference filtering"
```

---

### Task 6.2: Create SMS Delivery Job

**Files:**
- Create: `src/app/api/jobs/send-notifications/route.ts`

**Step 1: Create notification sender job**

```typescript
// src/app/api/jobs/send-notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  // Verify cron secret
  const headersList = headers();
  const cronSecret = headersList.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Get pending SMS notifications ready to send
  const pendingNotifications = await db.notificationOutbox.findMany({
    where: {
      channel: "sms",
      status: "pending",
      scheduledFor: { lte: now },
    },
    include: {
      user: true,
      event: {
        include: {
          source: {
            include: { module: true },
          },
        },
      },
    },
    take: 100, // Process in batches
  });

  let sent = 0;
  let failed = 0;

  for (const notification of pendingNotifications) {
    if (!notification.user.phone) {
      await db.notificationOutbox.update({
        where: { id: notification.id },
        data: { status: "skipped" },
      });
      continue;
    }

    try {
      const message = formatSmsMessage(notification.event);
      await sendSms(notification.user.phone, message);

      await db.notificationOutbox.update({
        where: { id: notification.id },
        data: { status: "sent", sentAt: new Date() },
      });
      sent++;
    } catch (error) {
      console.error(`Failed to send to ${notification.user.phone}:`, error);
      await db.notificationOutbox.update({
        where: { id: notification.id },
        data: { status: "failed" },
      });
      failed++;
    }
  }

  return NextResponse.json({
    processed: pendingNotifications.length,
    sent,
    failed,
  });
}

function formatSmsMessage(event: {
  title: string;
  body?: string | null;
  source: { module: { icon: string; name: string } };
}): string {
  const icon = event.source.module.icon;
  const lines = [`${icon} ${event.title}`];
  if (event.body) {
    lines.push(event.body);
  }
  lines.push("", "Reply STOP to unsubscribe");
  return lines.join("\n");
}
```

**Step 2: Add to vercel.json cron**

Add to crons array:

```json
{
  "path": "/api/jobs/send-notifications",
  "schedule": "*/5 * * * *"
}
```

**Step 3: Commit**

```bash
git add src/app/api/jobs/send-notifications/route.ts vercel.json
git commit -m "feat: add SMS notification delivery job"
```

---

### Task 6.3: Create Email Digest Job

**Files:**
- Create: `src/app/api/jobs/send-daily-digest/route.ts`
- Create: `src/lib/email-digest.ts`

**Step 1: Create digest email template**

```typescript
// src/lib/email-digest.ts
import { AlertEvent, Module } from "@prisma/client";

type EventWithModule = AlertEvent & {
  source: { module: Module };
};

type GroupedEvents = Record<string, EventWithModule[]>;

export function buildDigestHtml(
  events: GroupedEvents,
  userName?: string
): string {
  const sections = Object.entries(events)
    .map(([moduleId, moduleEvents]) => {
      const module = moduleEvents[0]?.source.module;
      if (!module) return "";

      const eventItems = moduleEvents
        .map(
          (e) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
            <strong>${e.title}</strong>
            ${e.body ? `<br><span style="color: #666;">${e.body}</span>` : ""}
          </td>
        </tr>
      `
        )
        .join("");

      return `
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 12px 0;">
            ${module.icon} ${module.name} (${moduleEvents.length})
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${eventItems}
          </table>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">
        Your NYC Alerts
      </h1>

      ${sections}

      <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #eee;">
        <p style="color: #666; font-size: 14px;">
          ⚡ <strong>Get alerts instantly via SMS</strong><br>
          Premium users received these alerts yesterday.<br>
          <a href="${process.env.APP_BASE_URL}/dashboard?upgrade=true" style="color: #0066cc;">
            Upgrade for $7/mo →
          </a>
        </p>
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <a href="${process.env.APP_BASE_URL}/preferences" style="color: #999;">Manage preferences</a> ·
        <a href="${process.env.APP_BASE_URL}/unsubscribe" style="color: #999;">Unsubscribe</a>
      </div>
    </body>
    </html>
  `;
}

export function buildDigestSubject(eventCount: number): string {
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `Your NYC Alerts — ${today} (${eventCount} new)`;
}
```

**Step 2: Create digest job endpoint**

```typescript
// src/app/api/jobs/send-daily-digest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildDigestHtml, buildDigestSubject } from "@/lib/email-digest";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const headersList = headers();
  const cronSecret = headersList.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Get free tier users
  const freeUsers = await db.user.findMany({
    where: {
      tier: "free",
      emailOptInAt: { not: null },
    },
  });

  let digests = 0;
  let skipped = 0;

  for (const user of freeUsers) {
    // Get pending email notifications for this user
    const pendingNotifications = await db.notificationOutbox.findMany({
      where: {
        userId: user.id,
        channel: "email",
        status: "pending",
        scheduledFor: { lte: now },
      },
      include: {
        event: {
          include: {
            source: {
              include: { module: true },
            },
          },
        },
      },
    });

    if (pendingNotifications.length === 0) {
      skipped++;
      continue;
    }

    // Group events by module
    const byModule: Record<string, typeof pendingNotifications[0]["event"][]> = {};
    for (const notification of pendingNotifications) {
      const moduleId = notification.event.source.moduleId;
      if (!byModule[moduleId]) {
        byModule[moduleId] = [];
      }
      byModule[moduleId].push(notification.event);
    }

    // Build and send digest
    const html = buildDigestHtml(byModule as any);
    const subject = buildDigestSubject(pendingNotifications.length);

    try {
      await sendEmail({
        to: user.email,
        subject,
        html,
      });

      // Mark all as sent
      await db.notificationOutbox.updateMany({
        where: {
          id: { in: pendingNotifications.map((n) => n.id) },
        },
        data: {
          status: "sent",
          sentAt: new Date(),
        },
      });

      digests++;
    } catch (error) {
      console.error(`Failed to send digest to ${user.email}:`, error);
    }
  }

  return NextResponse.json({
    users: freeUsers.length,
    digests,
    skipped,
  });
}
```

**Step 3: Add to vercel.json cron (7am ET = 12:00 UTC)**

Add to crons array:

```json
{
  "path": "/api/jobs/send-daily-digest",
  "schedule": "0 12 * * *"
}
```

**Step 4: Commit**

```bash
git add src/lib/email-digest.ts src/app/api/jobs/send-daily-digest/route.ts vercel.json
git commit -m "feat: add daily email digest for free tier users"
```

---

## Phase 7: Scrapers (Launch Sources)

### Task 7.1: Create MTA Subway Alerts Scraper

**Files:**
- Create: `src/app/api/jobs/ingest/mta-alerts/route.ts`
- Create: `src/lib/scrapers/mta.ts`

**Step 1: Create MTA scraper library**

```typescript
// src/lib/scrapers/mta.ts
import { db } from "../db";
import { matchEventToUsers } from "../matching";

interface MtaAlert {
  id: string;
  header: string;
  description?: string;
  affectedLines: string[];
  activePeriod?: {
    start: number;
    end?: number;
  };
}

export async function fetchMtaAlerts(): Promise<MtaAlert[]> {
  // MTA GTFS-RT Service Alerts
  // Note: In production, you'd parse the protobuf feed
  // This is a simplified JSON representation
  const response = await fetch(
    "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts.json",
    {
      headers: {
        "x-api-key": process.env.MTA_API_KEY || "",
      },
      next: { revalidate: 0 }, // No caching
    }
  );

  if (!response.ok) {
    throw new Error(`MTA API error: ${response.status}`);
  }

  const data = await response.json();

  // Transform GTFS-RT to our format
  // This is simplified - actual implementation parses protobuf
  return (data.entity || []).map((entity: any) => ({
    id: entity.id,
    header: entity.alert?.header_text?.translation?.[0]?.text || "Service Alert",
    description: entity.alert?.description_text?.translation?.[0]?.text,
    affectedLines: extractAffectedLines(entity.alert?.informed_entity || []),
    activePeriod: entity.alert?.active_period?.[0],
  }));
}

function extractAffectedLines(entities: any[]): string[] {
  const lines = new Set<string>();
  for (const entity of entities) {
    if (entity.route_id) {
      lines.add(entity.route_id);
    }
  }
  return Array.from(lines);
}

export async function ingestMtaAlerts(): Promise<{ created: number; skipped: number }> {
  const source = await db.alertSource.findUnique({
    where: { slug: "mta-subway-alerts" },
    include: { module: true },
  });

  if (!source) {
    throw new Error("MTA alert source not configured");
  }

  const alerts = await fetchMtaAlerts();
  let created = 0;
  let skipped = 0;

  for (const alert of alerts) {
    // Check if event already exists (dedup by externalId)
    const existing = await db.alertEvent.findUnique({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId: alert.id,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create new event
    const event = await db.alertEvent.create({
      data: {
        sourceId: source.id,
        externalId: alert.id,
        title: alert.header,
        body: alert.description,
        startsAt: alert.activePeriod?.start
          ? new Date(alert.activePeriod.start * 1000)
          : null,
        endsAt: alert.activePeriod?.end
          ? new Date(alert.activePeriod.end * 1000)
          : null,
        neighborhoods: [], // MTA alerts are line-based, not neighborhood-based
        metadata: {
          affectedLines: alert.affectedLines,
        },
      },
      include: {
        source: {
          include: { module: true },
        },
      },
    });

    // Match to users and queue notifications
    await matchEventToUsers(event);
    created++;
  }

  // Update source last polled time
  await db.alertSource.update({
    where: { id: source.id },
    data: { lastPolledAt: new Date() },
  });

  return { created, skipped };
}
```

**Step 2: Create MTA ingestion job endpoint**

```typescript
// src/app/api/jobs/ingest/mta-alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ingestMtaAlerts } from "@/lib/scrapers/mta";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const headersList = headers();
  const cronSecret = headersList.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestMtaAlerts();
    return NextResponse.json(result);
  } catch (error) {
    console.error("MTA ingestion error:", error);
    return NextResponse.json(
      { error: "Failed to ingest MTA alerts" },
      { status: 500 }
    );
  }
}
```

**Step 3: Add to vercel.json cron (every 2 minutes for realtime)**

Add to crons array:

```json
{
  "path": "/api/jobs/ingest/mta-alerts",
  "schedule": "*/2 * * * *"
}
```

**Step 4: Commit**

```bash
git add src/lib/scrapers/mta.ts src/app/api/jobs/ingest/mta-alerts/route.ts vercel.json
git commit -m "feat: add MTA subway alerts scraper"
```

---

### Task 7.2: Create Housing Connect Lottery Scraper

**Files:**
- Create: `src/lib/scrapers/housing-connect.ts`
- Create: `src/app/api/jobs/ingest/housing-lotteries/route.ts`

**Step 1: Create Housing Connect scraper**

```typescript
// src/lib/scrapers/housing-connect.ts
import { db } from "../db";
import { matchEventToUsers } from "../matching";
import * as cheerio from "cheerio";

interface HousingLottery {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  incomeBrackets: string[];
  applicationDeadline: Date;
  url: string;
}

export async function fetchHousingLotteries(): Promise<HousingLottery[]> {
  // Housing Connect doesn't have a public API
  // This scrapes the public lottery listings page
  const response = await fetch(
    "https://housingconnect.nyc.gov/PublicWeb/search-lotteries",
    {
      headers: {
        "User-Agent": "NYCPing Bot (+https://nycping.com)",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Housing Connect error: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const lotteries: HousingLottery[] = [];

  // Parse lottery listings from page
  $(".lottery-card").each((_, el) => {
    const $el = $(el);
    const id = $el.attr("data-lottery-id") || "";
    const name = $el.find(".lottery-name").text().trim();
    const address = $el.find(".lottery-address").text().trim();
    const neighborhood = $el.find(".lottery-neighborhood").text().trim();
    const deadline = $el.find(".lottery-deadline").text().trim();
    const brackets = $el
      .find(".income-bracket")
      .map((_, b) => $(b).text().trim())
      .get();

    if (id && name) {
      lotteries.push({
        id,
        name,
        address,
        neighborhood: neighborhood.toLowerCase().replace(/\s+/g, "-"),
        incomeBrackets: brackets,
        applicationDeadline: new Date(deadline),
        url: `https://housingconnect.nyc.gov/PublicWeb/details/${id}`,
      });
    }
  });

  return lotteries;
}

export async function ingestHousingLotteries(): Promise<{
  created: number;
  skipped: number;
}> {
  const source = await db.alertSource.findUnique({
    where: { slug: "housing-connect-lotteries" },
    include: { module: true },
  });

  if (!source) {
    throw new Error("Housing Connect source not configured");
  }

  const lotteries = await fetchHousingLotteries();
  let created = 0;
  let skipped = 0;

  for (const lottery of lotteries) {
    const existing = await db.alertEvent.findUnique({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId: lottery.id,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const event = await db.alertEvent.create({
      data: {
        sourceId: source.id,
        externalId: lottery.id,
        title: `New Housing Lottery: ${lottery.name}`,
        body: `${lottery.address}\nApply by ${lottery.applicationDeadline.toLocaleDateString()}\n${lottery.url}`,
        startsAt: new Date(), // Opens now
        endsAt: lottery.applicationDeadline,
        neighborhoods: [lottery.neighborhood],
        metadata: {
          incomeBrackets: lottery.incomeBrackets,
          address: lottery.address,
          url: lottery.url,
        },
      },
      include: {
        source: {
          include: { module: true },
        },
      },
    });

    await matchEventToUsers(event);
    created++;
  }

  await db.alertSource.update({
    where: { id: source.id },
    data: { lastPolledAt: new Date() },
  });

  return { created, skipped };
}
```

**Step 2: Create housing ingestion job endpoint**

```typescript
// src/app/api/jobs/ingest/housing-lotteries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ingestHousingLotteries } from "@/lib/scrapers/housing-connect";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const headersList = headers();
  const cronSecret = headersList.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestHousingLotteries();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Housing Connect ingestion error:", error);
    return NextResponse.json(
      { error: "Failed to ingest housing lotteries" },
      { status: 500 }
    );
  }
}
```

**Step 3: Add to vercel.json cron (daily at 3am ET = 8:00 UTC)**

Add to crons array:

```json
{
  "path": "/api/jobs/ingest/housing-lotteries",
  "schedule": "0 8 * * *"
}
```

**Step 4: Commit**

```bash
git add src/lib/scrapers/housing-connect.ts src/app/api/jobs/ingest/housing-lotteries/route.ts vercel.json
git commit -m "feat: add Housing Connect lottery scraper"
```

---

### Task 7.3: Create Sample Sales Scraper (260 Sample Sale)

**Files:**
- Create: `src/lib/scrapers/sample-sales.ts`
- Create: `src/app/api/jobs/ingest/sample-sales/route.ts`

**Step 1: Create sample sales scraper**

```typescript
// src/lib/scrapers/sample-sales.ts
import { db } from "../db";
import { matchEventToUsers } from "../matching";
import * as cheerio from "cheerio";

interface SampleSale {
  id: string;
  brand: string;
  location: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  url: string;
}

export async function fetch260SampleSales(): Promise<SampleSale[]> {
  const response = await fetch("https://260samplesale.com/", {
    headers: {
      "User-Agent": "NYCPing Bot (+https://nycping.com)",
    },
  });

  if (!response.ok) {
    throw new Error(`260 Sample Sale error: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const sales: SampleSale[] = [];

  $(".sale-listing").each((_, el) => {
    const $el = $(el);
    const brand = $el.find(".sale-brand").text().trim();
    const location = $el.find(".sale-location").text().trim();
    const dates = $el.find(".sale-dates").text().trim();
    const url = $el.find("a").attr("href") || "";
    const description = $el.find(".sale-description").text().trim();

    // Generate stable ID from brand + dates
    const id = `260-${brand.toLowerCase().replace(/\s+/g, "-")}-${dates.replace(/\s+/g, "-")}`;

    // Parse date range (e.g., "Jan 15-18, 2026")
    const { start, end } = parseDateRange(dates);

    if (brand && start) {
      sales.push({
        id,
        brand,
        location,
        startDate: start,
        endDate: end || start,
        description,
        url: url.startsWith("http") ? url : `https://260samplesale.com${url}`,
      });
    }
  });

  return sales;
}

function parseDateRange(dateStr: string): { start: Date | null; end: Date | null } {
  // Handle formats like "Jan 15-18, 2026" or "Jan 15, 2026"
  const match = dateStr.match(/([A-Za-z]+)\s+(\d+)(?:-(\d+))?,?\s*(\d{4})/);
  if (!match) return { start: null, end: null };

  const [, month, startDay, endDay, year] = match;
  const startDate = new Date(`${month} ${startDay}, ${year}`);
  const endDate = endDay ? new Date(`${month} ${endDay}, ${year}`) : null;

  return { start: startDate, end: endDate };
}

export async function ingestSampleSales(): Promise<{
  created: number;
  skipped: number;
}> {
  const source = await db.alertSource.findUnique({
    where: { slug: "260-sample-sale" },
    include: { module: true },
  });

  if (!source) {
    throw new Error("260 Sample Sale source not configured");
  }

  const sales = await fetch260SampleSales();
  let created = 0;
  let skipped = 0;

  for (const sale of sales) {
    const existing = await db.alertEvent.findUnique({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId: sale.id,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const event = await db.alertEvent.create({
      data: {
        sourceId: source.id,
        externalId: sale.id,
        title: `${sale.brand} Sample Sale`,
        body: `${sale.location}\n${sale.startDate.toLocaleDateString()} - ${sale.endDate.toLocaleDateString()}`,
        startsAt: sale.startDate,
        endsAt: sale.endDate,
        neighborhoods: ["manhattan"], // Most 260 sales are in Manhattan
        metadata: {
          brands: [sale.brand.toLowerCase()],
          location: sale.location,
          url: sale.url,
        },
      },
      include: {
        source: {
          include: { module: true },
        },
      },
    });

    await matchEventToUsers(event);
    created++;
  }

  await db.alertSource.update({
    where: { id: source.id },
    data: { lastPolledAt: new Date() },
  });

  return { created, skipped };
}
```

**Step 2: Create sample sales ingestion job endpoint**

```typescript
// src/app/api/jobs/ingest/sample-sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ingestSampleSales } from "@/lib/scrapers/sample-sales";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const headersList = headers();
  const cronSecret = headersList.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestSampleSales();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sample sales ingestion error:", error);
    return NextResponse.json(
      { error: "Failed to ingest sample sales" },
      { status: 500 }
    );
  }
}
```

**Step 3: Add to vercel.json cron (every 4 hours)**

Add to crons array:

```json
{
  "path": "/api/jobs/ingest/sample-sales",
  "schedule": "0 */4 * * *"
}
```

**Step 4: Add cheerio dependency**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npm install cheerio`

**Step 5: Commit**

```bash
git add src/lib/scrapers/sample-sales.ts src/app/api/jobs/ingest/sample-sales/route.ts vercel.json package.json package-lock.json
git commit -m "feat: add 260 Sample Sale scraper"
```

---

## Phase 8: Updated Signup Flow

### Task 8.1: Create New Signup API

**Files:**
- Create: `src/app/api/auth/signup/route.ts`

**Step 1: Create signup endpoint with inference**

```typescript
// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createUserWithInferredPreferences } from "@/lib/inference";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  zipCode: z.string().regex(/^\d{5}$/, "Invalid ZIP code"),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, zipCode, phone } = parsed.data;

  // Check if user already exists
  const existingUser = await db.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "User already exists" },
      { status: 409 }
    );
  }

  // Create user with inferred preferences
  const user = await createUserWithInferredPreferences(db, {
    email,
    zipCode,
    phone,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      tier: user.tier,
      inferredNeighborhood: user.inferredNeighborhood,
    },
    message: "Account created. Check your email for confirmation.",
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/auth/signup/route.ts
git commit -m "api: add signup endpoint with zip code inference"
```

---

### Task 8.2: Create Premium Upgrade Checkout

**Files:**
- Modify: `src/app/api/checkout/create/route.ts`

**Step 1: Read existing checkout route**

Run: `cat "/Users/btighe/Documents/Sandbox/NYC Ping/src/app/api/checkout/create/route.ts"`

**Step 2: Update checkout for new User model and $7 price**

Update the route to work with the new User model:

```typescript
// src/app/api/checkout/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getUserFromRequest } from "@/lib/auth";

const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID!; // $7/mo

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.tier === "premium") {
    return NextResponse.json(
      { error: "Already premium" },
      { status: 400 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [
      {
        price: PREMIUM_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.APP_BASE_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.APP_BASE_URL}/dashboard`,
    metadata: {
      userId: user.id,
    },
  });

  return NextResponse.json({ url: session.url });
}
```

**Step 3: Commit**

```bash
git add src/app/api/checkout/create/route.ts
git commit -m "api: update checkout for new User model and premium pricing"
```

---

## Phase 9: Dashboard Updates

### Task 9.1: Create Module Preference Cards Component

**Files:**
- Create: `src/components/ModulePreferenceCard.tsx`

**Step 1: Create the component**

```typescript
// src/components/ModulePreferenceCard.tsx
"use client";

import { useState } from "react";
import { Module, UserModulePreference } from "@prisma/client";

interface Props {
  preference: UserModulePreference & { module: Module };
  onToggle: (moduleId: string, enabled: boolean) => Promise<void>;
  onSettings: (moduleId: string) => void;
}

export function ModulePreferenceCard({ preference, onToggle, onSettings }: Props) {
  const [enabled, setEnabled] = useState(preference.enabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await onToggle(preference.moduleId, !enabled);
      setEnabled(!enabled);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border ${
        enabled ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{preference.module.icon}</span>
          <div>
            <h3 className="font-medium">{preference.module.name}</h3>
            <p className="text-sm text-gray-600">
              {preference.module.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSettings(preference.moduleId)}
            className="text-sm text-blue-600 hover:underline"
            disabled={!enabled}
          >
            Settings
          </button>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {preference.isInferred && enabled && (
        <p className="mt-2 text-xs text-gray-500">
          Auto-configured based on your zip code. Tap Settings to customize.
        </p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ModulePreferenceCard.tsx
git commit -m "ui: add ModulePreferenceCard component"
```

---

### Task 9.2: Create Preferences Dashboard Page

**Files:**
- Create: `src/app/preferences/page.tsx`

**Step 1: Create preferences page**

```typescript
// src/app/preferences/page.tsx
import { db } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ModulePreferenceCard } from "@/components/ModulePreferenceCard";
import { revalidatePath } from "next/cache";

export default async function PreferencesPage() {
  const user = await getUserFromSession();
  if (!user) {
    redirect("/login");
  }

  const preferences = await db.userModulePreference.findMany({
    where: { userId: user.id },
    include: {
      module: true,
    },
    orderBy: {
      module: { sortOrder: "asc" },
    },
  });

  async function toggleModule(moduleId: string, enabled: boolean) {
    "use server";
    await db.userModulePreference.update({
      where: {
        userId_moduleId: { userId: user.id, moduleId },
      },
      data: { enabled },
    });
    revalidatePath("/preferences");
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Your Alert Preferences</h1>
      <p className="text-gray-600 mb-6">
        Choose which types of NYC alerts you want to receive.
        {user.tier === "free" && (
          <span className="block mt-1 text-sm">
            Free tier: Daily email digest, 24-hour delay.{" "}
            <a href="/upgrade" className="text-blue-600 hover:underline">
              Upgrade for instant SMS →
            </a>
          </span>
        )}
      </p>

      <div className="space-y-4">
        {preferences.map((pref) => (
          <ModulePreferenceCard
            key={pref.moduleId}
            preference={pref}
            onToggle={toggleModule}
            onSettings={(id) => (window.location.href = `/preferences/${id}`)}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="font-medium mb-2">Your Location</h2>
        <p className="text-sm text-gray-600">
          Zip code: {user.zipCode} ({user.inferredNeighborhood})
        </p>
        <a
          href="/settings/location"
          className="text-sm text-blue-600 hover:underline"
        >
          Change location →
        </a>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/preferences/page.tsx
git commit -m "ui: add preferences dashboard page"
```

---

## Phase 10: Landing Page Updates

### Task 10.1: Update Landing Page for Multi-Module Positioning

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Read existing landing page**

Run: `head -100 "/Users/btighe/Documents/Sandbox/NYC Ping/src/app/page.tsx"`

**Step 2: Update landing page with new hero and module grid**

This is a larger change - the key updates:

1. New hero: "Never Miss What Matters in NYC"
2. Zip code input instead of phone number
3. 6-module grid showing all alert types
4. Updated pricing section (Free vs Premium $7/mo)
5. "How it works" section emphasizing progressive disclosure

**Step 3: Commit after implementation**

```bash
git add src/app/page.tsx
git commit -m "ui: update landing page for NYCPing multi-module positioning"
```

---

## Phase 11: Final Integration

### Task 11.1: Update Environment Variables

**Files:**
- Modify: `.env.example`

**Step 1: Add new environment variables**

```bash
# NYCPing additions
STRIPE_PREMIUM_PRICE_ID=price_xxx  # $7/mo premium tier
MTA_API_KEY=xxx                     # MTA GTFS-RT access
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "config: add NYCPing environment variables"
```

---

### Task 11.2: Update vercel.json with All Cron Jobs

**Files:**
- Modify: `vercel.json`

**Step 1: Consolidate all cron jobs**

```json
{
  "crons": [
    {
      "path": "/api/jobs/refresh-calendars",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/jobs/send-reminders",
      "schedule": "0 23 * * *"
    },
    {
      "path": "/api/jobs/send-notifications",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/jobs/send-daily-digest",
      "schedule": "0 12 * * *"
    },
    {
      "path": "/api/jobs/ingest/mta-alerts",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/jobs/ingest/housing-lotteries",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/jobs/ingest/sample-sales",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

**Step 2: Commit**

```bash
git add vercel.json
git commit -m "config: consolidate all NYCPing cron jobs"
```

---

### Task 11.3: Run Full Test Suite

**Step 1: Run all tests**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npm test`
Expected: All tests pass

**Step 2: Run type check**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npm run typecheck`
Expected: No type errors

**Step 3: Run build**

Run: `cd "/Users/btighe/Documents/Sandbox/NYC Ping" && npm run build`
Expected: Build succeeds

---

## Implementation Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|------------------|
| 1. Schema | 1.1-1.6 | Module, AlertSource, AlertEvent, User, UserModulePreference, NotificationOutbox |
| 2. Seeds | 2.1-2.4 | 6 modules, 10 alert sources, 20+ zip profiles |
| 3. Inference | 3.1 | Zip code → neighborhood/subway/parking inference |
| 4. Migration | 4.1 | Existing users → new model with parking + inferred prefs |
| 5. APIs | 5.1-5.2 | Module list, user preferences CRUD |
| 6. Notifications | 6.1-6.3 | Matching engine, SMS delivery, email digest |
| 7. Scrapers | 7.1-7.3 | MTA alerts, Housing Connect, Sample Sales |
| 8. Signup | 8.1-8.2 | New signup flow with inference, premium checkout |
| 9. Dashboard | 9.1-9.2 | Module preference cards, preferences page |
| 10. Landing | 10.1 | Multi-module positioning, updated copy |
| 11. Integration | 11.1-11.3 | Environment config, cron consolidation, testing |

---

## Execution Checklist

Before starting implementation:
- [ ] Create git worktree for feature branch
- [ ] Backup production database
- [ ] Set up staging environment

During implementation:
- [ ] Run tests after each task
- [ ] Commit after each task
- [ ] Document any schema changes

Before deployment:
- [ ] Run full test suite
- [ ] Test migration script in staging
- [ ] Verify all cron jobs configured
- [ ] Update Stripe with new $7 price
- [ ] Prepare rollback plan
