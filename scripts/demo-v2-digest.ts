import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../src/lib/resend";
import { dailyDigest, welcomeEmail, AlertItem } from "../src/lib/email-templates-v2";

const prisma = new PrismaClient();

/**
 * Demo Script: NYCPing v2 Email Templates
 *
 * Showcases the research-backed email design system:
 * - Inverted Pyramid structure
 * - Tufte data density
 * - Morning Brew scannability
 * - Urgency classification
 *
 * Usage:
 *   npx tsx scripts/demo-v2-digest.ts <email> [welcome|digest]
 */

async function main() {
  const email = process.argv[2];
  const type = process.argv[3] || "digest";

  if (!email) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           NYCPing v2 Email Template Demo                     ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  npx tsx scripts/demo-v2-digest.ts <email> [welcome|digest]

Examples:
  npx tsx scripts/demo-v2-digest.ts you@example.com welcome
  npx tsx scripts/demo-v2-digest.ts you@example.com digest
`);
    process.exit(1);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           NYCPing v2 Email Template Demo                     ║
╚══════════════════════════════════════════════════════════════╝
`);

  // Fetch real alerts from database
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

  console.log(`  Found ${alerts.length} upcoming alerts\n`);

  // Transform to AlertItem format (filter out alerts with null startsAt)
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
  const byModule: Record<string, AlertItem[]> = {};
  alertItems.forEach((alert) => {
    if (!byModule[alert.moduleId]) byModule[alert.moduleId] = [];
    byModule[alert.moduleId].push(alert);
  });

  const neighborhood = "Williamsburg, Brooklyn";
  const preferencesUrl = "https://nycping-app.vercel.app/preferences";

  let emailContent: { subject: string; html: string; text: string };

  if (type === "welcome") {
    console.log("  📧 Generating Welcome Email...\n");
    emailContent = welcomeEmail({
      neighborhood,
      alertsByModule: byModule,
      preferencesUrl,
      tier: "free",
    });
  } else {
    console.log("  📧 Generating Daily Digest...\n");
    emailContent = dailyDigest({
      user: {
        email,
        neighborhood,
        tier: "free",
      },
      alerts: alertItems,
      date: new Date(),
    });
  }

  console.log(`  Subject: ${emailContent.subject}`);
  console.log(`  To: ${email}`);
  console.log(`  Alerts: ${alertItems.length}`);
  console.log(`  Modules: ${Object.keys(byModule).join(", ")}\n`);

  // Print module breakdown
  console.log("  Module Breakdown:");
  Object.entries(byModule).forEach(([moduleId, items]) => {
    console.log(`    ${moduleId}: ${items.length} alerts`);
  });
  console.log("");

  // Send email
  console.log("  Sending...\n");

  try {
    const result = await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    console.log("  ✅ Email sent successfully!");
    console.log(`  📬 Message ID: ${result.id}\n`);
    console.log("  Check your inbox for the demo email.\n");
  } catch (error) {
    console.error("  ❌ Failed to send email:", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
