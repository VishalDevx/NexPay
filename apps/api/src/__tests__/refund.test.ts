import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTx = {
  refund: { create: vi.fn() },
  payment: { update: vi.fn() },
  paymentEvent: { create: vi.fn() },
  reserveConfig: { findUnique: vi.fn(), update: vi.fn() },
  account: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  ledgerEntry: { create: vi.fn() },
};

const mockPrisma = {
  $transaction: vi.fn((cb: any) => cb(mockTx)),
  refund: { create: vi.fn() },
  payment: { findUnique: vi.fn(), update: vi.fn() },
  paymentEvent: { create: vi.fn() },
  reserveConfig: { findUnique: vi.fn(), update: vi.fn() },
};

const mockLedgerRepo = { getOrCreateAccounts: vi.fn() };
const mockDoubleEntryBook = vi.fn();
const mockGlService = { createEntry: vi.fn().mockResolvedValue({ id: "gl-1" }) };

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../modules/ledger/ledger.repo", () => ({ ledgerRepo: mockLedgerRepo }));
vi.mock("../modules/ledger/ledger.service", () => ({ doubleEntryBook: mockDoubleEntryBook }));
vi.mock("../modules/general-ledger/gl.service", () => ({ glService: mockGlService }));

const { PaymentStatus } = await import("@prisma/client");

function makePayment(overrides = {}) {
  return {
    id: "pay-1",
    merchantId: "merchant-1",
    amount: "500.0000",
    amountRefunded: "0.0000",
    currency: "INR",
    status: PaymentStatus.CAPTURED,
    metadata: { fee: "15.0000", netAmount: "485.0000" },
    ...overrides,
  };
}

const accts = { assetAccount: { id: "asset-1" }, revenueAccount: { id: "revenue-1" }, liabilityAccount: { id: "liability-1" } };

beforeEach(() => vi.clearAllMocks());

describe("RefundFlow", () => {
  async function callRefund(pid = "pay-1", amount?: string, reason?: string) {
    const mod = await import("../modules/payments/payment.service");
    return mod.paymentService.refund(pid, amount, reason);
  }

  it("performs full refund of captured payment", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment());
    mockTx.refund.create.mockResolvedValue({ id: "refund-1", paymentId: "pay-1", amount: "500.0000", status: "SUCCEEDED" });
    mockLedgerRepo.getOrCreateAccounts.mockResolvedValue(accts);

    const result = await callRefund();
    expect(result.status).toBe("SUCCEEDED");
  });

  it("performs partial refund", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment({ amount: "1000.0000" }));
    mockTx.refund.create.mockResolvedValue({ id: "refund-1", amount: "200.0000", status: "SUCCEEDED" });
    mockLedgerRepo.getOrCreateAccounts.mockResolvedValue(accts);

    const result = await callRefund("pay-1", "200.0000");
    expect(result.status).toBe("SUCCEEDED");
    expect(mockTx.refund.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: "200.0000" }) }));
  });

  it("allows refund of settled payment", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment({ status: PaymentStatus.SETTLED }));
    mockTx.refund.create.mockResolvedValue({ id: "refund-1", amount: "500.0000", status: "SUCCEEDED" });
    mockLedgerRepo.getOrCreateAccounts.mockResolvedValue(accts);

    const result = await callRefund();
    expect(result.status).toBe("SUCCEEDED");
  });

  it("throws when refund amount exceeds payment amount", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment({ amount: "100.0000" }));
    await expect(callRefund("pay-1", "200.0000")).rejects.toThrow("exceeds available balance");
  });

  it("throws when refunding a failed payment", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment({ status: PaymentStatus.FAILED }));
    await expect(callRefund()).rejects.toThrow("Can only refund captured or settled payments");
  });

  it("throws when refunding an already fully refunded payment (REFUNDED is terminal)", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment({ status: PaymentStatus.REFUNDED, amountRefunded: "500.0000" }));
    await expect(callRefund("pay-1", "100.0000")).rejects.toThrow("Can only refund captured or settled payments");
  });

  it("allows multiple partial refunds up to total amount", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment({ amount: "500.0000", amountRefunded: "300.0000" }));
    mockTx.refund.create.mockResolvedValue({ id: "refund-2", amount: "200.0000", status: "SUCCEEDED" });
    mockLedgerRepo.getOrCreateAccounts.mockResolvedValue(accts);

    const result = await callRefund("pay-1", "200.0000");
    expect(result.status).toBe("SUCCEEDED");
  });

  it("refund with reason stores the reason", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment());
    mockTx.refund.create.mockResolvedValue({ id: "refund-1", amount: "500.0000", status: "SUCCEEDED" });
    mockLedgerRepo.getOrCreateAccounts.mockResolvedValue(accts);

    await callRefund("pay-1", "500.0000", "Customer requested cancellation");
    expect(mockTx.refund.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reason: "Customer requested cancellation" }) }));
  });

  it("creates double entry book reversal", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment());
    mockTx.refund.create.mockResolvedValue({ id: "refund-1", amount: "500.0000", status: "SUCCEEDED" });
    mockLedgerRepo.getOrCreateAccounts.mockResolvedValue(accts);

    await callRefund();
    expect(mockDoubleEntryBook).toHaveBeenCalledWith(expect.objectContaining({ debitAccountId: "revenue-1", creditAccountId: "asset-1" }));
  });

  it("full refund transitions payment to REFUNDED status", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment());
    mockTx.refund.create.mockResolvedValue({ id: "refund-1", amount: "500.0000", status: "SUCCEEDED" });
    mockLedgerRepo.getOrCreateAccounts.mockResolvedValue(accts);

    await callRefund();
    const updateCall = mockTx.payment.update.mock.calls.find((c: any) => c[0].where.id === "pay-1");
    expect(updateCall[0].data.status).toBe(PaymentStatus.REFUNDED);
  });

  it("partial refund does not change payment status", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(makePayment({ amount: "1000.0000" }));
    mockTx.refund.create.mockResolvedValue({ id: "refund-1", amount: "200.0000", status: "SUCCEEDED" });
    mockLedgerRepo.getOrCreateAccounts.mockResolvedValue(accts);

    await callRefund("pay-1", "200.0000");
    const updateCall = mockTx.payment.update.mock.calls.find((c: any) => c[0].where.id === "pay-1");
    expect(updateCall[0].data.status).toBe(PaymentStatus.CAPTURED);
  });
});
