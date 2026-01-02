import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { DateTime } from 'luxon'
import { sendEmail } from '../src/lib/resend'
import { EMAIL_TEMPLATES } from '../src/lib/email-templates'

const prisma = new PrismaClient()

/**
 * Demo Script: Send a weekly preview email (Sunday morning style)
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-weekly-email.ts <email> [sunday-date]
 *
 * Examples:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-weekly-email.ts demo@example.com
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-weekly-email.ts demo@example.com 2025-10-05
 */

async function main() {
  const email = process.argv[2]
  const dateArg = process.argv[3]

  if (!email) {
    console.error('Usage: npx ts-node scripts/demo-weekly-email.ts <email> [sunday-date]')
    console.error('')
    console.error('Examples:')
    console.error('  npx ts-node scripts/demo-weekly-email.ts you@example.com')
    console.error('  npx ts-node scripts/demo-weekly-email.ts you@example.com 2025-10-05')
    process.exit(1)
  }

  // Get NYC city
  const nyc = await prisma.city.findUnique({
    where: { slug: 'nyc' },
  })

  if (!nyc) {
    console.error('NYC city not found. Run: npm run db:seed')
    process.exit(1)
  }

  // Determine the Sunday date (start of week)
  let sundayDate: DateTime

  if (dateArg) {
    sundayDate = DateTime.fromISO(dateArg, { zone: 'UTC' })
    if (!sundayDate.isValid) {
      console.error(`Invalid date: ${dateArg}`)
      process.exit(1)
    }
  } else {
    // Find a week with suspensions for demo
    // Let's use the week of Oct 5, 2025 which has multiple suspensions
    sundayDate = DateTime.fromISO('2025-10-05', { zone: 'UTC' })
  }

  // Calculate week range (Sunday to Saturday)
  const saturdayDate = sundayDate.plus({ days: 6 })
  const weekRange = `${sundayDate.toFormat('MMM d')} - ${saturdayDate.toFormat('MMM d, yyyy')}`

  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║              ParkPing Weekly Preview Email                   ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`  📅 Week:     ${weekRange}`)
  console.log(`  📧 To:       ${email}`)
  console.log('')

  // Fetch suspensions for the week (Sunday through Saturday)
  const suspensionRecords = await prisma.suspensionEvent.findMany({
    where: {
      cityId: nyc.id,
      date: {
        gte: sundayDate.toJSDate(),
        lte: saturdayDate.toJSDate(),
      },
    },
    orderBy: { date: 'asc' },
  })

  if (suspensionRecords.length === 0) {
    console.log('  ℹ️  No suspensions this week.')
    console.log('     (Weekly email would NOT be sent)')
    console.log('')
    console.log('  Try a week with suspensions, e.g.:')
    console.log('    2025-10-05 (Succoth week)')
    console.log('    2025-04-13 (Passover week)')
    console.log('    2025-01-26 (Lunar New Year week)')
    console.log('')
    process.exit(0)
  }

  const suspensions = suspensionRecords.map(s => {
    const d = DateTime.fromJSDate(s.date, { zone: 'UTC' })
    return {
      date: d.toFormat('MMMM d'),
      dayOfWeek: d.toFormat('cccc'),
      summary: s.summary || 'Holiday',
    }
  })

  console.log(`  📊 Found ${suspensions.length} suspension${suspensions.length !== 1 ? 's' : ''} this week:`)
  for (const s of suspensions) {
    console.log(`     • ${s.dayOfWeek}, ${s.date} — ${s.summary}`)
  }
  console.log('')

  // Generate email
  const manageUrl = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/dashboard`
  const emailContent = EMAIL_TEMPLATES.weeklyPreview(weekRange, suspensions, manageUrl)

  console.log('  Sending email...')
  console.log('')

  try {
    const result = await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    console.log('  ✅ Email sent successfully!')
    console.log(`  📬 Message ID: ${result.id}`)
    console.log('')
    console.log('  Check your inbox for the weekly preview email.')
    console.log('')
  } catch (error) {
    console.error('  ❌ Failed to send email:', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
