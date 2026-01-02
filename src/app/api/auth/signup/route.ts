// src/app/api/auth/signup/route.ts
/**
 * Signup API Endpoint for NYC Ping
 *
 * This endpoint handles new user registration with intelligent preference
 * inference based on the user's zip code. The system leverages NYC's
 * geodemographic segmentation - residents of specific zip codes tend to
 * share lifestyle characteristics that inform sensible default preferences.
 *
 * Flow:
 * 1. Validate input using zod schema (email, 5-digit zipCode, optional phone)
 * 2. Check for existing user by email or phone to prevent duplicates
 * 3. If new user, create with inferred preferences from zip code profile
 * 4. Return user info including the inferred neighborhood
 *
 * Historical Context:
 * NYC's zip code system (established 1963 by the USPS Zone Improvement Plan)
 * was originally designed for mail routing efficiency. Over time, these codes
 * have become deeply correlated with neighborhood identity and demographics,
 * making them surprisingly powerful predictors of user preferences for
 * transit alerts, parking notifications, and local event relevance.
 *
 * @module api/auth/signup
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createUserWithInferredPreferences } from "@/lib/inference";
import { z } from "zod";

/**
 * Zod validation schema for signup request body.
 *
 * Design Rationale:
 * - email: Standard email validation, required for account identification
 * - zipCode: Must be exactly 5 numeric digits (USPS standard since 1963)
 *   We validate against the original 5-digit format rather than ZIP+4
 *   because our profile database is keyed by 5-digit codes.
 * - phone: Optional E.164 format for SMS notifications (premium tier)
 *
 * Note: We intentionally keep validation minimal at signup. Additional
 * validation (e.g., NYC-specific zip code range) is handled downstream
 * by the inference engine, which gracefully defaults unknown zips.
 */
const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  zipCode: z.string().regex(/^\d{5}$/, "ZIP code must be exactly 5 digits"),
  phone: z.string().optional(),
});

/**
 * POST /api/auth/signup
 *
 * Creates a new user account with zip code-based preference inference.
 *
 * Request Body:
 * {
 *   email: string;      // Required, must be valid email format
 *   zipCode: string;    // Required, must be 5 numeric digits
 *   phone?: string;     // Optional, for SMS notifications
 * }
 *
 * Response (200 OK):
 * {
 *   user: {
 *     id: string;
 *     email: string;
 *     tier: "free" | "premium";
 *     inferredNeighborhood: string;
 *   },
 *   message: string;
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid input (validation failed or malformed JSON)
 * - 409 Conflict: User with email or phone already exists
 * - 500 Internal Server Error: Database or inference failure
 *
 * @param req - Next.js request object with JSON body
 * @returns NextResponse with user data or error message
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Parse request body with error handling for malformed JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate input against schema
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { email, zipCode, phone } = parsed.data;

  try {
    // Check if user already exists by email or phone
    // The OR query handles the optional phone gracefully
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Create user with inferred preferences from zip code
    // The inference engine handles:
    // 1. Profile lookup from ZIP_PROFILES database
    // 2. Default preference generation based on profile characteristics
    // 3. User record creation with all inferred fields populated
    const user = await createUserWithInferredPreferences(prisma, {
      email,
      zipCode,
      phone,
    });

    // Cast user to access typed properties
    // The inference function returns a Prisma User model with all fields
    const typedUser = user as {
      id: string;
      email: string;
      tier: string;
      inferredNeighborhood: string | null;
    };

    return NextResponse.json({
      user: {
        id: typedUser.id,
        email: typedUser.email,
        tier: typedUser.tier,
        inferredNeighborhood: typedUser.inferredNeighborhood,
      },
      message: "Account created. Check your email for confirmation.",
    });
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error("Signup error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
