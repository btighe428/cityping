import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../src/lib/resend";
import { welcomeEmail, AlertItem } from "../src/lib/email-templates-v2";

const prisma = new PrismaClient();

async function testWelcomeEmail() {
  const email = "btighe428@gmail.com";
  const neighborhood = "Williamsburg";

  console.log("[Welcome Email] Starting for", email);
  console.log("[Welcome Email] Current date:", new Date().toISOString());

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

  console.log("[Welcome Email] Found", alerts.length, "upcoming alerts");

  if (alerts.length > 0) {
    console.log("[Welcome Email] First alert:", {
      title: alerts[0].title,
      startsAt: alerts[0].startsAt,
      moduleId: alerts[0].source?.moduleId,
    });
  }

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

  console.log("[Welcome Email] Transformed", alertItems.length, "items");

  const alertsByModule: Record<string, AlertItem[]> = {};
  alertItems.forEach((alert) => {
    if (!alertsByModule[alert.moduleId]) {
      alertsByModule[alert.moduleId] = [];
    }
    alertsByModule[alert.moduleId].push(alert);
  });

  console.log("[Welcome Email] Modules:", Object.keys(alertsByModule));
  Object.entries(alertsByModule).forEach(([mod, items]) => {
    console.log(`  - ${mod}: ${items.length} alerts`);
  });

  const baseUrl = "https://nycping-app.vercel.app";
  const emailContent = welcomeEmail({
    neighborhood,
    alertsByModule,
    preferencesUrl: baseUrl + "/preferences",
    tier: "free",
  });

  console.log("[Welcome Email] Subject:", emailContent.subject);
  console.log("[Welcome Email] HTML length:", emailContent.html.length);

  const result = await sendEmail({
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  console.log("[Welcome Email] Sent! ID:", result.id);
}

testWelcomeEmail()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
