import 'dotenv/config'
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

async function sendTestSMS() {
  const testPhone = '+14075798806' // Your verified number

  try {
    const message = await client.messages.create({
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID, // Use A2P registered service
      to: testPhone,
      body: 'ParkPing Test: Alternate side parking is SUSPENDED tomorrow for Christmas Day. No need to move your car tonight!'
    })

    console.log('SMS sent successfully!')
    console.log('Message SID:', message.sid)
    console.log('Status:', message.status)
  } catch (error) {
    console.error('Failed to send SMS:', error)
  }
}

sendTestSMS()
