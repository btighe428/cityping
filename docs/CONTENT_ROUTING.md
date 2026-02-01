# CityPing Content Routing Rules

This document describes how content is routed to CityPing's 3x daily emails.

## Overview

CityPing sends up to 3 emails per day:
- **9am Morning Brief** - Commute prep, parking status, transit alerts
- **12pm Midday Update** - Breaking news, status changes, flexible content
- **6pm Evening Digest** - Tomorrow's preview, day-ahead planning

Not every user gets all 3 - we only send when there's enough valuable content.

## Content Categories

### 1. Urgent (Send Immediately)

Content that bypasses the schedule and triggers immediate delivery:

| Content Type | Trigger Condition | Example |
|-------------|-------------------|---------|
| `parking_emergency` | Emergency no-parking zones | Presidential visit, film production |
| `transit_outage` | Major service suspension | Entire line down |
| `weather_severe` | NWS severe weather alerts | Tornado warning, flash flood |
| `breaking_news` | Major local breaking news | Major incident |

**Rules:**
- Sent within 1 hour of detection
- Bypasses frequency caps for premium users
- Free users get in next scheduled slot

### 2. Time-Sensitive (Best at Specific Times)

Content that has a preferred delivery window:

| Content Type | Preferred Slots | Why |
|-------------|-----------------|-----|
| `asp_status` | Morning | Affects commute decision |
| `asp_suspension` | Morning, Evening | Good news! Affects today/tomorrow |
| `asp_in_effect` | Morning | Need to move car |
| `asp_tomorrow` | Evening | Tomorrow planning |
| `transit_delay` | Morning, Midday | Active delays affecting commute |
| `transit_advisory` | Evening, Morning | Plan around scheduled work |
| `weather_advisory` | Morning, Evening | Gear/planning decisions |
| `event_reminder` | Morning, Evening | Day-of or day-ahead |
| `street_closure` | Morning, Evening | Route planning |

**Rules:**
- Routed to preferred slot when possible
- Deferred to next valid slot if current slot is wrong
- Freshness window: 6 hours

### 3. Evergreen (Any Slot)

Content that's valuable but not time-dependent:

| Content Type | Notes |
|-------------|-------|
| `weather_daily` | Daily forecast |
| `local_news` | General neighborhood news |
| `meter_status` | Meter rules (rarely changes) |
| `transit_restoration` | Service restored alerts |

**Rules:**
- Used to fill slots when time-sensitive content is scarce
- Freshness window: 24 hours

### 4. Batchable (Accumulate for Next Send)

Low-priority content that doesn't need immediate delivery:

| Content Type | Notes |
|-------------|-------|
| `tips` | Parking tips, life hacks |
| `neighborhood_update` | Non-urgent neighborhood info |
| `weekly_recap` | Sunday recap |

**Rules:**
- Never triggers a send on its own
- Accumulates until next scheduled slot
- Freshness window: 72 hours

---

## Decision Matrix

### What Goes Where?

```
┌─────────────────────┬─────────┬─────────┬─────────┐
│ Content Type        │ 9am     │ 12pm    │ 6pm     │
├─────────────────────┼─────────┼─────────┼─────────┤
│ ASP Status          │ ✅ REQ  │ ⚪      │ ❌      │
│ ASP Tomorrow        │ ❌      │ ⚪      │ ✅ REQ  │
│ Transit Delay       │ ✅ PREF │ ✅ PREF │ ⚪      │
│ Transit Outage      │ ✅      │ ✅      │ ✅      │
│ Weather Daily       │ ✅ REQ  │ ⚪      │ ⚪      │
│ Weather Advisory    │ ✅ PREF │ ⚪      │ ✅ PREF │
│ Breaking News       │ ✅      │ ✅ PREF │ ✅      │
│ Local News          │ ⚪      │ ✅ PREF │ ✅ PREF │
│ Event Reminder      │ ✅ PREF │ ⚪      │ ✅ PREF │
│ Tips                │ ❌      │ ✅ PREF │ ✅ PREF │
│ Weekly Recap        │ ✅ REQ* │ ❌      │ ❌      │
└─────────────────────┴─────────┴─────────┴─────────┘

✅ REQ  = Required (always include if available)
✅ PREF = Preferred slot
✅      = Allowed
⚪      = Fallback only
❌      = Excluded
* Sunday only
```

### Slot Limits

| Slot | Min Items | Max Items | Skip If Below Min? |
|------|-----------|-----------|-------------------|
| Morning | 2 | 8 | Yes (unless has parking status) |
| Midday | 3 | 6 | Yes (or combine with evening) |
| Evening | 2 | 10 | Yes (unless has tomorrow preview) |

---

## Deduplication Rules

### Don't Repeat Rule

If content was sent in one slot, it should NOT appear in subsequent slots unless:

1. **Status changed** - ASP went from suspended → in effect
2. **Situation escalated** - Delay became outage
3. **Urgent update** - Priority increased by 30+ points

### What Triggers a Re-send?

