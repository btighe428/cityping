import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { validateManageToken } from '@/lib/tokens'
import DashboardClient from '@/components/DashboardClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ManagePage({ params }: Props) {
  const { token } = await params

  // Validate token
  const validation = await validateManageToken(token)
  if (!validation.valid) {
    notFound()
  }

  // Get phone and related data
  const phone = await prisma.phone.findUnique({
    where: { id: validation.phoneId },
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
    notFound()
  }

  // Check subscription status
  if (phone.account.subscriptions.length === 0) {
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
