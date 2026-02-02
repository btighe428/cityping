import { prisma } from './db'
import { DateTime } from 'luxon'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface SuspensionDay {
  date: Date
  dateFormatted: string
  dayOfWeek: string
  dayAbbrev: string
  summary: string
  weekNumber: number // 1-5 for the month
}

export interface DayOfWeekStats {
  day: string
  count: number
  dates: string[] // formatted dates
}

export interface WeekCluster {
  weekNumber: number
  startDate: string
  endDate: string
  suspensions: SuspensionDay[]
  isBusy: boolean // 3+ suspensions in a week
}

export interface ConsecutivePattern {
  dayOfWeek: string
  weeksInARow: number
  dates: string[]
  tip: string
}

export interface MonthlyInsights {
  // Basic info
  monthName: string
  month: number // 1-12
  year: number
  totalSuspensions: number

  // All suspensions
  suspensions: SuspensionDay[]

  // Week-by-week breakdown
  weeks: WeekCluster[]

  // Day of week analysis
  dayOfWeekStats: DayOfWeekStats[]
  bestParkingDays: string[] // Days with 0 suspensions
  worstParkingDays: string[] // Days with most suspensions

  // Patterns
  consecutivePatterns: ConsecutivePattern[]

  // Clusters
  busyWeeks: WeekCluster[]
  longestStreak: {
    days: number
    startDate: string
    endDate: string
    description: string
  } | null

  // Context
  comparisonToPrevMonth: {
    prevMonthName: string
    prevMonthCount: number
    difference: number
    trend: 'more' | 'fewer' | 'same'
  } | null

  // Quick summary stats
  weekdaySuspensions: number
  weekendSuspensions: number
}

/**
 * Generate comprehensive monthly insights for a city
 */
