// __tests__/send-daily-digest.test.ts
/**
 * Tests for Daily Email Digest Job
 *
 * These tests verify the cron job endpoint that sends consolidated
 * email digests to free-tier users with pending notifications.
 */

import { NextRequest } from "next/server";

// Mock dependencies before importing route
jest.mock("../src/lib/db", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    notificationOutbox: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    referral: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    jobLock: {
      create: jest.fn().mockResolvedValue({ id: 'mock-lock' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    emailOutbox: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'mock-outbox' }),
      update: jest.fn().mockResolvedValue({}),
    },
    jobRun: {
      create: jest.fn().mockResolvedValue({ id: 'mock-job-run' }),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

jest.mock("../src/lib/resend", () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: "mock-email-id" }),
}));

// Mock the referral service to avoid Resend initialization issues
jest.mock("../src/lib/referral-service", () => ({
  generateReferralCode: jest.fn().mockReturnValue("NYC-MOCK1"),
  createReferral: jest.fn(),
  getReferralByCode: jest.fn(),
  convertReferral: jest.fn(),
  createReferralCoupon: jest.fn(),
}));

// Import after mocks are set up
import { GET, POST } from "../src/app/api/jobs/send-daily-digest/route";
import { prisma } from "../src/lib/db";
import { sendEmail } from "../src/lib/resend";

// Helper to create mock NextRequest
function createMockRequest(
  headers: Record<string, string> = {}
): NextRequest {
  const req = new NextRequest("http://localhost:3000/api/jobs/send-daily-digest", {
    headers: new Headers(headers),
  });
  return req;
}

