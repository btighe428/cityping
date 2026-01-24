// src/app/nyc-parking-ticket-dispute/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs, RelatedArticles, ARTICLES } from '@/components/seo/RelatedArticles'
import { SEOFooter } from '@/components/seo/SEOFooter'

export const metadata: Metadata = {
  title: 'How to Dispute a NYC Parking Ticket (2025 Guide)',
  description: 'Step-by-step guide to disputing parking tickets in New York City. Learn when to fight, how to submit evidence, and your chances of winning an NYC parking ticket dispute.',
  keywords: [
    'NYC parking ticket dispute',
    'fight parking ticket NYC',
    'contest parking ticket New York',
    'NYC parking ticket appeal',
    'how to beat parking ticket NYC',
    'parking ticket hearing NYC',
    'NYC parking violation dispute'
  ],
  openGraph: {
    title: 'How to Dispute a NYC Parking Ticket (2025 Guide)',
    description: 'Complete guide to fighting parking tickets in NYC. Know your rights and increase your chances of winning.',
    url: 'https://cityping.net/nyc-parking-ticket-dispute',
    type: 'article',
  },
  alternates: {
    canonical: 'https://cityping.net/nyc-parking-ticket-dispute',
  },
}

export default function NYCParkingTicketDispute() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Dispute a NYC Parking Ticket",
    "description": "Step-by-step guide to disputing parking tickets in New York City",
    "totalTime": "PT30M",
    "estimatedCost": {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": "0"
    },
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Review the Ticket",
        "text": "Check for errors in date, time, location, license plate, or violation code. Document any discrepancies."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Gather Evidence",
        "text": "Take photos of signage, your parking position, and any relevant conditions. Collect receipts if applicable."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Submit Dispute Online",
        "text": "Visit NYC Pay or Dispute portal and submit your evidence within 30 days of the ticket date."
      },
      {
        "@type": "HowToStep",
        "position": 4,
        "name": "Attend Hearing if Required",
        "text": "If initial dispute is denied, request an in-person or video hearing to present your case."
      }
    ]
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How long do I have to dispute a NYC parking ticket?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You have 30 days from the ticket date to dispute a NYC parking ticket without penalty. After 30 days, you can still dispute but the fine increases."
        }
      },
      {
        "@type": "Question",
        "name": "What are the best reasons to dispute a parking ticket in NYC?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The best reasons include: incorrect information on the ticket, missing or unclear signage, broken meters, medical emergencies with documentation, and ASP tickets issued during suspended periods."
        }
      },
      {
        "@type": "Question",
        "name": "What is the success rate for disputing NYC parking tickets?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "According to NYC data, approximately 35-40% of disputed parking tickets are dismissed. Success rates vary by violation type and quality of evidence submitted."
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
              { name: 'Parking Guides', href: '/nyc-alternate-side-parking-guide' },
              { name: 'Dispute Parking Tickets' }
            ]} />

            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              How to Dispute a NYC Parking Ticket (2025)
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              Received an unfair parking ticket? You have the right to dispute it. This guide walks you through the NYC parking ticket dispute process, from evaluating your case to submitting evidence and attending hearings.
            </p>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-12">
              <div className="bg-[var(--navy-50)] rounded-lg p-6 text-center">
                <p className="text-3xl font-bold text-[var(--navy-900)]">35-40%</p>
                <p className="text-sm text-[var(--navy-600)]">Success rate for disputes</p>
              </div>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 text-center">
                <p className="text-3xl font-bold text-[var(--navy-900)]">30 days</p>
                <p className="text-sm text-[var(--navy-600)]">Deadline to dispute</p>
              </div>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 text-center">
                <p className="text-3xl font-bold text-[var(--navy-900)]">$0</p>
                <p className="text-sm text-[var(--navy-600)]">Cost to dispute</p>
              </div>
            </div>

            {/* When to Dispute */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                When Should You Dispute a Parking Ticket?
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Not every ticket is worth fighting, but many are dismissed when disputed properly. Consider disputing if:
              </p>

              <div className="bg-green-50 border-l-4 border-green-500 p-6 my-6">
                <h3 className="font-bold text-[var(--navy-800)] mb-2">Strong Cases (High Success Rate)</h3>
                <ul className="list-disc list-inside space-y-2 text-[var(--navy-700)]">
                  <li><strong>ASP ticket during suspension:</strong> You have proof ASP was suspended (CityPing alerts make this easy)</li>
                  <li><strong>Incorrect information:</strong> Wrong license plate, date, time, or location on ticket</li>
                  <li><strong>Missing or obscured signs:</strong> Signage wasn't visible or was contradictory</li>
                  <li><strong>Broken meter:</strong> Meter malfunction prevented payment</li>
                  <li><strong>Medical emergency:</strong> Documentation showing emergency room visit during ticket time</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 my-6">
                <h3 className="font-bold text-[var(--navy-800)] mb-2">Moderate Cases (Worth Trying)</h3>
                <ul className="list-disc list-inside space-y-2 text-[var(--navy-700)]">
                  <li>You were in the car when ticketed (90-second rule for ASP)</li>
                  <li>Construction or emergency vehicles blocked legal parking</li>
                  <li>Sign was recently changed without notice</li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-6 my-6">
                <h3 className="font-bold text-[var(--navy-800)] mb-2">Weak Cases (Likely to Lose)</h3>
                <ul className="list-disc list-inside space-y-2 text-[var(--navy-700)]">
                  <li>"I didn't see the sign" - Signs are presumed visible</li>
                  <li>"I was only gone for a minute" - Time doesn't matter</li>
                  <li>"Everyone else was parked there" - Not a valid defense</li>
                </ul>
              </div>
            </section>

            {/* Step by Step Process */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Step-by-Step Dispute Process
              </h2>

              <div className="space-y-6">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-[var(--navy-800)] text-white rounded-full flex items-center justify-center font-bold mr-4">1</span>
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Review the Ticket Carefully</h3>
                      <p className="text-[var(--navy-700)] mb-3">
                        Check every field for errors: date, time, location, vehicle description, license plate, and violation code. Any factual error can be grounds for dismissal.
                      </p>
                      <p className="text-sm text-[var(--navy-600)]">
                        <strong>Pro tip:</strong> Take photos of the ticket immediately. Note if time was accurate to your watch.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-[var(--navy-800)] text-white rounded-full flex items-center justify-center font-bold mr-4">2</span>
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Gather Evidence</h3>
                      <p className="text-[var(--navy-700)] mb-3">
                        Document everything that supports your case:
                      </p>
                      <ul className="list-disc list-inside text-[var(--navy-600)] space-y-1">
                        <li>Photos of signage (or lack thereof)</li>
                        <li>Photos showing your parking position relative to signs</li>
                        <li>Screenshots of CityPing ASP suspension alerts</li>
                        <li>Meter receipts or mobile payment confirmations</li>
                        <li>Medical records if claiming emergency</li>
                        <li>Witness statements</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-[var(--navy-800)] text-white rounded-full flex items-center justify-center font-bold mr-4">3</span>
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Submit Online Dispute</h3>
                      <p className="text-[var(--navy-700)] mb-3">
                        Visit <a href="https://nycserv.nyc.gov/NYCServWeb/NYCSERVMain" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">NYC Pay or Dispute</a> (nycserv.nyc.gov) and:
                      </p>
                      <ul className="list-disc list-inside text-[var(--navy-600)] space-y-1">
                        <li>Enter your ticket number</li>
                        <li>Select "Dispute" option</li>
                        <li>Choose your defense reason from the dropdown</li>
                        <li>Upload evidence photos (max 5MB per file)</li>
                        <li>Write a clear, factual statement</li>
                      </ul>
                      <p className="text-sm text-[var(--navy-600)] mt-3">
                        <strong>Important:</strong> Keep your statement brief and factual. Avoid emotional language.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-[var(--navy-800)] text-white rounded-full flex items-center justify-center font-bold mr-4">4</span>
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">Wait for Decision (or Request Hearing)</h3>
                      <p className="text-[var(--navy-700)] mb-3">
                        Online disputes typically receive decisions within 2-4 weeks. If denied, you can:
                      </p>
                      <ul className="list-disc list-inside text-[var(--navy-600)] space-y-1">
                        <li>Request an in-person hearing at a DOF office</li>
                        <li>Request a video hearing (done remotely)</li>
                        <li>Appeal to the Appeals Board (final level)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Sample Dispute Letter */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Sample Dispute Statement
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Here's a template for an ASP suspension dispute:
              </p>
              <div className="bg-[var(--navy-50)] rounded-lg p-6 font-mono text-sm">
                <p className="mb-4">I am disputing ticket #[NUMBER] issued on [DATE] at [TIME] for an Alternate Side Parking violation at [LOCATION].</p>
                <p className="mb-4">Alternate Side Parking was suspended on this date due to [HOLIDAY NAME]. This suspension was announced by the NYC Department of Sanitation and confirmed by CityPing alerts (screenshot attached).</p>
                <p className="mb-4">The official NYC ASP suspension calendar shows that [DATE] was a suspended day. I have attached a screenshot confirming this suspension.</p>
                <p>I respectfully request this ticket be dismissed as the violation did not occur.</p>
              </div>
            </section>

            {/* Prevention Section */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Prevention: Never Get a Wrongful Ticket Again
              </h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
                <p className="text-lg text-[var(--navy-700)] mb-6">
                  The best ticket dispute is one you never have to make. CityPing sends you automatic alerts before every ASP suspension, so you always know when it's safe to leave your car.
                </p>
                <ul className="space-y-3 text-lg text-[var(--navy-700)] mb-6">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Evening alerts before every ASP suspension</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Save alerts as proof for disputes (if ever needed)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span>Never second-guess holiday parking rules again</span>
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

            {/* FAQ Section */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-6">
                Frequently Asked Questions
              </h2>

              <div className="space-y-6">
                <div className="border-b border-[var(--navy-200)] pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    How long do I have to dispute a NYC parking ticket?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    You have 30 days from the ticket date to dispute without penalty. After 30 days, you can still dispute but the fine increases. After 100 days, the ticket becomes a judgment and is much harder to fight.
                  </p>
                </div>

                <div className="border-b border-[var(--navy-200)] pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    What is the success rate for disputing NYC parking tickets?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    According to NYC Department of Finance data, approximately 35-40% of disputed parking tickets are dismissed. Success rates are higher for ASP violations during suspensions and tickets with factual errors.
                  </p>
                </div>

                <div className="border-b border-[var(--navy-200)] pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    Can I dispute a parking ticket if I already paid it?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Generally, no. Paying a ticket is considered an admission of guilt. However, if you paid by mistake or discovered new evidence, you may be able to request a refund through an appeal. This is difficult and rarely successful.
                  </p>
                </div>

                <div className="pb-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    Do I need a lawyer to dispute a parking ticket?
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    No. The parking ticket dispute process is designed to be accessible without legal representation. However, if you have multiple tickets or a complex case, consulting with a parking ticket attorney may be worthwhile.
                  </p>
                </div>
              </div>
            </section>

            {/* Related Articles */}
            <RelatedArticles
              currentPage="nyc-parking-ticket-dispute"
              title="Related Parking Guides"
            />

            {/* CTA Footer */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Avoid Tickets in the First Place
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                Join NYC drivers who never miss an ASP suspension
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
