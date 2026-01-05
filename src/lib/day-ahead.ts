// Day Ahead Email Generator
// Comprehensive morning briefing for the upcoming day
// Aggregates: ASP status, meters, trash, schools, weather, parking tips

import { DateTime } from 'luxon'
import { fetchFullDayStatus, type FullDayStatus } from './nyc-asp-status'
import { fetchNYCWeatherForecast, type DayForecast } from './weather'

export interface DayAheadData {
  date: string
  displayDate: string
  dayOfWeek: string
  isWeekend: boolean
  status: FullDayStatus | null
  weather: DayForecast | null
  weatherNight: DayForecast | null
  summary: {
    headline: string
    aspSummary: string
    meterSummary: string
    canSkipShuffle: boolean
  }
}

// Fetch comprehensive day-ahead data
export async function fetchDayAheadData(targetDate?: string): Promise<DayAheadData | null> {
  try {
    const timezone = 'America/New_York'
    const now = DateTime.now().setZone(timezone)

    // Default to tomorrow
    const tomorrow = targetDate
      ? DateTime.fromISO(targetDate, { zone: timezone })
      : now.plus({ days: 1 })

    const dateStr = tomorrow.toISODate()!
    const dayOfWeek = tomorrow.weekday // 1=Monday, 7=Sunday
    const isWeekend = dayOfWeek >= 6

    // Fetch status and weather in parallel
    const [status, weatherForecast] = await Promise.all([
      fetchFullDayStatus(dateStr),
      fetchNYCWeatherForecast(),
    ])

    // Find weather for tomorrow (day and night periods)
    let weather: DayForecast | null = null
    let weatherNight: DayForecast | null = null

    if (weatherForecast?.days) {
      weather = weatherForecast.days.find(
        d => d.date === dateStr && !d.name.includes('Night')
      ) || null
      weatherNight = weatherForecast.days.find(
        d => d.date === dateStr && d.name.includes('Night')
      ) || null
    }

    // Generate summary
    const canSkipShuffle = status?.asp.isSuspended || isWeekend

    let headline: string
    if (isWeekend) {
      headline = dayOfWeek === 6 ? "It's Saturday — no ASP today" : "It's Sunday — no ASP today"
    } else if (status?.asp.isSuspended) {
      headline = `🎉 ASP is suspended — ${status.asp.reason || 'holiday'}`
    } else {
      headline = '🚗 Regular ASP rules apply tomorrow'
    }

    let aspSummary: string
    if (status?.asp.isSuspended) {
      aspSummary = `Suspended${status.asp.reason ? ` (${status.asp.reason})` : ''}`
    } else if (isWeekend) {
      aspSummary = 'Not in effect (weekend)'
    } else {
      aspSummary = 'In effect — check your street signs'
    }

    let meterSummary: string
    if (!status?.meters.inEffect) {
      meterSummary = 'Suspended'
    } else if (isWeekend && dayOfWeek === 7) {
      meterSummary = 'Free on Sundays'
    } else {
      meterSummary = 'In effect — bring quarters'
    }

    return {
      date: dateStr,
      displayDate: tomorrow.toFormat('EEEE, MMMM d, yyyy'),
      dayOfWeek: tomorrow.toFormat('EEEE'),
      isWeekend,
      status,
      weather,
      weatherNight,
      summary: {
        headline,
        aspSummary,
        meterSummary,
        canSkipShuffle,
      },
    }
  } catch (error) {
    console.error('Error fetching day-ahead data:', error)
    return null
  }
}

