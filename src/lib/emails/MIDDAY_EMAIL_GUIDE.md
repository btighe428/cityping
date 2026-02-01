# CityPing Midday Email

## Overview

The midday email is designed for the **lunch break check** — users scanning between meetings or during lunch. It's intentionally brief and only surfaces what changed since the morning email.

## Design Principles

1. **Only changed information** — If nothing changed, say so clearly
2. **Time-sensitive only** — No "nice to know" content
3. **Scannable in 30 seconds** — Short sections, clear hierarchy
4. **Action-oriented** — Tell users what they need to do NOW

## When to Send

| Scenario | Send? | Reason |
|----------|-------|--------|
| ASP status changed | ✅ Yes | Critical parking info |
| Major transit disruption | ✅ Yes | Affects afternoon commute |
| Weather warning issued | ✅ Yes | Immediate safety concern |
| Parking emergency | ✅ Yes | Risk of tow/ticket |
| Minor transit delays | ⚠️ Maybe | Only if >15 min impact |
| New lunch deals | ✅ Yes | Value-add for timing |
| Nothing changed | ⚠️ Maybe | Send "all clear" or skip |

## Email Structure

```
┌─────────────────────────────┐
│  🕐 Midday Update — 12:30   │
├─────────────────────────────┤
│  📍 Park Slope, Brooklyn    │
├─────────────────────────────┤
│  🚨 BREAKING (if any)       │
│  Only if something changed  │
├─────────────────────────────┤
│  🚇 TRANSIT NOW             │
│  Current status for commute │
├─────────────────────────────┤
│  🍽️ LUNCH WINDOW (optional) │
│  Nearby spots/deals         │
├─────────────────────────────┤
│  📅 AFTERNOON PREVIEW       │
│  What's coming, weather     │
└─────────────────────────────┘
```

## Subject Line Priority

1. **Breaking update** → `🚨 Breaking: ASP just suspended`
2. **ASP changed** → `🎉 Good news: No street cleaning today`
3. **Transit alert** → `🚇 L train down — alternate routes inside`
4. **Lunch focus** → `🍽️ Lunch: 3 spots under 5 min walk`
5. **Default** → `🗽 Midday check: NYC update`

## Content Guidelines

### Breaking Updates

**Only include if something actually changed since 9am.**

| Type | Example Headline | Example Details |
|------|-----------------|-----------------|
| `asp_status` | "ASP just suspended" | "Mayor announced for snow removal" |
| `transit_major` | "N train suspended" | "Signal fire at 39th Ave" |
| `weather_warning` | "Severe storm warning" | "60mph winds until 3 PM" |
| `parking_emergency` | "Film shoot on your block" | "No parking 2-11 PM today" |

### Transit Status

- Show **only current status** — not predictions
- Always include the user's saved lines first
- If all good: "✅ Smooth sailing for afternoon commute"
- If issues: Lead with delays, show time estimate

### Lunch Window

- Max **3 spots** to keep it scannable
- Include **walk time** — people check during short breaks
- Show **offer/price** if available
- Show **end time** for limited deals

### Afternoon Preview

- **Weather shift**: Rain incoming, temperature drop, etc.
- **Transit outlook**: Rush hour expectations
- **Evening note**: Events worth knowing about

## Code Example

```typescript
import { middayUpdate, MIDDAY_EXAMPLES } from "@/lib/emails/midday-template";

// Generate email
const { subject, html, text, preheader } = middayUpdate({
  date: new Date(),
  user: {
    neighborhood: "Park Slope, Brooklyn",
    zipCode: "11215",
  },
  breakingUpdates: [
    {
      type: "asp_status",
      headline: "ASP just suspended",
      details: "Emergency snow removal — citywide",
      actionRequired: "Leave your car where it is",
    },
  ],
  transit: [
    { line: "F/G", status: "good", headline: "Normal service" },
    { line: "2/3", status: "delays", headline: "Signal work", delayTime: "10 min" },
  ],
  lunchSpots: [
    {
      name: "Black Seed Bagels",
      type: "restaurant",
      distance: "0.2 mi",
      walkTime: "4 min",
      offer: "Lunch special $9",
    },
  ],
  afternoon: {
    weatherShift: "Snow tapering off by 3 PM",
    transitOutlook: "May have residual delays through rush hour",
  },
});

// Send via your email service
await sendEmail({ to: user.email, subject, html, text });
```

## Testing Scenarios

Use the built-in examples:

```typescript
import { MIDDAY_EXAMPLES } from "@/lib/emails/midday-template";

// Test different scenarios
middayUpdate(MIDDAY_EXAMPLES.aspChanged());
middayUpdate(MIDDAY_EXAMPLES.transitEmergency());
middayUpdate(MIDDAY_EXAMPLES.quietDay());
middayUpdate(MIDDAY_EXAMPLES.multiUpdate());
```

## Tone Checklist

- [ ] Is this urgent enough for a midday interruption?
- [ ] Can they scan this in 30 seconds?
- [ ] Is every word necessary?
- [ ] Do they know what action to take?
- [ ] Is the tone quick and helpful, not alarmist?

## File Reference

| File | Purpose |
|------|---------|
| `midday-template.ts` | Main template with types and renderer |
| `midday-examples.ts` | Sample content for each section |
| `morning-template.ts` | Reference for consistent tone |
