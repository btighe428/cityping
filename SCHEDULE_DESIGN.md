# CityPing Email Schedule Design

## Overview

CityPing's time-slot email system delivers personalized NYC updates at three strategic times daily:

| Slot | Time (ET) | UTC | Purpose |
|------|-----------|-----|---------|
| **Morning** | 9:00 AM | 14:00 | Comprehensive daily briefing |
| **Noon** | 12:00 PM | 17:00 | Breaking alerts & midday updates |
| **Evening** | 7:00 PM | 00:00 (+1) | Day-ahead preview & tomorrow prep |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Vercel Cron Scheduler                         │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    /api/jobs/email-router                           │
│                         ?slot=X                                      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   src/lib/email-scheduler.ts                         │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Morning    │  │    Noon      │  │   Evening    │              │
│  │  Briefing    │  │    Pulse     │  │  Wind-Down   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                        │
│         ▼                 ▼                 ▼                        │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              Content Builder (per slot)                   │      │
│  │  - Fetches data within time window                        │      │
│  │  - Checks freshness requirements                          │      │
│  │  - Builds sections by priority                            │      │
│  └──────────────────────────────────────────────────────────┘      │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              User Filter & Preference Check               │      │
│  │  - Time slot opt-in/out                                   │      │
│  │  - Tier-based defaults                                    │      │
│  │  - Frequency cap validation                               │      │
│  └──────────────────────────────────────────────────────────┘      │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              Email Sending (with idempotency)             │      │
│  │  - sendEmailTracked() prevents duplicates                 │      │
│  │  - Distributed lock prevents concurrent runs              │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

## Time Slot Details

### 🌅 Morning Briefing (9:00 AM ET)

**Purpose:** Start your day with everything you need to know.

