import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import DashboardClient from '@/components/DashboardClient'
import { createManageToken } from '@/lib/tokens'

interface Props {
  searchParams: Promise<{ session_id?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams
  const sessionId = params.session_id

  if (!sessionId) {
    redirect('/')
  }

  // Retrieve Stripe session
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    redirect('/')
  }

  if (session.status !== 'complete') {
    redirect('/')
  }

  // Get phone from metadata
  const phoneE164 = session.metadata?.phone_e164
  if (!phoneE164) {
    redirect('/')
  }

  // Get phone and related data
  const phone = await prisma.phone.findUnique({
    where: { e164: phoneE164 },
    include: {
      account: {
        include: {
          subscriptions: {
            where: { status: { in: ['active', 'trialing'] } },
            take: 1,
          },
        },
      },
      cityAlerts: {
        include: { city: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!phone) {
    // Webhook might not have processed yet - show loading or redirect
    redirect('/')
  }

  // Get suspensions for today and the next 6 months
  // Use start of day to include today's suspensions
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sixMonthsLater = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate())

  const suspensions = await prisma.suspensionEvent.findMany({
    where: {
      city: { slug: 'nyc' },
      date: {
        gte: today,
        lte: sixMonthsLater,
      },
    },
    orderBy: { date: 'asc' },
  })

  // Create a manage token for this session
  const token = await createManageToken(phone.id)

  const city = await prisma.city.findUnique({ where: { slug: 'nyc' } })
  const timezone = city?.timezone || 'America/New_York'

  return (
    <DashboardClient
      phone={{
        e164: phone.e164,
        smsOptInStatus: phone.smsOptInStatus,
      }}
      email={phone.account.email}
      subscription={phone.account.subscriptions[0] || null}
      cityAlerts={phone.cityAlerts.map(a => ({
        city: { slug: a.city.slug, name: a.city.name },
        enabled: a.enabled,
        notifySms: a.notifySms,
        notifyEmail: a.notifyEmail,
        preferredSendTimeLocal: a.preferredSendTimeLocal,
      }))}
      suspensions={suspensions.map(s => ({
        date: s.date.toISOString(),
        summary: s.summary,
      }))}
      messages={phone.messages.map(m => ({
        createdAt: m.createdAt.toISOString(),
        type: m.type,
        body: m.body,
      }))}
      token={token}
      timezone={timezone}
    />
  )
}
