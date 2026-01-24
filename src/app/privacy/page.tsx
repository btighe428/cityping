import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - How CityPing Protects Your Data",
  description: "Learn how NYC CityPing collects, uses, and protects your personal information. We collect minimal data and never sell your information to third parties.",
  alternates: {
    canonical: "https://cityping.net/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-[var(--navy-900)] mb-8">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-[var(--navy-600)] mb-6">
            Last updated: December 2024
          </p>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">Information We Collect</h2>
          <p className="text-[var(--navy-600)] mb-4">
            We collect minimal information necessary to provide our service:
          </p>
          <ul className="list-disc pl-6 text-[var(--navy-600)] mb-4">
            <li>Phone number (required for SMS delivery)</li>
            <li>Email address (optional, for receipts via Stripe)</li>
            <li>City preference (to send relevant alerts)</li>
            <li>SMS consent status and timestamp</li>
          </ul>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">How We Use Your Information</h2>
          <p className="text-[var(--navy-600)] mb-4">
            Your information is used solely to:
          </p>
          <ul className="list-disc pl-6 text-[var(--navy-600)] mb-4">
            <li>Send you ASP suspension alerts via SMS</li>
            <li>Process your subscription payments</li>
            <li>Respond to your support requests</li>
          </ul>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">Data Sharing</h2>
          <p className="text-[var(--navy-600)] mb-4">
            We do not sell, rent, or share your personal information with third parties except:
          </p>
          <ul className="list-disc pl-6 text-[var(--navy-600)] mb-4">
            <li>Stripe (payment processing)</li>
            <li>Twilio (SMS delivery)</li>
            <li>When required by law</li>
          </ul>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">Data Security</h2>
          <p className="text-[var(--navy-600)] mb-4">
            We implement industry-standard security measures to protect your data. Payment
            information is handled entirely by Stripe and never touches our servers.
          </p>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">Data Retention</h2>
          <p className="text-[var(--navy-600)] mb-4">
            We retain your data for as long as your account is active. Upon cancellation,
            we delete your personal data within 30 days, except where required for legal
            or accounting purposes.
          </p>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">Your Rights</h2>
          <p className="text-[var(--navy-600)] mb-4">
            You may:
          </p>
          <ul className="list-disc pl-6 text-[var(--navy-600)] mb-4">
            <li>Request a copy of your data</li>
            <li>Request deletion of your data</li>
            <li>Opt out of SMS by replying STOP</li>
            <li>Update your preferences via the manage page</li>
          </ul>

          <h2 className="text-xl font-semibold text-[var(--navy-800)] mt-8 mb-4">Contact</h2>
          <p className="text-[var(--navy-600)] mb-4">
            For privacy-related questions, contact us at support@cityping.net
          </p>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-[var(--navy-100)]">
        <div className="max-w-4xl mx-auto text-center text-sm text-[var(--navy-500)]">
          <a href="/" className="hover:text-[var(--navy-700)]">Home</a>
          {' · '}
          <a href="/terms" className="hover:text-[var(--navy-700)]">Terms</a>
        </div>
      </footer>
    </div>
  )
}
