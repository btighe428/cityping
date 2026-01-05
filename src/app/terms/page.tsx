export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="py-4 px-6 border-b border-[var(--navy-100)]">
        <div className="max-w-4xl mx-auto">
          <a href="/" className="text-xl font-bold text-[var(--navy-800)]">
            CityPing
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold text-[var(--navy-900)] mb-8">Terms of Service</h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-[var(--navy-600)] mb-6">
            Last updated: December 2024
          </p>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">1. Service Description</h2>
          <p className="text-[var(--navy-600)] mb-4">
            CityPing provides SMS-based notifications about alternate side parking (ASP) suspension
            days in supported cities. Our service alerts subscribers the evening before scheduled
            ASP suspensions.
          </p>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">2. Subscription and Billing</h2>
          <p className="text-[var(--navy-600)] mb-4">
            CityPing offers a 30-day free trial, followed by a monthly subscription fee. You may
            cancel at any time. Billing is handled securely through Stripe.
          </p>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">3. SMS Consent</h2>
          <p className="text-[var(--navy-600)] mb-4">
            By subscribing and confirming via SMS (replying YES), you consent to receive
            automated text messages from CityPing. Message frequency varies based on parking
            calendar. Message and data rates may apply. Reply STOP to cancel at any time.
            Reply HELP for assistance.
          </p>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">4. Accuracy Disclaimer</h2>
          <p className="text-[var(--navy-600)] mb-4">
            While we strive to provide accurate information based on official city calendars,
            CityPing does not guarantee the accuracy of suspension notifications. Users are
            responsible for verifying parking rules and checking posted signs. CityPing is not
            liable for parking tickets or towing.
          </p>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">5. Limitation of Liability</h2>
          <p className="text-[var(--navy-600)] mb-4">
            CityPing provides this service &quot;as is&quot; without warranty. We are not responsible for
            any damages arising from the use or inability to use our service, including but not
            limited to parking fines, towing fees, or vehicle damage.
          </p>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">6. Changes to Terms</h2>
          <p className="text-[var(--navy-600)] mb-4">
            We may update these terms from time to time. Continued use of the service after
            changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">7. Contact</h2>
          <p className="text-[var(--navy-600)] mb-4">
            Questions? Contact us at support@cityping.net
          </p>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-[var(--navy-100)]">
        <div className="max-w-4xl mx-auto text-center text-sm text-[var(--navy-500)]">
          <a href="/" className="hover:text-[var(--navy-700)]">Home</a>
          {' · '}
          <a href="/privacy" className="hover:text-[var(--navy-700)]">Privacy</a>
        </div>
      </footer>
    </div>
  )
}
