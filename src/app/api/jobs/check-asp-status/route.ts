import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchASPStatus } from '@/lib/nyc-asp-status'
import { sendSms } from '@/lib/twilio'
import { sendEmail } from '@/lib/resend'
import { EMAIL_TEMPLATES } from '@/lib/email-templates'
import { createManageToken } from '@/lib/tokens'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get NYC city record
    const nycCity = await prisma.city.findUnique({
      where: { slug: 'nyc' },
    })

    if (!nycCity) {
      return NextResponse.json({ error: 'NYC city not found' }, { status: 404 })
    }

    // Fetch current ASP status from NYC.gov
    const status = await fetchASPStatus()

    if (!status) {
      return NextResponse.json({
        message: 'Could not fetch ASP status from NYC.gov',
        checked: false,
      })
    }

    const today = new Date().toISOString().split('T')[0]

    // If ASP is suspended, check if we have this in our database
    if (status.isSuspended) {
      // Check if this suspension already exists
      const existingSuspension = await prisma.suspensionEvent.findFirst({
        where: {
          cityId: nycCity.id,
          date: new Date(today),
        },
      })

      if (!existingSuspension) {
        // New suspension! Add it to the database
        let emergencySource = await prisma.calendarSource.findFirst({
          where: {
            cityId: nycCity.id,
            sourceType: 'emergency',
          },
        })

        if (!emergencySource) {
          emergencySource = await prisma.calendarSource.create({
            data: {
              cityId: nycCity.id,
              sourceType: 'emergency',
              sourceUrl: 'https://www.nyc.gov/html/dot/html/motorist/scrintro.shtml',
              isActive: true,
            },
          })
        }

        // Create the suspension event
        await prisma.suspensionEvent.create({
          data: {
            cityId: nycCity.id,
            sourceId: emergencySource.id,
            eventUid: `emergency-${today}`,
            summary: status.reason || 'Emergency Suspension',
            date: new Date(today),
          },
        })

        // Send immediate alerts
        const alertsSent = await sendEmergencyAlerts(
          nycCity.id,
          today,
          status.reason || 'Emergency Suspension'
        )

        return NextResponse.json({
          message: 'New suspension detected and alerts sent!',
          status: status.status,
          reason: status.reason,
          date: today,
          alertsSent: alertsSent.length,
          isNew: true,
        })
      }

      return NextResponse.json({
        message: 'ASP is suspended (already in database)',
        status: status.status,
        reason: status.reason,
        date: today,
        isNew: false,
      })
    }

    return NextResponse.json({
      message: 'ASP is in effect',
      status: status.status,
      lastChecked: status.lastChecked,
    })
  } catch (error) {
    console.error('ASP status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check ASP status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Send emergency alerts for same-day suspensions
async function sendEmergencyAlerts(cityId: string, date: string, reason: string): Promise<string[]> {
  const alertsSent: string[] = []
  const baseUrl = process.env.APP_BASE_URL || 'https://parkping.net'

  // Get all phones subscribed to this city with active accounts
  const phoneAlerts = await prisma.phoneCityAlert.findMany({
    where: {
      cityId,
      enabled: true,
    },
    include: {
      phone: {
        include: {
          account: {
            include: {
              subscriptions: {
                where: {
                  status: 'active',
                },
              },
            },
          },
        },
      },
    },
  })

  for (const alert of phoneAlerts) {
    const phone = alert.phone
    const account = phone.account

    // Check if account has active subscription
    if (account.subscriptions.length === 0) {
      continue
    }

    // Check if we already sent an alert for this date
    const existingMessage = await prisma.messageOutbox.findFirst({
      where: {
        phoneId: phone.id,
        cityId,
        type: 'reminder',
        targetDate: new Date(date),
      },
    })

    if (existingMessage) {
      continue // Already alerted
    }

    // Send SMS if opted in and SMS alerts enabled
    if (phone.smsOptInStatus === 'confirmed' && alert.notifySms) {
      try {
        const message = `🚨 ASP is suspended TODAY for ${reason}. No need to move your car! -ParkPing`
        const result = await sendSms(phone.e164, message)

        if (result) {
          await prisma.messageOutbox.create({
            data: {
              phoneId: phone.id,
              cityId,
              type: 'reminder',
              targetDate: new Date(date),
              body: message,
              status: 'sent',
              twilioMessageSid: result.sid,
            },
          })
          alertsSent.push(`sms:${phone.e164}`)
        }
      } catch (error) {
        console.error(`Failed to send SMS to ${phone.e164}:`, error)
      }
    }

    // Send email if enabled
    if (account.email && alert.notifyEmail) {
      try {
        const token = await createManageToken(phone.id)
        const manageUrl = `${baseUrl}/m/${token}`

        const emailContent = EMAIL_TEMPLATES.reminder(
          date,
          reason,
          manageUrl
        )

        await sendEmail({
          to: account.email,
          subject: `🚨 ASP Suspended Today — ${reason}`,
          html: emailContent.html,
          text: emailContent.text,
        })

        alertsSent.push(`email:${account.email}`)
      } catch (error) {
        console.error(`Failed to send email to ${account.email}:`, error)
      }
    }
  }

  return alertsSent
}

// Support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
