import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://cityping.net'
  const currentDate = new Date().toISOString()

  return [
    // Homepage - highest priority
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },

    // High-value SEO landing pages - Parking (established)
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

    // High-value SEO landing pages - Transit (new)
    {
      url: `${baseUrl}/nyc-subway-alerts`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },

    // High-value SEO landing pages - Housing (new)
    {
      url: `${baseUrl}/nyc-housing-lottery`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },

    // High-value SEO landing pages - Events (new)
    {
      url: `${baseUrl}/nyc-events-calendar`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },

    // Informational pages
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },

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