export async function generateMonthlyInsights(
  cityId: string,
  year: number,
  month: number, // 1-12
  timezone: string = 'America/New_York'
): Promise<MonthlyInsights> {
  // Calculate date range for the month
  // Use UTC dates since that's how dates are stored in the database
  const startOfMonth = DateTime.fromObject({ year, month, day: 1 }, { zone: 'UTC' }).startOf('day')
  const endOfMonth = startOfMonth.endOf('month').startOf('day')

  const monthName = startOfMonth.toFormat('MMMM')

  // Fetch all suspensions for the month
  // Dates in the database are stored as YYYY-MM-DD at midnight UTC
  const suspensionRecords = await prisma.suspensionEvent.findMany({
    where: {
      cityId,
      date: {
        gte: startOfMonth.toJSDate(),
        lte: endOfMonth.toJSDate(),
      },
    },
    orderBy: { date: 'asc' },
  })

  // Filter to ensure dates are actually in the target month (defensive check)
  const filteredRecords = suspensionRecords.filter(s => {
    const dateStr = s.date.toISOString().split('T')[0]
    const d = DateTime.fromISO(dateStr, { zone: 'UTC' })
    return d.month === month && d.year === year
  })

  // Transform to SuspensionDay objects
  // Use ISO string extraction to avoid JavaScript Date timezone shifts
  const suspensions: SuspensionDay[] = filteredRecords.map(s => {
    const dateStr = s.date.toISOString().split('T')[0]
    const dt = DateTime.fromISO(dateStr, { zone: 'UTC' })
    const jsDay = dt.weekday === 7 ? 0 : dt.weekday

    return {
      date: s.date,
      dateFormatted: dt.toFormat('MMMM d'),
      dayOfWeek: DAY_NAMES[jsDay],
      dayAbbrev: DAY_ABBREV[jsDay],
      summary: s.summary || 'Holiday',
      weekNumber: Math.ceil(dt.day / 7),
    }
  })

  // Calculate day of week statistics
  const dayOfWeekCounts = new Map<number, { count: number; dates: string[] }>()
  for (let i = 0; i < 7; i++) {
    dayOfWeekCounts.set(i, { count: 0, dates: [] })
  }

  for (const s of suspensions) {
    const dateStr = s.date.toISOString().split('T')[0]
    const dt = DateTime.fromISO(dateStr, { zone: 'UTC' })
    const jsDay = dt.weekday === 7 ? 0 : dt.weekday
    const stats = dayOfWeekCounts.get(jsDay)!
    stats.count++
    stats.dates.push(s.dateFormatted)
  }

  const dayOfWeekStats: DayOfWeekStats[] = Array.from(dayOfWeekCounts.entries())
    .map(([dayIndex, stats]) => ({
      day: DAY_NAMES[dayIndex],
      count: stats.count,
      dates: stats.dates,
    }))
    .sort((a, b) => b.count - a.count)

  // Best and worst parking days
  const bestParkingDays = dayOfWeekStats
    .filter(d => d.count === 0)
    .map(d => d.day)

  const maxSuspensions = Math.max(...dayOfWeekStats.map(d => d.count))
  const worstParkingDays = maxSuspensions > 0
    ? dayOfWeekStats.filter(d => d.count === maxSuspensions).map(d => d.day)
    : []

  // Week-by-week breakdown
  const weeks: WeekCluster[] = []
  const weeksInMonth = Math.ceil(endOfMonth.day / 7)

  for (let w = 1; w <= weeksInMonth; w++) {
    const weekStart = startOfMonth.plus({ days: (w - 1) * 7 })
    const weekEnd = DateTime.min(weekStart.plus({ days: 6 }), endOfMonth)

    const weekSuspensions = suspensions.filter(s => s.weekNumber === w)

    weeks.push({
      weekNumber: w,
      startDate: weekStart.toFormat('MMM d'),
      endDate: weekEnd.toFormat('MMM d'),
      suspensions: weekSuspensions,
      isBusy: weekSuspensions.length >= 3,
    })
  }

  const busyWeeks = weeks.filter(w => w.isBusy)

  // Find consecutive same-day patterns
  const consecutivePatterns: ConsecutivePattern[] = []

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const daySuspensions = suspensions.filter(s => {
      const dateStr = s.date.toISOString().split('T')[0]
      const dt = DateTime.fromISO(dateStr, { zone: 'UTC' })
      const jsDay = dt.weekday === 7 ? 0 : dt.weekday
      return jsDay === dayIndex
    })

    if (daySuspensions.length >= 2) {
      // Check if they're consecutive weeks
      const sortedDates = daySuspensions
        .map(s => {
          const dateStr = s.date.toISOString().split('T')[0]
          return DateTime.fromISO(dateStr, { zone: 'UTC' })
        })
        .sort((a, b) => a.toMillis() - b.toMillis())

      let streak: DateTime[] = [sortedDates[0]]

      for (let i = 1; i < sortedDates.length; i++) {
        const daysDiff = sortedDates[i].diff(sortedDates[i - 1], 'days').days

        if (Math.abs(daysDiff - 7) < 1) {
          streak.push(sortedDates[i])
        } else if (streak.length >= 2) {
          consecutivePatterns.push({
            dayOfWeek: DAY_NAMES[dayIndex],
            weeksInARow: streak.length,
            dates: streak.map(d => d.toFormat('MMMM d')),
            tip: generateConsecutiveTip(DAY_NAMES[dayIndex], streak.length),
          })
          streak = [sortedDates[i]]
        } else {
          streak = [sortedDates[i]]
        }
      }

      if (streak.length >= 2) {
        consecutivePatterns.push({
          dayOfWeek: DAY_NAMES[dayIndex],
          weeksInARow: streak.length,
          dates: streak.map(d => d.toFormat('MMMM d')),
          tip: generateConsecutiveTip(DAY_NAMES[dayIndex], streak.length),
        })
      }
    }
  }

  // Find longest streak where you wouldn't need to move your car
  // This requires looking at consecutive calendar days with suspensions
  const longestStreak = findLongestSuspensionStreak(suspensions, timezone)

  // Comparison to previous month
  const prevMonth = startOfMonth.minus({ months: 1 })
  const prevMonthSuspensions = await prisma.suspensionEvent.count({
    where: {
      cityId,
      date: {
        gte: prevMonth.startOf('month').toJSDate(),
        lte: prevMonth.endOf('month').toJSDate(),
      },
    },
  })

  const difference = suspensions.length - prevMonthSuspensions
  const comparisonToPrevMonth = {
    prevMonthName: prevMonth.toFormat('MMMM'),
    prevMonthCount: prevMonthSuspensions,
    difference: Math.abs(difference),
    trend: difference > 0 ? 'more' as const : difference < 0 ? 'fewer' as const : 'same' as const,
  }

  // Weekend vs weekday
  const weekendSuspensions = suspensions.filter(s => {
    const dateStr = s.date.toISOString().split('T')[0]
    const dt = DateTime.fromISO(dateStr, { zone: 'UTC' })
    return dt.weekday === 6 || dt.weekday === 7 // Sat or Sun
  }).length

  const weekdaySuspensions = suspensions.length - weekendSuspensions

  return {
    monthName,
    month,
    year,
    totalSuspensions: suspensions.length,
    suspensions,
    weeks,
    dayOfWeekStats,
    bestParkingDays,
    worstParkingDays,
    consecutivePatterns,
    busyWeeks,
    longestStreak,
    comparisonToPrevMonth,
    weekdaySuspensions,
    weekendSuspensions,
  }
}

