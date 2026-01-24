import ZipCodeSignupForm from '@/components/ZipCodeSignupForm'
import FAQ from '@/components/FAQ'
import UpcomingSuspensions from '@/components/UpcomingSuspensions'
import EmergencyAlert from '@/components/EmergencyAlert'
import { HomepageSchemas } from '@/components/seo/StructuredData'
import { Suspense } from 'react'

// Module definitions for the 6-module grid
const modules = [
  {
    id: 'parking',
    name: 'Parking',
    icon: '🅿️',
    description: 'ASP suspensions, street cleaning, meter holidays',
    examples: ['Holiday suspensions', 'Snow emergencies', 'Weekly reminders'],
    tier: 'free',
  },
  {
    id: 'transit',
    name: 'Transit',
    icon: '🚇',
    description: 'Real-time subway alerts for your commute lines',
    examples: ['Service changes', 'Delays & disruptions', 'Weekend work'],
    tier: 'free',
  },
  {
    id: 'events',
    name: 'Events',
    icon: '🎭',
    description: 'Free concerts, festivals, street fairs near you',
    examples: ['SummerStage', 'Street fairs', 'Free museum days'],
    tier: 'free',
  },
  {
    id: 'housing',
    name: 'Housing',
    icon: '🏠',
    description: 'Affordable housing lottery deadlines',
    examples: ['New listings', 'Deadline reminders', 'Income-eligible units'],
    tier: 'premium',
  },
  {
    id: 'food',
    name: 'Food & Sales',
    icon: '🛍️',
    description: 'Sample sales, food festivals, pop-ups',
    examples: ['Designer sales', 'Food festivals', 'Restaurant week'],
    tier: 'premium',
  },
  {
    id: 'deals',
    name: 'Deals',
    icon: '💰',
    description: 'Local deals, happy hours, neighborhood specials',
    examples: ['Happy hour alerts', 'Local promotions', 'Seasonal deals'],
    tier: 'premium',
  },
]

