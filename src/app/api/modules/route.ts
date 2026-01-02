import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const modules = await prisma.module.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      sources: {
        where: { enabled: true },
        select: {
          slug: true,
          name: true,
          frequency: true,
        },
      },
    },
  });

  return NextResponse.json({ modules });
}
