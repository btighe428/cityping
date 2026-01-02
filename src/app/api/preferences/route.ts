// src/app/api/preferences/route.ts
// GET endpoint to list all user module preferences
//
// This endpoint returns the user's preferences for all modules, including:
// - Module metadata (id, name, description, icon)
// - User's enabled/disabled status for each module
// - Per-module settings (e.g., subway line filters, neighborhood scopes)
// - Whether the preference was inferred from user profile or explicitly set
//
// Authentication: Requires valid user session (TBD - session-based or token-based)
// For the unified User model, we'll need to wire up proper auth middleware.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/preferences
 *
 * Returns all module preferences for the authenticated user.
 * Response schema:
 * {
 *   preferences: Array<{
 *     moduleId: string;
 *     moduleName: string;
 *     moduleDescription: string;
 *     moduleIcon: string;
 *     enabled: boolean;
 *     settings: Record<string, unknown>;
 *     isInferred: boolean;
 *     createdAt: string;
 *     updatedAt: string;
 *   }>
 * }
 *
 * Status codes:
 * - 200: Success
 * - 401: Unauthorized (no valid session)
 * - 500: Internal server error
 */
export async function GET(req: NextRequest) {
  // TODO: Implement proper authentication
  // The unified User model requires session-based auth or JWT tokens.
  // For now, return 501 until the auth middleware is wired up.
  //
  // Future implementation:
  // const user = await getUserFromRequest(req);
  // if (!user) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }
  //
  // const preferences = await prisma.userModulePreference.findMany({
  //   where: { userId: user.id },
  //   include: {
  //     module: {
  //       select: {
  //         id: true,
  //         name: true,
  //         description: true,
  //         icon: true,
  //         sortOrder: true,
  //       },
  //     },
  //   },
  //   orderBy: { module: { sortOrder: "asc" } },
  // });
  //
  // return NextResponse.json({
  //   preferences: preferences.map((p) => ({
  //     moduleId: p.moduleId,
  //     moduleName: p.module.name,
  //     moduleDescription: p.module.description,
  //     moduleIcon: p.module.icon,
  //     enabled: p.enabled,
  //     settings: p.settings,
  //     isInferred: p.isInferred,
  //     createdAt: p.createdAt.toISOString(),
  //     updatedAt: p.updatedAt.toISOString(),
  //   })),
  // });

  return NextResponse.json(
    { error: "Auth not implemented" },
    { status: 501 }
  );
}
