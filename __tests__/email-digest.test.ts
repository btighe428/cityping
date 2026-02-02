// __tests__/email-digest.test.ts
/**
 * Tests for Email Digest Template Helpers
 *
 * These tests verify the email digest template generation functions
 * that consolidate notifications into daily email digests for free-tier users.
 */

// Mock referral-service before importing email-digest (which depends on it)
jest.mock("../src/lib/referral-service", () => ({
  generateReferralCode: jest.fn().mockReturnValue("NYC-MOCK1"),
  createReferral: jest.fn(),
  getReferralByCode: jest.fn(),
  convertReferral: jest.fn(),
  createReferralCoupon: jest.fn(),
}));

import {
  buildDigestHtml,
  buildDigestSubject,
  countTotalEvents,
  GroupedEvents,
  EventWithModule,
} from "../src/lib/email-digest";

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    APP_BASE_URL: "https://nycping.com",
  };
});

afterEach(() => {
  process.env = originalEnv;
});

/**
 * Factory function to create mock events with full module chain
 */
function createMockEvent(
  overrides: Partial<EventWithModule> & {
    moduleId?: string;
    moduleName?: string;
    moduleIcon?: string;
  } = {}
): EventWithModule {
  const moduleId = overrides.moduleId || "parking";
  const moduleName = overrides.moduleName || "Parking & Driving";
  const moduleIcon = overrides.moduleIcon || "P";

  return {
    id: `event-${Math.random().toString(36).slice(2, 8)}`,
    sourceId: `source-${moduleId}`,
    externalId: null,
    title: overrides.title || "Test Event Title",
    body: overrides.body ?? "Test event body description",
    startsAt: overrides.startsAt || new Date("2026-01-02T09:00:00Z"),
    endsAt: overrides.endsAt || new Date("2026-01-02T17:00:00Z"),
    neighborhoods: overrides.neighborhoods || [],
    metadata: overrides.metadata || {},
    createdAt: new Date(),
    expiresAt: null,
    source: {
      id: `source-${moduleId}`,
      moduleId: moduleId,
      slug: `${moduleId}-source`,
      name: "Test Source",
      frequency: "daily",
      enabled: true,
      config: {},
      lastPolledAt: null,
      lastEventAt: null,
      module: {
        id: moduleId,
        name: moduleName,
        description: "Test module description",
        icon: moduleIcon,
        sortOrder: 1,
      },
    },
  } as EventWithModule;
}

