import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NYC Parking Rules Complete Guide 2025 - Regulations, Signs & Fines',
  description: 'Comprehensive guide to NYC parking rules and regulations: street cleaning, meters, hydrants, no standing zones, commercial vehicles, and all parking signs explained.',
  keywords: [
    'NYC parking rules',
    'New York parking regulations',
    'NYC parking signs',
    'no standing vs no parking',
    'NYC meter parking',
    'fire hydrant parking NYC',
    'commercial vehicle parking NYC',
    'NYC parking fines'
  ],
  openGraph: {
    title: 'NYC Parking Rules Complete Guide 2025',
    description: 'Master NYC parking regulations: comprehensive guide to all rules, signs, zones, and fines.',
    url: 'https://parkping.net/nyc-parking-rules',
    type: 'article',
  },
  alternates: {
    canonical: 'https://parkping.net/nyc-parking-rules',
  },
}

export default function NYCParkingRules() {
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
        "name": "NYC Parking Rules",
        "item": "https://parkping.net/nyc-parking-rules"
      }
    ]
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NYC Parking Rules Complete Guide 2025",
    "description": "Comprehensive guide to all NYC parking rules, regulations, signs, and fines.",
    "author": {
      "@type": "Organization",
      "name": "ParkPing"
    },
    "publisher": {
      "@type": "Organization",
      "name": "ParkPing",
      "logo": {
        "@type": "ImageObject",
        "url": "https://parkping.net/logo.png"
      }
    },
    "datePublished": "2025-01-01",
    "dateModified": new Date().toISOString().split('T')[0]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
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
              <span>NYC Parking Rules</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              NYC Parking Rules: Complete Guide to Regulations (2025)
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              New York City has some of the most complex parking regulations in the world. This comprehensive guide decodes NYC parking rules, signs, restrictions, and fines to help you navigate the city's parking landscape with confidence.
            </p>

            {/* Quick Navigation */}
            <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-12">
              <h2 className="text-lg font-bold text-[var(--navy-900)] mb-4">Quick Navigation</h2>
              <ul className="grid md:grid-cols-2 gap-2">
                <li><a href="#sign-types" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Understanding Parking Signs</a></li>
                <li><a href="#no-parking-standing-stopping" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">No Parking vs No Standing</a></li>
                <li><a href="#street-cleaning" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Street Cleaning (ASP)</a></li>
                <li><a href="#meters" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Parking Meters</a></li>
                <li><a href="#fire-hydrants" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Fire Hydrants</a></li>
                <li><a href="#commercial-vehicles" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Commercial Vehicles</a></li>
                <li><a href="#residential-zones" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Residential Parking</a></li>
                <li><a href="#fines" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Fines & Penalties</a></li>
              </ul>
            </div>

            {/* Understanding Signs */}
            <section id="sign-types" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Understanding NYC Parking Signs
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                NYC uses a standardized color-coding system for parking signs, developed by the Department of Transportation (DOT). Understanding these colors is the first step to decoding parking regulations.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-green-600 rounded flex-shrink-0"></div>
                    <h3 className="text-xl font-semibold text-[var(--navy-800)]">Green Signs</h3>
                  </div>
                  <p className="text-[var(--navy-700)]">
                    <strong>Permissive parking:</strong> Indicates where and when you ARE allowed to park. Examples: "2 Hour Parking 9AM-7PM Mon-Fri"
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-red-600 rounded flex-shrink-0"></div>
                    <h3 className="text-xl font-semibold text-[var(--navy-800)]">Red Signs</h3>
                  </div>
                  <p className="text-[var(--navy-700)]">
                    <strong>Restrictive parking:</strong> Indicates where you CANNOT park. Examples: "No Parking Anytime," "No Standing Except Trucks"
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gray-600 rounded flex-shrink-0"></div>
                    <h3 className="text-xl font-semibold text-[var(--navy-800)]">Gray/White Signs</h3>
                  </div>
                  <p className="text-[var(--navy-700)]">
                    <strong>Regulatory information:</strong> General parking regulations, meter information, or zone designations.
                  </p>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-yellow-500 rounded flex-shrink-0"></div>
                    <h3 className="text-xl font-semibold text-[var(--navy-800)]">Yellow Signs</h3>
                  </div>
                  <p className="text-[var(--navy-700)]">
                    <strong>Commercial regulations:</strong> Restrictions for commercial vehicles and loading zones.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Pro Tip:</p>
                <p className="text-[var(--navy-700)]">
                  When multiple signs are posted on the same pole, ALL regulations apply simultaneously. You must comply with EVERY sign to avoid a ticket. Always read from top to bottom and check both directions of arrows.
                </p>
              </div>
            </section>

            {/* No Parking vs No Standing */}
            <section id="no-parking-standing-stopping" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                No Parking vs. No Standing vs. No Stopping
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-6 leading-relaxed">
                These three terms represent different levels of parking restrictions, often confused by drivers. Understanding the distinctions is critical for compliance.
              </p>

              <div className="space-y-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-6">
                  <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                    NO STOPPING
                  </h3>
                  <p className="text-[var(--navy-700)] mb-3">
                    <strong>Most restrictive.</strong> Your vehicle cannot stop at any time, even momentarily. This includes:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-[var(--navy-700)] mb-3">
                    <li>Cannot park</li>
                    <li>Cannot stand (wait in vehicle)</li>
                    <li>Cannot stop to load/unload passengers or goods</li>
                  </ul>
                  <p className="text-sm text-[var(--navy-600)] italic">
                    Exceptions: Emergency vehicles only, or when complying with traffic officer directions.
                  </p>
                  <p className="text-[var(--navy-800)] font-semibold mt-3">Fine: $115</p>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-500 p-6">
                  <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                    NO STANDING
                  </h3>
                  <p className="text-[var(--navy-700)] mb-3">
                    <strong>Moderately restrictive.</strong> You can stop briefly, but cannot wait or park. This means:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-[var(--navy-700)] mb-3">
                    <li>Cannot park and leave vehicle</li>
                    <li>Cannot wait in vehicle (driver must not remain)</li>
                    <li>CAN stop momentarily to pick up/drop off passengers</li>
                    <li>CAN stop briefly for emergency situations</li>
                  </ul>
                  <p className="text-sm text-[var(--navy-600)] italic">
                    Common locations: Bus stops, taxi stands, fire zones.
                  </p>
                  <p className="text-[var(--navy-800)] font-semibold mt-3">Fine: $115</p>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
                  <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                    NO PARKING
                  </h3>
                  <p className="text-[var(--navy-700)] mb-3">
                    <strong>Least restrictive.</strong> You cannot leave your vehicle unattended, but can stand or stop. This means:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-[var(--navy-700)] mb-3">
                    <li>Cannot park and walk away from vehicle</li>
                    <li>CAN wait in vehicle with driver present</li>
                    <li>CAN actively load/unload passengers or goods (if driver stays)</li>
                    <li>Must be able to move vehicle immediately if requested</li>
                  </ul>
                  <p className="text-sm text-[var(--navy-600)] italic">
                    Common locations: Alternate side parking zones, commercial loading areas during certain hours.
                  </p>
                  <p className="text-[var(--navy-800)] font-semibold mt-3">Fine: $45-$65 (varies by violation type)</p>
                </div>
              </div>

              <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mt-6">
                <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                  Memory Aid: The Hierarchy of Restrictions
                </h3>
                <p className="text-[var(--navy-700)] mb-2">Think of it as levels of permission:</p>
                <ol className="list-decimal list-inside space-y-2 text-[var(--navy-700)]">
                  <li><strong>Parking</strong> = leaving vehicle unattended</li>
                  <li><strong>Standing</strong> = waiting in vehicle (but vehicle is stationary)</li>
                  <li><strong>Stopping</strong> = vehicle is momentarily stationary</li>
                </ol>
                <p className="text-[var(--navy-700)] mt-3">
                  "No Stopping" prohibits all three. "No Standing" prohibits parking and standing. "No Parking" only prohibits parking.
                </p>
              </div>
            </section>

            {/* Street Cleaning / ASP */}
            <section id="street-cleaning" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Street Cleaning (Alternate Side Parking)
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Alternate Side Parking (ASP) regulations are the most common parking restriction NYC drivers encounter. These rules facilitate street cleaning operations.
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8 mb-6">
                <h3 className="text-2xl font-semibold text-[var(--navy-900)] mb-4">
                  Key ASP Facts
                </h3>
                <ul className="space-y-3 text-lg text-[var(--navy-700)]">
                  <li className="flex items-start">
                    <span className="text-blue-600 font-bold mr-3">•</span>
                    <span><strong>6,000+ miles</strong> of NYC streets are cleaned under ASP regulations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 font-bold mr-3">•</span>
                    <span><strong>28-30 suspensions</strong> per year on holidays and religious observances</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 font-bold mr-3">•</span>
                    <span><strong>$65 fine</strong> for ASP violations (increases if unpaid)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 font-bold mr-3">•</span>
                    <span><strong>90-second rule:</strong> You can stay in your car and move when asked</span>
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-blue-300">
                  <Link
                    href="/nyc-alternate-side-parking-guide"
                    className="inline-block px-6 py-3 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold"
                  >
                    Read Complete ASP Guide
                  </Link>
                  <Link
                    href="/asp-suspension-calendar"
                    className="inline-block ml-4 px-6 py-3 bg-white text-[var(--navy-800)] border-2 border-[var(--navy-800)] rounded-md hover:bg-[var(--navy-50)] transition-colors font-semibold"
                  >
                    View Suspension Calendar
                  </Link>
                </div>
              </div>
            </section>

            {/* Meters */}
            <section id="meters" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Parking Meters
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                NYC operates approximately 85,000 parking meters across the five boroughs, managed by the DOT. Meter regulations vary by location and time.
              </p>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Meter Operating Hours
              </h3>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-3">Manhattan (Below 96th St)</h4>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li><strong>Mon-Sat:</strong> 8:00 AM - 10:00 PM</li>
                    <li><strong>Sunday:</strong> 12:00 PM - 10:00 PM (in most areas)</li>
                    <li><strong>Rate range:</strong> $1.50 - $7.50/hour</li>
                    <li><strong>Max time:</strong> Usually 2-3 hours</li>
                  </ul>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-3">Outer Boroughs</h4>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li><strong>Mon-Sat:</strong> 8:00 AM - 7:00 PM (typical)</li>
                    <li><strong>Sunday:</strong> Often free or limited hours</li>
                    <li><strong>Rate range:</strong> $1.00 - $4.00/hour</li>
                    <li><strong>Max time:</strong> Usually 3-4 hours</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Payment Methods
              </h3>
              <ul className="list-disc list-inside space-y-2 mb-6 text-lg text-[var(--navy-700)]">
                <li><strong>Muni-Meters:</strong> Credit/debit cards, coins (print receipt, display on dashboard)</li>
                <li><strong>ParkNYC App:</strong> Mobile payment, extend time remotely</li>
                <li><strong>Single-space meters:</strong> Coins only (older meters, being phased out)</li>
              </ul>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Important:</p>
                <p className="text-[var(--navy-700)] mb-2">
                  Meter regulations are SEPARATE from ASP regulations. Even if ASP is suspended on a holiday, you still must pay meters unless specifically indicated otherwise.
                </p>
                <p className="text-[var(--navy-700)]">
                  <strong>Expired meter fine: $65</strong> (increases to $80 after 30 days)
                </p>
              </div>
            </section>

            {/* Fire Hydrants */}
            <section id="fire-hydrants" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Fire Hydrant Parking Rules
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                One of NYC's most strictly enforced parking regulations concerns fire hydrants. The rules are straightforward but frequently violated.
              </p>

              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 mb-6">
                <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                  The 15-Foot Rule
                </h3>
                <p className="text-[var(--navy-700)] mb-4 text-lg">
                  Vehicles must park at least <strong>15 feet away</strong> from a fire hydrant. This applies to BOTH sides of the hydrant (front and back).
                </p>
                <ul className="space-y-2 text-[var(--navy-700)]">
                  <li className="flex items-start">
                    <span className="mr-2">✗</span>
                    <span>Cannot park even partially within 15 feet</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✗</span>
                    <span>Cannot "stand" or wait in vehicle near hydrant</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✗</span>
                    <span>No exceptions during emergencies, holidays, or ASP suspensions</span>
                  </li>
                </ul>
                <p className="text-[var(--navy-800)] font-semibold mt-4 text-xl">Fine: $115</p>
                <p className="text-sm text-[var(--navy-600)] mt-2">
                  Additionally, your vehicle may be towed immediately if blocking hydrant access during a fire emergency.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">How to Measure 15 Feet:</p>
                <p className="text-[var(--navy-700)]">
                  15 feet is approximately the length of a standard sedan (4-5 car doors). If you can see the hydrant in your side view mirror, you're too close. When in doubt, leave more space.
                </p>
              </div>
            </section>

            {/* Commercial Vehicles */}
            <section id="commercial-vehicles" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Commercial Vehicle Regulations
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Commercial vehicles face additional parking restrictions in NYC, designed to reduce congestion and preserve residential parking.
              </p>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                What Qualifies as a Commercial Vehicle?
              </h3>
              <ul className="list-disc list-inside space-y-2 mb-6 text-lg text-[var(--navy-700)]">
                <li>Vehicles with commercial plates</li>
                <li>Trucks and vans over 10,000 lbs GVWR</li>
                <li>Vehicles with advertising or business markings</li>
                <li>Vehicles designed for commercial purposes (delivery vans, box trucks, etc.)</li>
              </ul>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Commercial Parking Restrictions
              </h3>
              <div className="space-y-4 mb-6">
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-2">
                    Overnight Restrictions (9 PM - 5 AM)
                  </h4>
                  <p className="text-[var(--navy-700)]">
                    Commercial vehicles cannot park overnight on residential streets in most neighborhoods without a valid permit. This applies city-wide unless specifically exempted by signage.
                  </p>
                  <p className="text-[var(--navy-800)] font-semibold mt-2">Fine: $95-$180</p>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-2">
                    Three-Hour Daytime Limit
                  </h4>
                  <p className="text-[var(--navy-700)]">
                    Commercial vehicles are limited to 3 hours of parking on most commercial streets during business hours, even with meter payment.
                  </p>
                  <p className="text-[var(--navy-800)] font-semibold mt-2">Fine: $65</p>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-2">
                    Designated Loading Zones
                  </h4>
                  <p className="text-[var(--navy-700)]">
                    Yellow "Commercial Vehicles Only" signs designate loading zones. Passenger vehicles cannot use these spaces, even briefly.
                  </p>
                  <p className="text-[var(--navy-800)] font-semibold mt-2">Fine (passenger vehicle): $115</p>
                </div>
              </div>
            </section>

            {/* Residential Zones */}
            <section id="residential-zones" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Residential Parking Permits & Zones
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Certain NYC neighborhoods have implemented residential parking permit programs to prioritize parking for local residents.
              </p>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Current Permit Areas
              </h3>
              <ul className="list-disc list-inside space-y-2 mb-6 text-lg text-[var(--navy-700)]">
                <li><strong>Staten Island:</strong> Multiple permit zones in residential areas</li>
                <li><strong>Brooklyn:</strong> Select neighborhoods (Bay Ridge, Carroll Gardens)</li>
                <li><strong>Queens:</strong> Limited areas (Douglaston, Little Neck)</li>
                <li><strong>Manhattan/Bronx:</strong> Few permit zones currently</li>
              </ul>

              <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                  How Residential Permits Work
                </h3>
                <ul className="space-y-2 text-[var(--navy-700)]">
                  <li>• Residents apply through NYC DOT with proof of residency</li>
                  <li>• Permits typically cost $35-50 for 1-2 years</li>
                  <li>• Permits allow parking in designated residential zones</li>
                  <li>• Non-permit holders can park for limited time (1-2 hours typically)</li>
                  <li>• Visitor permits available in some zones</li>
                </ul>
                <p className="text-[var(--navy-800)] font-semibold mt-4">
                  Fine for parking without permit in permit zone: $65
                </p>
              </div>
            </section>

            {/* Fines Reference */}
            <section id="fines" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                NYC Parking Fines Reference (2025)
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-6 leading-relaxed">
                Comprehensive list of common parking violation fines. All fines increase by $15-30 if not paid within 30 days.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-[var(--navy-300)]">
                  <thead className="bg-[var(--navy-800)] text-white">
                    <tr>
                      <th className="border border-[var(--navy-300)] px-4 py-3 text-left">Violation Type</th>
                      <th className="border border-[var(--navy-300)] px-4 py-3 text-left">Fine Amount</th>
                      <th className="border border-[var(--navy-300)] px-4 py-3 text-left">Common Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="border border-[var(--navy-300)] px-4 py-3">Fire Hydrant (within 15 ft)</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$115</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">40</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-300)] px-4 py-3">No Standing/Stopping Zone</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$115</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">48</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-[var(--navy-300)] px-4 py-3">Double Parking</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$115</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">46</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-300)] px-4 py-3">Crosswalk/Intersection</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$115</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">47</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-[var(--navy-300)] px-4 py-3">Bus Stop</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$115</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">52</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-300)] px-4 py-3">Bike Lane</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$115</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">50</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-[var(--navy-300)] px-4 py-3">Alternate Side Parking (ASP)</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$65</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">21</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-300)] px-4 py-3">Expired Meter</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$65</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">14</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-[var(--navy-300)] px-4 py-3">No Parking Zone</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$45-$65</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">20, 38</td>
                    </tr>
                    <tr className="bg-[var(--navy-50)]">
                      <td className="border border-[var(--navy-300)] px-4 py-3">Handicapped Zone</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$180</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">71</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-[var(--navy-300)] px-4 py-3">Commercial Vehicle Overnight</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3 font-semibold">$95-$180</td>
                      <td className="border border-[var(--navy-300)] px-4 py-3">77, 78</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-6 mt-6">
                <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                  Additional Consequences of Unpaid Tickets
                </h3>
                <ul className="space-y-2 text-[var(--navy-700)]">
                  <li>• <strong>30 days:</strong> Fine increases by $15-30</li>
                  <li>• <strong>90 days:</strong> Additional late penalties and interest</li>
                  <li>• <strong>100 days:</strong> Judgment entered, collections process begins</li>
                  <li>• <strong>Multiple tickets:</strong> Vehicle may be booted or towed</li>
                  <li>• <strong>$350+ in tickets:</strong> Registration suspended by DMV</li>
                  <li>• <strong>Collections:</strong> Credit score impact, wage garnishment possible</li>
                </ul>
              </div>
            </section>

            {/* Pro Tips */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Advanced Strategies for NYC Parking
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    1. Master the "Hierarchy of Signs"
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    When multiple regulations conflict, the most restrictive always applies. Read ALL signs on a pole, check both directions, and comply with every restriction simultaneously.
                  </p>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    2. Use Technology
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    ParkNYC app for meter extensions, ParkPing for ASP suspension alerts. Set phone reminders for your regular ASP days.
                  </p>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    3. Document Everything
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    If ticketed unfairly, photograph: your vehicle position, all nearby signs, meter receipt, and time stamp. These are crucial for successful appeals.
                  </p>
                </div>

                <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    4. Financial Optimization
                  </h3>
                  <p className="text-[var(--navy-700)]">
                    Calculate total annual parking costs (meters + tickets + time). Monthly garage may be more cost-effective and preserve wealth better than street parking.
                  </p>
                </div>
              </div>
            </section>

            {/* Related Resources */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-6">
                Related Resources
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
                    Deep dive into alternate side parking rules, suspensions, and strategies.
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
                    Complete 2025 calendar of all ASP suspensions and holidays.
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
                    Special rules during NYC snow emergencies and winter weather events.
                  </p>
                </Link>

                <Link
                  href="/faq"
                  className="block bg-white border-2 border-[var(--navy-200)] rounded-lg p-6 hover:border-[var(--navy-400)] transition-colors"
                >
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    FAQ
                  </h3>
                  <p className="text-[var(--navy-600)]">
                    Answers to common NYC parking and ParkPing questions.
                  </p>
                </Link>
              </div>
            </section>

            {/* CTA */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Never Miss an ASP Suspension
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                Get automatic alerts for ASP suspensions, weekly previews, and monthly calendars
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
