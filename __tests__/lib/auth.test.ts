// __tests__/lib/auth.test.ts
/**
 * Test suite for authentication utilities.
 *
 * This test suite validates the getUserFromRequest function, including:
 *
 * 1. Header extraction (x-user-id header parsing)
 * 2. Database lookup (Prisma user.findUnique call)
 * 3. Error handling (graceful null returns on failure)
 * 4. Edge cases (missing headers, invalid IDs, DB errors)
 *
 * Test Philosophy:
 * Authentication is a critical security boundary. These tests ensure that:
 * - Missing credentials always result in null (fail secure)
 * - Database errors don't leak information (fail closed)
 * - Valid credentials correctly identify users
 *
 * Historical Context:
 * Header-based authentication traces back to HTTP Basic Auth (RFC 2617, 1999).
 * Modern implementations typically use custom headers like Authorization: Bearer
 * or application-specific headers. The x-user-id approach is common in
 * microservice architectures where a gateway handles JWT validation and
 * passes the verified user ID downstream.
 */

import { NextRequest } from "next/server";

// Mock the db module before importing auth
jest.mock("../../src/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { getUserFromRequest } from "../../src/lib/auth";
import { prisma } from "../../src/lib/db";

// Type assertion for mocked function
const mockPrismaUserFindUnique = prisma.user.findUnique as jest.Mock;

describe("getUserFromRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // HEADER EXTRACTION TESTS
  // ===========================================================================

  describe("Header Extraction", () => {
    it("should return null when x-user-id header is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      const result = await getUserFromRequest(req);

      expect(result).toBeNull();
      expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
    });

    it("should return null when x-user-id header is empty string", async () => {
      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          "x-user-id": "",
        },
      });

      const result = await getUserFromRequest(req);

      expect(result).toBeNull();
      expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
    });

    it("should extract user ID from x-user-id header", async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          "x-user-id": "user-123",
        },
      });

      await getUserFromRequest(req);

      expect(mockPrismaUserFindUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
    });
  });

  // ===========================================================================
  // DATABASE LOOKUP TESTS
  // ===========================================================================

  describe("Database Lookup", () => {
    it("should return user when found in database", async () => {
      const mockUser = {
        id: "user-456",
        email: "found@example.com",
        tier: "free",
        zipCode: "10001",
      };
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          "x-user-id": "user-456",
        },
      });

      const result = await getUserFromRequest(req);

      expect(result).toEqual(mockUser);
    });

    it("should return null when user not found in database", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          "x-user-id": "nonexistent-user",
        },
      });

      const result = await getUserFromRequest(req);

      expect(result).toBeNull();
    });

    it("should return complete user object with all fields", async () => {
      const fullUser = {
        id: "user-789",
        email: "complete@example.com",
        phone: "+12125551234",
        zipCode: "10001",
        tier: "premium",
        stripeCustomerId: "cus_test123",
        inferredNeighborhood: "Chelsea",
        inferredSubwayLines: ["A", "C", "E"],
        inferredHasParking: true,
        smsOptInStatus: "confirmed",
        smsOptInAt: new Date("2024-01-01"),
        emailOptInAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      };
      mockPrismaUserFindUnique.mockResolvedValue(fullUser);

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          "x-user-id": "user-789",
        },
      });

      const result = await getUserFromRequest(req);

      expect(result).toEqual(fullUser);
      expect(result?.tier).toBe("premium");
      expect(result?.inferredNeighborhood).toBe("Chelsea");
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe("Error Handling", () => {
    it("should return null when database query throws", async () => {
      mockPrismaUserFindUnique.mockRejectedValue(
        new Error("Database connection failed")
      );

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          "x-user-id": "user-error",
        },
      });

      const result = await getUserFromRequest(req);

      expect(result).toBeNull();
    });

    it("should not throw when database query throws", async () => {
      mockPrismaUserFindUnique.mockRejectedValue(
        new Error("Unexpected error")
      );

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          "x-user-id": "user-error",
        },
      });

      // Should not throw
      await expect(getUserFromRequest(req)).resolves.toBeNull();
    });

    it("should handle Prisma-specific errors gracefully", async () => {
      const prismaError = {
        code: "P2002",
        message: "Unique constraint failed",
        meta: { target: ["email"] },
      };
      mockPrismaUserFindUnique.mockRejectedValue(prismaError);

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          "x-user-id": "user-prisma-error",
        },
      });

      const result = await getUserFromRequest(req);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe("Edge Cases", () => {
    it("should handle very long user ID", async () => {
      const longId = "a".repeat(1000);
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          "x-user-id": longId,
        },
      });

      const result = await getUserFromRequest(req);

      expect(mockPrismaUserFindUnique).toHaveBeenCalledWith({
        where: { id: longId },
      });
      expect(result).toBeNull();
    });

    it("should handle user ID with special characters", async () => {
      const specialId = "user_123-abc.def";
      mockPrismaUserFindUnique.mockResolvedValue({
        id: specialId,
        email: "special@example.com",
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          "x-user-id": specialId,
        },
      });

      const result = await getUserFromRequest(req);

      expect(result?.id).toBe(specialId);
    });

    it("should handle concurrent requests independently", async () => {
      const user1 = { id: "user-1", email: "user1@example.com" };
      const user2 = { id: "user-2", email: "user2@example.com" };

      mockPrismaUserFindUnique
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      const req1 = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: { "x-user-id": "user-1" },
      });

      const req2 = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: { "x-user-id": "user-2" },
      });

      const [result1, result2] = await Promise.all([
        getUserFromRequest(req1),
        getUserFromRequest(req2),
      ]);

      expect(result1?.id).toBe("user-1");
      expect(result2?.id).toBe("user-2");
    });
  });
});
