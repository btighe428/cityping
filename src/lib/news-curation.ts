// src/lib/news-curation.ts
/**
 * AI-Powered News Curation Service
 *
 * Uses Claude Haiku to select the top 3 most relevant NYC news stories
 * from the day's scraped articles, then generates brief summaries and
 * NYC-angle commentary for each selected story.
 *
 * Curation Philosophy:
 * The goal is to surface stories that matter to daily life in NYC -
 * not just breaking news, but developments that affect how residents
 * navigate the city: transit changes, housing policy, neighborhood
 * developments, and civic affairs.
 *
 * Historical Context:
 * This approach draws from the "news you can use" philosophy pioneered
 * by local TV news in the 1970s, combined with modern editorial curation
 * seen in newsletters like Morning Brew and The Skimm.
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db";

const anthropic = new Anthropic();

interface ArticleForCuration {
  id: string;
  source: string;
  title: string;
  snippet: string | null;
  category: string | null;
  publishedAt: Date;
  url: string;
}

interface CuratedArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string;
  nycAngle: string;
}

/**
 * Enhanced Curation Prompt
 *
 * This prompt embodies the CityPing editorial voice - informed, practical,
 * and attuned to what matters for daily NYC life. The priorities reflect
 * the kinds of stories our users have engaged with most.
 */
const CURATION_PROMPT = `You are the editor for CityPing, a daily NYC briefing. Select exactly 5 articles that NYC residents NEED to know today.

We aggregate from 30+ NYC news sources including:
- Tier 1 (major): Gothamist, THE CITY, NY Post, Daily News, amNY, Hell Gate
- Tier 2 (specialized): Streetsblog (transit), City Limits (housing), Curbed (real estate), Crain's (business), borough papers
- Tier 3 (hyperlocal): Patch networks, West Side Rag, Bklyner, QNS.com, EV Grieve

**SELECTION PRIORITIES (in order):**
1. Transit/Commute Impact: Subway delays, bus changes, congestion pricing, bike lanes
2. Housing/Rent: Policy changes, lottery deadlines, tenant rights, evictions, new developments
3. Cost of Living: Prices, taxes, fees, utility hikes
4. Safety/Quality of Life: Crime trends, emergency alerts, 311 issues
5. Civic Affairs: City Council, budget, elections, Albany decisions affecting NYC
6. Neighborhood Changes: Openings, closings, development that affects daily life

**HARD EXCLUDES (never select):**
- National politics without specific NYC impact
- Celebrity gossip or entertainment news
- Sports scores or team news (unless stadium affects neighborhood)
- Press releases disguised as news
- Stories older than 36 hours
- Duplicate stories (same event from multiple sources - pick the best one)
- Generic "listicles" or "best of" articles

**DIVERSITY RULES (CRITICAL):**
- Maximum 2 articles from same source (spread across sources)
- At least 1 story affecting outer boroughs (Brooklyn, Queens, Bronx, Staten Island)
- At least 1 story from a specialized source (transit, housing, or business beat)
- Prefer actionable news (something readers can DO or prepare for)
- Prefer investigative journalism over breaking news when both cover same story

**SOURCE QUALITY HINTS:**
- THE CITY, Gothamist, Hell Gate → investigative, trust for housing/policy
- Streetsblog → definitive for transit/bikes/streets
- City Limits → definitive for affordable housing/tenant issues
- NY Post/Daily News → fast on breaking news but verify significance
- Borough papers → essential for local impact stories
- Patch → good for hyperlocal breaking, but verify newsworthiness

**OUTPUT FORMAT:**
Return a JSON array with exactly 5 objects:
[
  {
    "id": "article-id-here",
    "reason": "Why this matters to NYC residents in 1 sentence"
  }
]

Only output the JSON array, nothing else.`;

/**
 * Summary Generation Prompt
 *
 * Creates a brief, scannable summary that captures the key facts
 * without requiring readers to click through to the full article.
 */
