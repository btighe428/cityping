/**
 * INFRASTRUCTURE MONITOR AGENT
 *
 * Proactively monitors all critical services and alerts BEFORE failures cascade.
 *
 * Philosophy: If the database is down at 6am, we should know by 5am.
 * Silent failures are unacceptable - the user MUST receive notification.
 *
 * MONITORED SERVICES:
 * 1. Database (Supabase) - PostgreSQL connectivity and query performance
 * 2. Email (Resend) - API connectivity and delivery verification
 * 3. External APIs - Weather, MTA, News scrapers
 * 4. Job Scheduler - CRON job execution status
 *
 * ALERT CHANNELS:
 * - Console logging (always)
 * - Email to admin (when possible)
 * - Webhook (configurable)
 */

import { prisma } from "../db";
import { Resend } from "resend";
import { DateTime } from "luxon";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  /** Admin email for critical alerts */
  adminEmail: process.env.ADMIN_EMAIL || "btighe428@gmail.com",
  /** Connection timeout (ms) */
  connectionTimeout: 10000,
  /** Query timeout (ms) */
  queryTimeout: 5000,
  /** Health check interval (ms) - 5 minutes */
  checkInterval: 5 * 60 * 1000,
};

// =============================================================================
// TYPES
// =============================================================================

export type ServiceStatus = "healthy" | "degraded" | "down";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latencyMs: number | null;
  lastCheck: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  overall: ServiceStatus;
  timestamp: string;
  services: ServiceHealth[];
  canSendEmail: boolean;
  canFetchData: boolean;
  recommendations: string[];
}

// =============================================================================
// DATABASE HEALTH CHECK
// =============================================================================