function generateConsecutiveTip(dayOfWeek: string, weeksInARow: number): string {
  if (weeksInARow === 2) {
    return `Park on the ${dayOfWeek} side and skip moving for 2 weeks!`
  }
  return `${weeksInARow} ${dayOfWeek}s in a row are suspended - ${dayOfWeek}-side parkers can relax!`
}

function findLongestSuspensionStreak(
  suspensions: SuspensionDay[],
  timezone: string
): MonthlyInsights['longestStreak'] {
  if (suspensions.length === 0) return null

  const sortedDates = suspensions
    .map(s => {
      const dateStr = s.date.toISOString().split('T')[0]
      return DateTime.fromISO(dateStr, { zone: 'UTC' })
    })
    .sort((a, b) => a.toMillis() - b.toMillis())

  let longestStart = sortedDates[0]
  let longestEnd = sortedDates[0]
  let longestLength = 1

  let currentStart = sortedDates[0]
  let currentEnd = sortedDates[0]
  let currentLength = 1

  for (let i = 1; i < sortedDates.length; i++) {
    const daysDiff = sortedDates[i].diff(currentEnd, 'days').days

    if (daysDiff <= 1) {
      // Consecutive or same day
      currentEnd = sortedDates[i]
      currentLength++
    } else {
      // Gap - check if current streak is longest
      if (currentLength > longestLength) {
        longestStart = currentStart
        longestEnd = currentEnd
        longestLength = currentLength
      }
      currentStart = sortedDates[i]
      currentEnd = sortedDates[i]
      currentLength = 1
    }
  }

  // Check final streak
  if (currentLength > longestLength) {
    longestStart = currentStart
    longestEnd = currentEnd
    longestLength = currentLength
  }

  if (longestLength < 2) return null

  return {
    days: longestLength,
    startDate: longestStart.toFormat('MMMM d'),
    endDate: longestEnd.toFormat('MMMM d'),
    description: longestLength === 2
      ? `Back-to-back suspensions on ${longestStart.toFormat('MMMM d')}-${longestEnd.toFormat('d')}`
      : `${longestLength} consecutive days of suspensions (${longestStart.toFormat('MMM d')}-${longestEnd.toFormat('d')})`,
  }
}

/**
 * Generate a mini calendar HTML for the month
 */
