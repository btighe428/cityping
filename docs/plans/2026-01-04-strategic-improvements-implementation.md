# CityPing Strategic Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 7 strategic improvements to CityPing: scraper resilience, hype scoring, feedback loop, commute alerts, weather integration, personality tuner, and referral program.

**Architecture:** Each feature is implemented independently with its own schema changes, library code, and API endpoints. Features build on existing infrastructure (Resend email, Stripe payments, Claude Haiku AI). All follow TDD with Jest tests.

**Tech Stack:** Next.js 16, TypeScript, Prisma/PostgreSQL, Zod validation, Claude Haiku API, Resend, Stripe

---

## Phase 1: Infrastructure (Zod Scraper Resilience)

### Task 1.1: Add Zod Dependency

**Files:**
- Modify: `package.json`

**Step 1: Install zod**

```bash
npm install zod
```

**Step 2: Verify installation**

```bash
npm ls zod
```

Expected: `zod@3.x.x` in output

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add zod for schema validation"
```

---

### Task 1.2: Create MTA Alert Schema

**Files:**
- Create: `src/lib/schemas/mta-alert.schema.ts`
- Test: `src/lib/schemas/__tests__/mta-alert.schema.test.ts`

**Step 1: Write the failing test**

Create `src/lib/schemas/__tests__/mta-alert.schema.test.ts`:

```typescript
import { MtaAlertSchema } from "../mta-alert.schema";

