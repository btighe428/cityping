// scripts/migrate-users-to-nycping.ts
/**
 * User Migration Script: Legacy Phone/Account -> Unified User Model
 *
 * This script performs a one-time migration of existing ParkPing users (stored in the
 * legacy Phone/Account schema) to the new unified NYCPing User model with multi-module
 * preferences.
 *
 * IMPORTANT: This script is designed for MANUAL execution during the NYCPing transition.
 * It is NOT run automatically and should be executed by an operator after verifying
 * database state and backup procedures.
 *
 * Migration Strategy:
 * ------------------
 * The script follows a conservative, idempotent approach that prioritizes data integrity:
 *
 * 1. **Idempotency**: Users already migrated (identified by phone number) are skipped.
 *    This allows safe re-execution if the script fails partway through.
 *
 * 2. **Tier Determination**: Users with associated Stripe customer IDs are classified
 *    as "premium" tier, reflecting their existing paid subscription status. Users
 *    without Stripe data default to "free" tier.
 *
 * 3. **Profile Inference**: Zip codes are inferred from location data or defaulted
 *    to "10001" (Chelsea, Manhattan) as a neutral NYC default. The inference engine
 *    populates neighborhood, subway lines, and parking relevance from this zip code.
 *
 * 4. **Module Preferences**: Parking module receives EXPLICIT preference (non-inferred)
 *    since these users explicitly signed up for parking alerts. Other modules receive
 *    INFERRED preferences based on zip code profile.
 *
 * Historical Context:
 * ------------------
 * The ParkPing -> NYCPing transition represents an architectural evolution from a
 * single-purpose SMS alert system (alternate side parking) to a comprehensive NYC
 * lifestyle notification platform. This migration preserves the contractual relationship
 * with existing subscribers while expanding the value proposition through additional
 * alert modules.
 *
 * The dual-write period (Phase 2 of migration) ensures no disruption to existing
 * parking alert functionality while the new multi-module system is deployed.
 *
 * Usage:
 * ------
 * npm run migrate:users
 *
 * Or directly:
 * npx tsx scripts/migrate-users-to-nycping.ts
 *
 * Pre-requisites:
 * - Database backup completed
 * - Modules seeded (npm run db:seed:modules)
 * - Environment variables configured (.env with DATABASE_URL)
 *
 * @author NYCPing Team
 * @version 1.0.0
 */

import { PrismaClient, SmsOptInStatus } from "@prisma/client";
import { inferProfileFromZip, generateDefaultPreferences } from "../src/lib/inference";

// Initialize Prisma client with logging for debugging
const prisma = new PrismaClient({
  log: ["warn", "error"],
});

/**
 * Default zip code for users without location data.
 * 10001 (Chelsea/Hudson Yards) represents a central Manhattan location
 * with balanced transit access and moderate parking relevance - a reasonable
 * "generic NYC user" default when no specific location is known.
 */
const DEFAULT_ZIP_CODE = "10001";

/**
 * Parking module ID - used for creating explicit preferences for migrated users.
 */
const PARKING_MODULE_ID = "parking";

/**
 * Module IDs for inferred preferences (all modules except parking).
 * These are enabled based on zip code profile inference.
 */
const INFERRED_MODULE_IDS = ["transit", "events", "housing", "food", "deals"];

/**
 * Statistics object for tracking migration progress and outcomes.
 */
interface MigrationStats {
  totalPhones: number;
  migratedUsers: number;
  skippedExisting: number;
  skippedNoAccount: number;
  errors: number;
  preferencesCreated: number;
}

/**
 * Generates a placeholder email for users without email addresses.
 *
 * In the legacy ParkPing system, email was optional (SMS was primary).
 * The new User model requires email for the free tier email digest feature.
 * Placeholder emails use a consistent format for later identification and update.
 *
 * @param phoneNumber - E.164 formatted phone number
 * @returns Placeholder email in format "phone+{sanitized_number}@nycping.placeholder"
 */
function generatePlaceholderEmail(phoneNumber: string): string {
  // Remove non-numeric characters and truncate country code for readability
  const sanitized = phoneNumber.replace(/\D/g, "").slice(-10);
  return `phone+${sanitized}@nycping.placeholder`;
}

