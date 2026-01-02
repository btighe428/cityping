'use client'

import { useEffect, useState } from 'react'

interface ASPStatus {
  isSuspended: boolean
  status: string
  reason: string | null
  message: string | null
  lastChecked: string
}

export default function EmergencyAlert() {
  const [status, setStatus] = useState<ASPStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchStatus() {
      try {
        // Use our server-side API route to avoid CORS issues
        const response = await fetch('/api/asp-status', {
          next: { revalidate: 300 }, // Cache for 5 minutes
        })

        if (!response.ok) {
          throw new Error('Failed to fetch status')
        }

        const data = await response.json()
        setStatus(data)
      } catch (err) {
        console.error('Failed to fetch ASP status:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()

    // Refresh status every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Show loading skeleton briefly
  if (loading) {
    return null
  }

  // Don't show on error
  if (error) {
    return null
  }

  // Only show if there's an active suspension
  if (!status?.isSuspended) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-3xl animate-bounce">🎉</span>
            <div>
              <p className="font-bold text-xl">
                ASP Suspended Today!
              </p>
              <p className="text-green-100 text-sm mt-1">
                {status.reason && (
                  <span className="font-semibold bg-green-700/50 px-2 py-0.5 rounded mr-2">
                    {status.reason}
                  </span>
                )}
                {status.message || 'No need to move your car for street cleaning.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://portal.311.nyc.gov/article/?kanumber=KA-01011"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors font-medium"
            >
              NYC 311 →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
