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
import { sendEmail } from "@/lib/resend";
import { welcomeEmail, AlertItem, nycToday, NYCTodayData, NYCTodayEvent } from "@/lib/email-templates-v2";
import { z } from "zod";
import { DateTime } from "luxon";

/**
 * Zod validation schema for signup request body.
 *
 * Design Rationale:
 * - email: Standard email validation, required for account identification
 * - borough: Required, one of the five NYC boroughs
 * - zipCode: Optional, for future granular personalization
 * - phone: Optional E.164 format for SMS notifications (premium tier)
 */
const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  borough: z.enum(["manhattan", "brooklyn", "queens", "bronx", "staten_island"]),
  zipCode: z.string().regex(/^\d{5}$/, "ZIP code must be exactly 5 digits").optional(),
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

  const { email, zipCode, borough, phone } = parsed.data;

  try {
    // Check if user already exists by email or phone
    // For existing users, just log them in instead of rejecting
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      // Log in existing user and send welcome back email
      const response = NextResponse.json({
        user: {
          id: existingUser.id,
          email: existingUser.email,
          tier: existingUser.tier,
          inferredNeighborhood: existingUser.inferredNeighborhood,
        },
        redirectUrl: "/preferences",
        message: "Welcome back!",
      });

      response.cookies.set("nycping_user_id", existingUser.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });

      // Send welcome back emails (async)
      sendWelcomeEmail(
        existingUser.email,
        existingUser.inferredNeighborhood || "New York City"
      ).catch((err) => console.error("Failed to send welcome back email:", err));

      return response;
    }

    // Create user with inferred preferences from borough (or zip code if provided)
    // The inference engine handles:
    // 1. Profile lookup from BOROUGH_PROFILES (or ZIP_PROFILES if zip provided)
    // 2. Default preference generation based on profile characteristics
    // 3. User record creation with all inferred fields populated
    const user = await createUserWithInferredPreferences(prisma, {
      email,
      borough,
      zipCode: zipCode || undefined,
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

    // Send welcome email with upcoming alerts (async, don't block response)
    sendWelcomeEmail(typedUser.email, typedUser.inferredNeighborhood || "New York City").catch(
      (err) => console.error("Failed to send welcome email:", err)
    );

    // Create response with session cookie
    const response = NextResponse.json({
      user: {
        id: typedUser.id,
        email: typedUser.email,
        tier: typedUser.tier,
        inferredNeighborhood: typedUser.inferredNeighborhood,
      },
      redirectUrl: "/preferences",
      message: "Account created successfully!",
    });

    // Set session cookie to authenticate the user
    response.cookies.set("nycping_user_id", typedUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error("Signup error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Sends a welcome email with upcoming alerts to new users
 *
 * Fetches the latest alerts from the database, groups them by module,
 * and sends a personalized welcome email showing the value NYCPing provides.
 *
 * @param email - User's email address
 * @param neighborhood - User's inferred neighborhood for personalization
 */
async function sendWelcomeEmail(email: string, neighborhood: string): Promise<void> {
  console.log(`[Welcome Email] Starting for ${email}, neighborhood: ${neighborhood}`);

  // Fetch upcoming alerts from database
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

  console.log(`[Welcome Email] Found ${alerts.length} upcoming alerts`);

  // Transform to AlertItem format (filter out alerts with null startsAt)
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

  console.log(`[Welcome Email] Transformed ${alertItems.length} alert items`);

  // Group by module
  const alertsByModule: Record<string, AlertItem[]> = {};
  alertItems.forEach((alert) => {
    if (!alertsByModule[alert.moduleId]) {
      alertsByModule[alert.moduleId] = [];
    }
    alertsByModule[alert.moduleId].push(alert);
  });

  console.log(`[Welcome Email] Grouped into ${Object.keys(alertsByModule).length} modules:`, Object.keys(alertsByModule));

  // Generate welcome email
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://nycping-app.vercel.app";
  const emailContent = welcomeEmail({
    neighborhood,
    alertsByModule,
    preferencesUrl: `${baseUrl}/preferences`,
    tier: "free",
  });

  // Send welcome email
  await sendEmail({
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  console.log(`[Welcome Email] Welcome email sent to ${email}`);

  // Also send an immediate "NYC Today" preview so they see the daily format
  await sendNYCTodayPreview(email, neighborhood);
}

/**
 * Sends an immediate "NYC Today" preview email after signup
 * Shows new users what their daily briefing will look like
 */
async function sendNYCTodayPreview(email: string, neighborhood: string): Promise<void> {
  console.log(`[NYC Today Preview] Starting for ${email}`);

  const nyNow = DateTime.now().setZone("America/New_York");

  // Fetch today's alerts
  const todayStart = nyNow.startOf("day").toJSDate();

  const alertEvents = await prisma.alertEvent.findMany({
    where: {
      startsAt: {
        gte: todayStart,
        lte: nyNow.plus({ days: 2 }).toJSDate(), // Include next 2 days
      },
    },
    include: {
      source: { include: { module: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  // Fetch evergreen events for "Don't Miss" section
  const evergreenEvents = await prisma.evergreenEvent.findMany({
    where: { isActive: true },
    take: 5,
  });

  // Build essentials grouped by module (new structure)
  const transitAlerts = alertEvents
    .filter((e) => e.source.moduleId === "transit")
    .slice(0, 3)
    .map((e) => ({
      id: e.id,
      title: e.title,
      description: e.body?.slice(0, 60) || undefined,
      category: "transit",
      moduleId: "transit" as const,
      isUrgent: true,
    }));

  const parkingAlerts = alertEvents
    .filter((e) => e.source.moduleId === "parking")
    .slice(0, 2)
    .map((e) => ({
      id: e.id,
      title: e.title,
      description: e.body?.slice(0, 60) || undefined,
      category: "parking",
      moduleId: "parking" as const,
      isUrgent: false,
    }));

  const essentials = {
    transit: transitAlerts.length > 0 ? transitAlerts : [{
      id: "default-transit",
      title: "Normal service on all lines",
      description: "No major delays reported",
      category: "transit",
      moduleId: "transit" as const,
      isUrgent: false,
    }],
    parking: parkingAlerts.length > 0 ? parkingAlerts : [{
      id: "default-parking",
      title: "Regular ASP rules in effect",
      description: "Check signs for your street",
      category: "parking",
      moduleId: "parking" as const,
      isUrgent: false,
    }],
    other: [] as NYCTodayEvent[],
  };

  // Don't Miss - pick from evergreen
  const dontMissEvent = evergreenEvents[0];
  const dontMiss = dontMissEvent ? {
    title: dontMissEvent.name,
    description: dontMissEvent.insiderContext?.slice(0, 100) || "Local insider tip",
  } : undefined;

  // Tonight in NYC
  const tonightInNYC: NYCTodayEvent[] = [
    {
      id: "tonight-1",
      title: "MoMA Free Fridays",
      description: "Free admission 5:30-9pm every Friday",
      category: "culture",
      isFree: true,
    },
    {
      id: "tonight-2",
      title: "Live Jazz at Smalls",
      description: "Greenwich Village institution",
      category: "culture",
      price: "$25",
    },
  ];

  // Look Ahead
  const lookAhead = [
    {
      day: nyNow.plus({ days: 1 }).toFormat("EEE"),
      forecast: "Check your weather app",
      tip: "We'll include real forecasts soon",
    },
  ];

  const todayData: NYCTodayData = {
    date: nyNow.toJSDate(),
    weather: {
      high: 48,
      low: 35,
      icon: "☀️",
      summary: "Clear",
    },
    essentials,
    dontMiss,
    tonightInNYC,
    lookAhead,
    user: {
      neighborhood,
      tier: "free",
    },
  };

  const emailContent = nycToday(todayData);

  await sendEmail({
    to: email,
    subject: `${emailContent.subject} (Preview)`,
    html: emailContent.html,
    text: emailContent.text,
  });

  console.log(`[NYC Today Preview] Sent to ${email}`);
}
