// Email Message Templates and Helpers
// Provides idempotency and tracking for all email-sending jobs

import { prisma } from './db'
import { sendEmail as resendSendEmail } from './resend'

// =============================================================================
// TYPES
// =============================================================================

export type EmailType =
  | 'daily_digest'
  | 'daily_pulse'
  | 'weekly_digest'
  | 'day_ahead'
  | 'reminder'
  | 'monthly_recap'
  | 'welcome'
  | 'system'
  // Time-slot email system (v2)
  | 'morning_briefing'
  | 'midday_pulse'
  | 'evening_winddown'
  // Time-slot based email types
  | 'morning_briefing'
  | 'midday_pulse'
  | 'evening_winddown'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

export interface TrackedEmailResult {
  success: boolean
  emailId?: string
  alreadySent?: boolean
  error?: string
}

// =============================================================================
// EMAIL IDEMPOTENCY - CORE FUNCTION
// =============================================================================

/**
 * Send an email with idempotency tracking.
 * 
 * This function ensures exactly-once email delivery by:
 * 1. Creating a record in EmailOutbox BEFORE sending (pending status)
 * 2. Sending the email via Resend
 * 3. Updating the record with success/failure
 * 
 * The unique constraint on (recipient, emailType, targetDate) prevents duplicates.
 * 
 * @param options - Email content options
 * @param emailType - Type of email for categorization
 * @param targetDate - Target date for the email (prevents duplicate daily/weekly sends)
 * @param metadata - Optional metadata for tracking
 * @returns Result indicating success or already sent
 */
