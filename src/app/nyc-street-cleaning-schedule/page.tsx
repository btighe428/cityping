// src/app/nyc-street-cleaning-schedule/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs, RelatedArticles } from '@/components/seo/RelatedArticles'
import { SEOFooter } from '@/components/seo/SEOFooter'

export const metadata: Metadata = {
  title: 'NYC Street Cleaning Schedule by Borough 2025',
  description: 'Find your NYC street cleaning schedule by neighborhood. Lookup alternate side parking times for Manhattan, Brooklyn, Queens, Bronx, and Staten Island.',
  keywords: [
    'NYC street cleaning schedule',
    'street sweeping schedule NYC',
    'alternate side parking schedule',
    'NYC street cleaning times',
    'when does street cleaning happen NYC',
    'Brooklyn street cleaning',
    'Manhattan street cleaning schedule'
  ],
  openGraph: {
    title: 'NYC Street Cleaning Schedule by Borough 2025',
    description: 'Complete street cleaning schedule for all NYC boroughs. Find your neighborhood\'s ASP times.',
    url: 'https://cityping.net/nyc-street-cleaning-schedule',
    type: 'article',
  },
  alternates: {
    canonical: 'https://cityping.net/nyc-street-cleaning-schedule',
  },
}

export default function NYCStreetCleaningSchedule() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NYC Street Cleaning Schedule by Borough 2025",
    "description": "Complete guide to street cleaning schedules across all NYC boroughs including Manhattan, Brooklyn, Queens, Bronx, and Staten Island.",
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
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
              { name: 'Parking Guides', href: '/nyc-alternate-side-parking-guide' },
              { name: 'Street Cleaning Schedule' }
            ]} />

            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              NYC Street Cleaning Schedule by Borough
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              New York City's street cleaning program operates under Alternate Side Parking (ASP) rules. This guide covers typical street cleaning schedules by borough, though you should always check the specific signs on your street.
            </p>

            {/* Key Info Box */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-12">
              <h2 className="font-bold text-[var(--navy-800)] mb-2">Important</h2>
              <p className="text-[var(--navy-700)]">
                Street cleaning schedules vary by block. The times listed below are general patterns for each borough. <strong>Always check posted signs on your specific street</strong> for accurate information.
              </p>
            </div>

            {/* Manhattan */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Manhattan Street Cleaning
              </h2>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-[var(--navy-800)] mb-3">Typical Schedule</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--navy-500)] mb-1">Morning Sessions</p>
                    <p className="text-[var(--navy-700)]">8:00 AM - 11:00 AM</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--navy-500)] mb-1">Afternoon Sessions</p>
                    <p className="text-[var(--navy-700)]">11:30 AM - 2:00 PM</p>
                  </div>
                </div>
              </div>
              <p className="text-lg text-[var(--navy-700)] mb-4">
                Manhattan has the most varied street cleaning schedules due to its density. Many streets have cleaning 2-3 times per week, with some high-traffic areas cleaned daily.
              </p>
              <p className="text-lg text-[var(--navy-700)]">
                <strong>Notable patterns:</strong> Most residential streets in Midtown and Downtown have Monday/Thursday or Tuesday/Friday alternating schedules. Upper Manhattan tends toward once-weekly cleaning.
              </p>
            </section>

            {/* Brooklyn */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Brooklyn Street Cleaning
              </h2>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-[var(--navy-800)] mb-3">Typical Schedule</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--navy-500)] mb-1">Morning Sessions</p>
                    <p className="text-[var(--navy-700)]">9:00 AM - 10:30 AM</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--navy-500)] mb-1">Late Morning Sessions</p>
                    <p className="text-[var(--navy-700)]">11:00 AM - 12:30 PM</p>
                  </div>
                </div>
              </div>
              <p className="text-lg text-[var(--navy-700)] mb-4">
                Brooklyn's diverse neighborhoods have varying schedules. Areas like Park Slope, Williamsburg, and Brooklyn Heights often have twice-weekly cleaning, while outer neighborhoods may have once-weekly schedules.
              </p>
              <p className="text-lg text-[var(--navy-700)]">
                <strong>Notable patterns:</strong> Many Brooklyn streets use the 90-minute window format (e.g., 9:00-10:30 AM) rather than longer 3-hour windows common in Manhattan.
              </p>
            </section>

            {/* Queens */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Queens Street Cleaning
              </h2>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-[var(--navy-800)] mb-3">Typical Schedule</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--navy-500)] mb-1">Morning Sessions</p>
                    <p className="text-[var(--navy-700)]">9:00 AM - 10:30 AM</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--navy-500)] mb-1">Afternoon Sessions</p>
                    <p className="text-[var(--navy-700)]">12:30 PM - 2:00 PM</p>
                  </div>
                </div>
              </div>
              <p className="text-lg text-[var(--navy-700)] mb-4">
                Queens has the most variation in street cleaning schedules due to its size and mix of residential and commercial areas. Some neighborhoods near Manhattan (Astoria, Long Island City) have more frequent cleaning.
              </p>
              <p className="text-lg text-[var(--navy-700)]">
                <strong>Notable patterns:</strong> Eastern Queens neighborhoods often have once-weekly cleaning, while areas closer to Manhattan have twice-weekly schedules.
              </p>
            </section>

            {/* Bronx */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Bronx Street Cleaning
              </h2>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-[var(--navy-800)] mb-3">Typical Schedule</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--navy-500)] mb-1">Morning Sessions</p>
                    <p className="text-[var(--navy-700)]">9:00 AM - 10:30 AM</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--navy-500)] mb-1">Late Morning Sessions</p>
                    <p className="text-[var(--navy-700)]">11:00 AM - 12:30 PM</p>
                  </div>
                </div>
              </div>
              <p className="text-lg text-[var(--navy-700)] mb-4">
                The Bronx generally follows predictable Monday/Thursday or Tuesday/Friday patterns. Most residential streets have twice-weekly cleaning during warm months.
              </p>
              <p className="text-lg text-[var(--navy-700)]">
                <strong>Notable patterns:</strong> Riverdale and other lower-density areas often have reduced cleaning schedules. Commercial corridors may have more frequent cleaning.
              </p>
            </section>

            {/* Staten Island */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Staten Island Street Cleaning
              </h2>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-[var(--navy-800)] mb-3">Typical Schedule</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--navy-500)] mb-1">Morning Sessions</p>
                    <p className="text-[var(--navy-700)]">9:00 AM - 10:30 AM</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--navy-500)] mb-1">Afternoon Sessions</p>
                    <p className="text-[var(--navy-700)]">12:00 PM - 1:30 PM</p>
                  </div>
                </div>
              </div>
              <p className="text-lg text-[var(--navy-700)] mb-4">
                Staten Island has the least intensive street cleaning schedule of all boroughs. Many residential areas have once-weekly or even bi-weekly cleaning.
              </p>
              <p className="text-lg text-[var(--navy-700)]">
                <strong>Notable patterns:</strong> Commercial areas near the ferry have more frequent cleaning. Residential neighborhoods further south often have reduced schedules.
              </p>
            </section>

            {/* How to Find Your Schedule */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                How to Find Your Street's Schedule
              </h2>

              <div className="space-y-4">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">1. Check Posted Signs</h3>
                  <p className="text-[var(--navy-700)]">
                    The most accurate information is on the signs posted on your street. Look for "NO PARKING" signs with days and times listed.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">2. Use NYC 311 App</h3>
                  <p className="text-[var(--navy-700)]">
                    The NYC 311 app includes a street cleaning lookup feature. Enter your address to see scheduled cleaning times.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">3. DSNY Street Cleaning Map</h3>
                  <p className="text-[var(--navy-700)]">
                    The Department of Sanitation maintains an <a href="https://www1.nyc.gov/assets/dsny/site/services/street-cleaning" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">interactive map</a> showing cleaning schedules by district.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">4. Get CityPing Alerts</h3>
                  <p className="text-[var(--navy-700)]">
                    Don't memorize schedules—let CityPing notify you when street cleaning is suspended due to holidays or weather, so you know when you don't have to move.
                  </p>
                </div>
              </div>
            </section>

            {/* When Street Cleaning is Suspended */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                When Street Cleaning is Suspended
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4">
                Street cleaning (and ASP) is suspended on numerous holidays and special occasions. Check our <Link href="/asp-suspension-calendar" className="text-blue-600 hover:underline">ASP Suspension Calendar</Link> for the complete 2025 schedule.
              </p>
              <div className="bg-green-50 border-l-4 border-green-500 p-6 my-6">
                <h3 className="font-bold text-[var(--navy-800)] mb-3">CityPing Keeps You Informed</h3>
                <p className="text-[var(--navy-700)] mb-4">
                  Never wonder if street cleaning is happening. CityPing sends automatic alerts the evening before every suspension, plus weekly previews of upcoming changes.
                </p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold"
                >
                  Get Free Alerts
                </Link>
              </div>
            </section>

            {/* Related Articles */}
            <RelatedArticles
              currentPage="nyc-street-cleaning-schedule"
              title="Related Guides"
            />

            {/* CTA Footer */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Know When to Skip the Shuffle
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                Get alerts when street cleaning is suspended
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
