// MTA Subway Alerts Module
// Fetches planned service changes and alerts from the MTA GTFS-RT alerts API

import { DateTime } from 'luxon'

const MTA_ALERTS_API = 'https://collector-otp-prod.camsys-apps.com/realtime/gtfsrt/filtered/alerts?type=json'

// Valid NYC Subway route IDs (single character or numbers 1-7)
const SUBWAY_ROUTES = new Set([
  '1', '2', '3', '4', '5', '6', '7',
  'A', 'B', 'C', 'D', 'E', 'F', 'G',
  'J', 'L', 'M', 'N', 'Q', 'R', 'S', 'W', 'Z',
  'SI' // Staten Island Railway
])

export interface SubwayAlert {
  id: string
  routes: string[]
  alertType: string
  headerText: string
  descriptionText: string | null
  createdAt: Date
  activePeriod: {
    start: Date
    end?: Date
  } | null
  isPlannedWork: boolean
}

export interface SubwayAlertsSummary {
  alerts: SubwayAlert[]
  plannedWorkCount: number
  serviceChangeCount: number
  hasWeekendWork: boolean
  affectedRoutes: string[]
}

interface MTAAlert {
  id: string
  alert: {
    active_period?: Array<{ start?: number; end?: number }>
    informed_entity?: Array<{
      agency_id?: string
      route_id?: string
    }>
    header_text?: {
      translation?: Array<{ text: string; language: string }>
    }
    description_text?: {
      translation?: Array<{ text: string; language: string }>
    }
    'transit_realtime.mercury_alert'?: {
      created_at?: number
      alert_type?: string
    }
  }
}

interface MTAResponse {
  entity?: MTAAlert[]
}

function isSubwayRoute(routeId: string | undefined): boolean {
  if (!routeId) return false
  return SUBWAY_ROUTES.has(routeId.toUpperCase())
}

