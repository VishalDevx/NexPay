import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

const mockPrisma = {
  feeSchedule: {
    findUnique: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  payment: {
    aggregate: vi.fn(),
  },
  billingInvoice: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

const mockGlService = {
  createEntry: vi.fn(),
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../modules/general-ledger/gl.service", () => ({ glService: mockGlService }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BillingService", () => {
  describe("Transaction Fee Calculation", () => {
    it("calculates MDR + fixed fee correctly", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.feeSchedule.findUnique.mockResolvedValue({
        merchantId: "merchant-1",
        mdr: "2.9000",
        fixedFee: "0.3000",
      });

      const result = await billingService.calculateTransactionFee({
        merchantId: "merchant-1",
        amount: "1000.00",
        currency: "USD",
      });

      expect(result.mdr.toFixed(4)).toBe("29.0000");
      expect(result.fixedFee.toFixed(4)).toBe("0.3000");
      expect(result.fee.toFixed(4)).toBe("29.3000");
      expect(result.net.toFixed(4)).toBe("970.7000");
    });

    it("returns zero fee when no fee schedule exists", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.feeSchedule.findUnique.mockResolvedValue(null);

      const result = await billingService.calculateTransactionFee({
        merchantId: "merchant-no-schedule",
        amount: "500.00",
        currency: "USD",
      });

      expect(result.fee.toNumber()).toBe(0);
      expect(result.net.toNumber()).toBe(500);
    });

    it("handles small transaction amounts", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.feeSchedule.findUnique.mockResolvedValue({
        merchantId: "merchant-1",
        mdr: "2.9000",
        fixedFee: "0.3000",
      });

      const result = await billingService.calculateTransactionFee({
        merchantId: "merchant-1",
        amount: "1.00",
        currency: "USD",
      });

      expect(result.net.toNumber()).toBeGreaterThan(0);
    });

    it("handles different MDR rates", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.feeSchedule.findUnique.mockResolvedValue({
        merchantId: "merchant-1",
        mdr: "1.5000",
        fixedFee: "0.1000",
      });

      const result = await billingService.calculateTransactionFee({
        merchantId: "merchant-1",
        amount: "1000.00",
        currency: "USD",
      });

      expect(result.mdr.toFixed(4)).toBe("15.0000");
      expect(result.fee.toFixed(4)).toBe("15.1000");
    });
  });

  describe("Plan Limits", () => {
    it("allows transaction under volume limit", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.subscription.findUnique.mockResolvedValue({
        merchantId: "merchant-1",
        status: "ACTIVE",
        currentPeriodStart: new Date("2024-01-01"),
        plan: { maxMonthlyVolume: "100000.0000" },
      });

      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: "30000.0000" },
      });

      const result = await billingService.checkPlanLimits("merchant-1", "5000.00");

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeNull();
    });

    it("blocks transaction exceeding volume limit", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.subscription.findUnique.mockResolvedValue({
        merchantId: "merchant-1",
        status: "ACTIVE",
        currentPeriodStart: new Date("2024-01-01"),
        plan: { maxMonthlyVolume: "100000.0000" },
      });

      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: "98000.0000" },
      });

      const result = await billingService.checkPlanLimits("merchant-1", "5000.00");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("exceeds plan limit");
    });

    it("allows when no monthly volume cap", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.subscription.findUnique.mockResolvedValue({
        merchantId: "merchant-1",
        status: "ACTIVE",
        currentPeriodStart: new Date("2024-01-01"),
        plan: { maxMonthlyVolume: null },
      });

      const result = await billingService.checkPlanLimits("merchant-1", "999999.00");

      expect(result.allowed).toBe(true);
    });

    it("allows when subscription is not active", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await billingService.checkPlanLimits("merchant-1", "100.00");

      expect(result.allowed).toBe(true);
    });
  });

  describe("Subscription Invoice Generation", () => {
    it("generates invoice with correct invoice number format", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: "sub-1",
        merchantId: "merchant-1",
        status: "ACTIVE",
        currentPeriodStart: new Date("2024-01-01"),
        plan: { name: "Growth", monthlyPrice: "99.0000" },
        merchant: { baseCurrency: "USD" },
      });

      mockPrisma.billingInvoice.findFirst.mockResolvedValue(null);
      mockPrisma.billingInvoice.create.mockResolvedValue({
        id: "inv-1",
        invoiceNumber: "INV-MERCHANT-1234567890",
        amount: "99.0000",
        total: "99.0000",
        currency: "USD",
        status: "PENDING",
      });

      const result = await billingService.generateSubscriptionInvoice("sub-1");

      expect(result.invoiceNumber).toContain("INV-");
      expect(result.amount.toString()).toBe("99.0000");
    });

    it("returns null for non-active subscriptions", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: "sub-1",
        status: "CANCELED",
      });

      const result = await billingService.generateSubscriptionInvoice("sub-1");

      expect(result).toBeNull();
    });
  });
});
