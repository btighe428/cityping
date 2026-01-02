import twilio from 'twilio'
import crypto from 'crypto'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
const mockMode = process.env.TWILIO_MOCK_MODE === 'true'

if (!accountSid || !authToken) {
  console.warn('Twilio credentials not set - SMS functionality will be mocked')
}

if (mockMode) {
  console.log('📱 Twilio running in MOCK MODE - SMS will be logged, not sent')
}

export const twilioClient = accountSid && authToken && !mockMode
  ? twilio(accountSid, authToken)
  : null

export async function sendSms(
  to: string,
  body: string
): Promise<{ sid: string; status: string }> {
  // Mock mode: log to console with visual formatting
  if (mockMode || !twilioClient || !messagingServiceSid) {
    const mockSid = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    console.log('\n' + '='.repeat(60))
    console.log('📱 MOCK SMS')
    console.log('='.repeat(60))
    console.log(`To:   ${to}`)
    console.log(`SID:  ${mockSid}`)
    console.log('-'.repeat(60))
    console.log(body)
    console.log('='.repeat(60) + '\n')
    return { sid: mockSid, status: 'delivered' }
  }

  try {
    const message = await twilioClient.messages.create({
      to,
      body,
      messagingServiceSid,
    })
    return { sid: message.sid, status: message.status }
  } catch (error) {
    console.error('Failed to send SMS:', error)
    throw error
  }
}

export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  if (!authToken) {
    console.warn('Twilio auth token not set - skipping signature verification')
    return true
  }

  // Sort params and create string
  const sortedKeys = Object.keys(params).sort()
  let dataString = url
  for (const key of sortedKeys) {
    dataString += key + params[key]
  }

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(dataString, 'utf-8'))
    .digest('base64')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// Normalize inbound SMS keywords
export function normalizeKeyword(body: string): string {
  return body.trim().toUpperCase()
}

// Check if keyword matches STOP variants
export function isStopKeyword(keyword: string): boolean {
  const stopVariants = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']
  return stopVariants.includes(keyword)
}

// Check if keyword matches START variants
export function isStartKeyword(keyword: string): boolean {
  const startVariants = ['START', 'UNSTOP', 'SUBSCRIBE']
  return startVariants.includes(keyword)
}

// Check if keyword is HELP
export function isHelpKeyword(keyword: string): boolean {
  const helpVariants = ['HELP', 'INFO']
  return helpVariants.includes(keyword)
}
