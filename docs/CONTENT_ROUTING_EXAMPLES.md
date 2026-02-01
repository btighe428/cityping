# Content Routing Examples

Real-world scenarios showing how the content router makes decisions.

---

## Scenario 1: Typical Monday Morning

### Context
- Time: Monday, 8:55am ET
- User: Brooklyn driver, free tier
- Previous sends: Sunday evening digest

### Available Content

| ID | Type | Title | Priority | Age |
|----|------|-------|----------|-----|
| asp-1 | asp_in_effect | Street cleaning active today | 80 | 1h |
| wx-1 | weather_daily | Clear skies, 72°F | 50 | 2h |
| tr-1 | transit_delay | A train delays, 10-15 min | 75 | 30m |
| news-1 | local_news | New bike lanes in Williamsburg | 45 | 8h |
| tip-1 | tips | Best times to find parking in DUMBO | 25 | 24h |

### Routing Decisions

```
asp-1:  INCLUDE → morning (required, high priority)
wx-1:   INCLUDE → morning (required, fresh)
tr-1:   INCLUDE → morning (preferred slot, fresh)
news-1: INCLUDE → morning (evergreen, fills slot)
tip-1:  DEFER → midday/evening (batchable, not urgent)
```

### Final Morning Email

**Includes:** asp-1, wx-1, tr-1, news-1 (4 items)
**Skipped:** tip-1 (deferred)
**Status:** SEND ✅

---

## Scenario 2: Breaking Transit Outage

### Context
- Time: Tuesday, 10:30am ET
- User: Manhattan commuter, premium tier
- Previous sends: 9am morning brief

### New Content (Detected 10:25am)

| ID | Type | Title | Priority | Age |
|----|------|-------|----------|-----|
| tr-2 | transit_outage | L train suspended - smoke condition | 90 | 5m |

### Routing Decision

```
tr-2:  SEND_IMMEDIATE (urgent, priority >= 80)
       Does not wait for 12pm slot
```

### Action

**Immediate alert sent** at 10:30am
**Content marked as sent** - won't appear in 12pm or 6pm

---

## Scenario 3: Status Change After Morning Send

### Context
- Time: Tuesday, 11:15am ET
- User: Queens parker, free tier
- Previous sends: 9am (included asp_suspension for snow day)

### New Content

| ID | Type | Title | Priority | Age |
|----|------|-------|----------|-----|
| asp-2 | asp_in_effect | Snow day cancelled - ASP resumes at noon | 80 | 10m |

### Deduplication Check

```
asp-2: Already sent asp_suspension at 9am
       ├─ Is status change? YES (suspended → in_effect)
       └─ Decision: INCLUDE (override dedup)
```

### Routing Decision

```
asp-2:  INCLUDE → midday (status change warrants re-send)
```

### Midday Email

**Includes:** asp-2 + any other midday content
**Note:** Explicitly mentions "Update: Earlier suspension cancelled"

---

## Scenario 4: Content Scarcity (Quiet Day)

### Context
- Time: Wednesday, 11:55am ET
- User: Bronx resident, free tier
- Previous sends: 9am morning brief

### Available Content for Midday

| ID | Type | Title | Priority | Age |
|----|------|-------|----------|-----|
| news-2 | local_news | Community garden opens in Mott Haven | 45 | 6h |
| tip-2 | tips | Meter payment app tips | 25 | 48h |

### Scarcity Evaluation

```
Item count: 2
Slot minimum: 3
Has high-priority item? NO (max priority = 45)

Decision: COMBINE_NEXT
- Defer both items to 6pm evening slot
- Skip midday entirely
```

### Action

**Midday slot SKIPPED** ❌
**Content deferred to evening**

---

## Scenario 5: Content Abundance (Busy News Day)

### Context
- Time: Thursday, 5:55pm ET
- User: Manhattan resident, premium tier
- Previous sends: 9am, 12pm (breaking news about subway incident)

### Available Content for Evening