// Generate HTML email for Day Ahead
export function generateDayAheadEmailHtml(
  data: DayAheadData,
  manageUrl: string
): { subject: string; html: string; text: string } {
  const { date, displayDate, dayOfWeek, status, weather, weatherNight, summary } = data

  // Weather emoji
  const getWeatherEmoji = (forecast: string | undefined): string => {
    if (!forecast) return '🌤️'
    const f = forecast.toLowerCase()
    if (f.includes('snow')) return '❄️'
    if (f.includes('rain') || f.includes('shower')) return '🌧️'
    if (f.includes('thunder')) return '⛈️'
    if (f.includes('cloud')) return '☁️'
    if (f.includes('sun') || f.includes('clear')) return '☀️'
    if (f.includes('fog')) return '🌫️'
    if (f.includes('wind')) return '💨'
    return '🌤️'
  }

  const weatherEmoji = getWeatherEmoji(weather?.shortForecast)

  // Subject line
  let subject: string
  if (summary.canSkipShuffle) {
    subject = `☀️ ${dayOfWeek}: No need to move your car`
  } else {
    subject = `🚗 ${dayOfWeek}: Regular ASP — check your signs`
  }

  // Status colors
  const aspColor = summary.canSkipShuffle ? '#166534' : '#dc2626'
  const aspBg = summary.canSkipShuffle ? '#f0fdf4' : '#fef2f2'
  const meterColor = status?.meters.inEffect ? '#dc2626' : '#166534'
  const trashColor = status?.collections.isSuspended ? '#166534' : '#64748b'
  const schoolColor = status?.schools.isClosed ? '#166534' : '#64748b'

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e3a5f;">

      <!-- Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1e3a5f; margin: 0 0 8px 0; font-size: 28px;">
          The Day Ahead
        </h1>
        <p style="font-size: 18px; color: #64748b; margin: 0;">
          ${displayDate}
        </p>
      </div>

      <!-- Main Status Card -->
      <div style="background: ${aspBg}; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 2px solid ${aspColor}20;">
        <h2 style="color: ${aspColor}; margin: 0 0 12px 0; font-size: 22px;">
          ${summary.headline}
        </h2>
        ${summary.canSkipShuffle ? `
          <p style="font-size: 16px; color: ${aspColor}; margin: 0;">
            Leave your car where it is. No shuffle needed. 😴
          </p>
        ` : `
          <p style="font-size: 16px; color: #64748b; margin: 0;">
            Check your street signs for cleaning times. Most sides clean 8-11 AM.
          </p>
        `}
      </div>

      <!-- Quick Status Grid -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
        <!-- ASP -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 4px;">🚗</div>
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">ASP</div>
          <div style="font-size: 15px; font-weight: 600; color: ${aspColor};">
            ${summary.canSkipShuffle ? 'Suspended' : 'In Effect'}
          </div>
        </div>

        <!-- Meters -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 4px;">🅿️</div>
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Meters</div>
          <div style="font-size: 15px; font-weight: 600; color: ${meterColor};">
            ${status?.meters.inEffect ? 'In Effect' : 'Suspended'}
          </div>
        </div>

        <!-- Trash -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 4px;">🗑️</div>
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Collections</div>
          <div style="font-size: 15px; font-weight: 600; color: ${trashColor};">
            ${status?.collections.isSuspended ? 'Suspended' : 'Normal'}
          </div>
        </div>

        <!-- Schools -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 4px;">🏫</div>
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Schools</div>
          <div style="font-size: 15px; font-weight: 600; color: ${schoolColor};">
            ${status?.schools.isClosed ? 'Closed' : 'Open'}
          </div>
        </div>
      </div>

      <!-- Weather Forecast -->
      ${weather ? `
        <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">
            ${weatherEmoji} Weather Forecast
          </h3>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="font-size: 36px; font-weight: bold; color: #1e40af;">
              ${weather.temperature}°${weather.temperatureUnit}
            </div>
            <div>
              <div style="font-size: 15px; color: #1e3a5f; font-weight: 500;">
                ${weather.shortForecast}
              </div>
              ${weatherNight ? `
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                  Tonight: ${weatherNight.temperature}°${weatherNight.temperatureUnit}, ${weatherNight.shortForecast}
                </div>
              ` : ''}
            </div>
          </div>
          ${weather.snowAmount.hasSnow ? `
            <div style="margin-top: 12px; padding: 10px; background: #fef3c7; border-radius: 6px; font-size: 14px; color: #92400e;">
              ❄️ <strong>Snow alert:</strong> ${weather.snowAmount.description || 'Snow expected'}.
              We'll notify you if ASP is emergency suspended.
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Pro Tips -->
      <div style="background: #fefce8; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px 0; color: #854d0e; font-size: 14px;">
          💡 Quick Reminder
        </h3>
        <p style="margin: 0; font-size: 14px; color: #713f12;">
          ${summary.canSkipShuffle
            ? 'Even when ASP is suspended, parking meters may still be in effect. Always check the meter signs!'
            : 'You can legally occupy a spot during street cleaning if you\'re in the car and can move. Some drivers sit in their cars during cleaning hours.'
          }
        </p>
      </div>

      <!-- Footer -->
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

      <p style="font-size: 13px; color: #64748b; text-align: center;">
        <a href="${manageUrl}" style="color: #1e3a5f;">Manage alerts</a> ·
        <a href="https://portal.311.nyc.gov" style="color: #1e3a5f;">NYC 311</a> ·
        <a href="https://cityping.net" style="color: #1e3a5f;">cityping.net</a>
      </p>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px;">
        Data sourced from NYC 311 and National Weather Service
      </p>
    </div>
  `

  // Plain text version
  const text = `THE DAY AHEAD
${displayDate}

${summary.headline}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUICK STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚗 ASP: ${summary.aspSummary}
🅿️ Meters: ${summary.meterSummary}
🗑️ Trash: ${status?.collections.isSuspended ? 'Suspended' : 'Normal schedule'}
🏫 Schools: ${status?.schools.isClosed ? `Closed${status.schools.reason ? ` (${status.schools.reason})` : ''}` : 'Open'}

${weather ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEATHER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${weather.temperature}°${weather.temperatureUnit} — ${weather.shortForecast}
${weatherNight ? `Tonight: ${weatherNight.temperature}°${weatherNight.temperatureUnit}, ${weatherNight.shortForecast}` : ''}
${weather.snowAmount.hasSnow ? `\n❄️ Snow alert: ${weather.snowAmount.description}` : ''}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 ${summary.canSkipShuffle
  ? 'Remember: Meters may still be in effect even when ASP is suspended!'
  : 'Pro tip: You can stay in your car during cleaning hours if you can move when needed.'
}

---
Manage alerts: ${manageUrl}
NYC 311: https://portal.311.nyc.gov
`

  return { subject, html, text }
}
