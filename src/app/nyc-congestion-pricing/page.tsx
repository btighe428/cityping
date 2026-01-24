// src/app/nyc-congestion-pricing/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs, RelatedArticles } from '@/components/seo/RelatedArticles'
import { SEOFooter } from '@/components/seo/SEOFooter'

export const metadata: Metadata = {
  title: 'NYC Congestion Pricing Guide 2025: Tolls, Exemptions & Savings',
  description: 'Complete guide to NYC congestion pricing starting January 2025. Learn toll costs, exemptions, peak hours, and how to save money on Manhattan driving fees.',
  keywords: [
    'NYC congestion pricing',
    'Manhattan congestion toll',
    'NYC driving toll 2025',
    'congestion pricing exemptions',
    'central business district toll',
    'MTA congestion fee',
    'NYC traffic toll zone'
  ],
  openGraph: {
    title: 'NYC Congestion Pricing Guide 2025',
    description: 'Everything you need to know about NYC congestion pricing: tolls, exemptions, peak hours, and money-saving strategies.',
    url: 'https://cityping.net/nyc-congestion-pricing',
    type: 'article',
  },
  alternates: {
    canonical: 'https://cityping.net/nyc-congestion-pricing',
  },
}

export default function NYCCongestionPricing() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NYC Congestion Pricing Guide 2025: Everything You Need to Know",
    "description": "Complete guide to NYC congestion pricing including toll costs, exemptions, peak hours, and savings strategies.",
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
    "dateModified": new Date().toISOString().split('T')[0]
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How much is the NYC congestion pricing toll?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The standard toll is $9 for passenger vehicles during peak hours (5am-9pm weekdays, 9am-9pm weekends). Off-peak hours cost $2.25. Trucks pay $14.40-$21.60 depending on size."
        }
      },
      {
        "@type": "Question",
        "name": "Who is exempt from NYC congestion pricing?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Emergency vehicles, buses, vehicles carrying disabled passengers with proper placards, and certain low-income drivers who qualify for the Low-Income Discount are exempt or receive discounts."
        }
      },
      {
        "@type": "Question",
        "name": "When does NYC congestion pricing start?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NYC congestion pricing began on January 5, 2025 at 12:01 AM, making it the first congestion pricing program in the United States."
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
              { name: 'Driving Guides', href: '/nyc-parking-rules' },
              { name: 'Congestion Pricing' }
            ]} />

            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              NYC Congestion Pricing: Complete 2025 Guide
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              As of January 5, 2025, New York City has implemented the nation's first congestion pricing program. This guide covers everything you need to know about tolls, exemptions, and strategies for minimizing costs.
            </p>

            {/* Toll Summary */}
            <div className="bg-[var(--navy-800)] text-white rounded-lg p-8 mb-12">
              <h2 className="text-2xl font-bold mb-6">At a Glance: Toll Rates</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-blue-200 mb-2">Peak Hours</h3>
                  <p className="text-sm text-gray-300 mb-2">5am-9pm weekdays, 9am-9pm weekends</p>
                  <p className="text-4xl font-bold">$9.00</p>
                  <p className="text-sm text-gray-300">Passenger vehicles (E-ZPass)</p>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-200 mb-2">Off-Peak Hours</h3>
                  <p className="text-sm text-gray-300 mb-2">9pm-5am daily</p>
                  <p className="text-4xl font-bold">$2.25</p>
                  <p className="text-sm text-gray-300">Passenger vehicles (E-ZPass)</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-4">* Tolls by mail (no E-ZPass) cost 50% more</p>
            </div>

            {/* What is Congestion Pricing */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                What is Congestion Pricing?
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Congestion pricing is a traffic management strategy that charges drivers a toll to enter a designated zone during high-traffic periods. NYC's program targets the Central Business District (CBD) of Manhattan—the area south of and including 60th Street.
              </p>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                The program aims to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-lg text-[var(--navy-700)]">
                <li><strong>Reduce traffic congestion</strong> by 10-20% in the zone</li>
                <li><strong>Generate $1 billion annually</strong> for MTA capital improvements</li>
                <li><strong>Improve air quality</strong> by reducing vehicle emissions</li>
                <li><strong>Encourage public transit use</strong> for trips into Manhattan</li>
              </ul>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Historical Context</p>
                <p className="text-[var(--navy-700)]">
                  NYC joins London (2003), Stockholm (2006), Singapore (1975), and Milan (2012) in implementing congestion pricing. London's program reduced central traffic by 15% and generates over £200 million annually for transit investment. NYC's program is expected to be the largest by revenue in the world.
                </p>
              </div>
            </section>

            {/* Zone Details */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Where Does It Apply?
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                The congestion pricing zone covers Manhattan's Central Business District:
              </p>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-[var(--navy-800)] mb-3">Zone Boundaries</h3>
                <ul className="space-y-2 text-[var(--navy-700)]">
                  <li><strong>North boundary:</strong> 60th Street (inclusive)</li>
                  <li><strong>South boundary:</strong> Battery Park</li>
                  <li><strong>East boundary:</strong> FDR Drive (excluded)</li>
                  <li><strong>West boundary:</strong> West Side Highway/Route 9A (excluded)</li>
                </ul>
              </div>
              <div className="bg-green-50 border-l-4 border-green-500 p-6 my-6">
                <h3 className="font-semibold text-[var(--navy-800)] mb-2">Through-Traffic Note</h3>
                <p className="text-[var(--navy-700)]">
                  If you're driving on the FDR Drive, West Side Highway, or through the Hugh L. Carey Tunnel without exiting into the CBD, you are NOT charged. The toll only applies when entering Manhattan streets within the zone.
                </p>
              </div>
            </section>

            {/* Rate Structure */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Complete Rate Structure
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-[var(--navy-200)] mb-6">
                  <thead>
                    <tr className="bg-[var(--navy-100)]">
                      <th className="border border-[var(--navy-200)] p-3 text-left">Vehicle Type</th>
                      <th className="border border-[var(--navy-200)] p-3 text-center">Peak (E-ZPass)</th>
                      <th className="border border-[var(--navy-200)] p-3 text-center">Off-Peak (E-ZPass)</th>
                      <th className="border border-[var(--navy-200)] p-3 text-center">Toll by Mail</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Passenger vehicle</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center font-semibold">$9.00</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">$2.25</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">$13.50</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-200)] p-3">Small truck (2 axles)</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center font-semibold">$14.40</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">$3.60</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">$21.60</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Large truck (3+ axles)</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center font-semibold">$21.60</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">$5.40</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">$32.40</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-200)] p-3">Motorcycles</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center font-semibold">$4.50</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">$1.15</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">$6.75</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Taxis/FHV (per trip)</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center font-semibold">$1.25</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">$0.75</td>
                      <td className="border border-[var(--navy-200)] p-3 text-center">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-[var(--navy-600)]">
                * Vehicles entering via tunnels/bridges with existing tolls receive crossing credits that reduce the congestion toll.
              </p>
            </section>

            {/* Exemptions and Discounts */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Exemptions and Discounts
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-bold text-green-800 mb-3">Fully Exempt</h3>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>• Emergency vehicles (fire, police, ambulance)</li>
                    <li>• Transit buses</li>
                    <li>• Specialized government vehicles</li>
                    <li>• Vehicles with disabled parking permits (subject to limits)</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="font-bold text-yellow-800 mb-3">Discount Programs</h3>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>• <strong>Low-Income Discount:</strong> 50% off for qualifying residents</li>
                    <li>• <strong>Clean vehicle credit:</strong> Reduced rates for EVs</li>
                    <li>• <strong>Crossing credits:</strong> Partial offset for tunnel/bridge tolls</li>
                  </ul>
                </div>
              </div>

              <div className="bg-[var(--navy-50)] rounded-lg p-6">
                <h3 className="font-semibold text-[var(--navy-800)] mb-3">How to Apply for Low-Income Discount</h3>
                <ol className="list-decimal list-inside space-y-2 text-[var(--navy-700)]">
                  <li>Visit <a href="https://new.mta.info" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">new.mta.info</a></li>
                  <li>Create an E-ZPass NY account if you don't have one</li>
                  <li>Submit proof of income (tax returns or benefit eligibility)</li>
                  <li>Residents earning under ~$50,000/year typically qualify</li>
                </ol>
              </div>
            </section>

            {/* Money-Saving Strategies */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Strategies to Minimize Costs
              </h2>

              <div className="space-y-4">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">1. Travel Off-Peak</h3>
                  <p className="text-[var(--navy-700)]">
                    The overnight rate ($2.25) is 75% cheaper than peak hours. If your schedule allows, shift trips to before 5am or after 9pm weekdays.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">2. Get E-ZPass</h3>
                  <p className="text-[var(--navy-700)]">
                    Toll by mail costs 50% more than E-ZPass. The tag is free and saves you $4.50 per peak-hour trip.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">3. Use Park & Ride</h3>
                  <p className="text-[var(--navy-700)]">
                    Park outside the zone (Secaucus, Jamaica, etc.) and take transit into Manhattan. Often cheaper than driving + parking + tolls.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">4. Consolidate Trips</h3>
                  <p className="text-[var(--navy-700)]">
                    The toll is charged once per day. Multiple entries within a calendar day incur only one charge.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">5. Consider Alternatives</h3>
                  <p className="text-[var(--navy-700)]">
                    For regular commuters, a monthly unlimited MetroCard ($132) may be cheaper than 15+ driving days at $9 each plus parking.
                  </p>
                </div>
              </div>
            </section>

            {/* Annual Cost Analysis */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Annual Cost Analysis
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4">
                Understanding the long-term financial impact is crucial for investment-minded drivers:
              </p>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 mb-6">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-[var(--navy-200)]">
                      <td className="py-3 text-[var(--navy-700)]">Daily commuter (250 days/year at peak)</td>
                      <td className="py-3 text-right font-semibold text-[var(--navy-900)]">$2,250/year</td>
                    </tr>
                    <tr className="border-b border-[var(--navy-200)]">
                      <td className="py-3 text-[var(--navy-700)]">Weekly visitor (52 trips/year at peak)</td>
                      <td className="py-3 text-right font-semibold text-[var(--navy-900)]">$468/year</td>
                    </tr>
                    <tr className="border-b border-[var(--navy-200)]">
                      <td className="py-3 text-[var(--navy-700)]">Off-peak only (100 trips/year)</td>
                      <td className="py-3 text-right font-semibold text-[var(--navy-900)]">$225/year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[var(--navy-600)]">
                Invested at 7% annual return, the daily commuter's congestion toll cost over 10 years would compound to ~$31,000 in lost wealth creation. This makes transit alternatives increasingly attractive from a financial planning perspective.
              </p>
            </section>

            {/* Stay Informed */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Stay Informed
              </h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
                <p className="text-lg text-[var(--navy-700)] mb-6">
                  CityPing keeps NYC drivers informed about all transportation changes. Get daily alerts covering:
                </p>
                <ul className="space-y-3 text-lg text-[var(--navy-700)] mb-6">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Congestion pricing updates and policy changes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>ASP suspension alerts (avoid parking tickets)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>MTA subway service alerts for transit planning</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Weather-based driving advisories</span>
                  </li>
                </ul>
                <Link
                  href="/"
                  className="inline-block px-8 py-4 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold text-lg"
                >
                  Get Free NYC Alerts
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
                    How much is the NYC congestion pricing toll?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    The standard toll is $9 for passenger vehicles during peak hours (5am-9pm weekdays, 9am-9pm weekends) with E-ZPass. Off-peak hours (9pm-5am) cost $2.25. Toll by mail is 50% higher.
                  </p>
                </div>

                <div className="border-b border-[var(--navy-200)] pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    Who is exempt from NYC congestion pricing?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Emergency vehicles, transit buses, and certain government vehicles are fully exempt. Vehicles with disabled parking permits receive exemptions with limits. Low-income drivers can apply for a 50% discount.
                  </p>
                </div>

                <div className="border-b border-[var(--navy-200)] pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    Do I get charged multiple times per day?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    No. You are only charged once per calendar day, regardless of how many times you enter or exit the zone. However, different rate periods (peak vs. off-peak) may apply based on your first entry.
                  </p>
                </div>

                <div className="pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    Do Uber/Lyft passengers pay the congestion toll?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Yes, but indirectly. Taxis and for-hire vehicles pay a per-trip surcharge ($1.25 peak, $0.75 off-peak) that is typically passed on to passengers. This is lower than the full toll but still increases ride costs in the zone.
                  </p>
                </div>
              </div>
            </section>

            <RelatedArticles
              currentPage="nyc-congestion-pricing"
              title="Related Driving Guides"
            />

            {/* CTA Footer */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Navigate NYC Smarter
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                Get daily alerts on parking, transit, and city updates
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

        <SEOFooter />
      </div>
    </>
  )
}