const SUMMARY_PROMPT = `Summarize this NYC news in ONE sentence (max 20 words). Just the key fact.

Examples:
- "Mayor Adams proposed a $2B cut to the NYPD budget starting July 1."
- "A measles exposure at Newark Airport could affect travelers through Jan 10."
- "The L train will run express between 8th Ave and Bedford Ave this weekend."

Article title: {{title}}
Article snippet: {{snippet}}

Output only the one-sentence summary.`;

/**
 * NYC Angle Prompt
 *
 * Generates the "so what" commentary that connects the news to
 * readers' daily lives. This is the value-add that distinguishes
 * CityPing from just reading headlines.
 */
const NYC_ANGLE_PROMPT = `Write a 1-sentence NYC-specific insight about this news story.

The insight should answer: "Why should a New Yorker care about this TODAY?"

Examples of good insights:
- "If you take the L, add 15 minutes to your commute this week."
- "This could mean 10,000 new affordable units in Brooklyn by 2027."
- "The last time this happened was the 2019 blackout."

Be specific, practical, and slightly opinionated. No generic observations.

Article title: {{title}}
Article summary: {{summary}}

Output only the insight, nothing else.`;

/**
 * Fetch recent uncurated articles from all sources.
 * Gets articles from the last 24 hours that haven't been curated yet.
 */
async function fetchArticlesForCuration(): Promise<ArticleForCuration[]> {
  // Extended to 36 hours to catch evening articles from previous day
  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000);

  const articles = await prisma.newsArticle.findMany({
    where: {
      publishedAt: { gte: cutoff },
      isSelected: false,
    },
    orderBy: { publishedAt: "desc" },
    take: 100, // Increased for 30+ sources
    select: {
      id: true,
      source: true,
      title: true,
      snippet: true,
      category: true,
      publishedAt: true,
      url: true,
    },
  });

  return articles;
}

/**
 * Use Claude to select the top 3 articles.
 */
async function selectTopArticles(
  articles: ArticleForCuration[]
): Promise<string[]> {
  if (articles.length === 0) {
    console.log("[News Curation] No articles to curate");
    return [];
  }

  // Format articles for the prompt
  const articleList = articles
    .map(
      (a, i) =>
        `${i + 1}. [${a.id}] (${a.source}) ${a.title}${a.category ? ` [${a.category}]` : ""}\n   ${a.snippet?.substring(0, 200) || "No snippet"}`
    )
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `${CURATION_PROMPT}\n\n**TODAY'S ARTICLES:**\n\n${articleList}`,
      },
    ],
  });

  // Parse the JSON response
  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const selections = JSON.parse(text);
    return selections.map((s: { id: string }) => s.id);
  } catch (error) {
    console.error("[News Curation] Failed to parse selection:", text);
    // Fall back to first 3 articles
    return articles.slice(0, 3).map((a) => a.id);
  }
}

/**
 * Generate summary and NYC angle for a single article.
 */
async function generateArticleContent(article: {
  title: string;
  snippet: string | null;
}): Promise<{ summary: string; nycAngle: string }> {
  // Generate summary
  const summaryResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: SUMMARY_PROMPT.replace("{{title}}", article.title).replace(
          "{{snippet}}",
          article.snippet || "No additional details available."
        ),
      },
    ],
  });

  const summary =
    summaryResponse.content[0].type === "text"
      ? summaryResponse.content[0].text.trim()
      : article.snippet || article.title;

  // Generate NYC angle
  const angleResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: NYC_ANGLE_PROMPT.replace("{{title}}", article.title).replace(
          "{{summary}}",
          summary
        ),
      },
    ],
  });

  const nycAngle =
    angleResponse.content[0].type === "text"
      ? angleResponse.content[0].text.trim()
      : "";

  return { summary, nycAngle };
}

/**
 * Main curation function.
 *
 * Fetches recent articles, uses AI to select top 3, generates summaries
 * and NYC angles, then updates the database with curated content.
 *
 * @param forDate - Date to curate for (defaults to today)
 * @returns Array of curated articles ready for the email digest
 */
