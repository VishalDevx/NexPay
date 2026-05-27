import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

const mockPrisma = {
  $transaction: vi.fn((cb: any) => cb(mockTx)),
  chartAccount: { findUnique: vi.fn(), findMany: vi.fn() },
  journalEntry: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
  journalLine: { findMany: vi.fn() },
};

const mockTx = {
  chartAccount: { findUnique: vi.fn() },
  journalEntry: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));

beforeEach(() => vi.clearAllMocks());

describe("GeneralLedgerService", () => {
  async function getGlService() {
    return (await import("../modules/general-ledger/gl.service")).glService;
  }

  describe("createEntry", () => {
    it("creates a balanced journal entry with debit and credit lines", async () => {
      const glService = await getGlService();
      mockTx.chartAccount.findUnique
        .mockResolvedValueOnce({ code: "1200", name: "Settlement Holding", type: "ASSET", isActive: true })
        .mockResolvedValueOnce({ code: "3100", name: "Processing Fee Revenue", type: "REVENUE", isActive: true })
        .mockResolvedValueOnce({ code: "2100", name: "Merchant Payable", type: "LIABILITY", isActive: true });
      mockTx.journalEntry.create.mockResolvedValue({
        id: "je-1",
        transactionId: "pay-1",
        transactionType: "payment",
        status: "POSTED",
        lines: [
          { id: "line-1", accountCode: "1200", debit: "1000.0000", credit: "0.0000", account: { code: "1200", name: "Settlement Holding" } },
          { id: "line-2", accountCode: "3100", debit: "0.0000", credit: "30.0000", account: { code: "3100", name: "Processing Fee Revenue" } },
          { id: "line-3", accountCode: "2100", debit: "0.0000", credit: "970.0000", account: { code: "2100", name: "Merchant Payable" } },
        ],
      });

      const result = await glService.createEntry({
        transactionId: "pay-1",
        transactionType: "payment",
        description: "Test payment",
        lines: [
          { accountCode: "1200", debit: "1000.0000" },
          { accountCode: "3100", credit: "30.0000" },
          { accountCode: "2100", credit: "970.0000" },
        ],
      });

      expect(result.status).toBe("POSTED");
      expect(result.lines).toHaveLength(3);
    });

    it("throws on unbalanced entry", async () => {
      const glService = await getGlService();
      await expect(glService.createEntry({
        transactionId: "pay-1",
        transactionType: "payment",
        lines: [
          { accountCode: "1200", debit: "100.0000" },
          { accountCode: "3100", credit: "90.0000" },
        ],
      })).rejects.toThrow("Debit/Credit mismatch");
    });

    it("throws with single line entry", async () => {
      const glService = await getGlService();
      await expect(glService.createEntry({
        lines: [{ accountCode: "1200", debit: "100.0000" }],
      })).rejects.toThrow("Journal entry must have at least 2 lines");
    });

    it("throws when total amount is zero", async () => {
      const glService = await getGlService();
      await expect(glService.createEntry({
        lines: [
          { accountCode: "1200", debit: "0.0000" },
          { accountCode: "3100", credit: "0.0000" },
        ],
      })).rejects.toThrow("Journal entry amount must be greater than zero");
    });

    it("throws when account does not exist", async () => {
      const glService = await getGlService();
      mockTx.chartAccount.findUnique.mockResolvedValue(null);
      await expect(glService.createEntry({
        lines: [
          { accountCode: "9999", debit: "100.0000" },
          { accountCode: "3100", credit: "100.0000" },
        ],
      })).rejects.toThrow("Account not found: 9999");
    });

    it("throws when account is inactive", async () => {
      const glService = await getGlService();
      mockTx.chartAccount.findUnique
        .mockResolvedValueOnce({ code: "1200", name: "Inactive Account", isActive: false })
        .mockResolvedValueOnce({ code: "3100", name: "Revenue", isActive: true });
      await expect(glService.createEntry({
        lines: [
          { accountCode: "1200", debit: "100.0000" },
          { accountCode: "3100", credit: "100.0000" },
        ],
      })).rejects.toThrow("Account is inactive");
    });

    it("validates lines with decimal.js precision", async () => {
      const glService = await getGlService();
      mockTx.chartAccount.findUnique
        .mockResolvedValue({ code: "1200", name: "Asset", type: "ASSET", isActive: true });
      mockTx.journalEntry.create.mockResolvedValue({ id: "je-2", status: "POSTED", lines: [] });

      await glService.createEntry({
        lines: [
          { accountCode: "1200", debit: "100.99999" },
          { accountCode: "1200", credit: "100.99999" },
        ],
      });
      expect(mockTx.journalEntry.create).toHaveBeenCalled();
    });
  });

  describe("reverseEntry", () => {
    it("creates a reversal entry swapping debits and credits", async () => {
      const glService = await getGlService();
      mockTx.journalEntry.findUnique.mockResolvedValue({
        id: "je-1",
        status: "POSTED",
        reversalOfId: null,
        transactionId: "pay-1",
        transactionType: "payment",
        description: "Original entry",
        lines: [
          { id: "l1", accountCode: "1200", debit: "1000.0000", credit: "0.0000", description: "Debit line" },
          { id: "l2", accountCode: "3100", debit: "0.0000", credit: "1000.0000", description: "Credit line" },
        ],
      });
      mockTx.journalEntry.create.mockResolvedValue({
        id: "je-reversal",
        status: "POSTED",
        lines: [
          { accountCode: "3100", debit: "1000.0000", credit: "0.0000" },
          { accountCode: "1200", debit: "0.0000", credit: "1000.0000" },
        ],
      });

      const reversal = await glService.reverseEntry("je-1", "Incorrect entry");
      expect(reversal.id).toBe("je-reversal");
      expect(mockTx.journalEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "je-1" }, data: { status: "REVERSED" } })
      );
    });

    it("throws when entry not found", async () => {
      const glService = await getGlService();
      mockTx.journalEntry.findUnique.mockResolvedValue(null);
      await expect(glService.reverseEntry("nonexistent", "test")).rejects.toThrow("Journal entry not found");
    });

    it("throws when entry already reversed", async () => {
      const glService = await getGlService();
      mockTx.journalEntry.findUnique.mockResolvedValue({ id: "je-1", status: "REVERSED", reversalOfId: null, lines: [] });
      await expect(glService.reverseEntry("je-1", "test")).rejects.toThrow("Entry already reversed");
    });

    it("throws when reversing a reversal entry", async () => {
      const glService = await getGlService();
      mockTx.journalEntry.findUnique.mockResolvedValue({ id: "je-2", status: "POSTED", reversalOfId: "je-1", lines: [] });
      await expect(glService.reverseEntry("je-2", "test")).rejects.toThrow("Cannot reverse a reversal entry");
    });
  });

  describe("getAccountBalance", () => {
    it("calculates asset balance as debit - credit", async () => {
      const glService = await getGlService();
      mockPrisma.journalLine.findMany.mockResolvedValue([
        { debit: "500.0000", credit: "0.0000" },
        { debit: "300.0000", credit: "0.0000" },
        { debit: "0.0000", credit: "200.0000" },
      ]);
      mockPrisma.chartAccount.findUnique.mockResolvedValue({ code: "1200", type: "ASSET" });

      const balance = await glService.getAccountBalance("1200");
      expect(balance.toFixed(2)).toBe("600.00");
    });

    it("calculates liability balance as credit - debit", async () => {
      const glService = await getGlService();
      mockPrisma.journalLine.findMany.mockResolvedValue([
        { debit: "0.0000", credit: "1000.0000" },
        { debit: "200.0000", credit: "0.0000" },
      ]);
      mockPrisma.chartAccount.findUnique.mockResolvedValue({ code: "2100", type: "LIABILITY" });

      const balance = await glService.getAccountBalance("2100");
      expect(balance.toFixed(2)).toBe("800.00");
    });

    it("returns zero for account with no entries", async () => {
      const glService = await getGlService();
      mockPrisma.journalLine.findMany.mockResolvedValue([]);
      mockPrisma.chartAccount.findUnique.mockResolvedValue({ code: "1200", type: "ASSET" });

      const balance = await glService.getAccountBalance("1200");
      expect(balance.toFixed(2)).toBe("0.00");
    });

    it("throws for non-existent account", async () => {
      const glService = await getGlService();
      mockPrisma.journalLine.findMany.mockResolvedValue([]);
      mockPrisma.chartAccount.findUnique.mockResolvedValue(null);
      await expect(glService.getAccountBalance("9999")).rejects.toThrow("Account not found: 9999");
    });
  });

  describe("getTrialBalance", () => {
    it("returns balanced trial balance with equal debits and credits", async () => {
      const glService = await getGlService();
      mockPrisma.chartAccount.findMany.mockResolvedValue([
        { code: "1200", name: "Settlement Holding", type: "ASSET", category: "ASSET", isActive: true },
        { code: "3100", name: "Revenue", type: "REVENUE", category: "REVENUE", isActive: true },
      ]);
      mockPrisma.journalLine.findMany.mockResolvedValue([
        { debit: "1000.0000", credit: "0.0000", account: { code: "1200" }, accountCode: "1200" },
        { debit: "0.0000", credit: "30.0000", account: { code: "3100" }, accountCode: "3100" },
        { debit: "0.0000", credit: "970.0000", account: { code: "3100" }, accountCode: "3100" },
      ]);

      const result = await glService.getTrialBalance();
      expect(result.totalDebit).toBe("1000.00");
      expect(result.totalCredit).toBe("1000.00");
      expect(result.rows).toHaveLength(2);
    });
  });

  describe("getIncomeStatement", () => {
    it("calculates net income correctly", async () => {
      const glService = await getGlService();
      mockPrisma.journalLine.findMany
        .mockResolvedValueOnce([
          { debit: "0.0000", credit: "5000.0000", account: { code: "3100" } },
          { debit: "0.0000", credit: "3000.0000", account: { code: "3100" } },
        ])
        .mockResolvedValueOnce([
          { debit: "2000.0000", credit: "0.0000", account: { code: "4100" } },
          { debit: "1000.0000", credit: "0.0000", account: { code: "4100" } },
        ]);

      const result = await glService.getIncomeStatement(new Date("2024-01-01"), new Date("2024-12-31"));
      expect(result.revenue).toBe("8000.00");
      expect(result.expenses).toBe("3000.00");
      expect(result.netIncome).toBe("5000.00");
    });

    it("handles net loss", async () => {
      const glService = await getGlService();
      mockPrisma.journalLine.findMany
        .mockResolvedValueOnce([{ debit: "0.0000", credit: "1000.0000", account: { code: "3100" } }])
        .mockResolvedValueOnce([{ debit: "3000.0000", credit: "0.0000", account: { code: "4100" } }]);

      const result = await glService.getIncomeStatement(new Date("2024-01-01"), new Date("2024-12-31"));
      expect(result.netIncome).toBe("-2000.00");
    });
  });
});
