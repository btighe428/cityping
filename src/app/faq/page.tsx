import { Metadata } from 'next'
import Link from 'next/link'
import FAQ from '@/components/FAQ'

export const metadata: Metadata = {
  title: 'FAQ - ParkPing NYC Alternate Side Parking Alerts',
  description: 'Frequently asked questions about ParkPing, NYC alternate side parking alerts, ASP suspensions, pricing, and how our SMS/email notification service works.',
  keywords: [
    'ParkPing FAQ',
    'ASP alerts FAQ',
    'NYC parking questions',
    'alternate side parking help',
    'ParkPing how it works',
    'parking alert service NYC'
  ],
  openGraph: {
    title: 'FAQ - ParkPing',
    description: 'Get answers to common questions about ParkPing and NYC alternate side parking alerts.',
    url: 'https://parkping.net/faq',
    type: 'website',
  },
  alternates: {
    canonical: 'https://parkping.net/faq',
  },
}

export default function FAQPage() {
  // Extended FAQ data for the full page
  const extendedFaqs = [
    {
      question: 'How does ParkPing work?',
      answer: 'ParkPing monitors NYC\'s official alternate side parking calendar maintained by the Department of Sanitation. When ASP is suspended (holidays, religious observances, etc.), we send you an SMS text and/or email alert the evening before. You\'ll also receive weekly previews and monthly calendars so you can plan ahead.'
    },
    {
      question: 'What types of alerts will I receive?',
      answer: 'You receive three types of alerts: (1) Evening alerts the night before ASP suspensions, (2) Weekly preview texts showing upcoming suspensions, and (3) Monthly calendar emails for long-term planning. We also send congestion pricing updates and important NYC parking news.'
    },
    {
      question: 'When exactly do alerts arrive?',
      answer: 'Suspension alerts are sent between 6:00 PM and 8:00 PM the evening before an ASP suspension day. This gives you time to adjust your plans without worrying about moving your car the next morning. Weekly previews arrive on Sunday evenings, and monthly calendars arrive on the first day of each month.'
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes! You have complete control over your subscription. You can cancel anytime by texting STOP to unsubscribe from SMS alerts, or manage your billing through the customer portal link we send you. There are no cancellation fees or penalties.'
    },
    {
      question: 'What about snow days and emergency suspensions?',
      answer: 'We cover all scheduled ASP suspensions (holidays, religious observances). Emergency suspensions like snow days are on our roadmap. When NYC declares a snow emergency or issues an emergency ASP suspension, we\'ll alert you immediately once this feature is live.'
    },
    {
      question: 'Is my information safe and private?',
      answer: 'Absolutely. We only store your phone number and email address (for receipts). We never share, sell, or trade your data with third parties. All payments are processed securely through Stripe, and we never see or store your credit card information. Your privacy is our priority.'
    },
    {
      question: 'What if I don\'t reply YES to the confirmation text?',
      answer: 'After signing up, we\'ll text you asking to confirm by replying YES. This is required by SMS regulations. If you don\'t confirm, you won\'t receive alerts. You can text YES anytime later to activate your subscription - your account remains active.'
    },
    {
      question: 'How much does ParkPing cost?',
      answer: 'ParkPing is currently FREE during our beta period. We\'re perfecting the service before introducing paid plans. When we do launch pricing, existing beta users will receive special lifetime discounts as a thank you for being early adopters.'
    },
    {
      question: 'Does this work in all five boroughs?',
      answer: 'Yes! ParkPing covers all five NYC boroughs: Manhattan, Brooklyn, Queens, The Bronx, and Staten Island. ASP suspensions are city-wide, so when it\'s suspended in one borough, it\'s suspended everywhere.'
    },
    {
      question: 'What if I get a ticket on a day you said ASP was suspended?',
      answer: 'While extremely rare, if ASP rules were actually suspended and you received a ticket, you should contest it with NYC. We source our data directly from the NYC Department of Sanitation\'s official calendar. Keep our alert as evidence. That said, remember that meter rules still apply even when ASP is suspended.'
    },
    {
      question: 'Do I still need to pay parking meters when ASP is suspended?',
      answer: 'YES! This is a common misconception. ASP suspension only means you don\'t need to move your car for street cleaning. Parking meter regulations remain in effect unless it\'s a legal holiday when meters are also suspended. Always check the meter signage.'
    },
    {
      question: 'Can I sign up for multiple phone numbers?',
      answer: 'Currently, each subscription covers one phone number. If you want alerts sent to multiple numbers (e.g., you and your spouse), you\'ll need separate subscriptions for each number. We\'re considering family plans for the future.'
    },
    {
      question: 'What if I\'m going on vacation?',
      answer: 'You can pause your subscription by texting STOP and restart by texting START when you return. Or, keep receiving alerts - they might help you plan if someone is checking on your car while you\'re away, or if you need to arrange for someone to move it.'
    },
    {
      question: 'Do you cover parking in other cities?',
      answer: 'Currently, ParkPing only covers New York City. However, we\'re exploring expansion to other cities with alternate side parking programs, including Boston, Philadelphia, Chicago, and Washington DC. Sign up for NYC to be notified when we expand.'
    },
    {
      question: 'How reliable is your alert system?',
      answer: 'Extremely reliable. We use enterprise-grade infrastructure with multiple redundancies. Our alerts are sent through Twilio, the industry-leading SMS platform used by companies like Uber and Airbnb. We also monitor the NYC calendar multiple times per day to catch any last-minute changes.'
    },
    {
      question: 'What happens if I change my phone number?',
      answer: 'Contact us at support@parkping.net with your old and new phone numbers, and we\'ll update your account. You can also manage this through your customer portal. Your subscription history and billing remain unchanged.'
    },
    {
      question: 'Can I receive email alerts instead of SMS?',
      answer: 'You receive both SMS and email alerts by default. If you prefer email-only, you can unsubscribe from SMS by texting STOP, and you\'ll continue receiving email alerts. Most users prefer SMS for the immediacy, but the choice is yours.'
    },
    {
      question: 'How far in advance are suspension dates known?',
      answer: 'Most suspension dates are known months in advance since they\'re based on the federal and religious holiday calendar. The NYC Department of Sanitation publishes the schedule at the beginning of each year. We load these dates into our system and monitor for any updates or changes.'
    },
    {
      question: 'What if NYC changes the ASP schedule last-minute?',
      answer: 'We monitor the official NYC calendar multiple times daily. If the city makes a last-minute change (rare but possible), we\'ll send an updated alert immediately. We also monitor NYC emergency management announcements for weather-related suspensions.'
    },
    {
      question: 'Is ParkPing affiliated with NYC government?',
      answer: 'No, ParkPing is an independent service not affiliated with NYC government. We source our data from public NYC Department of Sanitation calendars and provide a convenient alert service. We\'re a private company helping NYC drivers avoid parking tickets.'
    }
  ]

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://parkping.net"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "FAQ",
        "item": "https://parkping.net/faq"
      }
    ]
  }

  const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": extendedFaqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />

      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="py-4 px-6 border-b border-[var(--navy-100)]">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-[var(--navy-800)] hover:text-[var(--navy-900)]">
              ParkPing
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
              <span>FAQ</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              Frequently Asked Questions
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-12 leading-relaxed">
              Everything you need to know about ParkPing, NYC alternate side parking alerts, and how our service helps you avoid parking tickets.
            </p>

            {/* FAQ Component from home page */}
            <section className="mb-16">
              <FAQ />
            </section>

            {/* Extended FAQs */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-8">
                More Questions & Answers
              </h2>

              <div className="space-y-8">
                {/* Service & Features */}
                <div>
                  <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-4 pb-2 border-b-2 border-[var(--navy-200)]">
                    Service & Features
                  </h3>
                  <div className="space-y-6">
                    {extendedFaqs.slice(0, 5).map((faq, index) => (
                      <div key={index} className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-3">
                          {faq.question}
                        </h4>
                        <p className="text-[var(--navy-700)] leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account & Billing */}
                <div>
                  <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-4 pb-2 border-b-2 border-[var(--navy-200)]">
                    Account & Billing
                  </h3>
                  <div className="space-y-6">
                    {extendedFaqs.slice(5, 10).map((faq, index) => (
                      <div key={index} className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-3">
                          {faq.question}
                        </h4>
                        <p className="text-[var(--navy-700)] leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical & Reliability */}
                <div>
                  <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-4 pb-2 border-b-2 border-[var(--navy-200)]">
                    Technical & Reliability
                  </h3>
                  <div className="space-y-6">
                    {extendedFaqs.slice(10, 15).map((faq, index) => (
                      <div key={index} className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-3">
                          {faq.question}
                        </h4>
                        <p className="text-[var(--navy-700)] leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ASP Rules & Regulations */}
                <div>
                  <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-4 pb-2 border-b-2 border-[var(--navy-200)]">
                    ASP Rules & Regulations
                  </h3>
                  <div className="space-y-6">
                    {extendedFaqs.slice(15).map((faq, index) => (
                      <div key={index} className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-3">
                          {faq.question}
                        </h4>
                        <p className="text-[var(--navy-700)] leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Related Resources */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-6">
                Learn More About NYC Parking
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
                    Master alternate side parking rules, regulations, and strategies.
                  </p>
                </Link>

                <Link
                  href="/asp-suspension-calendar"
                  className="block bg-white border-2 border-[var(--navy-200)] rounded-lg p-6 hover:border-[var(--navy-400)] transition-colors"
                >
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    ASP Suspension Calendar
                  </h3>
                  <p className="text-[var(--navy-600)]">
                    View all 2025 ASP suspension dates and holidays.
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
                    Complete guide to all NYC parking regulations and signs.
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
                    Special parking rules during NYC snow emergencies.
                  </p>
                </Link>
              </div>
            </section>

            {/* CTA */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Stop Worrying About ASP?
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                Join 1,000+ NYC drivers who never miss an ASP suspension
              </p>
              <Link
                href="/"
                className="inline-block px-8 py-4 bg-white text-[var(--navy-800)] rounded-md hover:bg-blue-50 transition-colors font-semibold text-lg"
              >
                Sign Up for Free Alerts
              </Link>
            </section>
          </article>
        </main>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-[var(--navy-100)] mt-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-[var(--navy-800)] mb-3">ParkPing</h3>
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
                  <li><a href="mailto:support@parkping.net" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Contact</a></li>
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
