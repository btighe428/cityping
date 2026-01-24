import { MetadataRoute } from 'next'
import { getAllNeighborhoodSlugs } from '@/lib/neighborhoods'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://cityping.net'
  const currentDate = new Date().toISOString()

  // Generate neighborhood pages
  const neighborhoodSlugs = getAllNeighborhoodSlugs()
  const neighborhoodPages = neighborhoodSlugs.map((slug) => ({
    url: `${baseUrl}/neighborhoods/${slug}`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    // Homepage - highest priority
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },

    // High-value SEO landing pages - Parking (pillar content)
    {
      url: `${baseUrl}/nyc-alternate-side-parking-guide`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/asp-suspension-calendar`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/nyc-parking-rules`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/snow-emergency-parking-nyc`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/nyc-parking-ticket-dispute`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/nyc-meter-parking`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/nyc-street-cleaning-schedule`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/nyc-congestion-pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },

    // High-value SEO landing pages - Transit
    {
      url: `${baseUrl}/nyc-subway-alerts`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },

    // High-value SEO landing pages - Housing
    {
      url: `${baseUrl}/nyc-housing-lottery`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },

    // High-value SEO landing pages - Events
    {
      url: `${baseUrl}/nyc-events-calendar`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/free-things-to-do-nyc`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },

    // Informational pages
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },

    // Neighborhoods hub page
    {
      url: `${baseUrl}/neighborhoods`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },

    // Individual neighborhood pages
    ...neighborhoodPages,

    // Legal pages
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
