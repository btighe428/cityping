// src/lib/scrapers/news/rss-parser.ts
/**
 * RSS Feed Parser
 *
 * A lightweight RSS/Atom feed parser that doesn't require external dependencies.
 * Parses common RSS 2.0 and Atom feed formats used by news outlets.
 *
 * Historical Context:
 * RSS (Really Simple Syndication) emerged in the late 1990s as a standard for
 * web content syndication. The format has remained remarkably stable since RSS 2.0
 * was finalized in 2002. Most news organizations still provide RSS feeds despite
 * the rise of proprietary APIs, making it a reliable data source.
 */

export interface RssItem {
  title?: string;
  link?: string;
  guid?: string;
  description?: string;
  contentSnippet?: string;
  pubDate?: string;
  author?: string;
  creator?: string; // dc:creator in RSS
  categories?: string[];
  enclosure?: {
    url: string;
    type?: string;
    length?: string;
  };
  mediaContent?: {
    url: string;
    type?: string;
    medium?: string;
  };
}

/**
 * Parse an RSS or Atom feed from a URL.
 *
 * Implementation Notes:
 * - Uses native fetch() for network requests
 * - Parses XML using regex patterns (avoids DOMParser in Node.js)
 * - Handles common RSS 2.0 fields and some Atom compatibility
 * - Gracefully handles missing fields
 *
 * @param feedUrl - URL of the RSS/Atom feed
 * @returns Array of parsed items
 */
export async function parseRssFeed(feedUrl: string): Promise<RssItem[]> {
  const response = await fetch(feedUrl, {
    headers: {
      "User-Agent": "CityPing News Aggregator (cityping.net)",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseRssXml(xml);
}

/**
 * Parse RSS XML string into items.
 */
function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = [];

  // Handle both RSS <item> and Atom <entry> formats
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>|<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1] || match[2];
    const item = parseItem(itemXml);
    if (item.title || item.link) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Parse individual item XML.
 */
function parseItem(itemXml: string): RssItem {
  return {
    title: extractCdataOrText(itemXml, "title"),
    link: extractLink(itemXml),
    guid: extractText(itemXml, "guid") || extractText(itemXml, "id"),
    description: extractCdataOrText(itemXml, "description") || extractCdataOrText(itemXml, "summary"),
    contentSnippet: extractContentSnippet(itemXml),
    pubDate: extractText(itemXml, "pubDate") || extractText(itemXml, "published") || extractText(itemXml, "updated"),
    author: extractText(itemXml, "author"),
    creator: extractText(itemXml, "dc:creator") || extractText(itemXml, "creator"),
    categories: extractCategories(itemXml),
    enclosure: extractEnclosure(itemXml),
    mediaContent: extractMediaContent(itemXml),
  };
}

/**
 * Extract text content from an XML tag, handling CDATA sections.
 */
function extractCdataOrText(xml: string, tagName: string): string | undefined {
  // Try CDATA first
  const cdataRegex = new RegExp(`<${tagName}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tagName}>`, "i");
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) {
    return cleanHtml(cdataMatch[1].trim());
  }

  // Fall back to regular text
  return extractText(xml, tagName);
}

/**
 * Extract plain text content from an XML tag.
 */
function extractText(xml: string, tagName: string): string | undefined {
  // Handle namespaced tags
  const escapedTag = tagName.replace(":", "\\:");
  const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)</${escapedTag}>`, "i");
  const match = xml.match(regex);

  if (match) {
    return cleanHtml(match[1].trim());
  }

  return undefined;
}

/**
 * Extract link from RSS item or Atom entry.
 */
function extractLink(xml: string): string | undefined {
  // RSS <link> tag
  const linkMatch = xml.match(/<link[^>]*>([^<]+)<\/link>/i);
  if (linkMatch) {
    return linkMatch[1].trim();
  }

  // Atom <link href="..."/> self-closing tag
  const atomLinkMatch = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (atomLinkMatch) {
    return atomLinkMatch[1];
  }

  return undefined;
}

/**
 * Extract clean text snippet from content.
 */
function extractContentSnippet(xml: string): string | undefined {
  const content = extractCdataOrText(xml, "content:encoded") ||
                  extractCdataOrText(xml, "content");

  if (content) {
    // Strip HTML and limit to ~300 chars
    const text = content.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return text.length > 300 ? text.substring(0, 297) + "..." : text;
  }

  return undefined;
}

/**
 * Extract categories/tags.
 */
function extractCategories(xml: string): string[] {
  const categories: string[] = [];
  const categoryRegex = /<category[^>]*>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/category>/gi;
  let match;

  while ((match = categoryRegex.exec(xml)) !== null) {
    const category = match[1].trim();
    if (category && !categories.includes(category)) {
      categories.push(category);
    }
  }

  return categories;
}

/**
 * Extract enclosure (typically for podcast episodes or images).
 */
function extractEnclosure(xml: string): RssItem["enclosure"] | undefined {
  const enclosureMatch = xml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (enclosureMatch) {
    const typeMatch = xml.match(/<enclosure[^>]*type=["']([^"']+)["'][^>]*>/i);
    return {
      url: enclosureMatch[1],
      type: typeMatch?.[1],
    };
  }
  return undefined;
}

/**
 * Extract media:content (common for images).
 */
function extractMediaContent(xml: string): RssItem["mediaContent"] | undefined {
  const mediaMatch = xml.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (mediaMatch) {
    const typeMatch = xml.match(/<media:content[^>]*type=["']([^"']+)["'][^>]*>/i);
    const mediumMatch = xml.match(/<media:content[^>]*medium=["']([^"']+)["'][^>]*>/i);
    return {
      url: mediaMatch[1],
      type: typeMatch?.[1],
      medium: mediumMatch?.[1],
    };
  }
  return undefined;
}

/**
 * Clean HTML entities and strip remaining HTML.
 */
function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "") // Strip HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\s+/g, " ")
    .trim();
}
