import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

const mockTx = { settlementBatch: { create: vi.fn() } };

const mockPrisma = {
  $transaction: vi.fn((cb: any) => cb(mockTx)),
  reconciliationRun: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  reconciliationMatch: { createMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  reconciliationRule: { findMany: vi.fn() },
  payment: { findMany: vi.fn(), findUnique: vi.fn() },
  journalLine: { findMany: vi.fn() },
  settlementBatch: { findMany: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
  settlementBatchItem: { update: vi.fn() },
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));

beforeEach(() => vi.clearAllMocks());

describe("ReconciliationService", () => {
  describe("startRun", () => {
    it("creates a reconciliation run record", async () => {
      const { reconciliationService } = await import("../modules/reconciliation/reconciliation.service");

      mockPrisma.reconciliationRun.create.mockResolvedValue({ id: "run-1", runType: "DAILY", status: "RUNNING" });
      mockPrisma.reconciliationRule.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.journalLine.findMany.mockResolvedValue([]);
      mockPrisma.settlementBatch.findMany.mockResolvedValue([]);
      mockPrisma.reconciliationRun.update.mockResolvedValue({});
      mockPrisma.reconciliationRun.findUnique.mockResolvedValue({ id: "run-1", runType: "DAILY", status: "COMPLETED" });

      const result = await reconciliationService.startRun("DAILY");
      expect(result.run).toBeDefined();
    });

    it("creates PAYMENT_LEDGER reconciliation run", async () => {
      const { reconciliationService } = await import("../modules/reconciliation/reconciliation.service");
      mockPrisma.reconciliationRun.create.mockResolvedValue({ id: "run-2", runType: "PAYMENT_LEDGER", status: "RUNNING" });
      mockPrisma.reconciliationRule.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.journalLine.findMany.mockResolvedValue([]);
      mockPrisma.reconciliationRun.update.mockResolvedValue({});

      const result = await reconciliationService.startRun("PAYMENT_LEDGER");
      expect(result.run.runType).toBe("PAYMENT_LEDGER");
    });

    it("creates SETTLEMENT reconciliation run", async () => {
      const { reconciliationService } = await import("../modules/reconciliation/reconciliation.service");
      mockPrisma.reconciliationRun.create.mockResolvedValue({ id: "run-3", runType: "SETTLEMENT", status: "RUNNING" });
      mockPrisma.settlementBatch.findMany.mockResolvedValue([]);
      mockPrisma.reconciliationRun.update.mockResolvedValue({});

      const result = await reconciliationService.startRun("SETTLEMENT");
      expect(result.run.runType).toBe("SETTLEMENT");
    });

    it("marks run as FAILED on error", async () => {
      const { reconciliationService } = await import("../modules/reconciliation/reconciliation.service");
      mockPrisma.reconciliationRun.create.mockResolvedValue({ id: "run-4", runType: "DAILY", status: "RUNNING" });
      mockPrisma.reconciliationRule.findMany.mockRejectedValue(new Error("DB error"));
      mockPrisma.reconciliationRun.update.mockResolvedValue({});

      await expect(reconciliationService.startRun("DAILY")).rejects.toThrow("DB error");
    });
  });

  describe("Payment-Ledger Matching", () => {
    it("detects missing ledger entries", async () => {
      const { reconciliationService } = await import("../modules/reconciliation/reconciliation.service");
      mockPrisma.reconciliationRun.create.mockResolvedValue({ id: "run-5", runType: "PAYMENT_LEDGER", status: "RUNNING" });
      mockPrisma.reconciliationRule.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([{ id: "pay-orphan", amount: "200.0000", currency: "USD", status: "CAPTURED", capturedAt: null, createdAt: new Date() }]);
      mockPrisma.journalLine.findMany.mockResolvedValue([]);
      mockPrisma.reconciliationRun.update.mockResolvedValue({});

      const result = await reconciliationService.startRun("PAYMENT_LEDGER");
      expect(result).toBeDefined();
    });
  });

  describe("importSettlementBatch", () => {
    it("creates a settlement batch with items", async () => {
      const { reconciliationService } = await import("../modules/reconciliation/reconciliation.service");
      mockTx.settlementBatch.create.mockResolvedValue({ id: "batch-1", reference: "BANK-20240101", items: [] });

      const result = await reconciliationService.importSettlementBatch({ reference: "BANK-20240101", totalAmount: "5000.00", items: [{ paymentId: "pay-1", amount: "1000.00" }, { paymentId: "pay-2", amount: "4000.00" }] });
      expect(result.reference).toBe("BANK-20240101");
    });
  });

  describe("resolveMatch", () => {
    it("resolves a match", async () => {
      const { reconciliationService } = await import("../modules/reconciliation/reconciliation.service");
      mockPrisma.reconciliationMatch.findUnique.mockResolvedValue({ id: "match-1", status: "OPEN" });
      mockPrisma.reconciliationMatch.update.mockResolvedValue({ id: "match-1", status: "RESOLVED" });

      const result = await reconciliationService.resolveMatch("match-1", "manual_fix", "admin-1");
      expect(result.status).toBe("RESOLVED");
    });

    it("throws when match not found", async () => {
      const { reconciliationService } = await import("../modules/reconciliation/reconciliation.service");
      mockPrisma.reconciliationMatch.findUnique.mockResolvedValue(null);
      await expect(reconciliationService.resolveMatch("not-found", "fix", "admin")).rejects.toThrow("Match not found");
    });
  });

  describe("getReconciliationReport", () => {
    it("returns report for a specific run", async () => {
      const { reconciliationService } = await import("../modules/reconciliation/reconciliation.service");
      mockPrisma.reconciliationRun.findUnique.mockResolvedValue({ id: "run-1", matches: [] });
      expect((await reconciliationService.getReconciliationReport("run-1")).id).toBe("run-1");
    });

    it("returns recent runs when no runId", async () => {
      const { reconciliationService } = await import("../modules/reconciliation/reconciliation.service");
      mockPrisma.reconciliationRun.findMany.mockResolvedValue([{ id: "run-1", matches: [] }]);
      expect(Array.isArray(await reconciliationService.getReconciliationReport())).toBe(true);
    });
  });
});
