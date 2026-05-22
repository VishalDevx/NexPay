import { describe, it, expect, vi, beforeEach } from "vitest";
import { EntryType } from "@prisma/client";

const mockPrisma = {
  $transaction: vi.fn((cb: any) => cb(mockTx)),
  account: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  ledgerEntry: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

const mockTx = {
  account: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  ledgerEntry: {
    create: vi.fn(),
  },
  $executeRawUnsafe: vi.fn(),
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));

const { doubleEntryBook, createLedgerEntry, getAccountBalance } = await import("../modules/ledger/ledger.service");

function makeAccount(overrides = {}) {
  return {
    id: "acct-1",
    merchantId: "merchant-1",
    type: "ASSET",
    currency: "INR",
    name: "Test Account",
    lastBalance: "1000.0000",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LedgerService", () => {
  describe("doubleEntryBook", () => {
    it("creates debit and credit entries", async () => {
      const debitAccount = makeAccount({ id: "acct-debit", type: "ASSET", lastBalance: "1000.0000" });
      const creditAccount = makeAccount({ id: "acct-credit", type: "REVENUE", lastBalance: "500.0000" });

      mockTx.account.findUniqueOrThrow
        .mockResolvedValueOnce(debitAccount)
        .mockResolvedValueOnce(creditAccount);

      mockTx.ledgerEntry.create
        .mockResolvedValueOnce({ id: "entry-debit", type: EntryType.DEBIT, amount: "100.0000", balanceAfter: "1100.0000" })
        .mockResolvedValueOnce({ id: "entry-credit", type: EntryType.CREDIT, amount: "100.0000", balanceAfter: "600.0000" });

      const result = await doubleEntryBook({
        debitAccountId: "acct-debit",
        creditAccountId: "acct-credit",
        paymentId: "pay-1",
        amount: "100.0000",
        currency: "INR",
        description: "Test payment",
      });

      expect(result.debitEntry.type).toBe(EntryType.DEBIT);
      expect(result.creditEntry.type).toBe(EntryType.CREDIT);
      expect(mockTx.ledgerEntry.create).toHaveBeenCalledTimes(2);
    });

    it("updates balances correctly", async () => {
      const debitAccount = makeAccount({ id: "acct-debit", type: "ASSET", lastBalance: "500.0000" });
      const creditAccount = makeAccount({ id: "acct-credit", type: "REVENUE", lastBalance: "200.0000" });

      mockTx.account.findUniqueOrThrow
        .mockResolvedValueOnce(debitAccount)
        .mockResolvedValueOnce(creditAccount);

      mockTx.ledgerEntry.create
        .mockResolvedValueOnce({ id: "e1", type: EntryType.DEBIT, amount: "200.0000", balanceAfter: "700.0000" })
        .mockResolvedValueOnce({ id: "e2", type: EntryType.CREDIT, amount: "200.0000", balanceAfter: "400.0000" });

      await doubleEntryBook({
        debitAccountId: "acct-debit",
        creditAccountId: "acct-credit",
        paymentId: "pay-1",
        amount: "200.0000",
        currency: "INR",
        description: "Test",
      });

      const debitUpdateCall = mockTx.account.update.mock.calls[0][0];
      const creditUpdateCall = mockTx.account.update.mock.calls[1][0];

      expect(debitUpdateCall.where.id).toBe("acct-debit");
      expect(debitUpdateCall.data.lastBalance).toBe("700.0000");
      expect(creditUpdateCall.where.id).toBe("acct-credit");
      expect(creditUpdateCall.data.lastBalance).toBe("400.0000");
    });

    it("throws on insufficient balance (debit side)", async () => {
      const debitAccount = makeAccount({ id: "acct-debit", type: "ASSET", lastBalance: "50.0000" });
      const creditAccount = makeAccount({ id: "acct-credit", type: "REVENUE", lastBalance: "1000.0000" });

      mockTx.account.findUniqueOrThrow
        .mockResolvedValueOnce(debitAccount)
        .mockResolvedValueOnce(creditAccount);

      await expect(
        doubleEntryBook({
          debitAccountId: "acct-debit",
          creditAccountId: "acct-credit",
          paymentId: "pay-1",
          amount: "100.0000",
          currency: "INR",
          description: "Overdraft",
        })
      ).rejects.toThrow("Insufficient balance");
    });

    it("throws on insufficient balance (credit/liability side)", async () => {
      const debitAccount = makeAccount({ id: "acct-debit", type: "EXPENSE", lastBalance: "1000.0000" });
      const creditAccount = makeAccount({ id: "acct-credit", type: "LIABILITY", lastBalance: "50.0000" });

      mockTx.account.findUniqueOrThrow
        .mockResolvedValueOnce(debitAccount)
        .mockResolvedValueOnce(creditAccount);

      await expect(
        doubleEntryBook({
          debitAccountId: "acct-debit",
          creditAccountId: "acct-credit",
          paymentId: "pay-1",
          amount: "100.0000",
          currency: "INR",
          description: "Overdraft",
        })
      ).rejects.toThrow("Insufficient balance");
    });

    it("acquires advisory locks for both accounts", async () => {
      const debitAccount = makeAccount({ id: "acct-debit", type: "ASSET", lastBalance: "1000.0000" });
      const creditAccount = makeAccount({ id: "acct-credit", type: "REVENUE", lastBalance: "500.0000" });

      mockTx.account.findUniqueOrThrow
        .mockResolvedValueOnce(debitAccount)
        .mockResolvedValueOnce(creditAccount);

      mockTx.ledgerEntry.create
        .mockResolvedValueOnce({ id: "e1" })
        .mockResolvedValueOnce({ id: "e2" });

      await doubleEntryBook({
        debitAccountId: "acct-debit",
        creditAccountId: "acct-credit",
        paymentId: "pay-1",
        amount: "100.0000",
        currency: "INR",
        description: "Lock test",
      });

      expect(mockTx.$executeRawUnsafe).toHaveBeenCalled();
    });

    it("prefixes descriptions correctly", async () => {
      const debitAccount = makeAccount({ id: "acct-debit", type: "ASSET", lastBalance: "1000.0000" });
      const creditAccount = makeAccount({ id: "acct-credit", type: "REVENUE", lastBalance: "500.0000" });

      mockTx.account.findUniqueOrThrow
        .mockResolvedValueOnce(debitAccount)
        .mockResolvedValueOnce(creditAccount);

      mockTx.ledgerEntry.create
        .mockResolvedValueOnce({ id: "e1" })
        .mockResolvedValueOnce({ id: "e2" });

      await doubleEntryBook({
        debitAccountId: "acct-debit",
        creditAccountId: "acct-credit",
        paymentId: "pay-1",
        amount: "50.0000",
        currency: "INR",
        description: "Payment charge: pay-1",
      });

      const debitDesc = mockTx.ledgerEntry.create.mock.calls[0][0].data.description;
      const creditDesc = mockTx.ledgerEntry.create.mock.calls[1][0].data.description;

      expect(debitDesc).toBe("DEBIT: Payment charge: pay-1");
      expect(creditDesc).toBe("CREDIT: Payment charge: pay-1");
    });
  });

  describe("createLedgerEntry", () => {
    it("creates a single ledger entry with balance update", async () => {
      const account = makeAccount({ id: "acct-1", type: "ASSET", lastBalance: "500.0000" });

      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(account);
      mockTx.ledgerEntry.create.mockResolvedValueOnce({
        id: "entry-1",
        accountId: "acct-1",
        type: EntryType.DEBIT,
        amount: "100.0000",
        balanceAfter: "600.0000",
      });

      const result = await createLedgerEntry({
        accountId: "acct-1",
        paymentId: "pay-1",
        type: EntryType.DEBIT,
        amount: "100.0000",
        currency: "INR",
        description: "Manual entry",
      });

      expect(result.id).toBe("entry-1");
      expect(mockTx.ledgerEntry.create).toHaveBeenCalledTimes(1);
      expect(mockTx.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "acct-1" },
          data: { lastBalance: "600.0000" },
        })
      );
    });

    it("throws on insufficient balance", async () => {
      const account = makeAccount({ id: "acct-1", type: "ASSET", lastBalance: "30.0000" });

      mockTx.account.findUniqueOrThrow.mockResolvedValueOnce(account);

      await expect(
        createLedgerEntry({
          accountId: "acct-1",
          paymentId: "pay-1",
          type: EntryType.DEBIT,
          amount: "100.0000",
          currency: "INR",
          description: "Overdraft",
        })
      ).rejects.toThrow("Insufficient balance");
    });
  });

  describe("getAccountBalance", () => {
    it("returns the balance from the last entry", async () => {
      mockPrisma.ledgerEntry.findFirst.mockResolvedValueOnce({
        balanceAfter: "750.5000",
      });

      const balance = await getAccountBalance("acct-1");
      expect(balance.toString()).toBe("750.5");
    });

    it("returns zero when no entries exist", async () => {
      mockPrisma.ledgerEntry.findFirst.mockResolvedValueOnce(null);

      const balance = await getAccountBalance("acct-new");
      expect(balance.toString()).toBe("0");
    });
  });

  describe("currency conversion in description", () => {
    it("creates entries with correct currency", async () => {
      const debitAccount = makeAccount({ id: "acct-1", type: "ASSET", lastBalance: "1000.0000", currency: "USD" });
      const creditAccount = makeAccount({ id: "acct-2", type: "REVENUE", lastBalance: "500.0000", currency: "USD" });

      mockTx.account.findUniqueOrThrow
        .mockResolvedValueOnce(debitAccount)
        .mockResolvedValueOnce(creditAccount);

      mockTx.ledgerEntry.create
        .mockResolvedValueOnce({ id: "e1" })
        .mockResolvedValueOnce({ id: "e2" });

      await doubleEntryBook({
        debitAccountId: "acct-1",
        creditAccountId: "acct-2",
        paymentId: null,
        amount: "50.0000",
        currency: "USD",
        description: "USD payment",
      });

      expect(mockTx.ledgerEntry.create.mock.calls[0][0].data.currency).toBe("USD");
      expect(mockTx.ledgerEntry.create.mock.calls[1][0].data.currency).toBe("USD");
    });
  });

  it("handles multiple transactions correctly", async () => {
    const debitAccount = makeAccount({ id: "acct-1", type: "ASSET", lastBalance: "1000.0000" });
    const creditAccount = makeAccount({ id: "acct-2", type: "REVENUE", lastBalance: "0.0000" });

    mockTx.account.findUniqueOrThrow
      .mockResolvedValueOnce(debitAccount)
      .mockResolvedValueOnce(creditAccount);

    mockTx.ledgerEntry.create
      .mockResolvedValueOnce({ id: "e1", type: EntryType.DEBIT })
      .mockResolvedValueOnce({ id: "e2", type: EntryType.CREDIT });

    await doubleEntryBook({
      debitAccountId: "acct-1",
      creditAccountId: "acct-2",
      paymentId: "pay-1",
      amount: "100.0000",
      currency: "INR",
      description: "Txn 1",
    });

    const debitUpdate = mockTx.account.update.mock.calls[0][0];
    expect(debitUpdate.data.lastBalance).toBe("1100.0000");
  });
});
