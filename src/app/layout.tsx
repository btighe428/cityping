import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap", // Improves CLS by swapping to custom font when loaded
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://cityping.net'),
  title: {
    default: "NYC CityPing - Your Daily NYC Intelligence: Parking, Transit, Events & Housing Alerts",
    template: "%s | NYC CityPing"
  },
  description: "The essential daily briefing for New Yorkers. Get personalized alerts for alternate side parking, subway delays, housing lottery deadlines, events, and more. Free morning emails that tell you what matters today in NYC.",
  keywords: [
    // Core product
    "NYC alerts",
    "New York City notifications",
    "NYC daily briefing",
    "NYC morning newsletter",
    // Parking (existing strength)
    "NYC alternate side parking",
    "ASP suspension",
    "parking alerts NYC",
    "alternate side parking calendar",
    "NYC parking rules",
    "NYC street cleaning",
    "snow emergency parking NYC",
    // Transit
    "NYC subway alerts",
    "MTA service alerts",
    "NYC transit delays",
    "subway service changes",
    "NYC train delays",
    // Events
    "NYC events this week",
    "things to do in NYC",
    "NYC free events",
    "NYC events calendar",
    "what to do in New York",
    // Housing
    "NYC housing lottery",
    "affordable housing NYC",
    "NYC lottery apartments",
    "housing connect NYC",
    // Local
    "NYC sample sales",
    "NYC restaurant week",
    "open house new york",
    "NYC insider tips"
  ],
  authors: [{ name: "NYC CityPing" }],
  creator: "NYC CityPing",
  publisher: "NYC CityPing",
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
    url: 'https://cityping.net',
    siteName: 'NYC CityPing',
    title: 'NYC CityPing - Your Daily NYC Intelligence',
    description: 'The essential daily briefing for New Yorkers. Parking, transit, events, housing lottery deadlines - everything you need to know, every morning.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NYC CityPing - Your Daily NYC Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NYC CityPing - Your Daily NYC Intelligence',
    description: 'The essential daily briefing for New Yorkers. Parking, transit, events, housing - what matters today in NYC.',
    images: ['/og-image.png'],
    creator: '@cityping',
  },
  alternates: {
    canonical: 'https://cityping.net',
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
    "name": "NYC CityPing",
    "url": "https://cityping.net",
    "logo": "https://cityping.net/logo.png",
    "description": "The essential daily briefing for New Yorkers - personalized alerts for parking, transit, events, housing lotteries, and more.",
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
    "serviceType": ["City Alert Service", "Local News", "Event Calendar", "Transit Alerts"],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "hello@cityping.net",
      "contactType": "Customer Support"
    },
    "sameAs": [
      "https://twitter.com/cityping"
    ]
  };

  const webApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "NYC CityPing",
    "url": "https://cityping.net",
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Web Browser, Email, SMS",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free daily briefings, premium SMS alerts available"
    },
    "featureList": [
      "Daily NYC briefing emails",
      "Alternate side parking alerts",
      "Subway delay notifications",
      "Housing lottery deadline reminders",
      "NYC event recommendations",
      "Weather-aware planning"
    ],
    "description": "NYC CityPing delivers personalized daily briefings to New Yorkers - know what matters today in 60 seconds."
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "NYC CityPing",
    "image": "https://cityping.net/logo.png",
    "url": "https://cityping.net",
    "email": "hello@cityping.net",
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
    "areaServed": {
      "@type": "City",
      "name": "New York City"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is NYC CityPing?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NYC CityPing is a free daily briefing service for New Yorkers. Every weekday morning at 7am, you get a 60-second email covering what matters today: parking rules, subway delays, housing lottery deadlines, events, and more."
        }
      },
      {
        "@type": "Question",
        "name": "Is NYC CityPing free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! The daily email briefing and weekly digest are completely free. Premium SMS alerts for urgent notifications are available for subscribers who want instant updates."
        }
      },
      {
        "@type": "Question",
        "name": "What alerts does NYC CityPing cover?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NYC CityPing covers alternate side parking suspensions, subway and transit alerts, NYC housing lottery deadlines, local events, sample sales, restaurant week, and seasonal NYC happenings."
        }
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        {/* Performance: Preconnect to external origins */}
        <link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* Structured Data */}
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
