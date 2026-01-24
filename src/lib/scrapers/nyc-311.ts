// src/lib/scrapers/nyc-311.ts
/**
 * NYC 311 Service Alerts Scraper
 *
 * Fetches high-impact service alerts from NYC Open Data 311 API.
 * Focuses on complaints that affect daily life: water outages,
 * street closures, power outages, gas leaks, no heat/hot water.
 *
 * API: https://data.cityofnewyork.us/resource/erm2-nwe9.json
 * Documentation: https://dev.socrata.com/foundry/data.cityofnewyork.us/erm2-nwe9
 */

import { z } from "zod";
import { prisma } from "../db";
import { sendScraperAlert } from "../scraper-alerts";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const Raw311Schema = z.object({
  unique_key: z.string(),
  complaint_type: z.string(),
  descriptor: z.string().optional().nullable(),
  incident_address: z.string().optional().nullable(),
  borough: z.string().optional().nullable(),
  incident_zip: z.string().optional().nullable(),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  status: z.string(),
  created_date: z.string(),
  resolution_description: z.string().optional().nullable(),
  closed_date: z.string().optional().nullable(),
});

export type Raw311Alert = z.infer<typeof Raw311Schema>;

export interface ServiceAlert {
  externalId: string;
  complaintType: string;
  descriptor: string | null;
  address: string | null;
  borough: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  severity: string;
  createdDate: Date;
  resolvedDate: Date | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";

// High-impact complaint types to track
const TRACKED_COMPLAINT_TYPES = [
  "Water System",
  "Water Quality",
  "Sewer",
  "Street Condition",
  "Street Light Condition",
  "Traffic Signal Condition",
  "Gas Leak",
  "HEAT/HOT WATER",
  "ELECTRIC",
  "Sidewalk Condition",
  "Blocked Driveway",
];

// Severity mapping based on complaint type
const SEVERITY_MAP: Record<string, string> = {
  "Gas Leak": "critical",
  "ELECTRIC": "high",
  "Water System": "high",
  "HEAT/HOT WATER": "high",
  "Traffic Signal Condition": "medium",
  "Street Light Condition": "medium",
  "Sewer": "medium",
  "Street Condition": "low",
  "Sidewalk Condition": "low",
  "Blocked Driveway": "low",
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Fetch recent 311 alerts from NYC Open Data
 */
export async function fetch311Alerts(): Promise<ServiceAlert[]> {
  console.log("[311] Fetching service alerts...");

  // Get alerts from last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString();

  // Build query with filters
  const complaintTypeFilter = TRACKED_COMPLAINT_TYPES.map(
    (t) => `complaint_type='${t}'`
  ).join(" OR ");

  const params = new URLSearchParams({
    $where: `created_date > '${sinceStr}' AND status != 'Closed' AND (${complaintTypeFilter})`,
    $limit: "200",
    $order: "created_date DESC",
  });

  // Add app token if available
  const appToken = process.env.NYC_OPEN_DATA_APP_TOKEN;
  if (appToken) {
    params.set("$$app_token", appToken);
  }

  const url = `${API_BASE}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`311 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("311 API returned non-array response");
    }

    console.log(`[311] Received ${data.length} raw alerts`);

    // Validate and transform
    const alerts: ServiceAlert[] = [];
    let validationErrors = 0;

    for (const raw of data) {
      const parsed = Raw311Schema.safeParse(raw);

      if (!parsed.success) {
        validationErrors++;
        continue;
      }

      const d = parsed.data;

      alerts.push({
        externalId: d.unique_key,
        complaintType: d.complaint_type,
        descriptor: d.descriptor || null,
        address: d.incident_address || null,
        borough: d.borough || null,
        zipCode: d.incident_zip || null,
        latitude: d.latitude ? parseFloat(d.latitude) : null,
        longitude: d.longitude ? parseFloat(d.longitude) : null,
        status: d.status,
        severity: SEVERITY_MAP[d.complaint_type] || "medium",
        createdDate: new Date(d.created_date),
        resolvedDate: d.closed_date ? new Date(d.closed_date) : null,
      });
    }

    if (validationErrors > 0) {
      console.warn(`[311] ${validationErrors} alerts failed validation`);
    }

    console.log(`[311] Processed ${alerts.length} valid alerts`);
    return alerts;
  } catch (error) {
    console.error("[311] Fetch error:", error);
    await sendScraperAlert("nyc-311", [{
      source: "nyc-311",
      payload: { url },
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    }]);
    throw error;
  }
}

/**
 * Sync 311 alerts to database (upsert)
 */
export async function sync311Alerts(): Promise<{
  created: number;
  updated: number;
  total: number;
}> {
  const alerts = await fetch311Alerts();

  let created = 0;
  let updated = 0;

  for (const alert of alerts) {
    const existing = await prisma.serviceAlert.findUnique({
      where: { externalId: alert.externalId },
    });

    if (existing) {
      // Update if status changed
      if (existing.status !== alert.status) {
        await prisma.serviceAlert.update({
          where: { externalId: alert.externalId },
          data: {
            status: alert.status,
            resolvedDate: alert.resolvedDate,
            fetchedAt: new Date(),
          },
        });
        updated++;
      }
    } else {
      // Create new
      await prisma.serviceAlert.create({
        data: {
          externalId: alert.externalId,
          complaintType: alert.complaintType,
          descriptor: alert.descriptor,
          address: alert.address,
          borough: alert.borough,
          zipCode: alert.zipCode,
          latitude: alert.latitude,
          longitude: alert.longitude,
          status: alert.status,
          severity: alert.severity,
          createdDate: alert.createdDate,
          resolvedDate: alert.resolvedDate,
        },
      });
      created++;
    }
  }

  console.log(`[311] Sync complete: ${created} created, ${updated} updated`);

  return { created, updated, total: alerts.length };
}

/**
 * Get active alerts for digest (optionally filtered by borough)
 */
export async function getActiveAlerts(borough?: string): Promise<ServiceAlert[]> {
  const where: Record<string, unknown> = {
    status: { not: "Closed" },
    createdDate: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // Last 48 hours
  };

  if (borough) {
    where.borough = borough;
  }

  const alerts = await prisma.serviceAlert.findMany({
    where,
    orderBy: [
      { severity: "desc" },
      { createdDate: "desc" },
    ],
    take: 10,
  });

  return alerts.map((a) => ({
    externalId: a.externalId,
    complaintType: a.complaintType,
    descriptor: a.descriptor,
    address: a.address,
    borough: a.borough,
    zipCode: a.zipCode,
    latitude: a.latitude,
    longitude: a.longitude,
    status: a.status,
    severity: a.severity,
    createdDate: a.createdDate,
    resolvedDate: a.resolvedDate,
  }));
}
