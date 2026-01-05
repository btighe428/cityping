import { Metadata } from 'next'
import Link from 'next/link'
import UpcomingSuspensions from '@/components/UpcomingSuspensions'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'NYC ASP Suspension Calendar 2025 - Alternate Side Parking Holidays',
  description: 'Complete calendar of NYC alternate side parking (ASP) suspensions for 2025. View all holidays, religious observances, and special events when ASP is suspended.',
  keywords: [
    'ASP suspension calendar',
    'NYC parking calendar',
    'alternate side parking holidays',
    'ASP suspended today',
    'NYC parking holidays 2025',
    'street cleaning suspension',
    'ASP calendar NYC'
  ],
  openGraph: {
    title: 'NYC ASP Suspension Calendar 2025',
    description: 'Complete calendar of NYC alternate side parking suspensions for 2025 - all holidays and special events.',
    url: 'https://cityping.net/asp-suspension-calendar',
    type: 'website',
  },
  alternates: {
    canonical: 'https://cityping.net/asp-suspension-calendar',
  },
}

export default function ASPSuspensionCalendar() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://cityping.net"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "ASP Suspension Calendar",
        "item": "https://cityping.net/asp-suspension-calendar"
      }
    ]
  }

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "NYC Alternate Side Parking Suspensions 2025",
    "description": "Calendar of all NYC alternate side parking suspensions for 2025",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "eventStatus": "https://schema.org/EventScheduled",
    "location": {
      "@type": "Place",
      "name": "New York City",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "New York",
        "addressRegion": "NY",
        "addressCountry": "US"
      }
    },
    "organizer": {
      "@type": "Organization",
      "name": "NYC Department of Sanitation"
    }
  }

  // 2025 ASP Suspension dates (comprehensive list)
  const suspensions2025 = [
    { date: '2025-01-01', name: "New Year's Day", type: 'Federal Holiday' },
    { date: '2025-01-20', name: "Martin Luther King Jr. Day", type: 'Federal Holiday' },
    { date: '2025-02-12', name: "Lincoln's Birthday", type: 'State Holiday' },
    { date: '2025-02-17', name: "Presidents' Day", type: 'Federal Holiday' },
    { date: '2025-04-13', name: "Passover (First Day)", type: 'Religious Holiday' },
    { date: '2025-04-14', name: "Passover (Second Day)", type: 'Religious Holiday' },
    { date: '2025-04-18', name: "Good Friday", type: 'Religious Holiday' },
    { date: '2025-04-19', name: "Passover (Seventh Day)", type: 'Religious Holiday' },
    { date: '2025-04-20', name: "Passover (Eighth Day)", type: 'Religious Holiday' },
    { date: '2025-04-20', name: "Easter Sunday", type: 'Religious Holiday' },
    { date: '2025-05-26', name: "Memorial Day", type: 'Federal Holiday' },
    { date: '2025-06-02', name: "Shavuot (First Day)", type: 'Religious Holiday' },
    { date: '2025-06-03', name: "Shavuot (Second Day)", type: 'Religious Holiday' },
    { date: '2025-06-19', name: "Juneteenth", type: 'Federal Holiday' },
    { date: '2025-07-04', name: "Independence Day", type: 'Federal Holiday' },
    { date: '2025-09-01', name: "Labor Day", type: 'Federal Holiday' },
    { date: '2025-09-23', name: "Rosh Hashanah (First Day)", type: 'Religious Holiday' },
    { date: '2025-09-24', name: "Rosh Hashanah (Second Day)", type: 'Religious Holiday' },
    { date: '2025-10-02', name: "Yom Kippur", type: 'Religious Holiday' },
    { date: '2025-10-07', name: "Sukkot (First Day)", type: 'Religious Holiday' },
    { date: '2025-10-08', name: "Sukkot (Second Day)", type: 'Religious Holiday' },
    { date: '2025-10-13', name: "Columbus Day", type: 'Federal Holiday' },
    { date: '2025-10-14', name: "Shemini Atzeret", type: 'Religious Holiday' },
    { date: '2025-10-15', name: "Simchat Torah", type: 'Religious Holiday' },
    { date: '2025-11-04', name: "Election Day", type: 'Civic Holiday' },
    { date: '2025-11-11', name: "Veterans Day", type: 'Federal Holiday' },
    { date: '2025-11-27', name: "Thanksgiving Day", type: 'Federal Holiday' },
    { date: '2025-12-25', name: "Christmas Day", type: 'Federal Holiday' },
  ]

  const getMonthSuspensions = (month: number) => {
    return suspensions2025.filter(s => {
      const suspensionMonth = new Date(s.date).getMonth() + 1
      return suspensionMonth === month
    })
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />

      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="py-4 px-6 border-b border-[var(--navy-100)]">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-[var(--navy-800)] hover:text-[var(--navy-900)]">
              CityPing
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors"
            >
              Get Alerts
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <article className="max-w-6xl mx-auto px-6 py-12">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-[var(--navy-600)]">
              <Link href="/" className="hover:text-[var(--navy-800)]">Home</Link>
              <span className="mx-2">/</span>
              <span>ASP Suspension Calendar</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              NYC ASP Suspension Calendar 2025
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              Complete calendar of all NYC alternate side parking (ASP) suspensions for 2025. ASP is suspended on legal holidays, religious observances, and special events. Bookmark this page or sign up for automatic alerts.
            </p>

            {/* Live Upcoming Suspensions */}
            <section className="mb-12">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-[var(--navy-900)] mb-4">
                  Upcoming ASP Suspensions
                </h2>
                <p className="text-[var(--navy-700)] mb-6">
                  Live data showing the next ASP suspensions in NYC. This information is updated automatically.
                </p>
                <Suspense fallback={
                  <div className="text-center py-8 text-[var(--navy-600)]">
                    Loading suspension data...
                  </div>
                }>
                  <UpcomingSuspensions />
                </Suspense>
              </div>
            </section>

            {/* CTA for Automatic Alerts */}
            <section className="mb-12">
              <div className="bg-[var(--navy-800)] text-white rounded-lg p-8">
                <h2 className="text-3xl font-bold mb-4">Never Check the Calendar Again</h2>
                <p className="text-xl mb-6 text-blue-100">
                  Get automatic SMS and email alerts the evening before every ASP suspension, plus weekly previews and monthly calendars.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/"
                    className="inline-block px-8 py-4 bg-white text-[var(--navy-800)] rounded-md hover:bg-blue-50 transition-colors font-semibold text-lg text-center"
                  >
                    Sign Up for Free Alerts
                  </Link>
                  <Link
                    href="/nyc-alternate-side-parking-guide"
                    className="inline-block px-8 py-4 bg-transparent border-2 border-white text-white rounded-md hover:bg-white hover:text-[var(--navy-800)] transition-colors font-semibold text-lg text-center"
                  >
                    Learn About ASP
                  </Link>
                </div>
              </div>
            </section>

            {/* Full 2025 Calendar */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-6">
                Complete 2025 ASP Suspension Calendar
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-8">
                Below is the complete list of all {suspensions2025.length} ASP suspension days in 2025, organized by month. This includes federal holidays, state holidays, religious observances, and civic events.
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {months.map((month, index) => {
                  const monthNumber = index + 1
                  const monthSuspensions = getMonthSuspensions(monthNumber)

                  return (
                    <div key={month} className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                      <h3 className="text-xl font-bold text-[var(--navy-800)] mb-4 pb-3 border-b border-[var(--navy-200)]">
                        {month} 2025
                      </h3>
                      {monthSuspensions.length > 0 ? (
                        <ul className="space-y-3">
                          {monthSuspensions.map((suspension, idx) => {
                            const date = new Date(suspension.date + 'T12:00:00')
                            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })
                            const dayOfMonth = date.getDate()

                            return (
                              <li key={idx} className="text-sm">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-12 text-center">
                                    <div className="text-xs text-[var(--navy-500)] uppercase">{dayOfWeek}</div>
                                    <div className="text-lg font-bold text-[var(--navy-900)]">{dayOfMonth}</div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-semibold text-[var(--navy-800)]">{suspension.name}</div>
                                    <div className="text-xs text-[var(--navy-500)]">{suspension.type}</div>
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="text-[var(--navy-500)] text-sm italic">No suspensions this month</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Important Notes */}
            <section className="mb-12">
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
                <h3 className="text-xl font-bold text-[var(--navy-900)] mb-3">
                  Important Notes About ASP Suspensions
                </h3>
                <ul className="space-y-2 text-[var(--navy-700)]">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Meter Rules Still Apply:</strong> Even when ASP is suspended, parking meters are still in effect unless otherwise posted.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Snow Emergency Rules:</strong> During snow emergencies, special parking rules take effect that may override ASP suspensions.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Other Restrictions:</strong> ASP suspension does NOT suspend other parking restrictions like no standing zones, bus stops, or fire hydrants.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Subject to Change:</strong> The city may announce additional suspensions due to weather or special events. CityPing alerts include these emergency suspensions.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Historical Context */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-6">
                Understanding ASP Suspension Patterns
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                The NYC Department of Sanitation suspends alternate side parking on approximately 28-30 days per year. This represents about 8% of the calendar year. Understanding these patterns can help optimize parking strategies:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    Suspension Frequency by Month
                  </h3>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li><strong>April & October:</strong> Highest (5-6 days) - Multiple religious holidays</li>
                    <li><strong>January & September:</strong> Moderate (3-4 days)</li>
                    <li><strong>July & November:</strong> Moderate (2-3 days)</li>
                    <li><strong>August:</strong> Lowest (0-1 days) - Fewest holidays</li>
                  </ul>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    Types of Suspensions
                  </h3>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li><strong>Federal Holidays:</strong> 11 days (fixed annual dates)</li>
                    <li><strong>Religious Observances:</strong> 12-15 days (dates vary by year)</li>
                    <li><strong>State/Local Holidays:</strong> 2-3 days</li>
                    <li><strong>Emergency Suspensions:</strong> Variable (weather, special events)</li>
                  </ul>
                </div>
              </div>

              <p className="text-lg text-[var(--navy-700)] leading-relaxed">
                From a financial planning perspective, understanding suspension patterns can help NYC residents optimize parking costs. Those who strategically use street parking during high-suspension months (April, October) while utilizing garage parking during low-suspension months can realize significant annual savings.
              </p>
            </section>

            {/* How to Use This Calendar */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-6">
                How to Use This Calendar
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    1
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--navy-800)] mb-2">
                    Bookmark This Page
                  </h3>
                  <p className="text-[var(--navy-600)]">
                    Save this page for quick reference when planning your week or month.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    2
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--navy-800)] mb-2">
                    Add to Your Calendar
                  </h3>
                  <p className="text-[var(--navy-600)]">
                    Manually add suspension dates to your phone or computer calendar app.
                  </p>
                </div>

                <div className="bg-white border-2 border-blue-500 rounded-lg p-6 shadow-lg">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                    3
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--navy-800)] mb-2">
                    Or Get Automatic Alerts
                  </h3>
                  <p className="text-[var(--navy-600)] mb-4">
                    The easiest way: Sign up for CityPing and receive automatic alerts.
                  </p>
                  <Link
                    href="/"
                    className="inline-block px-4 py-2 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold text-sm"
                  >
                    Sign Up Free
                  </Link>
                </div>
              </div>
            </section>

            {/* Related Resources */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-6">
                Related Resources
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Link
                  href="/nyc-alternate-side-parking-guide"
                  className="block bg-white border-2 border-[var(--navy-200)] rounded-lg p-6 hover:border-[var(--navy-400)] transition-colors"
                >
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    NYC ASP Complete Guide
                  </h3>
                  <p className="text-[var(--navy-600)]">
                    Learn everything about alternate side parking rules, regulations, and fines.
                  </p>
                </Link>

                <Link
                  href="/snow-emergency-parking-nyc"
                  className="block bg-white border-2 border-[var(--navy-200)] rounded-lg p-6 hover:border-[var(--navy-400)] transition-colors"
                >
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    Snow Emergency Parking
                  </h3>
                  <p className="text-[var(--navy-600)]">
                    Special parking rules during NYC snow emergencies and winter weather.
                  </p>
                </Link>

                <Link
                  href="/nyc-parking-rules"
                  className="block bg-white border-2 border-[var(--navy-200)] rounded-lg p-6 hover:border-[var(--navy-400)] transition-colors"
                >
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    NYC Parking Rules Guide
                  </h3>
                  <p className="text-[var(--navy-600)]">
                    Complete guide to all NYC parking regulations beyond ASP.
                  </p>
                </Link>

                <Link
                  href="/faq"
                  className="block bg-white border-2 border-[var(--navy-200)] rounded-lg p-6 hover:border-[var(--navy-400)] transition-colors"
                >
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-[var(--navy-600)]">
                    Common questions about ASP suspensions and CityPing alerts.
                  </p>
                </Link>
              </div>
            </section>
          </article>
        </main>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-[var(--navy-100)] mt-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-[var(--navy-800)] mb-3">CityPing</h3>
                <p className="text-sm text-[var(--navy-600)]">
                  Never get a parking ticket on a holiday again.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-[var(--navy-800)] mb-3">Resources</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/nyc-alternate-side-parking-guide" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">ASP Guide</Link></li>
                  <li><Link href="/asp-suspension-calendar" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Suspension Calendar</Link></li>
                  <li><Link href="/nyc-parking-rules" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Parking Rules</Link></li>
                  <li><Link href="/snow-emergency-parking-nyc" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Snow Emergency</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-[var(--navy-800)] mb-3">Support</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/faq" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">FAQ</Link></li>
                  <li><a href="mailto:support@cityping.net" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-[var(--navy-800)] mb-3">Legal</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/terms" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Terms</Link></li>
                  <li><Link href="/privacy" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Privacy</Link></li>
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
