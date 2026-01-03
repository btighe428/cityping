// src/app/api/test-email/route.ts
/**
 * Test endpoint for welcome email - DELETE IN PRODUCTION
 * Usage: GET /api/test-email?email=your@email.com
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import { welcomeEmail, AlertItem } from "@/lib/email-templates-v2";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
  }

  console.log("[Test Email] Starting for", email);
  console.log("[Test Email] Current date:", new Date().toISOString());

  try {
    // Fetch upcoming alerts
    const alerts = await prisma.alertEvent.findMany({
      where: {
        startsAt: { gte: new Date() },
      },
      include: {
        source: {
          include: { module: true },
        },
      },
      orderBy: { startsAt: "asc" },
      take: 30,
    });

    console.log("[Test Email] Found", alerts.length, "upcoming alerts");

    // Transform to AlertItem format
    const alertItems: AlertItem[] = alerts
      .filter((a) => a.startsAt !== null)
      .map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body || undefined,
        startsAt: a.startsAt as Date,
        moduleId: a.source.moduleId,
        metadata: a.metadata as Record<string, unknown>,
      }));

    // Group by module
    const alertsByModule: Record<string, AlertItem[]> = {};
    alertItems.forEach((alert) => {
      if (!alertsByModule[alert.moduleId]) {
        alertsByModule[alert.moduleId] = [];
      }
      alertsByModule[alert.moduleId].push(alert);
    });

    console.log("[Test Email] Modules:", Object.keys(alertsByModule));

    // Generate and send
    const emailContent = welcomeEmail({
      neighborhood: "Test Neighborhood",
      alertsByModule,
      preferencesUrl: "https://nycping-app.vercel.app/preferences",
      tier: "free",
    });

    const result = await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json({
      success: true,
      alertCount: alerts.length,
      modules: Object.keys(alertsByModule),
      emailId: result.id,
    });
  } catch (error) {
    console.error("[Test Email] Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
