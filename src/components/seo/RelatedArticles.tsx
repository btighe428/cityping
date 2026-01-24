// src/components/seo/RelatedArticles.tsx
/**
 * Internal Linking Component for SEO
 *
 * Centralized component for displaying related articles across content pages.
 * This improves SEO through:
 * - Strong internal link structure (distributes PageRank)
 * - Contextual relevance signals to search engines
 * - Improved user engagement metrics (lower bounce rate)
 * - Topic clustering for topical authority
 */

import Link from 'next/link'

export interface ArticleData {
  slug: string
  title: string
  description: string
  category: 'parking' | 'transit' | 'housing' | 'events' | 'general'
  icon?: string
}

// Centralized content hub - all SEO pages defined here
export const ARTICLES: Record<string, ArticleData> = {
  'nyc-alternate-side-parking-guide': {
    slug: '/nyc-alternate-side-parking-guide',
    title: 'NYC Alternate Side Parking Guide',
    description: 'Complete guide to ASP rules, regulations, and how to avoid tickets.',
    category: 'parking',
    icon: '🚗'
  },
  'asp-suspension-calendar': {
    slug: '/asp-suspension-calendar',
    title: '2025 ASP Suspension Calendar',
    description: 'View all upcoming ASP suspension dates and holidays.',
    category: 'parking',
    icon: '📅'
  },
  'nyc-parking-rules': {
    slug: '/nyc-parking-rules',
    title: 'NYC Parking Rules Guide',
    description: 'Complete guide to all NYC parking regulations and restrictions.',
    category: 'parking',
    icon: '🅿️'
  },
  'snow-emergency-parking-nyc': {
    slug: '/snow-emergency-parking-nyc',
    title: 'Snow Emergency Parking NYC',
    description: 'Learn about special parking rules during snow emergencies.',
    category: 'parking',
    icon: '❄️'
  },
  'nyc-parking-ticket-dispute': {
    slug: '/nyc-parking-ticket-dispute',
    title: 'How to Dispute a Parking Ticket',
    description: 'Step-by-step guide to fighting NYC parking tickets.',
    category: 'parking',
    icon: '📋'
  },
  'nyc-meter-parking': {
    slug: '/nyc-meter-parking',
    title: 'NYC Meter Parking Guide',
    description: 'Hours, rates, and payment options for NYC parking meters.',
    category: 'parking',
    icon: '⏰'
  },
  'nyc-street-cleaning-schedule': {
    slug: '/nyc-street-cleaning-schedule',
    title: 'Street Cleaning Schedule by Borough',
    description: 'Find street cleaning times for your NYC neighborhood.',
    category: 'parking',
    icon: '🧹'
  },
  'nyc-congestion-pricing': {
    slug: '/nyc-congestion-pricing',
    title: 'NYC Congestion Pricing Guide',
    description: 'Tolls, exemptions, and savings strategies for Manhattan driving.',
    category: 'parking',
    icon: '💰'
  },
  'nyc-subway-alerts': {
    slug: '/nyc-subway-alerts',
    title: 'NYC Subway Service Alerts',
    description: 'Real-time MTA subway service alerts and delays.',
    category: 'transit',
    icon: '🚇'
  },
  'nyc-housing-lottery': {
    slug: '/nyc-housing-lottery',
    title: 'NYC Housing Lottery Guide',
    description: 'Complete guide to applying for affordable housing in NYC.',
    category: 'housing',
    icon: '🏠'
  },
  'nyc-events-calendar': {
    slug: '/nyc-events-calendar',
    title: 'NYC Events Calendar',
    description: 'Discover free and affordable events happening in NYC.',
    category: 'events',
    icon: '🎭'
  },
  'free-things-to-do-nyc': {
    slug: '/free-things-to-do-nyc',
    title: 'Free Things to Do in NYC',
    description: 'Best free events, museums, and activities in New York City.',
    category: 'events',
    icon: '🆓'
  },
  'faq': {
    slug: '/faq',
    title: 'Frequently Asked Questions',
    description: 'Get answers to common questions about CityPing.',
    category: 'general',
    icon: '❓'
  }
}

// Define related article relationships for topic clustering
export const RELATED_ARTICLES: Record<string, string[]> = {
  'nyc-alternate-side-parking-guide': ['asp-suspension-calendar', 'nyc-parking-rules', 'nyc-street-cleaning-schedule', 'nyc-parking-ticket-dispute'],
  'asp-suspension-calendar': ['nyc-alternate-side-parking-guide', 'nyc-street-cleaning-schedule', 'snow-emergency-parking-nyc'],
  'nyc-parking-rules': ['nyc-alternate-side-parking-guide', 'nyc-meter-parking', 'nyc-parking-ticket-dispute', 'nyc-congestion-pricing'],
  'snow-emergency-parking-nyc': ['nyc-alternate-side-parking-guide', 'asp-suspension-calendar', 'nyc-parking-rules'],
  'nyc-parking-ticket-dispute': ['nyc-alternate-side-parking-guide', 'nyc-parking-rules', 'asp-suspension-calendar', 'nyc-meter-parking'],
  'nyc-meter-parking': ['nyc-parking-rules', 'nyc-parking-ticket-dispute', 'nyc-alternate-side-parking-guide', 'nyc-congestion-pricing'],
  'nyc-street-cleaning-schedule': ['nyc-alternate-side-parking-guide', 'asp-suspension-calendar', 'nyc-parking-rules'],
  'nyc-congestion-pricing': ['nyc-parking-rules', 'nyc-meter-parking', 'nyc-subway-alerts', 'faq'],
  'nyc-subway-alerts': ['nyc-events-calendar', 'nyc-congestion-pricing', 'faq'],
  'nyc-housing-lottery': ['nyc-events-calendar', 'free-things-to-do-nyc', 'faq'],
  'nyc-events-calendar': ['free-things-to-do-nyc', 'nyc-housing-lottery', 'nyc-subway-alerts'],
  'free-things-to-do-nyc': ['nyc-events-calendar', 'nyc-housing-lottery', 'nyc-subway-alerts'],
  'faq': ['nyc-alternate-side-parking-guide', 'asp-suspension-calendar', 'nyc-subway-alerts', 'nyc-congestion-pricing']
}

