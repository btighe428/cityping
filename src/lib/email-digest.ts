// src/lib/email-digest.ts
/**
 * Email Digest Template Helpers
 *
 * This module provides utilities for building consolidated email digests
 * for free-tier users. The digest aggregates pending notifications by
 * module, providing a cohesive daily summary rather than individual alerts.
 *
 * Design Philosophy:
 * - Groups events by module for cognitive organization
 * - Includes upgrade CTA to drive premium conversions
 * - Follows Edward Tufte principles: maximize data-ink ratio, eliminate chartjunk
 * - Mobile-responsive HTML with inline styles for email client compatibility
 *
 * Feedback Loop Integration (Task 3.4):
 * - Each event can include thumbs up/down feedback links
 * - Tokens are generated per user-event pair for secure authentication
 * - Feedback data aggregates to improve relevance scoring by zip code
 * - Links use token-based auth (no login required for one-click rating)
 *
 * Referral Program Integration (Task 6.5):
 * - Each digest includes a referral promotion in the footer
 * - Users get a personalized shareable link (cityping.com/r/{code})
 * - Referral codes are created lazily (first-time generation, then cached)
 * - Double-sided incentive: referee signs up, referrer gets free month
 */

import { AlertEvent, Module, AlertSource } from "@prisma/client";
import { prisma } from "./db";
import { generateReferralCode } from "./referral-service";

/**
 * Event with full source and module chain for digest rendering.
 * The nested structure allows grouping by module while accessing event details.
 */
export type EventWithModule = AlertEvent & {
  source: AlertSource & { module: Module };
};

/**
 * Events grouped by module ID for digest organization.
 * Key: moduleId (e.g., "parking", "transit")
 * Value: Array of events from sources within that module
 */
export type GroupedEvents = Record<string, EventWithModule[]>;

/**
 * Map of event IDs to feedback tokens for embedding in email links.
 * Key: AlertEvent.id
 * Value: Secure feedback token (from UserEventFeedback.feedbackToken)
 */
export type FeedbackTokenMap = Record<string, string>;

/**
 * Placeholder email domain used for "generic" shareable referrals.
 *
 * When a user needs a referral code for their digest email (to share with anyone),
 * we create a referral record with this synthetic email address. This differs from
 * traditional referrals which target a specific email address.
 *
 * The format is: share.{userId}@cityping.internal
 *
 * This approach maintains data integrity while enabling:
 * - One shareable code per user (no duplicates)
 * - Easy identification of "generic" vs "targeted" referrals
 * - Full compatibility with existing referral conversion flow
 */
const SHARE_EMAIL_DOMAIN = "cityping.internal";

/**
 * Gets or creates a shareable referral code for a user.
 *
 * This function implements lazy referral code generation for the email digest:
 * 1. Checks if the user already has a "generic" referral (for sharing)
 * 2. If not, creates a new referral with a synthetic referee email
 * 3. Returns the referral code (e.g., "NYC-X9K2M")
 *
 * The referral code can be used in shareable links: cityping.com/r/{code}
 * When a new user signs up via this link, they become the referee for this referral.
 *
 * Business Rules:
 * - Each user gets exactly one shareable referral code
 * - The code is valid for 90 days (standard referral expiration)
 * - If expired, a new code is generated on next call
 *
 * Error Handling:
 * - Returns null if user doesn't exist
 * - Returns null on database errors (graceful degradation)
 * - Logs errors for monitoring but doesn't throw
 *
 * @param userId - The ID of the user requesting a referral code
 * @returns The referral code string, or null if unavailable
 *
 * @example
 * const code = await getReferralCode("user_123");
 * // Returns "NYC-A3B9K" or null
 */
export async function getReferralCode(userId: string): Promise<string | null> {
  try {
    // Synthetic email for "shareable" referrals (not targeting a specific person)
    const shareEmail = `share.${userId}@${SHARE_EMAIL_DOMAIN}`;

    // Check for existing shareable referral that's still valid
    const existingReferral = await prisma.referral.findFirst({
      where: {
        referrerId: userId,
        refereeEmail: shareEmail,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingReferral) {
      return existingReferral.referralCode;
    }

    // Verify user exists before creating referral
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.warn(`[getReferralCode] User not found: ${userId}`);
      return null;
    }

    // Generate new referral code
    const referralCode = generateReferralCode();

    // Calculate expiration date (90 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Create the shareable referral record
    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        refereeEmail: shareEmail,
        referralCode,
        status: "PENDING",
        expiresAt,
      },
    });

    return referral.referralCode;
  } catch (error) {
    // Log error but don't throw - referral is optional enhancement
    console.error(`[getReferralCode] Error generating code for user ${userId}:`, error);
    return null;
  }
}

