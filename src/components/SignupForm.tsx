'use client'

import { useState } from 'react'

// Format phone number as user types
function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

// Convert formatted phone to E.164
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return ''
}

// Validate phone number (optional - can be empty)
function isValidPhone(phone: string): boolean {
  if (!phone) return true // Phone is optional now
  const e164 = toE164(phone)
  return e164.length === 12 && e164.startsWith('+1')
}

// Validate email
function isValidEmail(email: string): boolean {
  if (!email) return true // Email is optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function SignupForm() {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    if (formatted.length <= 14) {
      setPhone(formatted)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Email is required
    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (phone && !isValidPhone(phone)) {
      setError('Please enter a valid US phone number')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone ? toE164(phone) : undefined,
          email: email || undefined,
          citySlugs: ['nyc'],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--navy-600)] mb-2">
            Email
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

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-[var(--navy-600)] mb-2">
            Phone Number <span className="text-[var(--navy-400)]">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--navy-500)]">
              +1
            </span>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(212) 555-1234"
              className="w-full pl-12 pr-4 py-3 border-2 border-[var(--navy-200)] rounded-lg focus:border-[var(--navy-800)] focus:outline-none text-lg"
              autoComplete="tel-national"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--navy-400)]">
            Add phone for SMS alerts (requires confirmation)
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-8 bg-[var(--navy-800)] hover:bg-[var(--navy-700)] disabled:bg-[var(--navy-300)] disabled:cursor-not-allowed text-white font-semibold text-lg rounded-lg transition-colors shadow-lg"
        >
          {isLoading ? 'Signing up...' : 'Sign Up'}
        </button>

        <p className="text-center text-sm text-[var(--navy-500)]">
          Free during beta. No credit card required.
        </p>
      </form>
    </div>
  )
}
