// src/app/free-things-to-do-nyc/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs, RelatedArticles } from '@/components/seo/RelatedArticles'
import { SEOFooter } from '@/components/seo/SEOFooter'

export const metadata: Metadata = {
  title: 'Free Things to Do in NYC 2025: Best Events & Activities',
  description: 'Discover the best free events, activities, and hidden gems in New York City. From museum free nights to outdoor concerts, find what\'s happening in NYC for free.',
  keywords: [
    'free things to do NYC',
    'free events New York',
    'free activities NYC',
    'NYC free admission',
    'free museums NYC',
    'free concerts NYC',
    'cheap things to do NYC',
    'NYC budget activities'
  ],
  openGraph: {
    title: 'Free Things to Do in NYC 2025',
    description: 'The ultimate guide to free events and activities in New York City.',
    url: 'https://cityping.net/free-things-to-do-nyc',
    type: 'article',
  },
  alternates: {
    canonical: 'https://cityping.net/free-things-to-do-nyc',
  },
}

export default function FreeThingsNYC() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Free Things to Do in NYC 2025: Complete Guide",
    "description": "Comprehensive guide to free events and activities in New York City including museums, parks, concerts, and seasonal events.",
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
        "name": "What museums are free in NYC?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Several NYC museums offer free admission or pay-what-you-wish hours: The Met (pay-what-you-wish for NY residents), MoMA (free Fridays 4-8pm), Brooklyn Museum (first Saturday), Natural History Museum (pay-what-you-wish), and many others on specific days."
        }
      },
      {
        "@type": "Question",
        "name": "What free events happen in NYC?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NYC offers numerous free events including concerts in Central Park and Prospect Park, outdoor movie screenings in summer, street fairs, gallery openings, free comedy shows, and cultural festivals throughout the year."
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
              { name: 'NYC Events', href: '/nyc-events-calendar' },
              { name: 'Free Things to Do' }
            ]} />

            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              Free Things to Do in NYC: The Complete Guide (2025)
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              New York City is expensive, but it doesn't have to be. From world-class museums to outdoor concerts, here's your guide to experiencing the best of NYC without spending a dime.
            </p>

            {/* Quick Links */}
            <div className="bg-[var(--navy-50)] rounded-lg p-6 mb-12">
              <h2 className="text-lg font-bold text-[var(--navy-900)] mb-4">Quick Navigation</h2>
              <div className="grid md:grid-cols-2 gap-2">
                <a href="#museums" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">→ Free Museums</a>
                <a href="#outdoor" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">→ Parks & Outdoor Activities</a>
                <a href="#entertainment" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">→ Entertainment & Shows</a>
                <a href="#seasonal" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">→ Seasonal Events</a>
                <a href="#food" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">→ Free Food & Samples</a>
                <a href="#cultural" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">→ Cultural Experiences</a>
              </div>
            </div>

            {/* Museums */}
            <section id="museums" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Free & Pay-What-You-Wish Museums
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-6 leading-relaxed">
                NYC's world-class museums offer numerous free admission opportunities. Here's your complete guide:
              </p>

              <div className="space-y-4">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Metropolitan Museum of Art</h3>
                  <p className="text-[var(--navy-600)] mb-2">Fifth Avenue at 82nd Street</p>
                  <p className="text-[var(--navy-700)]">
                    <strong>Free for:</strong> NY, NJ, CT residents (pay-what-you-wish)
                  </p>
                  <p className="text-sm text-[var(--navy-600)] mt-2">
                    Tip: The suggested donation is $30, but you can pay any amount. Includes same-day access to The Met Cloisters.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">MoMA (Museum of Modern Art)</h3>
                  <p className="text-[var(--navy-600)] mb-2">11 W 53rd Street</p>
                  <p className="text-[var(--navy-700)]">
                    <strong>Free on:</strong> Fridays 4:00 PM - 8:00 PM (UNIQLO Free Friday Nights)
                  </p>
                  <p className="text-sm text-[var(--navy-600)] mt-2">
                    Tip: Arrive early—lines form by 3:30 PM. Tickets available first-come, first-served.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Brooklyn Museum</h3>
                  <p className="text-[var(--navy-600)] mb-2">200 Eastern Parkway</p>
                  <p className="text-[var(--navy-700)]">
                    <strong>Free on:</strong> First Saturday of each month (5:00 PM - 11:00 PM)
                  </p>
                  <p className="text-sm text-[var(--navy-600)] mt-2">
                    First Saturdays include live music, performances, and special programs.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">American Museum of Natural History</h3>
                  <p className="text-[var(--navy-600)] mb-2">Central Park West at 79th Street</p>
                  <p className="text-[var(--navy-700)]">
                    <strong>Free for:</strong> All visitors (pay-what-you-wish general admission)
                  </p>
                  <p className="text-sm text-[var(--navy-600)] mt-2">
                    Special exhibitions require timed tickets at standard pricing.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">More Free Museums</h3>
                  <ul className="text-[var(--navy-700)] space-y-2">
                    <li>• <strong>National Museum of the American Indian</strong> - Always free</li>
                    <li>• <strong>Museum at FIT</strong> - Always free</li>
                    <li>• <strong>Federal Reserve Bank Museum</strong> - Free with reservation</li>
                    <li>• <strong>Queens Museum</strong> - Pay-what-you-wish</li>
                    <li>• <strong>Bronx Museum of the Arts</strong> - Always free</li>
                    <li>• <strong>Studio Museum in Harlem</strong> - Free on Sundays</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Outdoor Activities */}
            <section id="outdoor" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Parks & Outdoor Activities
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Central Park</h3>
                  <ul className="text-[var(--navy-700)] space-y-1 text-sm">
                    <li>• Free tours at the Belvedere Castle</li>
                    <li>• Shakespeare in the Park (summer)</li>
                    <li>• SummerStage concerts</li>
                    <li>• Ice skating rink views (watching is free!)</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">The High Line</h3>
                  <ul className="text-[var(--navy-700)] space-y-1 text-sm">
                    <li>• Always free to walk</li>
                    <li>• Free tours available</li>
                    <li>• Art installations</li>
                    <li>• Stargazing events</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Brooklyn Bridge Park</h3>
                  <ul className="text-[var(--navy-700)] space-y-1 text-sm">
                    <li>• Free kayaking (summer weekends)</li>
                    <li>• Movies with a View (summer)</li>
                    <li>• Stunning Manhattan skyline</li>
                    <li>• Jane's Carousel ($2 - almost free!)</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Governors Island</h3>
                  <ul className="text-[var(--navy-700)] space-y-1 text-sm">
                    <li>• Free ferry before noon (weekends)</li>
                    <li>• Bike rentals, food festivals</li>
                    <li>• Art installations</li>
                    <li>• Harbor views</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Entertainment */}
            <section id="entertainment" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Free Entertainment & Shows
              </h2>

              <div className="space-y-4">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Free Comedy Shows</h3>
                  <p className="text-[var(--navy-700)] mb-2">
                    Several clubs offer free shows (usually with 2-drink minimum):
                  </p>
                  <ul className="text-[var(--navy-600)] space-y-1">
                    <li>• The Creek and The Cave (Long Island City)</li>
                    <li>• UCB Theatre (free stand-by for Maude Night)</li>
                    <li>• The PIT - various free shows</li>
                  </ul>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Free TV Show Tapings</h3>
                  <p className="text-[var(--navy-700)]">
                    Request free tickets to shows like The Tonight Show, Saturday Night Live, The Daily Show, and more. Book well in advance at <a href="https://1iota.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">1iota.com</a>.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Free Concerts</h3>
                  <ul className="text-[var(--navy-700)] space-y-2">
                    <li>• <strong>SummerStage:</strong> Free concerts throughout Central Park (summer)</li>
                    <li>• <strong>Celebrate Brooklyn:</strong> Free concerts in Prospect Park (summer)</li>
                    <li>• <strong>Lincoln Center Out of Doors:</strong> Free performances (July-August)</li>
                    <li>• <strong>Good Morning America Summer Concert Series:</strong> Central Park (Fridays)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Seasonal Events */}
            <section id="seasonal" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Seasonal Free Events
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[var(--navy-50)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Spring</h3>
                  <ul className="text-[var(--navy-700)] space-y-1">
                    <li>• Cherry blossom viewing (Brooklyn Botanic Garden has free mornings)</li>
                    <li>• Tribeca Film Festival outdoor screenings</li>
                    <li>• Five Boro Bike Tour spectating</li>
                  </ul>
                </div>

                <div className="bg-[var(--navy-50)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Summer</h3>
                  <ul className="text-[var(--navy-700)] space-y-1">
                    <li>• Shakespeare in the Park</li>
                    <li>• Outdoor movie screenings (dozens of locations)</li>
                    <li>• Macy's 4th of July Fireworks</li>
                    <li>• Street fairs nearly every weekend</li>
                  </ul>
                </div>

                <div className="bg-[var(--navy-50)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Fall</h3>
                  <ul className="text-[var(--navy-700)] space-y-1">
                    <li>• Atlantic Antic street festival</li>
                    <li>• NYC Marathon spectating</li>
                    <li>• Halloween parade (Village)</li>
                    <li>• Open House New York weekend</li>
                  </ul>
                </div>

                <div className="bg-[var(--navy-50)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">Winter</h3>
                  <ul className="text-[var(--navy-700)] space-y-1">
                    <li>• Holiday window displays (Fifth Ave)</li>
                    <li>• Rockefeller Center tree viewing</li>
                    <li>• New Year's Eve in Times Square</li>
                    <li>• Lunar New Year parade (Chinatown)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Food & Samples */}
            <section id="food" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Free Food & Samples
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4">
                While not a meal replacement, these spots offer free tastings:
              </p>
              <ul className="list-disc list-inside space-y-2 text-lg text-[var(--navy-700)]">
                <li><strong>Chelsea Market:</strong> Many vendors offer samples</li>
                <li><strong>Eataly:</strong> Frequent tasting events</li>
                <li><strong>Zabar's:</strong> Free samples at the counter</li>
                <li><strong>Costco:</strong> Membership not required for food court in NYC</li>
                <li><strong>Trader Joe's:</strong> Coffee and sample stations</li>
                <li><strong>Grand Central Market:</strong> Cheese and specialty food samples</li>
              </ul>
            </section>

            {/* Cultural Experiences */}
            <section id="cultural" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Free Cultural Experiences
              </h2>

              <div className="space-y-4">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Free Walking Tours</h3>
                  <p className="text-[var(--navy-700)]">
                    Organizations like Free Tours by Foot offer tip-based walking tours covering neighborhoods, history, architecture, and food. No payment required (tips appreciated).
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Gallery Openings</h3>
                  <p className="text-[var(--navy-700)]">
                    Chelsea galleries host free openings most Thursday evenings. Enjoy contemporary art and usually complimentary wine.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Public Library Events</h3>
                  <p className="text-[var(--navy-700)]">
                    NYPL branches host free author talks, workshops, movie screenings, and cultural programs. The main branch on 42nd Street is architecturally stunning.
                  </p>
                </div>
              </div>
            </section>

            {/* Stay Updated */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Never Miss a Free Event
              </h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
                <p className="text-lg text-[var(--navy-700)] mb-6">
                  CityPing curates the best NYC events and sends them directly to your inbox. Our daily digest includes:
                </p>
                <ul className="space-y-3 text-lg text-[var(--navy-700)] mb-6">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Free events and activities happening today</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Sample sales and pop-up shops</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Museum free nights and special admission</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Seasonal festivals and street fairs</span>
                  </li>
                </ul>
                <Link
                  href="/"
                  className="inline-block px-8 py-4 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold text-lg"
                >
                  Get Free Daily NYC Alerts
                </Link>
              </div>
            </section>

            {/* Related Articles */}
            <RelatedArticles
              currentPage="free-things-to-do-nyc"
              title="Related NYC Guides"
            />

            {/* CTA Footer */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Explore NYC Without Breaking the Bank
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                Get curated free events delivered to your inbox
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
