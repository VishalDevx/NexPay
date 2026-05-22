import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

const mockPrisma = {
  feeSchedule: { findUnique: vi.fn() },
  subscription: { findUnique: vi.fn(), findMany: vi.fn() },
  payment: { aggregate: vi.fn() },
  billingInvoice: { findFirst: vi.fn(), create: vi.fn() },
};

const mockGlService = { createEntry: vi.fn().mockResolvedValue({ id: "gl-1" }) };

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../modules/general-ledger/gl.service", () => ({ glService: mockGlService }));

beforeEach(() => vi.clearAllMocks());

describe("BillingService", () => {
  describe("Transaction Fee Calculation", () => {
    it("calculates MDR + fixed fee correctly", async () => {
      const { billingService } = await import("../modules/billing/billing.service");

      mockPrisma.feeSchedule.findUnique.mockResolvedValue({ merchantId: "m1", mdr: "2.9000", fixedFee: "0.3000" });
      const r = await billingService.calculateTransactionFee({ merchantId: "m1", amount: "1000.00", currency: "USD" });

      expect(r.mdr.toFixed(4)).toBe("29.0000");
      expect(r.fixedFee.toFixed(4)).toBe("0.3000");
      expect(r.fee.toFixed(4)).toBe("29.3000");
      expect(r.net.toFixed(4)).toBe("970.7000");
    });

    it("returns zero fee when no fee schedule exists", async () => {
      const { billingService } = await import("../modules/billing/billing.service");
      mockPrisma.feeSchedule.findUnique.mockResolvedValue(null);
      const r = await billingService.calculateTransactionFee({ merchantId: "no-schedule", amount: "500.00", currency: "USD" });
      expect(r.fee.toNumber()).toBe(0);
      expect(r.net.toNumber()).toBe(500);
    });

    it("handles different MDR rates", async () => {
      const { billingService } = await import("../modules/billing/billing.service");
      mockPrisma.feeSchedule.findUnique.mockResolvedValue({ merchantId: "m1", mdr: "1.5000", fixedFee: "0.1000" });
      const r = await billingService.calculateTransactionFee({ merchantId: "m1", amount: "1000.00", currency: "USD" });
      expect(r.mdr.toFixed(4)).toBe("15.0000");
    });
  });

  describe("Plan Limits", () => {
    it("allows transaction under volume limit", async () => {
      const { billingService } = await import("../modules/billing/billing.service");
      mockPrisma.subscription.findUnique.mockResolvedValue({ merchantId: "m1", status: "ACTIVE", currentPeriodStart: new Date("2024-01-01"), plan: { maxMonthlyVolume: "100000.0000" } });
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: "30000.0000" } });

      const r = await billingService.checkPlanLimits("m1", "5000.00");
      expect(r.allowed).toBe(true);
    });

    it("blocks transaction exceeding volume limit", async () => {
      const { billingService } = await import("../modules/billing/billing.service");
      mockPrisma.subscription.findUnique.mockResolvedValue({ merchantId: "m1", status: "ACTIVE", currentPeriodStart: new Date("2024-01-01"), plan: { maxMonthlyVolume: "100000.0000" } });
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: "98000.0000" } });

      const r = await billingService.checkPlanLimits("m1", "5000.00");
      expect(r.allowed).toBe(false);
    });

    it("allows when no monthly volume cap", async () => {
      const { billingService } = await import("../modules/billing/billing.service");
      mockPrisma.subscription.findUnique.mockResolvedValue({ merchantId: "m1", status: "ACTIVE", currentPeriodStart: new Date("2024-01-01"), plan: { maxMonthlyVolume: null } });
      const r = await billingService.checkPlanLimits("m1", "999999.00");
      expect(r.allowed).toBe(true);
    });

    it("allows when subscription is not active", async () => {
      const { billingService } = await import("../modules/billing/billing.service");
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      const r = await billingService.checkPlanLimits("m1", "100.00");
      expect(r.allowed).toBe(true);
    });
  });

  describe("Subscription Invoice Generation", () => {
    it("generates invoice with correct format", async () => {
      const { billingService } = await import("../modules/billing/billing.service");
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: "sub-1", merchantId: "m1", status: "ACTIVE",
        currentPeriodStart: new Date("2024-01-01"),
        plan: { name: "Growth", monthlyPrice: new Decimal("99.0000") },
        merchant: { baseCurrency: "USD" },
      });
      mockPrisma.billingInvoice.findFirst.mockResolvedValue(null);
      mockPrisma.billingInvoice.create.mockResolvedValue({ id: "inv-1", invoiceNumber: "INV-M1-1234567890", amount: "99.0000", total: "99.0000", currency: "USD", status: "PENDING" });

      const r = await billingService.generateSubscriptionInvoice("sub-1");
      expect(r.invoiceNumber).toContain("INV-");
      expect(r.amount.toString()).toBe("99.0000");
    });

    it("returns null for non-active subscriptions", async () => {
      const { billingService } = await import("../modules/billing/billing.service");
      mockPrisma.subscription.findUnique.mockResolvedValue({ id: "sub-1", status: "CANCELED" });
      expect(await billingService.generateSubscriptionInvoice("sub-1")).toBeNull();
    });
  });
});
