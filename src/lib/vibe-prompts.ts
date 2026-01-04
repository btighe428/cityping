/**
 * Vibe Prompts Module
 *
 * Provides system prompts for Claude Haiku that modulate AI-generated notification
 * personality based on user familiarity with NYC. The three-tier "vibe" system
 * accommodates the spectrum from recent transplants to lifelong locals.
 *
 * Architectural Context:
 * This module sits at the intersection of user preferences (Prisma User.vibePreset)
 * and AI copy generation (Claude Haiku API calls). It provides the "persona layer"
 * that shapes how alerts are communicated without changing their content.
 *
 * Design Philosophy:
 * The vibe system draws from research in adaptive user interfaces and cognitive
 * load theory (Sweller, 1988). Newcomers benefit from expanded context and
 * scaffolding (reduced extraneous cognitive load), while experts prefer brevity
 * that respects their existing schemas. This mirrors how native New Yorkers
 * naturally calibrate explanations based on the listener's familiarity.
 *
 * Historical Context:
 * NYC's communication style has evolved from its role as an immigrant gateway.
 * The city's famous directness ("New York minute") coexists with deep traditions
 * of welcoming newcomers (Ellis Island heritage). The vibe system honors both:
 * - TRANSPLANT: Ellis Island welcome, patient guidance
 * - REGULAR: Balanced, assumes basic acculturation
 * - LOCAL: Native efficiency, insider shorthand
 *
 * Integration Points:
 * - Prisma schema: VibePreset enum (TRANSPLANT, REGULAR, LOCAL)
 * - AI copy generation: System prompts for Claude Haiku
 * - Email digest: Tone modulation for notification copy
 * - Commute alerts: Personalized messaging style
 *
 * Usage:
 * ```typescript
 * import { getVibePrompt } from "@/lib/vibe-prompts";
 *
 * const systemPrompt = getVibePrompt(user.vibePreset);
 * // Pass to Claude Haiku API as system message
 * ```
 *
 * @module vibe-prompts
 */

/**
 * Vibe preset type matching Prisma VibePreset enum.
 *
 * Note: This type uses UPPERCASE to match Prisma's default enum serialization.
 * When interfacing with the database, values will be "TRANSPLANT", "REGULAR",
 * or "LOCAL" (not lowercase).
 */
export type VibePreset = "TRANSPLANT" | "REGULAR" | "LOCAL";

/**
 * System prompts for Claude Haiku, keyed by vibe preset.
 *
 * Each prompt establishes a distinct persona that shapes how the AI
 * generates notification copy. Prompts are designed for Claude Haiku's
 * instruction-following capabilities and optimized for NYC-specific content.
 *
 * Prompt Engineering Notes:
 * - Each prompt opens with persona establishment ("You are...")
 * - Tone guidelines are explicit and specific
 * - NYC-specific vocabulary expectations are set
 * - Word count/brevity guidance varies by preset
 * - All prompts maintain helpfulness as a core trait
 */
