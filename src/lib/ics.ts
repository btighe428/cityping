import ical, { VEvent } from 'node-ical'
import { DateTime } from 'luxon'
import crypto from 'crypto'

export interface ParsedEvent {
  uid: string | null
  summary: string | null
  date: string // ISO date string YYYY-MM-DD
  rawStart: string | null
  rawEnd: string | null
}

export interface IcsFetchResult {
  changed: boolean
  etag: string | null
  lastModified: string | null
  rawHash: string | null
  events: ParsedEvent[]
}

export async function fetchAndParseIcs(
  sourceUrl: string,
  cityTimezone: string,
  previousEtag?: string | null,
  previousLastModified?: string | null
): Promise<IcsFetchResult> {
  // Fetch with conditional headers
  const headers: HeadersInit = {}
  if (previousEtag) {
    headers['If-None-Match'] = previousEtag
  }
  if (previousLastModified) {
    headers['If-Modified-Since'] = previousLastModified
  }

  const response = await fetch(sourceUrl, { headers })

  // Not modified
  if (response.status === 304) {
    return {
      changed: false,
      etag: previousEtag ?? null,
      lastModified: previousLastModified ?? null,
      rawHash: null,
      events: [],
    }
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ICS: ${response.status} ${response.statusText}`)
  }

  const rawIcs = await response.text()
  const etag = response.headers.get('etag')
  const lastModified = response.headers.get('last-modified')
  const rawHash = crypto.createHash('sha256').update(rawIcs).digest('hex')

  // Parse ICS
  const parsed = ical.parseICS(rawIcs)
  const events: ParsedEvent[] = []

  for (const key in parsed) {
    const component = parsed[key]
    if (component.type !== 'VEVENT') continue

    const vevent = component as VEvent
    const uid = vevent.uid ?? null

    // Handle summary that can be string or object with {params, val}
    let summary: string | null = null
    if (vevent.summary) {
      if (typeof vevent.summary === 'string') {
        summary = vevent.summary
      } else if (typeof vevent.summary === 'object' && 'val' in vevent.summary) {
        summary = (vevent.summary as { val: string }).val
      }
    }

    // If summary is generic, try to extract holiday name from description
    // Format: "Alternate Side Parking suspended for [Holiday Name]. ..."
    if (summary === 'Alternate Side Parking Suspended' && vevent.description) {
      const desc = typeof vevent.description === 'string'
        ? vevent.description
        : (vevent.description as { val: string }).val
      const match = desc.match(/suspended for ([^.]+)\./i)
      if (match && match[1]) {
        summary = match[1].trim()
      }
    }

    if (!vevent.start) continue

    const startDate = vevent.start
    const endDate = vevent.end

    // Expand to per-day events
    const expandedDates = expandEventToDays(startDate, endDate, cityTimezone)

    for (const date of expandedDates) {
      events.push({
        uid,
        summary,
        date,
        rawStart: startDate.toISOString(),
        rawEnd: endDate?.toISOString() ?? null,
      })
    }
  }

  return {
    changed: true,
    etag,
    lastModified,
    rawHash,
    events,
  }
}

function expandEventToDays(
  start: Date & { dateOnly?: boolean },
  end: (Date & { dateOnly?: boolean }) | undefined,
  timezone: string
): string[] {
  const dates: string[] = []

  // For date-only events (like holidays), extract the date directly from ISO string
  // to avoid timezone conversion issues
  if ((start as { dateOnly?: boolean }).dateOnly) {
    const startStr = start.toISOString().split('T')[0] // "2026-12-25"

    if (!end) {
      dates.push(startStr)
      return dates
    }

    const endStr = end.toISOString().split('T')[0]

    // DTEND is exclusive for all-day events, so Dec 25-26 means just Dec 25
    let currentDt = DateTime.fromISO(startStr, { zone: 'UTC' })
    const endDt = DateTime.fromISO(endStr, { zone: 'UTC' }).minus({ days: 1 })

    while (currentDt <= endDt) {
      dates.push(currentDt.toISODate()!)
      currentDt = currentDt.plus({ days: 1 })
    }

    return dates
  }

  // For timed events, convert to city timezone
  const startDt = DateTime.fromJSDate(start).setZone(timezone)

  if (!end) {
    // Single day event
    dates.push(startDt.toISODate()!)
    return dates
  }

  const endDt = DateTime.fromJSDate(end).setZone(timezone)

  // For all-day events, DTEND is exclusive
  // So Dec 24 to Dec 26 means Dec 24 and Dec 25 only
  // We detect all-day events by checking if time is midnight
  const isAllDay = startDt.hour === 0 && startDt.minute === 0 &&
                   endDt.hour === 0 && endDt.minute === 0

  if (isAllDay) {
    // Expand from start to (end - 1 day)
    let current = startDt
    const exclusiveEnd = endDt.minus({ days: 1 })

    while (current <= exclusiveEnd) {
      dates.push(current.toISODate()!)
      current = current.plus({ days: 1 })
    }
  } else {
    // Timed event - just use the start date
    dates.push(startDt.toISODate()!)
  }

  return dates
}

// Get tomorrow's date in a specific timezone
export function getTomorrowInTimezone(timezone: string): string {
  const now = DateTime.now().setZone(timezone)
  const tomorrow = now.plus({ days: 1 })
  return tomorrow.toISODate()!
}

// Get today's date in a specific timezone
export function getTodayInTimezone(timezone: string): string {
  const now = DateTime.now().setZone(timezone)
  return now.toISODate()!
}

// Format an ISO date string to a human-readable format
export function formatDateForDisplay(isoDate: string): string {
  const dt = DateTime.fromISO(isoDate, { zone: 'UTC' })
  return dt.toLocaleString({
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Check if it's the right time to send reminders
export function isReminderTime(timezone: string, targetHour: number = 18): boolean {
  const now = DateTime.now().setZone(timezone)
  return now.hour === targetHour
}

// Get the first of the current month
export function getFirstOfMonthInTimezone(timezone: string): string {
  const now = DateTime.now().setZone(timezone)
  return now.startOf('month').toISODate()!
}

// Get the previous month's date range
export function getPreviousMonthRange(timezone: string): { start: string; end: string } {
  const now = DateTime.now().setZone(timezone)
  const lastMonth = now.minus({ months: 1 })
  const start = lastMonth.startOf('month').toISODate()!
  const end = lastMonth.endOf('month').toISODate()!
  return { start, end }
}
