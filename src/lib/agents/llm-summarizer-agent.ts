/**
 * LLM Summarizer Agent
 *
 * Stage 3 of the CityPing multi-agent pipeline.
 *
 * This agent uses Claude Haiku to generate personalized, engaging email content
 * from structured data. It transforms raw data into compelling narratives that
 * resonate with NYC residents.
 *
 * Key Responsibilities:
 * 1. Content Synthesis - Combine multiple sources into cohesive narratives
 * 2. Personalization - Tailor tone and content to user preferences
 * 3. Headline Generation - Create compelling subject lines and headers
 * 4. "Why Care" Explanations - Explain relevance of news to reader's life
 *
 * Output: DigestContentV2 with llmCallCount and error tracking
 *
 * Design Philosophy:
 * - Tufte-inspired: Dense, information-rich, no fluff
 * - NYC voice: Direct, efficient, slightly sardonic
 * - Actionable: Every piece of information should help decision-making
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ContentSelection } from "./data-quality-agent";
import type { NewsArticle } from "@prisma/client";
import { prisma } from "../db";
import { fetchNYCWeatherForecast, type DayForecast } from "../weather";
import {
  generateNanoAppSubject,
  type WeatherData,
  type NanoAppSubject,
} from "./subject-line-nano-app";

// Import V2 types
import type {
  ContentSelectionV2,
  SummarizationConfigV2,
  DigestContentV2,
  NewsDigestItemV2,
  WeatherDataV2,
  NanoAppSubjectV2,
  OrchestrationError,
  ScoredNewsArticle,
} from "./types";

import { DEFAULT_SUMMARIZATION_CONFIG } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface DigestContent {
  subject: string;
  preheader: string;
  greeting: string;
  weatherSummary: string;
  weatherData: WeatherData | null;
  commuteSummary: string;
  newsItems: NewsDigestItem[];
  eventsHighlight: string;
  signOff: string;
  generatedAt: string;
  nanoApp?: NanoAppSubject; // The full nano-app subject data
}

export interface NewsDigestItem {
  headline: string;
  summary: string;
  whyCare: string;
  source: string;
  url: string;
  score: number;
}

export interface SummarizationConfig {
  tone?: "casual" | "professional" | "urgent";
  maxNewsItems?: number;
  includeWhyCare?: boolean;
  userPreferences?: {
    interests?: string[];
    neighborhood?: string;
    commuteLines?: string[];
  };
}

// =============================================================================
// CLAUDE CLIENT
// =============================================================================

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a NYC-savvy email digest writer. Your job is to transform raw news and alerts into compelling, useful content for New Yorkers.

VOICE & TONE:
- Direct and efficient - respect the reader's time
- Slightly sardonic NYC attitude, but never mean
- Information-dense like Edward Tufte would approve
- No fluff, no unnecessary adjectives
- Every sentence should be useful

FORMAT RULES:
- Keep summaries under 2 sentences
- "Why care" explanations should connect to daily life
- Use active voice
- Avoid clichés like "in today's fast-paced world"
- Numbers and specifics over vague claims

EXAMPLES OF GOOD VS BAD:
❌ "The MTA announced some changes that might affect your commute."
✅ "A/C/E suspended downtown until 10am - take the 1/2/3 instead."

❌ "There's a really great new restaurant opening!"
✅ "Momofuku alum opening ramen spot in LES, $16 bowls, opens Friday."`;

// =============================================================================
// SUMMARIZATION FUNCTIONS
// =============================================================================

/**
 * Generate a compelling email subject line based on the day's top content.
 */
