/**
 * TEST ENDPOINT: Failsafe Email
 *
 * Tests the failsafe email system which sends SOMETHING even when services are down.
 *
 * GET /api/test/send-failsafe?email=you@example.com
 */

import { NextRequest, NextResponse } from "next/server";
import { sendFailsafeEmail } from "@/lib/agents/failsafe-email-agent";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({
      error: "Missing email parameter",
      usage: "/api/test/send-failsafe?email=you@example.com",
    }, { status: 400 });
  }

  console.log(`[Test] Sending failsafe email to ${email}`);

  try {
    const result = await sendFailsafeEmail(email);

    return NextResponse.json({
      success: result.sent,
      contentLevel: result.contentLevel,
      emailId: result.emailId,
      attempts: result.attempts,
      error: result.error,
      infraHealth: {
        overall: result.infraHealth.overall,
        canSendEmail: result.infraHealth.canSendEmail,
        canFetchData: result.infraHealth.canFetchData,
        services: result.infraHealth.services.map(s => ({
          name: s.name,
          status: s.status,
          error: s.error,
        })),
      },
      timestamp: result.timestamp,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
