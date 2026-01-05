// scripts/send-test-digest.ts
/**
 * Send a test enhanced email digest
 *
 * Usage: npx tsx scripts/send-test-digest.ts btighe428@gmail.com
 */

import { Resend } from "resend";
import { buildEnhancedDigestHtml, buildEnhancedSubject, EnhancedEvent } from "../src/lib/email-digest-enhanced";
import { MtaAlertInput } from "../src/lib/commute-alerts";

// Load env
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Sample events with hype scores
const sampleEvents: EnhancedEvent[] = [
  {
    id: "1",
    title: "Hermès Sample Sale",
    body: "Birkins, Kelly bags, and silk scarves at 50-70% off. One day only. Expect 3+ hour waits.",
    location: "260 Fifth Avenue, 10th Floor",
    hypeScore: 98,
    hypeFactors: { brandTier: 95, scarcity: 40, ai: 15 },
    venueType: "INDOOR",
    moduleId: "food",
    moduleName: "Sample Sales",
    moduleIcon: "🛍️"
  },
  {
    id: "2",
    title: "Proenza Schouler Archive Sale",
    body: "PS1 bags, ready-to-wear, shoes. 60-80% off retail.",
    location: "Chelsea Market, 75 9th Ave",
    hypeScore: 82,
    hypeFactors: { brandTier: 75, scarcity: 25, ai: 10 },
    venueType: "INDOOR",
    moduleId: "food",
    moduleName: "Sample Sales",
    moduleIcon: "🛍️"
  },
  {
    id: "3",
    title: "Peach & Lily K-Beauty Sampling",
    body: "Free samples of Glass Skin serum, Super Reboot mask",
    location: "E 34th St between 5th & 6th Ave",
    hypeScore: 45,
    venueType: "OUTDOOR",
    moduleId: "food",
    moduleName: "Sample Sales",
    moduleIcon: "🛍️"
  },
  {
    id: "4",
    title: "MoMA Free Friday Nights",
    body: "Free admission 5:30-9pm. Yayoi Kusama: Infinity Mirrors on view.",
    location: "11 W 53rd St",
    venueType: "INDOOR",
    moduleId: "events",
    moduleName: "Events",
    moduleIcon: "🎭"
  },
  {
    id: "5",
    title: "Winter Jazz Fest - Brooklyn",
    body: "Multi-venue jazz festival featuring 100+ artists across 12 venues",
    location: "Various venues in Downtown Brooklyn",
    hypeScore: 76,
    venueType: "INDOOR",
    moduleId: "events",
    moduleName: "Events",
    moduleIcon: "🎭"
  },
  {
    id: "6",
    title: "Housing Connect: New Affordable Units in LIC",
    body: "1-3 BR units, $1,200-$2,800/mo. Deadline: Jan 15",
    location: "Long Island City",
    moduleId: "housing",
    moduleName: "Housing",
    moduleIcon: "🏠"
  }
];

// Sample MTA alerts
const sampleMtaAlerts: MtaAlertInput[] = [
  {
    id: "mta-1",
    routes: ["L"],
    headerText: "L train running with delays due to signal problems at Bedford Ave",
    isPlannedWork: false
  }
];

async function main() {
  const email = process.argv[2] || "btighe428@gmail.com";

  console.log(`📧 Sending enhanced test digest to: ${email}`);
  console.log("");

  try {
    // Build the enhanced email
    const html = await buildEnhancedDigestHtml(sampleEvents, sampleMtaAlerts, {
      zipCode: "11211", // Williamsburg
      vibePreset: "REGULAR",
      referralCode: "NYC-TEST1",
      feedbackTokens: {
        "1": "test-token-hermes",
        "2": "test-token-proenza",
        "3": "test-token-peach",
        "4": "test-token-moma",
        "5": "test-token-jazz",
        "6": "test-token-housing"
      }
    });

    const subject = buildEnhancedSubject(sampleEvents.length, "🌧️");

    console.log(`📝 Subject: ${subject}`);
    console.log("");

    // Send via Resend
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "NYC CityPing <hello@cityping.net>",
      to: email,
      subject,
      html
    });

    console.log("✅ Email sent successfully!");
    console.log(`   ID: ${result.data?.id}`);

  } catch (error) {
    console.error("❌ Failed to send email:", error);
    process.exit(1);
  }
}

main();