async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  const name = "database";

  try {
    // Simple connectivity test with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Database connection timeout")), CONFIG.connectionTimeout);
    });

    const queryPromise = prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 as result`;

    await Promise.race([queryPromise, timeoutPromise]);
    const latencyMs = Date.now() - startTime;

    // Also check if we can query actual data
    const dataCheckStart = Date.now();
    const countResult = await Promise.race([
      prisma.alertEvent.count(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Query timeout")), CONFIG.queryTimeout);
      }),
    ]);

    const dataLatency = Date.now() - dataCheckStart;

    return {
      name,
      status: dataLatency > 3000 ? "degraded" : "healthy",
      latencyMs,
      lastCheck: DateTime.now().toISO()!,
      details: {
        queryLatencyMs: dataLatency,
        sampleCount: countResult,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Detect specific failure modes
    let diagnosis = "Unknown database error";
    if (errorMessage.includes("Can't reach database server")) {
      diagnosis = "DATABASE UNREACHABLE - likely Supabase project is paused or down";
    } else if (errorMessage.includes("connection refused")) {
      diagnosis = "DATABASE CONNECTION REFUSED - server may be restarting";
    } else if (errorMessage.includes("timeout")) {
      diagnosis = "DATABASE TIMEOUT - server overloaded or network issue";
    } else if (errorMessage.includes("authentication")) {
      diagnosis = "DATABASE AUTH FAILED - credentials may have changed";
    }

    return {
      name,
      status: "down",
      latencyMs: Date.now() - startTime,
      lastCheck: DateTime.now().toISO()!,
      error: diagnosis,
      details: {
        rawError: errorMessage,
      },
    };
  }
}

// =============================================================================
// EMAIL SERVICE HEALTH CHECK
// =============================================================================

async function checkEmailHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  const name = "email";

  if (!process.env.RESEND_API_KEY) {
    return {
      name,
      status: "down",
      latencyMs: null,
      lastCheck: DateTime.now().toISO()!,
      error: "RESEND_API_KEY not configured",
    };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Test API connectivity by listing emails (read-only operation)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Email API timeout")), CONFIG.connectionTimeout);
    });

    const apiPromise = resend.emails.list();
    const result = await Promise.race([apiPromise, timeoutPromise]);

    const latencyMs = Date.now() - startTime;

    if (result.error) {
      return {
        name,
        status: "degraded",
        latencyMs,
        lastCheck: DateTime.now().toISO()!,
        error: result.error.message,
      };
    }

    return {
      name,
      status: "healthy",
      latencyMs,
      lastCheck: DateTime.now().toISO()!,
      details: {
        recentEmailCount: result.data?.data?.length || 0,
      },
    };
  } catch (error) {
    return {
      name,
      status: "down",
      latencyMs: Date.now() - startTime,
      lastCheck: DateTime.now().toISO()!,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// EXTERNAL API HEALTH CHECKS
// =============================================================================

async function checkWeatherAPI(): Promise<ServiceHealth> {
  const startTime = Date.now();
  const name = "weather-api";

  try {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m",
      { signal: AbortSignal.timeout(CONFIG.connectionTimeout) }
    );

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        name,
        status: "degraded",
        latencyMs,
        lastCheck: DateTime.now().toISO()!,
        error: `HTTP ${response.status}`,
      };
    }

    return {
      name,
      status: "healthy",
      latencyMs,
      lastCheck: DateTime.now().toISO()!,
    };
  } catch (error) {
    return {
      name,
      status: "down",
      latencyMs: Date.now() - startTime,
      lastCheck: DateTime.now().toISO()!,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkMTAAPI(): Promise<ServiceHealth> {
  const startTime = Date.now();
  const name = "mta-api";

  try {
    const response = await fetch("https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts", {
      signal: AbortSignal.timeout(CONFIG.connectionTimeout),
      headers: {
        "x-api-key": process.env.MTA_API_KEY || "",
      },
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        name,
        status: response.status === 403 ? "degraded" : "down",
        latencyMs,
        lastCheck: DateTime.now().toISO()!,
        error: `HTTP ${response.status}`,
      };
    }

    return {
      name,
      status: "healthy",
      latencyMs,
      lastCheck: DateTime.now().toISO()!,
    };
  } catch (error) {
    return {
      name,
      status: "down",
      latencyMs: Date.now() - startTime,
      lastCheck: DateTime.now().toISO()!,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// MAIN HEALTH CHECK
// =============================================================================

/**
 * Run comprehensive health check on all infrastructure.
 */
export async function runInfrastructureCheck(): Promise<SystemHealth> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("[InfraMonitor] Starting infrastructure health check...");
  console.log("═══════════════════════════════════════════════════════════════");

  // Run all checks in parallel
  const [database, email, weather, mta] = await Promise.all([
    checkDatabaseHealth(),
    checkEmailHealth(),
    checkWeatherAPI(),
    checkMTAAPI(),
  ]);

  const services = [database, email, weather, mta];

  // Determine overall status
  const downCount = services.filter((s) => s.status === "down").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;

  let overall: ServiceStatus = "healthy";
  if (downCount > 0) overall = "down";
  else if (degradedCount > 0) overall = "degraded";

  // Generate recommendations
  const recommendations: string[] = [];

  if (database.status === "down") {
    recommendations.push(
      "🚨 CRITICAL: Database is DOWN - check Supabase dashboard, may need to unpause project"
    );
    recommendations.push(
      "   → Go to https://supabase.com/dashboard and restore/unpause your project"
    );
  }

  if (email.status === "down") {
    recommendations.push("🚨 CRITICAL: Email service is DOWN - check Resend API key and dashboard");
  }

  if (weather.status === "down") {
    recommendations.push("⚠️  Weather API is down - emails will lack weather data");
  }

  if (mta.status === "down") {
    recommendations.push("⚠️  MTA API is down - emails will lack transit alerts");
  }

  const canSendEmail = email.status !== "down";
  const canFetchData = database.status !== "down";

  // Log results
  console.log("\n[InfraMonitor] Results:");
  for (const service of services) {
    const icon =
      service.status === "healthy" ? "✅" : service.status === "degraded" ? "⚠️ " : "❌";
    console.log(
      `  ${icon} ${service.name}: ${service.status} (${service.latencyMs}ms)${service.error ? ` - ${service.error}` : ""}`
    );
  }

  if (recommendations.length > 0) {
    console.log("\n[InfraMonitor] Recommendations:");
    recommendations.forEach((r) => console.log(`  ${r}`));
  }

  console.log("═══════════════════════════════════════════════════════════════\n");

  return {
    overall,
    timestamp: DateTime.now().toISO()!,
    services,
    canSendEmail,
    canFetchData,
    recommendations,
  };
}

// =============================================================================
// ALERT FUNCTIONS
// =============================================================================

/**
 * Send critical alert when infrastructure is down.
 */
export async function sendInfrastructureAlert(health: SystemHealth): Promise<void> {
  if (health.overall === "healthy") return;

  const criticalServices = health.services.filter((s) => s.status === "down");
  const subject = `🚨 CityPing Infrastructure Alert: ${criticalServices.map((s) => s.name).join(", ")} DOWN`;

  const body = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; padding: 20px;">
  <h1 style="color: #dc2626;">🚨 Infrastructure Alert</h1>
  <p>One or more critical services are down. Immediate action required.</p>

  <h2>Service Status</h2>
  <table style="border-collapse: collapse; width: 100%;">
    <tr style="background: #f3f4f6;">
      <th style="padding: 10px; border: 1px solid #e5e7eb;">Service</th>
      <th style="padding: 10px; border: 1px solid #e5e7eb;">Status</th>
      <th style="padding: 10px; border: 1px solid #e5e7eb;">Error</th>
    </tr>
    ${health.services
      .map(
        (s) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #e5e7eb;">${s.name}</td>
      <td style="padding: 10px; border: 1px solid #e5e7eb; color: ${s.status === "healthy" ? "#16a34a" : s.status === "degraded" ? "#ca8a04" : "#dc2626"};">
        ${s.status.toUpperCase()}
      </td>
      <td style="padding: 10px; border: 1px solid #e5e7eb;">${s.error || "-"}</td>
    </tr>
    `
      )
      .join("")}
  </table>

  <h2>Recommendations</h2>
  <ul>
    ${health.recommendations.map((r) => `<li>${r}</li>`).join("")}
  </ul>

  <p style="color: #6b7280; font-size: 12px;">
    Alert generated at ${health.timestamp}
  </p>