export async function curateNewsForDate(
  forDate: Date = new Date()
): Promise<CuratedArticle[]> {
  console.log(`[News Curation] Starting curation for ${forDate.toDateString()}`);

  // Fetch candidate articles
  const articles = await fetchArticlesForCuration();
  console.log(`[News Curation] Found ${articles.length} candidate articles`);

  if (articles.length === 0) {
    return [];
  }

  // Select top 3
  const selectedIds = await selectTopArticles(articles);
  console.log(`[News Curation] Selected: ${selectedIds.join(", ")}`);

  const curated: CuratedArticle[] = [];

  // Generate content for each selected article
  for (const id of selectedIds) {
    const article = articles.find((a) => a.id === id);
    if (!article) continue;

    const { summary, nycAngle } = await generateArticleContent({
      title: article.title,
      snippet: article.snippet,
    });

    // Update database
    await prisma.newsArticle.update({
      where: { id },
      data: {
        summary,
        nycAngle,
        isSelected: true,
        curatedFor: forDate,
        curatedAt: new Date(),
      },
    });

    curated.push({
      id: article.id,
      title: article.title,
      url: article.url,
      source: article.source,
      summary,
      nycAngle,
    });

    console.log(`[News Curation] Curated: ${article.title.substring(0, 50)}...`);
  }

  console.log(`[News Curation] Complete: ${curated.length} articles curated`);

  return curated;
}

/**
 * Re-generate summaries for already-curated articles.
 * Useful when the summary prompt has been updated and you want
 * to apply the new prompt to existing curated articles.
 *
 * @param forDate - Date to re-curate (defaults to today)
 * @returns Array of re-curated articles with fresh summaries
 */
export async function recurateSummaries(
  forDate: Date = new Date()
): Promise<CuratedArticle[]> {
  console.log(`[News Curation] Re-generating summaries for ${forDate.toDateString()}`);

  // Normalize to date only
  const startOfDay = new Date(forDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(forDate);
  endOfDay.setHours(23, 59, 59, 999);

  const articles = await prisma.newsArticle.findMany({
    where: {
      isSelected: true,
      curatedFor: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      id: true,
      title: true,
      url: true,
      source: true,
      snippet: true,
    },
  });

  if (articles.length === 0) {
    console.log("[News Curation] No curated articles found for this date");
    return [];
  }

  const recurated: CuratedArticle[] = [];

  for (const article of articles) {
    const { summary, nycAngle } = await generateArticleContent({
      title: article.title,
      snippet: article.snippet,
    });

    // Update database with new summaries
    await prisma.newsArticle.update({
      where: { id: article.id },
      data: {
        summary,
        nycAngle,
        curatedAt: new Date(),
      },
    });

    recurated.push({
      id: article.id,
      title: article.title,
      url: article.url,
      source: article.source,
      summary,
      nycAngle,
    });

    console.log(`[News Curation] Re-curated: ${article.title.substring(0, 50)}...`);
  }

  console.log(`[News Curation] Re-curation complete: ${recurated.length} articles`);
  return recurated;
}

/**
 * Get curated news for a specific date.
 * Useful for the email digest to retrieve already-curated articles.
 */
export async function getCuratedNewsForDate(
  forDate: Date = new Date()
): Promise<CuratedArticle[]> {
  // Normalize to date only (no time)
  const startOfDay = new Date(forDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(forDate);
  endOfDay.setHours(23, 59, 59, 999);

  const articles = await prisma.newsArticle.findMany({
    where: {
      isSelected: true,
      curatedFor: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { curatedAt: "asc" },
    select: {
      id: true,
      title: true,
      url: true,
      source: true,
      summary: true,
      nycAngle: true,
    },
  });

  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    url: a.url,
    source: a.source,
    summary: a.summary || "",
    nycAngle: a.nycAngle || "",
  }));
}
