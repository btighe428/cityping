import { DateTime } from 'luxon'

interface Suspension {
  date: string
  summary: string | null
}

interface Props {
  suspensions: Suspension[]
  timezone: string
}

export default function UpcomingSuspensionsTable({ suspensions, timezone }: Props) {
  // Filter to next 2 months and group by month
  const now = DateTime.now().setZone(timezone)
  const twoMonthsLater = now.plus({ months: 2 }).endOf('month')

  const upcomingSuspensions = suspensions
    .filter(s => {
      const date = DateTime.fromISO(s.date.split('T')[0], { zone: timezone })
      return date >= now.startOf('day') && date <= twoMonthsLater
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  if (upcomingSuspensions.length === 0) {
    return (
      <div className="bg-white border border-[var(--navy-200)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--navy-800)] mb-4">
          Upcoming Suspensions
        </h3>
        <p className="text-[var(--navy-500)]">No suspensions in the next 2 months.</p>
      </div>
    )
  }

  // Group by month
  const byMonth: Record<string, Suspension[]> = {}
  for (const s of upcomingSuspensions) {
    const monthKey = s.date.slice(0, 7) // YYYY-MM
    if (!byMonth[monthKey]) byMonth[monthKey] = []
    byMonth[monthKey].push(s)
  }

  return (
    <div className="bg-white border border-[var(--navy-200)] rounded-lg p-6">
      <h3 className="text-lg font-semibold text-[var(--navy-800)] mb-4">
        Upcoming Suspensions (Next 2 Months)
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--navy-200)]">
              <th className="text-left py-2 px-3 text-[var(--navy-600)] font-medium">Date</th>
              <th className="text-left py-2 px-3 text-[var(--navy-600)] font-medium">Day</th>
              <th className="text-left py-2 px-3 text-[var(--navy-600)] font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byMonth).map(([monthKey, monthSuspensions]) => {
              const monthDate = DateTime.fromISO(monthKey + '-01', { zone: timezone })
              const monthName = monthDate.toFormat('LLLL yyyy')

              return (
                <>
                  <tr key={monthKey} className="bg-[var(--navy-50)]">
                    <td colSpan={3} className="py-2 px-3 font-semibold text-[var(--navy-700)]">
                      {monthName}
                    </td>
                  </tr>
                  {monthSuspensions.map((s, i) => {
                    const dateStr = s.date.split('T')[0]
                    const date = DateTime.fromISO(dateStr, { zone: timezone })
                    const isToday = dateStr === now.toISODate()

                    return (
                      <tr
                        key={`${monthKey}-${i}`}
                        className={`border-b border-[var(--navy-100)] ${isToday ? 'bg-green-50' : ''}`}
                      >
                        <td className="py-2 px-3 text-[var(--navy-800)]">
                          {date.toFormat('MMM d')}
                          {isToday && (
                            <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                              TODAY
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[var(--navy-600)]">
                          {date.toFormat('EEEE')}
                        </td>
                        <td className="py-2 px-3 text-[var(--navy-600)]">
                          {s.summary || 'ASP Suspended'}
                        </td>
                      </tr>
                    )
                  })}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[var(--navy-400)]">
        Source: NYC 311 Official Calendar
      </p>
    </div>
  )
}
