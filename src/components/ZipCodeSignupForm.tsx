'use client'

import { useState } from 'react'

// Borough options with icons
const BOROUGHS = [
  { value: '', label: 'Select your borough', icon: '' },
  { value: 'manhattan', label: 'Manhattan', icon: '🏙️' },
  { value: 'brooklyn', label: 'Brooklyn', icon: '🌉' },
  { value: 'queens', label: 'Queens', icon: '✈️' },
  { value: 'bronx', label: 'The Bronx', icon: '🏟️' },
  { value: 'staten_island', label: 'Staten Island', icon: '🛳️' },
]

// Validate email
function isValidEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function ZipCodeSignupForm() {
  const [borough, setBorough] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Borough is required
    if (!borough) {
      setError('Please select your borough')
      return
    }

    // Email is required
    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borough,
          email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      // Redirect to preferences page or dashboard
      window.location.href = data.redirectUrl || '/preferences'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="borough" className="block text-sm font-medium text-[var(--navy-600)] mb-2">
            Your Borough
          </label>
          <select
            id="borough"
            value={borough}
            onChange={(e) => { setBorough(e.target.value); setError('') }}
            className="w-full px-4 py-3 border-2 border-[var(--navy-200)] rounded-lg focus:border-[var(--navy-800)] focus:outline-none text-lg bg-white"
          >
            {BOROUGHS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.icon} {b.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--navy-400)]">
            We&apos;ll personalize alerts for your neighborhood
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--navy-600)] mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            placeholder="you@example.com"
            className="w-full px-4 py-3 border-2 border-[var(--navy-200)] rounded-lg focus:border-[var(--navy-800)] focus:outline-none text-lg"
            autoComplete="email"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-8 bg-[var(--navy-800)] hover:bg-[var(--navy-700)] disabled:bg-[var(--navy-300)] disabled:cursor-not-allowed text-white font-semibold text-lg rounded-lg transition-colors shadow-lg"
        >
          {isLoading ? 'Setting up your alerts...' : 'Get Started Free'}
        </button>

        <p className="text-center text-sm text-[var(--navy-500)]">
          Free forever for core alerts. Premium features $7/mo.
        </p>
      </form>
    </div>
  )
}
