# NYCPing Data Strategy

## Overview

This document outlines the data sources, ingestion patterns, and alert timing strategies for NYCPing's six modules.

## Data Sources by Module

### 1. Events & Culture 🎭

| Source | Type | Endpoint | Update Frequency |
|--------|------|----------|------------------|
| **NYC Permitted Events** | JSON API | `data.cityofnewyork.us/resource/tvpp-9vvx.json` | Daily ✅ |
| **SummerStage** | Web Scrape | `cityparksfoundation.org/summerstage/` | Weekly |
| **Lincoln Center** | Web Scrape | `lincolncenter.org/summer-for-the-city` | Weekly |
| **TimeOut NYC** | RSS/Scrape | `timeout.com/newyork/things-to-do` | Daily |

> **Note:** The old Parks Events dataset (fudw-fgrp) is deprecated and hasn't been updated since 2019.
> Use tvpp-9vvx (NYC Permitted Event Information) for current event data.

**API Example (NYC Open Data - Socrata):**
```bash
# Get upcoming events (parades, markets, festivals)
curl "https://data.cityofnewyork.us/resource/tvpp-9vvx.json?\$where=start_date_time>'$(date +%Y-%m-%d)'&\$limit=100"

# Filter by event type (parades only)
curl "https://data.cityofnewyork.us/resource/tvpp-9vvx.json?\$where=event_type='Parade'"

# Filter by borough
curl "https://data.cityofnewyork.us/resource/tvpp-9vvx.json?\$where=event_borough='Brooklyn'"
```

**Ingestion Script:** `scripts/ingest-nyc-events.ts`
```bash
npx tsx scripts/ingest-nyc-events.ts              # Fetch interesting events
npx tsx scripts/ingest-nyc-events.ts --all        # Include all events
npx tsx scripts/ingest-nyc-events.ts --dry-run    # Preview mode
```

### 2. Transit 🚇

| Source | Type | Endpoint | Update Frequency |
|--------|------|----------|------------------|
| **MTA Service Status** | GTFS-RT | `api-endpoint.mta.info/Dataservice/` | Every 5 min |
| **MTA Planned Work** | JSON | `api.mta.info/#/subwayRealTimeClient` | Daily |
| **NYC Ferry** | GTFS | `nycferry.com/gtfs` | Daily |

**MTA API Setup:**
1. Register at https://api.mta.info/
2. Get API key (free)
3. Access GTFS-RT feeds for real-time alerts

### 3. Parking & Driving 🚗

| Source | Type | Endpoint | Update Frequency |
|--------|------|----------|------------------|
| **ASP Calendar** | Internal | Already seeded in `SuspensionEvent` | Pre-loaded |
| **NYC 311** | JSON API | `data.cityofnewyork.us/resource/erm2-nwe9.json` | Daily |
| **DOT Street Closures** | JSON | `data.cityofnewyork.us/resource/i4gi-tjb9.json` | Daily |

### 4. Housing & Lotteries 🏠

| Source | Type | Endpoint | Update Frequency |
|--------|------|----------|------------------|
| **Housing Connect** | Web Scrape | `housingconnect.nyc.gov/PublicWeb/search` | Daily |
| **NYC HPD** | JSON API | `data.cityofnewyork.us/resource/hg8x-zxpr.json` | Weekly |

### 5. Sample Sales 🛍️

| Source | Type | Endpoint | Update Frequency |
|--------|------|----------|------------------|
| **260 Sample Sale** | Web Scrape | `260samplesale.com` | Daily |
| **TheChoosyBeggar** | RSS | `thechoosybeggar.com/feed/` | Daily |
| **ChicMi** | Web Scrape | `chicmi.com/new-york` | Daily |

### 6. Deals & Money 💰

| Source | Type | Endpoint | Update Frequency |
|--------|------|----------|------------------|
| **Doctor of Credit** | RSS | `doctorofcredit.com/feed/` | Daily |
| **Reddit r/churning** | JSON API | `reddit.com/r/churning/.json` | Daily |
| **Manual Curation** | Admin Panel | Internal | As needed |

---

