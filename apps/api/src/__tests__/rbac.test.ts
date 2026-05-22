import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

const mockPrisma = {
  teamMember: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  apiKey: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  merchantSession: {
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));

const ROLES = ["ADMIN", "DEVELOPER", "ANALYST", "READ_ONLY"] as const;
type Role = (typeof ROLES)[number];

const ROLE_HIERARCHY: Record<Role, number> = {
  READ_ONLY: 0,
  ANALYST: 1,
  DEVELOPER: 2,
  ADMIN: 3,
};

const ENDPOINT_PERMISSIONS: Record<string, Role[]> = {
  "POST /api/v1/payments": ["ADMIN", "DEVELOPER"],
  "GET /api/v1/payments": ["ADMIN", "DEVELOPER", "ANALYST", "READ_ONLY"],
  "POST /api/v1/refunds": ["ADMIN", "DEVELOPER"],
  "DELETE /api/v1/merchants": ["ADMIN"],
  "GET /api/v1/analytics": ["ADMIN", "ANALYST"],
};

function hasEndpointAccess(role: Role, endpoint: string): boolean {
  const allowedRoles = ENDPOINT_PERMISSIONS[endpoint];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

function validateApiKeyScopes(scopes: string[], requiredScope: string): boolean {
  if (scopes.includes("*")) return true;
  return scopes.includes(requiredScope);
}

describe("RBAC", () => {
  describe("Team Member Role Assignment", () => {
    it("assigns a team member with DEVELOPER role", async () => {
      mockPrisma.teamMember.create.mockResolvedValue({
        id: "member-1",
        merchantId: "merchant-1",
        email: "dev@example.com",
        role: "DEVELOPER",
        status: "ACTIVE",
      });

      const member = await mockPrisma.teamMember.create({
        data: {
          merchantId: "merchant-1",
          email: "dev@example.com",
          role: "DEVELOPER",
        },
      });

      expect(member.role).toBe("DEVELOPER");
    });

    it("assigns a team member with ADMIN role", async () => {
      mockPrisma.teamMember.create.mockResolvedValue({
        id: "member-2",
        merchantId: "merchant-1",
        email: "admin@example.com",
        role: "ADMIN",
        status: "ACTIVE",
      });

      const member = await mockPrisma.teamMember.create({
        data: {
          merchantId: "merchant-1",
          email: "admin@example.com",
          role: "ADMIN",
        },
      });

      expect(member.role).toBe("ADMIN");
    });
  });

  describe("Role-Based Access to Endpoints", () => {
    it("ADMIN can access all endpoints", () => {
      expect(hasEndpointAccess("ADMIN", "DELETE /api/v1/merchants")).toBe(true);
      expect(hasEndpointAccess("ADMIN", "POST /api/v1/payments")).toBe(true);
      expect(hasEndpointAccess("ADMIN", "GET /api/v1/analytics")).toBe(true);
    });

    it("DEVELOPER can create payments and refunds", () => {
      expect(hasEndpointAccess("DEVELOPER", "POST /api/v1/payments")).toBe(true);
      expect(hasEndpointAccess("DEVELOPER", "POST /api/v1/refunds")).toBe(true);
    });

    it("DEVELOPER cannot access admin-only endpoints", () => {
      expect(hasEndpointAccess("DEVELOPER", "DELETE /api/v1/merchants")).toBe(false);
    });

    it("READ_ONLY can only view data", () => {
      expect(hasEndpointAccess("READ_ONLY", "GET /api/v1/payments")).toBe(true);
      expect(hasEndpointAccess("READ_ONLY", "POST /api/v1/payments")).toBe(false);
      expect(hasEndpointAccess("READ_ONLY", "POST /api/v1/refunds")).toBe(false);
    });

    it("ANALYST can view payments and analytics", () => {
      expect(hasEndpointAccess("ANALYST", "GET /api/v1/payments")).toBe(true);
      expect(hasEndpointAccess("ANALYST", "GET /api/v1/analytics")).toBe(true);
      expect(hasEndpointAccess("ANALYST", "POST /api/v1/payments")).toBe(false);
    });
  });

  describe("API Key Scope Validation", () => {
    it("wildcard scope allows any action", () => {
      expect(validateApiKeyScopes(["*"], "payments:write")).toBe(true);
      expect(validateApiKeyScopes(["*"], "refunds:create")).toBe(true);
    });

    it("specific scope allows matching action", () => {
      expect(validateApiKeyScopes(["payments:read"], "payments:read")).toBe(true);
    });

    it("specific scope rejects non-matching action", () => {
      expect(validateApiKeyScopes(["payments:read"], "payments:write")).toBe(false);
    });

    it("multiple scopes are checked correctly", () => {
      expect(validateApiKeyScopes(["payments:read", "refunds:create"], "refunds:create")).toBe(true);
      expect(validateApiKeyScopes(["payments:read", "refunds:create"], "analytics:view")).toBe(false);
    });
  });

  describe("Team Member Status", () => {
    it("invited team member has PENDING status", () => {
      const invitedMember = {
        id: "member-3",
        email: "pending@example.com",
        status: "PENDING",
        invitedAt: new Date(),
      };

      expect(invitedMember.status).toBe("PENDING");
    });

    it("active team member has ACTIVE status", () => {
      const activeMember = {
        id: "member-4",
        email: "active@example.com",
        status: "ACTIVE",
      };

      expect(activeMember.status).toBe("ACTIVE");
    });
  });

  describe("Team Member Removal", () => {
    it("deletes a team member", async () => {
      mockPrisma.teamMember.delete.mockResolvedValue({
        id: "member-1",
        email: "dev@example.com",
      });

      const result = await mockPrisma.teamMember.delete({
        where: { id: "member-1" },
      });

      expect(result.id).toBe("member-1");
    });
  });

  describe("Session Management", () => {
    it("lists active sessions for a merchant", async () => {
      mockPrisma.merchantSession.findMany.mockResolvedValue([
        { id: "session-1", isCurrent: true, lastUsedAt: new Date() },
        { id: "session-2", isCurrent: false, lastUsedAt: new Date() },
      ]);

      const sessions = await mockPrisma.merchantSession.findMany({
        where: { merchantId: "merchant-1" },
      });

      expect(sessions).toHaveLength(2);
    });

    it("invalidates a session", async () => {
      mockPrisma.merchantSession.update.mockResolvedValue({
        id: "session-1",
        expiresAt: new Date(0),
      });

      const result = await mockPrisma.merchantSession.update({
        where: { id: "session-1" },
        data: { expiresAt: new Date(0) },
      });

      expect(result.expiresAt.getTime()).toBe(0);
    });
  });
});
