import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '../src/lib/resend'
import { EMAIL_TEMPLATES } from '../src/lib/email-templates'
import { generateParkingTips, formatTipsHtml, formatTipsSms } from '../src/lib/parking-tips'

const prisma = new PrismaClient()

/**
 * Demo Script: Send a sample ParkPing reminder email
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-email.ts <email> [date]
 *
 * Examples:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-email.ts demo@example.com
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-email.ts demo@example.com 2025-12-25
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-email.ts demo@example.com next
 */

async function main() {
  const email = process.argv[2]
  const dateArg = process.argv[3]

  if (!email) {
    console.error('Usage: npx ts-node scripts/demo-email.ts <email> [date|next]')
    console.error('')
    console.error('Examples:')
    console.error('  npx ts-node scripts/demo-email.ts you@example.com          # Next suspension')
    console.error('  npx ts-node scripts/demo-email.ts you@example.com next     # Next suspension')
    console.error('  npx ts-node scripts/demo-email.ts you@example.com 2025-12-25  # Specific date')
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

  let targetDate: Date
  let suspension

  if (!dateArg || dateArg === 'next') {
    // Find next upcoming suspension
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    suspension = await prisma.suspensionEvent.findFirst({
      where: {
        cityId: nyc.id,
        date: { gte: today },
      },
      orderBy: { date: 'asc' },
    })

    if (!suspension) {
      console.error('No upcoming suspensions found in database.')
      process.exit(1)
    }

    targetDate = new Date(suspension.date)
  } else {
    // Use specified date
    targetDate = new Date(dateArg)
    if (isNaN(targetDate.getTime())) {
      console.error(`Invalid date: ${dateArg}`)
      process.exit(1)
    }

    suspension = await prisma.suspensionEvent.findFirst({
      where: {
        cityId: nyc.id,
        date: targetDate,
      },
    })

    if (!suspension) {
      console.error(`No suspension found for ${dateArg}`)
      console.error('')
      console.error('Available suspensions:')
      const upcoming = await prisma.suspensionEvent.findMany({
        where: { cityId: nyc.id },
        orderBy: { date: 'asc' },
        take: 10,
      })
      for (const s of upcoming) {
        const d = new Date(s.date)
        console.error(`  ${d.toISOString().split('T')[0]} - ${s.summary}`)
      }
      process.exit(1)
    }
  }

  // Use UTC to avoid timezone shifting (dates are stored as midnight UTC)
  const dateStr = targetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  const holidayName = suspension.summary || 'Holiday'

  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║                    ParkPing Demo Email                       ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`  📅 Date:     ${dateStr}`)
  console.log(`  🎉 Reason:   ${holidayName}`)
  console.log(`  📧 To:       ${email}`)
  console.log('')

  // Generate parking tips
  const tips = await generateParkingTips(nyc.id, targetDate)
  const tipsHtml = formatTipsHtml(tips)
  const tipsText = tips.length > 0 ? formatTipsSms(tips) : ''

  if (tips.length > 0) {
    console.log('  💡 Parking Tips:')
    for (const tip of tips) {
      console.log(`     ${tip}`)
    }
    console.log('')
  }

  // Fetch next 3 upcoming suspensions after this one
  const upcomingSuspensions = await prisma.suspensionEvent.findMany({
    where: {
      cityId: nyc.id,
      date: { gt: targetDate },
    },
    orderBy: { date: 'asc' },
    take: 3,
  })

  const upcomingDays = upcomingSuspensions.map(s => {
    const d = new Date(s.date)
    return {
      date: d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
      summary: s.summary || 'Holiday',
    }
  })

  if (upcomingDays.length > 0) {
    console.log('  📅 Coming Up:')
    for (const d of upcomingDays) {
      console.log(`     ${d.date} — ${d.summary}`)
    }
    console.log('')
  }

  // Generate email content
  const manageUrl = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/dashboard`
  const emailContent = EMAIL_TEMPLATES.reminder(dateStr, holidayName, manageUrl, tipsHtml, tipsText, upcomingDays)

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
    console.log('  Check your inbox (and spam folder) for the demo email.')
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