export default function Home() {
  return (
    <>
      {/* Structured Data for SEO */}
      <HomepageSchemas />

    <div className="min-h-screen flex flex-col">
      {/* Emergency Alert Banner */}
      <EmergencyAlert />

      {/* Header */}
      <header className="py-4 px-6 border-b border-[var(--navy-100)]">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-xl font-bold text-[var(--navy-800)]">
            NYCPing
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="text-sm text-[var(--navy-600)] hover:text-[var(--navy-800)]"
            >
              Dashboard
            </a>
            <div className="flex items-center gap-2">
              <select
                className="px-3 py-1.5 border border-[var(--navy-200)] rounded-md text-sm text-[var(--navy-600)] bg-white"
                defaultValue="nyc"
              >
                <option value="nyc">NYC</option>
                <option value="" disabled>More cities coming soon</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--navy-900)] leading-tight mb-6">
              Never Miss What Matters in NYC
            </h1>
            <p className="text-xl md:text-2xl text-[var(--navy-600)] mb-4">
              Personalized alerts for parking, transit, events, and more. Tailored to your neighborhood.
            </p>
            <p className="inline-block bg-[var(--navy-100)] text-[var(--navy-700)] px-4 py-2 rounded-full text-sm font-medium mb-10">
              Core alerts free forever
            </p>

            <ZipCodeSignupForm />
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-8 px-6 bg-[var(--navy-50)]">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[var(--navy-600)]">
              <span className="font-semibold text-[var(--navy-800)]">Join 2,500+ New Yorkers</span>
              {' '}who stay ahead of city life
            </p>
          </div>
        </section>

        {/* 6-Module Grid */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--navy-800)] mb-4 text-center">
              Everything NYC in One Place
            </h2>
            <p className="text-[var(--navy-600)] text-center mb-12 max-w-2xl mx-auto">
              Choose the alerts that matter to you. Start with the essentials, add more anytime.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className={`relative p-6 rounded-xl border-2 transition-all hover:shadow-lg ${
                    module.tier === 'premium'
                      ? 'border-[var(--accent-blue)] bg-blue-50/30'
                      : 'border-[var(--navy-200)] bg-white'
                  }`}
                >
                  {module.tier === 'premium' && (
                    <span className="absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full bg-[var(--accent-blue)] text-white">
                      Premium
                    </span>
                  )}
                  {module.tier === 'free' && (
                    <span className="absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Free
                    </span>
                  )}

                  <div className="text-3xl mb-3">{module.icon}</div>
                  <h3 className="font-bold text-lg text-[var(--navy-800)] mb-2">
                    {module.name}
                  </h3>
                  <p className="text-sm text-[var(--navy-600)] mb-4">
                    {module.description}
                  </p>

                  <ul className="space-y-1.5">
                    {module.examples.map((example, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[var(--navy-500)]">
                        <span className="w-1 h-1 rounded-full bg-[var(--navy-400)]" />
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Suspensions Preview (Parking module showcase) */}
        <section className="py-12 px-6 bg-[var(--navy-50)]">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-[var(--navy-700)] mb-4 text-center">
              Parking Module Preview
            </h3>
            <Suspense fallback={null}>
              <UpcomingSuspensions />
            </Suspense>
          </div>
        </section>

        {/* How It Works - Progressive Disclosure */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-[var(--navy-800)] mb-4 text-center">
              How It Works
            </h2>
            <p className="text-[var(--navy-600)] text-center mb-10 max-w-xl mx-auto">
              Smart defaults get you started instantly. Customize as you go.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-[var(--navy-800)] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold text-[var(--navy-800)] mb-2">Enter Your Zip</h3>
                <p className="text-[var(--navy-600)] text-sm">
                  We auto-detect your neighborhood, nearby subway lines, and local parking rules
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-[var(--navy-800)] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold text-[var(--navy-800)] mb-2">Get Smart Defaults</h3>
                <p className="text-[var(--navy-600)] text-sm">
                  Parking and transit alerts are on by default. Add housing, events, and deals when ready
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-[var(--navy-800)] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold text-[var(--navy-800)] mb-2">Stay Ahead</h3>
                <p className="text-[var(--navy-600)] text-sm">
                  Receive timely alerts via email (add SMS anytime). Never miss what matters
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 px-6 bg-[var(--navy-50)]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-[var(--navy-800)] mb-4 text-center">
              Simple, Fair Pricing
            </h2>
            <p className="text-[var(--navy-600)] text-center mb-10">
              Start free, upgrade when you want more
            </p>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Free Tier */}
              <div className="bg-white p-8 rounded-xl border-2 border-[var(--navy-200)]">
                <div className="text-sm font-medium text-[var(--navy-500)] mb-2">FREE</div>
                <div className="text-4xl font-bold text-[var(--navy-800)] mb-1">$0</div>
                <div className="text-sm text-[var(--navy-500)] mb-6">Forever</div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-600)]">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span>Parking alerts (ASP, holidays, emergencies)</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-600)]">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span>Transit alerts for your subway lines</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-600)]">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span>Free events near you</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-600)]">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span>Email delivery</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-400)]">
                    <span className="mt-0.5">&#8211;</span>
                    <span>SMS alerts</span>
                  </li>
                </ul>

                <button className="w-full py-3 px-6 border-2 border-[var(--navy-800)] text-[var(--navy-800)] font-semibold rounded-lg hover:bg-[var(--navy-50)] transition-colors">
                  Get Started
                </button>
              </div>

              {/* Premium Tier */}
              <div className="bg-white p-8 rounded-xl border-2 border-[var(--accent-blue)] relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--accent-blue)] text-white text-xs font-medium rounded-full">
                  Most Popular
                </div>
                <div className="text-sm font-medium text-[var(--accent-blue)] mb-2">PREMIUM</div>
                <div className="text-4xl font-bold text-[var(--navy-800)] mb-1">$7</div>
                <div className="text-sm text-[var(--navy-500)] mb-6">per month</div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-600)]">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-600)]">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span>Housing lottery alerts & deadlines</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-600)]">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span>Sample sales & food events</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-600)]">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span>Local deals & happy hours</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-600)]">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span>SMS alerts</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--navy-600)]">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span>Priority support</span>
                  </li>
                </ul>

                <button className="w-full py-3 px-6 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-dark)] text-white font-semibold rounded-lg transition-colors">
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-6">
          <FAQ />
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[var(--navy-100)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-[var(--navy-800)] mb-3">NYCPing</h3>
              <p className="text-sm text-[var(--navy-600)]">
                Personalized alerts for everything NYC. Parking, transit, events, housing, and more.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-[var(--navy-800)] mb-3">Alerts</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/parking" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Parking Alerts</a></li>
                <li><a href="/transit" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Transit Alerts</a></li>
                <li><a href="/events" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Event Alerts</a></li>
                <li><a href="/housing" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Housing Alerts</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-[var(--navy-800)] mb-3">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/nyc-alternate-side-parking-guide" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">NYC ASP Guide</a></li>
                <li><a href="/asp-suspension-calendar" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Suspension Calendar</a></li>
                <li><a href="/faq" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">FAQ</a></li>
                <li><a href="mailto:support@nycping.com" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-[var(--navy-800)] mb-3">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/terms" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Terms</a></li>
                <li><a href="/privacy" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-[var(--navy-500)] pt-8 border-t border-[var(--navy-100)]">
            Made in NYC
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}
