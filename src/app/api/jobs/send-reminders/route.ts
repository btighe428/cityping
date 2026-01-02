import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSms } from '@/lib/twilio'
import { sendEmail } from '@/lib/resend'
import { SMS_TEMPLATES } from '@/lib/sms-templates'
import { EMAIL_TEMPLATES } from '@/lib/email-templates'
import { getTomorrowInTimezone, formatDateForDisplay } from '@/lib/ics'
import { generateParkingTips, formatTipsHtml, formatTipsSms } from '@/lib/parking-tips'
import { fetchDayAheadData, generateDayAheadEmailHtml } from '@/lib/day-ahead'

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
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001'

    for (const city of cities) {
      const tomorrow = getTomorrowInTimezone(city.timezone)
      const tomorrowFormatted = formatDateForDisplay(tomorrow)
      const tomorrowDate = new Date(tomorrow)

      // Check for suspensions tomorrow
      const suspensions = await prisma.suspensionEvent.findMany({
        where: {
          cityId: city.id,
          date: tomorrowDate,
        },
      })

      if (suspensions.length === 0) {
        results.push({
          city: city.slug,
          status: 'no_suspension',
          tomorrow,
        })
        continue
      }

      // Get the first suspension for the message
      const suspension = suspensions[0]

      // Generate parking tips for consecutive suspensions
      const tips = await generateParkingTips(city.id, tomorrowDate)
      const tipsHtml = formatTipsHtml(tips)
      const tipsText = tips.length > 0 ? formatTipsSms(tips) : ''

      // Find eligible users (with active subscription)
      const eligibleAlerts = await prisma.phoneCityAlert.findMany({
        where: {
          cityId: city.id,
          enabled: true,
          phone: {
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
          phone: {
            include: {
              account: true,
            },
          },
        },
      })

      let smsSent = 0
      let emailSent = 0
      let skipped = 0
      let errors = 0

      for (const alert of eligibleAlerts) {
        const phone = alert.phone
        const account = phone.account
        const holidayName = suspension.summary || 'Holiday'

        // Send SMS if enabled and confirmed
        if (alert.notifySms && phone.smsOptInStatus === 'confirmed') {
          try {
            const smsMessage = SMS_TEMPLATES.reminder(tomorrow, holidayName)

            // Try to create message record (unique constraint prevents dupes)
            const outbox = await prisma.messageOutbox.create({
              data: {
                phoneId: phone.id,
                cityId: city.id,
                type: 'reminder',
                targetDate: tomorrowDate,
                body: smsMessage,
                status: 'queued',
              },
            })

            const result = await sendSms(phone.e164, smsMessage)
            await prisma.messageOutbox.update({
              where: { id: outbox.id },
              data: {
                twilioMessageSid: result.sid,
                status: 'sent',
              },
            })
            smsSent++
          } catch (err) {
            if ((err as { code?: string })?.code === 'P2002') {
              skipped++ // Already sent
            } else {
              console.error(`SMS error for ${phone.e164}:`, err)
              errors++
            }
          }
        }

        // Send email if enabled and account has email
        if (alert.notifyEmail && account.email) {
          try {
            const manageUrl = `${baseUrl}/dashboard` // TODO: Generate manage token
            const emailContent = EMAIL_TEMPLATES.reminder(
              tomorrowFormatted,
              holidayName,
              manageUrl,
              tipsHtml,
              tipsText
            )

            await sendEmail({
              to: account.email,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
            })
            emailSent++
          } catch (err) {
            console.error(`Email error for ${account.email}:`, err)
            errors++
          }
        }
      }

      results.push({
        city: city.slug,
        status: 'processed',
        tomorrow,
        suspension: suspension.summary,
        eligible: eligibleAlerts.length,
        smsSent,
        emailSent,
        skipped,
        errors,
      })
    }

    // ========================================
    // PART 2: Send Day Ahead emails to ALL users
    // ========================================
    const dayAheadResults = {
      sent: 0,
      errors: 0,
      errorDetails: [] as string[],
    }

    try {
      // Fetch comprehensive day-ahead data
      const dayAheadData = await fetchDayAheadData()

      if (dayAheadData) {
        console.log(`[Day Ahead] Preparing emails for ${dayAheadData.displayDate}`)

        // Find ALL users with email notifications enabled
        const allEmailUsers = await prisma.phoneCityAlert.findMany({
          where: {
            enabled: true,
            notifyEmail: true,
            phone: {
              account: {
                email: { not: null },
                subscriptions: {
                  some: {
                    status: { in: ['active', 'trialing'] },
                  },
                },
              },
            },
          },
          include: {
            phone: {
              include: {
                account: true,
              },
            },
          },
        })

        // Deduplicate by email
        const uniqueEmails = new Map<string, string>()
        for (const alert of allEmailUsers) {
          const email = alert.phone.account.email
          if (email && !uniqueEmails.has(email)) {
            uniqueEmails.set(email, email)
          }
        }

        // Send Day Ahead email to each unique user
        for (const email of uniqueEmails.keys()) {
          try {
            const manageUrl = `${baseUrl}/dashboard`
            const { subject, html, text } = generateDayAheadEmailHtml(
              dayAheadData,
              manageUrl
            )

            await sendEmail({
              to: email,
              subject,
              html,
              text,
            })
            dayAheadResults.sent++
          } catch (err) {
            dayAheadResults.errors++
            const errorMsg = err instanceof Error ? err.message : 'Unknown error'
            dayAheadResults.errorDetails.push(`${email}: ${errorMsg}`)
            console.error(`[Day Ahead] Error sending to ${email}:`, err)
          }
        }

        console.log(`[Day Ahead] Complete: ${dayAheadResults.sent} sent, ${dayAheadResults.errors} errors`)
      } else {
        console.warn('[Day Ahead] Failed to fetch day-ahead data')
      }
    } catch (dayAheadError) {
      console.error('[Day Ahead] Job section failed:', dayAheadError)
    }

    return NextResponse.json({
      success: true,
      results,
      dayAhead: {
        sent: dayAheadResults.sent,
        errors: dayAheadResults.errors,
      },
    })
  } catch (error) {
    console.error('Send reminders job error:', error)
    return NextResponse.json(
      { error: 'Job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
