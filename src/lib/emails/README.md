# CityPing 9am Morning Brief

A quick, scannable email for NYC residents checking their phone with coffee before leaving home.

## Design Philosophy

- **Under 30 seconds** to scan fully
- **Action-first** hierarchy (parking status first)
- **No fluff** — only information that affects today's decisions
- **Morning tone** — helpful friend, not corporate alert

## Information Hierarchy

1. **🚗 PARKING STATUS** — Can I leave my car where it is?
2. **🌤️ WEATHER** — Do I need an umbrella/coat?
3. **🚇 TRANSIT ALERTS** — Will my commute work? (only if issues)
4. **📅 DAY AHEAD** — What's tomorrow look like?

## Quick Start

```typescript
import { morningBrief, MORNING_BRIEF_EXAMPLES } from "@/lib/emails";

// Use example data for testing
const exampleData = MORNING_BRIEF_EXAMPLES.suspendedClearDay();
const email = morningBrief(exampleData);

console.log(email.subject);
console.log(email.html);
console.log(email.text);
console.log(email.preheader);
```

## Subject Line Logic

Subject lines are chosen based on priority:

1. **ASP suspended** → Lead with the win (`🚗 No ASP today`)
2. **Transit issues** → Alert-focused (`🚇 Transit alert: N/W delays`)
3. **Weather alert** → Condition-focused (`☔ Rain today`)
4. **Default** → Generic but friendly (`☕ Your NYC morning brief`)

## Content Examples

See `morning-examples.ts` for ready-to-use copy for:

- Holiday suspensions (Christmas, Thanksgiving, etc.)
- Weather conditions (rain, snow, heat)
- Transit scenarios (delays, outages, planned work)
- Edge cases (film shoots, block parties, overnight changes)

## Send Time

**Optimal: 9:00 AM**

- After coffee, before leaving home
- Before the commute decisions are locked in
- Acceptable range: 8:30-9:30 AM

## File Structure

```
src/lib/emails/
├── index.ts              # Exports
├── morning-template.ts   # Main template + types
├── morning-examples.ts   # Example content & copy guide
└── README.md             # This file
```

## Integration with Existing System

This template uses the same design system as existing emails:

```typescript
import { COLORS, TYPOGRAPHY, SPACING, containerStyle, footer } from "../email-design-system";
```

## Tone Checklist

- [ ] Lead with the benefit ("No need to move" > "ASP suspended")
- [ ] Use contractions (you'll, won't, don't)
- [ ] Be specific (dates, times, holiday names)
- [ ] Vary the copy (don't say the same thing every email)
- [ ] Max 1-2 emojis per section
- [ ] Respect their time — every word should earn its place

## Testing

Test these scenarios:

1. **Perfect day** — Suspended ASP, nice weather, no transit issues
2. **Tough day** — Active ASP, rain, transit delays
3. **Snow emergency** — Suspended but with restrictions
4. **Quiet period** — Summer suspension week
5. **Back to reality** — First active day after holidays

See `COMPLETE_EXAMPLES` in `morning-examples.ts` for all test cases.
