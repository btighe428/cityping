// src/app/api/preferences/[moduleId]/route.ts
// GET/PUT endpoints for single module preference management
//
// These endpoints allow users to:
// - GET: Retrieve their preference for a specific module
// - PUT: Update their preference (enable/disable, modify settings)
//
// The [moduleId] dynamic segment corresponds to Module.id (e.g., "parking", "transit")
// Authentication: Requires valid user session (TBD - session-based or token-based)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ moduleId: string }>;
};

/**
 * GET /api/preferences/[moduleId]
 *
 * Returns the user's preference for a specific module.
 * If no preference exists, returns module defaults with enabled=true (inferred).
 *
 * Response schema:
 * {
 *   preference: {
 *     moduleId: string;
 *     moduleName: string;
 *     moduleDescription: string;
 *     moduleIcon: string;
 *     enabled: boolean;
 *     settings: Record<string, unknown>;
 *     isInferred: boolean;
 *     createdAt?: string;
 *     updatedAt?: string;
 *   }
 * }
 *
 * Status codes:
 * - 200: Success
 * - 401: Unauthorized (no valid session)
 * - 404: Module not found
 * - 500: Internal server error
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const { moduleId } = await context.params;

  // TODO: Implement proper authentication
  // Future implementation:
  // const user = await getUserFromRequest(req);
  // if (!user) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }
  //
  // // Verify module exists
  // const module = await prisma.module.findUnique({
  //   where: { id: moduleId },
  //   select: {
  //     id: true,
  //     name: true,
  //     description: true,
  //     icon: true,
  //   },
  // });
  //
  // if (!module) {
  //   return NextResponse.json({ error: "Module not found" }, { status: 404 });
  // }
  //
  // // Get user preference or return defaults
  // const preference = await prisma.userModulePreference.findUnique({
  //   where: {
  //     userId_moduleId: {
  //       userId: user.id,
  //       moduleId,
  //     },
  //   },
  // });
  //
  // if (preference) {
  //   return NextResponse.json({
  //     preference: {
  //       moduleId: module.id,
  //       moduleName: module.name,
  //       moduleDescription: module.description,
  //       moduleIcon: module.icon,
  //       enabled: preference.enabled,
  //       settings: preference.settings,
  //       isInferred: preference.isInferred,
  //       createdAt: preference.createdAt.toISOString(),
  //       updatedAt: preference.updatedAt.toISOString(),
  //     },
  //   });
  // }
  //
  // // Return default preference (inferred, enabled)
  // return NextResponse.json({
  //   preference: {
  //     moduleId: module.id,
  //     moduleName: module.name,
  //     moduleDescription: module.description,
  //     moduleIcon: module.icon,
  //     enabled: true,
  //     settings: {},
  //     isInferred: true,
  //   },
  // });

  return NextResponse.json(
    { error: "Auth not implemented" },
    { status: 501 }
  );
}

/**
 * PUT /api/preferences/[moduleId]
 *
 * Updates the user's preference for a specific module.
 * Creates the preference if it doesn't exist (upsert behavior).
 * Setting isInferred to false since this is an explicit user action.
 *
 * Request body schema:
 * {
 *   enabled?: boolean;
 *   settings?: Record<string, unknown>;
 * }
 *
 * Response schema:
 * {
 *   preference: {
 *     moduleId: string;
 *     enabled: boolean;
 *     settings: Record<string, unknown>;
 *     isInferred: boolean;
 *     updatedAt: string;
 *   }
 * }
 *
 * Status codes:
 * - 200: Success
 * - 400: Invalid request body
 * - 401: Unauthorized (no valid session)
 * - 404: Module not found
 * - 500: Internal server error
 */
export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  const { moduleId } = await context.params;

  // TODO: Implement proper authentication
  // Future implementation:
  // const user = await getUserFromRequest(req);
  // if (!user) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }
  //
  // // Parse and validate request body
  // let body: { enabled?: boolean; settings?: Record<string, unknown> };
  // try {
  //   body = await req.json();
  // } catch {
  //   return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  // }
  //
  // // Validate enabled is boolean if provided
  // if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
  //   return NextResponse.json(
  //     { error: "enabled must be a boolean" },
  //     { status: 400 }
  //   );
  // }
  //
  // // Validate settings is object if provided
  // if (body.settings !== undefined && typeof body.settings !== "object") {
  //   return NextResponse.json(
  //     { error: "settings must be an object" },
  //     { status: 400 }
  //   );
  // }
  //
  // // Verify module exists
  // const module = await prisma.module.findUnique({
  //   where: { id: moduleId },
  //   select: { id: true },
  // });
  //
  // if (!module) {
  //   return NextResponse.json({ error: "Module not found" }, { status: 404 });
  // }
  //
  // // Upsert user preference
  // const preference = await prisma.userModulePreference.upsert({
  //   where: {
  //     userId_moduleId: {
  //       userId: user.id,
  //       moduleId,
  //     },
  //   },
  //   update: {
  //     ...(body.enabled !== undefined && { enabled: body.enabled }),
  //     ...(body.settings !== undefined && { settings: body.settings }),
  //     isInferred: false, // Explicit user action
  //   },
  //   create: {
  //     userId: user.id,
  //     moduleId,
  //     enabled: body.enabled ?? true,
  //     settings: body.settings ?? {},
  //     isInferred: false,
  //   },
  // });
  //
  // return NextResponse.json({
  //   preference: {
  //     moduleId: preference.moduleId,
  //     enabled: preference.enabled,
  //     settings: preference.settings,
  //     isInferred: preference.isInferred,
  //     updatedAt: preference.updatedAt.toISOString(),
  //   },
  // });

  return NextResponse.json(
    { error: "Auth not implemented" },
    { status: 501 }
  );
}
