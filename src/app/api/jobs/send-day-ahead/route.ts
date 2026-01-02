import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/resend'
import { fetchDayAheadData, generateDayAheadEmailHtml } from '@/lib/day-ahead'

// Verify cron secret for security
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
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001'

    // Fetch day-ahead data for tomorrow
    const dayAheadData = await fetchDayAheadData()

    if (!dayAheadData) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch day-ahead data',
      }, { status: 500 })
    }

    console.log(`[Day Ahead] Sending emails for ${dayAheadData.displayDate}`)
    console.log(`[Day Ahead] ASP: ${dayAheadData.summary.aspSummary}`)
    console.log(`[Day Ahead] Weather: ${dayAheadData.weather?.shortForecast || 'N/A'}`)

    // Find all users with active subscriptions who want email notifications
    const eligibleUsers = await prisma.phoneCityAlert.findMany({
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
        city: true,
      },
    })

    // Deduplicate by email (in case user has multiple cities)
    const uniqueEmails = new Map<string, { email: string; manageUrl: string }>()
    for (const alert of eligibleUsers) {
      const email = alert.phone.account.email
      if (email && !uniqueEmails.has(email)) {
        uniqueEmails.set(email, {
          email,
          manageUrl: `${baseUrl}/dashboard`, // TODO: Generate manage token
        })
      }
    }

    let sent = 0
    let errors = 0
    const errorDetails: string[] = []

    // Send emails
    for (const [email, userData] of uniqueEmails) {
      try {
        const { subject, html, text } = generateDayAheadEmailHtml(
          dayAheadData,
          userData.manageUrl
        )

        await sendEmail({
          to: email,
          subject,
          html,
          text,
        })

        sent++
        console.log(`[Day Ahead] Sent to ${email}`)
      } catch (err) {
        errors++
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errorDetails.push(`${email}: ${errorMsg}`)
        console.error(`[Day Ahead] Error sending to ${email}:`, err)
      }
    }

    const result = {
      success: true,
      date: dayAheadData.date,
      displayDate: dayAheadData.displayDate,
      summary: {
        asp: dayAheadData.summary.aspSummary,
        canSkipShuffle: dayAheadData.summary.canSkipShuffle,
        weather: dayAheadData.weather?.shortForecast || null,
      },
      emails: {
        eligible: uniqueEmails.size,
        sent,
        errors,
      },
      ...(errorDetails.length > 0 && { errorDetails }),
    }

    console.log(`[Day Ahead] Complete: ${sent} sent, ${errors} errors`)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Day Ahead] Job failed:', error)
    return NextResponse.json(
      {
        error: 'Job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
