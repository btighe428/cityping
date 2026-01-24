// src/components/seo/SEOFooter.tsx
/**
 * Shared SEO Footer Component
 *
 * Provides consistent footer with:
 * - Strong internal link structure organized by topic silos
 * - Contact information for local SEO signals
 * - Consistent branding
 */

import Link from 'next/link'

interface SEOFooterProps {
  variant?: 'full' | 'compact'
}

export function SEOFooter({ variant = 'full' }: SEOFooterProps) {
  if (variant === 'compact') {
    return (
      <footer className="py-8 px-6 border-t border-[var(--navy-100)]">
        <div className="max-w-4xl mx-auto text-center text-sm text-[var(--navy-500)]">
          <Link href="/" className="hover:text-[var(--navy-700)]">Home</Link>
          {' · '}
          <Link href="/privacy" className="hover:text-[var(--navy-700)]">Privacy</Link>
          {' · '}
          <Link href="/terms" className="hover:text-[var(--navy-700)]">Terms</Link>
          <p className="mt-4">© {new Date().getFullYear()} CityPing. Made in NYC.</p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="py-8 px-6 border-t border-[var(--navy-100)] mt-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div>
            <h3 className="font-bold text-[var(--navy-800)] mb-3">CityPing</h3>
            <p className="text-sm text-[var(--navy-600)] mb-4">
              Your daily NYC intelligence. Parking alerts, subway status, events, and more.
            </p>
            <p className="text-sm text-[var(--navy-500)]">
              <a href="mailto:hello@cityping.net" className="hover:text-[var(--navy-700)]">
                hello@cityping.net
              </a>
            </p>
          </div>

          {/* Parking Resources - Topic Silo */}
          <div>
            <h3 className="font-bold text-[var(--navy-800)] mb-3">Parking Guides</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/nyc-alternate-side-parking-guide" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  ASP Complete Guide
                </Link>
              </li>
              <li>
                <Link href="/asp-suspension-calendar" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  Suspension Calendar
                </Link>
              </li>
              <li>
                <Link href="/nyc-parking-rules" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  Parking Rules
                </Link>
              </li>
              <li>
                <Link href="/snow-emergency-parking-nyc" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  Snow Emergency
                </Link>
              </li>
            </ul>
          </div>

          {/* NYC Resources - Topic Silo */}
          <div>
            <h3 className="font-bold text-[var(--navy-800)] mb-3">NYC Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/nyc-subway-alerts" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  Subway Alerts
                </Link>
              </li>
              <li>
                <Link href="/nyc-events-calendar" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  Events Calendar
                </Link>
              </li>
              <li>
                <Link href="/nyc-housing-lottery" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  Housing Lottery
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h3 className="font-bold text-[var(--navy-800)] mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="mailto:support@cityping.net" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="text-center text-sm text-[var(--navy-500)] pt-8 border-t border-[var(--navy-100)]">
          <p>© {new Date().getFullYear()} CityPing. All rights reserved.</p>
          <p className="mt-1">Made with ♥ in New York City</p>
        </div>
      </div>
    </footer>
  )
}
