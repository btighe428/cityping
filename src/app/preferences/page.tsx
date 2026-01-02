/**
 * Preferences Dashboard Page
 *
 * Central hub for user module preferences in the NYCPing multi-module architecture.
 * This Server Component implements the "progressive disclosure" pattern, allowing
 * users to enable/disable alert modules without overwhelming them with settings.
 *
 * Architectural Decisions:
 * 1. Server Component for initial data fetch (no client-side loading state)
 * 2. Server Action for toggle operations (atomic, transactional updates)
 * 3. Client wrapper for navigation (module settings pages)
 *
 * Data Flow:
 * - User preferences are fetched server-side with joined Module data
 * - Toggle operations use Server Actions with revalidatePath for cache invalidation
 * - Module-specific settings navigation happens client-side
 *
 * Security Considerations:
 * - Authentication is checked before any data access
 * - Server Actions validate user context before mutations
 * - User ID is captured in closure to prevent IDOR vulnerabilities
 *
 * Performance Optimizations:
 * - Preferences are sorted by module.sortOrder at database level
 * - revalidatePath provides surgical cache invalidation
 * - No client-side state hydration needed for initial render
 *
 * Historical Context:
 * The preferences dashboard pattern emerged from early RSS reader UIs (Google Reader, 2005)
 * where users needed to manage numerous feed subscriptions. The card-based toggle UI
 * became popularized by mobile notification settings (iOS Settings, 2008) and has since
 * become a standard pattern for subscription/preference management.
 */

import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PreferencesClient } from "@/components/PreferencesClient";

export const metadata = {
  title: "Alert Preferences | NYCPing",
  description: "Customize which NYC alerts you receive - parking, transit, events, and more.",
};

export default async function PreferencesPage() {
  // Authentication gate - redirect unauthenticated users
  const user = await getUserFromSession();
  if (!user) {
    redirect("/login");
  }

  // Extract userId for use in Server Action closure
  // This ensures TypeScript knows the value is non-null after the redirect guard
  const userId = user.id;

  // Fetch user's module preferences with joined module data
  // Ordering by sortOrder ensures consistent, intentional display order
  const preferences = await prisma.userModulePreference.findMany({
    where: { userId },
    include: {
      module: true,
    },
    orderBy: {
      module: { sortOrder: "asc" },
    },
  });

  /**
   * Server Action: Toggle module enabled state
   *
   * This action atomically updates the enabled flag for a user's module preference.
   * The userId is captured from the outer scope at action creation time, preventing
   * client-side manipulation of the target user.
   *
   * Technical Note:
   * The composite unique constraint (userId_moduleId) enables efficient upsert-like
   * behavior. We use update rather than upsert because preferences are pre-created
   * during user onboarding based on their zip code profile.
   *
   * @param moduleId - The module identifier (e.g., "parking", "transit")
   * @param enabled - The new enabled state
   */
  async function toggleModule(moduleId: string, enabled: boolean) {
    "use server";

    await prisma.userModulePreference.update({
      where: {
        userId_moduleId: { userId, moduleId },
      },
      data: { enabled },
    });

    // Invalidate the preferences page cache to reflect the change
    revalidatePath("/preferences");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Your Alert Preferences</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {/* Intro text with tier-aware messaging */}
        <p className="text-gray-600 mb-6">
          Choose which types of NYC alerts you want to receive.
          {user.tier === "free" && (
            <span className="block mt-2 text-sm">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                Free Tier
              </span>
              Daily email digest with 24-hour delay.{" "}
              <a
                href="/upgrade"
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                Upgrade for instant SMS alerts
              </a>
            </span>
          )}
          {user.tier === "premium" && (
            <span className="block mt-2 text-sm">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                Premium
              </span>
              Instant SMS and email notifications enabled.
            </span>
          )}
        </p>

        {/* Module preference cards */}
        {preferences.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">
              No modules available yet. Check back soon!
            </p>
          </div>
        ) : (
          <PreferencesClient
            preferences={preferences}
            toggleModuleAction={toggleModule}
          />
        )}

        {/* Location section */}
        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
          <h2 className="font-medium text-gray-900 mb-2">Your Location</h2>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Zip code:</span> {user.zipCode}
            {user.inferredNeighborhood && (
              <span className="text-gray-500"> ({user.inferredNeighborhood})</span>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Your location helps us personalize alerts for your neighborhood.
          </p>
          <a
            href="/settings/location"
            className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Change location
          </a>
        </div>

        {/* Additional profile details for transparency */}
        {(user.inferredSubwayLines.length > 0 || user.inferredHasParking) && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Inferred Profile
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              Based on your zip code, we&apos;ve automatically configured relevant alerts:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              {user.inferredSubwayLines.length > 0 && (
                <li>
                  <span className="font-medium">Subway lines:</span>{" "}
                  {user.inferredSubwayLines.join(", ")}
                </li>
              )}
              {user.inferredHasParking && (
                <li>
                  <span className="font-medium">Parking:</span> Street parking area detected
                </li>
              )}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
