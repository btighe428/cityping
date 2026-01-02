'use client'

import { useState } from 'react'
import { DateTime } from 'luxon'

interface CalendarProps {
  suspensions: { date: string; summary: string | null }[]
  timezone: string
}

export default function Calendar({ suspensions, timezone }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() =>
    DateTime.now().setZone(timezone).startOf('month')
  )

  // Extract just the date portion (YYYY-MM-DD) to avoid timezone issues
  // The dates are stored as UTC midnight, so we just need the date part
  const suspensionDates = new Set(
    suspensions.map(s => s.date.split('T')[0])
  )

  const suspensionMap = new Map(
    suspensions.map(s => [s.date.split('T')[0], s.summary])
  )

  const startOfMonth = currentMonth
  const endOfMonth = currentMonth.endOf('month')

  // Get the first day to display (Sunday of week containing first of month)
  // Luxon weekday: 1=Mon, 7=Sun. We want Sunday start, so subtract (weekday % 7) days
  const startDay = startOfMonth.minus({ days: startOfMonth.weekday % 7 })

  // Generate all days to display (6 weeks max)
  const days: DateTime[] = []
  let current = startDay
  while (current <= endOfMonth.endOf('week') && days.length < 42) {
    days.push(current)
    current = current.plus({ days: 1 })
  }

  const prevMonth = () => setCurrentMonth(currentMonth.minus({ months: 1 }))
  const nextMonth = () => setCurrentMonth(currentMonth.plus({ months: 1 }))

  const today = DateTime.now().setZone(timezone).toISODate()

  return (
    <div className="bg-white border border-[var(--navy-200)] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-[var(--navy-100)] rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-[var(--navy-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-[var(--navy-800)]">
          {currentMonth.toFormat('LLLL yyyy')}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-[var(--navy-100)] rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-[var(--navy-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-[var(--navy-500)] py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const dateStr = day.toISODate() || ''
          const isSuspension = suspensionDates.has(dateStr)
          const isCurrentMonth = day.month === currentMonth.month
          const isToday = dateStr === today
          const summary = suspensionMap.get(dateStr)

          return (
            <div
              key={i}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm
                ${!isCurrentMonth ? 'text-[var(--navy-300)]' : ''}
                ${isSuspension ? 'bg-[var(--navy-800)] text-white font-semibold' : ''}
                ${isToday && !isSuspension ? 'ring-2 ring-[var(--navy-400)]' : ''}
                ${isToday && isSuspension ? 'ring-2 ring-green-400' : ''}
                ${isCurrentMonth && !isSuspension ? 'hover:bg-[var(--navy-50)]' : ''}
                transition-colors cursor-default
              `}
              title={isSuspension ? summary || 'ASP Suspended' : undefined}
            >
              <span>{day.day}</span>
              {isSuspension ? (
                <span className="text-[8px] font-medium text-white/70 leading-none mt-0.5">
                  {isToday ? 'today!' : 'suspended'}
                </span>
              ) : isToday ? (
                <span className="text-[9px] font-medium text-[var(--navy-500)] leading-none mt-0.5">today</span>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm text-[var(--navy-600)]">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[var(--navy-800)] rounded" />
          <span>ASP Suspended</span>
        </div>
      </div>
    </div>
  )
}
