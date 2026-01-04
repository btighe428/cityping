/**
 * Referral Landing Page
 *
 * Dynamic route that handles incoming referral links (e.g., /r/NYC-ABC12).
 * This page serves as the entry point for referred users, providing:
 *
 * 1. Validation of the referral code against the database
 * 2. Personalized welcome message featuring the referrer's first name
 * 3. Clear value proposition for CityPing
 * 4. Call-to-action that preserves the referral code through signup
 *
 * Architectural Notes:
 * -------------------
 * - The referral code is stored in a cookie (cityping_ref) for 30 days
 * - Cookie storage ensures the referral persists through the signup flow
 * - Invalid/expired codes show a generic welcome (graceful degradation)
 * - First name extraction provides social proof while preserving privacy
 *
 * Historical Context:
 * ------------------
 * The referral landing page pattern was pioneered by Dropbox (2008) and
 * refined by companies like Uber and Airbnb. The key insight: personalized
 * referral pages convert 3-5x better than generic signups because they
 * leverage existing social trust (your friend recommends this).
 *
 * Security Considerations:
 * -----------------------
 * - Only first name is exposed (privacy protection)
 * - Expired referrals show generic page (no error disclosure)
 * - Cookie is HttpOnly-safe for client-side persistence
 */

import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";

interface ReferralPageProps {
  params: Promise<{ code: string }>;
}

/**
 * Extracts the first name from an email address or full name.
 * Falls back to "A friend" if extraction fails.
 *
 * Algorithm:
 * 1. If email contains a name before @, use first segment before "."
 * 2. Capitalize first letter, lowercase rest
 * 3. Filter out common non-name patterns (numbers, single chars)
 *
 * @example
 * extractFirstName("john.doe@example.com") // "John"
 * extractFirstName("JaneDoe@gmail.com")    // "Janedoe"
 * extractFirstName("support@company.com")   // "A friend"
 */
function extractFirstName(email: string): string {
  // Extract the part before @ symbol
  const localPart = email.split("@")[0];

  if (!localPart || localPart.length < 2) {
    return "A friend";
  }

  // Split by common separators (., _, -)
  const segments = localPart.split(/[._-]/);
  const firstSegment = segments[0];

  if (!firstSegment || firstSegment.length < 2) {
    return "A friend";
  }

  // Filter out obvious non-names (all numbers, single char, generic prefixes)
  const genericPatterns = ["info", "admin", "support", "hello", "contact", "noreply", "no-reply"];
  if (/^\d+$/.test(firstSegment) || genericPatterns.includes(firstSegment.toLowerCase())) {
    return "A friend";
  }

  // Capitalize properly
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).toLowerCase();
}

export default async function ReferralPage({ params }: ReferralPageProps) {
  const { code } = await params;

  // Look up the referral by code
  // The referral-service normalizes to uppercase internally
  const referral = await prisma.referral.findUnique({
    where: { referralCode: code.toUpperCase() },
    include: {
      referrer: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  // Determine if the referral is valid and active
  const isValidReferral =
    referral &&
    referral.status === "PENDING" &&
    new Date() < referral.expiresAt;

  // Extract referrer's first name for personalization
  const referrerFirstName = isValidReferral
    ? extractFirstName(referral.referrer.email)
    : null;

  // Store the referral code in a cookie if valid
  // This persists through the signup flow
  if (isValidReferral) {
    const cookieStore = await cookies();
    cookieStore.set("cityping_ref", code.toUpperCase(), {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Build the signup URL with referral code
  const signupUrl = isValidReferral ? `/?ref=${code.toUpperCase()}` : "/";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[var(--navy-50)] to-white">
      {/* Header */}
      <header className="py-4 px-6 border-b border-[var(--navy-100)]">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-[var(--navy-800)]">
            NYCPing
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full text-center">
          {/* Personalization Badge */}
          {isValidReferral && referrerFirstName && (
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              <span>{referrerFirstName} invited you</span>
            </div>
          )}

          {/* Main Heading */}
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--navy-900)] mb-4">
            {isValidReferral
              ? `${referrerFirstName} thinks you'll love CityPing`
              : "Never Miss What Matters in NYC"}
          </h1>

          {/* Value Proposition */}
          <p className="text-lg text-[var(--navy-600)] mb-8">
            {isValidReferral
              ? "Join thousands of New Yorkers getting personalized alerts for parking, transit, events, and more. Tailored to your neighborhood."
              : "Personalized alerts for parking, transit, events, and more. Tailored to your neighborhood."}
          </p>

          {/* Feature Highlights - Small Multiples */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="bg-white p-4 rounded-xl border border-[var(--navy-100)] shadow-sm">
              <div className="text-2xl mb-2">🅿️</div>
              <div className="text-sm font-medium text-[var(--navy-700)]">Parking</div>
              <div className="text-xs text-[var(--navy-500)]">ASP alerts</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[var(--navy-100)] shadow-sm">
              <div className="text-2xl mb-2">🚇</div>
              <div className="text-sm font-medium text-[var(--navy-700)]">Transit</div>
              <div className="text-xs text-[var(--navy-500)]">Subway updates</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[var(--navy-100)] shadow-sm">
              <div className="text-2xl mb-2">🎭</div>
              <div className="text-sm font-medium text-[var(--navy-700)]">Events</div>
              <div className="text-xs text-[var(--navy-500)]">Free & local</div>
            </div>
          </div>

          {/* Call to Action */}
          <Link
            href={signupUrl}
            className="inline-block w-full max-w-xs py-4 px-8 bg-[var(--navy-800)] hover:bg-[var(--navy-700)] text-white font-semibold text-lg rounded-lg transition-colors shadow-lg"
          >
            {isValidReferral ? "Get Started Free" : "Sign Up Free"}
          </Link>

          {/* Pricing Note */}
          <p className="mt-4 text-sm text-[var(--navy-500)]">
            Free forever for core alerts. Premium features $7/mo.
          </p>

          {/* Social Proof */}
          <div className="mt-10 pt-8 border-t border-[var(--navy-100)]">
            <p className="text-sm text-[var(--navy-500)]">
              <span className="font-medium text-[var(--navy-700)]">Join 2,500+ New Yorkers</span>{" "}
              who stay ahead of city life
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-[var(--navy-100)]">
        <div className="max-w-6xl mx-auto text-center text-sm text-[var(--navy-500)]">
          Made in NYC
        </div>
      </footer>
    </div>
  );
}

/**
 * Generate metadata for SEO and social sharing.
 * Personalized meta tags improve click-through from social shares.
 */
export async function generateMetadata({ params }: ReferralPageProps) {
  const { code } = await params;

  // Basic metadata - could be personalized with referrer name
  // but we keep it generic for privacy and caching
  return {
    title: "Join CityPing - NYC Alerts Personalized for You",
    description:
      "Your friend invited you to CityPing. Get personalized alerts for parking, transit, events, housing, and more. Free for core features.",
    openGraph: {
      title: "Join CityPing - NYC Alerts Personalized for You",
      description:
        "Your friend invited you to CityPing. Get personalized alerts for parking, transit, events, housing, and more.",
      url: `https://cityping.com/r/${code}`,
    },
  };
}