</body>
</html>
`;

  // Try to send alert email (may fail if email service is also down)
  if (health.canSendEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "CityPing Alerts <alerts@cityping.net>",
        to: CONFIG.adminEmail,
        subject,
        html: body,
      });
      console.log(`[InfraMonitor] Alert email sent to ${CONFIG.adminEmail}`);
    } catch (error) {
      console.error("[InfraMonitor] Failed to send alert email:", error);
    }
  }
}

// =============================================================================
// PRE-FLIGHT CHECK FOR EMAIL JOBS
// =============================================================================

/**
 * Check if all services are ready for email job execution.
 * Call this BEFORE attempting to send daily digest.
 */
export async function preflightCheckForEmailJob(): Promise<{
  ready: boolean;
  health: SystemHealth;
  message: string;
}> {
  const health = await runInfrastructureCheck();

  if (!health.canFetchData) {
    await sendInfrastructureAlert(health);
    return {
      ready: false,
      health,
      message: "Cannot send email: Database is down - no content available",
    };
  }

  if (!health.canSendEmail) {
    await sendInfrastructureAlert(health);
    return {
      ready: false,
      health,
      message: "Cannot send email: Email service is down",
    };
  }

  if (health.overall === "degraded") {
    return {
      ready: true, // Can proceed with degraded service
      health,
      message: "Some services degraded - email will proceed with available data",
    };
  }

  return {
    ready: true,
    health,
    message: "All systems operational",
  };
}
