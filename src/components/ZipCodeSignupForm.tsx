'use client'

import { useState } from 'react'

// Valid NYC zip code prefixes (Manhattan, Brooklyn, Queens, Bronx, Staten Island)
const NYC_ZIP_PREFIXES = [
  '100', '101', '102', '103', '104', // Manhattan
  '112', '113', '114', // Brooklyn
  '110', '111', '113', '114', '116', // Queens
  '104', '105', // Bronx
  '103', // Staten Island
]

// Validate NYC zip code
function isValidNYCZip(zip: string): boolean {
  if (!/^\d{5}$/.test(zip)) return false
  // Check if starts with any NYC prefix
  return NYC_ZIP_PREFIXES.some(prefix => zip.startsWith(prefix))
}

// Validate email
function isValidEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function ZipCodeSignupForm() {
  const [zipCode, setZipCode] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5)
    setZipCode(value)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Zip code is required
    if (!zipCode || zipCode.length !== 5) {
      setError('Please enter your 5-digit NYC zip code')
      return
    }

    if (!isValidNYCZip(zipCode)) {
      setError('Please enter a valid NYC zip code')
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
          zipCode,
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
          <label htmlFor="zipCode" className="block text-sm font-medium text-[var(--navy-600)] mb-2">
            Your NYC Zip Code
          </label>
          <input
            type="text"
            id="zipCode"
            inputMode="numeric"
            pattern="[0-9]*"
            value={zipCode}
            onChange={handleZipChange}
            placeholder="10001"
            className="w-full px-4 py-3 border-2 border-[var(--navy-200)] rounded-lg focus:border-[var(--navy-800)] focus:outline-none text-lg text-center tracking-widest font-mono"
            autoComplete="postal-code"
          />
          <p className="mt-1 text-xs text-[var(--navy-400)]">
            We use this to personalize your alerts (subway lines, parking rules, local events)
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
