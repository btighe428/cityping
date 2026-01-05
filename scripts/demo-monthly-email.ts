import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '../src/lib/resend'
import { EMAIL_TEMPLATES } from '../src/lib/email-templates'
import {
  generateMonthlyInsights,
  formatMonthlyInsightsHtml,
  formatMonthlyInsightsText,
} from '../src/lib/monthly-insights'

const prisma = new PrismaClient()

/**
 * Demo Script: Send a monthly start overview email
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-monthly-email.ts <email> [month] [year]
 *
 * Examples:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-monthly-email.ts demo@example.com
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-monthly-email.ts demo@example.com 10 2025
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/demo-monthly-email.ts demo@example.com october
 */

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

function parseMonth(input: string): number | null {
  // Try as number first
  const num = parseInt(input, 10)
  if (num >= 1 && num <= 12) return num

  // Try as month name
  const lower = input.toLowerCase()
  const index = MONTH_NAMES.findIndex(m => m.startsWith(lower))
  if (index !== -1) return index + 1

  return null
}

async function main() {
  const email = process.argv[2]
  const monthArg = process.argv[3]
  const yearArg = process.argv[4]

  if (!email) {
    console.error('Usage: npx ts-node scripts/demo-monthly-email.ts <email> [month] [year]')
    console.error('')
    console.error('Examples:')
    console.error('  npx ts-node scripts/demo-monthly-email.ts you@example.com           # Current month')
    console.error('  npx ts-node scripts/demo-monthly-email.ts you@example.com 10        # October current year')
    console.error('  npx ts-node scripts/demo-monthly-email.ts you@example.com october   # October current year')
    console.error('  npx ts-node scripts/demo-monthly-email.ts you@example.com 10 2025   # October 2025')
    console.error('')
    console.error('Available months with data: January - December 2025')
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

  // Determine month and year
  const now = new Date()
  let month: number
  let year: number

  if (monthArg) {
    const parsedMonth = parseMonth(monthArg)
    if (!parsedMonth) {
      console.error(`Invalid month: ${monthArg}`)
      console.error('Use 1-12 or month name (e.g., "october" or "oct")')
      process.exit(1)
    }
    month = parsedMonth
    year = yearArg ? parseInt(yearArg, 10) : 2025
  } else {
    month = now.getMonth() + 1
    year = now.getFullYear()
  }

  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║               CityPing Monthly Start Email                   ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`  📅 Month:    ${MONTH_NAMES[month - 1].charAt(0).toUpperCase() + MONTH_NAMES[month - 1].slice(1)} ${year}`)
  console.log(`  📧 To:       ${email}`)
  console.log('')
  console.log('  Generating insights...')

  // Generate monthly insights
  const insights = await generateMonthlyInsights(nyc.id, year, month, nyc.timezone)

  console.log('')
  console.log('  📊 Insights Summary:')
  console.log(`     • Total suspensions: ${insights.totalSuspensions}`)
  console.log(`     • Weekday suspensions: ${insights.weekdaySuspensions}`)
  console.log(`     • Weekend suspensions: ${insights.weekendSuspensions}`)

  if (insights.bestParkingDays.length > 0) {
    console.log(`     • Best parking days: ${insights.bestParkingDays.join(', ')}`)
  }

  if (insights.worstParkingDays.length > 0) {
    console.log(`     • Most disrupted: ${insights.worstParkingDays.join(', ')}`)
  }

  if (insights.consecutivePatterns.length > 0) {
    console.log(`     • Pro tips: ${insights.consecutivePatterns.length}`)
    for (const p of insights.consecutivePatterns) {
      console.log(`       - ${p.dayOfWeek}: ${p.weeksInARow} weeks in a row`)
    }
  }

  if (insights.busyWeeks.length > 0) {
    console.log(`     • Busy weeks: ${insights.busyWeeks.map(w => `Week ${w.weekNumber}`).join(', ')}`)
  }

  if (insights.longestStreak) {
    console.log(`     • Longest streak: ${insights.longestStreak.days} consecutive days`)
  }

  if (insights.comparisonToPrevMonth) {
    const cmp = insights.comparisonToPrevMonth
    console.log(`     • vs ${cmp.prevMonthName}: ${cmp.difference} ${cmp.trend}`)
  }

  console.log('')
  console.log('  All suspension days:')
  for (const s of insights.suspensions) {
    console.log(`     • ${s.dateFormatted} (${s.dayAbbrev}) - ${s.summary}`)
  }

  if (insights.totalSuspensions === 0) {
    console.log('')
    console.log('  ⚠️  No suspensions found for this month!')
    console.log('      The database may not have data for this period.')
    console.log('')
    process.exit(0)
  }

  // Format for email
  const insightsHtml = formatMonthlyInsightsHtml(insights)
  const insightsText = formatMonthlyInsightsText(insights)

  const manageUrl = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/dashboard`
  const emailContent = EMAIL_TEMPLATES.monthlyStart(
    insightsHtml,
    insightsText,
    insights.monthName,
    insights.year,
    insights.totalSuspensions,
    manageUrl
  )

  console.log('')
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
    console.log('  Check your inbox for the monthly overview email.')
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
