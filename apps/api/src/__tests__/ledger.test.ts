import { describe, it, expect, vi, beforeEach } from "vitest";
import { EntryType } from "@prisma/client";

const mockPrisma = {
  $transaction: vi.fn((cb: any) => cb(mockTx)),
  account: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  ledgerEntry: { findFirst: vi.fn(), create: vi.fn() },
};

const mockTx = {
  account: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  ledgerEntry: { create: vi.fn() },
  $executeRawUnsafe: vi.fn(),
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));

const { doubleEntryBook, createLedgerEntry, getAccountBalance } = await import("../modules/ledger/ledger.service");

function makeAccount(overrides = {}) {
  return { id: "acct-1", merchantId: "merchant-1", type: "ASSET", currency: "INR", name: "Test", lastBalance: "1000.0000", ...overrides };
}

beforeEach(() => vi.clearAllMocks());

describe("LedgerService", () => {
  describe("doubleEntryBook", () => {
    it("creates debit and credit entries", async () => {
      const debitAccount = makeAccount({ id: "acct-d", type: "ASSET", lastBalance: "1000.0000" });
      const creditAccount = makeAccount({ id: "acct-c", type: "REVENUE", lastBalance: "500.0000" });

      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(debitAccount).mockResolvedValueOnce(creditAccount);
      mockTx.ledgerEntry.create
        .mockResolvedValueOnce({ id: "e1", type: EntryType.DEBIT, amount: "100.0000", balanceAfter: "1100.0000" })
        .mockResolvedValueOnce({ id: "e2", type: EntryType.CREDIT, amount: "100.0000", balanceAfter: "600.0000" });

      const result = await doubleEntryBook({ debitAccountId: "acct-d", creditAccountId: "acct-c", paymentId: "pay-1", amount: "100.0000", currency: "INR", description: "Test" });
      expect(result.debitEntry.type).toBe(EntryType.DEBIT);
      expect(result.creditEntry.type).toBe(EntryType.CREDIT);
    });

    it("updates balances correctly", async () => {
      const debitAccount = makeAccount({ id: "acct-d", type: "ASSET", lastBalance: "500.0000" });
      const creditAccount = makeAccount({ id: "acct-c", type: "REVENUE", lastBalance: "200.0000" });
      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(debitAccount).mockResolvedValueOnce(creditAccount);
      mockTx.ledgerEntry.create.mockResolvedValueOnce({ id: "e1", type: EntryType.DEBIT }).mockResolvedValueOnce({ id: "e2", type: EntryType.CREDIT });

      await doubleEntryBook({ debitAccountId: "acct-d", creditAccountId: "acct-c", paymentId: "pay-1", amount: "200.0000", currency: "INR", description: "Test" });
      expect(mockTx.account.update.mock.calls[0][0].data.lastBalance).toBe("700.0000");
      expect(mockTx.account.update.mock.calls[1][0].data.lastBalance).toBe("400.0000");
    });

    it("throws on insufficient balance (debit side = LIABILITY with low balance)", async () => {
      const debitAccount = makeAccount({ id: "acct-d", type: "LIABILITY", lastBalance: "50.0000" });
      const creditAccount = makeAccount({ id: "acct-c", type: "REVENUE", lastBalance: "1000.0000" });
      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(debitAccount).mockResolvedValueOnce(creditAccount);

      await expect(doubleEntryBook({ debitAccountId: "acct-d", creditAccountId: "acct-c", paymentId: "pay-1", amount: "100.0000", currency: "INR", description: "Overdraft" })).rejects.toThrow("Insufficient balance");
    });

    it("throws on insufficient balance (credit side = ASSET with low balance)", async () => {
      const debitAccount = makeAccount({ id: "acct-d", type: "EXPENSE", lastBalance: "1000.0000" });
      const creditAccount = makeAccount({ id: "acct-c", type: "ASSET", lastBalance: "50.0000" });
      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(debitAccount).mockResolvedValueOnce(creditAccount);

      await expect(doubleEntryBook({ debitAccountId: "acct-d", creditAccountId: "acct-c", paymentId: "pay-1", amount: "100.0000", currency: "INR", description: "Overdraft" })).rejects.toThrow("Insufficient balance");
    });

    it("acquires advisory locks for both accounts", async () => {
      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(makeAccount({ id: "acct-d", type: "ASSET" })).mockResolvedValueOnce(makeAccount({ id: "acct-c", type: "REVENUE" }));
      mockTx.ledgerEntry.create.mockResolvedValueOnce({ id: "e1" }).mockResolvedValueOnce({ id: "e2" });
      await doubleEntryBook({ debitAccountId: "acct-d", creditAccountId: "acct-c", paymentId: "pay-1", amount: "100.0000", currency: "INR", description: "Lock test" });
      expect(mockTx.$executeRawUnsafe).toHaveBeenCalled();
    });

    it("prefixes descriptions correctly", async () => {
      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(makeAccount({ id: "acct-d", type: "ASSET" })).mockResolvedValueOnce(makeAccount({ id: "acct-c", type: "REVENUE" }));
      mockTx.ledgerEntry.create.mockResolvedValueOnce({ id: "e1" }).mockResolvedValueOnce({ id: "e2" });

      await doubleEntryBook({ debitAccountId: "acct-d", creditAccountId: "acct-c", paymentId: "pay-1", amount: "50.0000", currency: "INR", description: "Payment charge: pay-1" });
      expect(mockTx.ledgerEntry.create.mock.calls[0][0].data.description).toBe("DEBIT: Payment charge: pay-1");
      expect(mockTx.ledgerEntry.create.mock.calls[1][0].data.description).toBe("CREDIT: Payment charge: pay-1");
    });
  });

  describe("createLedgerEntry", () => {
    it("creates a single ledger entry with balance update", async () => {
      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(makeAccount({ type: "ASSET", lastBalance: "500.0000" }));
      mockTx.ledgerEntry.create.mockResolvedValueOnce({ id: "entry-1", type: EntryType.DEBIT });

      const result = await createLedgerEntry({ accountId: "acct-1", paymentId: "pay-1", type: EntryType.DEBIT, amount: "100.0000", currency: "INR", description: "Manual entry" });
      expect(result.id).toBe("entry-1");
      expect(mockTx.account.update).toHaveBeenCalledWith(expect.objectContaining({ data: { lastBalance: "600.0000" } }));
    });

    it("throws on insufficient balance", async () => {
      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(makeAccount({ type: "EXPENSE", lastBalance: "30.0000" }));

      await expect(createLedgerEntry({ accountId: "acct-1", paymentId: "pay-1", type: EntryType.DEBIT, amount: "100.0000", currency: "INR", description: "" })).rejects.toThrow("Insufficient balance");
    });
  });

  describe("getAccountBalance", () => {
    it("returns the balance from the last entry", async () => {
      mockPrisma.ledgerEntry.findFirst.mockResolvedValueOnce({ balanceAfter: "750.5000" });
      expect((await getAccountBalance("acct-1")).toString()).toBe("750.5");
    });

    it("returns zero when no entries exist", async () => {
      mockPrisma.ledgerEntry.findFirst.mockResolvedValueOnce(null);
      expect((await getAccountBalance("acct-new")).toString()).toBe("0");
    });
  });

  describe("currency and description", () => {
    it("creates entries with correct currency", async () => {
      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(makeAccount({ id: "acct-1", type: "ASSET", currency: "USD" })).mockResolvedValueOnce(makeAccount({ id: "acct-2", type: "REVENUE", currency: "USD" }));
      mockTx.ledgerEntry.create.mockResolvedValueOnce({ id: "e1" }).mockResolvedValueOnce({ id: "e2" });
      await doubleEntryBook({ debitAccountId: "acct-1", creditAccountId: "acct-2", paymentId: null, amount: "50.0000", currency: "USD", description: "USD payment" });
      expect(mockTx.ledgerEntry.create.mock.calls[0][0].data.currency).toBe("USD");
    });

    it("handles multiple transactions correctly", async () => {
      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(makeAccount({ id: "acct-1", type: "ASSET", lastBalance: "1000.0000" })).mockResolvedValueOnce(makeAccount({ id: "acct-2", type: "REVENUE", lastBalance: "0.0000" }));
      mockTx.ledgerEntry.create.mockResolvedValueOnce({ id: "e1", type: EntryType.DEBIT }).mockResolvedValueOnce({ id: "e2", type: EntryType.CREDIT });
      await doubleEntryBook({ debitAccountId: "acct-1", creditAccountId: "acct-2", paymentId: "pay-1", amount: "100.0000", currency: "INR", description: "Txn 1" });
      expect(mockTx.account.update.mock.calls[0][0].data.lastBalance).toBe("1100.0000");
    });
  });
});