describe("MtaAlertSchema", () => {
  it("validates a valid MTA alert", () => {
    const validAlert = {
      id: "alert-123",
      header: "L train delays",
      description: "Due to signal problems",
      affectedLines: ["L"],
      activePeriod: { start: 1704067200, end: 1704153600 },
    };

    const result = MtaAlertSchema.safeParse(validAlert);
    expect(result.success).toBe(true);
  });

  it("rejects alert with empty affectedLines", () => {
    const invalidAlert = {
      id: "alert-123",
      header: "L train delays",
      affectedLines: [],
    };

    const result = MtaAlertSchema.safeParse(invalidAlert);
    expect(result.success).toBe(false);
  });

  it("rejects alert with missing header", () => {
    const invalidAlert = {
      id: "alert-123",
      affectedLines: ["L"],
    };

    const result = MtaAlertSchema.safeParse(invalidAlert);
    expect(result.success).toBe(false);
  });

  it("allows optional description and activePeriod", () => {
    const minimalAlert = {
      id: "alert-123",
      header: "Service advisory",
      affectedLines: ["G"],
    };

    const result = MtaAlertSchema.safeParse(minimalAlert);
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/schemas/__tests__/mta-alert.schema.test.ts
```

Expected: FAIL with "Cannot find module '../mta-alert.schema'"

**Step 3: Write minimal implementation**

Create `src/lib/schemas/mta-alert.schema.ts`:

```typescript
import { z } from "zod";

export const MtaAlertSchema = z.object({
  id: z.string(),
  header: z.string().min(1),
  description: z.string().optional(),
  affectedLines: z.array(z.string()).min(1),
  activePeriod: z
    .object({
      start: z.number(),
      end: z.number().optional(),
    })
    .optional(),
});

export type MtaAlert = z.infer<typeof MtaAlertSchema>;
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/schemas/__tests__/mta-alert.schema.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/schemas/
git commit -m "feat: add Zod schema for MTA alerts"
```

---

### Task 1.3: Create Sample Sale Schema

**Files:**
- Create: `src/lib/schemas/sample-sale.schema.ts`
- Test: `src/lib/schemas/__tests__/sample-sale.schema.test.ts`

**Step 1: Write the failing test**

Create `src/lib/schemas/__tests__/sample-sale.schema.test.ts`:

```typescript
import { SampleSaleSchema } from "../sample-sale.schema";

describe("SampleSaleSchema", () => {
  it("validates a valid sample sale", () => {
    const validSale = {
      id: "260-theory-jan-15-18-2026",
      brand: "Theory",
      location: "260 Fifth Avenue",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-01-18"),
      url: "https://260samplesale.com/theory",
    };

    const result = SampleSaleSchema.safeParse(validSale);
    expect(result.success).toBe(true);
  });

  it("rejects sale with empty brand", () => {
    const invalidSale = {
      id: "260-test",
      brand: "",
      location: "260 Fifth Avenue",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-01-18"),
      url: "https://260samplesale.com",
    };

    const result = SampleSaleSchema.safeParse(invalidSale);
    expect(result.success).toBe(false);
  });

  it("allows optional description", () => {
    const saleWithDesc = {
      id: "260-hermes",
      brand: "Hermès",
      location: "260 Fifth Avenue",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-01-18"),
      description: "Up to 70% off",
      url: "https://260samplesale.com/hermes",
    };

    const result = SampleSaleSchema.safeParse(saleWithDesc);
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/schemas/__tests__/sample-sale.schema.test.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `src/lib/schemas/sample-sale.schema.ts`:

```typescript
import { z } from "zod";

export const SampleSaleSchema = z.object({
  id: z.string(),
  brand: z.string().min(1),
  location: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string().optional(),
  url: z.string().url(),
});

export type SampleSale = z.infer<typeof SampleSaleSchema>;
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/schemas/__tests__/sample-sale.schema.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/schemas/
git commit -m "feat: add Zod schema for sample sales"
```

---

### Task 1.4: Create Housing Listing Schema

**Files:**
- Create: `src/lib/schemas/housing-listing.schema.ts`
- Test: `src/lib/schemas/__tests__/housing-listing.schema.test.ts`

**Step 1: Write the failing test**

Create `src/lib/schemas/__tests__/housing-listing.schema.test.ts`:

```typescript
import { HousingListingSchema } from "../housing-listing.schema";

describe("HousingListingSchema", () => {
  it("validates a valid housing listing", () => {
    const validListing = {
      id: "hc-12345",
      title: "Affordable Housing at 123 Main St",
      borough: "Brooklyn",
      neighborhood: "Williamsburg",
      deadline: new Date("2026-02-15"),
      incomeBrackets: ["50-80", "80-100"],
      url: "https://housingconnect.nyc.gov/12345",
    };

    const result = HousingListingSchema.safeParse(validListing);
    expect(result.success).toBe(true);
  });

  it("rejects listing without deadline", () => {
    const invalidListing = {
      id: "hc-12345",
      title: "Affordable Housing",
      borough: "Brooklyn",
      incomeBrackets: ["50-80"],
      url: "https://housingconnect.nyc.gov/12345",
    };

    const result = HousingListingSchema.safeParse(invalidListing);
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/schemas/__tests__/housing-listing.schema.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/lib/schemas/housing-listing.schema.ts`:

```typescript
import { z } from "zod";

export const HousingListingSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  borough: z.string(),
  neighborhood: z.string().optional(),
  deadline: z.date(),
  incomeBrackets: z.array(z.string()),
  url: z.string().url(),
  bedrooms: z.number().optional(),
  rent: z.number().optional(),
});

export type HousingListing = z.infer<typeof HousingListingSchema>;
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/schemas/__tests__/housing-listing.schema.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/schemas/
git commit -m "feat: add Zod schema for housing listings"
```

---

### Task 1.5: Create Scraper Alert Service

**Files:**
- Create: `src/lib/scraper-alerts.ts`
- Test: `src/lib/schemas/__tests__/scraper-alerts.test.ts`

**Step 1: Write the failing test**

Create `src/lib/schemas/__tests__/scraper-alerts.test.ts`:

```typescript
import { buildScraperAlertEmail, ScraperError } from "../../scraper-alerts";

describe("buildScraperAlertEmail", () => {
  it("builds email with error details", () => {
    const errors: ScraperError[] = [
      {
        source: "mta",
        payload: { id: "123", header: null },
        error: "Expected string, received null at header",
        timestamp: new Date("2026-01-04T10:00:00Z"),
      },
    ];

    const email = buildScraperAlertEmail("mta", errors);

    expect(email.subject).toContain("[CityPing] Scraper Validation Failures");
    expect(email.subject).toContain("mta");
    expect(email.subject).toContain("1 error");
    expect(email.html).toContain("header");
    expect(email.html).toContain("Expected string");
  });

  it("pluralizes errors correctly", () => {
    const errors: ScraperError[] = [
      { source: "mta", payload: {}, error: "Error 1", timestamp: new Date() },
      { source: "mta", payload: {}, error: "Error 2", timestamp: new Date() },
      { source: "mta", payload: {}, error: "Error 3", timestamp: new Date() },
    ];

    const email = buildScraperAlertEmail("mta", errors);

    expect(email.subject).toContain("3 errors");
  });

  it("limits payload samples to 3", () => {
    const errors: ScraperError[] = Array.from({ length: 10 }, (_, i) => ({
      source: "mta",
      payload: { id: `error-${i}` },
      error: `Error ${i}`,
      timestamp: new Date(),
    }));

    const email = buildScraperAlertEmail("mta", errors);

    // Should only show first 3 samples
    expect(email.html).toContain("error-0");
    expect(email.html).toContain("error-1");
    expect(email.html).toContain("error-2");
    expect(email.html).not.toContain("error-9");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/schemas/__tests__/scraper-alerts.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/lib/scraper-alerts.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ScraperError {
  source: string;
  payload: unknown;
  error: string;
  timestamp: Date;
}

export function buildScraperAlertEmail(
  source: string,
  errors: ScraperError[]
): { subject: string; html: string } {
  const errorCount = errors.length;
  const errorWord = errorCount === 1 ? "error" : "errors";
  const subject = `[CityPing] Scraper Validation Failures - ${source} (${errorCount} ${errorWord})`;

  const samples = errors.slice(0, 3);
  const samplesHtml = samples
    .map(
      (e) => `
      <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <strong>Error:</strong> ${escapeHtml(e.error)}<br>
        <strong>Payload:</strong>
        <pre style="background: #eee; padding: 8px; overflow-x: auto;">${escapeHtml(
          JSON.stringify(e.payload, null, 2)
        )}</pre>
      </div>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #c00;">Scraper Validation Failures</h1>
      <p><strong>Source:</strong> ${escapeHtml(source)}</p>
      <p><strong>Errors:</strong> ${errorCount}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>

      <h2>Sample Failures (first 3):</h2>
      ${samplesHtml}

      <p style="color: #666; font-size: 12px; margin-top: 24px;">
        This alert was sent because scraper validation failed. Check the data source for schema changes.
      </p>
    </body>
    </html>
  `;

  return { subject, html };
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendScraperAlert(
  source: string,
  errors: ScraperError[]
): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) {
    console.error("[ScraperAlert] ADMIN_ALERT_EMAIL not configured");
    return;
  }

  const { subject, html } = buildScraperAlertEmail(source, errors);

  try {
    await resend.emails.send({
      from: "CityPing Alerts <alerts@cityping.com>",
      to: adminEmail,
      subject,
      html,
    });
    console.log(`[ScraperAlert] Sent alert for ${source}: ${errors.length} errors`);
  } catch (error) {
    console.error("[ScraperAlert] Failed to send alert:", error);
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/schemas/__tests__/scraper-alerts.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/scraper-alerts.ts src/lib/schemas/__tests__/scraper-alerts.test.ts
git commit -m "feat: add scraper alert email service"
```

---

### Task 1.6: Integrate Zod Validation into MTA Scraper

**Files:**
- Modify: `src/lib/scrapers/mta.ts`
- Modify: `src/lib/scrapers/__tests__/mta.test.ts`

**Step 1: Add validation test**

Add to `src/lib/scrapers/__tests__/mta.test.ts`:

```typescript
import { validateAndFilterAlerts } from "../mta";

describe("validateAndFilterAlerts", () => {
  it("returns valid alerts and collects errors", () => {
    const rawAlerts = [
      { id: "1", header: "Valid alert", affectedLines: ["L"] },
      { id: "2", header: "", affectedLines: ["G"] }, // Invalid: empty header
      { id: "3", header: "Another valid", affectedLines: ["A"] },
    ];

    const { valid, errors } = validateAndFilterAlerts(rawAlerts);

    expect(valid).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0].payload).toEqual(rawAlerts[1]);
  });

  it("handles completely malformed data", () => {
    const rawAlerts = [
      { garbage: true },
      null,
      { id: "1", header: "Valid", affectedLines: ["L"] },
    ];

    const { valid, errors } = validateAndFilterAlerts(rawAlerts as any);

    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/scrapers/__tests__/mta.test.ts -t "validateAndFilterAlerts"
```

Expected: FAIL

**Step 3: Add validation function to mta.ts**

Add to `src/lib/scrapers/mta.ts` (after imports):

```typescript
import { MtaAlertSchema, MtaAlert } from "../schemas/mta-alert.schema";
import { sendScraperAlert, ScraperError } from "../scraper-alerts";

export function validateAndFilterAlerts(rawAlerts: unknown[]): {
  valid: MtaAlert[];
  errors: ScraperError[];
} {
  const valid: MtaAlert[] = [];
  const errors: ScraperError[] = [];

  for (const raw of rawAlerts) {
    const result = MtaAlertSchema.safeParse(raw);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        source: "mta",
        payload: raw,
        error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        timestamp: new Date(),
      });
    }
  }

  return { valid, errors };
}
```

**Step 4: Update ingestMtaAlerts to use validation**

Modify the `ingestMtaAlerts` function in `src/lib/scrapers/mta.ts`:

```typescript
export async function ingestMtaAlerts(): Promise<{
  created: number;
  skipped: number;
}> {
  const source = await prisma.alertSource.findUnique({
    where: { slug: "mta-subway-alerts" },
    include: { module: true },
  });

  if (!source) {
    throw new Error("MTA alert source not configured");
  }

  // Fetch raw alerts
  const rawAlerts = await fetchMtaAlerts();

  // Validate with Zod - partial ingestion
  const { valid: alerts, errors } = validateAndFilterAlerts(rawAlerts);

  // Send alert email if any validation errors
  if (errors.length > 0) {
    await sendScraperAlert("mta", errors);
  }

  let created = 0;
  let skipped = 0;

  // Process only valid alerts
  for (const alert of alerts) {
    // ... rest of existing logic unchanged
  }

  // ... rest unchanged
}
```

**Step 5: Run tests**

```bash
npm test -- src/lib/scrapers/__tests__/mta.test.ts
```

Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/lib/scrapers/mta.ts src/lib/scrapers/__tests__/mta.test.ts
git commit -m "feat: integrate Zod validation into MTA scraper"
```

---

### Task 1.7: Add ADMIN_ALERT_EMAIL to Environment

**Files:**
- Modify: `.env.example`

**Step 1: Add environment variable**

Add to `.env.example`:

```
# Scraper Alerts
ADMIN_ALERT_EMAIL=your-email@example.com
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add ADMIN_ALERT_EMAIL to env example"
```

---

## Phase 2: Hype Level Scoring

### Task 2.1: Add Schema Fields for Hype Score

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add fields to AlertEvent model**

Add to `AlertEvent` model in `prisma/schema.prisma`:

```prisma
model AlertEvent {
  // ... existing fields

  hypeScore      Int?      @map("hype_score")  // 0-100
  hypeFactors    Json?     @map("hype_factors") // { brandTier: 80, scarcity: +15, aiAdj: +5 }

  // ... existing relations
}
```

**Step 2: Generate migration**

```bash
npx prisma migrate dev --name add_hype_score_fields
```

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add hype score fields to AlertEvent schema"
```

---

### Task 2.2: Create Brand Tier Lookup

**Files:**
- Create: `src/lib/brand-tiers.ts`
- Test: `src/lib/__tests__/brand-tiers.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/brand-tiers.test.ts`:

```typescript
import { getBrandTier, getBrandScore } from "../brand-tiers";

describe("brand-tiers", () => {
  describe("getBrandTier", () => {
    it("returns luxury for Hermès", () => {
      expect(getBrandTier("Hermès")).toBe("luxury");
      expect(getBrandTier("hermes")).toBe("luxury");
      expect(getBrandTier("HERMES")).toBe("luxury");
    });

    it("returns designer for Alexander Wang", () => {
      expect(getBrandTier("Alexander Wang")).toBe("designer");
    });

    it("returns contemporary for Theory", () => {
      expect(getBrandTier("Theory")).toBe("contemporary");
    });

    it("returns unknown for unrecognized brands", () => {
      expect(getBrandTier("Random Brand XYZ")).toBe("unknown");
    });
  });

  describe("getBrandScore", () => {
    it("returns 95 for luxury brands", () => {
      expect(getBrandScore("Hermès")).toBe(95);
    });

    it("returns 75 for designer brands", () => {
      expect(getBrandScore("Alexander Wang")).toBe(75);
    });

    it("returns 55 for contemporary brands", () => {
      expect(getBrandScore("Theory")).toBe(55);
    });

    it("returns 40 for unknown brands", () => {
      expect(getBrandScore("Unknown Brand")).toBe(40);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/__tests__/brand-tiers.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/lib/brand-tiers.ts`:

```typescript
export type BrandTier = "luxury" | "designer" | "contemporary" | "fast_fashion" | "unknown";

const BRAND_TIERS: Record<string, BrandTier> = {
  // Luxury (90-100)
  "hermes": "luxury",
  "hermès": "luxury",
  "chanel": "luxury",
  "louis vuitton": "luxury",
  "brunello cucinelli": "luxury",
  "bottega veneta": "luxury",
  "celine": "luxury",
  "prada": "luxury",
  "gucci": "luxury",
  "dior": "luxury",

  // Designer (70-89)
  "proenza schouler": "designer",
  "the row": "designer",
  "alexander wang": "designer",
  "phillip lim": "designer",
  "3.1 phillip lim": "designer",
  "jason wu": "designer",
  "derek lam": "designer",
  "helmut lang": "designer",
  "marc jacobs": "designer",
  "stella mccartney": "designer",

  // Contemporary (50-69)
  "theory": "contemporary",
  "vince": "contemporary",
  "rag & bone": "contemporary",
  "equipment": "contemporary",
  "joie": "contemporary",
  "allsaints": "contemporary",
  "sandro": "contemporary",
  "maje": "contemporary",
  "reiss": "contemporary",
  "club monaco": "contemporary",

  // Fast Fashion (30-49)
  "zara": "fast_fashion",
  "h&m": "fast_fashion",
  "cos": "fast_fashion",
  "& other stories": "fast_fashion",
  "mango": "fast_fashion",
  "uniqlo": "fast_fashion",
};

const TIER_SCORES: Record<BrandTier, number> = {
  luxury: 95,
  designer: 75,
  contemporary: 55,
  fast_fashion: 40,
  unknown: 40,
};

export function getBrandTier(brand: string): BrandTier {
  const normalized = brand.toLowerCase().trim();
  return BRAND_TIERS[normalized] ?? "unknown";
}

export function getBrandScore(brand: string): number {
  const tier = getBrandTier(brand);
  return TIER_SCORES[tier];
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/brand-tiers.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/brand-tiers.ts src/lib/__tests__/brand-tiers.test.ts
git commit -m "feat: add brand tier lookup for hype scoring"
```

---

### Task 2.3: Create Hype Scoring Service

**Files:**
- Create: `src/lib/hype-scoring.ts`
- Test: `src/lib/__tests__/hype-scoring.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/hype-scoring.test.ts`:

```typescript
import { calculateHypeScore, detectScarcitySignals } from "../hype-scoring";

describe("hype-scoring", () => {
  describe("detectScarcitySignals", () => {
    it("detects 'one day only'", () => {
      const signals = detectScarcitySignals("One day only! Hermès sample sale");
      expect(signals.oneDay).toBe(true);
      expect(signals.bonus).toBeGreaterThan(0);
    });

    it("detects 'first 100 customers'", () => {
      const signals = detectScarcitySignals("First 100 customers get extra 20% off");
      expect(signals.limitedQuantity).toBe(true);
    });

    it("detects deep discounts", () => {
      const signals = detectScarcitySignals("Up to 80% off retail");
      expect(signals.deepDiscount).toBe(true);
    });

    it("returns zero bonus for generic text", () => {
      const signals = detectScarcitySignals("Sample sale this weekend");
      expect(signals.bonus).toBe(0);
    });
  });

  describe("calculateHypeScore", () => {
    it("calculates score for luxury brand with scarcity", () => {
      const score = calculateHypeScore("Hermès", "One day only! Up to 70% off");
      expect(score.baseScore).toBe(95);
      expect(score.scarcityBonus).toBeGreaterThan(0);
      expect(score.finalScore).toBeGreaterThanOrEqual(95);
      expect(score.finalScore).toBeLessThanOrEqual(100);
    });

    it("calculates score for unknown brand", () => {
      const score = calculateHypeScore("Random Brand", "Sample sale");
      expect(score.baseScore).toBe(40);
      expect(score.finalScore).toBe(40);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/__tests__/hype-scoring.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/lib/hype-scoring.ts`:

```typescript
import { getBrandScore } from "./brand-tiers";

export interface ScarcitySignals {
  oneDay: boolean;
  limitedQuantity: boolean;
  vipAccess: boolean;
  deepDiscount: boolean;
  bonus: number;
}

export interface HypeScoreResult {
  baseScore: number;
  scarcityBonus: number;
  aiAdjustment: number;
  finalScore: number;
  factors: {
    brandTier: number;
    scarcity: number;
    ai: number;
  };
}

export function detectScarcitySignals(description: string): ScarcitySignals {
  const text = description.toLowerCase();

  const oneDay = /one day only|single day|today only/.test(text);
  const limitedQuantity = /first \d+|limited quantities|while supplies last/.test(text);
  const vipAccess = /vip|early access|preview|exclusive/.test(text);
  const deepDiscount = /[78][0-9]% off|80% off|90% off/.test(text);

  let bonus = 0;
  if (oneDay) bonus += 15;
  if (limitedQuantity) bonus += 10;
  if (vipAccess) bonus += 10;
  if (deepDiscount) bonus += 5;

  return { oneDay, limitedQuantity, vipAccess, deepDiscount, bonus };
}

export function calculateHypeScore(
  brand: string,
  description: string,
  aiAdjustment: number = 0
): HypeScoreResult {
  const baseScore = getBrandScore(brand);
  const scarcity = detectScarcitySignals(description || "");

  // Clamp final score to 0-100
  const rawScore = baseScore + scarcity.bonus + aiAdjustment;
  const finalScore = Math.max(0, Math.min(100, rawScore));

  return {
    baseScore,
    scarcityBonus: scarcity.bonus,
    aiAdjustment,
    finalScore,
    factors: {
      brandTier: baseScore,
      scarcity: scarcity.bonus,
      ai: aiAdjustment,
    },
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/hype-scoring.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/hype-scoring.ts src/lib/__tests__/hype-scoring.test.ts
git commit -m "feat: add hype scoring service with scarcity detection"
```

---

### Task 2.4: Add AI Adjustment via Claude Haiku

**Files:**
- Modify: `src/lib/hype-scoring.ts`
- Test: `src/lib/__tests__/hype-scoring.test.ts`

**Step 1: Add AI adjustment test**

Add to `src/lib/__tests__/hype-scoring.test.ts`:

```typescript
import { getAiHypeAdjustment } from "../hype-scoring";

describe("getAiHypeAdjustment", () => {
  it("returns adjustment between -20 and +20", async () => {
    // This test uses a mock - real API calls tested in integration
    const adjustment = await getAiHypeAdjustment("Theory", "Sample sale this weekend", 55);
    expect(adjustment).toBeGreaterThanOrEqual(-20);
    expect(adjustment).toBeLessThanOrEqual(20);
  });
});
```

**Step 2: Add AI function to hype-scoring.ts**

Add to `src/lib/hype-scoring.ts`:

```typescript
export async function getAiHypeAdjustment(
  brand: string,
  description: string,
  baseScore: number
): Promise<number> {
  // Skip AI call in test environment or if no API key
  if (process.env.NODE_ENV === "test" || !process.env.ANTHROPIC_API_KEY) {
    return 0;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `Given this sample sale: "${brand}" - "${description}"
Base score: ${baseScore}

Adjust -20 to +20 based on:
- Scarcity signals ("one day only", "first 100 customers"): +5 to +15
- Deep discounts ("80% off"): +5 to +10
- VIP/early access: +10
- Multi-day/generic: -5 to -10

Return ONLY a JSON object: { "adjustment": <number>, "reason": "<brief>" }`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const parsed = JSON.parse(text);

    // Clamp to valid range
    const adjustment = Math.max(-20, Math.min(20, parsed.adjustment || 0));
    return adjustment;
  } catch (error) {
    console.error("[HypeScoring] AI adjustment failed:", error);
    return 0;
  }
}

export async function calculateHypeScoreWithAi(
  brand: string,
  description: string
): Promise<HypeScoreResult> {
  const baseScore = getBrandScore(brand);
  const scarcity = detectScarcitySignals(description || "");
  const aiAdjustment = await getAiHypeAdjustment(brand, description, baseScore);

  const rawScore = baseScore + scarcity.bonus + aiAdjustment;
  const finalScore = Math.max(0, Math.min(100, rawScore));

  return {
    baseScore,
    scarcityBonus: scarcity.bonus,
    aiAdjustment,
    finalScore,
    factors: {
      brandTier: baseScore,
      scarcity: scarcity.bonus,
      ai: aiAdjustment,
    },
  };
}
```

**Step 3: Run tests**

```bash
npm test -- src/lib/__tests__/hype-scoring.test.ts
```

Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/lib/hype-scoring.ts src/lib/__tests__/hype-scoring.test.ts
git commit -m "feat: add Claude Haiku AI adjustment for hype scoring"
```

---

### Task 2.5: Integrate Hype Scoring into Sample Sales Scraper

**Files:**
- Modify: `src/lib/scrapers/sample-sales.ts`

**Step 1: Import and use hype scoring**

Modify `src/lib/scrapers/sample-sales.ts` to calculate hype score when creating events:

```typescript
import { calculateHypeScoreWithAi } from "../hype-scoring";

// In ingestSampleSales function, after creating the event:
export async function ingestSampleSales(): Promise<{
  created: number;
  skipped: number;
}> {
  // ... existing source lookup and fetch code ...

  for (const sale of sales) {
    const existing = await prisma.alertEvent.findUnique({
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

    // Calculate hype score
    const hypeResult = await calculateHypeScoreWithAi(
      sale.brand,
      sale.description || ""
    );

    const event = await prisma.alertEvent.create({
      data: {
        sourceId: source.id,
        externalId: sale.id,
        title: `${sale.brand} Sample Sale`,
        body: `${sale.location}\n${sale.startDate.toLocaleDateString()} - ${sale.endDate.toLocaleDateString()}`,
        startsAt: sale.startDate,
        endsAt: sale.endDate,
        neighborhoods: ["manhattan"],
        hypeScore: hypeResult.finalScore,
        hypeFactors: hypeResult.factors,
        metadata: {
          brands: [sale.brand.toLowerCase()],
          location: sale.location,
          url: sale.url,
        },
      },
      include: {
        source: { include: { module: true } },
      },
    });

    await matchEventToUsers(event as unknown as MatchableEvent & { id: string });
    created++;
  }

  // ... rest unchanged
}
```

**Step 2: Run existing tests**

```bash
npm test -- src/lib/scrapers/__tests__/sample-sales.test.ts
```

**Step 3: Commit**

```bash
git add src/lib/scrapers/sample-sales.ts
git commit -m "feat: integrate hype scoring into sample sales scraper"
```

---

## Phase 3: Feedback Loop

### Task 3.1: Add Feedback Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add FeedbackEvent model**

Add to `prisma/schema.prisma`:

```prisma
model FeedbackEvent {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  eventId   String   @map("event_id")
  moduleId  String   @map("module_id")
  rating    Int      // +1 (thumbs up) or -1 (thumbs down)
  zipCode   String   @map("zip_code")
  createdAt DateTime @default(now()) @map("created_at")

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  event AlertEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([userId, eventId])
  @@index([zipCode, moduleId])
  @@map("feedback_events")
}
```

Also add relation to User and AlertEvent models:

```prisma
model User {
  // ... existing
  feedback      FeedbackEvent[]
}

model AlertEvent {
  // ... existing
  feedback      FeedbackEvent[]
}
```

**Step 2: Generate migration**

```bash
npx prisma migrate dev --name add_feedback_events
```

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add FeedbackEvent schema for user feedback"
```

---

### Task 3.2: Create Feedback API Endpoint

**Files:**
- Create: `src/app/api/feedback/route.ts`
- Test: `__tests__/api/feedback.test.ts`

**Step 1: Write the failing test**

Create `__tests__/api/feedback.test.ts`:

```typescript
import { GET } from "@/app/api/feedback/route";
import { prisma } from "@/lib/db";

// Mock prisma
jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    alertEvent: { findUnique: jest.fn() },
    feedbackEvent: { upsert: jest.fn() },
  },
}));

describe("GET /api/feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records positive feedback and redirects", async () => {
    const mockUser = { id: "user-1", zipCode: "11211" };
    const mockEvent = { id: "event-1", source: { moduleId: "food" } };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.alertEvent.findUnique as jest.Mock).mockResolvedValue(mockEvent);
    (prisma.feedbackEvent.upsert as jest.Mock).mockResolvedValue({});

    const request = new Request(
      "http://localhost/api/feedback?u=user-1&e=event-1&r=1"
    );
    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(prisma.feedbackEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_eventId: { userId: "user-1", eventId: "event-1" } },
        create: expect.objectContaining({ rating: 1 }),
      })
    );
  });

  it("returns 400 for missing parameters", async () => {
    const request = new Request("http://localhost/api/feedback?u=user-1");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/api/feedback.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/app/api/feedback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("u");
  const eventId = searchParams.get("e");
  const rating = parseInt(searchParams.get("r") || "0", 10);

  if (!userId || !eventId || (rating !== 1 && rating !== -1)) {
    return NextResponse.json(
      { error: "Missing or invalid parameters" },
      { status: 400 }
    );
  }

  try {
    // Get user and event
    const [user, event] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.alertEvent.findUnique({
        where: { id: eventId },
        include: { source: true },
      }),
    ]);

    if (!user || !event) {
      return NextResponse.json(
        { error: "User or event not found" },
        { status: 404 }
      );
    }

    // Upsert feedback (allows changing vote)
    await prisma.feedbackEvent.upsert({
      where: {
        userId_eventId: { userId, eventId },
      },
      create: {
        userId,
        eventId,
        moduleId: event.source.moduleId,
        rating,
        zipCode: user.zipCode,
      },
      update: {
        rating,
      },
    });

    // Redirect to thank you page
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const thankYouUrl = `${baseUrl}/feedback/thanks?r=${rating}`;

    return NextResponse.redirect(thankYouUrl, 302);
  } catch (error) {
    console.error("[Feedback] Error recording feedback:", error);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/api/feedback.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/app/api/feedback/ __tests__/api/feedback.test.ts
git commit -m "feat: add feedback API endpoint"
```

---

### Task 3.3: Create Feedback Thank You Page

**Files:**
- Create: `src/app/feedback/thanks/page.tsx`

**Step 1: Create the page**

Create `src/app/feedback/thanks/page.tsx`:

```typescript
export default function FeedbackThanksPage({
  searchParams,
}: {
  searchParams: { r?: string };
}) {
  const rating = searchParams.r === "1" ? "positive" : "negative";
  const emoji = rating === "positive" ? "👍" : "👎";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">{emoji}</div>
        <h1 className="text-2xl font-bold mb-2">Thanks for the feedback!</h1>
        <p className="text-gray-600">
          Your input helps us improve CityPing for everyone.
        </p>
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/feedback/
git commit -m "feat: add feedback thank you page"
```

---

### Task 3.4: Add Feedback Links to Email Digest

**Files:**
- Modify: `src/lib/email-digest.ts`

**Step 1: Update buildDigestHtml to include feedback links**

Modify `src/lib/email-digest.ts`:

```typescript
export function buildDigestHtml(
  events: GroupedEvents,
  userName?: string,
  userId?: string  // Add userId parameter
): string {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const sections = Object.entries(events)
    .map(([moduleId, moduleEvents]) => {
      const module = moduleEvents[0]?.source.module;
      if (!module) return "";

      const eventItems = moduleEvents
        .map((e) => {
          const feedbackLinks = userId
            ? `
              <td style="width: 60px; text-align: right; white-space: nowrap;">
                <a href="${appBaseUrl}/api/feedback?u=${userId}&e=${e.id}&r=1" style="text-decoration: none;">👍</a>
                &nbsp;
                <a href="${appBaseUrl}/api/feedback?u=${userId}&e=${e.id}&r=-1" style="text-decoration: none;">👎</a>
              </td>
            `
            : "";

          return `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                <strong>${escapeHtml(e.title)}</strong>
                ${e.body ? `<br><span style="color: #666;">${escapeHtml(e.body)}</span>` : ""}
              </td>
              ${feedbackLinks}
            </tr>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 12px 0;">
            ${module.icon} ${escapeHtml(module.name)} (${moduleEvents.length})
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${eventItems}
          </table>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  // ... rest of the function unchanged
}
```

**Step 2: Update callers to pass userId**

Update `src/app/api/jobs/send-daily-digest/route.ts` to pass userId when calling buildDigestHtml.

**Step 3: Run tests**

```bash
npm test -- __tests__/email-digest.test.ts
```

**Step 4: Commit**

```bash
git add src/lib/email-digest.ts
git commit -m "feat: add feedback links to email digest"
```

---

### Task 3.5: Create Feedback Aggregation Job

**Files:**
- Create: `src/app/api/jobs/aggregate-feedback/route.ts`

**Step 1: Create the aggregation job**

Create `src/app/api/jobs/aggregate-feedback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Aggregate feedback by zip code and module
    const aggregations = await prisma.feedbackEvent.groupBy({
      by: ["zipCode", "moduleId"],
      _count: { rating: true },
      _sum: { rating: true },
      having: {
        rating: { _count: { gte: 10 } }, // Minimum 10 feedback events
      },
    });

    const insights: Array<{
      zipCode: string;
      moduleId: string;
      totalFeedback: number;
      netScore: number;
      sentiment: "positive" | "negative" | "neutral";
    }> = [];

    for (const agg of aggregations) {
      const total = agg._count.rating;
      const net = agg._sum.rating || 0;
      const ratio = net / total;

      let sentiment: "positive" | "negative" | "neutral" = "neutral";
      if (ratio > 0.4) sentiment = "positive";
      if (ratio < -0.4) sentiment = "negative";

      insights.push({
        zipCode: agg.zipCode,
        moduleId: agg.moduleId,
        totalFeedback: total,
        netScore: net,
        sentiment,
      });
    }

    // Log insights for now - future: update ZIP_PROFILES weights
    console.log("[FeedbackAggregation] Insights:", JSON.stringify(insights, null, 2));

    return NextResponse.json({
      success: true,
      aggregations: insights.length,
      insights,
    });
  } catch (error) {
    console.error("[FeedbackAggregation] Error:", error);
    return NextResponse.json(
      { error: "Aggregation failed" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/jobs/aggregate-feedback/
git commit -m "feat: add feedback aggregation cron job"
```

---

## Phase 4: Morning Commute

### Task 4.1: Create Station Mapping

**Files:**
- Create: `src/lib/stations.ts`
- Test: `src/lib/__tests__/stations.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/stations.test.ts`:

```typescript
import { getStationForZip, getNearestStation } from "../stations";

describe("stations", () => {
  describe("getStationForZip", () => {
    it("returns Bedford Ave for 11211", () => {
      const station = getStationForZip("11211");
      expect(station?.primary).toBe("Bedford Ave");
      expect(station?.lines).toContain("L");
    });

    it("returns null for unknown zip", () => {
      const station = getStationForZip("99999");
      expect(station).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/__tests__/stations.test.ts
```

**Step 3: Write minimal implementation**

Create `src/lib/stations.ts`:

```typescript
export interface StationInfo {
  primary: string;
  lines: string[];
  lat: number;
  lng: number;
}

export const ZIP_STATIONS: Record<string, StationInfo> = {
  // Williamsburg
  "11211": { primary: "Bedford Ave", lines: ["L"], lat: 40.717, lng: -73.957 },
  "11249": { primary: "Lorimer St", lines: ["L", "G"], lat: 40.714, lng: -73.950 },

  // Greenpoint
  "11222": { primary: "Greenpoint Ave", lines: ["G"], lat: 40.731, lng: -73.954 },

  // Bushwick
  "11206": { primary: "Morgan Ave", lines: ["L"], lat: 40.706, lng: -73.933 },
  "11237": { primary: "Jefferson St", lines: ["L"], lat: 40.706, lng: -73.923 },

  // Downtown Brooklyn
  "11201": { primary: "Borough Hall", lines: ["2", "3", "4", "5", "R"], lat: 40.693, lng: -73.990 },

  // Park Slope
  "11215": { primary: "7th Ave", lines: ["F", "G"], lat: 40.666, lng: -73.980 },
  "11217": { primary: "Atlantic Ave-Barclays", lines: ["2", "3", "4", "5", "B", "D", "N", "Q", "R"], lat: 40.684, lng: -73.978 },

  // Chelsea
  "10001": { primary: "23rd St", lines: ["F", "M"], lat: 40.742, lng: -73.993 },
  "10011": { primary: "14th St", lines: ["1", "2", "3", "F", "M", "L"], lat: 40.738, lng: -74.000 },

  // East Village
  "10003": { primary: "Astor Pl", lines: ["6"], lat: 40.730, lng: -73.991 },
  "10009": { primary: "1st Ave", lines: ["L"], lat: 40.731, lng: -73.982 },

  // Upper West Side
  "10024": { primary: "86th St", lines: ["1", "2"], lat: 40.789, lng: -73.976 },
  "10025": { primary: "96th St", lines: ["1", "2", "3"], lat: 40.794, lng: -73.972 },

  // Upper East Side
  "10028": { primary: "86th St", lines: ["4", "5", "6"], lat: 40.779, lng: -73.955 },
  "10021": { primary: "77th St", lines: ["6"], lat: 40.774, lng: -73.960 },

  // Harlem
  "10026": { primary: "125th St", lines: ["2", "3"], lat: 40.808, lng: -73.946 },
  "10027": { primary: "125th St", lines: ["A", "B", "C", "D"], lat: 40.811, lng: -73.953 },

  // Astoria
  "11102": { primary: "Astoria Blvd", lines: ["N", "W"], lat: 40.770, lng: -73.918 },
  "11103": { primary: "30th Ave", lines: ["N", "W"], lat: 40.766, lng: -73.921 },

  // Long Island City
  "11101": { primary: "Queensboro Plaza", lines: ["7", "N", "W"], lat: 40.750, lng: -73.940 },
  "11109": { primary: "Court Sq", lines: ["7", "E", "M", "G"], lat: 40.747, lng: -73.946 },

  // Jackson Heights
  "11372": { primary: "Jackson Heights-Roosevelt Ave", lines: ["7", "E", "F", "M", "R"], lat: 40.755, lng: -73.882 },

  // Flushing
  "11354": { primary: "Flushing-Main St", lines: ["7"], lat: 40.761, lng: -73.830 },
};

export function getStationForZip(zipCode: string): StationInfo | null {
  return ZIP_STATIONS[zipCode] ?? null;
}

export function getNearestStation(zipCode: string): StationInfo | null {
  // For now, just return direct lookup
  // Future: could do geographic nearest neighbor
  return getStationForZip(zipCode);
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/stations.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/stations.ts src/lib/__tests__/stations.test.ts
git commit -m "feat: add zip-to-station mapping for commute alerts"
```

---

### Task 4.2: Create Fallback Routes

**Files:**
- Create: `src/lib/fallback-routes.ts`
- Test: `src/lib/__tests__/fallback-routes.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/fallback-routes.test.ts`:

```typescript
import { getAlternativeLines } from "../fallback-routes";

describe("getAlternativeLines", () => {
  it("returns G, M, J for L train", () => {
    const alternatives = getAlternativeLines("L");
    expect(alternatives).toContain("G");
    expect(alternatives).toContain("M");
  });

  it("returns alternatives for numbered lines", () => {
    const alternatives = getAlternativeLines("1");
    expect(alternatives.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown line", () => {
    const alternatives = getAlternativeLines("XYZ");
    expect(alternatives).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/__tests__/fallback-routes.test.ts
```

**Step 3: Write minimal implementation**

Create `src/lib/fallback-routes.ts`:

```typescript
export const LINE_ALTERNATIVES: Record<string, string[]> = {
  // Brooklyn crosstown / Williamsburg
  "L": ["G", "M", "J", "Z"],
  "G": ["L", "F", "A", "C"],

  // Lexington Ave (East Side)
  "4": ["5", "6", "2", "3"],
  "5": ["4", "6", "2", "3"],
  "6": ["4", "5", "N", "R", "W"],

  // 7th Ave / Broadway (West Side)
  "1": ["2", "3", "A", "C"],
  "2": ["1", "3", "4", "5"],
  "3": ["1", "2", "4", "5"],

  // 8th Ave
  "A": ["C", "E", "1", "2", "3"],
  "C": ["A", "E", "1", "B", "D"],
  "E": ["A", "C", "F", "M"],

  // 6th Ave
  "B": ["D", "F", "M"],
  "D": ["B", "F", "M", "N", "Q"],
  "F": ["B", "D", "M", "E"],
  "M": ["F", "B", "D", "J", "Z"],

  // Broadway (BMT)
  "N": ["Q", "R", "W", "D"],
  "Q": ["N", "R", "B", "D"],
  "R": ["N", "Q", "W"],
  "W": ["N", "R", "Q"],

  // Nassau St / Jamaica
  "J": ["Z", "M", "L"],
  "Z": ["J", "M"],

  // Flushing
  "7": ["N", "W", "E", "F", "M", "R"],

  // Crosstown
  "S": [], // Shuttles have no alternatives
};

export function getAlternativeLines(line: string): string[] {
  return LINE_ALTERNATIVES[line.toUpperCase()] ?? [];
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/fallback-routes.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/fallback-routes.ts src/lib/__tests__/fallback-routes.test.ts
git commit -m "feat: add fallback route alternatives for subway lines"
```

---

### Task 4.3: Create Commute Alert Generator

**Files:**
- Create: `src/lib/commute-alerts.ts`
- Test: `src/lib/__tests__/commute-alerts.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/commute-alerts.test.ts`:

```typescript
import { generateCommuteAlert } from "../commute-alerts";

describe("generateCommuteAlert", () => {
  it("generates personalized alert for user's line", () => {
    const alert = generateCommuteAlert({
      line: "L",
      alertHeader: "Delays due to signal problems",
      userZipCode: "11211",
      vibePreset: "regular",
    });

    expect(alert).toContain("Bedford");
    expect(alert).toContain("G");
  });

  it("returns generic alert for unknown zip", () => {
    const alert = generateCommuteAlert({
      line: "L",
      alertHeader: "Delays",
      userZipCode: "99999",
      vibePreset: "regular",
    });

    expect(alert).toContain("L");
    expect(alert).not.toContain("Bedford");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/__tests__/commute-alerts.test.ts
```

**Step 3: Write minimal implementation**

Create `src/lib/commute-alerts.ts`:

```typescript
import { getStationForZip } from "./stations";
import { getAlternativeLines } from "./fallback-routes";

export type VibePreset = "transplant" | "regular" | "local";

interface CommuteAlertInput {
  line: string;
  alertHeader: string;
  userZipCode: string;
  vibePreset: VibePreset;
}

export function generateCommuteAlert(input: CommuteAlertInput): string {
  const { line, alertHeader, userZipCode, vibePreset } = input;

  const station = getStationForZip(userZipCode);
  const alternatives = getAlternativeLines(line);

  // Check if user's home station is on the affected line
  const isAffected = station?.lines.includes(line.toUpperCase());

  if (!station || !isAffected) {
    // Generic alert for users not directly affected
    return `${line} train: ${alertHeader}`;
  }

  const altText = alternatives.length > 0
    ? `Try the ${alternatives.slice(0, 2).join(" or ")}`
    : "Check for shuttle buses";

  switch (vibePreset) {
    case "transplant":
      return `The ${line} train (which serves ${station.primary}) is experiencing ${alertHeader.toLowerCase()}. ${altText} as an alternative.`;

    case "local":
      return `${line}'s messed up at ${station.primary}. ${altText}.`;

    case "regular":
    default:
      return `${line} delays near ${station.primary}. ${altText}.`;
  }
}

export async function generateCommuteAlertWithAi(
  input: CommuteAlertInput
): Promise<string> {
  // For now, use the template-based version
  // Future: integrate Claude Haiku for more natural copy
  return generateCommuteAlert(input);
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/commute-alerts.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/commute-alerts.ts src/lib/__tests__/commute-alerts.test.ts
git commit -m "feat: add commute alert generator with personalization"
```

---

## Phase 5: Vibe Slider (Schema Only - UI in Separate Task)

### Task 5.1: Add VibePreset to Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add enum and field**

Add to `prisma/schema.prisma`:

```prisma
enum VibePreset {
  transplant
  regular
  local

  @@map("vibe_preset")
}

model User {
  // ... existing fields
  vibePreset   VibePreset  @default(regular) @map("vibe_preset")
}
```

**Step 2: Generate migration**

```bash
npx prisma migrate dev --name add_vibe_preset
```

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add VibePreset enum to User schema"
```

---

### Task 5.2: Create Vibe Prompts

**Files:**
- Create: `src/lib/vibe-prompts.ts`

**Step 1: Create the prompts file**

Create `src/lib/vibe-prompts.ts`:

```typescript
export type VibePreset = "transplant" | "regular" | "local";

export const VIBE_SYSTEM_PROMPTS: Record<VibePreset, string> = {
  transplant: `You're a friendly NYC guide helping someone new to the city.
Explain local knowledge, give context, use encouraging tone.
It's okay to be a bit wordy if it helps understanding.
Use phrases like "Did you know..." and "Pro tip:".`,

  regular: `You're a helpful NYC local giving a friend quick info.
Be clear and efficient, include key context, skip obvious stuff.
Friendly but not verbose. Get to the point.`,

  local: `You're a jaded New Yorker. Terse, no fluff, assume they know the city.
Cynical humor okay. Never explain what the subway is.
If something sucks, say it sucks. Keep it under 20 words when possible.`,
};

export const VIBE_LABELS: Record<VibePreset, { emoji: string; title: string; description: string }> = {
  transplant: {
    emoji: "🌱",
    title: "New to NYC",
    description: "Helpful explanations, local tips, friendly guidance",
  },
  regular: {
    emoji: "🏠",
    title: "Been here a while",
    description: "Clear and efficient, just the essentials",
  },
  local: {
    emoji: "🗽",
    title: "True Local",
    description: "Just the facts, no hand-holding",
  },
};

export function getVibeSystemPrompt(preset: VibePreset): string {
  return VIBE_SYSTEM_PROMPTS[preset] || VIBE_SYSTEM_PROMPTS.regular;
}
```

**Step 2: Commit**

```bash
git add src/lib/vibe-prompts.ts
git commit -m "feat: add vibe preset prompts and labels"
```

---

## Phase 6: Referral Program

### Task 6.1: Add Referral Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add referral fields and model**

Add to `prisma/schema.prisma`:

```prisma
model User {
  // ... existing fields
  referralCode   String    @unique @default(cuid()) @map("referral_code")
  referredBy     String?   @map("referred_by")

  referrals      ReferralEvent[]  @relation("Referrer")
}

model ReferralEvent {
  id             String          @id @default(cuid())
  referrerId     String          @map("referrer_id")
  refereeId      String          @unique @map("referee_id")
  status         ReferralStatus  @default(pending)
  couponId       String?         @map("coupon_id")
  convertedAt    DateTime?       @map("converted_at")
  createdAt      DateTime        @default(now()) @map("created_at")

  referrer       User            @relation("Referrer", fields: [referrerId], references: [id])

  @@map("referral_events")
}

enum ReferralStatus {
  pending
  converted
  redeemed

  @@map("referral_status")
}
```

**Step 2: Generate migration**

```bash
npx prisma migrate dev --name add_referral_program
```

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add referral program schema"
```

---

### Task 6.2: Create Referral Service

**Files:**
- Create: `src/lib/referrals.ts`
- Test: `src/lib/__tests__/referrals.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/referrals.test.ts`:

```typescript
import { createReferralCoupon, processReferralConversion } from "../referrals";

// Mock Stripe
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    coupons: {
      create: jest.fn().mockResolvedValue({ id: "coupon_123" }),
    },
  }));
});

describe("referrals", () => {
  describe("createReferralCoupon", () => {
    it("creates a 100% off coupon", async () => {
      const coupon = await createReferralCoupon("user_123");
      expect(coupon.id).toBe("coupon_123");
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/__tests__/referrals.test.ts
```

**Step 3: Write minimal implementation**

Create `src/lib/referrals.ts`:

```typescript
import Stripe from "stripe";
import { prisma } from "./db";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function createReferralCoupon(referrerId: string): Promise<Stripe.Coupon> {
  const coupon = await stripe.coupons.create({
    percent_off: 100,
    duration: "once",
    max_redemptions: 1,
    metadata: {
      referrer_id: referrerId,
      type: "referral_reward",
    },
  });

  return coupon;
}

export async function processReferralConversion(refereeId: string): Promise<void> {
  // Find the referral event
  const referral = await prisma.referralEvent.findUnique({
    where: { refereeId },
    include: { referrer: true },
  });

  if (!referral || referral.status !== "pending") {
    return;
  }

  // Create coupon for referrer
  const coupon = await createReferralCoupon(referral.referrerId);

  // Update referral event
  await prisma.referralEvent.update({
    where: { id: referral.id },
    data: {
      status: "converted",
      couponId: coupon.id,
      convertedAt: new Date(),
    },
  });

  // Email the referrer
  if (referral.referrer.email) {
    await resend.emails.send({
      from: "CityPing <hello@cityping.com>",
      to: referral.referrer.email,
      subject: "Your friend upgraded! Here's your free month 🎉",
      html: `
        <h1>You earned a free month!</h1>
        <p>Your friend just upgraded to CityPing Premium.</p>
        <p>Use code <strong>${coupon.id}</strong> on your next billing cycle to get one month free.</p>
        <p>Thanks for spreading the word!</p>
      `,
    });
  }
}

export async function createReferralEvent(
  referrerId: string,
  refereeId: string
): Promise<void> {
  await prisma.referralEvent.create({
    data: {
      referrerId,
      refereeId,
      status: "pending",
    },
  });
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/referrals.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/referrals.ts src/lib/__tests__/referrals.test.ts
git commit -m "feat: add referral service with Stripe coupon creation"
```

---

### Task 6.3: Create Referral Landing Page

**Files:**
- Create: `src/app/r/[code]/page.tsx`

**Step 1: Create the page**

Create `src/app/r/[code]/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ReferralPage({
  params,
}: {
  params: { code: string };
}) {
  const { code } = params;

  // Verify referral code exists
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
  });

  if (!referrer) {
    // Invalid code - redirect to normal signup
    redirect("/");
  }

  // Redirect to signup with referral code
  redirect(`/?ref=${code}`);
}
```

**Step 2: Commit**

```bash
git add src/app/r/
git commit -m "feat: add referral landing page"
```

---

### Task 6.4: Update Stripe Webhook for Referral Conversion

**Files:**
- Modify: `src/app/api/webhooks/stripe/route.ts`

**Step 1: Add referral conversion handler**

Add to the Stripe webhook handler in `src/app/api/webhooks/stripe/route.ts`:

```typescript
import { processReferralConversion } from "@/lib/referrals";

// In the webhook handler, add case for subscription creation:
case "customer.subscription.created": {
  const subscription = event.data.object as Stripe.Subscription;

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (user) {
    // Process referral if this user was referred
    await processReferralConversion(user.id);
  }

  break;
}
```

**Step 2: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat: handle referral conversion in Stripe webhook"
```

---

### Task 6.5: Add Referral Link to Email Digest Footer

**Files:**
- Modify: `src/lib/email-digest.ts`

**Step 1: Update buildDigestHtml**

Add referral section to the footer in `src/lib/email-digest.ts`:

```typescript
export function buildDigestHtml(
  events: GroupedEvents,
  userName?: string,
  userId?: string,
  referralCode?: string  // Add parameter
): string {
  // ... existing code ...

  const referralSection = referralCode
    ? `
      <div style="background: #f5f5f5; padding: 16px; margin-top: 24px; border-radius: 8px;">
        <strong>Know someone who'd love CityPing?</strong><br>
        Share your link: <a href="${appBaseUrl}/r/${referralCode}">${appBaseUrl}/r/${referralCode}</a><br>
        <span style="color: #666;">They sign up, you get a free month of Premium.</span>
      </div>
    `
    : "";

  return `
    <!-- ... existing HTML ... -->
    ${referralSection}
    <!-- ... rest of footer ... -->
  `;
}
```

**Step 2: Commit**

```bash
git add src/lib/email-digest.ts
git commit -m "feat: add referral link to email digest footer"
```

---

## Phase 7: Weather Integration

### Task 7.1: Add Venue Fields to Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add venue fields to AlertEvent**

Add to `AlertEvent` model:

```prisma
model AlertEvent {
  // ... existing fields
  venueType    String?   @map("venue_type")  // outdoor, indoor, hybrid, rooftop
  weatherTags  String[]  @map("weather_tags") // ["ac", "heated", "covered", "cozy", "pool"]
}
```

**Step 2: Generate migration**

```bash
npx prisma migrate dev --name add_venue_weather_fields
```

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add venue and weather fields to AlertEvent"
```

---

### Task 7.2: Create Weather Scoring Service

**Files:**
- Create: `src/lib/weather-scoring.ts`
- Test: `src/lib/__tests__/weather-scoring.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/weather-scoring.test.ts`:

```typescript
import { classifyWeather, getWeatherScoreAdjustment } from "../weather-scoring";

describe("weather-scoring", () => {
  describe("classifyWeather", () => {
    it("classifies rainy conditions", () => {
      const condition = classifyWeather({
        temperature: 55,
        precipProbability: 80,
        shortForecast: "Rain likely",
      });
      expect(condition).toBe("rain");
    });

    it("classifies extreme heat", () => {
      const condition = classifyWeather({
        temperature: 95,
        precipProbability: 0,
        shortForecast: "Hot and sunny",
      });
      expect(condition).toBe("extreme_heat");
    });

    it("classifies clear conditions", () => {
      const condition = classifyWeather({
        temperature: 70,
        precipProbability: 10,
        shortForecast: "Mostly sunny",
      });
      expect(condition).toBe("clear");
    });
  });

  describe("getWeatherScoreAdjustment", () => {
    it("penalizes outdoor events in rain", () => {
      const adjustment = getWeatherScoreAdjustment("rain", "outdoor", []);
      expect(adjustment).toBeLessThan(0);
    });

    it("boosts indoor events in rain", () => {
      const adjustment = getWeatherScoreAdjustment("rain", "indoor", []);
      expect(adjustment).toBeGreaterThan(0);
    });

    it("boosts cozy venues in heavy rain", () => {
      const adjustment = getWeatherScoreAdjustment("heavy_rain", "indoor", ["cozy"]);
      expect(adjustment).toBeGreaterThan(10);
    });

    it("boosts AC venues in extreme heat", () => {
      const adjustment = getWeatherScoreAdjustment("extreme_heat", "indoor", ["ac"]);
      expect(adjustment).toBeGreaterThan(20);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/lib/__tests__/weather-scoring.test.ts
```

**Step 3: Write minimal implementation**

Create `src/lib/weather-scoring.ts`:

```typescript
export type WeatherCondition =
  | "clear"
  | "rain"
  | "heavy_rain"
  | "snow"
  | "extreme_cold"
  | "extreme_heat"
  | "poor_air";

export type VenueType = "outdoor" | "indoor" | "hybrid" | "rooftop";

interface WeatherInput {
  temperature: number;
  precipProbability: number;
  shortForecast: string;
  aqi?: number;
}

export function classifyWeather(input: WeatherInput): WeatherCondition {
  const { temperature, precipProbability, shortForecast, aqi } = input;
  const forecast = shortForecast.toLowerCase();

  // Check air quality first
  if (aqi && aqi > 100) return "poor_air";

  // Check for snow
  if (forecast.includes("snow") || forecast.includes("blizzard")) {
    return "snow";
  }

  // Check for rain
  if (precipProbability > 70 || forecast.includes("heavy rain") || forecast.includes("thunderstorm")) {
    return "heavy_rain";
  }
  if (precipProbability > 40 || forecast.includes("rain") || forecast.includes("showers")) {
    return "rain";
  }

  // Check temperature extremes
  if (temperature > 90) return "extreme_heat";
  if (temperature < 20) return "extreme_cold";

  return "clear";
}

const SCORE_MATRIX: Record<WeatherCondition, Record<VenueType, number>> = {
  clear: { outdoor: 0, indoor: 0, hybrid: 0, rooftop: 0 },
  rain: { outdoor: -30, indoor: 10, hybrid: -15, rooftop: -40 },
  heavy_rain: { outdoor: -50, indoor: 10, hybrid: -30, rooftop: -60 },
  snow: { outdoor: -40, indoor: 5, hybrid: -20, rooftop: -50 },
  extreme_cold: { outdoor: -30, indoor: 5, hybrid: -15, rooftop: -50 },
  extreme_heat: { outdoor: -30, indoor: 5, hybrid: -15, rooftop: -40 },
  poor_air: { outdoor: -40, indoor: 15, hybrid: -20, rooftop: -40 },
};

const TAG_BONUSES: Record<WeatherCondition, Record<string, number>> = {
  clear: {},
  rain: { cozy: 20, covered: 15 },
  heavy_rain: { cozy: 30, covered: 20 },
  snow: { cozy: 20, heated: 15 },
  extreme_cold: { cozy: 20, heated: 20 },
  extreme_heat: { ac: 25, pool: 30 },
  poor_air: { ac: 15 },
};

export function getWeatherScoreAdjustment(
  condition: WeatherCondition,
  venueType: VenueType | null,
  weatherTags: string[]
): number {
  let adjustment = 0;

  // Base adjustment by venue type
  if (venueType && SCORE_MATRIX[condition][venueType]) {
    adjustment += SCORE_MATRIX[condition][venueType];
  }

  // Tag bonuses
  const tagBonuses = TAG_BONUSES[condition] || {};
  for (const tag of weatherTags) {
    if (tagBonuses[tag]) {
      adjustment += tagBonuses[tag];
    }
  }

  return adjustment;
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/weather-scoring.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/weather-scoring.ts src/lib/__tests__/weather-scoring.test.ts
git commit -m "feat: add weather scoring service"
```

---

## Final: Run All Tests

**Step 1: Run full test suite**

```bash
npm test
```

**Step 2: Build to verify no type errors**

```bash
npm run build
```

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: complete strategic improvements implementation"
```

---

## Summary

This plan implements 7 strategic improvements across 7 phases:

1. **Zod Scraper Resilience** - 7 tasks
2. **Hype Level Scoring** - 5 tasks
3. **Feedback Loop** - 5 tasks
4. **Morning Commute** - 3 tasks
5. **Vibe Slider** - 2 tasks
6. **Referral Program** - 5 tasks
7. **Weather Integration** - 2 tasks

Total: ~29 tasks, each with 3-5 steps following TDD methodology.
