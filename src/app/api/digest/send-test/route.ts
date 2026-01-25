// src/app/api/digest/send-test/route.ts
/**
 * Test endpoint for enhanced daily digest email.
 * Usage: GET /api/digest/send-test?email=your@email.com
 */

import { NextRequest, NextResponse } from "next/server";
import { generateDailyDigest, summarizeDigest } from "@/lib/agents/daily-digest-orchestrator";
import { buildEnhancedDigestHtml, buildEnhancedDigestText } from "@/lib/email-templates-enhanced";
import { sendEmail } from "@/lib/resend";

export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = req.nextUrl.searchParams.get("email");
  const skipClustering = req.nextUrl.searchParams.get("skipClustering") === "1";

  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
  }

  console.log("[DigestSendTest] Generating enhanced digest for", email);

  try {
    // Generate the digest
    const digest = await generateDailyDigest({
      userId: "test-user",
      isPremium: true, // Show all content for testing
      skipClustering,
    });

    console.log("[DigestSendTest] Summary:");
    console.log(summarizeDigest(digest));

    // Build email content
    const html = buildEnhancedDigestHtml(digest, {
      isPremium: true,
      referralCode: "NYC-TEST",
    });
    const text = buildEnhancedDigestText(digest);

    const dateStr = digest.meta.generatedAt.toFormat("MMMM d");

    // Send email
    const result = await sendEmail({
      to: email,
      subject: `CityPing Daily - ${dateStr}`,
      html,
      text,
    });

    return NextResponse.json({
      success: true,
      emailId: result.id,
      attempts: result.attempts,
      verified: result.verified,
      summary: {
        weather: digest.weather ? `${digest.weather.emoji} ${digest.weather.summary}` : null,
        subjectLine: digest.subjectLine?.full || null,
        horizon: digest.horizon.alerts.length,
        deepDive: digest.deepDive.clusters.length,
        briefing: digest.briefing.items.length,
        agenda: digest.agenda.events.length,
        tokensUsed: digest.meta.tokensUsed,
        processingTimeMs: digest.meta.processingTimeMs,
        errors: digest.meta.errors,
        stages: digest.meta.stages,
      },
    });
  } catch (error) {
    console.error("[DigestSendTest] Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
