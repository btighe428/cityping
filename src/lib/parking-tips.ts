import { prisma } from './db'

interface ConsecutiveSuspension {
  dayOfWeek: string
  dates: Date[]
  weeksInARow: number
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Find consecutive suspensions on the same day of the week
 * e.g., if Dec 24 (Tue) and Dec 31 (Tue) are both suspended
 */
export async function findConsecutiveSuspensions(
  cityId: string,
  fromDate: Date,
  weeksToCheck: number = 4
): Promise<ConsecutiveSuspension[]> {
  const endDate = new Date(fromDate)
  endDate.setDate(endDate.getDate() + weeksToCheck * 7)

  const suspensions = await prisma.suspensionEvent.findMany({
    where: {
      cityId,
      date: {
        gte: fromDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  })

  // Group by day of week
  const byDayOfWeek: Map<number, Date[]> = new Map()

  for (const suspension of suspensions) {
    const date = new Date(suspension.date)
    const dow = date.getDay()

    if (!byDayOfWeek.has(dow)) {
      byDayOfWeek.set(dow, [])
    }
    byDayOfWeek.get(dow)!.push(date)
  }

  // Find consecutive weeks
  const consecutives: ConsecutiveSuspension[] = []

  for (const [dow, dates] of byDayOfWeek) {
    if (dates.length < 2) continue

    // Check if dates are consecutive weeks
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime())
    let streak: Date[] = [sortedDates[0]]

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1]
      const currDate = sortedDates[i]
      const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff === 7) {
        // Consecutive week
        streak.push(currDate)
      } else {
        // Break in streak
        if (streak.length >= 2) {
          consecutives.push({
            dayOfWeek: DAY_NAMES[dow],
            dates: [...streak],
            weeksInARow: streak.length,
          })
        }
        streak = [currDate]
      }
    }

    // Don't forget the last streak
    if (streak.length >= 2) {
      consecutives.push({
        dayOfWeek: DAY_NAMES[dow],
        dates: [...streak],
        weeksInARow: streak.length,
      })
    }
  }

  return consecutives
}

/**
 * Generate parking tips based on upcoming suspensions
 */
export async function generateParkingTips(
  cityId: string,
  forDate: Date
): Promise<string[]> {
  const tips: string[] = []

  const consecutives = await findConsecutiveSuspensions(cityId, forDate, 4)

  for (const consecutive of consecutives) {
    if (consecutive.weeksInARow === 2) {
      tips.push(
        `💡 Tip: Both this ${consecutive.dayOfWeek} AND next ${consecutive.dayOfWeek} are suspended. ` +
        `If you're on a ${consecutive.dayOfWeek} side, no need to move for 2 weeks!`
      )
    } else if (consecutive.weeksInARow > 2) {
      tips.push(
        `💡 Tip: ${consecutive.weeksInARow} ${consecutive.dayOfWeek}s in a row are suspended! ` +
        `${consecutive.dayOfWeek}-side parkers can relax for ${consecutive.weeksInARow} weeks.`
      )
    }
  }

  return tips
}

/**
 * Format tips for email HTML
 */
export function formatTipsHtml(tips: string[]): string {
  if (tips.length === 0) return ''

  return `
    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 14px; text-transform: uppercase;">
        Parking Tips
      </h3>
      ${tips.map(tip => `<p style="margin: 8px 0; color: #78350f;">${tip}</p>`).join('')}
    </div>
  `
}

/**
 * Format tips for SMS (short version)
 */
export function formatTipsSms(tips: string[]): string {
  if (tips.length === 0) return ''
  // Just include first tip for SMS to keep it short
  return '\n\n' + tips[0].replace('💡 Tip: ', '💡 ')
}
