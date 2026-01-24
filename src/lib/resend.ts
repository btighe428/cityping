import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const mockMode = process.env.RESEND_MOCK_MODE === 'true'
const fromEmail = process.env.RESEND_FROM_EMAIL || 'CityPing <alerts@cityping.net>'

if (!apiKey) {
  console.warn('Resend API key not set - email functionality will be mocked')
}

if (mockMode) {
  console.log('📧 Resend running in MOCK MODE - emails will be logged, not sent')
}

const resend = apiKey && !mockMode ? new Resend(apiKey) : null

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 2000,
  maxDelayMs: 30000,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1)
  return Math.min(delay, RETRY_CONFIG.maxDelayMs)
}

// =============================================================================
// SEND EMAIL WITH RETRY
// =============================================================================

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ id: string; attempts: number; verified: boolean }> {
  // Mock mode: log to console
  if (mockMode || !resend) {
    const mockId = `mock_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    console.log('\n' + '='.repeat(60))
    console.log('📧 MOCK EMAIL')
    console.log('='.repeat(60))
    console.log(`To:      ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`ID:      ${mockId}`)
    console.log('-'.repeat(60))
    console.log((text || html.replace(/<[^>]*>/g, '')).slice(0, 500))
    console.log('='.repeat(60) + '\n')
    return { id: mockId, attempts: 1, verified: true }
  }

  let lastError: Error | null = null
  let attempts = 0

  // Retry loop
  while (attempts < RETRY_CONFIG.maxAttempts) {
    attempts++
    console.log(`[Resend] Attempt ${attempts}/${RETRY_CONFIG.maxAttempts} to ${to}`)

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
        text,
      })

      if (error) {
        throw new Error(error.message)
      }

      const emailId = data?.id || 'unknown'
      console.log(`[Resend] SUCCESS: ${emailId} (attempt ${attempts})`)

      // Verify delivery after short delay
      let verified = false
      try {
        await sleep(3000)
        const status = await resend.emails.get(emailId)
        const lastEvent = status.data?.last_event
        verified = ['sent', 'delivered', 'opened', 'clicked'].includes(lastEvent || '')
        console.log(`[Resend] Delivery status: ${lastEvent} (verified: ${verified})`)
      } catch (verifyError) {
        console.warn(`[Resend] Could not verify delivery:`, verifyError)
        verified = true // Assume success if we can't verify
      }

      return { id: emailId, attempts, verified }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`[Resend] Attempt ${attempts} failed:`, lastError.message)

      if (attempts < RETRY_CONFIG.maxAttempts) {
        const delay = getRetryDelay(attempts)
        console.log(`[Resend] Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  // All attempts failed
  console.error(`[Resend] ALL ${attempts} ATTEMPTS FAILED for ${to}`)
  throw lastError || new Error('Failed to send email after all retries')
}

// =============================================================================
// CHECK EMAIL STATUS
// =============================================================================

export async function checkEmailStatus(emailId: string): Promise<{
  id: string
  status: string
  lastEvent: string | null
  createdAt: string | null
}> {
  if (!resend) {
    return { id: emailId, status: 'mock', lastEvent: null, createdAt: null }
  }

  try {
    const { data, error } = await resend.emails.get(emailId)

    if (error) {
      throw new Error(error.message)
    }

    return {
      id: emailId,
      status: data?.last_event || 'unknown',
      lastEvent: data?.last_event || null,
      createdAt: data?.created_at || null,
    }
  } catch (error) {
    console.error(`[Resend] Failed to check status for ${emailId}:`, error)
    throw error
  }
}

// =============================================================================
// LIST RECENT EMAILS
// =============================================================================

export async function listRecentEmails(limit = 10): Promise<Array<{
  id: string
  to: string
  subject: string
  status: string
  createdAt: string
}>> {
  if (!resend) {
    return []
  }

  try {
    const { data, error } = await resend.emails.list()

    if (error) {
      throw new Error(error.message)
    }

    return (data?.data || []).slice(0, limit).map((email) => ({
      id: email.id,
      to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
      subject: email.subject,
      status: email.last_event || 'unknown',
      createdAt: email.created_at,
    }))
  } catch (error) {
    console.error('[Resend] Failed to list emails:', error)
    return []
  }
}

export default { sendEmail, checkEmailStatus, listRecentEmails }
