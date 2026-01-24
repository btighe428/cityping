/**
 * LLM Summarizer Agent
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
 * Design Philosophy:
 * - Tufte-inspired: Dense, information-rich, no fluff
 * - NYC voice: Direct, efficient, slightly sardonic
 * - Actionable: Every piece of information should help decision-making
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ContentSelection, ScoredContent } from "./data-quality-agent";
import type { NewsArticle, AlertEvent } from "@prisma/client";
import { fetchNYCWeatherForecast, type DayForecast } from "../weather";
import {
  generateNanoAppSubject,
  type WeatherData,
  type NanoAppSubject,
} from "./subject-line-nano-app";

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
  const topNews = selection.news[0]?.item;
  const activeAlerts = selection.alerts.filter(a => a.score.overall > 70);

  // Build context for Claude
  const context = {
    hasUrgentAlert: activeAlerts.some(a => a.score.dimensions.timeliness > 90),
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
  alerts: ScoredContent<AlertEvent>[]
): Promise<string> {
  if (alerts.length === 0) {
    return "All subway lines running normal service.";
  }

  const alertData = alerts.map(a => ({
    title: a.item.title,
    lines: (a.item.metadata as Record<string, unknown>)?.affectedLines || [],
    severity: a.score.dimensions.timeliness > 80 ? "active" : "scheduled",
  }));

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 150,
      system: "Summarize MTA alerts for commuters. Be direct and actionable. Mention specific lines affected. Two sentences max.",
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
      ? `Top story: ${selection.news[0].item.title.slice(0, 60)}...`
      : "Your daily NYC briefing";
  }

  // Generate commute summary
  const commuteSummary = await generateCommuteSummary(selection.alerts);

  // Generate news items with "why care" explanations
  const maxNews = config.maxNewsItems || 5;
  const newsItems: NewsDigestItem[] = [];

  for (const scoredNews of selection.news.slice(0, maxNews)) {
    const article = scoredNews.item;

    // Only generate why-care for top stories (expensive LLM calls)
    const whyCare = config.includeWhyCare !== false && scoredNews.rank <= 3
      ? await generateWhyCare(article, config.userPreferences)
      : "";

    newsItems.push({
      headline: article.title,
      summary: article.snippet || article.summary || "",
      whyCare,
      source: article.source,
      url: article.url,
      score: scoredNews.score.overall,
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
