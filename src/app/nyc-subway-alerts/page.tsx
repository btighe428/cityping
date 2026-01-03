import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NYC Subway Alerts & MTA Service Status - Real-Time Updates 2025',
  description: 'Get real-time NYC subway alerts, MTA service changes, and train delay notifications. Never miss your train or get stuck underground. Free daily briefings for NYC commuters.',
  keywords: [
    'NYC subway alerts',
    'MTA service alerts',
    'subway delays NYC',
    'NYC train delays',
    'MTA service status',
    'NYC transit alerts',
    'subway service changes',
    'NYC commuter alerts',
    'MTA delays today',
    'NYC subway status'
  ],
  openGraph: {
    title: 'NYC Subway Alerts & MTA Service Status - Real-Time Updates',
    description: 'Get real-time NYC subway alerts and MTA service changes. Never miss your train or get stuck underground again.',
    url: 'https://cityping.net/nyc-subway-alerts',
    type: 'article',
  },
  alternates: {
    canonical: 'https://cityping.net/nyc-subway-alerts',
  },
}

export default function NYCSubwayAlerts() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NYC Subway Alerts & MTA Service Status Guide 2025",
    "description": "Complete guide to NYC subway alerts, MTA service changes, and how to stay informed about transit delays.",
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
      "@id": "https://cityping.net/nyc-subway-alerts"
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
        "name": "NYC Subway Alerts",
        "item": "https://cityping.net/nyc-subway-alerts"
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
              Get Free Alerts
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
              <span>NYC Subway Alerts</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              NYC Subway Alerts & MTA Service Status (2025)
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              The New York City subway system carries over 5 million riders daily across 472 stations. Service changes, delays, and planned work can derail your commute without warning. This guide covers how to stay informed and never get caught off guard.
            </p>

            {/* Quick Navigation */}
            <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-12">
              <h2 className="text-lg font-bold text-[var(--navy-900)] mb-4">Quick Navigation</h2>
              <ul className="space-y-2">
                <li><a href="#understanding-alerts" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Understanding MTA Service Alerts</a></li>
                <li><a href="#alert-types" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Types of Service Changes</a></li>
                <li><a href="#stay-informed" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">How to Stay Informed</a></li>
                <li><a href="#planned-work" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Planned Work & Weekend Changes</a></li>
                <li><a href="#commuter-tips" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Pro Tips for NYC Commuters</a></li>
              </ul>
            </div>

            {/* Understanding Alerts */}
            <section id="understanding-alerts" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Understanding MTA Service Alerts
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                The Metropolitan Transportation Authority (MTA) operates the largest public transit system in North America. With 27 subway lines serving all five boroughs, service disruptions are a daily reality for millions of New Yorkers.
              </p>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                MTA service alerts fall into several categories, each with different implications for your commute. Understanding these distinctions helps you make better real-time decisions.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">The NYC Subway by Numbers:</p>
                <ul className="text-[var(--navy-700)] space-y-1">
                  <li>472 stations across 5 boroughs</li>
                  <li>665 miles of track</li>
                  <li>5.5 million daily riders (pre-pandemic peak)</li>
                  <li>24/7 operation (one of few systems worldwide)</li>
                </ul>
              </div>
            </section>

            {/* Alert Types */}
            <section id="alert-types" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Types of MTA Service Changes
              </h2>

              <div className="space-y-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Delays</h3>
                  <p className="text-[var(--navy-700)]">
                    Real-time slowdowns due to signal problems, sick passengers, police investigations, or mechanical issues. These are often unpredictable and can range from 5 minutes to hours.
                  </p>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-500 p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Suspensions</h3>
                  <p className="text-[var(--navy-700)]">
                    Complete service halt on a line or portion of a line. May be emergency-related or planned for maintenance. Often accompanied by shuttle bus service.
                  </p>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Service Changes</h3>
                  <p className="text-[var(--navy-700)]">
                    Rerouting, skip-stop patterns, or express/local swaps. Trains run but follow altered routes. Common during planned work periods.
                  </p>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Planned Work</h3>
                  <p className="text-[var(--navy-700)]">
                    Scheduled maintenance typically occurring nights and weekends. Published in advance, allowing commuters to plan alternative routes.
                  </p>
                </div>
              </div>
            </section>

            {/* Stay Informed */}
            <section id="stay-informed" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                How to Stay Informed
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-6 leading-relaxed">
                Multiple channels exist for MTA alerts, but most require active checking. Here's a comparison of your options:
              </p>

              <div className="overflow-x-auto mb-8">
                <table className="w-full border-collapse border border-[var(--navy-200)]">
                  <thead>
                    <tr className="bg-[var(--navy-50)]">
                      <th className="border border-[var(--navy-200)] p-3 text-left">Method</th>
                      <th className="border border-[var(--navy-200)] p-3 text-left">Pros</th>
                      <th className="border border-[var(--navy-200)] p-3 text-left">Cons</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3 font-semibold">MTA Website</td>
                      <td className="border border-[var(--navy-200)] p-3">Official source, detailed</td>
                      <td className="border border-[var(--navy-200)] p-3">Requires active checking</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3 font-semibold">MTA App</td>
                      <td className="border border-[var(--navy-200)] p-3">Real-time, trip planning</td>
                      <td className="border border-[var(--navy-200)] p-3">Alert overload, many irrelevant</td>
                    </tr>
                    <tr>
                      <td className="border border-[var(--navy-200)] p-3 font-semibold">Twitter/X @NYCTSubway</td>
                      <td className="border border-[var(--navy-200)] p-3">Fast updates</td>
                      <td className="border border-[var(--navy-200)] p-3">Noisy, mixed with replies</td>
                    </tr>
                    <tr className="bg-green-50">
                      <td className="border border-[var(--navy-200)] p-3 font-semibold">NYC CityPing</td>
                      <td className="border border-[var(--navy-200)] p-3">Curated daily briefing, proactive</td>
                      <td className="border border-[var(--navy-200)] p-3">Not real-time (morning digest)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8 my-6">
                <h3 className="text-2xl font-semibold text-[var(--navy-900)] mb-4">
                  The NYC CityPing Approach
                </h3>
                <p className="text-lg text-[var(--navy-700)] mb-4">
                  Instead of drowning in real-time noise, NYC CityPing delivers a curated morning briefing at 7am on weekdays. You get:
                </p>
                <ul className="space-y-2 text-lg text-[var(--navy-700)] mb-6">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Major service changes affecting your commute</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Planned work for the day and week ahead</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Plus: parking alerts, housing lottery deadlines, events</span>
                  </li>
                </ul>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold"
                >
                  Get Your Free Daily Briefing
                </Link>
              </div>
            </section>

            {/* Planned Work */}
            <section id="planned-work" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Planned Work & Weekend Service Changes
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                The MTA performs most major maintenance during nights and weekends when ridership is lower. This means weekend subway service in NYC is fundamentally different from weekday service.
              </p>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Common Weekend Patterns
              </h3>
              <ul className="list-disc list-inside space-y-2 mb-6 text-lg text-[var(--navy-700)]">
                <li>Express trains running local</li>
                <li>Lines terminating early (not running full route)</li>
                <li>Shuttle bus replacements for subway segments</li>
                <li>Station closures for renovation</li>
                <li>Lines running on different tracks than usual</li>
              </ul>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Weekend Warrior Tip:</p>
                <p className="text-[var(--navy-700)]">
                  Always check service status before leaving for weekend trips. The subway you took Friday evening may not be running the same way Saturday morning.
                </p>
              </div>
            </section>

            {/* Commuter Tips */}
            <section id="commuter-tips" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Pro Tips for NYC Commuters
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    1. Know Your Alternatives
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    For every route you regularly take, know at least one backup. The A delayed? Take the C. No C? Bus M60 might work. Build mental maps.
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    2. Time Your Commute
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Peak delays often occur 8-9am and 5-6pm. Shifting your commute 30 minutes earlier or later can dramatically improve reliability.
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    3. Platform Position Matters
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Learn which car positions align with your exit stairs. Saves 2-5 minutes per trip - that's 15+ hours per year for daily commuters.
                  </p>
                </div>
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    4. Build Buffer Time
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    For important meetings, add 15-20 minutes buffer. NYC subway delays are not exceptions - they're statistical certainties over time.
                  </p>
                </div>
              </div>
            </section>

            {/* CTA Footer */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Start Your Day Knowing What's Happening
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                60 seconds every morning. Transit, parking, events, and more.
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
                  <li><Link href="/nyc-subway-alerts" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Subway Alerts</Link></li>
                  <li><Link href="/nyc-alternate-side-parking-guide" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Parking Guide</Link></li>
                  <li><Link href="/nyc-housing-lottery" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Housing Lottery</Link></li>
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
