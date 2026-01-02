// src/lib/auth.ts
/**
 * Authentication Utilities for NYC Ping
 *
 * This module provides authentication helpers for API routes that require
 * user context. The implementation follows a simple session-based approach
 * using HTTP headers, suitable for the current application architecture.
 *
 * Design Philosophy:
 * We employ a lightweight auth mechanism that extracts user identity from
 * request headers. This approach is inspired by the "trust the proxy" pattern
 * common in API gateway architectures, where authentication is handled at
 * an outer layer and user context is passed via trusted headers.
 *
 * Historical Context:
 * Modern API authentication evolved from early HTTP Basic Auth (RFC 2617, 1999)
 * through session cookies (stateful) to JWT tokens (stateless). The current
 * implementation uses a header-based approach that's compatible with both
 * client-side session management and server-side session stores.
 *
 * Security Notes:
 * - In production, these headers should be set by a trusted authentication
 *   layer (e.g., middleware, API gateway) rather than directly by clients
 * - The x-user-id header provides the primary user identifier
 * - This design allows easy migration to JWT or OAuth in the future
 *
 * @module lib/auth
 */

import { NextRequest } from "next/server";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { User } from "@prisma/client";

/**
 * Header name for user identification.
 * Following X-* header convention for custom application headers.
 */
const USER_ID_HEADER = "x-user-id";

/**
 * Extracts the authenticated user from an incoming request.
 *
 * This function retrieves the user ID from request headers and fetches
 * the corresponding user record from the database. It returns null if:
 * - No user ID header is present
 * - The user ID doesn't match any existing user
 *
 * Implementation Notes:
 * The function performs a database lookup on each request. For high-traffic
 * scenarios, consider implementing caching or moving to JWT tokens where
 * user data can be embedded in the token payload.
 *
 * @param req - The Next.js request object
 * @returns The authenticated User object or null if not authenticated
 *
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const user = await getUserFromRequest(req);
 *   if (!user) {
 *     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   }
 *   // User is authenticated, proceed with business logic
 * }
 * ```
 */
export async function getUserFromRequest(
  req: NextRequest
): Promise<User | null> {
  const userId = req.headers.get(USER_ID_HEADER);

  if (!userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user;
  } catch (error) {
    // Log error for debugging but don't expose internal details
    console.error("Error fetching user from request:", error);
    return null;
  }
}

/**
 * Cookie name for session-based user identification.
 * Used for Server Component authentication where NextRequest is not available.
 */
const USER_SESSION_COOKIE = "nycping_user_id";

/**
 * Extracts the authenticated user from the current session context.
 *
 * This function is designed for use in Server Components where a NextRequest
 * object is not available. It retrieves the user ID from either:
 * 1. HTTP headers (x-user-id) - for API gateway/proxy scenarios
 * 2. Session cookies (nycping_user_id) - for browser-based sessions
 *
 * This dual-source approach enables flexibility in authentication strategies:
 * - During development, headers can be set manually or via middleware
 * - In production, cookies provide secure, HttpOnly session management
 *
 * Historical Context:
 * The evolution from header-based to cookie-based sessions reflects a broader
 * industry trend toward more secure session management. Cookies with appropriate
 * flags (HttpOnly, Secure, SameSite) provide CSRF protection that header-based
 * auth lacks without additional measures.
 *
 * @returns The authenticated User object or null if not authenticated
 *
 * @example
 * ```typescript
 * // In a Server Component
 * export default async function PreferencesPage() {
 *   const user = await getUserFromSession();
 *   if (!user) {
 *     redirect("/login");
 *   }
 *   // User is authenticated, render preferences
 * }
 * ```
 */
export async function getUserFromSession(): Promise<User | null> {
  // First, try to get user ID from headers (for API gateway scenarios)
  const headerStore = await headers();
  let userId = headerStore.get(USER_ID_HEADER);

  // Fallback to cookie-based session
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get(USER_SESSION_COOKIE)?.value ?? null;
  }

  if (!userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user;
  } catch (error) {
    console.error("Error fetching user from session:", error);
    return null;
  }
}