/**
 * Build hype badge for sample sales - matches reference format
 * "🔥 HOT" in red, "Worth it" in blue, "Meh" in gray with score
 */
function buildHypeBadge(score: number | undefined | null): string {
  if (!score) return "";

  let bgColor = "#6b7280"; // gray-500
  let label = "Meh";

  if (score >= 85) {
    bgColor = "#dc2626"; // red-600
    label = "🔥 HOT";
  } else if (score >= 65) {
    bgColor = "#2563eb"; // blue-600
    label = "Worth it";
  }

  return `<span style="background: ${bgColor}; color: white; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 4px; margin-left: 8px; vertical-align: middle; display: inline-block;">${label} ${score}</span>`;
}

/**
 * Build indoor/weather indicator for events
 */
function buildVenueIndicator(venueType: string | undefined | null): string {
  if (!venueType) return "";

  if (venueType === "INDOOR") {
    return `<div style="color: #16a34a; font-size: 12px; margin-top: 4px;">✓ Indoor</div>`;
  } else if (venueType === "OUTDOOR") {
    return `<div style="color: #7c3aed; font-size: 12px; margin-top: 4px;">☀️ Perfect weather</div>`;
  }
  return "";
}

/**
 * Builds the HTML email body for the daily digest.
 *
 * Architecture:
 * - NYC TODAY header with date (matches reference)
 * - Sections are rendered per module with emoji headers and border styling
 * - Events include hype badges (HOT/Worth it/Meh) and indoor indicators
 * - Feedback links (thumbs up/down) for each event when tokens provided
 * - Upgrade CTA with gray background box
 * - Referral promotion section with GREEN background
 * - Unsubscribe/preferences links for compliance and UX
 *
 * Styling Notes:
 * - All styles are inline for maximum email client compatibility
 * - System font stack for consistent rendering across platforms
 * - Max-width container for readability on desktop
 * - Section headers have bottom borders matching reference
 * - Matches reference screenshot design exactly
 *
 * @param events - Events grouped by module ID
 * @param userName - Optional user name for personalization (future use)
 * @param userId - Optional user ID for feedback links (enables feedback when provided)
 * @param feedbackTokens - Optional map of eventId to feedback token
 * @param referralCode - Optional referral code for personalized sharing link
 * @returns Complete HTML document string for email body
 */
