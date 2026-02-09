import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NYC Alternate Side Parking Complete Guide 2025',
  description: 'The ultimate guide to NYC alternate side parking (ASP): rules, regulations, suspension schedule, fines, and how to never get a ticket. Learn everything about ASP in New York City.',
  keywords: [
    'NYC alternate side parking',
    'ASP NYC guide',
    'alternate side parking rules',
    'NYC street cleaning',
    'ASP suspensions',
    'NYC parking tickets',
    'alternate side parking hours',
    'NYC parking regulations'
  ],
  openGraph: {
    title: 'NYC Alternate Side Parking Complete Guide 2025',
    description: 'The ultimate guide to NYC alternate side parking: rules, suspensions, fines, and tips for avoiding tickets.',
    url: 'https://cityping.net/nyc-alternate-side-parking-guide',
    type: 'article',
  },
  alternates: {
    canonical: 'https://cityping.net/nyc-alternate-side-parking-guide',
  },
}

export default function NYCAlternateSideParkingGuide() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NYC Alternate Side Parking Complete Guide 2025",
    "description": "The ultimate guide to NYC alternate side parking (ASP): rules, regulations, suspension schedule, fines, and how to never get a ticket.",
    "author": {
      "@type": "Organization",
      "name": "CityPing"
    },
    "publisher": {
      "@type": "Organization",
      "name": "CityPing",
      "logo": {
        "@type": "ImageObject",
        "url": "https://cityping.net/logo.png"
      }
    },
    "datePublished": "2025-01-01",
    "dateModified": new Date().toISOString().split('T')[0],
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://cityping.net/nyc-alternate-side-parking-guide"
    }
  }

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
        "name": "NYC Alternate Side Parking Guide",
        "item": "https://cityping.net/nyc-alternate-side-parking-guide"
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
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
          <article className="max-w-4xl mx-auto px-6 py-12">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-[var(--navy-600)]">
              <Link href="/" className="hover:text-[var(--navy-800)]">Home</Link>
              <span className="mx-2">/</span>
              <span>NYC Alternate Side Parking Guide</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              NYC Alternate Side Parking: The Complete Guide (2025)
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              Alternate Side Parking (ASP) is New York City&apos;s street cleaning program that requires vehicles to move from one side of the street to another on scheduled days. This comprehensive guide covers everything you need to know to avoid tickets and navigate NYC&apos;s ASP regulations.
            </p>

            {/* Quick Navigation */}
            <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-12">
              <h2 className="text-lg font-bold text-[var(--navy-900)] mb-4">Quick Navigation</h2>
              <ul className="space-y-2">
                <li><a href="#what-is-asp" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">What is Alternate Side Parking?</a></li>
                <li><a href="#how-it-works" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">How ASP Works in NYC</a></li>
                <li><a href="#reading-signs" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Reading ASP Signs</a></li>
                <li><a href="#suspensions" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">ASP Suspensions & Holidays</a></li>
                <li><a href="#penalties" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Fines and Penalties</a></li>
                <li><a href="#tips" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Pro Tips for NYC Drivers</a></li>
              </ul>
            </div>

            {/* What is ASP */}
            <section id="what-is-asp" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                What is Alternate Side Parking?
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Alternate Side Parking (ASP) is a street cleaning regulation implemented by the New York City Department of Sanitation. The program requires drivers to move their vehicles from one side of the street to the other on specific days and times to allow street sweepers to clean the curb.
              </p>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                ASP has been in effect since 1950 and is crucial for maintaining clean streets, preventing rat infestations, and ensuring proper drainage during rain events. The Department of Sanitation cleans approximately 6,000 miles of NYC streets under the ASP program.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Historical Context:</p>
                <p className="text-[var(--navy-700)]">
                  The ASP program was established in the post-World War II era as NYC&apos;s population and vehicle ownership surged. Prior to ASP, street cleaning was irregular and inefficient. The program has evolved significantly, with modern street sweepers now equipped with GPS tracking and sophisticated cleaning technology.
                </p>
              </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                How Alternate Side Parking Works in NYC
              </h2>
              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Standard ASP Schedule
              </h3>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                ASP operates on a regular schedule throughout the five boroughs, though specific times vary by location:
              </p>
              <ul className="list-disc list-inside space-y-3 mb-6 text-lg text-[var(--navy-700)]">
                <li><strong>Manhattan:</strong> Typically 8:00 AM - 11:00 AM or 11:30 AM - 2:00 PM</li>
                <li><strong>Brooklyn:</strong> Usually 9:00 AM - 10:30 AM or 11:00 AM - 12:30 PM</li>
                <li><strong>Queens:</strong> Commonly 9:00 AM - 10:30 AM or 12:30 PM - 2:00 PM</li>
                <li><strong>The Bronx:</strong> Generally 9:00 AM - 10:30 AM or 11:00 AM - 12:30 PM</li>
                <li><strong>Staten Island:</strong> Often 9:00 AM - 10:30 AM or 12:00 PM - 1:30 PM</li>
              </ul>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Important:</p>
                <p className="text-[var(--navy-700)]">
                  Always check the specific signs on your street. ASP schedules vary significantly by neighborhood and even by block. The times listed above are general guidelines only.
                </p>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Weekly Patterns
              </h3>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Most NYC streets have ASP regulations 2-3 days per week. The pattern typically alternates sides:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-6 text-lg text-[var(--navy-700)]">
                <li>Monday & Thursday: One side of the street</li>
                <li>Tuesday & Friday: Opposite side of the street</li>
                <li>Some areas: Wednesday is also included</li>
              </ul>
            </section>

            {/* Reading Signs */}
            <section id="reading-signs" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                How to Read ASP Signs
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                NYC parking signs can be confusing, but understanding them is critical to avoiding tickets. Here&apos;s how to decode ASP signage:
              </p>
              <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                  Standard ASP Sign Components:
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-lg text-[var(--navy-700)]">
                  <li><strong>&quot;NO PARKING&quot;</strong> - The primary restriction</li>
                  <li><strong>Days of the week</strong> - When the rule applies (e.g., "MON & THURS")</li>
                  <li><strong>Time window</strong> - Specific hours (e.g., "8AM - 11AM")</li>
                  <li><strong>Arrow indicators</strong> - Which direction the rule applies</li>
                  <li><strong>Additional regulations</strong> - May include meter rules, truck restrictions, etc.</li>
                </ol>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Sign Reading Pro Tips:
              </h3>
              <ul className="list-disc list-inside space-y-3 mb-6 text-lg text-[var(--navy-700)]">
                <li><strong>Multiple signs:</strong> When multiple signs are posted, ALL regulations apply. Read every sign on the pole.</li>
                <li><strong>Arrows matter:</strong> Pay attention to arrow directions - they indicate exactly where restrictions apply.</li>
                <li><strong>Except clauses:</strong> Look for "EXCEPT" text which may indicate suspended periods or special exemptions.</li>
                <li><strong>Meter rules:</strong> ASP can coexist with meter parking - you may need to pay AND move for street cleaning.</li>
              </ul>
            </section>

            {/* Suspensions */}
            <section id="suspensions" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                ASP Suspensions and Holidays
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                One of the most important aspects of ASP is knowing when it's suspended. The NYC Department of Sanitation suspends ASP on legal holidays and certain religious observances.
              </p>
              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                When is ASP Suspended?
              </h3>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                ASP is typically suspended on the following holidays:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-6 text-lg text-[var(--navy-700)]">
                <li>New Year's Day</li>
                <li>Martin Luther King Jr. Day</li>
                <li>Presidents' Day (Lincoln's Birthday & Washington's Birthday)</li>
                <li>Memorial Day</li>
                <li>Juneteenth</li>
                <li>Independence Day</li>
                <li>Labor Day</li>
                <li>Columbus Day</li>
                <li>Veterans Day</li>
                <li>Thanksgiving Day</li>
                <li>Christmas Day</li>
                <li>Various religious holidays (Rosh Hashanah, Yom Kippur, Good Friday, etc.)</li>
              </ul>
              <div className="bg-green-50 border-l-4 border-green-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">CityPing Solution:</p>
                <p className="text-[var(--navy-700)] mb-4">
                  Never wonder if ASP is suspended again. CityPing sends you automatic SMS and email alerts the evening before any ASP suspension, plus weekly previews and monthly calendars.
                </p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold"
                >
                  Sign Up for Free Alerts
                </Link>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Snow Emergency Suspensions
              </h3>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                During snow emergencies, ASP may be suspended to facilitate snow removal operations. However, specific snow emergency parking rules take effect, which may be more restrictive than standard ASP. Learn more in our <Link href="/snow-emergency-parking-nyc" className="text-blue-600 hover:underline">Snow Emergency Parking Guide</Link>.
              </p>
            </section>

            {/* Penalties */}
            <section id="penalties" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Fines, Penalties, and Consequences
              </h2>
              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                ASP Violation Fines (2025)
              </h3>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                The standard fine for an ASP violation in New York City is:
              </p>
              <div className="bg-red-50 border-l-4 border-red-500 p-6 my-6">
                <p className="text-3xl font-bold text-[var(--navy-900)] mb-2">$65</p>
                <p className="text-[var(--navy-700)]">
                  Base fine for alternate side parking violations. This increases to $80 if not paid within 30 days, and continues to escalate with additional penalties and potential towing.
                </p>
              </div>
              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Additional Consequences
              </h3>
              <ul className="list-disc list-inside space-y-3 mb-6 text-lg text-[var(--navy-700)]">
                <li><strong>Late payment penalties:</strong> Additional fees apply if not paid within 30 days</li>
                <li><strong>Judgment entered:</strong> Unpaid tickets become judgments after 100 days</li>
                <li><strong>Booting and towing:</strong> Vehicles with multiple unpaid tickets may be booted or towed</li>
                <li><strong>Registration suspension:</strong> DMV can suspend registration for unpaid tickets</li>
                <li><strong>Collections:</strong> Unpaid judgments go to collections and affect credit scores</li>
              </ul>
              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Financial Impact Analysis
              </h3>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                From a wealth creation perspective, ASP violations represent a significant wealth leak for NYC drivers. Consider this analysis:
              </p>
              <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-6">
                <p className="text-lg text-[var(--navy-700)] mb-4">
                  <strong>Scenario:</strong> A driver who gets 4 ASP tickets per year over 10 years:
                </p>
                <ul className="list-disc list-inside space-y-2 text-[var(--navy-700)]">
                  <li>Direct cost: 40 tickets × $65 = $2,600</li>
                  <li>Opportunity cost (invested at 7% annual return): ~$3,590</li>
                  <li>Time lost dealing with tickets: ~20 hours</li>
                </ul>
                <p className="text-lg text-[var(--navy-700)] mt-4">
                  <strong>Avoiding just 4 tickets per year could save you $3,600+ over a decade</strong> - enough for a significant investment contribution or emergency fund.
                </p>
              </div>
            </section>

            {/* Pro Tips */}
            <section id="tips" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Pro Tips for NYC Drivers
              </h2>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    1. Set Phone Reminders
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Create recurring reminders on your phone for your street's ASP schedule. Better yet, use CityPing for automated alerts.
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    2. Know Your Suspension Calendar
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Keep our <Link href="/asp-suspension-calendar" className="text-blue-600 hover:underline">ASP Suspension Calendar</Link> bookmarked for quick reference.
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    3. The 90-Second Rule
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    You can stay in your car during ASP hours. If an agent approaches, you have time to move before getting ticketed.
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    4. Watch for the Street Sweeper
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Once the street sweeper passes, you can usually return to your spot, even if it's before the posted end time.
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    5. Document Everything
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    If you believe you received a ticket in error, take photos of signs and your vehicle's position immediately.
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    6. Consider Alternative Parking
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    For long-term financial planning, calculate if a monthly garage might be more cost-effective than street parking plus tickets.
                  </p>
                </div>
              </div>
            </section>

            {/* Technology Solutions */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Modern Technology Solutions
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                The evolution of smart city technology has made ASP compliance significantly easier. GPS-enabled street sweepers now provide real-time data on cleaning status, while notification services like CityPing leverage this data to provide proactive alerts.
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8 my-6">
                <h3 className="text-2xl font-semibold text-[var(--navy-900)] mb-4">
                  Why CityPing is the Optimal Solution
                </h3>
                <ul className="space-y-3 text-lg text-[var(--navy-700)] mb-6">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Evening alerts before every ASP suspension - never wonder if you need to move</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Weekly preview texts showing upcoming suspensions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Monthly calendar emails for long-term planning</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Congestion pricing alerts and updates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Free during beta - no credit card required</span>
                  </li>
                </ul>
                <Link
                  href="/"
                  className="inline-block px-8 py-4 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold text-lg"
                >
                  Join 1,000+ NYC Drivers Using CityPing
                </Link>
              </div>
            </section>

            {/* Related Resources */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Related Resources
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Link
                  href="/asp-suspension-calendar"
                  className="block bg-white border-2 border-[var(--navy-200)] rounded-lg p-6 hover:border-[var(--navy-400)] transition-colors"
                >
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    ASP Suspension Calendar
                  </h3>
                  <p className="text-[var(--navy-600)]">
                    View the complete calendar of upcoming ASP suspensions and holidays.
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
                    Complete guide to all NYC parking regulations, meters, and restrictions.
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
                    Learn about special parking rules during NYC snow emergencies.
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
                    Get answers to common questions about ASP and CityPing.
                  </p>
                </Link>
              </div>
            </section>

            {/* CTA Footer */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Stop Worrying About ASP Tickets
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                Join 1,000+ NYC drivers who never miss an ASP suspension
              </p>
              <Link
                href="/"
                className="inline-block px-8 py-4 bg-white text-[var(--navy-800)] rounded-md hover:bg-blue-50 transition-colors font-semibold text-lg"
              >
                Get Free Alerts
              </Link>
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