function getEnglishText(translations?: Array<{ text: string; language: string }>): string | null {
  if (!translations || translations.length === 0) return null
  // Prefer plain English over HTML version
  const plainText = translations.find(t => t.language === 'en')
  return plainText?.text || translations[0].text
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export async function fetchSubwayAlerts(): Promise<SubwayAlert[]> {
  try {
    const response = await fetch(MTA_ALERTS_API, {
      headers: {
        'User-Agent': 'CityPing Subway Alerts (cityping.net)',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`MTA API error: ${response.status}`)
      return []
    }

    const data: MTAResponse = await response.json()

    if (!data.entity) return []

    const subwayAlerts: SubwayAlert[] = []

    for (const entity of data.entity) {
      const alert = entity.alert
      if (!alert) continue

      // Get all routes this alert affects
      const routes = (alert.informed_entity || [])
        .map(e => e.route_id)
        .filter((r): r is string => isSubwayRoute(r))
        .map(r => r.toUpperCase())

      // Skip if no subway routes affected
      if (routes.length === 0) continue

      // Remove duplicates
      const uniqueRoutes = [...new Set(routes)]

      const mercuryAlert = alert['transit_realtime.mercury_alert']
      const alertType = mercuryAlert?.alert_type || 'Unknown'

      const headerText = getEnglishText(alert.header_text?.translation) || ''
      const descriptionText = getEnglishText(alert.description_text?.translation)

      // Determine if this is planned work vs real-time service change
      const isPlannedWork = alertType === 'Planned Work' ||
        alertType === 'Planned - Part Suspended' ||
        alertType === 'Planned - Stations Skipped' ||
        alertType === 'Planned - Reroute' ||
        headerText.toLowerCase().includes('planned') ||
        headerText.toLowerCase().includes('weekend')

      // Parse active period
      let activePeriod: SubwayAlert['activePeriod'] = null
      if (alert.active_period && alert.active_period.length > 0) {
        const period = alert.active_period[0]
        if (period.start) {
          activePeriod = {
            start: new Date(period.start * 1000),
            end: period.end ? new Date(period.end * 1000) : undefined,
          }
        }
      }

      subwayAlerts.push({
        id: entity.id,
        routes: uniqueRoutes,
        alertType,
        headerText: stripHtmlTags(headerText),
        descriptionText: descriptionText ? stripHtmlTags(descriptionText) : null,
        createdAt: mercuryAlert?.created_at
          ? new Date(mercuryAlert.created_at * 1000)
          : new Date(),
        activePeriod,
        isPlannedWork,
      })
    }

    return subwayAlerts
  } catch (error) {
    console.error('Failed to fetch MTA subway alerts:', error)
    return []
  }
}

export async function getSubwayAlertsSummary(
  startDate?: string,
  endDate?: string
): Promise<SubwayAlertsSummary> {
  const alerts = await fetchSubwayAlerts()

  const timezone = 'America/New_York'
  const now = DateTime.now().setZone(timezone)
  const weekStart = startDate
    ? DateTime.fromISO(startDate, { zone: timezone })
    : now.startOf('week')
  const weekEnd = endDate
    ? DateTime.fromISO(endDate, { zone: timezone })
    : weekStart.plus({ days: 6 })

  // Filter alerts relevant to the time period
  const relevantAlerts = alerts.filter(alert => {
    if (!alert.activePeriod) return true // Include alerts without end date

    const alertStart = DateTime.fromJSDate(alert.activePeriod.start, { zone: timezone })
    const alertEnd = alert.activePeriod.end
      ? DateTime.fromJSDate(alert.activePeriod.end, { zone: timezone })
      : null

    // Include if alert is active during the week
    if (alertEnd) {
      return alertStart <= weekEnd && alertEnd >= weekStart
    }
    return alertStart <= weekEnd
  })

  // Count planned work vs service changes
  const plannedWorkCount = relevantAlerts.filter(a => a.isPlannedWork).length
  const serviceChangeCount = relevantAlerts.filter(a => !a.isPlannedWork).length

  // Check if any planned work affects weekends
  const hasWeekendWork = relevantAlerts.some(alert => {
    if (!alert.isPlannedWork || !alert.activePeriod) return false
    const alertStart = DateTime.fromJSDate(alert.activePeriod.start, { zone: timezone })
    return alertStart.weekday >= 6 // Saturday or Sunday
  })

  // Get all affected routes
  const affectedRoutes = [...new Set(relevantAlerts.flatMap(a => a.routes))].sort()

  return {
    alerts: relevantAlerts,
    plannedWorkCount,
    serviceChangeCount,
    hasWeekendWork,
    affectedRoutes,
  }
}

// Format alerts for weekly email HTML
export function formatSubwayAlertsForEmail(alerts: SubwayAlert[]): {
  html: string
  text: string
} {
  if (alerts.length === 0) {
    return { html: '', text: '' }
  }

  // Group planned work alerts (most relevant for weekly email)
  const plannedWork = alerts.filter(a => a.isPlannedWork).slice(0, 5)

  if (plannedWork.length === 0) {
    return { html: '', text: '' }
  }

  const html = `
    <div style="background: #fef9c3; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #fde047;">
      <h3 style="margin: 0 0 12px 0; color: #854d0e; font-size: 14px;">
        🚇 Planned Subway Work This Week
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 13px;">
        ${plannedWork.map(alert => `
          <li style="margin-bottom: 8px;">
            <strong style="color: #1e40af;">${alert.routes.join(', ')}</strong>:
            ${alert.headerText.slice(0, 150)}${alert.headerText.length > 150 ? '...' : ''}
          </li>
        `).join('')}
      </ul>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #92400e;">
        <a href="https://new.mta.info/planned-service-changes" style="color: #1e40af;">Full planned work details →</a>
      </p>
    </div>
  `

  const text = `🚇 PLANNED SUBWAY WORK THIS WEEK:
${plannedWork.map(alert => `• ${alert.routes.join(', ')}: ${alert.headerText.slice(0, 150)}${alert.headerText.length > 150 ? '...' : ''}`).join('\n')}

Full details: https://new.mta.info/planned-service-changes
`

  return { html, text }
}
