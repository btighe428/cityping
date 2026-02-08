/**
 * Email Status Monitoring API
 *
 * Check delivery status of emails sent via Resend.
 *
 * Usage:
 *   GET /api/email-status?id=<email-id>     → Check specific email
 *   GET /api/email-status?recent=10         → List recent emails
 *   GET /api/email-status?health=true       → Check email system health
 */

import { NextRequest, NextResponse } from "next/server";
import { checkEmailStatus, listRecentEmails } from "@/lib/resend";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const emailId = searchParams.get("id");
  const recent = searchParams.get("recent");
  const health = searchParams.get("health");

  try {
    // Check specific email
    if (emailId) {
      const status = await checkEmailStatus(emailId);
      return NextResponse.json({
        success: true,
        email: status,
      });
    }

    // List recent emails
    if (recent) {
      const limit = parseInt(recent, 10) || 10;
      const emails = await listRecentEmails(limit);
      return NextResponse.json({
        success: true,
        count: emails.length,
        emails,
      });
    }

    // Health check
    if (health) {
      let connected = false;
      let recentEmails: Awaited<ReturnType<typeof listRecentEmails>> = [];
      const deliveryStats = { sent: 0, delivered: 0, bounced: 0, failed: 0 };

      try {
        recentEmails = await listRecentEmails(20);
        connected = true;

        // Calculate delivery stats from recent emails
        for (const email of recentEmails) {
          if (email.status === 'sent') deliveryStats.sent++;
          else if (email.status === 'delivered') deliveryStats.delivered++;
          else if (email.status === 'bounced') deliveryStats.bounced++;
          else if (email.status === 'failed') deliveryStats.failed++;
        }
      } catch {
        connected = false;
      }

      const total = deliveryStats.sent + deliveryStats.delivered + deliveryStats.bounced + deliveryStats.failed;
      const deliveryRate = total > 0
        ? Math.round(((deliveryStats.sent + deliveryStats.delivered) / total) * 100)
        : 0;

      return NextResponse.json({
        success: true,
        health: {
          connected,
          apiKeyConfigured: !!process.env.RESEND_API_KEY,
          fromEmail: process.env.RESEND_FROM_EMAIL || 'CityPing <alerts@cityping.net>',
          recentEmailCount: recentEmails.length,
          deliveryStats,
          deliveryRate: `${deliveryRate}%`,
          lastEmail: recentEmails[0] || null,
        },
      });
    }

    // Default: return usage info
    return NextResponse.json({
      usage: {
        checkEmail: "/api/email-status?id=<email-id>",
        listRecent: "/api/email-status?recent=10",
        healthCheck: "/api/email-status?health=true",
      },
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
