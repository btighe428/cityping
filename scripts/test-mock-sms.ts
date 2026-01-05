import 'dotenv/config'

// Dynamically import to pick up env vars
async function test() {
  const { sendSms } = await import('../src/lib/twilio')

  console.log('Testing mock SMS...\n')

  // Test opt-in confirmation
  await sendSms('+14075798806',
    'CityPing: Reply YES to confirm your subscription and start receiving NYC parking alerts. Msg&data rates may apply. Reply STOP to cancel.'
  )

  // Test suspension alert
  await sendSms('+14075798806',
    '🚗 CityPing: Alternate side parking is SUSPENDED tomorrow (Dec 25) for Christmas Day. No need to move your car tonight!'
  )

  // Test monthly recap
  await sendSms('+14075798806',
    '📊 CityPing December Recap: ASP was suspended 4 days this month. You saved up to $260 in potential tickets! Happy New Year!'
  )

  console.log('All mock SMS tests complete!')
}

test()