/**
 * Determines user tier based on account subscription status.
 *
 * Business Logic:
 * - Users with Stripe customer IDs are classified as "premium" (paying subscribers)
 * - Users without Stripe data are classified as "free"
 *
 * This heuristic may need refinement if there are edge cases where Stripe
 * customer IDs exist but subscriptions have lapsed. For the initial migration,
 * we err on the side of preserving premium status to avoid disrupting active subscribers.
 *
 * @param stripeCustomerId - Stripe customer ID from Account model, if any
 * @returns "premium" if Stripe customer exists, "free" otherwise
 */
function determineTier(stripeCustomerId: string | null | undefined): "free" | "premium" {
  return stripeCustomerId ? "premium" : "free";
}

/**
 * Maps legacy SmsOptInStatus to new User model format.
 *
 * The enum values are identical between legacy and new schemas, but this
 * explicit mapping provides a safe type conversion and documents the
 * relationship for future maintenance.
 *
 * @param legacyStatus - SmsOptInStatus from legacy Phone model
 * @returns Corresponding status for User model
 */
function mapSmsOptInStatus(legacyStatus: SmsOptInStatus): SmsOptInStatus {
  return legacyStatus;
}

/**
 * Main migration function - processes all legacy Phone records and creates
 * corresponding User records with module preferences.
 *
 * Algorithm:
 * 1. Fetch all Phone records with Account and PhoneCityAlert relations
 * 2. For each phone, check if User with matching phone number exists
 * 3. If exists, skip (idempotent behavior)
 * 4. If not exists:
 *    a. Extract email and Stripe data from associated Account
 *    b. Infer zip profile (default to 10001 if unknown)
 *    c. Generate default preferences from profile
 *    d. Create User record with inferred profile fields
 *    e. Create UserModulePreference for parking (explicit)
 *    f. Create UserModulePreferences for other modules (inferred)
 * 5. Log progress throughout
 *
 * @returns MigrationStats object with outcome counts
 */
