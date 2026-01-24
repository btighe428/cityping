# New Scrapers Design

**Date:** 2026-01-05
**Status:** Approved
**Goal:** Add 5 high-value scrapers to expand CityPing's daily digest coverage

## Overview

Expand CityPing with 5 new data sources:
1. Free Museum Days
2. NYC 311 Service Alerts
3. Air Quality / Health Alerts
4. Restaurant Week / Dining Deals
5. NYC Parks Events

## Architecture

All scrapers follow existing pattern in `src/lib/scrapers/`:

```
src/lib/scrapers/
├── museums.ts             # NEW - free museum days
├── nyc-311.ts             # NEW - service alerts
├── air-quality.ts         # NEW - AQI & health
├── dining-deals.ts        # NEW - restaurant week
└── parks-events.ts        # NEW - NYC Parks calendar
```

**Each scraper will:**
1. Export a main `fetch*()` function returning typed data
2. Use Zod schemas for validation
3. Integrate with `scraper-alerts.ts` for failure notifications
4. Have corresponding tests

**Data flow:**
```
Scraper → Zod Validation → Prisma DB → Email Digest
              ↓ (on failure)
         Admin Alert Email
```

---

## Scraper Details

### 1. Free Museum Days (`museums.ts`)

**Approach:** Config-driven (not scraped). Museum free days rarely change.

**Museums to include:**
| Museum | Free Day | Hours | Notes |
|--------|----------|-------|-------|
| MoMA | Friday | 5:30-9pm | Free admission |
| Met | Every day | All day | Pay what you wish |
| Brooklyn Museum | 1st Saturday | All day | Free |
| Bronx Zoo | Wednesday | All day | Free |
| AMNH | Every day | All day | Pay what you wish |
| Guggenheim | Saturday | 5-8pm | Pay what you wish |

**Integration:** Daily job checks "is today a free day?" and includes in digest.

---

### 2. NYC 311 Alerts (`nyc-311.ts`)

**Source:** NYC Open Data 311 Service Requests API
**Endpoint:** `https://data.cityofnewyork.us/resource/erm2-nwe9.json`

**Complaint types to track:**
- Water outage
- Street/sidewalk closure
- No heat/hot water (winter)
- Power outage
- Gas leak

**Fields:** created_date, complaint_type, descriptor, incident_address, borough, status

**Filter:** `status=Open` + high-impact complaint types only

---

### 3. Air Quality (`air-quality.ts`)

**Source:** AirNow API
**Endpoint:** `https://www.airnowapi.org/aq/forecast/zipCode/`

**Data:**
- AQI (0-500 scale)
- Category (Good/Moderate/Unhealthy)
- Pollutant (PM2.5, Ozone)
- Forecast for next day

**Trigger:** Include in digest only when AQI > 100 (Unhealthy for Sensitive Groups)

---

### 4. Restaurant Week / Dining (`dining-deals.ts`)

**Sources:**
- NYC Restaurant Week: `nycgo.com/restaurant-week` (2x/year)
- Eater NY RSS: New openings, deals
- The Infatuation NYC RSS

**Approach:**
- RSS scraping for ongoing coverage
- Special handling for Restaurant Week periods (late Jan, late July)

**Fields:** restaurant name, neighborhood, cuisine, deal details, dates

---

### 5. NYC Parks Events (`parks-events.ts`)

**Source:** NYC Parks Events Calendar
**URL:** `https://www.nycgovparks.org/events/feed`

**Categories:** Fitness, Nature, Sports, Arts, Tours

**Fields:** event_name, date, time, park_name, borough, category, is_free

**Filter:** Only free events, next 7 days

---

## Prisma Schema Additions

