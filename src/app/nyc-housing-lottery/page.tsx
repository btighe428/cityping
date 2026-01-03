import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NYC Housing Lottery Guide 2025 - Affordable Apartments & Deadlines',
  description: 'Complete guide to NYC housing lottery: how to apply, income requirements, upcoming deadlines, and tips for winning affordable apartments through Housing Connect.',
  keywords: [
    'NYC housing lottery',
    'affordable housing NYC',
    'Housing Connect NYC',
    'NYC lottery apartments',
    'affordable apartments NYC',
    'NYC housing lottery deadlines',
    'how to win NYC housing lottery',
    'NYC affordable housing application',
    'NYC housing lottery income requirements',
    'New York City housing lottery'
  ],
  openGraph: {
    title: 'NYC Housing Lottery Guide 2025 - Affordable Apartments & Deadlines',
    description: 'Complete guide to NYC housing lottery: how to apply, income requirements, and tips for winning affordable apartments.',
    url: 'https://cityping.net/nyc-housing-lottery',
    type: 'article',
  },
  alternates: {
    canonical: 'https://cityping.net/nyc-housing-lottery',
  },
}

export default function NYCHousingLottery() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NYC Housing Lottery Guide 2025 - Affordable Apartments & Deadlines",
    "description": "Complete guide to NYC housing lottery: how to apply through Housing Connect, income requirements, and strategies for increasing your chances.",
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
      "@id": "https://cityping.net/nyc-housing-lottery"
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
        "name": "NYC Housing Lottery",
        "item": "https://cityping.net/nyc-housing-lottery"
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
              Get Deadline Alerts
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
              <span>NYC Housing Lottery</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              NYC Housing Lottery: Complete Guide (2025)
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              New York City's housing lottery offers below-market-rate apartments to qualifying residents. With rents 30-70% below market rate, understanding this system could save you hundreds of thousands of dollars over a decade. This guide covers everything you need to know.
            </p>

            {/* Quick Navigation */}
            <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-12">
              <h2 className="text-lg font-bold text-[var(--navy-900)] mb-4">Quick Navigation</h2>
              <ul className="space-y-2">
                <li><a href="#what-is-lottery" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">What is the NYC Housing Lottery?</a></li>
                <li><a href="#how-to-apply" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">How to Apply via Housing Connect</a></li>
                <li><a href="#income-requirements" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Income Requirements & AMI Bands</a></li>
                <li><a href="#increase-chances" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Strategies to Increase Your Chances</a></li>
                <li><a href="#common-mistakes" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Common Mistakes to Avoid</a></li>
                <li><a href="#never-miss" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Never Miss a Deadline</a></li>
              </ul>
            </div>

            {/* What is Lottery */}
            <section id="what-is-lottery" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                What is the NYC Housing Lottery?
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                The NYC housing lottery is a system for allocating affordable housing units developed under city programs. When developers receive tax incentives or zoning bonuses, they're required to set aside a percentage of units as "affordable" - rented at below-market rates to income-qualifying households.
              </p>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Applications are submitted through Housing Connect (NYC's official portal), and winners are selected randomly from the pool of eligible applicants - hence "lottery."
              </p>
              <div className="bg-green-50 border-l-4 border-green-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">The Financial Impact:</p>
                <p className="text-[var(--navy-700)]">
                  A 1-bedroom in a new Manhattan development might rent at $4,000/month market rate. The lottery unit in the same building could be $1,200-$1,800/month. That's $26,400-$33,600 saved per year - potentially $250,000+ over a decade (plus compound investment returns on those savings).
                </p>
              </div>
            </section>

            {/* How to Apply */}
            <section id="how-to-apply" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                How to Apply via Housing Connect
              </h2>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Step 1: Create Your Housing Connect Profile
              </h3>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Visit <a href="https://housingconnect.nyc.gov" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">housingconnect.nyc.gov</a> and create an account. You'll enter:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-6 text-lg text-[var(--navy-700)]">
                <li>Personal information (name, DOB, SSN)</li>
                <li>Household composition (everyone who will live in the unit)</li>
                <li>Current address and housing situation</li>
                <li>Annual household income</li>
                <li>Preferences (borough, accessibility needs, etc.)</li>
              </ul>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Step 2: Browse Available Lotteries
              </h3>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                New lotteries are posted regularly. Each listing shows:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-6 text-lg text-[var(--navy-700)]">
                <li>Building location and amenities</li>
                <li>Unit sizes available (studio, 1BR, 2BR, etc.)</li>
                <li>Income bands (AMI percentages)</li>
                <li>Monthly rent for each unit type</li>
                <li>Application deadline</li>
              </ul>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Step 3: Apply to Every Eligible Lottery
              </h3>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                This is critical: <strong>apply to every lottery you qualify for</strong>. Each application is independent - applying to more doesn't hurt your chances elsewhere, it only increases your overall odds.
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Pro Tip:</p>
                <p className="text-[var(--navy-700)]">
                  Set aside time each month to check Housing Connect for new lotteries. Deadlines are strict - missing by even one day disqualifies you. NYC CityPing sends deadline reminders so you never miss an opportunity.
                </p>
              </div>
            </section>

            {/* Income Requirements */}
            <section id="income-requirements" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Income Requirements & AMI Bands
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Eligibility is based on Area Median Income (AMI) - the middle income for the NYC metro area. Different units target different AMI percentages:
              </p>

              <div className="overflow-x-auto mb-8">
                <table className="w-full border-collapse border border-[var(--navy-200)]">
                  <thead>
                    <tr className="bg-[var(--navy-50)]">
                      <th className="border border-[var(--navy-200)] p-3 text-left">AMI Band</th>
                      <th className="border border-[var(--navy-200)] p-3 text-left">1 Person</th>
                      <th className="border border-[var(--navy-200)] p-3 text-left">2 People</th>
                      <th className="border border-[var(--navy-200)] p-3 text-left">3 People</th>
                      <th className="border border-[var(--navy-200)] p-3 text-left">4 People</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3 font-semibold">30% AMI</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $31,770</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $36,300</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $40,830</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $45,330</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3 font-semibold">50% AMI</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $52,950</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $60,500</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $68,050</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $75,550</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3 font-semibold">80% AMI</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $84,720</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $96,800</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $108,880</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $120,880</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3 font-semibold">130% AMI</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $137,670</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $157,300</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $176,930</td>
                      <td className="border border-[var(--navy-200)] p-3">$0 - $196,430</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-[var(--navy-600)] mb-6">
                *2024 AMI limits shown. Updated annually by HUD. Always verify current limits on Housing Connect.
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Important:</p>
                <p className="text-[var(--navy-700)]">
                  Income requirements include ALL household members 18+, not just the primary applicant. Include salary, freelance income, investments, alimony, child support, and any other regular income.
                </p>
              </div>
            </section>

            {/* Increase Chances */}
            <section id="increase-chances" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Strategies to Increase Your Chances
              </h2>

              <div className="space-y-6">
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    1. Apply to Everything You Qualify For
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Each lottery is independent. Volume matters. Some people apply to 50+ lotteries before winning. Treat it as a numbers game.
                  </p>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    2. Leverage Community Board Preference
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    50% of units go to applicants who live or work in the same Community Board as the building. If you're already in that CB, your odds improve significantly.
                  </p>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    3. Municipal Employee Preference
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    City employees (FDNY, NYPD, DOE, etc.) get preference for 5% of units in many buildings. If you're a city worker, always indicate this on your application.
                  </p>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    4. Mobility/Vision/Hearing Accommodations
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    A percentage of units are set aside for applicants needing accessible apartments. If this applies to anyone in your household, indicate it.
                  </p>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    5. Keep Your Profile Updated
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Income changes, household changes, address changes - update Housing Connect immediately. Outdated info can disqualify you during the verification stage.
                  </p>
                </div>
              </div>
            </section>

            {/* Common Mistakes */}
            <section id="common-mistakes" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Common Mistakes to Avoid
              </h2>

              <div className="space-y-4">
                <div className="bg-red-50 border-l-4 border-red-500 p-6">
                  <h3 className="font-semibold text-[var(--navy-800)] mb-2">Missing Deadlines</h3>
                  <p className="text-[var(--navy-700)]">
                    Lottery deadlines are strict. There's no grace period. Missing by one hour means you're out.
                  </p>
                </div>

                <div className="bg-red-50 border-l-4 border-red-500 p-6">
                  <h3 className="font-semibold text-[var(--navy-800)] mb-2">Underreporting Income</h3>
                  <p className="text-[var(--navy-700)]">
                    If selected, you'll need to provide tax returns, pay stubs, and bank statements. Discrepancies = disqualification.
                  </p>
                </div>

                <div className="bg-red-50 border-l-4 border-red-500 p-6">
                  <h3 className="font-semibold text-[var(--navy-800)] mb-2">Applying for Wrong Unit Size</h3>
                  <p className="text-[var(--navy-700)]">
                    Unit sizes are based on household size. A single person usually can't get a 2BR. Match your household to allowed unit sizes.
                  </p>
                </div>

                <div className="bg-red-50 border-l-4 border-red-500 p-6">
                  <h3 className="font-semibold text-[var(--navy-800)] mb-2">Not Responding to Notifications</h3>
                  <p className="text-[var(--navy-700)]">
                    If selected, you'll get an email/letter requesting documents. You have limited time to respond. Check your email regularly (including spam).
                  </p>
                </div>
              </div>
            </section>

            {/* Never Miss */}
            <section id="never-miss" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Never Miss a Housing Lottery Deadline
              </h2>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8 my-6">
                <h3 className="text-2xl font-semibold text-[var(--navy-900)] mb-4">
                  NYC CityPing Housing Lottery Alerts
                </h3>
                <p className="text-lg text-[var(--navy-700)] mb-4">
                  NYC CityPing tracks housing lottery deadlines and includes them in your daily briefing. You'll get:
                </p>
                <ul className="space-y-2 text-lg text-[var(--navy-700)] mb-6">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>New lottery announcements in your weekly digest</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Deadline reminders before lotteries close</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Plus: parking, transit, events - everything a New Yorker needs to know</span>
                  </li>
                </ul>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold"
                >
                  Get Free Deadline Alerts
                </Link>
              </div>
            </section>

            {/* CTA Footer */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Don't Let a Deadline Slip By
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                Housing lottery wins can save you $250,000+ over a decade. One missed deadline could cost you.
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
                  <li><Link href="/nyc-housing-lottery" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Housing Lottery</Link></li>
                  <li><Link href="/nyc-subway-alerts" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Subway Alerts</Link></li>
                  <li><Link href="/nyc-alternate-side-parking-guide" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Parking Guide</Link></li>
                  <li><Link href="/nyc-events-calendar" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Events Calendar</Link></li>
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
