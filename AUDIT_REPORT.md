# CityPing Daily Digest/Pulse System Audit Report

## Executive Summary

This audit identifies **7 critical issues** in the CityPing daily digest/pulse system that cause redundant content, poor quality filtering, and duplicate alerts. The issues span content ingestion, deduplication, clustering, and alert prioritization.

---

## Issues Found

### 1. **Weak Alert Deduplication at Ingestion Time** (CRITICAL)
**Location:** `src/lib/scrapers/mta.ts`

**Problem:** The MTA scraper only deduplicates by `externalId` (MTA's alert ID), but MTA frequently updates alerts with new IDs while keeping the same content. This creates duplicate alerts in the database.

**Evidence:**
```typescript
// Only checks externalId - doesn't catch content duplicates
const existing = await prisma.alertEvent.findUnique({
  where: {
    sourceId_externalId: {
      sourceId: source.id,
      externalId: alert.id,  // MTA changes this on updates
    },
  },
});
```

**Impact:** Users receive multiple notifications for the same service disruption.

---

### 2. **No Cross-Content-Type Deduplication** (CRITICAL)
**Location:** `src/lib/agents/data-quality-agent.ts` - `selectBestContentV2()`

**Problem:** The deduplication only happens *within* each content type (news, alerts, events, dining), not *across* types. A transit alert about "A train delays" and a news article about "A train delays" both appear in the digest.

**Evidence:**
```typescript
// News deduped separately
const newsDeduped = deduplicateByKey(scoredNews);
// Alerts deduped separately  
const alertsDeduped = deduplicateByKey(scoredAlerts);
// No cross-type deduplication!
```

**Impact:** Redundant information presented as separate items.

---

### 3. **Overly Permissive Similarity Thresholds** (HIGH)
**Location:** `src/lib/agents/scoring.ts` - `areTitlesSimilar()`

**Problem:** The default threshold of 0.7 is too low, allowing "Mobile Medical Unit at Prospect Park" and "Health Screening at Prospect Park" to be considered duplicates when they shouldn't be.

**Evidence:**
```typescript
export function areTitlesSimilar(
  title1: string,
  title2: string,
  threshold: number = 0.7  // Too permissive
): boolean {
```

---

### 4. **Missing Alert Expiration/Cleanup** (HIGH)
**Location:** `src/app/api/jobs/send-daily-pulse/route.ts`

**Problem:** The pulse route queries alerts by `startsAt` date but doesn't check if alerts have expired or been resolved. Stale alerts persist in "What Matters Today."

**Evidence:**
```typescript
// Only checks startsAt, not endsAt or expiration
const alertEvents = await prisma.alertEvent.findMany({
  where: {
    startsAt: {
      gte: todayStart,
      lte: todayEnd,
    },
    // No check for endsAt, expiresAt, or resolved status
  },
});
```

---

### 5. **Poor Article Clustering in News Curation** (MEDIUM)
**Location:** `src/lib/news-curation.ts`

**Problem:** The news curation relies on AI (Claude) to select and deduplicate articles, but the prompt lacks explicit deduplication instructions. The curation prompt mentions "Duplicate stories" but doesn't provide specific guidance on how to identify them.

**Evidence:**
```typescript
// AI has to figure out deduplication on its own
const CURATION_PROMPT = `...HARD EXCLUDES (never select):
...
- Duplicate stories (same event from multiple sources - pick the best one)`;
// No specific deduplication algorithm or examples
```

---

### 6. **Transit Alerts Lack Severity Filtering** (MEDIUM)
**Location:** `src/app/api/jobs/send-daily-pulse/route.ts` - `shouldExcludeEvent()`

**Problem:** The event exclusion patterns filter out low-value events (mobile units, health screenings) but don't filter transit alerts by severity. Minor "expect delays" alerts get the same treatment as major service suspensions.

**Current exclusions:**
```typescript
const EXCLUDED_EVENT_PATTERNS = [
  /mobile.*unit/i,
  /outreach.*collective/i,
  /tabling/i,
  /health.*screening/i,
  // ...no transit-specific filtering
];
```

---

### 7. **Race Condition in Orchestrator Mode** (LOW)
**Location:** `src/app/api/jobs/send-daily-pulse/route.ts`

**Problem:** When `useOrchestrator=true`, the code calls `orchestrateDigestV2()` but then ignores its `whatMattersToday` output and rebuilds it from scratch using the traditional path. This wastes computation and creates inconsistent results.

**Evidence:**
```typescript
const orchestratorResult = await runOrchestratorEnhancedPulse(nyNow, weatherForecast);
// ...uses orchestratorResult.news but NOT orchestratorResult.whatMattersToday

// Then separately builds whatMattersToday:
const whatMattersToday: NYCTodayEvent[] = curatedAlertEvents.slice(0, 6).map(...);
```

---

## Recommendations Summary

| Priority | Issue | Fix Complexity |
|----------|-------|----------------|
| Critical | Alert deduplication at ingestion | Medium |
| Critical | Cross-content-type deduplication | Medium |
| High | Similarity thresholds | Low |
| High | Alert expiration checking | Medium |
| Medium | News curation clustering | Medium |
| Medium | Transit severity filtering | Low |
| Low | Orchestrator race condition | Low |

---

## Files Requiring Changes

1. `src/lib/scrapers/mta.ts` - Add content-based deduplication
2. `src/lib/agents/data-quality-agent.ts` - Add cross-type deduplication
3. `src/lib/agents/scoring.ts` - Raise similarity threshold
4. `src/app/api/jobs/send-daily-pulse/route.ts` - Add expiration checks, use orchestrator output
5. `src/lib/news-curation.ts` - Add explicit deduplication step
6. `src/lib/agents/content-curator-agent.ts` - Ensure curation dedups across types
