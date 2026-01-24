/**
 * NOTIFY NYC EMERGENCY ALERTS SCRAPER
 *
 * Source: NYC Emergency Management notifications
 * Data: Emergency alerts, weather warnings, amber alerts, etc.
 *
 * Critical for: Breaking news, safety alerts
 */

import { prisma } from "../db";
import { DateTime } from "luxon";

export interface NotifyNYCAlert {
  id: string;
  title: string;
  message: string;
  category: "emergency" | "weather" | "traffic" | "event" | "info";
  severity: "extreme" | "severe" | "moderate" | "minor";
  publishedAt: Date;
  expiresAt?: Date;
  affectedBoroughs: string[];
  url?: string;
}

const NOTIFY_NYC_FEED = "https://a]858-nycnotify.nyc.gov/notifynyc/api/en/alerts.json";

// Fallback: RSS feed
const RSS_FEED = "https://a]858-nycnotify.nyc.gov/notifynyc/rss.aspx";

/**
 * Fetch alerts from Notify NYC API.
 */
export async function fetchNotifyNYCAlerts(): Promise<NotifyNYCAlert[]> {
  console.log("[NotifyNYC] Fetching emergency alerts...");

  try {
    // Try JSON API first
    const response = await fetch(NOTIFY_NYC_FEED, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "CityPing/1.0 (NYC Alert Aggregator)",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return parseJSONAlerts(data);
    }

    // Fallback to RSS
    console.log("[NotifyNYC] JSON API failed, trying RSS...");
    return await fetchRSSAlerts();

  } catch (error) {
    console.error("[NotifyNYC] Fetch failed:", error);
    return [];
  }
}

function parseJSONAlerts(data: unknown): NotifyNYCAlert[] {
  if (!Array.isArray(data)) return [];

  return data.map((item: Record<string, unknown>) => ({
    id: `notifynyc-${item.id || Date.now()}`,
    title: String(item.title || "Emergency Alert"),
    message: String(item.message || item.description || ""),
    category: mapCategory(String(item.category || "info")),
    severity: mapSeverity(String(item.severity || "moderate")),
    publishedAt: new Date(String(item.publishedAt || item.date || Date.now())),
    expiresAt: item.expiresAt ? new Date(String(item.expiresAt)) : undefined,
    affectedBoroughs: parseAffectedBoroughs(String(item.affected || "")),
    url: item.url ? String(item.url) : undefined,
  }));
}

async function fetchRSSAlerts(): Promise<NotifyNYCAlert[]> {
  // Would parse RSS feed here
  // For now, return empty - RSS parsing needs xml2js
  return [];
}

function mapCategory(cat: string): NotifyNYCAlert["category"] {
  const lower = cat.toLowerCase();
  if (lower.includes("emergency") || lower.includes("amber")) return "emergency";
  if (lower.includes("weather") || lower.includes("storm")) return "weather";
  if (lower.includes("traffic") || lower.includes("road")) return "traffic";
  if (lower.includes("event")) return "event";
  return "info";
}

function mapSeverity(sev: string): NotifyNYCAlert["severity"] {
  const lower = sev.toLowerCase();
  if (lower.includes("extreme")) return "extreme";
  if (lower.includes("severe")) return "severe";
  if (lower.includes("minor")) return "minor";
  return "moderate";
}

function parseAffectedBoroughs(text: string): string[] {
  const boroughs: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("manhattan")) boroughs.push("Manhattan");
  if (lower.includes("brooklyn")) boroughs.push("Brooklyn");
  if (lower.includes("queens")) boroughs.push("Queens");
  if (lower.includes("bronx")) boroughs.push("Bronx");
  if (lower.includes("staten island")) boroughs.push("Staten Island");
  return boroughs.length > 0 ? boroughs : ["Citywide"];
}

/**
 * Ingest Notify NYC alerts into database.
 */
export async function ingestNotifyNYCAlerts(): Promise<{
  created: number;
  skipped: number;
}> {
  const alerts = await fetchNotifyNYCAlerts();
  let created = 0;
  let skipped = 0;

  for (const alert of alerts) {
    try {
      // Get or create source - use upsert with slug as unique key
      const source = await prisma.alertSource.upsert({
        where: { slug: "notifynyc" },
        create: {
          slug: "notifynyc",
          name: "Notify NYC",
          moduleId: "transit", // Using transit module for alerts
          frequency: "hourly",
        },
        update: {},
      });

      // Check for existing
      const existing = await prisma.alertEvent.findFirst({
        where: {
          externalId: alert.id,
          sourceId: source.id,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create alert
      await prisma.alertEvent.create({
        data: {
          externalId: alert.id,
          sourceId: source.id,
          title: alert.title,
          body: alert.message,
          startsAt: alert.publishedAt,
          endsAt: alert.expiresAt,
          expiresAt: alert.expiresAt,
          metadata: {
            category: alert.category,
            severity: alert.severity,
            affectedBoroughs: alert.affectedBoroughs,
            url: alert.url,
          },
        },
      });

      created++;
    } catch (error) {
      console.error(`[NotifyNYC] Failed to create alert ${alert.id}:`, error);
    }
  }

  console.log(`[NotifyNYC] Created: ${created}, Skipped: ${skipped}`);
  return { created, skipped };
}
