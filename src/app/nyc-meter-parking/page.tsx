// src/app/nyc-meter-parking/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs, RelatedArticles } from '@/components/seo/RelatedArticles'
import { SEOFooter } from '@/components/seo/SEOFooter'

export const metadata: Metadata = {
  title: 'NYC Parking Meter Rules 2025: Hours, Rates & Payment Apps',
  description: 'Complete guide to NYC parking meters: hours of operation, rates by borough, payment apps, and how to avoid meter tickets. Updated for 2025.',
  keywords: [
    'NYC parking meter',
    'NYC meter parking rules',
    'parking meter hours NYC',
    'NYC parking rates',
    'ParkNYC app',
    'parking meter payment NYC',
    'NYC meter ticket'
  ],
  openGraph: {
    title: 'NYC Parking Meter Rules 2025',
    description: 'Everything you need to know about NYC parking meters: hours, rates, apps, and avoiding tickets.',
    url: 'https://cityping.net/nyc-meter-parking',
    type: 'article',
  },
  alternates: {
    canonical: 'https://cityping.net/nyc-meter-parking',
  },
}

export default function NYCMeterParking() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NYC Parking Meter Rules 2025: Complete Guide",
    "description": "Complete guide to NYC parking meters including hours, rates, payment methods, and strategies for avoiding tickets.",
    "author": {
      "@type": "Organization",
      "name": "CityPing"
    },
    "publisher": {
      "@type": "Organization",
      "name": "CityPing"
    },
    "datePublished": "2025-01-01",
    "dateModified": new Date().toISOString().split('T')[0]
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What time do parking meters start in NYC?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Most NYC parking meters operate Monday-Saturday from 7 AM to 10 PM. Some commercial areas have meters active earlier (6 AM) or later (midnight). Always check the specific signage at your meter."
        }
      },
      {
        "@type": "Question",
        "name": "How much does meter parking cost in NYC?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NYC parking meter rates vary by location: Manhattan below 86th St ranges from $3.50-$7.50/hour, Manhattan above 86th St is $2.00-$3.50/hour, and outer boroughs typically range from $1.50-$2.50/hour."
        }
      },
      {
        "@type": "Question",
        "name": "Are NYC parking meters free on Sunday?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Most NYC parking meters are free on Sundays. However, some high-traffic areas in Manhattan have meters active 7 days a week. Always verify by checking the posted signs and meter display."
        }
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
            <Breadcrumbs items={[
              { name: 'Home', href: '/' },
              { name: 'Parking Guides', href: '/nyc-parking-rules' },
              { name: 'Meter Parking' }
            ]} />

            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              NYC Parking Meter Guide: Rules, Rates & Apps (2025)
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              NYC has over 85,000 parking meters generating $300+ million annually. Understanding how they work saves you from the $65+ tickets that catch thousands of drivers daily.
            </p>

            {/* Quick Facts */}
            <div className="grid md:grid-cols-3 gap-4 mb-12">
              <div className="bg-[var(--navy-50)] rounded-lg p-6 text-center">
                <p className="text-3xl font-bold text-[var(--navy-900)]">85,000+</p>
                <p className="text-sm text-[var(--navy-600)]">Parking meters citywide</p>
              </div>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 text-center">
                <p className="text-3xl font-bold text-[var(--navy-900)]">$1.50-$7.50</p>
                <p className="text-sm text-[var(--navy-600)]">Per hour (varies by zone)</p>
              </div>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 text-center">
                <p className="text-3xl font-bold text-[var(--navy-900)]">$65</p>
                <p className="text-sm text-[var(--navy-600)]">Expired meter ticket</p>
              </div>
            </div>

            {/* Hours of Operation */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Meter Hours of Operation
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-6 leading-relaxed">
                NYC parking meters don't all follow the same schedule. Here's the general pattern:
              </p>

              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse border border-[var(--navy-200)]">
                  <thead>
                    <tr className="bg-[var(--navy-100)]">
                      <th className="border border-[var(--navy-200)] p-3 text-left">Area Type</th>
                      <th className="border border-[var(--navy-200)] p-3 text-center">Days</th>
                      <th className="border border-[var(--navy-200)] p-3 text-center">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Standard (most areas)</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">Mon-Sat</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">7 AM - 10 PM</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-200)] p-3">Commercial districts</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">Mon-Sat</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">7 AM - Midnight</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">High-traffic Manhattan</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">7 Days</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">Varies (24/7 in some)</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-200)] p-3">Outer borough residential</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">Mon-Sat</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">8 AM - 7 PM</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
                <h3 className="font-bold text-[var(--navy-800)] mb-2">Always Check the Sign</h3>
                <p className="text-[var(--navy-700)]">
                  The hours displayed on the meter or Muni-Meter are the official times. Don't assume based on location—some blocks have different rules than neighboring streets.
                </p>
              </div>
            </section>

            {/* Rates by Area */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Parking Meter Rates by Area
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-6 leading-relaxed">
                NYC uses demand-based pricing—rates are higher in congested areas. Here's the current rate structure:
              </p>

              <div className="space-y-4">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-[var(--navy-800)]">Manhattan (Below 86th St)</h3>
                    <span className="text-2xl font-bold text-[var(--navy-900)]">$3.50 - $7.50/hr</span>
                  </div>
                  <p className="text-[var(--navy-600)]">
                    Highest rates citywide. Times Square area can reach $7.50/hour. 1-2 hour limits common.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-[var(--navy-800)]">Manhattan (Above 86th St)</h3>
                    <span className="text-2xl font-bold text-[var(--navy-900)]">$2.00 - $3.50/hr</span>
                  </div>
                  <p className="text-[var(--navy-600)]">
                    More affordable uptown. Washington Heights and Inwood at the lower end.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-[var(--navy-800)]">Brooklyn & Queens (Commercial)</h3>
                    <span className="text-2xl font-bold text-[var(--navy-900)]">$1.50 - $2.50/hr</span>
                  </div>
                  <p className="text-[var(--navy-600)]">
                    Downtown Brooklyn and LIC trending higher. Most neighborhoods at $1.50-$2.00.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-[var(--navy-800)]">Bronx & Staten Island</h3>
                    <span className="text-2xl font-bold text-[var(--navy-900)]">$1.00 - $2.00/hr</span>
                  </div>
                  <p className="text-[var(--navy-600)]">
                    Generally the lowest rates. Some areas still at $1.00/hour.
                  </p>
                </div>
              </div>
            </section>

            {/* Payment Methods */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                How to Pay for Meter Parking
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-[var(--navy-50)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">At the Meter</h3>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li><strong>Credit/Debit Card:</strong> Most Muni-Meters accept cards</li>
                    <li><strong>Coins:</strong> Quarters accepted at all meters</li>
                    <li><strong>NYC Parking Card:</strong> Prepaid cards available at stores</li>
                  </ul>
                </div>

                <div className="bg-[var(--navy-50)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Mobile Payment</h3>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li><strong>ParkNYC App:</strong> Official NYC app (iOS/Android)</li>
                    <li><strong>ParkMobile:</strong> Also accepted at NYC meters</li>
                    <li><strong>PayByPhone:</strong> Alternative mobile option</li>
                  </ul>
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-6">
                <h3 className="font-bold text-[var(--navy-800)] mb-2">Why Use the ParkNYC App?</h3>
                <ul className="text-[var(--navy-700)] space-y-1">
                  <li>• <strong>Extend time remotely:</strong> Add time without returning to car (up to max limit)</li>
                  <li>• <strong>Expiration alerts:</strong> Get notifications before your time runs out</li>
                  <li>• <strong>Receipt history:</strong> Easy tracking for expenses</li>
                  <li>• <strong>Zone lookup:</strong> See rates before you park</li>
                </ul>
              </div>
            </section>

            {/* Time Limits */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Meter Time Limits
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4">
                Even with unlimited money, you can't stay at a meter forever. Time limits are strictly enforced:
              </p>

              <div className="bg-[var(--navy-50)] rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-[var(--navy-800)] mb-3">Common Time Limits</h3>
                <ul className="space-y-2 text-[var(--navy-700)]">
                  <li><strong>1 hour:</strong> High-turnover commercial areas (Midtown, retail zones)</li>
                  <li><strong>2 hours:</strong> Most common limit citywide</li>
                  <li><strong>4 hours:</strong> Some outer borough areas</li>
                  <li><strong>10 hours:</strong> Rare, usually near transit hubs</li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-6">
                <h3 className="font-bold text-[var(--navy-800)] mb-2">No "Meter Feeding"</h3>
                <p className="text-[var(--navy-700)]">
                  Adding more time when your limit expires is illegal. Enforcement officers can issue tickets if your car exceeds the posted time limit, even with a valid receipt. You must move your car to a different block.
                </p>
              </div>
            </section>

            {/* Tickets & Violations */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Meter Parking Tickets & Fines
              </h2>

              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse border border-[var(--navy-200)]">
                  <thead>
                    <tr className="bg-[var(--navy-100)]">
                      <th className="border border-[var(--navy-200)] p-3 text-left">Violation</th>
                      <th className="border border-[var(--navy-200)] p-3 text-center">Fine</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Expired meter</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center font-semibold">$65</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-200)] p-3">No receipt displayed (Muni-Meter zone)</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center font-semibold">$65</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Overtime meter (exceeding time limit)</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center font-semibold">$65</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-200)] p-3">Feeding meter (extending beyond limit)</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center font-semibold">$65</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-[var(--navy-600)]">
                Fines increase if not paid within 30 days. Multiple unpaid tickets can lead to vehicle booting or towing.
              </p>
            </section>

            {/* Pro Tips */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Money-Saving Tips
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[var(--navy-50)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Time Your Arrival</h3>
                  <p className="text-[var(--navy-700)]">
                    Arrive after 7 PM on Saturdays or anytime Sunday (in most areas) for free parking. Meters in residential areas often end at 7 PM on weekdays too.
                  </p>
                </div>

                <div className="bg-[var(--navy-50)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Check One Block Over</h3>
                  <p className="text-[var(--navy-700)]">
                    Meter rates can vary significantly between adjacent blocks. Commercial strips charge more than side streets just 50 feet away.
                  </p>
                </div>

                <div className="bg-[var(--navy-50)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Use the App for Alerts</h3>
                  <p className="text-[var(--navy-700)]">
                    ParkNYC sends expiration warnings 10 minutes before time runs out. This alone prevents most meter tickets.
                  </p>
                </div>

                <div className="bg-[var(--navy-50)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Know Holiday Rules</h3>
                  <p className="text-[var(--navy-700)]">
                    Meters are suspended on major holidays. Check our <Link href="/asp-suspension-calendar" className="text-blue-600 hover:underline">ASP Calendar</Link>—meter suspensions often align with ASP suspensions.
                  </p>
                </div>
              </div>
            </section>

            {/* CityPing CTA */}
            <section className="mb-12">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
                <h2 className="text-2xl font-bold text-[var(--navy-900)] mb-4">
                  Complete Parking Intelligence
                </h2>
                <p className="text-lg text-[var(--navy-700)] mb-6">
                  CityPing helps NYC drivers navigate all parking rules—not just meters. Get alerts for:
                </p>
                <ul className="space-y-3 text-lg text-[var(--navy-700)] mb-6">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>ASP suspension days (when you don't need to move)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Holiday parking rule changes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Snow emergency declarations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Congestion pricing updates</span>
                  </li>
                </ul>
                <Link
                  href="/"
                  className="inline-block px-8 py-4 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold text-lg"
                >
                  Get Free Parking Alerts
                </Link>
              </div>
            </section>

            {/* FAQ */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-6">
                Frequently Asked Questions
              </h2>

              <div className="space-y-6">
                <div className="border-b border-[var(--navy-200)] pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    What time do parking meters start in NYC?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Most NYC parking meters start at 7 AM Monday through Saturday. Some commercial areas start at 6 AM. Always check the signage—hours vary by location.
                  </p>
                </div>

                <div className="border-b border-[var(--navy-200)] pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    Are NYC parking meters free on Sundays?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Most NYC parking meters are free on Sundays. However, some high-traffic areas in Manhattan (like Times Square and the Theater District) have meters active 7 days a week. Verify with posted signage.
                  </p>
                </div>

                <div className="border-b border-[var(--navy-200)] pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    Can I pay for NYC parking with my phone?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Yes. The official ParkNYC app works at all metered spaces citywide. ParkMobile and PayByPhone are also accepted. Look for the zone number on the meter to enter in the app.
                  </p>
                </div>

                <div className="pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    What happens if I overstay my meter time limit?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    You'll receive a $65 overtime meter ticket. Even if you add more money, exceeding the posted time limit (usually 1-2 hours) is a violation. You must move your car to a different block.
                  </p>
                </div>
              </div>
            </section>

            {/* Related Articles */}
            <RelatedArticles
              currentPage="nyc-meter-parking"
              title="Related Parking Guides"
            />

            {/* CTA Footer */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Park Smarter in NYC
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                Get daily alerts on parking rules and suspensions
              </p>
              <Link
                href="/"
                className="inline-block px-8 py-4 bg-white text-[var(--navy-800)] rounded-md hover:bg-blue-50 transition-colors font-semibold text-lg"
              >
                Sign Up Free
              </Link>
            </section>
          </article>
        </main>

        <SEOFooter />
      </div>
    </>
  )
}
