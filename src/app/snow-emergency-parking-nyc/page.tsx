import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NYC Snow Emergency Parking Rules & Regulations 2025',
  description: 'Complete guide to NYC snow emergency parking rules: when snow emergencies are declared, where you can and cannot park, fines, and how ASP suspensions work during winter weather.',
  keywords: [
    'NYC snow emergency parking',
    'snow emergency NYC',
    'winter parking NYC',
    'snow emergency rules',
    'NYC snow parking ban',
    'alternate side parking snow',
    'snow emergency fines NYC'
  ],
  openGraph: {
    title: 'NYC Snow Emergency Parking Rules 2025',
    description: 'Essential guide to parking during NYC snow emergencies: rules, restrictions, and how to avoid tickets.',
    url: 'https://cityping.net/snow-emergency-parking-nyc',
    type: 'article',
  },
  alternates: {
    canonical: 'https://cityping.net/snow-emergency-parking-nyc',
  },
}

export default function SnowEmergencyParking() {
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
        "name": "Snow Emergency Parking NYC",
        "item": "https://cityping.net/snow-emergency-parking-nyc"
      }
    ]
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "NYC Snow Emergency Parking Rules & Regulations 2025",
    "description": "Complete guide to NYC snow emergency parking rules and winter weather parking regulations.",
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
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-[var(--navy-600)]">
              <Link href="/" className="hover:text-[var(--navy-800)]">Home</Link>
              <span className="mx-2">/</span>
              <span>Snow Emergency Parking NYC</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--navy-900)] mb-6">
              NYC Snow Emergency Parking: Complete Winter Weather Guide
            </h1>

            <p className="text-xl text-[var(--navy-600)] mb-8 leading-relaxed">
              When winter storms hit New York City, special snow emergency parking rules take effect to facilitate snow removal operations. Understanding these regulations is crucial for avoiding tickets, towing, and contributing to efficient snow clearing.
            </p>

            {/* Emergency Alert Box */}
            <div className="bg-blue-600 text-white rounded-lg p-6 mb-12">
              <h2 className="text-2xl font-bold mb-3">Snow Emergency Declarations</h2>
              <p className="text-lg mb-4">
                The NYC Office of Emergency Management (OEM) declares snow emergencies when significant winter weather is forecast. CityPing subscribers receive immediate alerts when snow emergencies are declared.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-semibold"
              >
                Get Snow Emergency Alerts
              </Link>
            </div>

            {/* Quick Navigation */}
            <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-12">
              <h2 className="text-lg font-bold text-[var(--navy-900)] mb-4">Quick Navigation</h2>
              <ul className="grid md:grid-cols-2 gap-2">
                <li><a href="#what-is-snow-emergency" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">What is a Snow Emergency?</a></li>
                <li><a href="#parking-restrictions" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Parking Restrictions</a></li>
                <li><a href="#designated-routes" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Designated Snow Routes</a></li>
                <li><a href="#asp-during-snow" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">ASP During Snow</a></li>
                <li><a href="#fines-towing" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Fines & Towing</a></li>
                <li><a href="#where-to-park" className="text-[var(--navy-700)] hover:text-[var(--navy-900)]">Where to Park</a></li>
              </ul>
            </div>

            {/* What is a Snow Emergency */}
            <section id="what-is-snow-emergency" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                What is a Snow Emergency?
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                A snow emergency is officially declared by NYC's Office of Emergency Management when a significant winter storm is forecast. The declaration triggers special parking and traffic rules designed to facilitate rapid snow removal from critical transportation corridors.
              </p>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                When Are Snow Emergencies Declared?
              </h3>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                Snow emergencies are typically declared when:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-6 text-lg text-[var(--navy-700)]">
                <li>Forecast predicts 6+ inches of snow accumulation</li>
                <li>Heavy snowfall combined with high winds creates blizzard conditions</li>
                <li>Ice storms threaten to create hazardous road conditions</li>
                <li>Multiple weather factors combined threaten city operations</li>
              </ul>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-6">
                <p className="text-[var(--navy-800)] font-semibold mb-2">Historical Context:</p>
                <p className="text-[var(--navy-700)]">
                  NYC's snow emergency protocols were significantly enhanced after the 2010 post-Christmas blizzard, which paralyzed the city due to inadequate snow removal. The current system prioritizes clearing of 1,700+ miles of "critical routes" within 12 hours of snowfall ending.
                </p>
              </div>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                How to Know When a Snow Emergency is Active
              </h3>
              <ul className="list-disc list-inside space-y-2 mb-6 text-lg text-[var(--navy-700)]">
                <li><strong>NYC Notify:</strong> Official emergency notification system (register at notify.nyc)</li>
                <li><strong>311:</strong> Call 311 for current snow emergency status</li>
                <li><strong>NYC.gov:</strong> Check the homepage for emergency banners</li>
                <li><strong>CityPing:</strong> Automatic SMS/email alerts when emergencies are declared</li>
                <li><strong>Local news:</strong> All major news outlets report snow emergency declarations</li>
              </ul>
            </section>

            {/* Parking Restrictions */}
            <section id="parking-restrictions" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Snow Emergency Parking Restrictions
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-6 leading-relaxed">
                During declared snow emergencies, special parking restrictions take effect immediately. These rules are MORE restrictive than standard parking regulations and are strictly enforced.
              </p>

              <div className="space-y-6">
                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
                  <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                    Primary Restriction: Designated Snow Routes
                  </h3>
                  <p className="text-[var(--navy-700)] mb-4 text-lg">
                    <strong>NO PARKING</strong> is allowed on designated snow emergency routes during an active emergency. These routes are marked with special blue and white "Snow Emergency Route" signs.
                  </p>
                  <div className="bg-white border border-red-300 rounded p-4 mb-4">
                    <p className="font-semibold text-[var(--navy-800)] mb-2">Signs read:</p>
                    <p className="text-[var(--navy-700)]">"NO PARKING ANYTIME - SNOW EMERGENCY ROUTE - TOW AWAY ZONE"</p>
                  </div>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>• Restriction begins immediately upon emergency declaration</li>
                    <li>• Remains in effect until emergency is officially lifted</li>
                    <li>• Applies 24/7 during emergency period</li>
                    <li>• Violations result in immediate towing (not just tickets)</li>
                  </ul>
                  <p className="text-[var(--navy-800)] font-semibold mt-4 text-xl">Fine: $95 + towing fees ($185+)</p>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6">
                  <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                    Additional Winter Parking Rules
                  </h3>
                  <p className="text-[var(--navy-700)] mb-4">
                    Even without a declared emergency, NYC has year-round winter parking restrictions:
                  </p>
                  <ul className="space-y-3 text-[var(--navy-700)]">
                    <li>
                      <strong>Cannot park within 15 feet of fire hydrants</strong> - This rule is especially critical during snow events when hydrants may be buried. Clear snow from nearby hydrants if possible.
                    </li>
                    <li>
                      <strong>Commercial vehicles</strong> - Face additional restrictions during snow emergencies. Cannot park on residential streets overnight.
                    </li>
                    <li>
                      <strong>No parking on snow-covered crosswalks</strong> - Even if your normal spot, cannot park if crosswalk is not visible due to snow.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Designated Routes */}
            <section id="designated-routes" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Understanding Designated Snow Routes
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                NYC has designated approximately 1,700 miles of streets as critical snow routes. These represent the primary transportation network that must remain clear for emergency vehicles, buses, and essential traffic.
              </p>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                What Streets Are Snow Routes?
              </h3>
              <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-6">
                <p className="text-[var(--navy-700)] mb-4">
                  Snow emergency routes typically include:
                </p>
                <ul className="list-disc list-inside space-y-2 text-[var(--navy-700)]">
                  <li>Major avenues and boulevards</li>
                  <li>Bus routes (all NYC Transit bus routes)</li>
                  <li>Hospital access roads</li>
                  <li>Routes to emergency services (fire, police, EMS stations)</li>
                  <li>Primary commercial corridors</li>
                  <li>Bridges and major thoroughfares</li>
                </ul>
              </div>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                How to Identify Snow Routes
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-3">Visual Identification</h4>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>• Blue and white signs reading "Snow Emergency Route"</li>
                    <li>• Usually posted at corners and mid-block</li>
                    <li>• Look for "Tow Away Zone" text</li>
                    <li>• Signs visible from both directions</li>
                  </ul>
                </div>
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-[var(--navy-800)] mb-3">Online Resources</h4>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>• NYC DOT website has interactive map</li>
                    <li>• 311 can confirm if a specific street is designated</li>
                    <li>• Most major avenues are snow routes</li>
                    <li>• When in doubt, assume YES</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* ASP During Snow */}
            <section id="asp-during-snow" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Alternate Side Parking During Snow Events
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-4 leading-relaxed">
                The relationship between snow events and alternate side parking (ASP) can be confusing. Here's how it works:
              </p>

              <div className="space-y-6">
                <div className="bg-green-50 border-l-4 border-green-500 p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    Scenario 1: Snow Emergency Declared
                  </h3>
                  <p className="text-[var(--navy-700)] mb-2">
                    When a snow emergency is officially declared:
                  </p>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>• <strong>ASP is typically SUSPENDED</strong> - You don't need to move for street cleaning</li>
                    <li>• <strong>BUT</strong> - Snow emergency route restrictions take precedence</li>
                    <li>• <strong>Result:</strong> If your street is a snow route, you MUST move despite ASP suspension</li>
                    <li>• <strong>If not on snow route:</strong> You can stay parked (ASP suspended)</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    Scenario 2: Heavy Snow But No Emergency Declared
                  </h3>
                  <p className="text-[var(--navy-700)] mb-2">
                    If it snows heavily but no emergency is declared:
                  </p>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>• <strong>ASP remains IN EFFECT</strong> - You must move for street cleaning</li>
                    <li>• Street sweepers may not operate, but enforcement continues</li>
                    <li>• You can still receive tickets for not moving</li>
                    <li>• Always check for official suspension announcements</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    Scenario 3: Day After Snow Event
                  </h3>
                  <p className="text-[var(--navy-700)] mb-2">
                    Post-storm parking can be complex:
                  </p>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>• Snow emergency restrictions may remain active for 24-48 hours after snow stops</li>
                    <li>• ASP may resume while snow routes are still restricted</li>
                    <li>• Snow piles may physically block legal spots</li>
                    <li>• Cannot park in spaces made by private snow removal</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8 mt-6">
                <h3 className="text-2xl font-semibold text-[var(--navy-900)] mb-4">
                  CityPing Solves the Confusion
                </h3>
                <p className="text-lg text-[var(--navy-700)] mb-4">
                  Tracking both ASP suspensions AND snow emergency declarations is complex. CityPing monitors both and sends you clear, actionable alerts:
                </p>
                <ul className="space-y-2 text-[var(--navy-700)] mb-6">
                  <li>• "Snow emergency declared - check if you're on a snow route"</li>
                  <li>• "ASP suspended today due to holiday"</li>
                  <li>• "Snow emergency lifted, ASP resumes tomorrow"</li>
                </ul>
                <Link
                  href="/"
                  className="inline-block px-8 py-4 bg-[var(--navy-800)] text-white rounded-md hover:bg-[var(--navy-900)] transition-colors font-semibold text-lg"
                >
                  Get Smart Parking Alerts
                </Link>
              </div>
            </section>

            {/* Fines and Towing */}
            <section id="fines-towing" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Snow Emergency Fines and Towing
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-6 leading-relaxed">
                Snow emergency parking violations are taken very seriously because they directly impede emergency response and snow removal operations.
              </p>

              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 mb-6">
                <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-4">
                  Financial Consequences
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold text-[var(--navy-800)]">Parking ticket: $95</p>
                    <p className="text-sm text-[var(--navy-600)]">For parking on snow emergency route during active emergency</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[var(--navy-800)]">Towing fee: $185+</p>
                    <p className="text-sm text-[var(--navy-600)]">Base towing charge (varies by borough and vehicle size)</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[var(--navy-800)]">Storage fees: $20/day</p>
                    <p className="text-sm text-[var(--navy-600)]">Accrues daily while vehicle is in impound</p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-red-300">
                    <p className="text-2xl font-bold text-[var(--navy-900)]">Total first-day cost: $280-$300+</p>
                    <p className="text-sm text-[var(--navy-600)] mt-1">Not including time lost retrieving vehicle and potential late payment penalties</p>
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-semibold text-[var(--navy-800)] mb-3">
                Towing Process
              </h3>
              <ol className="list-decimal list-inside space-y-3 mb-6 text-lg text-[var(--navy-700)]">
                <li>Vehicle is ticketed for snow emergency violation</li>
                <li>NYPD or DOT arranges immediate towing (no grace period)</li>
                <li>Vehicle transported to impound facility</li>
                <li>Owner must pay all fines + towing + storage fees before release</li>
                <li>Must retrieve vehicle during impound facility hours (may require time off work)</li>
              </ol>

              <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6">
                <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                  Finding Your Towed Vehicle
                </h3>
                <ul className="space-y-2 text-[var(--navy-700)]">
                  <li>• Call 311 and provide license plate number</li>
                  <li>• Check online: nyc.gov/finance (search by plate or VIN)</li>
                  <li>• Tow pound locations vary by borough</li>
                  <li>• Bring: valid ID, vehicle registration, proof of insurance, payment method</li>
                </ul>
              </div>
            </section>

            {/* Where to Park */}
            <section id="where-to-park" className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                Where CAN You Park During Snow Emergencies?
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-6 leading-relaxed">
                Finding legal parking during snow emergencies requires strategy and advance planning.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    Safe Parking Locations
                  </h3>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>✓ Residential side streets (not designated snow routes)</li>
                    <li>✓ Municipal parking lots and garages</li>
                    <li>✓ Private parking facilities</li>
                    <li>✓ Your own driveway or garage</li>
                    <li>✓ Legal metered spots on non-snow-route streets</li>
                  </ul>
                </div>

                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    Avoid These Locations
                  </h3>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>✗ Any designated snow emergency route</li>
                    <li>✗ Major avenues and boulevards</li>
                    <li>✗ Bus routes</li>
                    <li>✗ Fire hydrant zones (15 feet clearance)</li>
                    <li>✗ Crosswalks and intersections</li>
                    <li>✗ No standing/no parking zones</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6">
                <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                  Pro Strategy: Pre-Position Your Vehicle
                </h3>
                <p className="text-[var(--navy-700)] mb-4">
                  When snow is forecast (before emergency is declared):
                </p>
                <ol className="list-decimal list-inside space-y-2 text-[var(--navy-700)]">
                  <li>Move vehicle to a residential side street OFF snow routes</li>
                  <li>Ensure you're legal for current ASP regulations</li>
                  <li>Note the ASP schedule for the next few days</li>
                  <li>Consider a parking garage if forecast is severe (cost vs. towing fee)</li>
                  <li>Clear snow from around your vehicle to avoid being trapped</li>
                </ol>
              </div>
            </section>

            {/* Historical Data */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-[var(--navy-900)] mb-4">
                NYC Snow Emergency History & Data
              </h2>
              <p className="text-lg text-[var(--navy-700)] mb-6 leading-relaxed">
                Understanding historical patterns can help predict and prepare for future snow emergencies.
              </p>

              <div className="bg-[var(--navy-50)] border border-[var(--navy-200)] rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-4">
                  Notable NYC Snow Emergencies (2010-2025)
                </h3>
                <ul className="space-y-3 text-[var(--navy-700)]">
                  <li>
                    <strong>December 2010 Blizzard:</strong> 20 inches, city paralyzed for days, led to major protocol reforms
                  </li>
                  <li>
                    <strong>February 2013:</strong> 11.3 inches, first test of improved snow removal systems
                  </li>
                  <li>
                    <strong>January 2016:</strong> 26.8 inches, largest snowfall in NYC history, travel ban implemented
                  </li>
                  <li>
                    <strong>March 2017:</strong> 14.5 inches, effective snow removal demonstrated improved protocols
                  </li>
                  <li>
                    <strong>February 2021:</strong> Multiple smaller storms, frequent emergency declarations
                  </li>
                </ul>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    Snow Emergency Statistics
                  </h3>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>• <strong>Average 1-3</strong> snow emergencies per winter</li>
                    <li>• <strong>15-20k</strong> tickets issued per major storm</li>
                    <li>• <strong>2,000+</strong> vehicles towed per emergency</li>
                    <li>• <strong>$5M+</strong> in fines per major snow event</li>
                  </ul>
                </div>

                <div className="bg-white border-2 border-[var(--navy-200)] rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-3">
                    Climate Trends
                  </h3>
                  <ul className="space-y-2 text-[var(--navy-700)]">
                    <li>• Frequency of major storms declining</li>
                    <li>• But intensity may be increasing</li>
                    <li>• Peak season: January-February</li>
                    <li>• Rare after mid-March</li>
                  </ul>
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
                    Master alternate side parking rules and suspension schedules.
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
                  href="/faq"
                  className="block bg-white border-2 border-[var(--navy-200)] rounded-lg p-6 hover:border-[var(--navy-400)] transition-colors"
                >
                  <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
                    FAQ
                  </h3>
                  <p className="text-[var(--navy-600)]">
                    Common questions about parking and CityPing alerts.
                  </p>
                </Link>
              </div>
            </section>

            {/* CTA */}
            <section className="bg-[var(--navy-800)] text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Get Snow Emergency Alerts
              </h2>
              <p className="text-xl mb-6 text-blue-100">
                Receive immediate notifications when snow emergencies are declared, plus ASP suspension alerts
              </p>
              <Link
                href="/"
                className="inline-block px-8 py-4 bg-white text-[var(--navy-800)] rounded-md hover:bg-blue-50 transition-colors font-semibold text-lg"
              >
                Sign Up for Free
              </Link>
            </section>
          </article>
        </main>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-[var(--navy-100)] mt-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-[var(--navy-800)] mb-3">CityPing</h3>
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
                  <li><a href="mailto:support@cityping.net" className="text-[var(--navy-600)] hover:text-[var(--navy-800)]">Contact</a></li>
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
