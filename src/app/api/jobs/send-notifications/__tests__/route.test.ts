// src/app/api/jobs/send-notifications/__tests__/route.test.ts
/**
 * Test suite for the SMS Notification Delivery Job.
 *
 * This job implements the transactional outbox pattern for reliable SMS delivery.
 * The outbox pattern, popularized by microservices architectures circa 2015,
 * ensures exactly-once delivery semantics by:
 * 1. Writing notifications to an outbox table within the same transaction as the event
 * 2. A separate process (this job) reads pending notifications and sends them
 * 3. Status updates mark notifications as sent/failed/skipped
 *
 * Historical Context:
 * The transactional outbox pattern traces its roots to database-backed messaging
 * systems of the 1990s. It was formalized in Pat Helland's 2007 paper "Life Beyond
 * Distributed Transactions" and gained modern prominence through frameworks like
 * Debezium and AWS EventBridge.
 *
 * Design Decision Rationale:
 * - Batch processing (100 at a time) prevents memory exhaustion and allows
 *   graceful degradation under load
 * - Cron-secret verification prevents unauthorized invocation
 * - Per-notification error handling ensures partial failures don't halt the entire batch
 * - The "skipped" status handles edge cases like missing phone numbers gracefully
 */

import { NextRequest } from "next/server";
import { POST, formatSmsMessage } from "../route";