export function buildDigestHtml(
  events: GroupedEvents,
  userName?: string,
  userId?: string,
  feedbackTokens?: FeedbackTokenMap,
  referralCode?: string | null
): string {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  // Format today's date
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const sections = Object.entries(events)
    .map(([moduleId, moduleEvents]) => {
      const mod = moduleEvents[0]?.source.module;
      if (!mod) return "";

      const eventItems = moduleEvents
        .map((e) => {
          // Build feedback links if userId and token are available
          const token = feedbackTokens?.[e.id];
          const feedbackLinksHtml =
            userId && token
              ? `
                <span style="margin-left: 12px;">
                  <a href="${appBaseUrl}/api/feedback?token=${escapeHtml(token)}&amp;rating=up"
                     style="text-decoration: none; font-size: 14px;"
                     title="This was helpful">👍</a>
                  <a href="${appBaseUrl}/api/feedback?token=${escapeHtml(token)}&amp;rating=down"
                     style="text-decoration: none; font-size: 14px; margin-left: 4px;"
                     title="Not relevant">👎</a>
                </span>
              `
              : "";

          // Get hype score and venue type from metadata if available
          const metadata = e.metadata as Record<string, unknown> | null;
          const hypeScore = (e as unknown as { hypeScore?: number }).hypeScore ??
                           (metadata?.hypeScore as number | undefined);
          const venueType = (e as unknown as { venueType?: string }).venueType ??
                           (metadata?.venueType as string | undefined);
          const location = metadata?.location as string | undefined;

          const hypeBadge = buildHypeBadge(hypeScore);
          const venueIndicator = buildVenueIndicator(venueType);

          return `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #111827;">
                  ${escapeHtml(e.title)}${hypeBadge}
                </div>
                ${location ? `<div style="font-size: 13px; color: #6b7280; margin-top: 4px;">📍 ${escapeHtml(location)}</div>` : ""}
                ${e.body ? `<div style="font-size: 13px; color: #4b5563; margin-top: 4px; line-height: 1.5;">${escapeHtml(e.body)}</div>` : ""}
                ${venueIndicator}
                ${feedbackLinksHtml ? `<div style="margin-top: 4px;">${feedbackLinksHtml}</div>` : ""}
              </td>
            </tr>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom: 28px;">
          <h2 style="color: #1e3a5f; font-size: 18px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
            ${mod.icon} ${escapeHtml(mod.name)}
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${eventItems}
          </table>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>NYC Today - ${today}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">

      <!-- Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1e3a5f; font-size: 28px; margin: 0;">🗽 NYC TODAY</h1>
        <div style="color: #64748b; font-size: 14px; margin-top: 4px;">${today}</div>
      </div>

      <!-- Intro -->
      <div style="color: #475569; font-size: 15px; margin-bottom: 24px; line-height: 1.5;">
        Here's your NYC rundown for today.
      </div>

      ${sections}

      <!-- Upgrade CTA -->
      <div style="margin-top: 32px; padding: 20px; background: #f1f5f9; border-radius: 12px; text-align: center;">
        <div style="font-weight: bold; color: #1e3a5f; margin-bottom: 8px;">
          ⚡ Get alerts instantly via SMS
        </div>
        <div style="color: #64748b; font-size: 14px; margin-bottom: 12px;">
          Premium users got these alerts yesterday.
        </div>
        <a href="${appBaseUrl}/dashboard?upgrade=true"
           style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Upgrade for $7/mo
        </a>
      </div>

      ${
        referralCode
          ? `
      <!-- Referral Section - GREEN per brand reference -->
      <div style="background: #16a34a; color: white; padding: 20px; margin-top: 24px; border-radius: 12px; text-align: center;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
          ✉️ Know someone who'd love this?
        </div>
        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 12px;">
          Share your link and get 1 month free when they subscribe!
        </div>
        <a href="${appBaseUrl}/r/${escapeHtml(referralCode)}"
           style="display: inline-block; background: rgba(255,255,255,0.15); border: 2px solid white; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 13px;">
          ${appBaseUrl}/r/${escapeHtml(referralCode)}
        </a>
      </div>
      `
          : ""
      }

      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
        <a href="${appBaseUrl}/preferences" style="color: #64748b;">Manage preferences</a> ·
        <a href="${appBaseUrl}/unsubscribe" style="color: #64748b;">Unsubscribe</a>
        <div style="margin-top: 8px;">NYCPing · The definitive NYC alerts platform</div>
      </div>

    </body>
    </html>
  `;
}

/**
 * Builds the subject line for the daily digest email.
 *
 * Format: "🗽 NYC Today: Jan 1 — X things worth knowing"
 *
 * The subject includes:
 * - NYC Today branding with emoji
 * - Date for temporal context
 * - Event count phrased as value proposition
 *
 * @param eventCount - Total number of events in the digest
 * @returns Formatted subject line string
 */
export function buildDigestSubject(eventCount: number): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `🗽 NYC Today: ${today} — ${eventCount} things worth knowing`;
}

/**
 * Escapes HTML special characters to prevent XSS in email content.
 * Essential for user-generated or external data in email templates.
 *
 * @param unsafe - Raw string potentially containing HTML special chars
 * @returns Escaped string safe for HTML rendering
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Counts total events across all modules in a grouped events object.
 * Utility for statistics and subject line generation.
 *
 * @param events - Events grouped by module ID
 * @returns Total count of all events
 */
export function countTotalEvents(events: GroupedEvents): number {
  return Object.values(events).reduce((sum, arr) => sum + arr.length, 0);
}