| ID | Type | Title | Priority | Age |
|----|------|-------|----------|-----|
| asp-3 | asp_tomorrow | ASP suspended tomorrow (Thanksgiving) | 65 | 1h |
| wx-2 | weather_advisory | Rain expected Friday AM | 70 | 2h |
| tr-3 | transit_advisory | Macy's Parade route closures | 60 | 3h |
| tr-4 | transit_advisory | Path train schedule changes | 60 | 3h |
| tr-5 | transit_advisory | Staten Island Ferry extra service | 55 | 4h |
| news-3 | local_news | Best pie shops for Thanksgiving | 45 | 12h |
| news-4 | local_news | Holiday market opens at Union Square | 45 | 10h |
| news-5 | local_news | Restaurant week extended | 40 | 14h |
| news-6 | local_news | New pizza spot in LES | 35 | 20h |
| news-7 | local_news | Art gallery opening | 30 | 22h |
| tip-3 | tips | Turkey carving tips | 25 | 36h |
| tip-4 | tips | Black Friday parking tips | 20 | 48h |
| nh-1 | neighborhood_update | Your block: new restaurant permit | 35 | 24h |

### Item Count: 13 (exceeds limit of 10)

### Abundance Handling

```
Sort by priority:
1. wx-2 (70) → KEEP
2. asp-3 (65) → KEEP (required)
3. tr-3 (60) → KEEP
4. tr-4 (60) → KEEP
5. tr-5 (55) → KEEP
6. news-3 (45) → KEEP
7. news-4 (45) → KEEP
8. news-5 (40) → KEEP
9. news-6 (35) → KEEP
10. nh-1 (35) → KEEP
--- LIMIT REACHED ---
11. news-7 (30) → DEFER to tomorrow
12. tip-3 (25) → DEFER to tomorrow
13. tip-4 (20) → DEFER to tomorrow
```

### Final Evening Email

**Includes:** 10 items (wx-2, asp-3, tr-3, tr-4, tr-5, news-3, news-4, news-5, news-6, nh-1)
**Deferred:** 3 items to tomorrow morning

---

## Scenario 6: Duplicate Prevention

### Context
- Time: Friday, 5:55pm ET
- User: Brooklyn driver, free tier
- Previous sends: 9am (included transit_delay for F train)

### Available Content

| ID | Type | Title | Priority | Age |
|----|------|-------|----------|-----|
| tr-6 | transit_delay | F train still experiencing delays | 70 | 8h |
| asp-4 | asp_tomorrow | Normal ASP rules tomorrow | 65 | 1h |
| wx-3 | weather_daily | Weekend forecast: sunny | 50 | 1h |

### Deduplication Check

```
tr-6: Check history...
      ├─ Found: Sent similar content (F train delay) at 9am
      ├─ Status change? NO (still "delays")
      ├─ Priority increase? NO (was 75, now 70)
      └─ Decision: SKIP (duplicate, no meaningful update)

asp-4: No previous asp_tomorrow today → INCLUDE
wx-3:  New content → INCLUDE
```

### Final Evening Email

**Includes:** asp-4, wx-3 (2 items, meets minimum)
**Skipped:** tr-6 (duplicate with no update)

---

## Scenario 7: Freshness Expiration

### Context
- Time: Saturday, 8:55am ET
- User: Queens parker, free tier
- Previous sends: Friday evening

### Available Content

| ID | Type | Title | Priority | Age |
|----|------|-------|----------|-----|
| asp-5 | asp_status | ASP in effect today | 80 | 2h |
| wx-4 | weather_daily | Weekend: sunny, 65°F | 50 | 3h |
| tr-7 | transit_delay | G train delays overnight | 75 | 10h |
| news-8 | local_news | Friday night protest recap | 45 | 14h |
| tip-5 | tips | Weekend parking guide | 25 | 72h |

### Freshness Check

```
asp-5:  Age 2h  < 6h (time-sensitive window)  → FRESH ✓
wx-4:   Age 3h  < 24h (evergreen window)      → FRESH ✓
tr-7:   Age 10h > 6h (time-sensitive window)  → STALE ✗
news-8: Age 14h < 24h (evergreen window)      → FRESH ✓
tip-5:  Age 72h = 72h (batchable window)      → BORDERLINE ✓
```

