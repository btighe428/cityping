import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createManageToken } from '@/lib/tokens'
import { sendSms } from '@/lib/twilio'
import { SMS_TEMPLATES } from '@/lib/sms-templates'
import { sendEmail } from '@/lib/resend'
import { EMAIL_TEMPLATES } from '@/lib/email-templates'
import { DateTime } from 'luxon'
import { fetchMultipleDayStatus } from '@/lib/nyc-asp-status'
import { getSubwayAlertsSummary, formatSubwayAlertsForEmail } from '@/lib/mta-subway-alerts'
import { generateMonthlyInsights, formatMonthlyInsightsHtml, formatMonthlyInsightsText } from '@/lib/monthly-insights'

// TODO: Re-enable Stripe when ready for paid subscriptions
// import { createCheckoutSession } from '@/lib/stripe'

const FREE_MODE = true // Set to false to re-enable Stripe payments

// Helper to send onboarding emails:
// 1. Combined welcome + week ahead (single email)
// 2. Rich monthly overview (separate email)
async function sendOnboardingEmails(
  email: string,
  manageUrl: string,
  citySlug: string
) {
  const timezone = 'America/New_York'
  const now = DateTime.now().setZone(timezone)

  // Get city for fetching suspensions
  const city = await prisma.city.findUnique({ where: { slug: citySlug } })
  if (!city) return

  // 1. Send combined Welcome + Week Ahead email
  try {
    const startOfWeek = now.startOf('week') // Monday
    const endOfWeek = now.endOf('week') // Sunday
    const weekRange = `${startOfWeek.toFormat('MMM d')} - ${endOfWeek.toFormat('MMM d')}`

    const weekSuspensions = await prisma.suspensionEvent.findMany({
      where: {
        cityId: city.id,
        date: {
          gte: startOfWeek.toJSDate(),
          lte: endOfWeek.toJSDate(),
        },
        // Exclude emergency/weather suspensions - only show scheduled holidays
        source: {
          sourceType: { not: 'emergency' },
        },
      },
      orderBy: { date: 'asc' },
    })

    // Fetch rich data from NYC 311 API for each suspension date
    const dates = weekSuspensions.map(s => s.date.toISOString().split('T')[0])
    const dayStatusMap = dates.length > 0 ? await fetchMultipleDayStatus(dates) : new Map()

    const suspensionData = weekSuspensions.map(s => {
      const dateStr = s.date.toISOString().split('T')[0]
      const dt = DateTime.fromISO(dateStr, { zone: 'UTC' })
      const fullStatus = dayStatusMap.get(dateStr)

      return {
        date: dt.toFormat('MMM d'),
        dayOfWeek: dt.toFormat('EEEE'),
        summary: s.summary || 'ASP Suspended',
        meters: fullStatus?.meters.inEffect ? 'In Effect' : 'Suspended',
        trash: fullStatus?.collections.isSuspended ? 'Suspended' : 'Normal',
        schools: fullStatus?.schools.isClosed ? 'Closed' : 'Open',
      }
    })

    // Get subway alerts for the week
    const subwayAlerts = await getSubwayAlertsSummary(startOfWeek.toISODate()!, endOfWeek.toISODate()!)
    const subwayEmailContent = subwayAlerts.plannedWorkCount > 0
      ? formatSubwayAlertsForEmail(subwayAlerts.alerts)
      : { html: '', text: '' }

    const welcomeEmail = EMAIL_TEMPLATES.welcomeWithWeekAhead(
      weekRange,
      suspensionData,
      manageUrl,
      subwayEmailContent.html,
      subwayEmailContent.text
    )
    await sendEmail({
      to: email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
      text: welcomeEmail.text,
    })
  } catch (error) {
    console.error('Failed to send welcome + week ahead email:', error)
  }

  // 2. Send rich monthly overview (separate email)
  try {
    const monthName = now.toFormat('LLLL')
    const year = now.year

    // Generate comprehensive monthly insights using the dedicated module
    const insights = await generateMonthlyInsights(city.id, year, now.month, timezone)

    if (insights.totalSuspensions > 0) {
      // Use the rich formatting from monthly-insights module
      const insightsHtml = formatMonthlyInsightsHtml(insights)
      const insightsText = formatMonthlyInsightsText(insights)

      const monthlyEmail = EMAIL_TEMPLATES.monthlyStart(
        insightsHtml,
        insightsText,
        monthName,
        year,
        insights.totalSuspensions,
        manageUrl
      )
      await sendEmail({
        to: email,
        subject: monthlyEmail.subject,
        html: monthlyEmail.html,
        text: monthlyEmail.text,
      })
    }
  } catch (error) {
    console.error('Failed to send monthly outlook email:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, email, citySlugs } = body

    // Must have at least one contact method
    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Please provide a phone number or email address.' },
        { status: 400 }
      )
    }

    // Validate phone if provided (E.164 format)
    if (phone && !/^\+1\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Must be US number in E.164 format.' },
        { status: 400 }
      )
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 }
      )
    }

    // Validate city slugs
    if (!citySlugs || !Array.isArray(citySlugs) || citySlugs.length === 0) {
      return NextResponse.json(
        { error: 'At least one city must be selected.' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'

    // FREE MODE: Create account directly without Stripe
    if (FREE_MODE) {
      // Check if phone already exists
      if (phone) {
        const existingPhone = await prisma.phone.findUnique({
          where: { e164: phone },
          include: { account: { include: { subscriptions: true } } },
        })

        if (existingPhone) {
          // Phone exists - generate manage token and redirect
          const token = await createManageToken(existingPhone.id)
          const manageUrl = `${baseUrl}/m/${token}`

          // Send onboarding emails if email provided
          if (email) {
            const citySlug = (citySlugs as string[])[0] || 'nyc'
            await sendOnboardingEmails(email, manageUrl, citySlug)
          }

          return NextResponse.json({ url: manageUrl })
        }
      }

      // Check if email already exists
      if (email) {
        const existingAccount = await prisma.account.findFirst({
          where: { email },
          include: { phones: true },
        })

        if (existingAccount && existingAccount.phones.length > 0) {
          const token = await createManageToken(existingAccount.phones[0].id)
          const manageUrl = `${baseUrl}/m/${token}`

          // Send onboarding emails
          const citySlug = (citySlugs as string[])[0] || 'nyc'
          await sendOnboardingEmails(email, manageUrl, citySlug)

          return NextResponse.json({ url: manageUrl })
        }
      }

      // Create new account
      const account = await prisma.account.create({
        data: {
          stripeCustomerId: `free_${Date.now()}`, // Placeholder for free accounts
          email: email || null,
        },
      })

      // Create phone if provided
      let phoneRecord = null
      if (phone) {
        phoneRecord = await prisma.phone.create({
          data: {
            accountId: account.id,
            e164: phone,
            smsOptInStatus: 'pending',
          },
        })
      }

      // Create free subscription (valid for 1 year)
      const oneYearFromNow = new Date()
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

      await prisma.subscription.create({
        data: {
          accountId: account.id,
          stripeSubscriptionId: `free_${Date.now()}`,
          status: 'active',
          currentPeriodEnd: oneYearFromNow,
          cancelAtPeriodEnd: false,
          priceId: 'free_beta',
        },
      })

      // Set up city alerts
      const selectedCities = citySlugs as string[]
      for (const slug of selectedCities) {
        const city = await prisma.city.findUnique({ where: { slug } })
        if (city && phoneRecord) {
          await prisma.phoneCityAlert.create({
            data: {
              phoneId: phoneRecord.id,
              cityId: city.id,
              enabled: true,
              notifySms: true,
              notifyEmail: !!email,
            },
          })
        }
      }

      // Send opt-in SMS if phone provided
      if (phoneRecord) {
        const message = SMS_TEMPLATES.optIn()
        try {
          const result = await sendSms(phone, message)
          if (result) {
            await prisma.messageOutbox.create({
              data: {
                phoneId: phoneRecord.id,
                type: 'opt_in',
                body: message,
                status: 'sent',
                twilioMessageSid: result.sid,
              },
            })
          }
        } catch (error) {
          console.error('Failed to send opt-in SMS:', error)
        }
      }

      // Send onboarding emails if email provided
      if (email) {
        const manageUrl = phoneRecord
          ? `${baseUrl}/m/${await createManageToken(phoneRecord.id)}`
          : baseUrl
        const citySlug = selectedCities[0] || 'nyc'
        await sendOnboardingEmails(email, manageUrl, citySlug)
      }

      // Generate manage token and redirect
      if (phoneRecord) {
        const token = await createManageToken(phoneRecord.id)
        return NextResponse.json({ url: `${baseUrl}/m/${token}` })
      }

      // Email-only account - redirect to success page
      return NextResponse.json({ url: `${baseUrl}/?signup=success` })
    }

    // PAID MODE: Use Stripe checkout
    // const session = await createCheckoutSession({
    //   phone,
    //   email,
    //   citySlugs,
    //   successUrl: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    //   cancelUrl: baseUrl,
    // })
    // return NextResponse.json({ url: session.url })

    return NextResponse.json(
      { error: 'Payments are currently disabled' },
      { status: 503 }
    )
  } catch (error) {
    console.error('Checkout create error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: errorMessage },
      { status: 500 }
    )
  }
}