```prisma
model MuseumFreeDay {
  id          String   @id @default(cuid())
  museum      String
  dayOfWeek   Int      // 0=Sun, 1=Mon, etc.
  startTime   String?  // "17:30"
  endTime     String?  // "21:00"
  notes       String?  // "Pay what you wish"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model ServiceAlert {
  id            String   @id @default(cuid())
  externalId    String   @unique
  complaintType String
  descriptor    String?
  address       String?
  borough       String?
  status        String
  severity      String   @default("medium")
  createdAt     DateTime @default(now())
  resolvedAt    DateTime?
}

model AirQualityReading {
  id           String   @id @default(cuid())
  zipCode      String
  aqi          Int
  category     String
  pollutant    String?
  forecastDate DateTime
  fetchedAt    DateTime @default(now())
}

model DiningDeal {
  id           String   @id @default(cuid())
  source       String   // "restaurant-week", "eater", "infatuation"
  restaurant   String
  neighborhood String?
  cuisine      String?
  dealType     String   // "prix-fixe", "opening", "special"
  price        String?  // "$30 lunch"
  startDate    DateTime?
  endDate      DateTime?
  url          String
  createdAt    DateTime @default(now())
}

model ParkEvent {
  id          String   @id @default(cuid())
  externalId  String   @unique
  name        String
  parkName    String
  borough     String?
  date        DateTime
  startTime   String?
  endTime     String?
  category    String?
  isFree      Boolean  @default(true)
  url         String?
  createdAt   DateTime @default(now())
}
```

---

## Email Digest Integration

**New modules:**

```typescript
const DIGEST_MODULES = [
  { id: "sample-sales", name: "Sample Sales", icon: "🛍️" },
  { id: "events", name: "Events", icon: "🎭" },
  { id: "housing", name: "Housing", icon: "🏠" },
  // NEW:
  { id: "museums", name: "Free at Museums", icon: "🏛️" },
  { id: "alerts", name: "City Alerts", icon: "⚠️" },
  { id: "air-quality", name: "Air Quality", icon: "💨" },
  { id: "dining", name: "Dining Deals", icon: "🍽️" },
  { id: "parks", name: "Parks & Outdoors", icon: "🌳" },
];
```

**Conditional display:**
- **Air Quality**: Only show when AQI > 100
- **City Alerts**: Only show active/unresolved alerts
- **Museums**: Show if today matches a free day
- **Dining**: Always show if deals available
- **Parks**: Show next 3 days of events

---

## Cron Jobs

```json
{
  "crons": [
    { "path": "/api/jobs/scrape-311", "schedule": "0 */4 * * *" },
    { "path": "/api/jobs/scrape-air-quality", "schedule": "0 6,12,18 * * *" },
    { "path": "/api/jobs/scrape-dining", "schedule": "0 8 * * *" },
    { "path": "/api/jobs/scrape-parks", "schedule": "0 7 * * *" }
  ]
}
```

**Museums**: No cron needed — config-driven lookup at digest build time.

---

## Zod Schemas

```typescript
// src/lib/schemas/scrapers.ts

export const ServiceAlertSchema = z.object({
  unique_key: z.string(),
  complaint_type: z.string(),
  descriptor: z.string().nullable(),
  incident_address: z.string().nullable(),
  borough: z.string().nullable(),
  status: z.string(),
  created_date: z.string(),
});

export const AirQualitySchema = z.object({
  DateForecast: z.string(),
  AQI: z.number(),
  Category: z.object({ Name: z.string() }),
  ParameterName: z.string().optional(),
});

export const ParkEventSchema = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string().optional(),
  location: z.string().optional(),
  categories: z.array(z.string()).optional(),
  url: z.string().optional(),
});
```

---

## Implementation Summary

| Scraper | Source | Frequency | Digest Display |
|---------|--------|-----------|----------------|
| Museums | Config | On-demand | If free today |
| 311 Alerts | NYC Open Data | Every 4 hrs | Active alerts only |
| Air Quality | AirNow API | 3x daily | If AQI > 100 |
| Dining Deals | RSS feeds | Daily | Always |
| Parks Events | NYC Parks | Daily | Next 3 days |

---

## Next Steps

1. Add Prisma models and run migration
2. Implement scrapers with Zod validation
3. Add cron job endpoints
4. Integrate into email digest
5. Write tests for each scraper