async function migrateUsers(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalPhones: 0,
    migratedUsers: 0,
    skippedExisting: 0,
    skippedNoAccount: 0,
    errors: 0,
    preferencesCreated: 0,
  };

  console.log("=".repeat(70));
  console.log("NYCPing User Migration Script");
  console.log("=".repeat(70));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("");

  // Verify modules are seeded
  const moduleCount = await prisma.module.count();
  if (moduleCount === 0) {
    console.error("ERROR: No modules found in database.");
    console.error("Please run 'npm run db:seed:modules' before migration.");
    process.exit(1);
  }
  console.log(`Verified: ${moduleCount} modules seeded in database`);
  console.log("");

  // Fetch all phones with related data
  console.log("Fetching legacy Phone records...");
  const phones = await prisma.phone.findMany({
    include: {
      account: {
        include: {
          subscriptions: {
            where: { status: "active" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      cityAlerts: true,
    },
  });

  stats.totalPhones = phones.length;
  console.log(`Found ${stats.totalPhones} Phone records to process`);
  console.log("");

  // Process each phone
  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i];
    const progress = `[${i + 1}/${stats.totalPhones}]`;

    try {
      // Check if user already exists (idempotency check)
      const existingUser = await prisma.user.findUnique({
        where: { phone: phone.e164 },
      });

      if (existingUser) {
        console.log(`${progress} SKIP: User already exists for ${phone.e164}`);
        stats.skippedExisting++;
        continue;
      }

      // Verify account exists
      if (!phone.account) {
        console.log(`${progress} SKIP: No account found for phone ${phone.e164}`);
        stats.skippedNoAccount++;
        continue;
      }

      // Extract data from legacy models
      const account = phone.account;
      const email = account.email ?? generatePlaceholderEmail(phone.e164);
      const stripeCustomerId = account.stripeCustomerId;
      const tier = determineTier(stripeCustomerId);

      // Determine zip code (default to 10001 if not available)
      // In the legacy schema, zip codes were not stored directly.
      // Future enhancement: could infer from city alerts or area codes.
      const zipCode = DEFAULT_ZIP_CODE;

      // Infer profile from zip code
      const profile = inferProfileFromZip(zipCode);
      const preferences = generateDefaultPreferences(profile);

      // Check for existing user by email (handle placeholder email collisions)
      let finalEmail = email;
      const existingEmailUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmailUser) {
        // Email collision - append phone suffix for uniqueness
        const timestamp = Date.now();
        finalEmail = email.includes("@nycping.placeholder")
          ? `phone+${phone.e164.replace(/\D/g, "").slice(-10)}_${timestamp}@nycping.placeholder`
          : `${email.split("@")[0]}+${timestamp}@${email.split("@")[1]}`;
        console.log(`${progress} NOTE: Email collision detected, using ${finalEmail}`);
      }

      // Create user with transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Create User record
        const user = await tx.user.create({
          data: {
            phone: phone.e164,
            email: finalEmail,
            zipCode,
            tier,
            stripeCustomerId,
            // Inferred profile fields
            inferredNeighborhood: profile.neighborhood,
            inferredSubwayLines: profile.subwayLines,
            inferredHasParking: profile.parkingRelevance === "high" || profile.parkingRelevance === "medium",
            // Opt-in status from legacy
            smsOptInStatus: mapSmsOptInStatus(phone.smsOptInStatus),
            smsOptInAt: phone.smsOptInAt,
            // Email opt-in set to account creation time
            emailOptInAt: account.createdAt,
          },
        });

        // Create EXPLICIT parking preference (user signed up for parking alerts)
        // Parking is enabled because legacy users explicitly wanted parking alerts
        const parkingPref = preferences.parking;
        await tx.userModulePreference.create({
          data: {
            userId: user.id,
            moduleId: PARKING_MODULE_ID,
            enabled: true, // Always enabled - they signed up for parking!
            settings: JSON.parse(JSON.stringify(parkingPref.settings)),
            isInferred: false, // EXPLICIT - not inferred
          },
        });
        stats.preferencesCreated++;

        // Create INFERRED preferences for other modules
        for (const moduleId of INFERRED_MODULE_IDS) {
          const modulePref = preferences[moduleId as keyof typeof preferences];
          if (!modulePref) continue;

          await tx.userModulePreference.create({
            data: {
              userId: user.id,
              moduleId,
              enabled: modulePref.enabled,
              settings: JSON.parse(JSON.stringify(modulePref.settings)),
              isInferred: true, // Inferred from zip code
            },
          });
          stats.preferencesCreated++;
        }

        console.log(`${progress} MIGRATED: ${phone.e164} -> User ${user.id} (${tier})`);
      });

      stats.migratedUsers++;
    } catch (error) {
      console.error(`${progress} ERROR: Failed to migrate ${phone.e164}:`, error);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Print final migration statistics in a formatted report.
 *
 * @param stats - MigrationStats object with outcome counts
 */
function printStats(stats: MigrationStats): void {
  console.log("");
  console.log("=".repeat(70));
  console.log("Migration Complete");
  console.log("=".repeat(70));
  console.log(`Completed at: ${new Date().toISOString()}`);
  console.log("");
  console.log("Summary:");
  console.log("-".repeat(40));
  console.log(`Total Phone records processed:    ${stats.totalPhones}`);
  console.log(`Successfully migrated:            ${stats.migratedUsers}`);
  console.log(`Skipped (already migrated):       ${stats.skippedExisting}`);
  console.log(`Skipped (no account):             ${stats.skippedNoAccount}`);
  console.log(`Errors:                           ${stats.errors}`);
  console.log(`Preferences created:              ${stats.preferencesCreated}`);
  console.log("-".repeat(40));

  // Calculate success rate
  const processed = stats.migratedUsers + stats.skippedExisting + stats.skippedNoAccount + stats.errors;
  const successRate = processed > 0 ? ((stats.migratedUsers / processed) * 100).toFixed(1) : "N/A";
  console.log(`Migration success rate:           ${successRate}%`);

  if (stats.errors > 0) {
    console.log("");
    console.log("WARNING: Some records failed to migrate. Review errors above.");
    console.log("The script is idempotent - safe to re-run after fixing issues.");
  }
}

/**
 * Entry point - execute migration with proper error handling and cleanup.
 */
async function main(): Promise<void> {
  try {
    const stats = await migrateUsers();
    printStats(stats);

    // Exit with error code if any failures occurred
    if (stats.errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("FATAL ERROR: Migration failed with uncaught exception:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute migration
main();
