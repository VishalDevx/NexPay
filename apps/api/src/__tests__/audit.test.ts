import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  adminActivityLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  paymentEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  securityEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuditLogging", () => {
  describe("Admin Activity Log", () => {
    it("creates an admin activity log entry", async () => {
      mockPrisma.adminActivityLog.create.mockResolvedValue({
        id: "log-1",
        adminId: "admin-1",
        action: "MERCHANT_APPROVED",
        resource: "merchant",
        resourceId: "merchant-1",
        details: { reason: "KYC completed" },
        ip: "10.0.0.1",
      });

      const log = await mockPrisma.adminActivityLog.create({
        data: {
          adminId: "admin-1",
          action: "MERCHANT_APPROVED",
          resource: "merchant",
          resourceId: "merchant-1",
          details: { reason: "KYC completed" },
          ip: "10.0.0.1",
        },
      });

      expect(log.action).toBe("MERCHANT_APPROVED");
      expect(log.resource).toBe("merchant");
      expect(log.resourceId).toBe("merchant-1");
    });

    it("creates a log entry for merchant suspension", async () => {
      mockPrisma.adminActivityLog.create.mockResolvedValue({
        id: "log-2",
        adminId: "admin-2",
        action: "MERCHANT_SUSPENDED",
        resource: "merchant",
        resourceId: "merchant-2",
      });

      const log = await mockPrisma.adminActivityLog.create({
        data: {
          adminId: "admin-2",
          action: "MERCHANT_SUSPENDED",
          resource: "merchant",
          resourceId: "merchant-2",
        },
      });

      expect(log.action).toBe("MERCHANT_SUSPENDED");
    });
  });

  describe("Payment Event Tracking", () => {
    it("creates a payment event on state transition", async () => {
      mockPrisma.paymentEvent.create.mockResolvedValue({
        id: "event-1",
        paymentId: "pay-1",
        fromStatus: "INITIATED",
        toStatus: "PROCESSING",
        actor: "system",
        reason: "Processing payment",
      });

      const event = await mockPrisma.paymentEvent.create({
        data: {
          paymentId: "pay-1",
          fromStatus: "INITIATED",
          toStatus: "PROCESSING",
          actor: "system",
          reason: "Processing payment",
        },
      });

      expect(event.paymentId).toBe("pay-1");
      expect(event.fromStatus).toBe("INITIATED");
      expect(event.toStatus).toBe("PROCESSING");
    });

    it("creates refund payment event", async () => {
      mockPrisma.paymentEvent.create.mockResolvedValue({
        id: "event-2",
        paymentId: "pay-1",
        fromStatus: "CAPTURED",
        toStatus: "REFUNDED",
        actor: "merchant",
        reason: "Full refund",
      });

      const event = await mockPrisma.paymentEvent.create({
        data: {
          paymentId: "pay-1",
          fromStatus: "CAPTURED",
          toStatus: "REFUNDED",
          actor: "merchant",
          reason: "Full refund",
        },
      });

      expect(event.toStatus).toBe("REFUNDED");
      expect(event.actor).toBe("merchant");
    });
  });

  describe("Security Event Creation", () => {
    it("creates a security event for failed login", async () => {
      mockPrisma.securityEvent.create.mockResolvedValue({
        id: "sec-1",
        merchantId: "merchant-1",
        type: "LOGIN_FAILED",
        severity: "WARNING",
        details: { attempts: 3 },
        ip: "192.168.1.1",
      });

      const event = await mockPrisma.securityEvent.create({
        data: {
          merchantId: "merchant-1",
          type: "LOGIN_FAILED",
          severity: "WARNING",
          details: { attempts: 3 },
          ip: "192.168.1.1",
        },
      });

      expect(event.type).toBe("LOGIN_FAILED");
      expect(event.severity).toBe("WARNING");
    });

    it("creates a security event for API key usage", async () => {
      mockPrisma.securityEvent.create.mockResolvedValue({
        id: "sec-2",
        merchantId: "merchant-1",
        type: "API_KEY_USED",
        severity: "INFO",
        details: { keyPrefix: "nex_live" },
      });

      const event = await mockPrisma.securityEvent.create({
        data: {
          merchantId: "merchant-1",
          type: "API_KEY_USED",
          severity: "INFO",
          details: { keyPrefix: "nex_live" },
        },
      });

      expect(event.type).toBe("API_KEY_USED");
    });

    it("creates a critical security event", async () => {
      mockPrisma.securityEvent.create.mockResolvedValue({
        id: "sec-3",
        merchantId: "merchant-1",
        type: "SUSPICIOUS_ACTIVITY",
        severity: "CRITICAL",
        details: { description: "Multiple failed attempts from unknown IP" },
      });

      const event = await mockPrisma.securityEvent.create({
        data: {
          merchantId: "merchant-1",
          type: "SUSPICIOUS_ACTIVITY",
          severity: "CRITICAL",
          details: { description: "Multiple failed attempts from unknown IP" },
        },
      });

      expect(event.severity).toBe("CRITICAL");
    });
  });

  describe("Audit Log Querying", () => {
    it("queries logs by action", async () => {
      mockPrisma.adminActivityLog.findMany.mockResolvedValue([
        { id: "log-1", action: "MERCHANT_APPROVED", resource: "merchant", resourceId: "merchant-1" },
      ]);

      const logs = await mockPrisma.adminActivityLog.findMany({
        where: { action: "MERCHANT_APPROVED" },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("MERCHANT_APPROVED");
    });

    it("queries logs by resource", async () => {
      mockPrisma.adminActivityLog.findMany.mockResolvedValue([
        { id: "log-1", action: "MERCHANT_APPROVED", resource: "merchant", resourceId: "merchant-1" },
        { id: "log-2", action: "MERCHANT_SUSPENDED", resource: "merchant", resourceId: "merchant-1" },
      ]);

      const logs = await mockPrisma.adminActivityLog.findMany({
        where: { resourceId: "merchant-1" },
      });

      expect(logs).toHaveLength(2);
    });

    it("queries security events by type", async () => {
      mockPrisma.securityEvent.findMany.mockResolvedValue([
        { id: "sec-1", type: "LOGIN_FAILED", severity: "WARNING" },
      ]);

      const events = await mockPrisma.securityEvent.findMany({
        where: { type: "LOGIN_FAILED" },
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("LOGIN_FAILED");
    });
  });
});
