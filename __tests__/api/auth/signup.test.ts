// __tests__/api/auth/signup.test.ts
/**
 * Test suite for the signup API endpoint.
 *
 * The signup endpoint handles new user registration with intelligent
 * preference inference based on NYC boroughs. This test suite validates:
 *
 * 1. Input validation (email, borough, optional zipCode, optional phone)
 * 2. Duplicate user detection (by email or phone)
 * 3. Successful user creation with inferred preferences
 * 4. Proper HTTP status codes and response structures
 *
 * Test Architecture:
 * We mock the Prisma client and inference functions to isolate the
 * API route logic. This follows the "sociable unit test" pattern
 * where we test the route handler in isolation from database I/O.
 */

import { NextRequest } from "next/server";

// Mock the db module before importing the route
jest.mock("../../../src/lib/db", () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock the inference module
jest.mock("../../../src/lib/inference", () => ({
  createUserWithInferredPreferences: jest.fn(),
}));

// Mock email sending
jest.mock("../../../src/lib/resend", () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: "mock-email-id" }),
}));

import { POST } from "../../../src/app/api/auth/signup/route";
import { prisma } from "../../../src/lib/db";
import { createUserWithInferredPreferences } from "../../../src/lib/inference";

// Type assertion for mocked functions
const mockPrismaUserFindFirst = prisma.user.findFirst as jest.Mock;
const mockCreateUserWithInferredPreferences =
  createUserWithInferredPreferences as jest.Mock;

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // INPUT VALIDATION TESTS
  // =========================================================================

  describe("Input Validation", () => {
    it("should return 400 for missing email", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ borough: "manhattan" }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid input");
      expect(body.details).toBeDefined();
    });

    it("should return 400 for invalid email format", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "not-an-email",
          borough: "manhattan",
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid input");
    });

    it("should return 400 for missing borough", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid input");
    });

    it("should return 400 for invalid borough", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "hoboken", // Not a valid NYC borough
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid input");
    });

    it("should return 400 for invalid zipCode format (not 5 digits)", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "manhattan",
          zipCode: "1234", // 4 digits
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid input");
    });

    it("should return 400 for zipCode with non-numeric characters", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "manhattan",
          zipCode: "1000a",
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid input");
    });

    it("should accept valid input with optional phone", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockCreateUserWithInferredPreferences.mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
        tier: "free",
        inferredNeighborhood: "Chelsea",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "manhattan",
          zipCode: "10001",
          phone: "+12125551234",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
    });

    it("should accept valid input without zipCode (optional)", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockCreateUserWithInferredPreferences.mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
        tier: "free",
        inferredNeighborhood: "Manhattan",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "manhattan",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // DUPLICATE USER DETECTION TESTS
  // =========================================================================

  describe("Existing User Login", () => {
    it("should return 200 and welcome back message when user with email already exists", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
        tier: "free",
        inferredNeighborhood: "Chelsea",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "existing@example.com",
          borough: "manhattan",
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe("Welcome back!");
    });

    it("should return 200 and welcome back message when user with phone already exists", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
        phone: "+12125551234",
        tier: "free",
        inferredNeighborhood: "Chelsea",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          borough: "manhattan",
          phone: "+12125551234",
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe("Welcome back!");
    });

    it("should check for existing user with correct OR query", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockCreateUserWithInferredPreferences.mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
        tier: "free",
        inferredNeighborhood: "Chelsea",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "manhattan",
          phone: "+12125551234",
        }),
      });

      await POST(req);

      expect(mockPrismaUserFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: "user@example.com" }, { phone: "+12125551234" }],
        },
      });
    });

    it("should only check email when phone is not provided", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockCreateUserWithInferredPreferences.mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
        tier: "free",
        inferredNeighborhood: "Chelsea",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "manhattan",
        }),
      });

      await POST(req);

      expect(mockPrismaUserFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: "user@example.com" }],
        },
      });
    });
  });

  // =========================================================================
  // SUCCESSFUL SIGNUP TESTS
  // =========================================================================

  describe("Successful Signup", () => {
    it("should create user and return proper response structure", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockCreateUserWithInferredPreferences.mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
        tier: "free",
        inferredNeighborhood: "Chelsea",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "manhattan",
          zipCode: "10001",
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe("user-123");
      expect(body.user.email).toBe("user@example.com");
      expect(body.user.tier).toBe("free");
      expect(body.user.inferredNeighborhood).toBe("Chelsea");
      expect(body.message).toBe("Account created successfully!");
    });

    it("should call createUserWithInferredPreferences with correct arguments", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockCreateUserWithInferredPreferences.mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
        tier: "free",
        inferredNeighborhood: "Chelsea",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "manhattan",
          zipCode: "10001",
          phone: "+12125551234",
        }),
      });

      await POST(req);

      expect(mockCreateUserWithInferredPreferences).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          email: "user@example.com",
          borough: "manhattan",
        })
      );
    });

    it("should handle signup without phone number", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockCreateUserWithInferredPreferences.mockResolvedValue({
        id: "user-456",
        email: "nophone@example.com",
        tier: "free",
        inferredNeighborhood: "Williamsburg",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "nophone@example.com",
          borough: "brooklyn",
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.user.email).toBe("nophone@example.com");
      expect(body.user.inferredNeighborhood).toBe("Williamsburg");
    });
  });

  // =========================================================================
  // ERROR HANDLING TESTS
  // =========================================================================

  describe("Error Handling", () => {
    it("should return 500 when database query fails", async () => {
      mockPrismaUserFindFirst.mockRejectedValue(new Error("Database error"));

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "manhattan",
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("should return 500 when user creation fails", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);
      mockCreateUserWithInferredPreferences.mockRejectedValue(
        new Error("Creation failed")
      );

      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          borough: "manhattan",
        }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("should return 400 for malformed JSON body", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: "not valid json",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeDefined();
    });
  });
});
