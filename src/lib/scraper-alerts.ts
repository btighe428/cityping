/**
 * Scraper Alert Service
 *
 * This module provides administrative alerting for scraper validation failures,
 * implementing a critical component of the "partial ingestion" resilience pattern.
 * When upstream data sources (MTA GTFS-RT feeds, 260SampleSale web scraping,
 * Housing Connect APIs) return malformed or unexpected data, this service
 * aggregates the failures and notifies administrators via email.
 *
 * Architectural Philosophy:
 * In distributed systems terminology, this implements the "circuit breaker"
 * monitoring aspect - while the scrapers continue processing valid data,
 * administrators are alerted to investigate potential upstream schema changes.
 * This design philosophy originates from Michael Nygard's "Release It!" (2007),
 * which established patterns for building resilient production systems.
 *
 * The alert email serves multiple functions:
 * 1. Immediate notification of data quality degradation
 * 2. Diagnostic information (payload samples) for rapid debugging
 * 3. Historical record of schema drift incidents
 *
 * Integration Points:
 * - Uses Resend (YC S20) for transactional email delivery
 * - Respects ADMIN_ALERT_EMAIL environment variable
 * - Gracefully degrades if email configuration is missing
 *
 * Security Considerations:
 * - HTML escaping prevents XSS in email clients
 * - Payload samples are limited to prevent PII exposure in logs
 * - Email addresses are environment-configured, not hardcoded
 */

import { Resend } from "resend";

// Conditionally instantiate Resend to allow testing without API key
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Represents a single validation failure from a scraper.
 *
 * This interface captures the essential diagnostic information needed
 * to investigate and resolve schema drift or data quality issues.
 */
export interface ScraperError {
  /** Identifier for the data source (e.g., "mta", "sample-sales", "housing") */
  source: string;

  /**
   * The raw payload that failed validation.
   * Typed as `unknown` because the payload's structure is precisely
   * what we couldn't validate - type safety here would be contradictory.
   */
  payload: unknown;

  /** Human-readable error message from Zod validation */
  error: string;

  /** When the validation failure occurred */
  timestamp: Date;
}

/**
 * Escapes HTML special characters to prevent XSS and rendering issues.
 *
 * While email clients vary in their HTML handling (Outlook famously uses
 * Word's rendering engine), escaping these characters is universally safe
 * and prevents potential security issues in webmail clients.
 *
 * @param unsafe - Raw string that may contain HTML characters
 * @returns Escaped string safe for HTML contexts
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
 * Builds an email notification for scraper validation failures.
 *
 * The email format follows a Tufte-inspired design philosophy: high data density,
 * minimal chrome, and information-rich content. Each error sample includes
 * the validation message and a JSON representation of the problematic payload.
 *
 * Design Decisions:
 * - Payload samples limited to 3: Balances diagnostic utility against email size
 *   and potential PII exposure. More samples available in application logs.
 * - Inline styles: Email clients notoriously strip <style> blocks; inline
 *   styles ensure consistent rendering across Gmail, Outlook, and Apple Mail.
 * - Monospace payload rendering: JSON structures are more readable in fixed-width
 *
 * @param source - The scraper/data source identifier
 * @param errors - Array of validation failures to report
 * @returns Object containing email subject and HTML body
 */
export function buildScraperAlertEmail(
  source: string,
  errors: ScraperError[]
): { subject: string; html: string } {
  const errorCount = errors.length;
  const errorWord = errorCount === 1 ? "error" : "errors";
  const subject = `[CityPing] Scraper Validation Failures - ${source} (${errorCount} ${errorWord})`;

  // Limit samples to first 3 for email brevity
  // Full error details available in application logs
  const samples = errors.slice(0, 3);
  const samplesHtml = samples
    .map(
      (e) => `
      <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px; border-left: 4px solid #c00;">
        <strong style="color: #333;">Error:</strong> ${escapeHtml(e.error)}<br>
        <strong style="color: #333;">Payload:</strong>
        <pre style="background: #eee; padding: 8px; overflow-x: auto; font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 12px; line-height: 1.4; margin: 8px 0 0 0; border-radius: 2px;">${escapeHtml(
          JSON.stringify(e.payload, null, 2)
        )}</pre>
      </div>
    `
    )
    .join("");

  const additionalErrorsNote =
    errors.length > 3
      ? `<p style="color: #666; font-style: italic;">...and ${errors.length - 3} more error(s) not shown. Check application logs for full details.</p>`
      : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.5;">
      <h1 style="color: #c00; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; border-bottom: 2px solid #c00; padding-bottom: 8px;">
        Scraper Validation Failures
      </h1>

      <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0; color: #666; width: 80px;">Source:</td>
          <td style="padding: 4px 0; font-weight: 500;">${escapeHtml(source)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #666;">Errors:</td>
          <td style="padding: 4px 0; font-weight: 500;">${errorCount}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #666;">Time:</td>
          <td style="padding: 4px 0;">${new Date().toISOString()}</td>
        </tr>
      </table>

      <h2 style="font-size: 16px; font-weight: 600; margin: 24px 0 12px 0; color: #333;">
        Sample Failures (first ${Math.min(3, errors.length)}):
      </h2>
      ${samplesHtml}
      ${additionalErrorsNote}

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; margin: 0;">
          This alert was sent because scraper validation failed. This typically indicates
          upstream schema changes or data quality issues. Check the data source for format changes.
        </p>
        <p style="color: #888; font-size: 11px; margin: 8px 0 0 0;">
          CityPing Infrastructure Alert System
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Sends a scraper alert email to the configured administrator.
 *
 * This function implements graceful degradation: if ADMIN_ALERT_EMAIL is not
 * configured, it logs a warning rather than throwing an exception. This allows
 * the scraper pipeline to continue operating even if alerting is misconfigured.
 *
 * In production, ADMIN_ALERT_EMAIL should be set to a team distribution list
 * or an incident management system's email intake (e.g., PagerDuty, Opsgenie).
 *
 * @param source - The scraper/data source identifier
 * @param errors - Array of validation failures to report
 */
export async function sendScraperAlert(
  source: string,
  errors: ScraperError[]
): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;

  if (!adminEmail) {
    console.error(
      "[ScraperAlert] ADMIN_ALERT_EMAIL not configured - alert not sent. " +
        `Source: ${source}, Errors: ${errors.length}`
    );
    return;
  }

  if (!resend) {
    console.error(
      "[ScraperAlert] RESEND_API_KEY not configured - alert not sent. " +
        `Source: ${source}, Errors: ${errors.length}`
    );
    return;
  }

  const { subject, html } = buildScraperAlertEmail(source, errors);

  try {
    await resend.emails.send({
      from: "CityPing Alerts <alerts@cityping.com>",
      to: adminEmail,
      subject,
      html,
    });
    console.log(
      `[ScraperAlert] Sent alert for ${source}: ${errors.length} validation failures`
    );
  } catch (error) {
    // Log but don't throw - alerting failures shouldn't break the scraper pipeline
    console.error("[ScraperAlert] Failed to send alert:", error);
  }
}
