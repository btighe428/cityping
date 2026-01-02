import { DateTime } from 'luxon'

// Test ICS expansion logic
describe('ICS Event Expansion', () => {
  // Use UTC for tests to avoid timezone conversion issues
  const timezone = 'UTC'

  function expandEventToDays(
    start: Date,
    end: Date | undefined,
    timezone: string
  ): string[] {
    const dates: string[] = []
    const startDt = DateTime.fromJSDate(start).setZone(timezone)

    if (!end) {
      dates.push(startDt.toISODate()!)
      return dates
    }

    const endDt = DateTime.fromJSDate(end).setZone(timezone)
    const isAllDay = startDt.hour === 0 && startDt.minute === 0 &&
                     endDt.hour === 0 && endDt.minute === 0

    if (isAllDay) {
      let current = startDt
      const exclusiveEnd = endDt.minus({ days: 1 })
      while (current <= exclusiveEnd) {
        dates.push(current.toISODate()!)
        current = current.plus({ days: 1 })
      }
    } else {
      dates.push(startDt.toISODate()!)
    }

    return dates
  }

  it('should handle single-day event without end date', () => {
    const start = new Date('2025-12-25T00:00:00Z')
    const result = expandEventToDays(start, undefined, timezone)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('2025-12-25')
  })

  it('should expand multi-day all-day event correctly (DTEND exclusive)', () => {
    // Dec 24 to Dec 26 (all-day, DTEND exclusive) should be Dec 24 and Dec 25
    const start = new Date('2025-12-24T00:00:00Z')
    const end = new Date('2025-12-26T00:00:00Z')

    const result = expandEventToDays(start, end, timezone)

    expect(result).toHaveLength(2)
    expect(result).toContain('2025-12-24')
    expect(result).toContain('2025-12-25')
    expect(result).not.toContain('2025-12-26')
  })

  it('should handle single-day all-day event', () => {
    // Dec 25 to Dec 26 (all-day, DTEND exclusive) should be just Dec 25
    const start = new Date('2025-12-25T00:00:00Z')
    const end = new Date('2025-12-26T00:00:00Z')

    const result = expandEventToDays(start, end, timezone)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('2025-12-25')
  })

  it('should handle timed event as single day', () => {
    const start = new Date('2025-12-25T09:00:00Z')
    const end = new Date('2025-12-25T17:00:00Z')

    const result = expandEventToDays(start, end, timezone)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('2025-12-25')
  })

  it('should expand 3-day event correctly', () => {
    // Dec 23 to Dec 26 should be Dec 23, 24, 25
    const start = new Date('2025-12-23T00:00:00Z')
    const end = new Date('2025-12-26T00:00:00Z')

    const result = expandEventToDays(start, end, timezone)

    expect(result).toHaveLength(3)
    expect(result).toContain('2025-12-23')
    expect(result).toContain('2025-12-24')
    expect(result).toContain('2025-12-25')
  })
})

describe('Tomorrow Calculation', () => {
  it('should calculate tomorrow correctly', () => {
    const timezone = 'America/New_York'
    const now = DateTime.now().setZone(timezone)
    const tomorrow = now.plus({ days: 1 })

    expect(tomorrow.toISODate()).toBeTruthy()
    // Tomorrow should be one day ahead
    const nowDate = now.startOf('day')
    const tomorrowDate = tomorrow.startOf('day')
    const diff = tomorrowDate.diff(nowDate, 'days').days
    expect(diff).toBe(1)
  })
})