**Content Mix:**
- Breaking alerts (overnight emergencies, urgent transit)
- Top news stories (AI-curated overnight picks)
- Today's events (concerts, openings, deadlines)
- Transit summary (current service status)
- Weather overview (today's forecast + alerts)

**Content Window:** 12 hours (looks back to 9 PM previous night)

**Minimum Content:** 5 items to send

**User Targeting:**
- All users (default slot for free tier)
- Can be disabled via preferences

### ☀️ Midday Pulse (12:00 PM ET)

**Purpose:** Catch up on what changed since morning.

**Content Mix:**
- New alerts since morning (4-hour window)
- Transit updates (delays, service changes)
- Developing news stories
- Afternoon weather updates

**Content Window:** 4 hours (since morning send)

**Minimum Content:** 2 items (breaking alerts only if sparse)

**User Targeting:**
- Premium tier by default
- Free tier can opt-in
- Skipped if no new content

### 🌆 Evening Wind-Down (7:00 PM ET)

**Purpose:** Prepare for tomorrow.

**Content Mix:**
- Tomorrow's parking status (ASP suspension alerts)
- Tomorrow's events preview
- Tomorrow's weather forecast
- Week-ahead highlights (Fridays only)

**Content Window:** 8 hours + next day lookahead

**Minimum Content:** 3 items

**User Targeting:**
- Premium tier by default
- Free tier can opt-in
- Critical parking alerts sent to all users

## Content Freshness Rules

```typescript
const FRESHNESS_RULES = {
  morning: {
    windowHours: 12,        // Look back 12 hours
    minFreshHours: 2,       // Newest content must be < 2h old
    minItems: 5,            // Need 5+ items to send
    fallbackOnStale: true,  // Send anyway with disclaimer
  },
  noon: {
    windowHours: 4,         // Look back 4 hours
    minFreshHours: 1,       // Newest content must be < 1h old  
    minItems: 2,            // Need 2+ items to send
    fallbackOnStale: false, // Skip if stale
  },
  evening: {
    windowHours: 8,         // Look back 8 hours + tomorrow
    minFreshHours: 2,       // Day-ahead data must be current
    minItems: 3,            // Need 3+ items to send
    fallbackOnStale: false, // Skip if stale
  },
}
```

## Skip Logic

A time slot is skipped when:

1. **No fresh content:** Data is stale (> minFreshHours since newest event)
2. **Insufficient content:** Fewer than minItems to show
3. **User frequency cap:** Already received max emails today (default: 2/day)
4. **User preference:** Opted out of this time slot
5. **Duplicate prevention:** Same email type already sent today

### What Happens When Skipped?

- **Morning:** Always attempts to send (primary slot)
- **Noon:** Silently skipped, logged for monitoring
- **Evening:** Parking alerts escalate to SMS for premium users

## User Preferences

### Database Schema

```sql
CREATE TABLE user_delivery_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    morning_enabled BOOLEAN DEFAULT true,
    noon_enabled BOOLEAN DEFAULT false,
    evening_enabled BOOLEAN DEFAULT false,
    quiet_hours_start INTEGER,  -- 0-23
    quiet_hours_end INTEGER,    -- 0-23
    timezone TEXT DEFAULT 'America/New_York'
);
```

### Tier Defaults

| Tier | Morning | Noon | Evening |
|------|---------|------|---------|
| Free | ✅ | ❌ | ❌ |
| Premium | ✅ | ✅ | ✅ |

### Preference API

```typescript
// Get user preferences
GET /api/preferences/delivery
{
  morning: true,
  noon: false,
  evening: true,
  timezone: "America/New_York"
}

// Update preferences
PATCH /api/preferences/delivery
{
  noon: true,
  evening: false
}
```

## Job Coordination

### Preventing Duplicate Sends

1. **Distributed Lock:** Each time slot acquires a lock before running
2. **Idempotency Key:** `(recipient, emailType, targetDate)` unique constraint
3. **Email Outbox:** Tracks all sent emails with status

### Preventing Overlap

Each slot has a distinct `emailType`:
- `morning_briefing`
- `midday_pulse`
- `evening_winddown`

The frequency cap system treats these as separate types but counts toward daily total.

### Data Sharing

Content is NOT shared between slots. Each slot:
1. Queries fresh data for its time window
2. Builds content independently
3. Personalizes per user

This ensures each email feels timely and relevant.

## Vercel Cron Configuration

```json
{
  "crons": [
    {
      "_comment": "9:00 AM ET - Morning Briefing",
      "path": "/api/jobs/email-router?slot=morning",
      "schedule": "0 14 * * *"
    },
    {
      "_comment": "12:00 PM ET - Midday Pulse",
      "path": "/api/jobs/email-router?slot=noon",
      "schedule": "0 17 * * *"
    },
    {
      "_comment": "7:00 PM ET - Evening Wind-Down",
      "path": "/api/jobs/email-router?slot=evening",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Monitoring & Alerts

### Job Monitor Integration

Each time slot reports to `JobMonitor`:
- Start time, duration
- Users processed, emails sent
- Skip reasons breakdown
- Error details

### Health Checks

```
GET /api/health?checkStale=true
```

Returns:
- Last successful run per slot
- Content freshness status
- Error rate last 24h

### Alerting

Alerts trigger when:
- Morning slot fails 2 consecutive days
- Any slot has >50% error rate
- Content freshness is "stale" for >4 hours

## Migration Plan

### Phase 1: Deploy (Current)
- Add new email-router endpoint
- Add UserDeliveryPreference model
- Keep legacy jobs running

### Phase 2: Shadow Mode
- Run new system alongside legacy
- Compare results, validate content
- Monitor for issues

### Phase 3: Cutover
- Disable legacy morning digest (12:00 UTC)
- Disable legacy day-ahead (23:00 UTC)
- Keep weekly digest separate (not migrated)

### Phase 4: Cleanup
- Remove legacy job routes
- Update vercel.json to remove old crons
- Archive old code

## Testing

### Manual Testing

```bash
# Test morning slot for specific user
curl -X GET "https://cityping.net/api/jobs/email-router?slot=morning&testUser=USER_ID&force=true" \
  -H "x-cron-secret: $CRON_SECRET"

# Test with dry run (check content without sending)
curl -X GET "https://cityping.net/api/jobs/email-router?slot=noon&dryRun=true" \
  -H "x-cron-secret: $CRON_SECRET"
```

### Automated Tests

```typescript
// __tests__/email-scheduler.test.ts
describe('Time Slot Scheduling', () => {
  it('morning slot includes overnight content', async () => {
    const content = await buildSlotContent('morning')
    expect(content.sections).toContainEqual(
      expect.objectContaining({ type: 'news' })
    )
  })

  it('noon slot skips when no fresh content', async () => {
    // Set all events to >4 hours old
    const result = await executeTimeSlotJob('noon')
    expect(result.success).toBe(true)
    expect(result.emailsSent).toBe(0)
    expect(result.skippedReasons).toHaveProperty('insufficient_content')
  })

  it('respects user time slot preferences', async () => {
    const users = await getUsersForTimeSlot('noon')
    const freeUsers = users.filter(u => u.tier === 'free')
    expect(freeUsers.every(u => !u.preferredSlots.includes('noon'))).toBe(true)
  })
})
```

## FAQ

**Q: What if a user receives both morning digest AND morning briefing?**

A: During transition, both may run. The frequency cap (2 emails/day) prevents spam. After cutover, only the new system runs.

**Q: Can users pick different times (e.g., 8 AM instead of 9 AM)?**

A: Not in v1. The three slots are fixed. Custom timing is a future feature.

**Q: What about timezone support?**

A: Currently all times are ET. The schema supports timezone but logic is not implemented yet.

**Q: How do we handle DST transitions?**

A: Vercel cron uses UTC. The 1-hour shift during DST means emails arrive at 8 AM or 10 AM ET briefly. This is acceptable for now.
