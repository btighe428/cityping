import 'dotenv/config'
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

async function checkMessage() {
  const messageSid = 'SM2a1fa1c3cf166b1d8a0c1d08da257050'

  try {
    const message = await client.messages(messageSid).fetch()

    console.log('Message Status:', message.status)
    console.log('Error Code:', message.errorCode || 'None')
    console.log('Error Message:', message.errorMessage || 'None')
    console.log('From:', message.from)
    console.log('To:', message.to)
    console.log('Date Sent:', message.dateSent)
  } catch (error) {
    console.error('Error:', error)
  }
}

checkMessage()