### Routing Decisions

```
asp-5:  INCLUDE (fresh, required)
wx-4:   INCLUDE (fresh)
tr-7:   SKIP (stale - delays from overnight no longer relevant)
news-8: INCLUDE (still fresh enough)
tip-5:  INCLUDE (just within window)
```

### Final Morning Email

**Includes:** asp-5, wx-4, news-8, tip-5 (4 items)
**Skipped:** tr-7 (stale)

---

## Scenario 8: Emergency Override

### Context
- Time: Sunday, 3:00pm ET (not a scheduled slot)
- User: All users in affected area
- Normal: No scheduled sends between 12pm and 6pm

### Emergency Content Detected

| ID | Type | Title | Priority | Age |
|----|------|-------|----------|-----|
| emg-1 | parking_emergency | Emergency no-parking: Water main break on 14th St | 95 | 5m |

### Routing Decision

```
emg-1: Urgency = URGENT, Priority = 95
       ├─ Bypasses all scheduling
       ├─ Bypasses frequency caps (premium)
       └─ Decision: SEND_IMMEDIATE

For free tier users:
       ├─ Check frequency cap
       ├─ If under cap → SEND_IMMEDIATE
       └─ If at cap → INCLUDE in 6pm slot (marked urgent)
```

### Action

**Immediate alert to affected users**
**Logged to prevent re-send at 6pm**

---

## Scenario 9: Weekly Recap (Sunday)

### Context
- Time: Sunday, 8:55am ET
- User: Manhattan driver, premium tier
- Previous sends: Saturday evening

### Available Content

| ID | Type | Title | Priority | Age |
|----|------|-------|----------|-----|
| asp-6 | asp_status | ASP suspended (Sunday) | 80 | 1h |
| wx-5 | weather_daily | Partly cloudy, 60°F | 50 | 1h |
| recap-1 | weekly_recap | Your week: 3 alerts, 2 ASP suspensions | 55 | generated |

### Routing Decisions

```
Sunday morning special rules:
- Include weekly_recap (normally excluded from morning)
- Standard content still applies

asp-6:   INCLUDE (required)
wx-5:    INCLUDE (required)
recap-1: INCLUDE (Sunday exception)
```

### Final Sunday Morning Email

**Includes:** asp-6, wx-5, recap-1 (3 items)
**Special:** Includes personalized weekly recap section

---

## Scenario 10: Complete Skip (Nothing to Send)

### Context
- Time: Monday, 11:55am ET (midday slot)
- User: Bronx resident, free tier
- Previous sends: 9am morning (complete brief)

### Available Content

| ID | Type | Title | Priority | Age |
|----|------|-------|----------|-----|
| (none new since morning) | - | - | - | - |

### Evaluation

```
Available items: 0
Minimum required: 3
Has urgent content? NO
Has breaking news? NO

Decision: SKIP SLOT ENTIRELY
```

### Action

**No midday email sent** ✅
**Next scheduled: 6pm evening**

---

## Decision Summary Table

| Scenario | Slot | Items Available | Items Sent | Action |
|----------|------|-----------------|------------|--------|
| 1. Normal morning | Morning | 5 | 4 | Send (defer 1) |
| 2. Breaking outage | Immediate | 1 | 1 | Send immediately |
| 3. Status change | Midday | 1 | 1 | Send (override dedup) |
| 4. Quiet day | Midday | 2 | 0 | Skip (combine with evening) |
| 5. Busy day | Evening | 13 | 10 | Send (defer 3) |
| 6. Duplicate content | Evening | 3 | 2 | Send (skip 1 dup) |
| 7. Stale content | Morning | 5 | 4 | Send (skip 1 stale) |
| 8. Emergency | Immediate | 1 | 1 | Send immediately |
| 9. Sunday recap | Morning | 3 | 3 | Send (with recap) |
| 10. No content | Midday | 0 | 0 | Skip slot |
