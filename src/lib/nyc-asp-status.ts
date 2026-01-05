// NYC ASP Status Checker
// Uses the official NYC 311 JSON API for real-time ASP status
// This is public government data - no API restrictions

const NYC_311_CALENDAR_API = 'https://portal.311.nyc.gov/home-cal/'

export interface ASPStatus {
  isSuspended: boolean
  status: string // "SUSPENDED" | "IN EFFECT" | "NOT IN EFFECT"
  reason: string | null
  message: string | null
  lastChecked: Date
}

// Full day status including all services
export interface FullDayStatus {
  date: string
  asp: {
    status: string
    isSuspended: boolean
    reason: string | null
    message: string | null
  }
  meters: {
    status: string
    inEffect: boolean
  }
  collections: {
    status: string
    isSuspended: boolean
    reason: string | null
  }
  schools: {
    status: string
    isClosed: boolean
    reason: string | null
  }
}

interface NYC311CalendarResponse {
  totalcount: string
  date: string
  results: Array<{
    Calendarid: string
    CalendarName: string
    CalendarType: { Id: string; Name: string }
    IconUrl: string
    SaturdayContentFormat: string
    SaturdayRecordName: string
    SundayContentFormat: string
    SundayRecordName: string
    WeekDayContentFormat: string
    WeekDayRecordName: string
    CalendarTypeRecordName: string
    CalendarDetailName: string
    CalendarDetailMessage: string
    CalendarDetailStatus: string
  }>
}

// Fetch current ASP status from NYC 311 API
export async function fetchASPStatus(date?: string): Promise<ASPStatus | null> {
  try {
    // Use provided date or today
    const targetDate = date || new Date().toISOString().split('T')[0]
    const url = `${NYC_311_CALENDAR_API}?today=${targetDate}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CityPing ASP Alert Service (cityping.net)',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch NYC 311 calendar:', response.status)
      return null
    }

    const data: NYC311CalendarResponse = await response.json()

    // Find the Alternate Side Parking entry
    const aspEntry = data.results.find(
      (r) => r.CalendarType?.Name === 'Alternate Side Parking'
    )

    if (!aspEntry) {
      console.error('No ASP entry found in 311 calendar response')
      return null
    }

    // Check if there's a special status (holiday/emergency)
    const hasSpecialStatus = aspEntry.CalendarDetailStatus !== ''
    const isSuspended = aspEntry.CalendarDetailStatus === 'SUSPENDED'

    // Determine the status string
    let status: string
    if (hasSpecialStatus) {
      status = aspEntry.CalendarDetailStatus
    } else {
      // Use the day-of-week default
      const dayOfWeek = new Date(targetDate).getDay()
      if (dayOfWeek === 0) {
        status = aspEntry.SundayRecordName
      } else if (dayOfWeek === 6) {
        status = aspEntry.SaturdayRecordName
      } else {
        status = aspEntry.WeekDayRecordName
      }
    }

    return {
      isSuspended,
      status,
      reason: aspEntry.CalendarDetailName || null,
      message: aspEntry.CalendarDetailMessage || null,
      lastChecked: new Date(),
    }
  } catch (error) {
    console.error('Error fetching NYC ASP status:', error)
    return null
  }
}

// Fetch full day status including all services (ASP, meters, trash, schools)
export async function fetchFullDayStatus(date: string): Promise<FullDayStatus | null> {
  try {
    const url = `${NYC_311_CALENDAR_API}?today=${date}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CityPing Service (cityping.net)',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) return null

    const data: NYC311CalendarResponse = await response.json()
    const dayOfWeek = new Date(date + 'T12:00:00').getDay() // Use noon to avoid TZ issues

    // Find each service
    const aspEntry = data.results.find(r => r.CalendarType?.Name === 'Alternate Side Parking')
    const collectionsEntry = data.results.find(r => r.CalendarType?.Name === 'Collections')
    const schoolsEntry = data.results.find(r => r.CalendarType?.Name === 'Schools')

    // Determine ASP status
    const aspSuspended = aspEntry?.CalendarDetailStatus === 'SUSPENDED' || dayOfWeek === 0
    const aspStatus = aspEntry?.CalendarDetailStatus ||
      (dayOfWeek === 0 ? aspEntry?.SundayRecordName : aspEntry?.WeekDayRecordName) || 'IN EFFECT'

    // Meters - usually in effect even when ASP is suspended (check the message)
    const metersInEffect = !aspEntry?.CalendarDetailMessage?.toLowerCase().includes('meters are suspended')

    // Collections status
    const collectionsSuspended = collectionsEntry?.CalendarDetailStatus === 'SUSPENDED' || dayOfWeek === 0
    const collectionsStatus = collectionsEntry?.CalendarDetailStatus ||
      (dayOfWeek === 0 ? collectionsEntry?.SundayRecordName : collectionsEntry?.WeekDayRecordName) || 'ON SCHEDULE'

    // Schools status
    const schoolsClosed = schoolsEntry?.CalendarDetailStatus === 'CLOSED' || dayOfWeek === 0 || dayOfWeek === 6
    const schoolsStatus = schoolsEntry?.CalendarDetailStatus ||
      (dayOfWeek === 0 || dayOfWeek === 6 ? schoolsEntry?.SundayRecordName : schoolsEntry?.WeekDayRecordName) || 'OPEN'

    return {
      date,
      asp: {
        status: aspStatus,
        isSuspended: aspSuspended,
        reason: aspEntry?.CalendarDetailName || (dayOfWeek === 0 ? 'Sunday' : null),
        message: aspEntry?.CalendarDetailMessage || null,
      },
      meters: {
        status: metersInEffect ? 'IN EFFECT' : 'SUSPENDED',
        inEffect: metersInEffect,
      },
      collections: {
        status: collectionsStatus,
        isSuspended: collectionsSuspended,
        reason: collectionsEntry?.CalendarDetailName || (dayOfWeek === 0 ? 'Sunday' : null),
      },
      schools: {
        status: schoolsStatus,
        isClosed: schoolsClosed,
        reason: schoolsEntry?.CalendarDetailName || (dayOfWeek === 0 || dayOfWeek === 6 ? 'Weekend' : null),
      },
    }
  } catch (error) {
    console.error(`Error fetching full day status for ${date}:`, error)
    return null
  }
}

// Fetch full status for multiple dates
export async function fetchMultipleDayStatus(dates: string[]): Promise<Map<string, FullDayStatus>> {
  const results = new Map<string, FullDayStatus>()

  // Fetch in parallel
  const promises = dates.map(async date => {
    const status = await fetchFullDayStatus(date)
    if (status) {
      results.set(date, status)
    }
  })

  await Promise.all(promises)
  return results
}
