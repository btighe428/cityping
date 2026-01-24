// src/app/sitemap-images.ts
/**
 * Image Sitemap for Google Image Search
 *
 * This sitemap helps Google discover and index images used throughout
 * the CityPing site, improving visibility in Google Image Search results.
 */

import { MetadataRoute } from 'next'

export default function imageSitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://cityping.net'
  const currentDate = new Date().toISOString()

  // Define pages with their associated images
  const pagesWithImages = [
    {
      url: baseUrl,
      images: [
        { url: `${baseUrl}/og-image.png`, title: 'NYC CityPing - Daily NYC Intelligence' },
        { url: `${baseUrl}/logo.png`, title: 'NYC CityPing Logo' },
      ]
    },
    {
      url: `${baseUrl}/nyc-alternate-side-parking-guide`,
      images: [
        { url: `${baseUrl}/images/asp-guide-og.png`, title: 'NYC Alternate Side Parking Complete Guide' },
      ]
    },
    {
      url: `${baseUrl}/asp-suspension-calendar`,
      images: [
        { url: `${baseUrl}/images/asp-calendar-og.png`, title: '2025 ASP Suspension Calendar NYC' },
      ]
    },
    {
      url: `${baseUrl}/nyc-subway-alerts`,
      images: [
        { url: `${baseUrl}/images/subway-alerts-og.png`, title: 'NYC Subway Service Alerts' },
      ]
    },
    {
      url: `${baseUrl}/nyc-housing-lottery`,
      images: [
        { url: `${baseUrl}/images/housing-lottery-og.png`, title: 'NYC Housing Lottery Guide' },
      ]
    },
    {
      url: `${baseUrl}/nyc-events-calendar`,
      images: [
        { url: `${baseUrl}/images/events-og.png`, title: 'NYC Events Calendar' },
      ]
    },
  ]

  return pagesWithImages.map(page => ({
    url: page.url,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
}