function generateCalendarHtml(year: number, month: number, suspensions: SuspensionDay[]): string {
  const firstDay = DateTime.fromObject({ year, month, day: 1 }, { zone: 'UTC' })
  const daysInMonth = firstDay.daysInMonth!
  const startDayOfWeek = firstDay.weekday % 7 // Convert to 0=Sun

  // Create a set of suspension day numbers for quick lookup
  const suspensionDays = new Set(
    suspensions.map(s => {
      const dateStr = s.date.toISOString().split('T')[0]
      return DateTime.fromISO(dateStr, { zone: 'UTC' }).day
    })
  )

  // Create a map of day -> holiday name for tooltips
  const suspensionNames = new Map(
    suspensions.map(s => {
      const dateStr = s.date.toISOString().split('T')[0]
      return [
        DateTime.fromISO(dateStr, { zone: 'UTC' }).day,
        s.summary
      ] as [number, string]
    })
  )

  let html = `
    <div style="margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <thead>
          <tr>
            <th style="padding: 8px 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-align: center;">S</th>
            <th style="padding: 8px 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-align: center;">M</th>
            <th style="padding: 8px 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-align: center;">T</th>
            <th style="padding: 8px 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-align: center;">W</th>
            <th style="padding: 8px 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-align: center;">T</th>
            <th style="padding: 8px 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-align: center;">F</th>
            <th style="padding: 8px 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-align: center;">S</th>
          </tr>
        </thead>
        <tbody>
  `

  let dayCounter = 1
  const weekRows = Math.ceil((daysInMonth + startDayOfWeek) / 7)

  for (let week = 0; week < weekRows; week++) {
    html += '<tr>'

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const cellIndex = week * 7 + dayOfWeek
      const isBeforeStart = cellIndex < startDayOfWeek
      const isAfterEnd = dayCounter > daysInMonth

      if (isBeforeStart || isAfterEnd) {
        html += '<td style="padding: 4px;"></td>'
      } else {
        const isSuspension = suspensionDays.has(dayCounter)
        const holidayName = suspensionNames.get(dayCounter)

        if (isSuspension) {
          html += `
            <td style="padding: 4px; text-align: center;">
              <div style="background: #166534; color: white; border-radius: 50%; width: 32px; height: 32px; line-height: 32px; margin: 0 auto; font-size: 14px; font-weight: 600;" title="${holidayName || ''}">
                ${dayCounter}
              </div>
            </td>
          `
        } else {
          html += `
            <td style="padding: 4px; text-align: center;">
              <div style="color: #64748b; width: 32px; height: 32px; line-height: 32px; margin: 0 auto; font-size: 14px;">
                ${dayCounter}
              </div>
            </td>
          `
        }
        dayCounter++
      }
    }

    html += '</tr>'
  }

  html += `
        </tbody>
      </table>
      <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 12px; font-size: 12px; color: #64748b;">
        <span style="display: flex; align-items: center; gap: 4px;">
          <span style="display: inline-block; width: 12px; height: 12px; background: #166534; border-radius: 50%;"></span>
          ASP Suspended
        </span>
      </div>
    </div>
  `

  return html
}

/**
 * Format insights as HTML for email
 */
