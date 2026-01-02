import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSms } from '@/lib/twilio'
import { SMS_TEMPLATES } from '@/lib/sms-templates'
import { getPreviousMonthRange, getTomorrowInTimezone } from '@/lib/ics'
import { DateTime } from 'luxon'

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not set - allowing request in development')
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cities = await prisma.city.findMany()
    const results = []

    for (const city of cities) {
      const { start, end } = getPreviousMonthRange(city.timezone)
      const now = DateTime.now().setZone(city.timezone)
      const lastMonth = now.minus({ months: 1 })
      const monthName = lastMonth.toFormat('LLLL')

      // Get suspensions from last month
      const suspensions = await prisma.suspensionEvent.findMany({
        where: {
          cityId: city.id,
          date: {
            gte: new Date(start),
            lte: new Date(end),
          },
        },
        orderBy: { date: 'asc' },
      })

      const suspensionCount = suspensions.length
      const highlights = suspensions.slice(0, 3).map(s => s.summary || 'Suspension').filter(Boolean)

      // Get next month preview
      const nextMonthStart = now.startOf('month').toISODate()!
      const nextMonthEnd = now.endOf('month').toISODate()!

      const upcomingSuspensions = await prisma.suspensionEvent.findMany({
        where: {
          cityId: city.id,
          date: {
            gte: new Date(nextMonthStart),
            lte: new Date(nextMonthEnd),
          },
        },
        take: 2,
      })

      let nextMonthPreview: string | undefined
      if (upcomingSuspensions.length > 0) {
        const names = upcomingSuspensions.map(s => s.summary).filter(Boolean).join(', ')
        nextMonthPreview = names ? `${now.toFormat('LLLL')} has ${names} coming up.` : undefined
      }

      // Find eligible phones
      const eligibleAlerts = await prisma.phoneCityAlert.findMany({
        where: {
          cityId: city.id,
          enabled: true,
          phone: {
            smsOptInStatus: 'confirmed',
            account: {
              subscriptions: {
                some: {
                  status: { in: ['active', 'trialing'] },
                },
              },
            },
          },
        },
        include: {
          phone: true,
        },
      })

      let sentCount = 0
      let errorCount = 0

      // Use first of month as target date for deduplication
      const targetDate = new Date(now.startOf('month').toISODate()!)

      for (const alert of eligibleAlerts) {
        const phone = alert.phone

        try {
          const message = SMS_TEMPLATES.monthlyRecap(
            monthName,
            suspensionCount,
            highlights as string[],
            nextMonthPreview
          )

          // Create message record (unique constraint prevents dupes)
          const outbox = await prisma.messageOutbox.create({
            data: {
              phoneId: phone.id,
              cityId: city.id,
              type: 'monthly_recap',
              targetDate,
              body: message,
              status: 'queued',
            },
          })

          // Send SMS
          try {
            const result = await sendSms(phone.e164, message)
            if (result) {
              await prisma.messageOutbox.update({
                where: { id: outbox.id },
                data: {
                  twilioMessageSid: result.sid,
                  status: 'sent',
                },
              })
              sentCount++
            }
          } catch (smsError) {
            console.error(`Failed to send monthly recap to ${phone.e164}:`, smsError)
            await prisma.messageOutbox.update({
              where: { id: outbox.id },
              data: {
                status: 'failed',
                errorCode: smsError instanceof Error ? smsError.message : 'Unknown error',
              },
            })
            errorCount++
          }
        } catch {
          // Already sent this month
        }
      }

      results.push({
        city: city.slug,
        month: monthName,
        suspensionCount,
        eligible: eligibleAlerts.length,
        sent: sentCount,
        errors: errorCount,
      })
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Monthly recap job error:', error)
    return NextResponse.json(
      { error: 'Job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