describe("buildDigestHtml", () => {
  it("should generate valid HTML with sections for each module", () => {
    const events: GroupedEvents = {
      parking: [createMockEvent({ title: "ASP Suspended Tomorrow" })],
      transit: [
        createMockEvent({
          title: "Subway Delays on 1 Train",
          moduleId: "transit",
          moduleName: "Transit",
          moduleIcon: "T",
        }),
      ],
    };

    const html = buildDigestHtml(events);

    // Should contain DOCTYPE and basic HTML structure
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html>");
    expect(html).toContain("</html>");
    expect(html).toContain("NYC TODAY");

    // Should contain event titles
    expect(html).toContain("ASP Suspended Tomorrow");
    expect(html).toContain("Subway Delays on 1 Train");
  });

  it("should include upgrade CTA for premium conversion", () => {
    const events: GroupedEvents = {
      parking: [createMockEvent({ title: "Test Event" })],
    };

    const html = buildDigestHtml(events);

    expect(html).toContain("https://nycping.com/dashboard?upgrade=true");
    expect(html).toContain("Premium users got these alerts yesterday");
    expect(html).toContain("$7/mo");
  });

  it("should include unsubscribe and preferences links", () => {
    const events: GroupedEvents = {
      parking: [createMockEvent({ title: "Test Event" })],
    };

    const html = buildDigestHtml(events);

    expect(html).toContain("https://nycping.com/preferences");
    expect(html).toContain("https://nycping.com/unsubscribe");
    expect(html).toContain("Manage preferences");
    expect(html).toContain("Unsubscribe");
  });

  it("should escape HTML in event titles and bodies to prevent XSS", () => {
    const events: GroupedEvents = {
      parking: [
        createMockEvent({
          title: "<script>alert('xss')</script>",
          body: "Test <b>bold</b> text & special chars",
        }),
      ],
    };

    const html = buildDigestHtml(events);

    // Should escape dangerous characters
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).toContain("&amp;");
  });

  it("should handle events without body text", () => {
    const events: GroupedEvents = {
      parking: [createMockEvent({ title: "Title Only Event", body: null })],
    };

    const html = buildDigestHtml(events);

    expect(html).toContain("Title Only Event");
    // Should not have an empty span for missing body
    expect(html).not.toMatch(/<span[^>]*style="color: #666;"[^>]*>\s*<\/span>/);
  });

  it("should handle empty events object", () => {
    const events: GroupedEvents = {};

    const html = buildDigestHtml(events);

    // Should still generate valid HTML structure
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("NYC TODAY");
  });

  it("should handle multiple events per module", () => {
    const events: GroupedEvents = {
      parking: [
        createMockEvent({ title: "Event 1" }),
        createMockEvent({ title: "Event 2" }),
        createMockEvent({ title: "Event 3" }),
      ],
    };

    const html = buildDigestHtml(events);

    expect(html).toContain("Event 1");
    expect(html).toContain("Event 2");
    expect(html).toContain("Event 3");
  });

  it("should use localhost fallback when APP_BASE_URL not set", () => {
    delete process.env.APP_BASE_URL;

    const events: GroupedEvents = {
      parking: [createMockEvent({ title: "Test Event" })],
    };

    const html = buildDigestHtml(events);

    expect(html).toContain("http://localhost:3000/dashboard?upgrade=true");
    expect(html).toContain("http://localhost:3000/preferences");
    expect(html).toContain("http://localhost:3000/unsubscribe");
  });

  // =========================================================================
  // Feedback Links Tests (Task 3.4)
  // =========================================================================

  describe("feedback links", () => {
    it("should include feedback links when userId and feedbackTokens are provided", () => {
      const event = createMockEvent({ title: "Test Event" });
      const events: GroupedEvents = {
        parking: [event],
      };

      // Create a feedbackTokens map with the event's id
      const feedbackTokens: Record<string, string> = {
        [event.id]: "test-token-abc123",
      };

      const html = buildDigestHtml(events, undefined, "user-123", feedbackTokens);

      // Should contain thumbs up link with token and rating
      expect(html).toContain(
        `https://nycping.com/api/feedback?token=test-token-abc123&amp;rating=up`
      );

      // Should contain thumbs down link with token and rating
      expect(html).toContain(
        `https://nycping.com/api/feedback?token=test-token-abc123&amp;rating=down`
      );
    });

    it("should not include feedback links when userId is not provided", () => {
      const events: GroupedEvents = {
        parking: [createMockEvent({ title: "Test Event" })],
      };

      const html = buildDigestHtml(events);

      // Should not contain feedback API links
      expect(html).not.toContain("/api/feedback?token=");
    });

    it("should not include feedback links when feedbackTokens is not provided", () => {
      const events: GroupedEvents = {
        parking: [createMockEvent({ title: "Test Event" })],
      };

      const html = buildDigestHtml(events, undefined, "user-123");

      // Should not contain feedback API links without tokens
      expect(html).not.toContain("/api/feedback?token=");
    });

    it("should include feedback links for each event", () => {
      const event1 = createMockEvent({ title: "Event 1" });
      const event2 = createMockEvent({ title: "Event 2" });
      const events: GroupedEvents = {
        parking: [event1, event2],
      };

      const feedbackTokens: Record<string, string> = {
        [event1.id]: "token-for-event-1",
        [event2.id]: "token-for-event-2",
      };

      const html = buildDigestHtml(events, undefined, "user-123", feedbackTokens);

      // Should contain feedback links for both events
      expect(html).toContain("token=token-for-event-1");
      expect(html).toContain("token=token-for-event-2");
    });

    it("should skip feedback links for events without tokens", () => {
      const eventWithToken = createMockEvent({ title: "Event With Token" });
      const eventWithoutToken = createMockEvent({ title: "Event Without Token" });
      const events: GroupedEvents = {
        parking: [eventWithToken, eventWithoutToken],
      };

      const feedbackTokens: Record<string, string> = {
        [eventWithToken.id]: "has-token-xyz",
        // Note: no token for eventWithoutToken
      };

      const html = buildDigestHtml(events, undefined, "user-123", feedbackTokens);

      // Should have the token for the first event
      expect(html).toContain("token=has-token-xyz");

      // Both events should still be rendered
      expect(html).toContain("Event With Token");
      expect(html).toContain("Event Without Token");
    });

    it("should use correct URL format for feedback links", () => {
      const event = createMockEvent({ title: "Test" });
      const events: GroupedEvents = {
        parking: [event],
      };

      const feedbackTokens: Record<string, string> = {
        [event.id]: "secure-token-123",
      };

      const html = buildDigestHtml(events, undefined, "user-123", feedbackTokens);

      // Verify exact URL structure (with HTML-escaped ampersand)
      expect(html).toMatch(
        /api\/feedback\?token=secure-token-123&amp;rating=up/
      );
      expect(html).toMatch(
        /api\/feedback\?token=secure-token-123&amp;rating=down/
      );
    });
  });
});

describe("buildDigestSubject", () => {
  // Mock the Date for consistent test results
  const RealDate = Date;

  beforeEach(() => {
    // Mock Date to return Jan 1, 2026
    const mockDate = new Date("2026-01-01T12:00:00Z");
    jest.spyOn(global, "Date").mockImplementation((arg) => {
      if (arg === undefined) {
        return mockDate;
      }
      return new RealDate(arg as string | number | Date);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should generate subject with date and event count", () => {
    const subject = buildDigestSubject(5);

    expect(subject).toBe("🗽 NYC Today: Thu, Jan 1 — 5 things worth knowing");
  });

  it("should handle single event count", () => {
    const subject = buildDigestSubject(1);

    expect(subject).toBe("🗽 NYC Today: Thu, Jan 1 — 1 things worth knowing");
  });

  it("should handle zero events", () => {
    const subject = buildDigestSubject(0);

    expect(subject).toBe("🗽 NYC Today: Thu, Jan 1 — 0 things worth knowing");
  });

  it("should handle large event counts", () => {
    const subject = buildDigestSubject(100);

    expect(subject).toBe("🗽 NYC Today: Thu, Jan 1 — 100 things worth knowing");
  });
});

describe("countTotalEvents", () => {
  it("should count events across all modules", () => {
    const events: GroupedEvents = {
      parking: [createMockEvent(), createMockEvent()],
      transit: [createMockEvent()],
      events: [createMockEvent(), createMockEvent(), createMockEvent()],
    };

    const count = countTotalEvents(events);

    expect(count).toBe(6);
  });

  it("should return 0 for empty events object", () => {
    const events: GroupedEvents = {};

    const count = countTotalEvents(events);

    expect(count).toBe(0);
  });

  it("should handle single module with events", () => {
    const events: GroupedEvents = {
      parking: [createMockEvent(), createMockEvent()],
    };

    const count = countTotalEvents(events);

    expect(count).toBe(2);
  });
});