// Mock data factories
function createMockUser(overrides: Partial<{
  id: string;
  email: string;
  tier: string;
  emailOptInAt: Date | null;
}> = {}) {
  return {
    id: overrides.id || `user-${Math.random().toString(36).slice(2, 8)}`,
    email: overrides.email || "test@example.com",
    tier: overrides.tier || "free",
    emailOptInAt: overrides.emailOptInAt ?? new Date(),
    phone: null,
    zipCode: "10001",
    stripeCustomerId: null,
    inferredNeighborhood: null,
    inferredSubwayLines: [],
    inferredHasParking: false,
    smsOptInStatus: "pending",
    smsOptInAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockNotification(overrides: Partial<{
  id: string;
  userId: string;
  eventId: string;
  status: string;
  scheduledFor: Date;
  event: any;
}> = {}) {
  return {
    id: overrides.id || `notif-${Math.random().toString(36).slice(2, 8)}`,
    userId: overrides.userId || "user-1",
    eventId: overrides.eventId || "event-1",
    channel: "email",
    status: overrides.status || "pending",
    scheduledFor: overrides.scheduledFor || new Date("2026-01-01T00:00:00Z"),
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    event: overrides.event || {
      id: "event-1",
      sourceId: "source-1",
      externalId: null,
      title: "Test Event",
      body: "Test body",
      startsAt: new Date(),
      endsAt: null,
      neighborhoods: [],
      metadata: {},
      createdAt: new Date(),
      expiresAt: null,
      source: {
        id: "source-1",
        moduleId: "parking",
        slug: "asp-calendar",
        name: "ASP Calendar",
        frequency: "daily",
        enabled: true,
        config: {},
        lastPolledAt: null,
        lastEventAt: null,
        module: {
          id: "parking",
          name: "Parking & Driving",
          description: "Parking alerts",
          icon: "P",
          sortOrder: 1,
        },
      },
    },
  };
}

describe("GET /api/jobs/send-daily-digest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "test_cron_secret";
    process.env.APP_BASE_URL = "https://nycping.com";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.APP_BASE_URL;
  });

  describe("Authentication", () => {
    it("should reject requests without cron secret", async () => {
      const request = createMockRequest({});

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should accept requests with valid x-cron-secret header", async () => {
      const request = createMockRequest({
        "x-cron-secret": "test_cron_secret",
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should accept requests with valid Authorization Bearer token", async () => {
      const request = createMockRequest({
        authorization: "Bearer test_cron_secret",
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should reject requests with invalid cron secret", async () => {
      const request = createMockRequest({
        "x-cron-secret": "wrong_secret",
      });

      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe("Processing Logic", () => {
    it("should skip users with no pending notifications", async () => {
      const request = createMockRequest({
        "x-cron-secret": "test_cron_secret",
      });

      const mockUser = createMockUser({ id: "user-1" });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.notificationOutbox.findMany as jest.Mock).mockResolvedValue([]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toBe(1);
      expect(data.skipped).toBe(1);
      expect(data.digests).toBe(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should send digest email to users with pending notifications", async () => {
      const request = createMockRequest({
        "x-cron-secret": "test_cron_secret",
      });

      const mockUser = createMockUser({
        id: "user-1",
        email: "user@example.com",
      });
      const mockNotification = createMockNotification({
        userId: "user-1",
        id: "notif-1",
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.notificationOutbox.findMany as jest.Mock).mockResolvedValue([
        mockNotification,
      ]);
      (prisma.notificationOutbox.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.digests).toBe(1);
      expect(data.skipped).toBe(0);

      // Verify email was sent
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: expect.stringContaining("Your NYC Alerts"),
          html: expect.stringContaining("Test Event"),
        })
      );

      // Verify notifications were marked as sent
      expect(prisma.notificationOutbox.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["notif-1"] },
        },
        data: {
          status: "sent",
          sentAt: expect.any(Date),
        },
      });
    });

    it("should process multiple users and aggregate results", async () => {
      const request = createMockRequest({
        "x-cron-secret": "test_cron_secret",
      });

      const users = [
        createMockUser({ id: "user-1", email: "user1@example.com" }),
        createMockUser({ id: "user-2", email: "user2@example.com" }),
        createMockUser({ id: "user-3", email: "user3@example.com" }),
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
      (prisma.notificationOutbox.findMany as jest.Mock)
        .mockResolvedValueOnce([createMockNotification({ userId: "user-1" })])
        .mockResolvedValueOnce([]) // user-2 has no notifications
        .mockResolvedValueOnce([createMockNotification({ userId: "user-3" })]);
      (prisma.notificationOutbox.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.users).toBe(3);
      expect(data.digests).toBe(2);
      expect(data.skipped).toBe(1);
      expect(sendEmail).toHaveBeenCalledTimes(2);
    });

    it("should group events by module in digest", async () => {
      const request = createMockRequest({
        "x-cron-secret": "test_cron_secret",
      });

      const mockUser = createMockUser({ id: "user-1" });
      const parkingNotification = createMockNotification({
        userId: "user-1",
        id: "notif-1",
        event: {
          ...createMockNotification().event,
          title: "Parking Event",
          source: {
            ...createMockNotification().event.source,
            moduleId: "parking",
            module: {
              id: "parking",
              name: "Parking",
              icon: "P",
              description: "",
              sortOrder: 1,
            },
          },
        },
      });
      const transitNotification = createMockNotification({
        userId: "user-1",
        id: "notif-2",
        event: {
          ...createMockNotification().event,
          title: "Transit Event",
          source: {
            ...createMockNotification().event.source,
            moduleId: "transit",
            module: {
              id: "transit",
              name: "Transit",
              icon: "T",
              description: "",
              sortOrder: 2,
            },
          },
        },
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.notificationOutbox.findMany as jest.Mock).mockResolvedValue([
        parkingNotification,
        transitNotification,
      ]);
      (prisma.notificationOutbox.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          // Verify both module sections are present (order may vary)
          html: expect.stringContaining("Parking"),
        })
      );
      // Additional check for Transit section
      const callArgs = (sendEmail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain("Transit");
    });

    it("should handle email send failures gracefully", async () => {
      const request = createMockRequest({
        "x-cron-secret": "test_cron_secret",
      });

      const mockUser = createMockUser({ id: "user-1" });
      const mockNotification = createMockNotification({ userId: "user-1" });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.notificationOutbox.findMany as jest.Mock).mockResolvedValue([
        mockNotification,
      ]);
      (sendEmail as jest.Mock).mockRejectedValue(new Error("SMTP error"));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.digests).toBe(0);
      expect(data.failed).toBe(1);
      // Should not mark as sent on failure
      expect(prisma.notificationOutbox.updateMany).not.toHaveBeenCalled();
    });

    it("should query for free tier users only", async () => {
      const request = createMockRequest({
        "x-cron-secret": "test_cron_secret",
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await GET(request);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          tier: "free",
        },
      });
    });

    it("should only fetch pending email notifications scheduled for now or earlier", async () => {
      const request = createMockRequest({
        "x-cron-secret": "test_cron_secret",
      });

      const mockUser = createMockUser({ id: "user-1" });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.notificationOutbox.findMany as jest.Mock).mockResolvedValue([]);

      await GET(request);

      expect(prisma.notificationOutbox.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          channel: "email",
          status: "pending",
          scheduledFor: { lte: expect.any(Date) },
        },
        include: {
          event: {
            include: {
              source: {
                include: { module: true },
              },
            },
          },
        },
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 500 on database error", async () => {
      const request = createMockRequest({
        "x-cron-secret": "test_cron_secret",
      });

      (prisma.user.findMany as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Job failed");
      expect(data.details).toBe("Database connection failed");
    });
  });
});

describe("POST /api/jobs/send-daily-digest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "test_cron_secret";
  });

  it("should work the same as GET (alias)", async () => {
    const request = createMockRequest({
      "x-cron-secret": "test_cron_secret",
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toBe(0);
  });
});
