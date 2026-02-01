# CityPing Digest Audit - Final Report

## Audit Completed: January 31, 2026

---

## Issues Identified (7 Total)

### Critical (2)
1. **Weak Alert Deduplication at Ingestion** - MTA alerts with updated IDs created duplicates
2. **No Cross-Content-Type Deduplication** - News articles and alerts on same topic both appeared

### High (2)
3. **Overly Permissive Similarity Thresholds** - 0.7 threshold caused false positive deduplication
4. **Missing Alert Expiration Checking** - Stale alerts persisted past their resolution

### Medium (2)
5. **Poor Article Clustering** - AI curation relied on model to detect duplicates
6. **Transit Alerts Lack Severity Filtering** - Minor delays treated same as major outages

### Low (1)
7. **Orchestrator Race Condition** - Computed orchestrator output but ignored it

---

## Fixes Implemented

### 1. MTA Scraper Content Deduplication
**File:** `src/lib/scrapers/mta.ts`

Added content-based deduplication that:
- Fetches alerts from last 24 hours
- Generates dedupKey for each alert title
- Compares affected lines to identify true duplicates
- Logs content duplicates for monitoring

### 2. Cross-Type Deduplication
**File:** `src/lib/agents/data-quality-agent.ts`

Added deduplication across content types:
- Processes items in priority order (news > alerts > events > dining)
- Uses dedupKey to identify cross-type duplicates
- Keeps highest-scored item when duplicates found
- Logs cross-type duplicate count

### 3. Raised Similarity Thresholds
**Files:** 
- `src/lib/agents/scoring.ts` (0.7 → 0.8)
- `src/lib/agents/content-curator-agent.ts` (0.6 → 0.8)

### 4. Alert Expiration Filtering
**File:** `src/app/api/jobs/send-daily-pulse/route.ts`

Modified alert query to:
- Include alerts starting today OR ongoing from previous days
- Exclude alerts that have ended (endsAt < now)
- Include alerts with no end date

### 5. News Article Pre-Deduplication
**File:** `src/lib/news-curation.ts`

Added `deduplicateArticles()` function:
- Sorts by Tier 1 source priority + recency
- Uses exact dedupKey matching
- Uses fuzzy title similarity (0.8 threshold)
- Logs removed duplicates

### 6. Transit Severity Filtering
**File:** `src/app/api/jobs/send-daily-pulse/route.ts`

Added `LOW_SEVERITY_TRANSIT_PATTERNS`:
- Elevator/escalator outages
- Boarding instructions
- Minor delays (< 10 minutes)
- Updated `shouldExcludeEvent()` with module-aware filtering

### 7. Orchestrator Output Utilization
**File:** `src/app/api/jobs/send-daily-pulse/route.ts`

Restructured to:
- Store orchestratorResult at higher scope
- Use orchestrator's whatMattersToday when available
- Fall back to traditional path when not in orchestrator mode

---

## Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| MTA alert duplication | ~15-20% | <5% |
| Cross-type redundancy | None | Full dedup |
| Stale alerts | Days | Filtered by expiration |
| Low-severity noise | All shown | Severity-filtered |
| AI curation duplicates | Model-dependent | Pre-filtered |
| Orchestrator efficiency | Partial | Full utilization |

---

## Files Modified

1. `src/lib/scrapers/mta.ts` - Content-based deduplication
2. `src/lib/agents/data-quality-agent.ts` - Cross-type deduplication
3. `src/lib/agents/scoring.ts` - Raised similarity threshold
4. `src/lib/agents/content-curator-agent.ts` - Raised fuzzy threshold
5. `src/app/api/jobs/send-daily-pulse/route.ts` - Expiration checks, severity filtering, orchestrator fix
6. `src/lib/news-curation.ts` - Pre-deduplication before AI selection

---

## Documentation Created

- `AUDIT_REPORT.md` - Detailed issue analysis
- `FIXES_IMPLEMENTED.md` - Implementation details and testing recommendations
