import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSms } from '@/lib/twilio'
import { SMS_TEMPLATES } from '@/lib/sms-templates'
import { getTomorrowInTimezone, formatDateForDisplay } from '@/lib/ics'
import { generateParkingTips, formatTipsHtml, formatTipsSms } from '@/lib/parking-tips'
import { sendEmailTracked, acquireJobLock, releaseJobLock } from '@/lib/email-outbox'
import { JobMonitor } from '@/lib/job-monitor'
import { EMAIL_TEMPLATES } from '@/lib/email-templates'
import { checkSmsFrequencyCap, checkEmailFrequencyCap } from '@/lib/frequency-cap'
import { MESSAGE_PRIORITY } from '@/lib/delivery-config'

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

  // Acquire distributed lock to prevent concurrent runs
  const lockId = await acquireJobLock('send-reminders', 30)
  if (!lockId) {
    console.log('[Send Reminders] Another instance is already running, skipping')
    return NextResponse.json({ 
      success: false, 
      reason: 'Another instance is already running' 
    }, { status: 429 })
  }

  const jobMonitor = await JobMonitor.start('send-reminders')
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001'

  try {
    const cities = await prisma.city.findMany()
    const results = []
    const tomorrowDate = new Date()
    tomorrowDate.setHours(0, 0, 0, 0)

    for (const city of cities) {
      const tomorrow = getTomorrowInTimezone(city.timezone)
      const tomorrowFormatted = formatDateForDisplay(tomorrow)
      const tomorrowDateObj = new Date(tomorrow)
      tomorrowDateObj.setHours(0, 0, 0, 0)

      // Check for suspensions tomorrow
      const suspensions = await prisma.suspensionEvent.findMany({
        where: {
          cityId: city.id,
          date: tomorrowDateObj,
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
      const tips = await generateParkingTips(city.id, tomorrowDateObj)
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
      let smsSkipped = 0
      let smsErrors = 0
      let emailSent = 0
      let emailSkipped = 0
      let emailErrors = 0
      let smsCapped = 0
      let emailCapped = 0

      const holidayName = suspension.summary || 'Holiday'
      const manageUrl = `${baseUrl}/dashboard`

      for (const alert of eligibleAlerts) {
        const phone = alert.phone
        const account = phone.account

        // Check frequency caps before sending (reminders are URGENT priority)
        const [smsCapCheck, emailCapCheck] = await Promise.all([
          alert.notifySms && phone.smsOptInStatus === 'confirmed'
            ? checkSmsFrequencyCap(account.id, 'reminder', new Date())
            : Promise.resolve({ allowed: false, reason: 'SMS not enabled' }),
          alert.notifyEmail && account.email
            ? checkEmailFrequencyCap(account.id, 'reminder', new Date())
            : Promise.resolve({ allowed: false, reason: 'Email not enabled' }),
        ])

        // Send SMS if enabled, confirmed, and under frequency cap
        if (alert.notifySms && phone.smsOptInStatus === 'confirmed') {
          if (!smsCapCheck.allowed) {
            smsCapped++
            console.log(`[Send Reminders] SMS capped for ${phone.e164}: ${smsCapCheck.reason}`)
            continue
          }

          try {
            const smsMessage = SMS_TEMPLATES.reminder(tomorrow, holidayName)

            // Try to create message record (unique constraint prevents dupes)
            const outbox = await prisma.messageOutbox.create({
              data: {
                phoneId: phone.id,
                cityId: city.id,
                type: 'reminder',
                targetDate: tomorrowDateObj,
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
              smsSkipped++ // Already sent
            } else {
              console.error(`SMS error for ${phone.e164}:`, err)
              smsErrors++
            }
          }
        }

        // Send email if enabled, has email, and under frequency cap - WITH TRACKING
        if (alert.notifyEmail && account.email) {
          if (!emailCapCheck.allowed) {
            emailCapped++
            console.log(`[Send Reminders] Email capped for ${account.email}: ${emailCapCheck.reason}`)
            continue
          }

          try {
            const emailContent = EMAIL_TEMPLATES.reminder(
              tomorrowFormatted,
              holidayName,
              manageUrl,
              tipsHtml,
              tipsText
            )

            // Use tracked email sending for idempotency
            const result = await sendEmailTracked(
              {
                to: account.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
              },
              'reminder',
              tomorrowDateObj,
              {
                cityId: city.id,
                phoneId: phone.id,
                accountId: account.id,
                holidayName,
              }
            )

            if (result.alreadySent) {
              emailSkipped++
            } else if (result.success) {
              emailSent++
            } else {
              emailErrors++
            }
          } catch (err) {
            console.error(`Email error for ${account.email}:`, err)
            emailErrors++
          }
        }
      }

      results.push({
        city: city.slug,
        status: 'processed',
        tomorrow,
        suspension: suspension.summary,
        eligible: eligibleAlerts.length,
        sms: { sent: smsSent, skipped: smsSkipped, errors: smsErrors, capped: smsCapped },
        email: { sent: emailSent, skipped: emailSkipped, errors: emailErrors, capped: emailCapped },
      })
    }

    const totalSent = results.reduce((sum, r) => sum + (r.sms?.sent || 0) + (r.email?.sent || 0), 0)
    const totalSkipped = results.reduce((sum, r) => sum + (r.sms?.skipped || 0) + (r.email?.skipped || 0), 0)
    const totalErrors = results.reduce((sum, r) => sum + (r.sms?.errors || 0) + (r.email?.errors || 0), 0)

    await jobMonitor.success({
      itemsProcessed: totalSent,
      itemsFailed: totalErrors,
      metadata: {
        citiesProcessed: results.length,
        totalSkipped,
      },
    })

    // Release the lock
    await releaseJobLock('send-reminders', lockId)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalSent,
        totalSkipped,
        totalErrors,
      },
    })
  } catch (error) {
    console.error('Send reminders job error:', error)
    await jobMonitor.fail(error)
    await releaseJobLock('send-reminders', lockId)
    return NextResponse.json(
      { error: 'Job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
