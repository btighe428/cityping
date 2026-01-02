import { prisma } from '@/lib/db'
import { DateTime } from 'luxon'

async function getUpcomingSuspensions() {
  const today = DateTime.now().setZone('America/New_York').toISODate()

  const suspensions = await prisma.suspensionEvent.findMany({
    where: {
      city: { slug: 'nyc' },
      date: { gte: new Date(today!) },
    },
    orderBy: { date: 'asc' },
    take: 3,
    select: {
      date: true,
      summary: true,
    },
  })

  return suspensions
}

function formatDate(date: Date): string {
  const dateStr = date.toISOString().split('T')[0]
  const dt = DateTime.fromISO(dateStr, { zone: 'UTC' })
  return dt.toFormat('LLL d')
}

export default async function UpcomingSuspensions() {
  let suspensions: { date: Date; summary: string | null }[] = []

  try {
    suspensions = await getUpcomingSuspensions()
  } catch {
    // Database might not be set up yet
    return null
  }

  if (suspensions.length === 0) {
    return null
  }

  return (
    <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 max-w-md mx-auto">
      <h3 className="text-sm font-semibold text-[var(--navy-500)] uppercase tracking-wide mb-3">
        Upcoming Suspensions
      </h3>
      <ul className="space-y-2">
        {suspensions.map((s, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--navy-800)]" />
            <span className="text-[var(--navy-800)] font-medium">
              {formatDate(s.date)}
            </span>
            <span className="text-[var(--navy-500)]">—</span>
            <span className="text-[var(--navy-600)]">{s.summary}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
