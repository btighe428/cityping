import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '../src/lib/resend'
import { 
  morningBrief, 
  middayUpdate,
} from '../src/lib/emails'

const prisma = new PrismaClient()

/**
 * Real Data Demo: Send actual 3x daily emails with live data
 * 
 * Usage:
 *   npx tsx scripts/demo-3x-daily-real.ts <email> [morning|midday|evening|all]
 */

async function fetchRealData(userZip: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get NYC city
  const nyc = await prisma.city.findUnique({
    where: { slug: 'nyc' },
  })

  if (!nyc) throw new Error('NYC city not found')

  // Fetch today's ASP status
  const todaySuspension = await prisma.suspensionEvent.findFirst({
    where: {
      cityId: nyc.id,
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
  })

  // Fetch tomorrow's ASP status
  const tomorrowSuspension = await prisma.suspensionEvent.findFirst({
    where: {
      cityId: nyc.id,
      date: {
        gte: tomorrow,
        lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
      },
    },
  })

  // Fetch recent transit alerts (last 6 hours)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const transitAlerts = await prisma.alertEvent.findMany({
    where: {
      createdAt: { gte: sixHoursAgo },
      source: {
        module: {
          type: 'transit'
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      source: {
        include: { module: true }
      }
    }
  })

  // Fetch weather (mock for now - would call weather API)
  const weather = await fetchWeather(nyc.id)

  // Fetch tonight's events
  const tonightEvents = await prisma.event.findMany({
    where: {
      cityId: nyc.id,
      startTime: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { startTime: 'asc' },
    take: 3,
  })

  // Fetch lunch spots (from dining module)
  const lunchSpots = await prisma.deal.findMany({
    where: {
      validFrom: { lte: today },
      validUntil: { gte: today },
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  })

  return {
    nyc,
    todaySuspension,
    tomorrowSuspension,
    transitAlerts,
    weather,
    tonightEvents,
    lunchSpots,
  }
}

async function fetchWeather(cityId: string) {
  // In production, this would call your weather API
  // For demo, return realistic NYC winter weather
  const temp = 35 + Math.floor(Math.random() * 15) // 35-50°F
  const conditions = ['Sunny', 'Partly cloudy', 'Overcast', 'Light rain']
  const condition = conditions[Math.floor(Math.random() * conditions.length)]
  
  return {
    temp,
    condition,
    icon: condition === 'Sunny' ? '☀️' : condition === 'Rain' ? '🌧️' : '⛅',
    precipChance: condition === 'Rain' ? 70 : condition === 'Overcast' ? 30 : 10,
    gearRecommendation: temp < 40 ? 'Winter coat' : temp < 50 ? 'Light jacket' : 'Comfortable',
  }
}

function formatTransitAlerts(alerts: any[]) {
  if (alerts.length === 0) {
    return [{ line: 'Subway', status: 'good' as const, headline: 'Normal service' }]
  }

  return alerts.map(alert => {
    const isMajor = alert.body?.toLowerCase().includes('suspended') || 
                    alert.body?.toLowerCase().includes('no service')
    
    return {
      line: alert.source.module.name || 'Subway',
      status: isMajor ? 'skip' as const : 'delays' as const,
      headline: alert.title,
      details: alert.body,
    }
  })
}

async function sendMorningEmail(to: string, data: any) {
  console.log('🌅 Building Morning Brief with real data...')
  
  const morningData = {
    date: new Date(),
    user: { neighborhood: 'Your Neighborhood', zipCode: '10001' },
    parking: {
      aspSuspended: !!data.todaySuspension,
      reason: data.todaySuspension?.title || undefined,
      metersSuspended: data.todaySuspension?.metadata?.metersSuspended,
      nextMoveRequired: data.tomorrowSuspension ? {
        date: data.tomorrowSuspension.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        time: '9:00 AM',
        dayOfWeek: data.tomorrowSuspension.date.toLocaleDateString('en-US', { weekday: 'long' }),
      } : undefined,
    },
    transit: formatTransitAlerts(data.transitAlerts),
    weather: data.weather,
    dayAhead: {
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      dayOfWeek: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
      aspSuspended: !!data.tomorrowSuspension,
      reason: data.tomorrowSuspension?.title || undefined,
    },
  }

  const email = morningBrief(morningData)
  
  await sendEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  return email.subject
}

async function sendMiddayEmail(to: string, data: any) {
  console.log('☀️ Building Midday Update with real data...')
  
  // Check for breaking changes since morning
  const breakingUpdates = []
  
  if (data.transitAlerts.some((a: any) => a.body?.toLowerCase().includes('suspended'))) {
    const suspended = data.transitAlerts.find((a: any) => a.body?.toLowerCase().includes('suspended'))
    breakingUpdates.push({
      type: 'transit_major' as const,
      headline: suspended.title,
      details: suspended.body,
      actionRequired: 'Check alternate routes',
    })
  }

  const middayData = {
    date: new Date(),
    user: { neighborhood: 'Your Neighborhood', zipCode: '10001' },
    breakingUpdates: breakingUpdates.length > 0 ? breakingUpdates : undefined,
    transit: formatTransitAlerts(data.transitAlerts),
    lunchSpots: data.lunchSpots.map((spot: any) => ({
      name: spot.venueName || spot.title,
      type: 'restaurant' as const,
      distance: '0.3 mi',
      walkTime: '6 min',
      offer: spot.description,
    })),
    afternoon: {
      weatherShift: data.weather.precipChance > 50 ? 'Rain expected — bring an umbrella' : undefined,
      transitOutlook: data.transitAlerts.length > 0 ? 'Ongoing delays' : 'Smooth sailing',
      eveningNote: data.tonightEvents.length > 0 
        ? `${data.tonightEvents.length} events tonight` 
        : undefined,
    },
  }

  const email = middayUpdate(middayData)
  
  await sendEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  return email.subject
}

async function sendEveningEmail(to: string, data: any) {
  console.log('🌆 Building Evening Wind-Down with real data...')
  
  const { eveningWindDown, EVENING_WINDDOWN_EXAMPLES } = await import('../src/lib/emails/evening-template')
  
  // For evening, use real ASP data but example events if none found
  const eveningData = {
    date: new Date(),
    user: { neighborhood: 'Your Neighborhood', zipCode: '10001' },
    tomorrowAsp: {
      suspended: !!data.tomorrowSuspension,
      reason: data.tomorrowSuspension?.title || undefined,
      dayOfWeek: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    },
    weather: {
      tomorrow: {
        condition: data.weather.condition,
        high: data.weather.temp + 5,
        low: data.weather.temp - 10,
        precipChance: data.weather.precipChance,
      },
      extended: [],
    },
    transit: {
      tonight: {
        lines: ['Subway'],
        status: data.transitAlerts.length > 0 ? 'delays' as const : 'good' as const,
        note: data.transitAlerts.length > 0 ? 'Check alerts' : 'Normal service',
      },
      tomorrowMorning: {
        lines: ['Subway'],
        status: 'good' as const,
      },
    },
    tonight: {
      events: data.tonightEvents.length > 0 
        ? data.tonightEvents.map((e: any) => ({
            id: e.id,
            name: e.title,
            venue: e.venue || 'NYC',
            startTime: e.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            neighborhood: e.neighborhood || 'Manhattan',
            category: 'music' as const,
          }))
        : [],
      dining: [],
    },
  }

  const email = eveningWindDown(eveningData)
  
  await sendEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  return email.subject
}

async function main() {
  const email = process.argv[2]
  const type = process.argv[3] || 'all'

  if (!email) {
    console.error('Usage: npx tsx scripts/demo-3x-daily-real.ts <email> [morning|midday|evening|all]')
    process.exit(1)
  }

  console.log(`📧 Fetching real data for ${type === 'all' ? 'all 3' : type} email(s)...\n`)

  // Fetch all data once
  console.log('⏳ Querying database...')
  const realData = await fetchRealData('10001')
  
  console.log(`   ✓ ASP today: ${realData.todaySuspension ? 'SUSPENDED' : 'Active'}`)
  console.log(`   ✓ ASP tomorrow: ${realData.tomorrowSuspension ? 'SUSPENDED' : 'Active'}`)
  console.log(`   ✓ Transit alerts: ${realData.transitAlerts.length}`)
  console.log(`   ✓ Tonight's events: ${realData.tonightEvents.length}`)
  console.log(`   ✓ Lunch spots: ${realData.lunchSpots.length}`)
  console.log()

  const results: { type: string; subject: string; status: string }[] = []

  // Send requested emails
  if (type === 'morning' || type === 'all') {
    try {
      const subject = await sendMorningEmail(email, realData)
      results.push({ type: 'Morning (9am)', subject, status: '✅ Sent' })
    } catch (err) {
      results.push({ type: 'Morning (9am)', subject: '-', status: `❌ ${(err as Error).message}` })
    }
  }

  if (type === 'midday' || type === 'all') {
    try {
      const subject = await sendMiddayEmail(email, realData)
      results.push({ type: 'Midday (12pm)', subject, status: '✅ Sent' })
    } catch (err) {
      results.push({ type: 'Midday (12pm)', subject: '-', status: `❌ ${(err as Error).message}` })
    }
  }

  if (type === 'evening' || type === 'all') {
    try {
      const subject = await sendEveningEmail(email, realData)
      results.push({ type: 'Evening (7pm)', subject, status: '✅ Sent' })
    } catch (err) {
      results.push({ type: 'Evening (7pm)', subject: '-', status: `❌ ${(err as Error).message}` })
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
  console.log(`\n${successCount}/${results.length} emails sent with real data`)
  
  process.exit(successCount === results.length ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
}).finally(() => {
  prisma.$disconnect()
})
