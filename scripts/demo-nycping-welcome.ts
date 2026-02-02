import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../src/lib/resend";

const prisma = new PrismaClient();

/**
 * Demo Script: Send NYCPing Welcome Email with Real Module Data
 *
 * This script:
 * 1. Seeds sample AlertEvents for all 6 modules
 * 2. Generates a multi-module welcome digest
 * 3. Sends to specified email address
 *
 * Data Sources (Real APIs you can mine):
 * - Parking: NYC DOT ASP Calendar (already seeded via SuspensionEvents)
 * - Transit: MTA GTFS-RT feeds (https://api.mta.info/)
 * - Housing: NYC Housing Connect (https://housingconnect.nyc.gov/PublicWeb/)
 * - Events: NYC Open Data 311 / EventBrite
 * - Sample Sales: TheChoosyBeggar, ChicMi, Racked archives
 * - Deals: Manually curated / Reddit r/churning
 *
 * Usage:
 *   npx tsx scripts/demo-nycping-welcome.ts your@email.com
 */

// Sample data representing what each scraper would return
const DEMO_EVENTS = {
  parking: [
    {
      title: "ASP Suspended Tomorrow",
      body: "New Year's Day - No need to move your car tonight!",
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      title: "ASP Suspended Jan 6",
      body: "Three Kings' Day - Back-to-back parking freedom",
      startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  ],
  transit: [
    {
      title: "L Train: Planned Service Changes",
      body: "No service between Bedford Ave and 8th Ave this weekend",
      startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: "A/C Train Delays",
      body: "Signal problems at 14th St causing 15-20 min delays",
      startsAt: new Date(),
    },
    {
      title: "Weekend G Train Changes",
      body: "Running express between Court Sq and Church Ave",
      startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  ],
  housing: [
    {
      title: "New Lottery: 535 Carlton Ave",
      body: "87 affordable units in Prospect Heights. Studios from $1,200. Deadline: Feb 15",
      startsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    },
    {
      title: "New Lottery: Sendero Verde",
      body: "709 units in East Harlem. 1BR from $900. Deadline: Jan 30",
      startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ],
  events: [
    {
      title: "Free Museum Friday: MoMA",
      body: "UNIQLO Free Friday Nights 4-8pm. No tickets needed.",
      startsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Winter Jam in Central Park",
      body: "Free outdoor concert at Bandshell. Hot cocoa vendors.",
      startsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  ],
  food: [
    {
      title: "Theory Sample Sale",
      body: "50-80% off. 260 Sample Sale, 260 5th Ave. Jan 3-7",
      startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Everlane Warehouse Sale",
      body: "Up to 70% off. Brooklyn Navy Yard. This weekend only.",
      startsAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    },
  ],
  deals: [
    {
      title: "Chase Sapphire: 80K Bonus",
      body: "Limited time offer. $4K spend in 3 months. Worth ~$1,200.",
      startsAt: new Date(),
    },
    {
      title: "Citi Premier: 75K Points",
      body: "Back after 48 months. No annual fee first year.",
      startsAt: new Date(),
    },
  ],
};

async function seedDemoEvents() {
  console.log("Seeding demo AlertEvents...\n");

  for (const [moduleId, events] of Object.entries(DEMO_EVENTS)) {
    // Get the alert source for this module
    const source = await prisma.alertSource.findFirst({
      where: { moduleId },
    });

    if (!source) {
      console.log(`  ⚠️  No source found for module: ${moduleId}`);
      continue;
    }

    for (const event of events) {
      await prisma.alertEvent.upsert({
        where: {
          sourceId_externalId: {
            sourceId: source.id,
            externalId: `demo-${moduleId}-${event.title.slice(0, 20)}`,
          },
        },
        update: {
          title: event.title,
          body: event.body,
          startsAt: event.startsAt,
        },
        create: {
          sourceId: source.id,
          externalId: `demo-${moduleId}-${event.title.slice(0, 20)}`,
          title: event.title,
          body: event.body,
          startsAt: event.startsAt,
          neighborhoods: [],
          metadata: { demo: true },
        },
      });
    }

    console.log(`  ✓ ${moduleId}: ${events.length} events`);
  }

  console.log("");
}

async function buildWelcomeEmailHtml(userNeighborhood: string) {
  // Fetch all events grouped by module (real + demo)
  const events = await prisma.alertEvent.findMany({
    where: {
      startsAt: { gte: new Date() }, // Only future events
    },
    include: {
      source: {
        include: { module: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  // Group by module
  const byModule: Record<string, typeof events> = {};
  for (const event of events) {
    const moduleId = event.source.moduleId;
    if (!byModule[moduleId]) byModule[moduleId] = [];
    byModule[moduleId].push(event);
  }

  const moduleOrder = ["parking", "transit", "events", "housing", "food", "deals"];
  const appBaseUrl = process.env.APP_BASE_URL || "https://nycping-app.vercel.app";

  const sections = moduleOrder
    .map((moduleId) => {
      const moduleEvents = byModule[moduleId];
      if (!moduleEvents || moduleEvents.length === 0) return "";

      const mod = moduleEvents[0].source.module;

      const eventRows = moduleEvents
        .slice(0, 3) // Max 3 per module for welcome email
        .map(
          (e) => `
          <div style="padding: 12px; background: #f8fafc; border-radius: 6px; margin-bottom: 8px;">
            <div style="font-weight: 600; color: #1e3a5f;">${e.title}</div>
            ${e.body ? `<div style="color: #64748b; font-size: 14px; margin-top: 4px;">${e.body}</div>` : ""}
          </div>
        `
        )
        .join("");

      return `
        <div style="margin-bottom: 32px;">
          <h2 style="color: #1e3a5f; font-size: 18px; margin: 0 0 16px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
            ${mod.icon} ${mod.name}
          </h2>
          ${eventRows}
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
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">

      <!-- Hero -->
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); border-radius: 12px; padding: 32px; margin-bottom: 32px; color: white; text-align: center;">
        <h1 style="margin: 0 0 8px 0; font-size: 32px;">Welcome to NYCPing</h1>
        <p style="margin: 0; font-size: 18px; opacity: 0.9;">Your personalized NYC alerts dashboard</p>
      </div>

      <!-- Location Context -->
      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #1e40af;">
          <strong>📍 ${userNeighborhood}</strong><br>
          <span style="font-size: 14px;">Based on your zip code, here's what's relevant to you:</span>
        </p>
      </div>

      <!-- Module Sections -->
      ${sections}

      <!-- Tier Explanation -->
      <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 32px 0;">
        <h3 style="margin: 0 0 8px 0; color: #92400e;">📬 Free Tier</h3>
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          You'll receive a daily email digest with all your alerts.<br>
          <strong>Want instant SMS alerts?</strong> <a href="${appBaseUrl}/upgrade" style="color: #1e40af;">Upgrade to Premium ($7/mo)</a>
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${appBaseUrl}/preferences" style="display: inline-block; background: #1e3a5f; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Customize Your Alerts
        </a>
      </div>

      <!-- Footer -->
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        <a href="${appBaseUrl}/preferences" style="color: #64748b;">Preferences</a> ·
        <a href="${appBaseUrl}/unsubscribe" style="color: #64748b;">Unsubscribe</a><br>
        NYCPing · The definitive NYC alerts platform
      </p>
    </body>
    </html>
  `;
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              NYCPing Welcome Email Demo                      ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  npx tsx scripts/demo-nycping-welcome.ts <email>

Example:
  npx tsx scripts/demo-nycping-welcome.ts demo@example.com

This script will:
  1. Seed demo AlertEvents for all 6 modules
  2. Build a multi-module welcome email
  3. Send it to the specified address
`);
    process.exit(1);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              NYCPing Welcome Email Demo                      ║
╚══════════════════════════════════════════════════════════════╝
`);

  // Step 1: Seed demo events
  await seedDemoEvents();

  // Step 2: Build email
  const neighborhood = "Williamsburg, Brooklyn"; // Would come from user's zip profile
  const html = await buildWelcomeEmailHtml(neighborhood);

  console.log("Building welcome email...\n");
  console.log(`  📍 Neighborhood: ${neighborhood}`);
  console.log(`  📧 To: ${email}`);
  console.log("");

  // Step 3: Send email
  console.log("Sending email...\n");

  try {
    const result = await sendEmail({
      to: email,
      subject: "🗽 Welcome to NYCPing — Your NYC Alerts Are Ready",
      html,
      text: "Welcome to NYCPing! View this email in HTML for the best experience.",
    });

    console.log("  ✅ Email sent successfully!");
    console.log(`  📬 Message ID: ${result.id}`);
    console.log("");
    console.log("  Check your inbox for the demo email.");
    console.log("");
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