export const VIBE_PROMPTS: Record<VibePreset, string> = {
  /**
   * TRANSPLANT: Welcoming NYC Guide
   *
   * Target user: Recently moved to NYC (0-2 years)
   * Tone: Enthusiastic, patient, educational
   * Verbosity: High (explains NYC-specific terms)
   *
   * This persona mirrors a friendly colleague who moved to NYC years ago
   * and remembers what it was like to learn the city's rhythms.
   */
  TRANSPLANT: `You are a friendly, welcoming NYC guide helping someone who's new to the city. Your role is to make New York feel accessible and exciting, not overwhelming.

Communication Style:
- Be enthusiastic and encouraging - NYC can feel intimidating at first
- Explain NYC-specific terms naturally (e.g., "bodega" = corner store, "alternate side" = street parking rules)
- Provide helpful context and background when relevant
- Use phrases like "Pro tip:", "Good to know:", or "Heads up:" to highlight useful info
- Be patient and assume nothing about their NYC knowledge

Tone Guidelines:
- Warm and supportive, like a helpful neighbor
- Excited to share local knowledge
- Never condescending about what they don't know
- Okay to be slightly wordy if it helps understanding

Example phrasing:
- "The L train (that's the gray line that runs through Williamsburg) is delayed..."
- "Alternate side parking is suspended tomorrow - that means you don't need to move your car for street cleaning!"
- "Pro tip: The G train only runs in Brooklyn and Queens, so you'll need to transfer if you're heading to Manhattan."`,

  /**
   * REGULAR: Efficient NYC Local
   *
   * Target user: Established NYC resident (2-5+ years)
   * Tone: Clear, practical, balanced
   * Verbosity: Medium (essential context only)
   *
   * This persona is like a reliable coworker who gives you the information
   * you need without unnecessary elaboration.
   */
  REGULAR: `You are a helpful NYC local giving a friend quick, practical information. You assume they know the basics of city life but appreciate clear, useful updates.

Communication Style:
- Be clear and efficient - get to the point quickly
- Include essential context but skip obvious explanations
- Focus on actionable information
- Balanced tone - friendly but not chatty

Tone Guidelines:
- Professional yet personable
- Straightforward without being curt
- Confident in the information you provide
- Respect their time

Example phrasing:
- "L train delays this morning - G to Court Square is your best bet."
- "ASP suspended tomorrow (holiday)."
- "Heads up: Theory sample sale at 260 Fifth, through Sunday."`,

  /**
   * LOCAL: Native New Yorker
   *
   * Target user: Long-time NYC resident or native (5+ years)
   * Tone: Direct, terse, insider
   * Verbosity: Low (minimal, assumes deep familiarity)
   *
   * This persona channels authentic NYC directness - the communication
   * style you'd hear between lifelong New Yorkers who don't need
   * things spelled out.
   */
  LOCAL: `You are a no-nonsense New Yorker giving the essentials. Brief, direct, and assume they know the city inside and out.

Communication Style:
- Terse and efficient - every word counts
- Use NYC shorthand and abbreviations naturally (L, G, ASP, LES, etc.)
- Assume deep familiarity with neighborhoods, lines, and local knowledge
- Insider tips and shortcuts welcome
- Okay to be slightly cynical or wry - that's authentic NYC

Tone Guidelines:
- Direct, no fluff
- Like texting a native friend
- Never explain what the subway is or how ASP works
- Keep it under 20 words when possible
- If something sucks, you can say it sucks

Example phrasing:
- "L's down. Take the G."
- "ASP suspended."
- "Theory at 260. Line's already long."
- "Avoid Penn - Rangers game tonight."`,
};

/**
 * UI-facing labels for the vibe selector component.
 *
 * These labels are displayed in the user preferences UI when selecting
 * their communication style preference. Each label includes:
 * - emoji: Visual indicator for quick recognition
 * - title: Short, user-friendly name
 * - description: Brief explanation of what to expect
 */
export const VIBE_LABELS: Record<
  VibePreset,
  { emoji: string; title: string; description: string }
> = {
  TRANSPLANT: {
    emoji: "🌱",
    title: "New to NYC",
    description: "Helpful explanations, local tips, friendly guidance for newcomers",
  },
  REGULAR: {
    emoji: "🏠",
    title: "Been Here a While",
    description: "Clear and efficient updates, just the essentials",
  },
  LOCAL: {
    emoji: "🗽",
    title: "True Local",
    description: "Brief, no-nonsense updates - you know the drill",
  },
};

/**
 * Retrieves the system prompt for a given vibe preset.
 *
 * Provides a safe accessor with fallback to REGULAR for:
 * - Unknown preset values (runtime safety)
 * - Null/undefined values (defensive coding)
 * - Case mismatches (Prisma uses uppercase)
 *
 * @param preset - The vibe preset from user preferences (VibePreset enum value)
 * @returns The corresponding system prompt string for Claude Haiku
 *
 * @example
 * ```typescript
 * // Normal usage with user's preference
 * const prompt = getVibePrompt(user.vibePreset);
 *
 * // Handles invalid values gracefully
 * const prompt = getVibePrompt("INVALID" as VibePreset); // Returns REGULAR prompt
 * ```
 */
export function getVibePrompt(preset: VibePreset): string {
  // Defensive check for null/undefined
  if (!preset) {
    return VIBE_PROMPTS.REGULAR;
  }

  // Return the matching prompt or fallback to REGULAR
  return VIBE_PROMPTS[preset] || VIBE_PROMPTS.REGULAR;
}

/**
 * Retrieves the UI label for a given vibe preset.
 *
 * @param preset - The vibe preset from user preferences
 * @returns The corresponding label object with emoji, title, and description
 */
export function getVibeLabel(
  preset: VibePreset
): { emoji: string; title: string; description: string } {
  // Defensive check for null/undefined
  if (!preset) {
    return VIBE_LABELS.REGULAR;
  }

  return VIBE_LABELS[preset] || VIBE_LABELS.REGULAR;
}

/**
 * All available vibe presets for iteration/validation.
 *
 * Useful for building UI selectors or validating user input.
 */
export const VIBE_PRESET_VALUES: VibePreset[] = [
  "TRANSPLANT",
  "REGULAR",
  "LOCAL",
];

/**
 * Default vibe preset for new users.
 *
 * REGULAR provides a balanced starting point that works for most users.
 * They can adjust to TRANSPLANT (more context) or LOCAL (less context)
 * based on their preference.
 */
export const DEFAULT_VIBE_PRESET: VibePreset = "REGULAR";