export function formatMonthlyInsightsHtml(insights: MonthlyInsights): string {
  const {
    monthName,
    month,
    year,
    totalSuspensions,
    suspensions,
    weeks,
    dayOfWeekStats,
    bestParkingDays,
    worstParkingDays,
    consecutivePatterns,
    busyWeeks,
    longestStreak,
    comparisonToPrevMonth,
  } = insights

  // Header section
  let html = `
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; color: white;">
      <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">
        ${monthName} ${year}
      </h1>
      <p style="margin: 0; font-size: 18px; opacity: 0.9;">
        Your NYC Alternate Side Parking Guide
      </p>
    </div>
  `

  // Mini calendar view
  html += generateCalendarHtml(year, month, suspensions)

  // Quick stats row - just the count and comparison
  html += `
    <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
        <div style="font-size: 36px; font-weight: 700; color: #166534;">${totalSuspensions}</div>
        <div style="font-size: 14px; color: #15803d;">Suspension Days</div>
      </div>
      ${comparisonToPrevMonth ? `
      <div style="flex: 1; min-width: 120px; background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center;">
        <div style="font-size: 18px; font-weight: 600; color: #475569;">
          ${comparisonToPrevMonth.trend === 'more' ? '↑' : comparisonToPrevMonth.trend === 'fewer' ? '↓' : ''}
          ${comparisonToPrevMonth.difference === 0 ? 'Same as' : comparisonToPrevMonth.difference}
        </div>
        <div style="font-size: 14px; color: #64748b;">${comparisonToPrevMonth.trend === 'same' ? '' : 'vs '}${comparisonToPrevMonth.prevMonthName}</div>
      </div>
      ` : ''}
    </div>
  `

  // Consecutive patterns / tips
  if (consecutivePatterns.length > 0) {
    html += `
      <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
          💡 Pro Tips
        </h3>
        ${consecutivePatterns.map(p => `
          <p style="margin: 8px 0; color: #78350f; font-size: 15px;">
            <strong>${p.dayOfWeek}:</strong> ${p.tip}
            <span style="opacity: 0.7; font-size: 13px;">(${p.dates.join(', ')})</span>
          </p>
        `).join('')}
      </div>
    `
  }

  // Busy weeks warning
  if (busyWeeks.length > 0) {
    html += `
      <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #991b1b; font-size: 15px;">
          <strong>⚠️ Heavy Week${busyWeeks.length > 1 ? 's' : ''}:</strong>
          ${busyWeeks.map(w => `Week ${w.weekNumber} (${w.startDate}-${w.endDate}) has ${w.suspensions.length} suspensions`).join('; ')}
        </p>
      </div>
    `
  }

  // Calendar-style month view
  html += `
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; color: #1e3a5f; font-size: 16px; font-weight: 600;">
        📅 All Suspension Days
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b;">Date</th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b;">Day</th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b;">Holiday</th>
          </tr>
        </thead>
        <tbody>
          ${suspensions.map((s, i) => `
            <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #1e3a5f;">${s.dateFormatted}</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${s.dayAbbrev}</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${s.summary}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `


  // Longest streak
  if (longestStreak && longestStreak.days >= 2) {
    html += `
      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #1e40af; font-size: 15px;">
          <strong>🎯 Longest Streak:</strong> ${longestStreak.description}
        </p>
      </div>
    `
  }

  return html
}

/**
 * Format insights as plain text for email
 */
export function formatMonthlyInsightsText(insights: MonthlyInsights): string {
  const {
    monthName,
    year,
    totalSuspensions,
    suspensions,
    dayOfWeekStats,
    bestParkingDays,
    consecutivePatterns,
    busyWeeks,
    comparisonToPrevMonth,
  } = insights

  let text = `${monthName.toUpperCase()} ${year} - NYC ALTERNATE SIDE PARKING GUIDE\n`
  text += `${'='.repeat(50)}\n\n`

  text += `📊 QUICK STATS\n`
  text += `• ${totalSuspensions} suspension days this month\n`
  if (comparisonToPrevMonth) {
    if (comparisonToPrevMonth.difference === 0) {
      text += `• Same as ${comparisonToPrevMonth.prevMonthName}\n`
    } else {
      text += `• ${comparisonToPrevMonth.difference} ${comparisonToPrevMonth.trend} than ${comparisonToPrevMonth.prevMonthName}\n`
    }
  }
  text += `\n`

  if (consecutivePatterns.length > 0) {
    text += `💡 PRO TIPS\n`
    for (const p of consecutivePatterns) {
      text += `• ${p.dayOfWeek}: ${p.tip}\n`
    }
    text += `\n`
  }

  if (busyWeeks.length > 0) {
    text += `⚠️ BUSY WEEKS\n`
    for (const w of busyWeeks) {
      text += `• Week ${w.weekNumber} (${w.startDate}-${w.endDate}): ${w.suspensions.length} suspensions\n`
    }
    text += `\n`
  }

  text += `📅 ALL SUSPENSION DAYS\n`
  for (const s of suspensions) {
    text += `• ${s.dateFormatted} (${s.dayAbbrev}) - ${s.summary}\n`
  }

  return text
}
