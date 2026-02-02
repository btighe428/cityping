// prisma/seeds/modules.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULES = [
  {
    id: "parking",
    name: "Parking & Driving",
    description: "ASP suspensions, street cleaning, meter rules",
    icon: "🅿️",
    sortOrder: 1,
  },
  {
    id: "transit",
    name: "Transit",
    description: "Subway alerts, weekend reroutes, delays",
    icon: "🚇",
    sortOrder: 2,
  },
  {
    id: "events",
    name: "Events & Culture",
    description: "Free concerts, street fairs, museum days",
    icon: "🎭",
    sortOrder: 3,
  },
  {
    id: "housing",
    name: "Housing & Lotteries",
    description: "Affordable housing lotteries, rent drops",
    icon: "🏠",
    sortOrder: 4,
  },
  {
    id: "food",
    name: "Sample Sales",
    description: "Fashion sample sales, designer discounts",
    icon: "🛍️",
    sortOrder: 5,
  },
  {
    id: "deals",
    name: "Deals & Money",
    description: "Credit card bonuses, rate changes",
    icon: "💰",
    sortOrder: 6,
  },
] as const;

export async function seedModules() {
  for (const mod of MODULES) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: mod,
      create: mod,
    });
  }
  console.log(`Seeded ${MODULES.length} modules`);
}
