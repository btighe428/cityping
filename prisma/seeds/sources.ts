// prisma/seeds/sources.ts
import { PrismaClient, SourceFrequency } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Alert Source Seed Data for NYCPing Multi-Module Architecture
 *
 * Each source represents an individual data feed within a module that generates alerts.
 * Sources are classified by polling frequency:
 *   - realtime: Poll every 60-90 sec (e.g., subway delays)
 *   - hourly:   Cron hourly (e.g., sample sale updates)
 *   - daily:    Cron daily (e.g., ASP calendar sync)
 *
 * The `config` JSON stores source-specific parameters:
 *   - icsUrl:    iCalendar feed URL
 *   - apiUrl:    REST API endpoint
 *   - gtfsRtUrl: GTFS-realtime feed URL
 *   - scrapeUrl: Page to scrape for data
 *   - manual:    Flag for manually curated sources
 */
export const ALERT_SOURCES = [
  // ============================================================================
  // PARKING MODULE
  // ============================================================================
  {
    slug: "asp-calendar",
    moduleId: "parking",
    name: "Alternate Side Parking",
    frequency: SourceFrequency.daily,
    config: {
      icsUrl:
        "https://www.nyc.gov/assets/dca/downloads/pdf/consumers/ASP-Schedule.ics",
    },
  },
  {
    slug: "nyc-311-status",
    moduleId: "parking",
    name: "NYC 311 City Status",
    frequency: SourceFrequency.hourly,
    config: {
      apiUrl: "https://api.nyc.gov/calendar",
    },
  },

  // ============================================================================
  // TRANSIT MODULE
  // ============================================================================
  {
    slug: "mta-subway-alerts",
    moduleId: "transit",
    name: "MTA Subway Alerts",
    frequency: SourceFrequency.realtime,
    config: {
      gtfsRtUrl:
        "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts",
    },
  },
  {
    slug: "mta-weekend-service",
    moduleId: "transit",
    name: "Weekend Service Changes",
    frequency: SourceFrequency.daily,
    config: {
      scrapeUrl: "https://new.mta.info/planned-service-changes",
    },
  },

  // ============================================================================
  // EVENTS MODULE
  // ============================================================================
  {
    slug: "nyc-parks-events",
    moduleId: "events",
    name: "NYC Parks Events",
    frequency: SourceFrequency.daily,
    config: {
      apiUrl: "https://www.nycgovparks.org/events/",
    },
  },
  {
    slug: "street-fairs",
    moduleId: "events",
    name: "Street Fairs",
    frequency: SourceFrequency.daily,
    config: {
      scrapeUrl:
        "https://www.nyc.gov/site/cecm/permitting/street-activity-permit-office.page",
    },
  },

  // ============================================================================
  // HOUSING MODULE
  // ============================================================================
  {
    slug: "housing-connect-lotteries",
    moduleId: "housing",
    name: "Housing Connect Lotteries",
    frequency: SourceFrequency.daily,
    config: {
      scrapeUrl: "https://housingconnect.nyc.gov/PublicWeb/search-lotteries",
    },
  },

  // ============================================================================
  // SAMPLE SALES MODULE (food)
  // ============================================================================
  {
    slug: "260-sample-sale",
    moduleId: "food",
    name: "260 Sample Sale",
    frequency: SourceFrequency.hourly,
    config: {
      scrapeUrl: "https://260samplesale.com/",
    },
  },
  {
    slug: "chicmi-sample-sales",
    moduleId: "food",
    name: "Chicmi Sample Sales",
    frequency: SourceFrequency.hourly,
    config: {
      scrapeUrl: "https://www.chicmi.com/new-york/",
    },
  },

  // ============================================================================
  // DEALS MODULE
  // ============================================================================
  {
    slug: "credit-card-bonuses",
    moduleId: "deals",
    name: "Credit Card Bonuses",
    frequency: SourceFrequency.daily,
    config: {
      manual: true, // Curated manually - no automated scraping
    },
  },
] as const;

/**
 * Seeds all alert sources into the database using upsert semantics.
 * Safe to run multiple times - updates existing records, creates new ones.
 *
 * Note: Modules must be seeded first since AlertSource references Module via moduleId.
 */
export async function seedAlertSources() {
  for (const source of ALERT_SOURCES) {
    await prisma.alertSource.upsert({
      where: { slug: source.slug },
      update: {
        name: source.name,
        frequency: source.frequency,
        config: source.config,
      },
      create: {
        slug: source.slug,
        moduleId: source.moduleId,
        name: source.name,
        frequency: source.frequency,
        config: source.config,
      },
    });
  }
  console.log(`Seeded ${ALERT_SOURCES.length} alert sources`);
}