export async function sendEmailTracked(
  options: SendEmailOptions,
  emailType: EmailType,
  targetDate: Date,
  metadata?: Record<string, unknown>
): Promise<TrackedEmailResult> {
  const targetDateOnly = new Date(targetDate)
  targetDateOnly.setHours(0, 0, 0, 0)

  // Try to create the outbox record first (unique constraint prevents duplicates)
  let outboxRecord
  try {
    outboxRecord = await prisma.emailOutbox.create({
      data: {
        recipient: options.to.toLowerCase().trim(),
        emailType,
        targetDate: targetDateOnly,
        subject: options.subject,
        status: 'pending',
        metadata: (metadata || {}) as Record<string, string | number | boolean>,
      },
    })
  } catch (error) {
    // Check if this is a unique constraint violation (P2002)
    const isDuplicate = (error as { code?: string })?.code === 'P2002'
    
    if (isDuplicate) {
      // Email was already sent or is being sent
      const existing = await prisma.emailOutbox.findUnique({
        where: {
          recipient_emailType_targetDate: {
            recipient: options.to.toLowerCase().trim(),
            emailType,
            targetDate: targetDateOnly,
          },
        },
      })

      if (existing?.status === 'sent') {
        console.log(`[EmailOutbox] Skipping duplicate ${emailType} email to ${options.to} for ${targetDateOnly.toISOString().split('T')[0]}`)
        return { success: true, alreadySent: true, emailId: existing.id }
      }

      // If pending or failed, we could retry - but for now treat as in-progress
      console.log(`[EmailOutbox] Email ${emailType} to ${options.to} already in progress`)
      return { success: false, alreadySent: false, error: 'Email already in progress' }
    }

    throw error
  }

  // Send the actual email
  try {
    const result = await resendSendEmail({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    // Mark as sent
    await prisma.emailOutbox.update({
      where: { id: outboxRecord.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        resendId: result.id,
      },
    })

    return { success: true, emailId: outboxRecord.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Mark as failed
    await prisma.emailOutbox.update({
      where: { id: outboxRecord.id },
      data: {
        status: 'failed',
        errorMessage,
      },
    })

    console.error(`[EmailOutbox] Failed to send ${emailType} to ${options.to}:`, error)
    return { success: false, error: errorMessage }
  }
}

// =============================================================================
// DISTRIBUTED JOB LOCK
// =============================================================================

/**
 * Acquire a distributed lock for a job to prevent concurrent runs.
 * 
 * Uses the JobLock table with a unique constraint to ensure only one
 * instance of a job can run at a time.
 * 
 * @param jobName - Name of the job to lock
 * @param ttlMinutes - Lock timeout in minutes (default: 30)
 * @returns Lock ID if acquired, null if lock is held by another process
 */
export async function acquireJobLock(
  jobName: string,
  ttlMinutes: number = 30
): Promise<string | null> {
  const lockId = `${jobName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

  try {
    await prisma.jobLock.create({
      data: {
        jobName,
        lockId,
        acquiredAt: new Date(),
        expiresAt,
      },
    })
    return lockId
  } catch (error) {
    // Check if lock already exists and is not expired
    if ((error as { code?: string })?.code === 'P2002') {
      const existingLock = await prisma.jobLock.findUnique({
        where: { jobName },
      })

      if (existingLock && existingLock.expiresAt > new Date()) {
        console.log(`[JobLock] ${jobName} is already running (lock held by ${existingLock.lockId})`)
        return null
      }

      // Lock expired, steal it
      if (existingLock) {
        await prisma.jobLock.delete({ where: { jobName } })
        return acquireJobLock(jobName, ttlMinutes)
      }
    }

    throw error
  }
}

/**
 * Release a distributed job lock.
 * 
 * @param jobName - Name of the job
 * @param lockId - Lock ID returned by acquireJobLock
 */
export async function releaseJobLock(jobName: string, lockId: string): Promise<void> {
  try {
    await prisma.jobLock.deleteMany({
      where: { jobName, lockId },
    })
    console.log(`[JobLock] Released lock for ${jobName}`)
  } catch (error) {
    console.error(`[JobLock] Failed to release lock for ${jobName}:`, error)
  }
}

// =============================================================================
// BATCH EMAIL HELPERS
// =============================================================================

/**
 * Send emails to multiple recipients with tracking.
 * 
 * @param recipients - List of email addresses
 * @param emailBuilder - Function to build email content for each recipient
 * @param emailType - Type of email
 * @param targetDate - Target date for deduplication
 * @returns Summary of sent/skipped/failed
 */
export async function sendTrackedEmails<T extends { email: string }>(
  recipients: T[],
  emailBuilder: (recipient: T) => Promise<SendEmailOptions> | SendEmailOptions,
  emailType: EmailType,
  targetDate: Date
): Promise<{
  sent: number
  skipped: number
  failed: number
  errors: string[]
}> {
  const results = {
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [] as string[],
  }

  for (const recipient of recipients) {
    try {
      const options = await emailBuilder(recipient)
      const result = await sendEmailTracked(options, emailType, targetDate, {
        recipientId: (recipient as { id?: string }).id,
      })

      if (result.alreadySent) {
        results.skipped++
      } else if (result.success) {
        results.sent++
      } else {
        results.failed++
        results.errors.push(`${recipient.email}: ${result.error}`)
      }
    } catch (error) {
      results.failed++
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      results.errors.push(`${recipient.email}: ${errorMsg}`)
    }
  }

  return results
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if an email was already sent for a given date.
 */
export async function wasEmailSent(
  recipient: string,
  emailType: EmailType,
  targetDate: Date
): Promise<boolean> {
  const targetDateOnly = new Date(targetDate)
  targetDateOnly.setHours(0, 0, 0, 0)

  const existing = await prisma.emailOutbox.findUnique({
    where: {
      recipient_emailType_targetDate: {
        recipient: recipient.toLowerCase().trim(),
        emailType,
        targetDate: targetDateOnly,
      },
    },
  })

  return existing?.status === 'sent'
}

/**
 * Get email sending stats for a given date range.
 */
export async function getEmailStats(
  emailType: EmailType,
  startDate: Date,
  endDate: Date
): Promise<{
  total: number
  sent: number
  failed: number
  pending: number
}> {
  const stats = await prisma.emailOutbox.groupBy({
    by: ['status'],
    where: {
      emailType,
      targetDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      status: true,
    },
  })

  return {
    total: stats.reduce((sum, s) => sum + s._count.status, 0),
    sent: stats.find(s => s.status === 'sent')?._count.status || 0,
    failed: stats.find(s => s.status === 'failed')?._count.status || 0,
    pending: stats.find(s => s.status === 'pending')?._count.status || 0,
  }
}
