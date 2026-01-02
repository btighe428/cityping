import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const mockMode = process.env.RESEND_MOCK_MODE === 'true'
const fromEmail = process.env.RESEND_FROM_EMAIL || 'ParkPing <alerts@parkping.com>'

if (!apiKey) {
  console.warn('Resend API key not set - email functionality will be mocked')
}

if (mockMode) {
  console.log('📧 Resend running in MOCK MODE - emails will be logged, not sent')
}

const resend = apiKey && !mockMode ? new Resend(apiKey) : null

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
}): Promise<{ id: string }> {
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
    console.log(text || html.replace(/<[^>]*>/g, ''))
    console.log('='.repeat(60) + '\n')
    return { id: mockId }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text,
    })

    if (error) {
      console.error('Failed to send email:', error)
      throw new Error(error.message)
    }

    return { id: data?.id || 'unknown' }
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

export default { sendEmail }
