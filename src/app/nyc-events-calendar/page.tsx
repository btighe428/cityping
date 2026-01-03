import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NYC Events Calendar 2025 - Things to Do in New York City',
  description: 'Discover the best NYC events: Restaurant Week, Open House NY, sample sales, free museum days, and more. Your insider guide to what\'s happening in New York City.',
  keywords: [
    'NYC events',
    'things to do in NYC',
    'NYC events calendar',
    'what to do in New York',
    'NYC free events',
    'NYC Restaurant Week',
    'Open House New York',
    'NYC sample sales',
    'NYC museum free days',
    'events in NYC this week',
    'NYC events today',
    'New York City events'
  ],
  openGraph: {
    title: 'NYC Events Calendar 2025 - Things to Do in New York City',
    description: 'Discover the best NYC events: Restaurant Week, Open House NY, sample sales, and more. Your insider guide to NYC.',
    url: 'https://cityping.net/nyc-events-calendar',
    type: 'article',
  },
  alternates: {
    canonical: 'https://cityping.net/nyc-events-calendar',
  },
}

export default function NYCEventsCalendar() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NYC Events Calendar 2025 - Things to Do in New York City",
    "description": "Comprehensive guide to NYC events including Restaurant Week, Open House NY, sample sales, free museum days, and seasonal highlights.",
    "author": {
      "@type": "Organization",
      "name": "NYC CityPing"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NYC CityPing",
      "logo": {
        "@type": "ImageObject",
        "url": "https://cityping.net/logo.png"
      }
    },
    "datePublished": "2025-01-01",
    "dateModified": new Date().toISOString().split('T')[0],
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://cityping.net/nyc-events-calendar"
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
        "name": "NYC Events Calendar",
        "item": "https://cityping.net/nyc-events-calendar"
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
              NYC CityPing
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors"
            >
              Get Event Alerts
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
              <span>NYC Events Calendar</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              NYC Events Calendar: Your Insider Guide (2025)
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              New York City hosts thousands of events every year - from iconic institutions like Restaurant Week to hidden gem sample sales that locals guard jealously. This guide covers the events that matter, when they happen, and how to never miss a registration deadline.
            </p>

            {/* Quick Navigation */}
            <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-12">
              <h2 className="text-lg font-bold text-[var(--navy-900)] mb-4">Annual NYC Events</h2>
              <ul className="grid md:grid-cols-2 gap-2">
                <li><a href="#restaurant-week" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">NYC Restaurant Week</a></li>
                <li><a href="#open-house" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Open House New York</a></li>
                <li><a href="#sample-sales" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Sample Sales</a></li>
                <li><a href="#museum-days" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Free Museum Days</a></li>
                <li><a href="#broadway-week" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Broadway Week</a></li>
                <li><a href="#seasonal" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Seasonal Highlights</a></li>
              </ul>
            </div>

            {/* Restaurant Week */}
            <section id="restaurant-week" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                NYC Restaurant Week
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Launched in 1992, NYC Restaurant Week has become one of the city's most anticipated culinary events. Top restaurants offer prix-fixe menus at significant discounts - typically $30 lunch / $45 dinner at establishments that normally charge $100+.
              </p>

              <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Key Details</h3>
                <ul className="space-y-2 text-[var(--navy-700)]">
                  <li><strong>When:</strong> Twice yearly - Winter (Jan-Feb) and Summer (Jul-Aug)</li>
                  <li><strong>Duration:</strong> ~3 weeks each session</li>
                  <li><strong>What:</strong> Prix-fixe lunch and dinner menus</li>
                  <li><strong>Where:</strong> 400+ participating restaurants citywide</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Insider Tip:</p>
                <p className="text-[var(--navy-700)]">
                  Reservations open before Restaurant Week starts. The most popular restaurants (Gramercy Tavern, Le Bernardin, etc.) book out within hours. Set a reminder for reservation opening day.
                </p>
              </div>
            </section>

            {/* Open House NY */}
            <section id="open-house" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Open House New York (OHNY)
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                One weekend per year, over 250 sites across NYC open their doors to the public - many for the only time all year. From private penthouses to infrastructure facilities, OHNY offers access to spaces you'd never otherwise see.
              </p>

              <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Notable Sites (Past Years)</h3>
                <ul className="grid md:grid-cols-2 gap-2 text-[var(--navy-700)]">
                  <li>• Federal Reserve Gold Vault</li>
                  <li>• Governor's Island</li>
                  <li>• Private Williamsburg lofts</li>
                  <li>• MTA subway control center</li>
                  <li>• Steinway Piano Factory</li>
                  <li>• Water treatment plants</li>
                  <li>• Historic private clubs</li>
                  <li>• Architectural landmarks</li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Critical Warning:</p>
                <p className="text-[var(--navy-700)]">
                  Popular sites require advance registration that opens ~2 weeks before the event. The most in-demand locations (Federal Reserve, etc.) fill within minutes. Registration usually opens at 10am on a specific day - last year it crashed from demand.
                </p>
              </div>
            </section>

            {/* Sample Sales */}
            <section id="sample-sales" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                NYC Sample Sales
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Fashion brands sell excess inventory at 50-80% off retail through sample sales. These aren't regular sales - they're warehouse events where you might find a $2,000 jacket for $200. NYC is the global capital of sample sales.
              </p>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Major Sample Sale Categories
              </h3>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="font-semibold text-[var(--navy-800)] mb-2">High Fashion</h4>
                  <p className="text-[var(--navy-700)] text-sm">
                    Theory, Helmut Lang, Rag & Bone, Vince, Equipment - usually twice yearly
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="font-semibold text-[var(--navy-800)] mb-2">Activewear</h4>
                  <p className="text-[var(--navy-700)] text-sm">
                    Lululemon, Outdoor Voices, Nike - often seasonal
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="font-semibold text-[var(--navy-800)] mb-2">Home & Kitchen</h4>
                  <p className="text-[var(--navy-700)] text-sm">
                    Le Creuset, All-Clad, Williams Sonoma warehouse events
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="font-semibold text-[var(--navy-800)] mb-2">Beauty</h4>
                  <p className="text-[var(--navy-700)] text-sm">
                    Glossier, Drunk Elephant, various beauty brand events
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">How NYC CityPing Helps:</p>
                <p className="text-[var(--navy-700)]">
                  We track upcoming sample sales and include them in your weekly digest. Get notified before sales start - early bird access often has the best selection.
                </p>
              </div>
            </section>

            {/* Free Museum Days */}
            <section id="museum-days" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Free Museum Days & Pay-What-You-Wish
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                NYC's world-class museums offer regular free admission windows. Some are truly free; others are "suggested donation" (you can pay $1 and get full access).
              </p>

              <div className="overflow-x-auto mb-8">
                <table className="w-full border-collapse border border-[var(--navy-200)]">
                  <thead>
                    <tr className="bg-[var(--navy-50)]">
                      <th className="border border-[var(--navy-200)] p-3 text-left">Museum</th>
                      <th className="border border-[var(--navy-200)] p-3 text-left">Free/PWYW</th>
                      <th className="border border-[var(--navy-200)] p-3 text-left">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">MoMA</td>
                      <td className="border border-[var(--navy-200)] p-3">Free</td>
                      <td className="border border-[var(--navy-200)] p-3">Fridays 5:30-9pm</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Met Museum</td>
                      <td className="border border-[var(--navy-200)] p-3">PWYW for NY residents</td>
                      <td className="border border-[var(--navy-200)] p-3">Always (show ID)</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Whitney Museum</td>
                      <td className="border border-[var(--navy-200)] p-3">PWYW</td>
                      <td className="border border-[var(--navy-200)] p-3">Fridays 7-10pm</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Brooklyn Museum</td>
                      <td className="border border-[var(--navy-200)] p-3">PWYW</td>
                      <td className="border border-[var(--navy-200)] p-3">First Saturdays 5-11pm</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Guggenheim</td>
                      <td className="border border-[var(--navy-200)] p-3">PWYW</td>
                      <td className="border border-[var(--navy-200)] p-3">Saturdays 4-6pm</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3">Natural History</td>
                      <td className="border border-[var(--navy-200)] p-3">PWYW for NY residents</td>
                      <td className="border border-[var(--navy-200)] p-3">Always (show ID)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Broadway Week */}
            <section id="broadway-week" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Broadway Week & NYC Must-See Week
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Twice yearly, Broadway shows offer 2-for-1 tickets - effectively 50% off. NYC Must-See Week extends similar deals to attractions, tours, and experiences.
              </p>

              <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Timing</h3>
                <ul className="space-y-2 text-[var(--navy-700)]">
                  <li><strong>Broadway Week:</strong> January and September (typically 2 weeks each)</li>
                  <li><strong>Off-Broadway Week:</strong> February and October</li>
                  <li><strong>NYC Must-See Week:</strong> Often concurrent with Broadway Week</li>
                </ul>
              </div>

              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Tickets go fast for popular shows. Less popular shows often extend the deal beyond the official week.
              </p>
            </section>

            {/* Seasonal */}
            <section id="seasonal" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Seasonal NYC Highlights
              </h2>

              <div className="space-y-6">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
                  <h3 className="font-semibold text-[var(--navy-800)] mb-2">Spring (Mar-May)</h3>
                  <p className="text-[var(--navy-700)]">
                    Cherry blossoms in Central Park & Brooklyn Botanic Garden, Tribeca Film Festival, Sakura Matsuri, Five Boro Bike Tour, Frieze Art Fair
                  </p>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
                  <h3 className="font-semibold text-[var(--navy-800)] mb-2">Summer (Jun-Aug)</h3>
                  <p className="text-[var(--navy-700)]">
                    Shakespeare in the Park (free!), SummerStage concerts, Governors Island season, Rooftop bars peak, Restaurant Week Summer, NYC Pride
                  </p>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-500 p-6">
                  <h3 className="font-semibold text-[var(--navy-800)] mb-2">Fall (Sep-Nov)</h3>
                  <p className="text-[var(--navy-700)]">
                    NYC Marathon, Open House NY, NYFF at Lincoln Center, Halloween parades, Broadway Week Fall, foliage in Central Park
                  </p>
                </div>

                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6">
                  <h3 className="font-semibold text-[var(--navy-800)] mb-2">Winter (Dec-Feb)</h3>
                  <p className="text-[var(--navy-700)]">
                    Holiday markets (Union Square, Columbus Circle), Rockefeller tree, Restaurant Week Winter, Broadway Week Winter, Winter Jazzfest
                  </p>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="mb-12">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
                <h3 className="text-2xl font-semibold text-[var(--navy-900)] mb-4">
                  Never Miss Another NYC Event
                </h3>
                <p className="text-lg text-[var(--navy-700)] mb-4">
                  NYC CityPing delivers a curated weekly digest of events that matter, plus daily briefings covering everything from transit to parking to housing lotteries.
                </p>
                <ul className="space-y-2 text-lg text-[var(--navy-700)] mb-6">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Sample sales before they sell out</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Registration deadlines (OHNY, marathons, etc.)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Free events and PWYW opportunities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Curated picks - not overwhelming event spam</span>
                  </li>
                </ul>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold"
                >
                  Get Your Free Weekly Digest
                </Link>
              </div>
            </section>

            {/* CTA Footer */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Live Like a Local, Not a Tourist
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                60 seconds every morning. Know what's happening in your city.
              </p>
              <Link
                href="/"
                className="inline-block px-8 py-4 bg-white text-[var(--navy-800)] rounded-md hover:bg-blue-50 transition-colors font-semibold text-lg"
              >
                Get Free Daily Briefings
              </Link>
            </section>
          </article>
        </main>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-[var(--navy-100)] mt-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-[var(--navy-800)] mb-3">NYC CityPing</h3>
                <p className="text-sm text-[var(--navy-600)]">
                  Your daily NYC intelligence briefing.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-[var(--navy-800)] mb-3">Guides</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/nyc-events-calendar" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Events Calendar</Link></li>
                  <li><Link href="/nyc-housing-lottery" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Housing Lottery</Link></li>
                  <li><Link href="/nyc-subway-alerts" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Subway Alerts</Link></li>
                  <li><Link href="/nyc-alternate-side-parking-guide" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Parking Guide</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-[var(--navy-800)] mb-3">Support</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/faq" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">FAQ</Link></li>
                  <li><a href="mailto:hello@cityping.net" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Contact</a></li>
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
