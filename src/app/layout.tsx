import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://parkping.net'),
  title: {
    default: "ParkPing - NYC Alternate Side Parking Alerts & Suspension Calendar",
    template: "%s | ParkPing"
  },
  description: "Never get a parking ticket on a holiday again. Get SMS/email alerts the night before NYC alternate side parking (ASP) is suspended. Free during beta. Join 1,000+ NYC drivers.",
  keywords: [
    "NYC alternate side parking",
    "ASP suspension",
    "parking alerts NYC",
    "alternate side parking calendar",
    "NYC parking rules",
    "parking suspension alerts",
    "NYC street cleaning",
    "parking ticket prevention",
    "NYC parking holidays",
    "ASP NYC",
    "New York parking",
    "NYC parking notifications"
  ],
  authors: [{ name: "ParkPing" }],
  creator: "ParkPing",
  publisher: "ParkPing",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://parkping.net',
    siteName: 'ParkPing',
    title: 'ParkPing - NYC Alternate Side Parking Alerts',
    description: 'Never get a parking ticket on a holiday again. Get SMS/email alerts the night before NYC alternate side parking is suspended.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ParkPing - NYC Alternate Side Parking Alerts',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ParkPing - NYC Alternate Side Parking Alerts',
    description: 'Never get a parking ticket on a holiday again. Get SMS/email alerts the night before NYC ASP is suspended.',
    images: ['/og-image.png'],
    creator: '@parkping',
  },
  alternates: {
    canonical: 'https://parkping.net',
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "ParkPing",
    "url": "https://parkping.net",
    "logo": "https://parkping.net/logo.png",
    "description": "SMS and email alerts for NYC alternate side parking suspensions",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "New York",
      "addressRegion": "NY",
      "addressCountry": "US"
    },
    "areaServed": {
      "@type": "City",
      "name": "New York City",
      "sameAs": "https://en.wikipedia.org/wiki/New_York_City"
    },
    "serviceType": "Parking Alert Service",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@parkping.net",
      "contactType": "Customer Support"
    },
    "sameAs": [
      "https://twitter.com/parkping"
    ]
  };

  const webApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "ParkPing",
    "url": "https://parkping.net",
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web Browser, SMS",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free during beta period"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "1000"
    },
    "description": "Never get a parking ticket on a holiday again. ParkPing sends SMS and email alerts the night before NYC alternate side parking is suspended."
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "ParkPing",
    "image": "https://parkping.net/logo.png",
    "url": "https://parkping.net",
    "telephone": "+1-XXX-XXX-XXXX",
    "email": "support@parkping.net",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "New York",
      "addressRegion": "NY",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "priceRange": "Free",
    "servesCuisine": null,
    "areaServed": {
      "@type": "City",
      "name": "New York City"
    }
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
