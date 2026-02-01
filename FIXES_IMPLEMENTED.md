# CityPing Daily Digest/Pulse System - Fixes Implemented

## Summary of Changes

This document summarizes the fixes implemented to address the issues identified in the daily digest/pulse system audit.

---

## 1. Content-Based Deduplication at MTA Alert Ingestion (CRITICAL)

**File:** `src/lib/scrapers/mta.ts`

**Problem:** The MTA scraper only deduplicated by `externalId`, but MTA frequently updates alerts with new IDs while keeping the same content, causing duplicate alerts.

**Fix:** Added a two-stage deduplication system:
1. Check by `externalId` (existing behavior)
2. Check by content dedupKey + affected lines (new behavior)

Alerts are now filtered out if they have the same content and affected lines as an alert created in the last 24 hours.

**Code Changes:**
- Imported `generateDedupKey` from `../agents/scoring`
- Added `recentAlerts` query to fetch alerts from last 24 hours
- Added `contentKey` generation and comparison
- Added matching on `affectedLines` to ensure we only filter true duplicates

---

## 2. Cross-Content-Type Deduplication (CRITICAL)

**File:** `src/lib/agents/data-quality-agent.ts`

**Problem:** Deduplication only happened within each content type (news, alerts, events, dining), not across types. A news article and an alert about the same topic would both appear.

**Fix:** Added cross-type deduplication step after individual type deduplication:
1. Process all selected items in priority order (news > alerts > events > dining)
2. Use dedupKey to identify duplicates across types
3. Keep the highest-scored item when duplicates are found

**Code Changes:**
- Added `crossTypeDedupMap` to track items across all types
- Added deduplication loop that processes items in priority order
- Updated return statement to use deduplicated lists (`finalNews`, `finalAlerts`, etc.)
- Added logging for cross-type duplicate count

---

## 3. Raised Similarity Thresholds (HIGH)

**Files:** 
- `src/lib/agents/scoring.ts`
- `src/lib/agents/content-curator-agent.ts`

**Problem:** The default similarity threshold of 0.7 was too permissive, causing false positives in deduplication (e.g., "Mobile Medical Unit" vs "Health Screening" at same location).

**Fix:** Raised threshold from 0.7 to 0.8 for better precision.

**Code Changes:**
- `scoring.ts`: Changed default threshold from 0.7 to 0.8 in `areTitlesSimilar()`
- `content-curator-agent.ts`: Changed fuzzy dedup threshold from 0.6 to 0.8 in `curateContentV2()`

---

## 4. Alert Expiration Checking (HIGH)

**File:** `src/app/api/jobs/send-daily-pulse/route.ts`

**Problem:** The pulse route only checked `startsAt` date, not `endsAt` or expiration. Stale alerts persisted in "What Matters Today" long after they were resolved.

**Fix:** Modified the alert query to include expiration checks:
1. Include alerts that start today OR started earlier but haven't ended
2. Exclude alerts that have already ended (`endsAt < now`)
3. Include alerts with no end date (ongoing)

**Code Changes:**
- Rewrote the `alertEvents` query with complex `AND`/`OR` conditions
- Added check for `endsAt: null` OR `endsAt >= nyNow`

---

## 5. Explicit News Article Deduplication (MEDIUM)

**File:** `src/lib/news-curation.ts`

**Problem:** The AI-based news curation relied on the model to detect duplicates, but without explicit deduplication, the model sometimes selected similar stories from different sources.

**Fix:** Added explicit deduplication before AI selection:
1. Sort articles by source tier (Tier 1 preferred) and recency
2. Use exact dedupKey matching
3. Use fuzzy title similarity (0.8 threshold) for near-duplicates

**Code Changes:**
- Imported `generateDedupKey` and `areTitlesSimilar` from `../agents/scoring`
- Added `deduplicateArticles()` function with Tier 1 source prioritization
- Call deduplication before `selectTopArticles()`
- Added detailed logging of removed duplicates

---

## 6. Transit Alert Severity Filtering (MEDIUM)

**File:** `src/app/api/jobs/send-daily-pulse/route.ts`

**Problem:** Low-severity transit alerts (elevator outages, minor delays) were treated equally to major service disruptions, creating noise in the digest.

**Fix:** Added `LOW_SEVERITY_TRANSIT_PATTERNS` array and updated `shouldExcludeEvent()` to filter transit alerts by severity.

**Code Changes:**
- Added `LOW_SEVERITY_TRANSIT_PATTERNS` array with patterns like:
  - Elevator/escalator outages
  - Boarding instructions ("board front/rear train")
  - Minor/expect delays under 10 minutes
- Updated `shouldExcludeEvent()` signature to accept `moduleId`
- Added transit-specific filtering logic
- Updated all callers to pass `moduleId`

---

## 7. Orchestrator Output Utilization (LOW)

**File:** `src/app/api/jobs/send-daily-pulse/route.ts`

**Problem:** When `useOrchestrator=true`, the code called `runOrchestratorEnhancedPulse()` but ignored its `whatMattersToday` output, wasting computation.

**Fix:** Restructured to use orchestrator output when available:
1. Declare `orchestratorResult` at higher scope
2. Conditionally build `whatMattersToday` from orchestrator OR traditional path
3. Use `buildWhatMattersFromOrchestrator()` when in orchestrator mode

**Code Changes:**
- Added `orchestratorResult` variable declaration
- Modified conditional block to assign to `orchestratorResult`
- Wrapped "What Matters Today" building logic in conditional
- Use orchestrator's curated alerts when available

---

## Testing Recommendations

After deploying these changes:

1. **Monitor MTA ingestion logs** for "content duplicates filtered" messages
2. **Check cross-type dedup logging** in DataQuality stage
3. **Verify alert freshness** - no alerts older than their `endsAt` should appear
4. **Review "What Matters Today"** for elevator/filtered transit alerts
5. **Compare orchestrator vs traditional** outputs for consistency

---

## Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| Duplicate MTA alerts | ~15-20% duplication | <5% duplication |
| Cross-type redundancy | No dedup | Full cross-type dedup |
| Stale alerts | Could persist days | Filtered by expiration |
| Low-severity transit noise | All alerts shown | Severity-filtered |
| AI curation duplicates | Relied on AI | Pre-filtered |
| Orchestrator efficiency | Partial use | Full utilization |
