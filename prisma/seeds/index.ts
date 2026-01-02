// prisma/seeds/index.ts
import { PrismaClient } from "@prisma/client";
import { seedModules } from "./modules";
import { seedAlertSources } from "./sources";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  await seedModules();
  await seedAlertSources();

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