interface RelatedArticlesProps {
  currentPage: string
  maxArticles?: number
  title?: string
  showIcon?: boolean
  variant?: 'grid' | 'list' | 'compact'
}

export function RelatedArticles({
  currentPage,
  maxArticles = 4,
  title = 'Related Resources',
  showIcon = false,
  variant = 'grid'
}: RelatedArticlesProps) {
  const relatedSlugs = RELATED_ARTICLES[currentPage] || []
  const articles = relatedSlugs
    .slice(0, maxArticles)
    .map(slug => ARTICLES[slug])
    .filter(Boolean)

  if (articles.length === 0) return null

  if (variant === 'compact') {
    return (
      <nav className="mb-8" aria-label="Related articles">
        <p className="text-sm text-[var(--navy-600)] mb-2">{title}:</p>
        <div className="flex flex-wrap gap-2">
          {articles.map(article => (
            <Link
              key={article.slug}
              href={article.slug}
              className="text-sm px-3 py-1 bg-[var(--navy-50)] text-[var(--navy-700)] rounded-full hover:bg-[var(--navy-100)] transition-colors"
            >
              {showIcon && article.icon && <span className="mr-1">{article.icon}</span>}
              {article.title}
            </Link>
          ))}
        </div>
      </nav>
    )
  }

  if (variant === 'list') {
    return (
      <section className="mb-12" aria-labelledby="related-articles-heading">
        <h2 id="related-articles-heading" className="text-2xl font-bold text-[var(--navy-900)] mb-4">
          {title}
        </h2>
        <ul className="space-y-3">
          {articles.map(article => (
            <li key={article.slug}>
              <Link
                href={article.slug}
                className="flex items-start p-4 bg-[var(--navy-50)] rounded-lg hover:bg-[var(--navy-100)] transition-colors"
              >
                {showIcon && article.icon && (
                  <span className="text-2xl mr-4 flex-shrink-0">{article.icon}</span>
                )}
                <div>
                  <h3 className="font-semibold text-[var(--navy-800)] mb-1">{article.title}</h3>
                  <p className="text-sm text-[var(--navy-600)]">{article.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  // Default: grid variant
  return (
    <section className="mb-12" aria-labelledby="related-articles-heading">
      <h2 id="related-articles-heading" className="text-3xl font-bold text-[var(--navy-900)] mb-4">
        {title}
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        {articles.map(article => (
          <Link
            key={article.slug}
            href={article.slug}
            className="block bg-white border-2 border-[var(--navy-200)] rounded-lg p-6 hover:border-[var(--navy-400)] transition-colors"
          >
            <h3 className="text-xl font-semibold text-[var(--navy-800)] mb-2">
              {showIcon && article.icon && <span className="mr-2">{article.icon}</span>}
              {article.title}
            </h3>
            <p className="text-[var(--navy-600)]">{article.description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

// Breadcrumb component with schema markup
interface BreadcrumbItem {
  name: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      ...(item.href && { "item": `https://cityping.net${item.href}` })
    }))
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <nav className="mb-6 text-sm text-[var(--navy-600)]" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center">
          {items.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              {item.href ? (
                <Link href={item.href} className="hover:text-[var(--navy-800)]">
                  {item.name}
                </Link>
              ) : (
                <span aria-current="page">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}

// Category navigation for topic silos
interface CategoryNavProps {
  currentCategory: ArticleData['category']
  excludeCurrent?: string
}

export function CategoryNav({ currentCategory, excludeCurrent }: CategoryNavProps) {
  const categoryArticles = Object.entries(ARTICLES)
    .filter(([key, article]) => article.category === currentCategory && key !== excludeCurrent)
    .map(([, article]) => article)

  if (categoryArticles.length === 0) return null

  const categoryLabels: Record<string, string> = {
    parking: 'More Parking Guides',
    transit: 'More Transit Resources',
    housing: 'More Housing Guides',
    events: 'More Events',
    general: 'More Resources'
  }

  return (
    <aside className="bg-[var(--navy-50)] rounded-lg p-6 mb-8">
      <h3 className="font-bold text-[var(--navy-800)] mb-4">{categoryLabels[currentCategory]}</h3>
      <ul className="space-y-2">
        {categoryArticles.map(article => (
          <li key={article.slug}>
            <Link
              href={article.slug}
              className="text-[var(--navy-700)] hover:text-[var(--navy-900)] flex items-center"
            >
              {article.icon && <span className="mr-2">{article.icon}</span>}
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
