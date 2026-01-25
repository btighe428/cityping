// src/lib/agents/horizon-agent.ts
/**
 * HORIZON AGENT
 *
 * Generates proactive alerts from the NYC Knowledge Base.
 * These are events we KNOW will happen that readers should prepare for.
 *
 * Features:
 * - Scans knowledge base for upcoming events within alert windows
 * - Uses GPT-4o-mini to generate natural language messages
 * - Respects premium gating for subscriber-only alerts
 * - Returns urgency-sorted alerts for email digest integration
 *
 * Cost: ~$0.00015/day (300 tokens at gpt-4o-mini rates)
 */

import { DateTime } from "luxon";
import { getOpenAIClient } from "../embeddings/openai-client";
import {
  getAlertsForToday,
  KnownEvent,
  formatEventDate,
  applyMessageTemplate,
  EventCategory,
} from "../../config/nyc-knowledge";

// =============================================================================
// TYPES
// =============================================================================

export interface HorizonAlert {
  id: string;
  event: KnownEvent;
  eventDate: DateTime;
  daysUntil: number;
  message: string; // LLM-generated natural language
  urgency: "high" | "medium" | "low";
  premium: boolean;
}

export interface HorizonResult {
  alerts: HorizonAlert[];
  generatedAt: DateTime;
  tokensUsed: number;
  errors: string[];
}

export interface HorizonOptions {
  today?: DateTime;
  includePremium?: boolean;
  maxAlerts?: number;
  categories?: EventCategory[];
  useLLM?: boolean; // Set to false to skip LLM and use templates only
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate horizon alerts for today's digest.
 *
 * @param options - Configuration options
 * @returns HorizonResult with alerts sorted by urgency
 */
export async function generateHorizonAlerts(
  options?: HorizonOptions
): Promise<HorizonResult> {
  const today = options?.today || DateTime.now();
  const maxAlerts = options?.maxAlerts || 5;
  const useLLM = options?.useLLM !== false; // Default to true
  const errors: string[] = [];

  // Get events that should alert today
  const todayAlerts = getAlertsForToday(today, {
    categories: options?.categories,
    includePremium: options?.includePremium,
  });

  // Sort by urgency (closer events first), limit
  const prioritized = todayAlerts
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, maxAlerts);

  if (prioritized.length === 0) {
    return {
      alerts: [],
      generatedAt: today,
      tokensUsed: 0,
      errors: [],
    };
  }

  // Generate messages
  let messages: string[];
  let tokensUsed = 0;

