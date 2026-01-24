// src/app/neighborhoods/page.tsx
/**
 * NYC Neighborhoods Index Page
 *
 * Hub page for all neighborhood landing pages, organized by borough.
 * Targets queries like "NYC neighborhoods" and provides internal linking
 * to boost individual neighborhood page authority.
 */

import { Metadata } from "next";
import Link from "next/link";
import { neighborhoods, getNeighborhoodsByBorough } from "@/lib/neighborhoods";
import { SEOFooter } from "@/components/seo/SEOFooter";

export const metadata: Metadata = {
  title: "NYC Neighborhoods: Parking Rules, Subway Alerts & Events by Area",
  description:
    "Explore NYC neighborhoods with CityPing. Get parking rules, subway line info, and local events for Manhattan, Brooklyn, Queens, Bronx, and Staten Island neighborhoods.",
  keywords: [
    "nyc neighborhoods",
    "new york city neighborhoods",
    "manhattan neighborhoods",
    "brooklyn neighborhoods",
    "queens neighborhoods",
    "bronx neighborhoods",
    "staten island neighborhoods",
    "nyc parking by neighborhood",
  ],
  openGraph: {
    title: "NYC Neighborhoods Guide - CityPing",
    description: "Parking rules, subway alerts, and events for every NYC neighborhood.",
    type: "website",
    url: "https://cityping.net/neighborhoods",
  },
  alternates: {
    canonical: "https://cityping.net/neighborhoods",
  },
};

const boroughs: Array<"Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island"> = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
];

export default function NeighborhoodsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white py-4">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            CityPing
          </Link>
          <Link
            href="/"
            className="text-sm text-white/80 hover:text-white"
          >
            Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#1e3a5f] text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            NYC Neighborhoods
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Parking rules, subway alerts, and local events for every corner of
            New York City. Select your neighborhood to get personalized daily
            briefings.
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="max-w-5xl mx-auto px-4 -mt-8">
        <div className="bg-white rounded-xl shadow-lg p-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-[#1e3a5f]">
              {neighborhoods.length}
            </div>
            <div className="text-sm text-slate-500">Neighborhoods</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#1e3a5f]">5</div>
            <div className="text-sm text-slate-500">Boroughs</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#1e3a5f]">34+</div>
            <div className="text-sm text-slate-500">ASP Holidays/Year</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        {boroughs.map((borough) => {
          const boroughNeighborhoods = getNeighborhoodsByBorough(borough);
          if (boroughNeighborhoods.length === 0) return null;

          return (
            <section key={borough} className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {borough}
              </h2>
              <p className="text-slate-500 mb-6">
                {borough === "Manhattan" && "The heart of NYC - from the Financial District to Harlem"}
                {borough === "Brooklyn" && "From brownstone Brooklyn to the waterfront"}
                {borough === "Queens" && "The world's borough - incredibly diverse neighborhoods"}
                {borough === "Bronx" && "Birthplace of hip-hop and home to Yankee Stadium"}
                {borough === "Staten Island" && "The forgotten borough with suburban character"}
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {boroughNeighborhoods.map((neighborhood) => (
                  <Link
                    key={neighborhood.slug}
                    href={`/neighborhoods/${neighborhood.slug}`}
                    className="block bg-white rounded-lg border p-5 hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <h3 className="font-semibold text-lg text-slate-900 group-hover:text-[#1e3a5f] mb-2">
                      {neighborhood.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {neighborhood.subwayLines.slice(0, 5).map((line) => (
                        <span
                          key={line}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-white text-xs font-bold"
                        >
                          {line}
                        </span>
                      ))}
                      {neighborhood.subwayLines.length > 5 && (
                        <span className="text-xs text-slate-400 self-center">
                          +{neighborhood.subwayLines.length - 5}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">
                      {neighborhood.description.substring(0, 100)}...
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {/* CTA */}
        <section className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] rounded-2xl p-8 text-white text-center mt-12">
          <h2 className="text-2xl font-bold mb-3">
            Get Alerts for Your Neighborhood
          </h2>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">
            Free daily briefings with parking rules, subway delays, and local
            events customized to where you live. Know what matters before you
            leave home.
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-[#1e3a5f] px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Sign Up Free
          </Link>
        </section>
      </main>

      <SEOFooter />
    </div>
  );
}
