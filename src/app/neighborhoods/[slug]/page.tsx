// src/app/neighborhoods/[slug]/page.tsx
/**
 * Dynamic NYC Neighborhood Landing Pages
 *
 * These pages target local SEO queries like:
 * - "[neighborhood] parking rules"
 * - "[neighborhood] subway alerts"
 * - "events in [neighborhood]"
 *
 * Each page is statically generated at build time for performance
 * and SEO benefits. The pages include:
 * - Neighborhood-specific parking information
 * - Transit connections and alerts CTA
 * - Local character description
 * - Structured data for rich search results
 */

import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getNeighborhoodBySlug,
  getAllNeighborhoodSlugs,
  getNeighborhoodsByBorough,
  type Neighborhood,
} from "@/lib/neighborhoods";
import { SEOFooter } from "@/components/seo/SEOFooter";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate static paths for all neighborhoods
export async function generateStaticParams() {
  const slugs = getAllNeighborhoodSlugs();
  return slugs.map((slug) => ({ slug }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const neighborhood = getNeighborhoodBySlug(slug);

  if (!neighborhood) {
    return { title: "Neighborhood Not Found" };
  }

  const title = `${neighborhood.name} NYC: Parking Rules, Subway Alerts & Local Events`;
  const description = `Get daily alerts for ${neighborhood.name}, ${neighborhood.borough}. ASP schedules (${neighborhood.aspDays}), ${neighborhood.subwayLines.join("/")} subway delays, and local events. Free morning briefings.`;

  return {
    title,
    description,
    keywords: [
      ...neighborhood.keywords,
      `${neighborhood.name.toLowerCase()} nyc`,
      `${neighborhood.borough.toLowerCase()} neighborhoods`,
      "nyc parking alerts",
      "subway delays",
    ],
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://cityping.net/neighborhoods/${slug}`,
    },
    alternates: {
      canonical: `https://cityping.net/neighborhoods/${slug}`,
    },
  };
}

export default async function NeighborhoodPage({ params }: PageProps) {
  const { slug } = await params;
  const neighborhood = getNeighborhoodBySlug(slug);

  if (!neighborhood) {
    notFound();
  }

  // Get other neighborhoods in same borough for internal linking
  const sameBoroughNeighborhoods = getNeighborhoodsByBorough(neighborhood.borough)
    .filter((n) => n.slug !== slug)
    .slice(0, 4);

  // Structured data for local business/place
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${neighborhood.name}, ${neighborhood.borough}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: neighborhood.name,
      addressRegion: "NY",
      addressCountry: "US",
      postalCode: neighborhood.zipCodes[0],
    },
    geo: {
      "@type": "GeoCoordinates",
      // Approximate coordinates - could be enhanced with actual data
      latitude: 40.7128,
      longitude: -74.006,
    },
    description: neighborhood.description,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Header */}
        <header className="bg-[#1e3a5f] text-white py-4">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              CityPing
            </Link>
            <Link
              href="/neighborhoods"
              className="text-sm text-white/80 hover:text-white"
            >
              All Neighborhoods
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="bg-[#1e3a5f] text-white py-16">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-blue-200 text-sm font-medium mb-2">
              {neighborhood.borough} Neighborhood
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {neighborhood.name}
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl">
              {neighborhood.description}
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          {/* Quick Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Parking */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="text-3xl mb-2">🚗</div>
              <h2 className="font-semibold text-lg text-slate-900 mb-2">
                Parking Rules
              </h2>
              <p className="text-slate-600 text-sm mb-3">
                <strong>ASP Schedule:</strong> {neighborhood.aspDays}
              </p>
              <p className="text-slate-500 text-sm">
                Get alerts when ASP is suspended for holidays or weather.
              </p>
            </div>

            {/* Transit */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="text-3xl mb-2">🚇</div>
              <h2 className="font-semibold text-lg text-slate-900 mb-2">
                Subway Lines
              </h2>
              <div className="flex flex-wrap gap-1 mb-3">
                {neighborhood.subwayLines.map((line) => (
                  <span
                    key={line}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold"
                  >
                    {line}
                  </span>
                ))}
              </div>
              <p className="text-slate-500 text-sm">
                Key stations: {neighborhood.keyStations.slice(0, 3).join(", ")}
              </p>
            </div>

            {/* Zip Codes */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="text-3xl mb-2">📍</div>
              <h2 className="font-semibold text-lg text-slate-900 mb-2">
                ZIP Codes
              </h2>
              <p className="text-slate-600 mb-3">
                {neighborhood.zipCodes.join(", ")}
              </p>
              <p className="text-slate-500 text-sm">
                Part of {neighborhood.borough}, New York City
              </p>
            </div>
          </div>

          {/* Highlights */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {neighborhood.name} Highlights
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {neighborhood.highlights.map((highlight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg"
                >
                  <span className="text-xl">✦</span>
                  <span className="text-slate-700">{highlight}</span>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] rounded-2xl p-8 text-white text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">
              Get {neighborhood.name} Alerts
            </h2>
            <p className="text-blue-100 mb-6 max-w-lg mx-auto">
              Free daily briefings with parking rules, subway delays, and local
              events for {neighborhood.name}. Know what matters before you leave
              home.
            </p>
            <Link
              href="/?neighborhood=signup"
              className="inline-block bg-white text-[#1e3a5f] px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Sign Up Free
            </Link>
          </section>

          {/* ASP Deep Dive */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Alternate Side Parking in {neighborhood.name}
            </h2>
            <div className="prose prose-slate max-w-none">
              <p>
                Alternate Side Parking (ASP) rules in {neighborhood.name} typically
                follow a <strong>{neighborhood.aspDays}</strong> schedule, though
                this varies by block. ASP is suspended on major holidays and during
                snow emergencies.
              </p>
              <p>
                NYC suspends ASP for approximately 34 holidays per year. During
                suspensions, you don't need to move your car for street cleaning.
                However, <strong>parking meters remain in effect</strong> on most
                holidays - only major holidays like Christmas, New Year's, and
                Thanksgiving suspend both ASP and meters.
              </p>
              <p>
                CityPing sends free daily alerts at 7 AM letting you know if ASP is
                suspended. No more checking the NYC 311 website or guessing about
                obscure holidays.
              </p>
            </div>
          </section>

          {/* Transit Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Getting Around {neighborhood.name}
            </h2>
            <div className="prose prose-slate max-w-none">
              <p>
                {neighborhood.name} is served by the{" "}
                <strong>{neighborhood.subwayLines.join(", ")}</strong> subway
                {neighborhood.subwayLines.length > 1 ? " lines" : " line"}. Key
                stations include {neighborhood.keyStations.join(", ")}.
              </p>
              <p>
                CityPing can alert you to service changes and delays affecting your
                commute. Set your subway lines during signup to get personalized
                morning alerts before you head to the station.
              </p>
            </div>
          </section>

          {/* Other Neighborhoods */}
          {sameBoroughNeighborhoods.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                More {neighborhood.borough} Neighborhoods
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {sameBoroughNeighborhoods.map((n) => (
                  <Link
                    key={n.slug}
                    href={`/neighborhoods/${n.slug}`}
                    className="block p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <h3 className="font-semibold text-slate-900">{n.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {n.subwayLines.slice(0, 4).join(", ")} train
                      {n.subwayLines.length > 1 ? "s" : ""}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Browse All Link */}
          <div className="text-center">
            <Link
              href="/neighborhoods"
              className="text-[#1e3a5f] font-medium hover:underline"
            >
              Browse all NYC neighborhoods →
            </Link>
          </div>
        </main>

        <SEOFooter />
      </div>
    </>
  );
}