## Ingestion Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  API Pollers │  │ Web Scrapers │  │  RSS Readers │          │
│  │  (Cron Jobs) │  │   (Puppeteer)│  │   (xml2js)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
│         └─────────────────┼─────────────────┘                    │
│                           ▼                                      │
│                 ┌─────────────────┐                              │
│                 │   Normalizer    │                              │
│                 │  (Transform to  │                              │
│                 │   AlertEvent)   │                              │
│                 └────────┬────────┘                              │
│                          ▼                                       │
│                 ┌─────────────────┐                              │
│                 │   Deduplicator  │                              │
│                 │ (externalId key)│                              │
│                 └────────┬────────┘                              │
│                          ▼                                       │
│                 ┌─────────────────┐                              │
│                 │  AlertEvent DB  │                              │
│                 └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alert Timing Strategy

### Notification Windows

| Event Type | Lead Time | Channel | Rationale |
|------------|-----------|---------|-----------|
| **ASP Suspension** | Evening before | SMS + Email | Action required (move car) |
| **Major Transit Disruption** | Immediate | SMS | Time-critical |
| **Planned Service Changes** | 3 days before | Email digest | Planning horizon |
| **Free Concert/Event** | 1 week + 1 day before | Email | Plan ahead + reminder |
| **Housing Lottery Deadline** | 2 weeks + 3 days + 1 day | Email | Multiple reminders |
| **Sample Sale Start** | 1 day before | Email/SMS | FOMO-driven |
| **Credit Card Deal** | Same day | Email digest | Time-sensitive offers |

### Notification Outbox Flow

```sql
-- Events are queued to NotificationOutbox when:
-- 1. New AlertEvent is created (within notification window)
-- 2. Cron job scans for events entering notification window

INSERT INTO notification_outbox (user_id, event_id, channel, scheduled_for)
SELECT
  u.id,
  e.id,
  CASE
    WHEN u.tier = 'premium' THEN 'sms'
    ELSE 'email_digest'
  END,
  CASE
    WHEN e.urgency = 'high' THEN NOW()  -- Immediate
    ELSE DATE_TRUNC('day', e.starts_at) - INTERVAL '1 day' + TIME '18:00'  -- 6pm day before
  END
FROM alert_events e
JOIN user_module_preferences ump ON ump.module_id = e.source.module_id
JOIN users u ON u.id = ump.user_id
WHERE ump.enabled = true
  AND e.starts_at > NOW()
  AND NOT EXISTS (SELECT 1 FROM notification_outbox WHERE event_id = e.id AND user_id = u.id);
```

---

## Cron Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| `ingest/events` | `0 6 * * *` (6am daily) | Fetch NYC Open Data events |
| `ingest/mta-alerts` | `*/5 * * * *` (every 5 min) | Poll MTA for service alerts |
| `ingest/housing` | `0 7 * * *` (7am daily) | Scrape Housing Connect |
| `ingest/sample-sales` | `0 8 * * *` (8am daily) | Check sample sale sites |
| `send-notifications` | `*/10 * * * *` (every 10 min) | Process outbox queue |
| `send-daily-digest` | `0 7 * * *` (7am daily) | Email digest for free tier |
| `send-weekly-preview` | `0 8 * * 0` (Sunday 8am) | Week-ahead summary |

---

## Data Quality

### Deduplication Strategy

Each `AlertEvent` has a composite unique key:
- `sourceId` (which alert source it came from)
- `externalId` (unique ID from the source)

Example external IDs:
- NYC Open Data: `nyc-parks-{event_id}`
- MTA: `mta-alert-{alert_id}`
- Housing Connect: `hc-lottery-{project_id}`
- Sample Sales: `ss-{vendor}-{date}`

### Data Freshness

| Source Type | Staleness Threshold | Action |
|-------------|---------------------|--------|
| Real-time (MTA) | 5 minutes | Mark stale, retry |
| Daily APIs | 24 hours | Alert ops team |
| Web scrapes | 48 hours | Manual review |

---

## Implementation Priority

### Phase 1: Core APIs
1. ✅ NYC Permitted Events API integration (`scripts/ingest-nyc-events.ts`)
2. ⬜ MTA GTFS-RT service alerts
3. ⬜ Housing Connect scraper

### Phase 2: Secondary Sources (Week 2)
4. ⬜ SummerStage/Lincoln Center scrapers
5. ⬜ Sample sale RSS feeds
6. ⬜ Credit card deals aggregator

### Phase 3: Enrichment (Week 3)
7. ⬜ Borough/neighborhood tagging
8. ⬜ User preference matching
9. ⬜ Smart notification timing
