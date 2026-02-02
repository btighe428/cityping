import ical from 'node-ical'
import { DateTime } from 'luxon'

function expandEventToDays(
  start: Date & { dateOnly?: boolean },
  end: (Date & { dateOnly?: boolean }) | undefined,
): string[] {
  const dates: string[] = []

  // For date-only events (like holidays), extract the date directly from ISO string
  if ((start as { dateOnly?: boolean }).dateOnly) {
    const startStr = start.toISOString().split('T')[0]

    if (!end) {
      dates.push(startStr)
      return dates
    }

    const endStr = end.toISOString().split('T')[0]

    let currentDt = DateTime.fromISO(startStr, { zone: 'UTC' })
    const endDt = DateTime.fromISO(endStr, { zone: 'UTC' }).minus({ days: 1 })

    while (currentDt <= endDt) {
      dates.push(currentDt.toISODate()!)
      currentDt = currentDt.plus({ days: 1 })
    }

    return dates
  }

  return [start.toISOString().split('T')[0]]
}

async function main() {
  const response = await fetch('https://www.nyc.gov/html/dot/downloads/misc/2026-alternate-side.ics')
  const text = await response.text()
  const parsed = ical.parseICS(text)

  let count = 0
  for (const key in parsed) {
    const c = parsed[key]
    if (c.type !== 'VEVENT') continue
    count++
    if (count > 5) break

    const start = c.start as Date & { dateOnly?: boolean }
    const end = c.end as Date & { dateOnly?: boolean }
    const desc = ((c.description as { val?: string })?.val || c.description as string)?.substring(0, 50)

    const expandedDates = expandEventToDays(start, end)

    console.log('Event:', desc)
    console.log('  Raw start:', start.toISOString(), 'dateOnly:', start.dateOnly)
    console.log('  Expanded dates:', expandedDates)
    console.log('')
  }
}
main()
