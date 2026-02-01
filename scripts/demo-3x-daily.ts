import 'dotenv/config'
import { sendEmail } from '../src/lib/resend'
import { 
  morningBrief, 
  MORNING_BRIEF_EXAMPLES,
  middayUpdate,
  MIDDAY_EXAMPLES,
} from '../src/lib/emails'

/**
 * Demo Script: Send sample CityPing 3x daily emails
 * 
 * Usage:
 *   npx ts-node scripts/demo-3x-daily.ts <email> [morning|midday|evening|all]
 *
 * Examples:
 *   npx ts-node scripts/demo-3x-daily.ts you@example.com morning
 *   npx ts-node scripts/demo-3x-daily.ts you@example.com midday
 *   npx ts-node scripts/demo-3x-daily.ts you@example.com evening
 *   npx ts-node scripts/demo-3x-daily.ts you@example.com all
 */

async function main() {
  const email = process.argv[2]
  const type = process.argv[3] || 'all'

  if (!email) {
    console.error('Usage: npx ts-node scripts/demo-3x-daily.ts <email> [morning|midday|evening|all]')
    console.error('')
    console.error('Examples:')
    console.error('  npx ts-node scripts/demo-3x-daily.ts you@example.com morning  # 9am brief')
    console.error('  npx ts-node scripts/demo-3x-daily.ts you@example.com midday   # 12pm update')
    console.error('  npx ts-node scripts/demo-3x-daily.ts you@example.com evening  # 7pm wind-down')
    console.error('  npx ts-node scripts/demo-3x-daily.ts you@example.com all      # All three')
    process.exit(1)
  }

  console.log(`📧 Sending ${type === 'all' ? 'all 3' : type} demo email(s) to ${email}...\n`)

  const results: { type: string; subject: string; status: string }[] = []

  // MORNING EMAIL (9am)
  if (type === 'morning' || type === 'all') {
    console.log('🌅 Sending Morning Brief (9am)...')
    try {
      const morningData = MORNING_BRIEF_EXAMPLES.suspendedClearDay()
      const morning = morningBrief(morningData)
      
      await sendEmail({
        to: email,
        subject: morning.subject,
        html: morning.html,
        text: morning.text,
      })
      
      results.push({ type: 'Morning (9am)', subject: morning.subject, status: '✅ Sent' })
      console.log(`   Subject: ${morning.subject}`)
      console.log(`   Status: ✅ Sent\n`)
    } catch (err) {
      results.push({ type: 'Morning (9am)', subject: '-', status: `❌ ${(err as Error).message}` })
      console.error(`   ❌ Error: ${(err as Error).message}\n`)
    }
  }

  // MIDDAY EMAIL (12pm)
  if (type === 'midday' || type === 'all') {
    console.log('☀️ Sending Midday Update (12pm)...')
    try {
      const middayData = MIDDAY_EXAMPLES.transitEmergency()
      const midday = middayUpdate(middayData)
      
      await sendEmail({
        to: email,
        subject: midday.subject,
        html: midday.html,
        text: midday.text,
      })
      
      results.push({ type: 'Midday (12pm)', subject: midday.subject, status: '✅ Sent' })
      console.log(`   Subject: ${midday.subject}`)
      console.log(`   Status: ✅ Sent\n`)
    } catch (err) {
      results.push({ type: 'Midday (12pm)', subject: '-', status: `❌ ${(err as Error).message}` })
      console.error(`   ❌ Error: ${(err as Error).message}\n`)
    }
  }

  // EVENING EMAIL (7pm) - Import dynamically since evening examples aren't exported yet
  if (type === 'evening' || type === 'all') {
    console.log('🌆 Sending Evening Wind-Down (7pm)...')
    try {
      // Import evening template
      const { eveningWindDown, EVENING_WINDDOWN_EXAMPLES } = await import('../src/lib/emails/evening-template')
      const eveningData = EVENING_WINDDOWN_EXAMPLES.fridayEvening()
      const evening = eveningWindDown(eveningData)
      
      await sendEmail({
        to: email,
        subject: evening.subject,
        html: evening.html,
        text: evening.text,
      })
      
      results.push({ type: 'Evening (7pm)', subject: evening.subject, status: '✅ Sent' })
      console.log(`   Subject: ${evening.subject}`)
      console.log(`   Status: ✅ Sent\n`)
    } catch (err) {
      results.push({ type: 'Evening (7pm)', subject: '-', status: `❌ ${(err as Error).message}` })
      console.error(`   ❌ Error: ${(err as Error).message}\n`)
    }
  }

  // Summary
  console.log('\n📊 Summary:')
  console.log('─'.repeat(80))
  results.forEach(r => {
    console.log(`${r.type.padEnd(18)} | ${r.status.padEnd(10)} | ${r.subject}`)
  })
  console.log('─'.repeat(80))
  
  const successCount = results.filter(r => r.status.includes('✅')).length
  console.log(`\n${successCount}/${results.length} emails sent successfully`)
  
  process.exit(successCount === results.length ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