| Scenario | Re-send? | Reason |
|----------|----------|--------|
| Same ASP status in 9am and 6pm | ❌ No | No new information |
| ASP changed from suspended to active | ✅ Yes | Status change |
| Transit delay at 9am, still delayed at 12pm | ❌ No | Same status |
| Transit delay at 9am, outage at 12pm | ✅ Yes | Escalation |
| Minor weather update | ❌ No | Not significant |
| Weather advisory upgraded to warning | ✅ Yes | Escalation |

### Version Tracking

Every content item has a `version` number. Increment to force re-send:

```typescript
// Version 1: Initial send
{ id: 'asp-2024-01-15', version: 1, ... }

// Version 2: Status changed, will re-send
{ id: 'asp-2024-01-15', version: 2, statusChanged: true, ... }
```

---

## Freshness Windows

Content has a "freshness" window - after which it's too stale to send:

| Urgency | Window | Example |
|---------|--------|---------|
| Urgent | 1 hour | Emergency alerts |
| Time-Sensitive | 6 hours | Transit delays |
| Evergreen | 24 hours | Local news |
| Batchable | 72 hours | Tips, weekly items |

### Staleness Calculation

```
age = now - content.createdAt
isFresh = age <= freshnessWindow[urgency]
```

If content is stale, it's **skipped** (not deferred).

---

## Scarcity Rules (Not Enough Content)

### Morning Slot
- **If <2 items but has parking status**: Send anyway
- **If <2 items and no parking**: Skip slot

### Midday Slot
- **If 0 items**: Skip slot
- **If 1-2 low-priority items**: Combine with evening
- **If 1-2 high-priority items**: Send anyway

### Evening Slot
- **If <2 items but has tomorrow preview**: Send anyway
- **If <2 items and no preview**: Skip slot

---

## Abundance Rules (Too Much Content)

When we have more content than fits in a slot:

### Priority Order (highest first)

1. **Urgent** - Always include (within limit)
2. **Time-sensitive at preferred time** - Include
3. **Time-sensitive at fallback time** - Include if room
4. **Evergreen** - Fill remaining space
5. **Batchable** - Defer to next slot

### Overflow Handling

| Content Type | If Overflow |
|-------------|-------------|
| Urgent | Send in separate immediate email |
| Time-sensitive (high priority) | Defer to next slot |
| Time-sensitive (low priority) | Drop |
| Evergreen | Defer to next slot |
| Batchable | Defer to next slot |

---

## When to Skip a Send Entirely

Skip the scheduled email when:

1. **Below minimum items** and no required items present
2. **All content is stale** (past freshness windows)
3. **User at frequency cap** (2 emails/day for free tier)
4. **Quiet hours** (10pm - 7am, unless urgent)
5. **No content delta** since last send

### The "Coffee Test" (Morning)

Ask: "Would this email be worth reading while grabbing coffee?"
- ✅ Parking status + weather = Yes
- ❌ Just tips and old news = No

### The "Commute Test" (Midday)

Ask: "Would this interrupt someone's workday meaningfully?"
- ✅ Breaking news or active transit issue = Yes
- ❌ Neighborhood update = No

### The "Tomorrow Test" (Evening)

Ask: "Does this help someone plan for tomorrow?"
- ✅ Tomorrow's ASP status + weather = Yes
- ❌ Today's stale content = No

---

## Example Scenarios

### Scenario 1: Normal Day

**Available content at 9am:**
- ASP status (in effect, priority 80)
- Weather forecast (cloudy, priority 50)
- 2 transit delays (priority 75)
- 1 local news story (priority 45)
- 2 tips (priority 25)

**Decision:**
- ✅ Send morning email with: ASP, weather, 2 transit delays, news
- 📥 Defer tips to midday/evening
- Total items: 5 (within 8 limit)

### Scenario 2: Quiet Day

**Available content at 12pm:**
- 1 local news story (priority 45)
- 1 tip (priority 25)

**Decision:**
- ❌ Skip midday (below minimum of 3)
- 📥 Combine with evening slot

### Scenario 3: Breaking News

**Content detected at 2pm:**
- Transit outage on A/C/E (priority 90)

**Decision:**
- ⚡ Send immediately (urgent, doesn't wait for 6pm)
- Mark as "sent" to prevent duplicate in evening

### Scenario 4: Status Change

**Morning sent:**
- ASP suspended (snow day)

**New info at 11am:**
- ASP suspension revoked (snow cleared early)

**Decision:**
- ⚡ Send midday with status change
- New content warranted because status flipped

### Scenario 5: Content Overflow

**Available content at 6pm:**
- ASP tomorrow (priority 65)
- Weather advisory (priority 70)
- 5 transit advisories (priority 60 each)
- 8 local news stories (priority 45 each)
- 3 tips (priority 25 each)

**Decision:**
- ✅ Send evening with: ASP tomorrow, weather, 5 transit, 3 news (10 items)
- 📥 Defer remaining 5 news + 3 tips to tomorrow morning
- Drop nothing (all can be deferred)

---

## Implementation Checklist

- [ ] Content items tagged with `type` and `priority`
- [ ] Send history tracked per user per 24h
- [ ] Freshness checked before routing
- [ ] Dedup runs before slot assembly
- [ ] Slot minimums enforced
- [ ] Overflow items properly deferred
- [ ] Immediate sends bypass queue for urgent content
- [ ] Frequency caps respected
- [ ] Skip decisions logged for debugging
