// trigger/email/morning-digest.ts
/**
 * Morning Digest Email Task
 *
 * Sends the daily morning briefing email to all users.
 * Uses the full production pipeline:
 * - AI-curated content (Horizon, Deep Dive, Briefing)
 * - Weather, coat/umbrella, ferry, traffic, CitiBike
 * - Premium sections gated per user tier
 *
 * Schedule: 9am ET daily
 */

import { schedules } from '@trigger.dev/sdk/v3'

export const morningDigestTask = schedules.task({
  id: 'morning-digest',
  cron: {
    pattern: '0 9 * * *',
    timezone: 'America/New_York',
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 30000,
    maxTimeoutInMs: 300000,
  },
  maxDuration: 300, // 5 minutes
  run: async () => {
    console.log('[Morning Digest] Starting production email pipeline...')

    const { runDailyDigestJob } = await import('@/lib/jobs/run-daily-digest')

    const result = await runDailyDigestJob({ force: false })

    console.log(
      `[Morning Digest] Complete: ${result.digestsSent} sent, ${result.skipped} skipped, ${result.failed} failed (${result.mode} mode)`
    )

    if (result.errors.length > 0) {
      console.error('[Morning Digest] Errors:', result.errors)
    }

    return {
      slot: 'morning',
      sent: result.digestsSent,
      skipped: result.skipped,
      failed: result.failed,
      totalUsers: result.totalUsers,
      mode: result.mode,
      errors: result.errors,
    }
  },
})
