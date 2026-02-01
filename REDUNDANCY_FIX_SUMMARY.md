# CityPing Redundancy Fix - Summary

## Issues Found

### 1. CRON SCHEDULE COLLISION (Critical)
**Problem**: Two email-sending jobs were scheduled to run at the exact same time:
- `send-daily-digest`: `0 12 * * *` (12:00 UTC = 7am ET)
- `send-daily-pulse`: `0 12 * * *` (same time!)

Both jobs send emails to ALL users, causing users to receive duplicate emails every day.

**Fix**: Staggered the schedules:
- `send-daily-digest`: `0 12 * * *` (12:00 UTC)
- `send-daily-pulse`: `30 12 * * *` (12:30 UTC) - 30 min later
- `send-weekly-digest`: `0 13 * * 0` (Sundays 13:00 UTC)
- `send-reminders`: `0 18 * * *` (18:00 UTC)

### 2. NO EMAIL IDEMPOTENCY (High)
**Problem**: Unlike SMS which uses `MessageOutbox` with unique constraints, emails had no tracking mechanism. If a job ran twice or overlapped, users would receive duplicate emails.

**Fix**: Created new `EmailOutbox` model with:
- Unique constraint on `(recipient, emailType, targetDate)`
- Status tracking: `pending` → `sent`/`failed`/`skipped`
- Prevents duplicate sends for the same recipient/type/date combination

### 3. DUPLICATE DAY-AHEAD LOGIC (Medium)
**Problem**: `send-reminders` job had a "Part 2" that sent Day-Ahead emails to all users, duplicating the dedicated `send-day-ahead` cron job.

**Fix**: Removed the duplicate Day-Ahead logic from `send-reminders`. Now `send-day-ahead` runs independently at 17:00 UTC.

### 4. NO JOB-LEVEL LOCKING (Medium)
**Problem**: If a cron job took longer than its interval, or if Vercel retried a failed job, multiple instances could run concurrently and send duplicates.

**Fix**: Created `JobLock` table and `acquireJobLock()`/`releaseJobLock()` functions:
- Each job acquires a lock before running
- If another instance is running, the new one exits immediately
- Locks auto-expire after timeout (prevents stuck locks)

### 5. MISSING JOB MONITORING (Low)
**Problem**: Some jobs didn't use the `JobMonitor` for tracking execution status.

**Fix**: Added `JobMonitor` tracking to all email-sending jobs.

## Files Changed

### 1. Database Schema (`prisma/schema.prisma`)
Added:
- `EmailOutbox` model with idempotency constraint
- `EmailType` enum
- `EmailStatus` enum
- `JobLock` model for distributed locking

### 2. New Library (`src/lib/email-outbox.ts`)
Created comprehensive email tracking module:
- `sendEmailTracked()` - Sends emails with idempotency
- `acquireJobLock()` / `releaseJobLock()` - Distributed locking
- `wasEmailSent()` - Check if email was already sent
- `getEmailStats()` - Get sending statistics

### 3. Cron Schedule (`vercel.json`)
- Staggered daily digest jobs (30 min apart)
- Added explicit schedule for `send-weekly-digest` (was missing)
- Added explicit schedule for `send-reminders` (was missing)

### 4. Updated Routes

#### `src/app/api/jobs/send-reminders/route.ts`
- Removed duplicate Day-Ahead logic
- Added email idempotency tracking
- Added job locking

#### `src/app/api/jobs/send-daily-digest/route.ts`
- Added email idempotency tracking
- Added job locking
- Added job monitoring

#### `src/app/api/jobs/send-daily-pulse/route.ts`
- Added email idempotency tracking
- Added job locking

#### `src/app/api/jobs/send-weekly-digest/route.ts`
- Added email idempotency tracking
- Added job locking
- Added job monitoring

#### `src/app/api/jobs/send-day-ahead/route.ts`
- Added email idempotency tracking
- Added job locking

#### `src/app/api/jobs/send-monthly-recap/route.ts`
- Added job locking
- Added job monitoring

## Migration Required

Run the migration to create the new tables:

```bash
npx prisma migrate deploy
```

Or apply the SQL directly:

```bash
psql $DATABASE_URL -f prisma/migrations/20260131_add_email_outbox/migration.sql
```

## Testing

After deployment:

1. **Verify no duplicate sends**: Check `email_outbox` table for any duplicate entries
2. **Monitor job locks**: Check `job_locks` table to ensure locks are being acquired/released
3. **Check logs**: Look for "skipped duplicate" messages indicating idempotency is working
4. **Verify staggered schedule**: Confirm jobs run at the new staggered times

## Monitoring

New metrics to watch:
- `email_outbox` counts by status (sent/failed/pending)
- `skipped` count in job results (indicates idempotency preventing duplicates)
- `job_locks` table for stuck locks (should be empty after jobs complete)

## Rollback Plan

If issues occur:
1. Revert vercel.json to original schedule
2. The code is backward-compatible - old behavior will work (just without idempotency)
3. EmailOutbox table can be dropped if needed (no foreign key dependencies)
