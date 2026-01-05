'use client'

import { useState } from 'react'
import Calendar from './Calendar'
import UpcomingSuspensionsTable from './UpcomingSuspensionsTable'

interface DashboardClientProps {
  phone: {
    e164: string
    smsOptInStatus: string
  } | null
  email: string | null
  subscription: {
    status: string
  } | null
  cityAlerts: {
    city: { slug: string; name: string }
    enabled: boolean
    notifySms: boolean
    notifyEmail: boolean
    preferredSendTimeLocal: string | null
  }[]
  suspensions: { date: string; summary: string | null }[]
  messages: { createdAt: string; type: string; body: string }[]
  token: string
  timezone: string
}

// Mask phone number: +12125551234 -> •••-•••-1234
function maskPhone(e164: string): string {
  if (e164.length < 4) return e164
  const last4 = e164.slice(-4)
  return `•••-•••-${last4}`
}

const TIME_OPTIONS = [
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
]

function formatTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
}

export default function DashboardClient({
  phone,
  email,
  subscription,
  cityAlerts,
  suspensions,
  messages,
  token,
  timezone,
}: DashboardClientProps) {
  const [alerts, setAlerts] = useState(cityAlerts)
  const [preferredTime, setPreferredTime] = useState(
    cityAlerts[0]?.preferredSendTimeLocal || '18:00'
  )
  const [notifySms, setNotifySms] = useState(cityAlerts[0]?.notifySms ?? true)
  const [notifyEmail, setNotifyEmail] = useState(cityAlerts[0]?.notifyEmail ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const [showMessages, setShowMessages] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch('/api/manage/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          citySettings: alerts.map(a => ({
            slug: a.city.slug,
            enabled: a.enabled,
          })),
          preferredSendTimeLocal: preferredTime,
          notifySms,
          notifyEmail,
        }),
      })
    } catch (error) {
      console.error('Failed to save:', error)
    }
    setIsSaving(false)
  }

  const handlePortal = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Failed to create portal session:', error)
    }
  }

  const isPending = phone?.smsOptInStatus === 'pending'
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
  const hasPhone = !!phone?.e164
  const hasEmail = !!email

  return (
    <div className="min-h-screen bg-[var(--navy-50)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--navy-200)] py-4 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="text-xl font-bold text-[var(--navy-800)]">CityPing</div>
          <div className="flex items-center gap-4">
            <span className="text-[var(--navy-600)]">
              {email || (phone ? maskPhone(phone.e164) : 'No contact')}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {isActive ? 'Active' : subscription?.status || 'Unknown'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-6">
        {/* Pending confirmation banner */}
        {hasPhone && isPending && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-800">Confirm your phone</p>
                <p className="text-sm text-yellow-700">
                  Reply <strong>YES</strong> to the text we sent to start receiving SMS alerts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Calendar */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--navy-800)] mb-4">
            Suspension Calendar
          </h2>
          <Calendar suspensions={suspensions} timezone={timezone} />
        </section>

        {/* Upcoming Suspensions Table */}
        <section className="mb-8">
          <UpcomingSuspensionsTable suspensions={suspensions} timezone={timezone} />
        </section>

        {/* Preferences */}
        <section className="bg-white border border-[var(--navy-200)] rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-[var(--navy-800)] mb-4">
            Preferences
          </h2>

          {/* Notification methods */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--navy-600)] mb-2">
              Notify me via
            </label>
            <div className="space-y-2">
              {hasEmail && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="w-5 h-5 rounded border-[var(--navy-300)] text-[var(--navy-800)] focus:ring-[var(--navy-800)]"
                  />
                  <span className="text-[var(--navy-800)]">Email</span>
                  <span className="text-xs text-[var(--navy-400)]">({email})</span>
                </label>
              )}
              {hasPhone && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifySms}
                    onChange={(e) => setNotifySms(e.target.checked)}
                    disabled={isPending}
                    className="w-5 h-5 rounded border-[var(--navy-300)] text-[var(--navy-800)] focus:ring-[var(--navy-800)] disabled:opacity-50"
                  />
                  <span className={`text-[var(--navy-800)] ${isPending ? 'opacity-50' : ''}`}>SMS</span>
                  <span className="text-xs text-[var(--navy-400)]">({phone ? maskPhone(phone.e164) : ''})</span>
                  {isPending && (
                    <span className="text-xs text-yellow-600">(pending confirmation)</span>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Reminder time */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--navy-600)] mb-2">
              Reminder Time
            </label>
            <select
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="px-4 py-2 border border-[var(--navy-200)] rounded-lg text-[var(--navy-800)]"
            >
              {TIME_OPTIONS.map(time => (
                <option key={time} value={time}>{formatTime(time)}</option>
              ))}
            </select>
          </div>

          {/* City toggles */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--navy-600)] mb-2">
              Cities
            </label>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <label key={alert.city.slug} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alert.enabled}
                    onChange={(e) => {
                      const newAlerts = [...alerts]
                      newAlerts[i] = { ...alert, enabled: e.target.checked }
                      setAlerts(newAlerts)
                    }}
                    className="w-5 h-5 rounded border-[var(--navy-300)] text-[var(--navy-800)] focus:ring-[var(--navy-800)]"
                  />
                  <span className="text-[var(--navy-800)]">{alert.city.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-[var(--navy-800)] text-white rounded-lg hover:bg-[var(--navy-700)] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </section>

        {/* Message History */}
        <section className="bg-white border border-[var(--navy-200)] rounded-lg p-6 mb-8">
          <button
            onClick={() => setShowMessages(!showMessages)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-lg font-semibold text-[var(--navy-800)]">
              Recent Messages
            </h2>
            <span className="text-[var(--navy-400)]">
              {showMessages ? '−' : '+'}
            </span>
          </button>

          {showMessages && (
            <div className="mt-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-[var(--navy-500)] text-sm">No messages yet.</p>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className="border-b border-[var(--navy-100)] pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[var(--navy-400)]">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-[var(--navy-100)] text-[var(--navy-600)] rounded">
                        {msg.type}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--navy-700)]">{msg.body}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Billing */}
        <section className="text-center">
          <button
            onClick={handlePortal}
            className="text-[var(--navy-600)] hover:text-[var(--navy-800)] underline text-sm"
          >
            Manage Billing
          </button>
          <p className="mt-2 text-xs text-[var(--navy-400)]">
            Need help? Text HELP or email support@cityping.net
          </p>
        </section>
      </main>
    </div>
  )
}
