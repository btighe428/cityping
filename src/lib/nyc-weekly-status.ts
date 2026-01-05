// NYC Weekly Status Fetcher
// Aggregates data from NYC 311 API for the week ahead

import { DateTime } from 'luxon'
import { getSnowForecastForWeek } from './weather'
import { getSubwayAlertsSummary, formatSubwayAlertsForEmail, SubwayAlertsSummary } from './mta-subway-alerts'

const NYC_311_CALENDAR_API = 'https://portal.311.nyc.gov/home-cal/'

export interface DayStatus {
  date: string
  dayOfWeek: string
  asp: {
    status: string
    isSuspended: boolean
    reason: string | null
    isEmergency: boolean  // Weather/emergency suspensions (not scheduled holidays)
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

// Keywords that indicate an emergency/weather suspension (not a scheduled holiday)
const EMERGENCY_KEYWORDS = ['snow', 'weather', 'emergency', 'storm', 'ice', 'flood', 'heat']

function isEmergencySuspension(reason: string | null): boolean {
  if (!reason) return false
  const lowerReason = reason.toLowerCase()
  return EMERGENCY_KEYWORDS.some(keyword => lowerReason.includes(keyword))
}

export interface SnowForecast {
  hasSnow: boolean
  hasSignificantSnow: boolean  // >0.5 inches
  snowDays: Array<{
    date: string
    dayOfWeek: string
    description: string | null
    estimatedInches: number | null
  }>
  summary: string | null
}

export interface WeeklyStatus {
  weekRange: string
  startDate: string
  endDate: string
  days: DayStatus[]
  summary: {
    aspSuspensionDays: number
    collectionSuspensionDays: number
    schoolClosureDays: number
  }
  snowForecast: SnowForecast | null
  subwayAlerts: SubwayAlertsSummary | null
}

// Fetch status for a single day
async function fetchDayStatus(date: string): Promise<DayStatus | null> {
  try {
    const response = await fetch(`${NYC_311_CALENDAR_API}?today=${date}`, {
      headers: {
        'User-Agent': 'CityPing Weekly Status (cityping.net)',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) return null

    const data = await response.json()
    const dt = DateTime.fromISO(date)

    // Find each calendar type
    const aspEntry = data.results?.find((r: any) => r.CalendarType?.Name === 'Alternate Side Parking')
    const collectionsEntry = data.results?.find((r: any) => r.CalendarType?.Name === 'Collections')
    const schoolsEntry = data.results?.find((r: any) => r.CalendarType?.Name === 'Schools')

    const dayOfWeek = dt.weekday

    const aspReason = aspEntry?.CalendarDetailName || (dayOfWeek === 7 ? 'Sunday' : null)

    return {
      date,
      dayOfWeek: dt.toFormat('EEEE'),
      asp: {
        status: aspEntry?.CalendarDetailStatus ||
          (dayOfWeek === 7 ? aspEntry?.SundayRecordName : aspEntry?.WeekDayRecordName) || 'IN EFFECT',
        isSuspended: aspEntry?.CalendarDetailStatus === 'SUSPENDED' || dayOfWeek === 7,
        reason: aspReason,
        isEmergency: isEmergencySuspension(aspReason),
      },
      collections: {
        status: collectionsEntry?.CalendarDetailStatus ||
          (dayOfWeek === 7 ? collectionsEntry?.SundayRecordName : collectionsEntry?.WeekDayRecordName) || 'ON SCHEDULE',
        isSuspended: collectionsEntry?.CalendarDetailStatus === 'SUSPENDED' || dayOfWeek === 7,
        reason: collectionsEntry?.CalendarDetailName || (dayOfWeek === 7 ? 'Sunday' : null),
      },
      schools: {
        status: schoolsEntry?.CalendarDetailStatus ||
          (dayOfWeek === 6 || dayOfWeek === 7 ? schoolsEntry?.SundayRecordName : schoolsEntry?.WeekDayRecordName) || 'OPEN',
        isClosed: schoolsEntry?.CalendarDetailStatus === 'CLOSED' || dayOfWeek === 6 || dayOfWeek === 7,
        reason: schoolsEntry?.CalendarDetailName || (dayOfWeek >= 6 ? 'Weekend' : null),
      },
    }
  } catch (error) {
    console.error(`Error fetching status for ${date}:`, error)
    return null
  }
}

// Fetch status for the entire week
export async function fetchWeeklyStatus(startDate?: string): Promise<WeeklyStatus | null> {
  try {
    const timezone = 'America/New_York'
    const start = startDate
      ? DateTime.fromISO(startDate, { zone: timezone })
      : DateTime.now().setZone(timezone).startOf('week')

    const end = start.plus({ days: 6 })

    const days: DayStatus[] = []
    let current = start

    // Fetch each day in parallel
    const datePromises: Promise<DayStatus | null>[] = []
    while (current <= end) {
      datePromises.push(fetchDayStatus(current.toISODate()!))
      current = current.plus({ days: 1 })
    }

    const results = await Promise.all(datePromises)
    for (const result of results) {
      if (result) days.push(result)
    }

    // Calculate summary
    const aspSuspensionDays = days.filter(d => d.asp.isSuspended && d.asp.reason !== 'Sunday').length
    const collectionSuspensionDays = days.filter(d => d.collections.isSuspended && d.collections.reason !== 'Sunday').length
    const schoolClosureDays = days.filter(d => d.schools.isClosed && d.schools.reason !== 'Weekend').length

    // Fetch snow forecast and subway alerts for the week in parallel
    const [snowForecast, subwayAlerts] = await Promise.all([
      getSnowForecastForWeek(start.toISODate()!, end.toISODate()!),
      getSubwayAlertsSummary(start.toISODate()!, end.toISODate()!),
    ])

    return {
      weekRange: `${start.toFormat('MMM d')} - ${end.toFormat('MMM d, yyyy')}`,
      startDate: start.toISODate()!,
      endDate: end.toISODate()!,
      days,
      summary: {
        aspSuspensionDays,
        collectionSuspensionDays,
        schoolClosureDays,
      },
      snowForecast,
      subwayAlerts,
    }
  } catch (error) {
    console.error('Error fetching weekly status:', error)
    return null
  }
}

// Generate HTML for weekly email
export function generateWeeklyEmailHtml(status: WeeklyStatus, manageUrl: string): { subject: string; html: string; text: string } {
  const { weekRange, days, summary, snowForecast, subwayAlerts } = status

  // Filter to only show SCHEDULED holidays (not emergency/weather suspensions, not regular Sundays)
  // Emergency suspensions get their own real-time alerts
  const notableDays = days.filter(d =>
    (d.asp.isSuspended && d.asp.reason !== 'Sunday' && !d.asp.isEmergency) ||
    (d.collections.isSuspended && d.collections.reason !== 'Sunday') ||
    (d.schools.isClosed && d.schools.reason !== 'Weekend')
  )

  // Count only scheduled ASP suspensions (not emergency)
  const scheduledAspDays = days.filter(d =>
    d.asp.isSuspended && d.asp.reason !== 'Sunday' && !d.asp.isEmergency
  ).length

  const hasNotableDays = notableDays.length > 0
  const hasSignificantSnow = snowForecast?.hasSignificantSnow || false

  // Build subject line - include snow warning if significant
  let subject: string
  if (hasSignificantSnow) {
    subject = `❄️ Week of ${weekRange}: Snow in the Forecast${hasNotableDays ? ` + ${scheduledAspDays} Day${scheduledAspDays !== 1 ? 's' : ''} ASP Suspended` : ''}`
  } else if (hasNotableDays) {
    subject = `📅 Week of ${weekRange}: ${scheduledAspDays} Day${scheduledAspDays !== 1 ? 's' : ''} ASP Suspended`
  } else {
    subject = `📅 Week of ${weekRange}: Regular Schedule`
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e3a5f;">
      <h1 style="color: #1e3a5f; margin-bottom: 8px;">Week Ahead</h1>
      <p style="font-size: 18px; color: #64748b; margin-top: 0;">${weekRange}</p>

      ${hasNotableDays ? `
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h2 style="margin: 0 0 16px 0; color: #166534; font-size: 18px;">
            🎉 ${scheduledAspDays} Day${scheduledAspDays !== 1 ? 's' : ''} You Can Skip the Shuffle
          </h2>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 2px solid #bbf7d0;">
                <th style="text-align: left; padding: 8px 4px; color: #166534;">Day</th>
                <th style="text-align: center; padding: 8px 4px; color: #166534;">🚗 ASP</th>
                <th style="text-align: center; padding: 8px 4px; color: #166534;">🗑️ Trash</th>
                <th style="text-align: center; padding: 8px 4px; color: #166534;">🏫 Schools</th>
              </tr>
            </thead>
            <tbody>
              ${notableDays.map(day => `
                <tr style="border-bottom: 1px solid #dcfce7;">
                  <td style="padding: 10px 4px;">
                    <strong>${day.dayOfWeek}</strong><br/>
                    <span style="color: #64748b; font-size: 12px;">${DateTime.fromISO(day.date).toFormat('MMM d')}</span>
                  </td>
                  <td style="text-align: center; padding: 10px 4px;">
                    ${day.asp.isSuspended
                      ? `<span style="color: #166534; font-weight: bold;">✓ OFF</span><br/><span style="font-size: 11px; color: #64748b;">${day.asp.reason || ''}</span>`
                      : `<span style="color: #94a3b8;">In Effect</span>`}
                  </td>
                  <td style="text-align: center; padding: 10px 4px;">
                    ${day.collections.isSuspended
                      ? `<span style="color: #166534; font-weight: bold;">✓ OFF</span>`
                      : `<span style="color: #94a3b8;">Normal</span>`}
                  </td>
                  <td style="text-align: center; padding: 10px 4px;">
                    ${day.schools.isClosed
                      ? `<span style="color: #166534; font-weight: bold;">Closed</span>`
                      : `<span style="color: #94a3b8;">Open</span>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0; color: #64748b; font-size: 16px;">
            📋 Regular week ahead — ASP and trash collection are on normal schedule.
          </p>
        </div>
      `}

      ${snowForecast?.hasSignificantSnow ? `
        <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">
            ❄️ Snow in the Forecast This Week
          </h3>
          <p style="margin: 0 0 12px 0; color: #78350f; font-size: 14px;">
            ${snowForecast.snowDays.map(d => `<strong>${d.dayOfWeek}</strong>: ${d.description || 'snow expected'}`).join('<br/>')}
          </p>
          <p style="margin: 0; color: #92400e; font-size: 13px; background: #fffbeb; padding: 10px; border-radius: 4px;">
            ⚡ <strong>We'll send you an alert</strong> if we detect that ASP has been emergency suspended due to snow.
          </p>
        </div>
      ` : snowForecast?.hasSnow ? `
        <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #0369a1; font-size: 14px;">
            ❄️ <strong>Light snow possible</strong> (${snowForecast.snowDays.map(d => d.dayOfWeek).join(', ')}) — unlikely to affect ASP, but we're monitoring.
          </p>
        </div>
      ` : ''}

      ${subwayAlerts && subwayAlerts.plannedWorkCount > 0 ? formatSubwayAlertsForEmail(subwayAlerts.alerts).html : ''}

      <p style="font-size: 14px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 6px;">
        We'll remind you the evening before each suspension.
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

      <p style="font-size: 14px; color: #64748b; text-align: center;">
        <a href="${manageUrl}" style="color: #1e3a5f;">Manage preferences</a> ·
        <a href="https://portal.311.nyc.gov" style="color: #1e3a5f;">NYC 311</a> ·
        <a href="https://cityping.net" style="color: #1e3a5f;">cityping.net</a>
      </p>
    </div>
  `

  // Build snow forecast text section
  let snowText = ''
  if (snowForecast?.hasSignificantSnow) {
    snowText = `
❄️ SNOW IN THE FORECAST
${snowForecast.snowDays.map(d => `• ${d.dayOfWeek}: ${d.description || 'snow expected'}`).join('\n')}
⚡ We'll send you an alert if ASP is emergency suspended due to snow.

`
  } else if (snowForecast?.hasSnow) {
    snowText = `
❄️ Light snow possible (${snowForecast.snowDays.map(d => d.dayOfWeek).join(', ')}) — unlikely to affect ASP, but we're monitoring.

`
  }

  // Build subway alerts text section
  const subwayText = subwayAlerts && subwayAlerts.plannedWorkCount > 0
    ? formatSubwayAlertsForEmail(subwayAlerts.alerts).text + '\n'
    : ''

  const text = `WEEK AHEAD: ${weekRange}

${hasNotableDays ? `${scheduledAspDays} day(s) you can skip the shuffle:

${notableDays.map(day => `• ${day.dayOfWeek}, ${DateTime.fromISO(day.date).toFormat('MMM d')}
  ASP: ${day.asp.isSuspended ? `OFF (${day.asp.reason})` : 'In Effect'}
  Trash: ${day.collections.isSuspended ? 'Suspended' : 'Normal'}
  Schools: ${day.schools.isClosed ? 'Closed' : 'Open'}
`).join('\n')}` : 'Regular week ahead — ASP and trash collection are on normal schedule.'}
${snowText}${subwayText}We'll remind you the evening before each suspension.

---
Manage preferences: ${manageUrl}
NYC 311: https://portal.311.nyc.gov
`

  return { subject, html, text }
}
