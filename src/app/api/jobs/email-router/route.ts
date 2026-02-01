/**
 * Email Router - API Entry Point for Time-Slot Emails
 *
 * Routes cron requests to the appropriate time slot handler.
 * Query param: ?slot=morning|noon|evening
 *
 * This is the single entry point configured in vercel.json crons.
 * Each time slot has its own cron schedule that calls this endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeTimeSlotJob, TimeSlot, TIME_SLOT_CONFIG } from '@/lib/email-scheduler'

// =============================================================================
// AUTHENTICATION
// =============================================================================

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('[EmailRouter] CRON_SECRET not set - allowing in development')
    return process.env.NODE_ENV === 'development'
  }

  const xCronSecret = request.headers.get('x-cron-secret')
  if (xCronSecret === cronSecret) return true

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true

  return false
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse query params
  const { searchParams } = new URL(request.url)
  const slotParam = searchParams.get('slot')
  const force = searchParams.get('force') === 'true'
  const testUserId = searchParams.get('testUser')

  // Validate slot parameter
  if (!slotParam || !isValidTimeSlot(slotParam)) {
    return NextResponse.json(
      {
        error: 'Invalid or missing slot parameter',
        validSlots: Object.keys(TIME_SLOT_CONFIG),
        provided: slotParam,
      },
      { status: 400 }
    )
  }

  const slot = slotParam as TimeSlot

  console.log(`[EmailRouter] Received ${slot} request${force ? ' (forced)' : ''}`)

  // Execute the job
  const result = await executeTimeSlotJob(slot, {
    force,
    testUsers: testUserId ? [testUserId] : undefined,
  })

  // Return appropriate status code
  const statusCode = result.success
    ? 200
    : result.emailsSent > 0
    ? 207 // Multi-status (partial success)
    : 500

  return NextResponse.json(result, { status: statusCode })
}

export async function POST(request: NextRequest) {
  return GET(request)
}

// =============================================================================
// VALIDATION
// =============================================================================

function isValidTimeSlot(slot: string): slot is TimeSlot {
  return slot === 'morning' || slot === 'noon' || slot === 'evening'
}
