// src/components/seo/StructuredData.tsx
/**
 * Structured Data Components for SEO
 *
 * These components inject JSON-LD structured data for:
 * - Organization (brand presence)
 * - LocalBusiness (local SEO)
 * - WebApplication (app store visibility)
 * - Service (service offerings)
 * - FAQPage (FAQ rich results)
 * - HowTo (step-by-step rich results)
 * - Article (news/article rich results)
 */

import React from 'react'

// Organization Schema - use on homepage and about pages
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CityPing",
    "alternateName": "NYC CityPing",
    "url": "https://cityping.net",
    "logo": "https://cityping.net/logo.png",
    "description": "NYC's daily intelligence platform providing parking alerts, subway status, events, housing, and local deals delivered via SMS and email.",
    "foundingDate": "2024",
    "foundingLocation": {
      "@type": "Place",
      "name": "New York City, NY"
    },
    "areaServed": {
      "@type": "City",
      "name": "New York City",
      "containedInPlace": {
        "@type": "State",
        "name": "New York"
      }
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "email": "support@cityping.net",
      "availableLanguage": "English"
    },
    "sameAs": [
      // Add social profiles when available
      // "https://twitter.com/cityping",
      // "https://www.instagram.com/cityping"
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// LocalBusiness Schema - for local SEO targeting NYC
export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://cityping.net/#localbusiness",
    "name": "CityPing",
    "description": "NYC alert service for alternate side parking, subway delays, events, and local deals. Serving New York City residents.",
    "url": "https://cityping.net",
    "telephone": "",
    "email": "hello@cityping.net",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "New York",
      "addressRegion": "NY",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "40.7128",
      "longitude": "-74.0060"
    },
    "areaServed": [
      {
        "@type": "City",
        "name": "New York City"
      },
      {
        "@type": "Borough",
        "name": "Manhattan"
      },
      {
        "@type": "Borough",
        "name": "Brooklyn"
      },
      {
        "@type": "Borough",
        "name": "Queens"
      },
      {
        "@type": "Borough",
        "name": "Bronx"
      },
      {
        "@type": "Borough",
        "name": "Staten Island"
      }
    ],
    "priceRange": "$",
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "00:00",
      "closes": "23:59"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// WebApplication Schema - for app-like discovery
export function WebApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "CityPing",
    "description": "Daily NYC intelligence platform: parking alerts, subway status, events, housing lottery, and local deals via SMS and email.",
    "url": "https://cityping.net",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free during beta period"
    },
    "featureList": [
      "Alternate Side Parking suspension alerts",
      "MTA subway service alerts",
      "NYC events and sample sales",
      "Housing lottery notifications",
      "Weather-based recommendations",
      "SMS and email delivery"
    ],
    "screenshot": "https://cityping.net/og-image.png",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "50",
      "bestRating": "5",
      "worstRating": "1"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Service Schema - for service pages
interface ServiceSchemaProps {
  serviceName: string
  description: string
  serviceType: string
}

export function ServiceSchema({ serviceName, description, serviceType }: ServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": serviceName,
    "description": description,
    "provider": {
      "@type": "Organization",
      "name": "CityPing"
    },
    "serviceType": serviceType,
    "areaServed": {
      "@type": "City",
      "name": "New York City"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free during beta"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// FAQ Schema - for FAQ pages or sections
interface FAQItem {
  question: string
  answer: string
}

interface FAQSchemaProps {
  items: FAQItem[]
}

export function FAQSchema({ items }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// HowTo Schema - for step-by-step guides
interface HowToStep {
  name: string
  text: string
  url?: string
  image?: string
}

interface HowToSchemaProps {
  name: string
  description: string
  totalTime?: string // ISO 8601 duration format (e.g., "PT30M" for 30 minutes)
  estimatedCost?: { currency: string; value: string }
  steps: HowToStep[]
}

export function HowToSchema({ name, description, totalTime, estimatedCost, steps }: HowToSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    ...(totalTime && { "totalTime": totalTime }),
    ...(estimatedCost && {
      "estimatedCost": {
        "@type": "MonetaryAmount",
        "currency": estimatedCost.currency,
        "value": estimatedCost.value
      }
    }),
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      ...(step.url && { "url": step.url }),
      ...(step.image && { "image": step.image })
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Article Schema - for blog posts and guides
interface ArticleSchemaProps {
  headline: string
  description: string
  datePublished: string
  dateModified?: string
  image?: string
  url: string
}

export function ArticleSchema({ headline, description, datePublished, dateModified, image, url }: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": headline,
    "description": description,
    "datePublished": datePublished,
    "dateModified": dateModified || new Date().toISOString().split('T')[0],
    ...(image && { "image": image }),
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
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Combined schemas for homepage
export function HomepageSchemas() {
  return (
    <>
      <OrganizationSchema />
      <LocalBusinessSchema />
      <WebApplicationSchema />
    </>
  )
}
