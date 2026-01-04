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
 */

import { AlertEvent, Module, AlertSource } from "@prisma/client";

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
 * Builds the HTML email body for the daily digest.
 *
 * Architecture:
 * - Sections are rendered per module with icon/name headers
 * - Events within each section are rendered as table rows
 * - Feedback links (thumbs up/down) for each event when tokens provided
 * - Upgrade CTA is included to drive free-to-premium conversion
 * - Unsubscribe/preferences links for compliance and UX
 *
 * Styling Notes:
 * - All styles are inline for maximum email client compatibility
 * - System font stack for consistent rendering across platforms
 * - Max-width container for readability on desktop
 * - Feedback buttons use minimal styling to avoid chartjunk
 *
 * @param events - Events grouped by module ID
 * @param userName - Optional user name for personalization (future use)
 * @param userId - Optional user ID for feedback links (enables feedback when provided)
 * @param feedbackTokens - Optional map of eventId to feedback token
 * @returns Complete HTML document string for email body
 */
export function buildDigestHtml(
  events: GroupedEvents,
  userName?: string,
  userId?: string,
  feedbackTokens?: FeedbackTokenMap
): string {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const sections = Object.entries(events)
    .map(([moduleId, moduleEvents]) => {
      const module = moduleEvents[0]?.source.module;
      if (!module) return "";

      const eventItems = moduleEvents
        .map((e) => {
          // Build feedback links if userId and token are available
          const token = feedbackTokens?.[e.id];
          const feedbackLinksHtml =
            userId && token
              ? `
                <td style="width: 60px; text-align: right; white-space: nowrap; vertical-align: top; padding: 8px 0;">
                  <a href="${appBaseUrl}/api/feedback?token=${escapeHtml(token)}&amp;rating=up"
                     style="text-decoration: none; font-size: 16px; padding: 4px;"
                     title="This was helpful">&#128077;</a>
                  <a href="${appBaseUrl}/api/feedback?token=${escapeHtml(token)}&amp;rating=down"
                     style="text-decoration: none; font-size: 16px; padding: 4px;"
                     title="Not relevant">&#128078;</a>
                </td>
              `
              : "";

          return `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                <strong>${escapeHtml(e.title)}</strong>
                ${e.body ? `<br><span style="color: #666;">${escapeHtml(e.body)}</span>` : ""}
              </td>
              ${feedbackLinksHtml}
            </tr>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom: 24px;">
          <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 12px 0;">
            ${module.icon} ${escapeHtml(module.name)} (${moduleEvents.length})
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
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">
        Your NYC Alerts
      </h1>

      ${sections}

      <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #eee;">
        <p style="color: #666; font-size: 14px;">
          <strong>Get alerts instantly via SMS</strong><br>
          Premium users received these alerts yesterday.<br>
          <a href="${appBaseUrl}/dashboard?upgrade=true" style="color: #0066cc;">
            Upgrade for $7/mo
          </a>
        </p>
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <a href="${appBaseUrl}/preferences" style="color: #999;">Manage preferences</a> |
        <a href="${appBaseUrl}/unsubscribe" style="color: #999;">Unsubscribe</a>
      </div>
    </body>
    </html>
  `;
}

/**
 * Builds the subject line for the daily digest email.
 *
 * Format: "Your NYC Alerts - Jan 1 (5 new)"
 *
 * The subject includes:
 * - Brand identifier for recognition
 * - Date for temporal context
 * - Event count for urgency/value signaling
 *
 * @param eventCount - Total number of events in the digest
 * @returns Formatted subject line string
 */
export function buildDigestSubject(eventCount: number): string {
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `Your NYC Alerts - ${today} (${eventCount} new)`;
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