export async function generateSubjectLine(
  selection: ContentSelection,
  weather?: { temp: number; condition: string }
): Promise<string> {
  const topNews = selection.news[0];
  const activeAlerts = selection.alerts.filter(a => a.score > 70);

  // Build context for Claude
  const context = {
    hasUrgentAlert: activeAlerts.some(a => a.score > 90),
    topHeadline: topNews?.title || null,
    alertCount: activeAlerts.length,
    weather: weather ? `${weather.temp}°F, ${weather.condition}` : null,
    dayOfWeek: new Date().toLocaleDateString("en-US", { weekday: "long" }),
  };

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 100,
      system: "Generate a single email subject line for a NYC daily digest. Be concise, informative, specific. Max 50 characters. No quotes in response.",
      messages: [{
        role: "user",
        content: `Context: ${JSON.stringify(context)}

Generate ONE subject line that captures the most important thing a NYC resident should know today.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim().replace(/^["']|["']$/g, ""); // Remove quotes if present
  } catch (error) {
    console.error("[LLM] Failed to generate subject:", error);
    // Fallback to simple template
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `NYC Today ${date}: ${selection.news.length} stories`;
  }
}

/**
 * Generate a "why you should care" explanation for a news article.
 * This connects abstract news to the reader's daily life.
 */
export async function generateWhyCare(
  article: NewsArticle,
  userContext?: { neighborhood?: string; interests?: string[] }
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 100,
      system: "You explain why NYC news matters to residents. Be specific and practical. One sentence max.",
      messages: [{
        role: "user",
        content: `Headline: ${article.title}
Summary: ${article.snippet || article.summary || "No summary available"}
User neighborhood: ${userContext?.neighborhood || "Manhattan"}
User interests: ${userContext?.interests?.join(", ") || "general"}

Why should this NYC resident care about this story? Be specific about impact on daily life.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim();
  } catch (error) {
    console.error("[LLM] Failed to generate why-care:", error);
    return "This could affect your daily routine or local community.";
  }
}

/**
 * Generate a brief, useful summary of transit alerts.
 */
export async function generateCommuteSummary(
  alerts: Array<{ id: string; title: string; score: number }>
): Promise<string> {
  if (alerts.length === 0) {
    return "All subway lines running normal service.";
  }

  const alertData = alerts.map(a => ({
    title: a.title,
    severity: a.score > 80 ? "active" : "scheduled",
  }));

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 150,
      system: "Summarize MTA alerts for commuters. Be direct and actionable. Mention specific lines affected if mentioned in alerts. Two sentences max.",
      messages: [{
        role: "user",
        content: `Alerts: ${JSON.stringify(alertData)}

Summarize what a commuter needs to know right now. Include affected lines and alternatives if obvious.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim();
  } catch (error) {
    console.error("[LLM] Failed to generate commute summary:", error);
    return `${alerts.length} service alert${alerts.length > 1 ? "s" : ""} affecting subway service.`;
  }
}

/**
 * Fetch today's weather and convert to WeatherData format.
 */
async function fetchTodayWeather(): Promise<WeatherData | null> {
  try {
    const forecast = await fetchNYCWeatherForecast();
    if (!forecast || forecast.days.length === 0) return null;

    const today = forecast.days[0];
    // Determine emoji from condition
    const condition = today.shortForecast.toLowerCase();
    let emoji = "🌤️";
    if (condition.includes("sunny") || condition.includes("clear")) emoji = "☀️";
    else if (condition.includes("rain")) emoji = "🌧️";
    else if (condition.includes("snow")) emoji = "❄️";
    else if (condition.includes("cloud")) emoji = "☁️";
    else if (condition.includes("partly")) emoji = "⛅";
    else if (condition.includes("thunder")) emoji = "⛈️";
    else if (condition.includes("fog")) emoji = "🌫️";

    return {
      temp: today.temperature,
      condition: today.shortForecast,
      emoji,
    };
  } catch (error) {
    console.error("[LLM] Weather fetch failed:", error);
    return null;
  }
}

/**
 * Generate the complete digest content from selected data.
 * This is the main entry point for the LLM Summarizer Agent.
 */
export async function generateDigestContent(
  selection: ContentSelection,
  config: SummarizationConfig = {}
): Promise<DigestContent> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("[LLM] Generating personalized digest content...");
  console.log(`[LLM] Processing ${selection.news.length} news, ${selection.alerts.length} alerts`);
  console.log("═══════════════════════════════════════════════════════════════");

  const startTime = Date.now();

  // Fetch weather first (needed for nano-app subject)
  const weatherData = await fetchTodayWeather();
  console.log(`[LLM] Weather: ${weatherData?.emoji} ${weatherData?.temp}°F ${weatherData?.condition || "unavailable"}`);

  // Generate nano-app subject line (5 bites of information)
  let nanoApp: NanoAppSubject | undefined;
  let subject: string;
  let preheader: string;

  if (weatherData) {
    nanoApp = await generateNanoAppSubject(selection, weatherData);
    subject = nanoApp.full;
    preheader = nanoApp.preheader;
    console.log(`[LLM] Nano-app subject (${nanoApp.characterCount} chars): ${subject}`);
  } else {
    // Fallback to basic subject if no weather
    subject = await generateSubjectLine(selection);
    preheader = selection.news[0]
      ? `Top story: ${selection.news[0].title.slice(0, 60)}...`
      : "Your daily NYC briefing";
  }

  // Generate commute summary
  const commuteSummary = await generateCommuteSummary(selection.alerts);

  // Fetch full news articles from database
  const maxNews = config.maxNewsItems || 5;
  const newsIds = selection.news.slice(0, maxNews).map(n => n.id);
  const fullNewsArticles = await prisma.newsArticle.findMany({
    where: { id: { in: newsIds } },
  });

  // Build lookup map for ordering
  const newsMap = new Map(fullNewsArticles.map(a => [a.id, a]));
  const newsItems: NewsDigestItem[] = [];

  for (let i = 0; i < newsIds.length; i++) {
    const article = newsMap.get(newsIds[i]);
    if (!article) continue;

    // Only generate why-care for top 3 stories (expensive LLM calls)
    const whyCare = config.includeWhyCare !== false && i < 3
      ? await generateWhyCare(article, config.userPreferences)
      : "";

    newsItems.push({
      headline: article.title,
      summary: article.snippet || article.summary || "",
      whyCare,
      source: article.source,
      url: article.url,
      score: selection.news[i].score,
    });
  }

  // Generate events highlight
  const eventsHighlight = selection.events.length > 0
    ? `${selection.events.length} event${selection.events.length > 1 ? "s" : ""} happening this week`
    : "No major events scheduled";

  // Generate greeting based on time of day
  const hour = new Date().getHours();
  let greeting: string;
  if (hour < 12) {
    greeting = "Good morning, New York.";
  } else if (hour < 17) {
    greeting = "Good afternoon, New York.";
  } else {
    greeting = "Good evening, New York.";
  }

  // Weather summary for body (more detailed than subject)
  const weatherSummary = weatherData
    ? `${weatherData.emoji} ${weatherData.temp}°F and ${weatherData.condition.toLowerCase()}`
    : "";

  // Sign-off
  const signOffs = [
    "Stay informed, stay ahead.",
    "That's your NYC briefing.",
    "Now you know.",
    "Go get 'em.",
  ];
  const signOff = signOffs[Math.floor(Math.random() * signOffs.length)];

  const duration = Date.now() - startTime;
  console.log(`[LLM] Generated digest in ${duration}ms`);
  console.log("═══════════════════════════════════════════════════════════════");

  return {
    subject,
    preheader,
    greeting,
    weatherSummary,
    weatherData,
    commuteSummary,
    newsItems,
    eventsHighlight,
    signOff,
    generatedAt: new Date().toISOString(),
    nanoApp,
  };
}

/**
 * Generate a compelling "hype score" explanation for an event or deal.
 */
export async function generateHypeExplanation(
  name: string,
  score: number,
  context: string
): Promise<string> {
  const level = score >= 90 ? "HOT" : score >= 70 ? "Worth it" : "Meh";

  if (score < 70) {
    return `${level} (${score})`;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 50,
      system: "Explain why something is hot/worth it in 5-10 words. NYC voice. No fluff.",
      messages: [{
        role: "user",
        content: `Name: ${name}
Score: ${score}/100
Context: ${context}

Why is this ${level}? Very brief.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return `${level} (${score}) - ${text.trim()}`;
  } catch (error) {
    return `${level} (${score})`;
  }
}

/**
 * Batch generate summaries for multiple items efficiently.
 * Uses a single LLM call to reduce latency.
 */
export async function batchSummarize(
  items: Array<{ id: string; title: string; description: string }>
): Promise<Record<string, string>> {
  if (items.length === 0) return {};

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 500,
      system: "Summarize each item in 1-2 sentences. Return JSON with id -> summary mapping.",
      messages: [{
        role: "user",
        content: `Items to summarize:
${items.map((item, i) => `${i + 1}. [${item.id}] ${item.title}: ${item.description}`).join("\n")}

Return JSON object mapping each id to its summary.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";

    // Try to parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {};
  } catch (error) {
    console.error("[LLM] Batch summarize failed:", error);
    return {};
  }
}

// =============================================================================
// V2 DIGEST GENERATION - Accepts full Prisma records, tracks LLM calls
// =============================================================================

/**
 * Create an OrchestrationError for the summarization stage.
 */
function createSummarizationError(
  message: string,
  recoverable: boolean = true
): OrchestrationError {
  return {
    stage: "summarization",
    severity: recoverable ? "warning" : "error",
    message,
    timestamp: new Date(),
    recoverable,
  };
}

/**
 * Generate "why you should care" for a ScoredNewsArticle.
 * Wrapper around generateWhyCare that works with V2 types.
 */
async function generateWhyCareV2(
  article: ScoredNewsArticle,
  userContext?: { neighborhood?: string; interests?: string[] }
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 100,
      system: "You explain why NYC news matters to residents. Be specific and practical. One sentence max.",
      messages: [{
        role: "user",
        content: `Headline: ${article.title}
Summary: ${article.snippet || article.summary || "No summary available"}
User neighborhood: ${userContext?.neighborhood || "Manhattan"}
User interests: ${userContext?.interests?.join(", ") || "general"}

Why should this NYC resident care about this story? Be specific about impact on daily life.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim();
  } catch (error) {
    console.error("[LLM] Failed to generate why-care:", error);
    return "This could affect your daily routine or local community.";
  }
}

/**
 * Generate commute summary from ScoredAlertEvent array.
 */
async function generateCommuteSummaryV2(
  alerts: Array<{ title: string; scores: { overall: number } }>
): Promise<string> {
  if (alerts.length === 0) {
    return "All subway lines running normal service.";
  }

  const alertData = alerts.map(a => ({
    title: a.title,
    severity: a.scores.overall > 80 ? "active" : "scheduled",
  }));

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 150,
      system: "Summarize MTA alerts for commuters. Be direct and actionable. Mention specific lines affected if mentioned in alerts. Two sentences max.",
      messages: [{
        role: "user",
        content: `Alerts: ${JSON.stringify(alertData)}

Summarize what a commuter needs to know right now. Include affected lines and alternatives if obvious.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim();
  } catch (error) {
    console.error("[LLM] Failed to generate commute summary:", error);
    return `${alerts.length} service alert${alerts.length > 1 ? "s" : ""} affecting subway service.`;
  }
}

/**
 * Generate the complete digest content from ContentSelectionV2.
 *
 * This is the main Stage 3 output function for the V2 pipeline.
 *
 * Key improvements over generateDigestContent:
 * - Accepts full Prisma records (no DB fetching needed)
 * - Tracks accurate llmCallCount
 * - Returns errors array for non-fatal issues
 * - Uses unified scoring from selection
 */
export async function generateDigestContentV2(
  selection: ContentSelectionV2,
  config: SummarizationConfigV2 = {}
): Promise<DigestContentV2> {
  const cfg = { ...DEFAULT_SUMMARIZATION_CONFIG, ...config };
  const errors: OrchestrationError[] = [];
  let llmCallCount = 0;

  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  STAGE 3: LLM SUMMARIZER AGENT - Generating Digest          │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  console.log(`[LLM] Processing ${selection.news.length} news, ${selection.alerts.length} alerts`);
  console.log(`[LLM] Config: maxNewsItems=${cfg.maxNewsItems}, includeWhyCare=${cfg.includeWhyCare}`);

  const startTime = Date.now();

  // Fetch weather (needed for nano-app subject)
  let weatherData: WeatherDataV2 | null = null;
  try {
    const forecast = await fetchNYCWeatherForecast();
    if (forecast && forecast.days.length > 0) {
      const today = forecast.days[0];
      const condition = today.shortForecast.toLowerCase();
      let emoji = "🌤️";
      if (condition.includes("sunny") || condition.includes("clear")) emoji = "☀️";
      else if (condition.includes("rain")) emoji = "🌧️";
      else if (condition.includes("snow")) emoji = "❄️";
      else if (condition.includes("cloud")) emoji = "☁️";
      else if (condition.includes("partly")) emoji = "⛅";
      else if (condition.includes("thunder")) emoji = "⛈️";
      else if (condition.includes("fog")) emoji = "🌫️";

      weatherData = {
        temp: today.temperature,
        condition: today.shortForecast,
        emoji,
      };
    }
  } catch (error) {
    console.error("[LLM] Weather fetch failed:", error);
    errors.push(createSummarizationError("Weather data unavailable", true));
  }

  console.log(`[LLM] Weather: ${weatherData?.emoji || "❓"} ${weatherData?.temp || "?"}°F ${weatherData?.condition || "unavailable"}`);

  // Generate subject line
  let subject: string;
  let preheader: string;
  let nanoApp: NanoAppSubjectV2 | undefined;

  // Convert selection to legacy format for generateNanoAppSubject compatibility
  const legacySelection: ContentSelection = {
    news: selection.news.map(n => ({ id: n.id, title: n.title, score: n.scores.overall })),
    alerts: selection.alerts.map(a => ({ id: a.id, title: a.title, score: a.scores.overall })),
    events: selection.events.map(e => ({ id: e.id, name: e.name, score: e.scores.overall })),
    dining: selection.dining.map(d => ({ id: d.id, brand: d.restaurant || d.title || "Deal", score: d.scores.overall })),
    summary: {
      total: selection.summary.totalSelected,
      selected: selection.summary.totalSelected,
      totalSelected: selection.summary.totalSelected,
      totalEvaluated: selection.summary.totalEvaluated,
      averageQuality: selection.summary.averageQuality,
      topSources: selection.summary.topSources,
      categories: selection.summary.categoryBreakdown as unknown as Record<string, number>,
    },
  };

  if (weatherData && cfg.includeNanoApp !== false) {
    try {
      const nanoResult = await generateNanoAppSubject(legacySelection, weatherData as WeatherData);
      llmCallCount++; // Nano app uses LLM
      nanoApp = {
        full: nanoResult.full,
        preheader: nanoResult.preheader,
        bites: nanoResult.bites.map(b => ({
          category: b.category,
          emoji: b.emoji,
          hook: b.hook,
          specifics: b.specifics,
          priority: b.priority,
        })),
        characterCount: nanoResult.characterCount,
      };
      subject = nanoResult.full;
      preheader = nanoResult.preheader;
      console.log(`[LLM] Nano-app subject (${nanoResult.characterCount} chars): ${subject}`);
    } catch (error) {
      console.error("[LLM] Nano-app subject failed:", error);
      errors.push(createSummarizationError("Nano-app subject generation failed, using fallback", true));
      // Fallback
      subject = await generateSubjectLine(legacySelection);
      llmCallCount++;
      preheader = selection.news[0]
        ? `Top story: ${selection.news[0].title.slice(0, 60)}...`
        : "Your daily NYC briefing";
    }
  } else {
    // No weather or nano-app disabled
    try {
      subject = await generateSubjectLine(legacySelection);
      llmCallCount++;
    } catch (error) {
      const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      subject = `NYC Today ${date}: ${selection.news.length} stories`;
      errors.push(createSummarizationError("Subject line generation failed, using fallback", true));
    }
    preheader = selection.news[0]
      ? `Top story: ${selection.news[0].title.slice(0, 60)}...`
      : "Your daily NYC briefing";
  }

  // Generate commute summary
  let commuteSummary: string;
  try {
    commuteSummary = await generateCommuteSummaryV2(selection.alerts);
    llmCallCount++;
  } catch (error) {
    commuteSummary = selection.alerts.length > 0
      ? `${selection.alerts.length} service alert${selection.alerts.length > 1 ? "s" : ""} affecting subway service.`
      : "All subway lines running normal service.";
    errors.push(createSummarizationError("Commute summary generation failed, using fallback", true));
  }

  // Build news items - NO DB FETCH NEEDED (we have full records)
  const maxNews = cfg.maxNewsItems || 5;
  const newsToProcess = selection.news.slice(0, maxNews);
  const newsItems: NewsDigestItemV2[] = [];

  for (let i = 0; i < newsToProcess.length; i++) {
    const article = newsToProcess[i];

    // Only generate why-care for top 3 stories (expensive LLM calls)
    let whyCare = "";
    if (cfg.includeWhyCare !== false && i < 3) {
      try {
        whyCare = await generateWhyCareV2(article, cfg.userPreferences);
        llmCallCount++;
      } catch (error) {
        whyCare = "This could affect your daily routine or local community.";
        errors.push(createSummarizationError(`Why-care generation failed for article: ${article.title.slice(0, 30)}...`, true));
      }
    }

    newsItems.push({
      headline: article.title,
      summary: article.snippet || article.summary || "",
      whyCare,
      source: article.source,
      url: article.url,
      score: article.scores.overall,
      category: article.category,
    });
  }

  // Generate events highlight
  const eventsHighlight = selection.events.length > 0
    ? `${selection.events.length} event${selection.events.length > 1 ? "s" : ""} happening this week`
    : "No major events scheduled";

  // Generate greeting based on time of day
  const hour = new Date().getHours();
  let greeting: string;
  if (hour < 12) {
    greeting = "Good morning, New York.";
  } else if (hour < 17) {
    greeting = "Good afternoon, New York.";
  } else {
    greeting = "Good evening, New York.";
  }

  // Weather summary for body
  const weatherSummary = weatherData
    ? `${weatherData.emoji} ${weatherData.temp}°F and ${weatherData.condition.toLowerCase()}`
    : "";

  // Sign-off
  const signOffs = [
    "Stay informed, stay ahead.",
    "That's your NYC briefing.",
    "Now you know.",
    "Go get 'em.",
  ];
  const signOff = signOffs[Math.floor(Math.random() * signOffs.length)];

  const duration = Date.now() - startTime;
  console.log(`[LLM] Generated digest in ${duration}ms with ${llmCallCount} LLM calls`);
  console.log(`[LLM] Errors: ${errors.length} non-fatal`);

  return {
    subject,
    preheader,
    greeting,
    weatherSummary,
    weatherData,
    commuteSummary,
    newsItems,
    eventsHighlight,
    signOff,
    generatedAt: new Date().toISOString(),
    nanoApp,
    llmCallCount,
    errors,
  };
}