// Mock Prisma client
const mockFindMany = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: {
    notificationOutbox: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// Mock Twilio sendSms
const mockSendSms = jest.fn();
jest.mock("@/lib/twilio", () => ({
  sendSms: (...args: unknown[]) => mockSendSms(...args),
}));

// Mock delivery-config to bypass quiet hours check
jest.mock("@/lib/delivery-config", () => ({
  BATCHING_CONFIG: {
    NOTIFICATION_BATCH_SIZE: 100,
  },
  isQuietHours: jest.fn().mockReturnValue(false),
}));

// Mock frequency cap to allow all notifications
jest.mock("@/lib/frequency-cap", () => ({
  checkSmsFrequencyCap: jest.fn().mockResolvedValue({ allowed: true }),
}));

describe("SMS Notification Delivery Job", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "test_cron_secret";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  /**
   * Authorization Tests
   *
   * The cron secret verification follows the principle of defense in depth.
   * Even though Vercel crons run in a trusted environment, explicit verification
   * prevents accidental exposure if the endpoint URL is leaked or misconfigured.
   *
   * The x-cron-secret header pattern is a Vercel convention, though the plan
   * originally specified this header. We also support Bearer token format for
   * compatibility with existing jobs in this codebase.
   */
  describe("authorization", () => {
    it("returns 401 when x-cron-secret header is missing", async () => {
      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {},
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 401 when x-cron-secret header is incorrect", async () => {
      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          "x-cron-secret": "wrong_secret",
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("accepts valid x-cron-secret header", async () => {
      mockFindMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          "x-cron-secret": "test_cron_secret",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("also accepts Bearer token format for backwards compatibility", async () => {
      mockFindMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          authorization: "Bearer test_cron_secret",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  /**
   * Notification Processing Tests
   *
   * These tests verify the core business logic of the notification delivery job:
   * - Query pending notifications that are ready to send (scheduledFor <= now)
   * - Send SMS via Twilio
   * - Update notification status based on delivery outcome
   *
   * The batch limit of 100 notifications is a deliberate trade-off between:
   * - Processing efficiency (fewer database round-trips)
   * - Memory consumption (limiting in-flight notifications)
   * - Failure isolation (a crash loses at most 100 pending notifications)
   */
  describe("notification processing", () => {
    it("queries pending SMS notifications with scheduledFor <= now", async () => {
      mockFindMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          "x-cron-secret": "test_cron_secret",
        },
      });

      await POST(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            channel: "sms",
            status: "pending",
            scheduledFor: expect.objectContaining({
              lte: expect.any(Date),
            }),
          }),
          take: 100,
        })
      );
    });

    it("sends SMS for each notification with user phone number", async () => {
      const mockNotification = {
        id: "notif-1",
        user: { id: "user-1", phone: "+12125551234" },
        event: {
          title: "ASP Suspended Tomorrow",
          body: "No need to move your car!",
          source: {
            module: { icon: "🚗", name: "Parking" },
          },
        },
      };
      mockFindMany.mockResolvedValue([mockNotification]);
      mockSendSms.mockResolvedValue({ sid: "SM123", status: "sent" });
      mockUpdate.mockResolvedValue({});

      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          "x-cron-secret": "test_cron_secret",
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(mockSendSms).toHaveBeenCalledWith("+12125551234", expect.any(String));
      expect(json.sent).toBe(1);
      expect(json.failed).toBe(0);
    });

    it("updates notification status to sent on successful delivery", async () => {
      const mockNotification = {
        id: "notif-1",
        user: { id: "user-1", phone: "+12125551234" },
        event: {
          title: "Test Event",
          body: null,
          source: {
            module: { icon: "🚇", name: "Transit" },
          },
        },
      };
      mockFindMany.mockResolvedValue([mockNotification]);
      mockSendSms.mockResolvedValue({ sid: "SM123", status: "sent" });
      mockUpdate.mockResolvedValue({});

      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          "x-cron-secret": "test_cron_secret",
        },
      });

      await POST(request);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "notif-1" },
          data: expect.objectContaining({
            status: "sent",
            sentAt: expect.any(Date),
          }),
        })
      );
    });

    it("updates notification status to skipped when user has no phone number", async () => {
      const mockNotification = {
        id: "notif-2",
        user: { id: "user-2", phone: null },
        event: {
          title: "Test Event",
          body: null,
          source: {
            module: { icon: "🏠", name: "Housing" },
          },
        },
      };
      mockFindMany.mockResolvedValue([mockNotification]);

      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          "x-cron-secret": "test_cron_secret",
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(mockSendSms).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "notif-2" },
          data: { status: "skipped" },
        })
      );
      expect(json.skipped).toBe(1);
    });

    it("updates notification status to failed when SMS delivery fails", async () => {
      const mockNotification = {
        id: "notif-3",
        user: { id: "user-3", phone: "+12125559999" },
        event: {
          title: "Test Event",
          body: "Event body",
          source: {
            module: { icon: "📅", name: "Events" },
          },
        },
      };
      mockFindMany.mockResolvedValue([mockNotification]);
      mockSendSms.mockRejectedValue(new Error("Twilio rate limit exceeded"));
      mockUpdate.mockResolvedValue({});

      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          "x-cron-secret": "test_cron_secret",
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "notif-3" },
          data: { status: "failed" },
        })
      );
      expect(json.sent).toBe(0);
      expect(json.failed).toBe(1);
    });

    it("processes multiple notifications and tracks counts correctly", async () => {
      const mockNotifications = [
        {
          id: "notif-success-1",
          user: { id: "user-1", phone: "+12125551111" },
          event: {
            title: "Event 1",
            body: null,
            source: { module: { icon: "🚗", name: "Parking" } },
          },
        },
        {
          id: "notif-success-2",
          user: { id: "user-2", phone: "+12125552222" },
          event: {
            title: "Event 2",
            body: "Body text",
            source: { module: { icon: "🚇", name: "Transit" } },
          },
        },
        {
          id: "notif-skip",
          user: { id: "user-3", phone: null },
          event: {
            title: "Event 3",
            body: null,
            source: { module: { icon: "🏠", name: "Housing" } },
          },
        },
        {
          id: "notif-fail",
          user: { id: "user-4", phone: "+12125554444" },
          event: {
            title: "Event 4",
            body: null,
            source: { module: { icon: "💰", name: "Deals" } },
          },
        },
      ];

      mockFindMany.mockResolvedValue(mockNotifications);
      mockSendSms
        .mockResolvedValueOnce({ sid: "SM1", status: "sent" })
        .mockResolvedValueOnce({ sid: "SM2", status: "sent" })
        .mockRejectedValueOnce(new Error("Failed"));
      mockUpdate.mockResolvedValue({});

      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          "x-cron-secret": "test_cron_secret",
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.processed).toBe(4);
      expect(json.sent).toBe(2);
      expect(json.skipped).toBe(1);
      expect(json.failed).toBe(1);
    });
  });

  /**
   * SMS Message Formatting Tests
   *
   * The message format follows best practices for SMS notifications:
   * - Lead with icon for visual recognition and brand consistency
   * - Title first for immediate context
   * - Optional body for additional detail
   * - STOP instruction for TCPA compliance
   *
   * Historical Context:
   * The Telephone Consumer Protection Act (TCPA) of 1991 and its 2012 amendments
   * require explicit opt-out instructions in commercial SMS. The "Reply STOP"
   * verbiage is a carrier-recognized standard that triggers automated unsubscribe
   * handling by major carriers.
   */
  describe("formatSmsMessage", () => {
    it("formats SMS with icon and title", () => {
      const event = {
        title: "ASP Suspended Tomorrow",
        body: null,
        source: { module: { icon: "🚗", name: "Parking" } },
      };

      const message = formatSmsMessage(event);

      expect(message).toContain("🚗 ASP Suspended Tomorrow");
      expect(message).toContain("Reply STOP to unsubscribe");
    });

    it("includes body when present", () => {
      const event = {
        title: "ASP Suspended Tomorrow",
        body: "Christmas Day - no street cleaning",
        source: { module: { icon: "🚗", name: "Parking" } },
      };

      const message = formatSmsMessage(event);

      expect(message).toContain("🚗 ASP Suspended Tomorrow");
      expect(message).toContain("Christmas Day - no street cleaning");
      expect(message).toContain("Reply STOP to unsubscribe");
    });

    it("handles empty body string", () => {
      const event = {
        title: "G Train Delays",
        body: "",
        source: { module: { icon: "🚇", name: "Transit" } },
      };

      const message = formatSmsMessage(event);

      expect(message).toContain("🚇 G Train Delays");
      expect(message).toContain("Reply STOP to unsubscribe");
      // Should not have extra blank lines from empty body
      expect(message).not.toMatch(/\n\n\n/);
    });

    it("formats message with proper line breaks", () => {
      const event = {
        title: "Event Title",
        body: "Event body text",
        source: { module: { icon: "📅", name: "Events" } },
      };

      const message = formatSmsMessage(event);
      const lines = message.split("\n");

      expect(lines[0]).toBe("📅 Event Title");
      expect(lines[1]).toBe("Event body text");
      // Blank line before STOP instruction
      expect(lines[lines.length - 1]).toBe("Reply STOP to unsubscribe");
    });
  });

  /**
   * Error Handling Tests
   *
   * Robust error handling is critical for batch processing jobs:
   * - Individual notification failures should not abort the entire batch
   * - Database errors should be caught and reported
   * - The job should return meaningful error information
   */
  describe("error handling", () => {
    it("continues processing after individual notification failure", async () => {
      const mockNotifications = [
        {
          id: "notif-1",
          user: { id: "user-1", phone: "+12125551111" },
          event: {
            title: "Event 1",
            body: null,
            source: { module: { icon: "🚗", name: "Parking" } },
          },
        },
        {
          id: "notif-2",
          user: { id: "user-2", phone: "+12125552222" },
          event: {
            title: "Event 2",
            body: null,
            source: { module: { icon: "🚇", name: "Transit" } },
          },
        },
      ];

      mockFindMany.mockResolvedValue(mockNotifications);
      mockSendSms
        .mockRejectedValueOnce(new Error("First failed"))
        .mockResolvedValueOnce({ sid: "SM2", status: "sent" });
      mockUpdate.mockResolvedValue({});

      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          "x-cron-secret": "test_cron_secret",
        },
      });

      const response = await POST(request);
      const json = await response.json();

      // Should have attempted both
      expect(mockSendSms).toHaveBeenCalledTimes(2);
      expect(json.sent).toBe(1);
      expect(json.failed).toBe(1);
    });

    it("returns 500 when database query fails", async () => {
      mockFindMany.mockRejectedValue(new Error("Database connection lost"));

      const request = new NextRequest("http://localhost/api/jobs/send-notifications", {
        method: "POST",
        headers: {
          "x-cron-secret": "test_cron_secret",
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe("Job failed");
      expect(json.details).toContain("Database connection lost");
    });
  });
});