  if (useLLM) {
    try {
      const llmResult = await generateMessagesWithLLM(prioritized, today);
      messages = llmResult.messages;
      tokensUsed = llmResult.tokensUsed;
    } catch (error) {
      // Fall back to templates on LLM failure
      errors.push(
        `LLM generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      messages = prioritized.map((item) =>
        applyMessageTemplate(item.event.messageTemplate, item.eventDate)
      );
    }
  } else {
    // Use templates directly
    messages = prioritized.map((item) =>
      applyMessageTemplate(item.event.messageTemplate, item.eventDate)
    );
  }

  // Build final alerts
  const alerts: HorizonAlert[] = prioritized.map((item, i) => ({
    id: `horizon-${item.event.id}-${item.eventDate.toISODate()}`,
    event: item.event,
    eventDate: item.eventDate,
    daysUntil: item.daysUntil,
    message: messages[i] || applyMessageTemplate(item.event.messageTemplate, item.eventDate),
    urgency: determineUrgency(item.daysUntil, item.event.category),
    premium: item.event.premium || false,
  }));

  return {
    alerts,
    generatedAt: today,
    tokensUsed,
    errors,
  };
}

// =============================================================================
// LLM MESSAGE GENERATION
// =============================================================================

interface LLMResult {
  messages: string[];
  tokensUsed: number;
}

// LLM call timeout and retry configuration
const LLM_TIMEOUT_MS = 15000; // 15 second timeout
const LLM_MAX_RETRIES = 2;

/**
 * Generate natural language messages using GPT-4o-mini.
 * Includes timeout and retry logic for production robustness.
 */
async function generateMessagesWithLLM(
  items: Array<{ event: KnownEvent; eventDate: DateTime; daysUntil: number }>,
  today: DateTime
): Promise<LLMResult> {
  const openai = getOpenAIClient();
  const prompt = buildPrompt(items, today);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= LLM_MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a helpful NYC assistant writing brief, actionable alerts for a daily email digest.

CRITICAL: Use the EXACT timing provided (TODAY, TOMORROW, or "in X days"). Do NOT say "today" if the event is tomorrow.

Style guidelines:
- Write in a friendly but concise style
- Each message should be 1-2 sentences max
- Focus on the action the reader should take or the impact on their day
- Use the provided template as a starting point but make it sound natural
- Include urgency cues for time-sensitive items ("Don't forget...", "Last day to...")
- ALWAYS match the exact day provided: TODAY means today, TOMORROW means tomorrow`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        },
        { timeout: LLM_TIMEOUT_MS }
      );

      const content = response.choices[0]?.message?.content || "";
      const messages = parseResponse(content, items.length);

      return {
        messages,
        tokensUsed: response.usage?.total_tokens || 0,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[HorizonAgent] LLM attempt ${attempt}/${LLM_MAX_RETRIES} failed: ${lastError.message}`
      );

      // Don't retry on non-transient errors
      if (
        lastError.message.includes("API key") ||
        lastError.message.includes("401") ||
        lastError.message.includes("403")
      ) {
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < LLM_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error("LLM generation failed after retries");
}

/**
 * Build the prompt for LLM message generation.
 */
function buildPrompt(
  items: Array<{ event: KnownEvent; eventDate: DateTime; daysUntil: number }>,
  today: DateTime
): string {
  const lines = items.map((a, i) => {
    const dateStr = formatEventDate(a.eventDate);
    const daysStr =
      a.daysUntil === 0
        ? "TODAY"
        : a.daysUntil === 1
          ? "TOMORROW"
          : `in ${a.daysUntil} days`;

    return `${i + 1}. Event: ${a.event.title}
   Date: ${dateStr} (${daysStr})
   Category: ${a.event.category}
   Template: ${a.event.messageTemplate}
   Action URL: ${a.event.actionUrl || "none"}`;
  });

  return `Today is ${today.toFormat("EEEE, MMMM d, yyyy")}.

Generate a brief, natural message for each of these upcoming NYC events.
Keep each message to 1-2 sentences. Make them actionable and helpful.

Events:
${lines.join("\n\n")}

Respond with numbered messages (1., 2., etc.) matching the event order above.`;
}

/**
 * Parse the LLM response into individual messages.
 */
function parseResponse(content: string, count: number): string[] {
  const messages: string[] = [];

  for (let i = 1; i <= count; i++) {
    const pattern = new RegExp(`^${i}\\.\\s*(.+)`, "m");
    const match = content.match(pattern);
    if (match) {
      // Clean up the message - remove any trailing quotes or extra punctuation
      let message = match[1].trim();
      // Remove leading/trailing quotes if present
      if (
        (message.startsWith('"') && message.endsWith('"')) ||
        (message.startsWith("'") && message.endsWith("'"))
      ) {
        message = message.slice(1, -1);
      }
      messages.push(message);
    } else {
      messages.push(""); // Will fall back to template
    }
  }

  return messages;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine urgency level based on days until event and category.
 */
function determineUrgency(
  daysUntil: number,
  category: EventCategory
): "high" | "medium" | "low" {
  // Same-day events are always high urgency
  if (daysUntil === 0) return "high";

  // Next-day events are high for certain categories
  if (daysUntil === 1) {
    if (["tax", "civic", "transit", "parking"].includes(category)) {
      return "high";
    }
    return "medium";
  }

  // 2-3 days out
  if (daysUntil <= 3) {
    if (["tax", "civic"].includes(category)) {
      return "medium";
    }
    return "low";
  }

  // More than 3 days out
  return "low";
}

/**
 * Filter alerts by premium status.
 * Returns both free and premium alerts for convenience.
 */
export function partitionAlertsByPremium(alerts: HorizonAlert[]): {
  free: HorizonAlert[];
  premium: HorizonAlert[];
} {
  return {
    free: alerts.filter((a) => !a.premium),
    premium: alerts.filter((a) => a.premium),
  };
}

/**
 * Get a summary of horizon alerts for logging/debugging.
 */
export function summarizeHorizonResult(result: HorizonResult): string {
  const { alerts, tokensUsed, errors } = result;

  if (alerts.length === 0) {
    return "No horizon alerts for today.";
  }

  const lines = [
    `Horizon alerts: ${alerts.length}`,
    `  High urgency: ${alerts.filter((a) => a.urgency === "high").length}`,
    `  Medium urgency: ${alerts.filter((a) => a.urgency === "medium").length}`,
    `  Low urgency: ${alerts.filter((a) => a.urgency === "low").length}`,
    `  Premium: ${alerts.filter((a) => a.premium).length}`,
    `  Tokens used: ${tokensUsed}`,
  ];

  if (errors.length > 0) {
    lines.push(`  Errors: ${errors.join(", ")}`);
  }

  return lines.join("\n");
}
