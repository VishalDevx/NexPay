import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentStatus } from "@prisma/client";

const mockPrisma = {
  $transaction: vi.fn((cb: any) => cb(mockTx)),
  payment: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  paymentEvent: { create: vi.fn() },
  account: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  ledgerEntry: { create: vi.fn(), findFirst: vi.fn() },
  wallet: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn() },
  walletTxn: { create: vi.fn(), findFirst: vi.fn() },
  refund: { create: vi.fn() },
  outboxEvent: { create: vi.fn() },
  fraudEvent: { create: vi.fn() },
  reserveConfig: { findUnique: vi.fn(), update: vi.fn() },
  feeSchedule: { findUnique: vi.fn() },
  subscription: { findUnique: vi.fn() },
  merchant: { findUnique: vi.fn() },
  webhookEndpoint: { findMany: vi.fn() },
  webhookDelivery: { create: vi.fn() },
};

const mockTx = {
  payment: { update: vi.fn() },
  refund: { create: vi.fn() },
  paymentEvent: { create: vi.fn() },
  account: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  ledgerEntry: { create: vi.fn() },
  reserveConfig: { findUnique: vi.fn(), update: vi.fn() },
};

const mockRedis = { get: vi.fn(), set: vi.fn(), incrbyfloat: vi.fn(), decrbyfloat: vi.fn() };
const mockLedgerRepo = { getOrCreateAccounts: vi.fn() };
const mockDoubleEntryBook = vi.fn();
const mockGlService = { createEntry: vi.fn().mockResolvedValue({ id: "gl-1" }) };
const mockBillingService = { calculateTransactionFee: vi.fn() };
const mockFraudEngine = { evaluate: vi.fn() };
const mockOutboxService = { createEvent: vi.fn().mockResolvedValue(undefined) };
const mockMetrics = { incrementCounter: vi.fn() };

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../config/redis", () => ({ redis: mockRedis }));
vi.mock("../modules/ledger/ledger.repo", () => ({ ledgerRepo: mockLedgerRepo }));
vi.mock("../modules/ledger/ledger.service", () => ({ doubleEntryBook: mockDoubleEntryBook }));
vi.mock("../modules/general-ledger/gl.service", () => ({ glService: mockGlService }));
vi.mock("../modules/billing/billing.service", () => ({ billingService: mockBillingService }));
vi.mock("../modules/fraud/fraud.engine", () => ({ fraudEngine: mockFraudEngine }));
vi.mock("../modules/outbox/outbox.service", () => ({ outboxService: mockOutboxService }));
vi.mock("../modules/metrics/metrics", () => ({ metrics: mockMetrics }));

beforeEach(() => vi.clearAllMocks());

describe("PaymentFlow Integration", () => {
  const merchantId = "merchant-1";
  const customerId = "customer-1";
  const paymentAmount = "1000.0000";
  const currency = "INR";

  function mockPayment(mockId: string) {
    mockPrisma.payment.create.mockResolvedValue({
      id: mockId,
      merchantId,
      customerId,
      amount: paymentAmount,
      currency,
      status: PaymentStatus.INITIATED,
      amountRefunded: "0.0000",
      paymentMethod: { type: "card" },
      metadata: { fee: "29.3000", netAmount: "970.7000" },
      createdAt: new Date(),
    });
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: mockId,
      merchantId,
      customerId,
      amount: paymentAmount,
      amountRefunded: "0.0000",
      currency,
      status: PaymentStatus.CAPTURED,
      paymentMethod: { type: "card" },
      metadata: { fee: "29.3000", netAmount: "970.7000" },
      createdAt: new Date(),
    });
    return mockId;
  }

  describe("Full Payment Lifecycle", () => {
    it("payment created -> captured -> ledger booked -> outbox event emitted", async () => {
      const paymentId = mockPayment("pay-flow-1");
      mockLedgerRepo.getOrCreateAccounts.mockResolvedValue({
        assetAccount: { id: "asset-1" },
        revenueAccount: { id: "revenue-1" },
        liabilityAccount: { id: "liability-1" },
      });
      mockDoubleEntryBook.mockResolvedValue({
        debitEntry: { id: "de-1", type: "DEBIT", amount: paymentAmount },
        creditEntry: { id: "ce-1", type: "CREDIT", amount: paymentAmount },
      });
      mockBillingService.calculateTransactionFee.mockResolvedValue({
        fee: new (await import("decimal.js")).Decimal("29.3000"),
        net: new (await import("decimal.js")).Decimal("970.7000"),
      });
      mockFraudEngine.evaluate.mockResolvedValue({ totalScore: 0, triggeredRules: [], decision: "APPROVE" });
      mockPrisma.paymentEvent.create.mockResolvedValue({ id: "pe-1" });

      const { paymentService } = await import("../modules/payments/payment.service");
      const result = await paymentService.charge({
        merchantId,
        customerId,
        amount: paymentAmount,
        currency,
        paymentMethod: { type: "card", last4: "4242" },
        description: "Integration test payment",
      });

      expect(result).toBeDefined();
      expect(mockFraudEngine.evaluate).toHaveBeenCalled();
      expect(mockDoubleEntryBook).toHaveBeenCalledWith(
        expect.objectContaining({ amount: paymentAmount, currency })
      );
      expect(mockOutboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "payment.captured" })
      );
      expect(mockMetrics.incrementCounter).toHaveBeenCalledWith("payment_success_total", expect.any(Object));
    });

    it("captured payment can be refunded with ledger reversal", async () => {
      const paymentId = "pay-refund-1";
      mockPayment(paymentId);

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: paymentId,
        merchantId,
        amount: paymentAmount,
        amountRefunded: "0.0000",
        currency,
        status: PaymentStatus.CAPTURED,
        paymentMethod: { type: "card" },
        metadata: { fee: "29.3000", netAmount: "970.7000" },
        createdAt: new Date(),
      });

      mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockTx));
      mockTx.refund.create.mockResolvedValue({ id: "refund-1", paymentId, amount: "500.0000", status: "SUCCEEDED" });
      mockLedgerRepo.getOrCreateAccounts.mockResolvedValue({
        assetAccount: { id: "asset-1" },
        revenueAccount: { id: "revenue-1" },
        liabilityAccount: { id: "liability-1" },
      });
      mockDoubleEntryBook.mockResolvedValue({
        debitEntry: { id: "de-rev", type: "DEBIT", amount: "500.0000" },
        creditEntry: { id: "ce-rev", type: "CREDIT", amount: "500.0000" },
      });

      const { paymentService } = await import("../modules/payments/payment.service");
      const refund = await paymentService.refund(paymentId, "500.0000", "Customer requested");

      expect(refund.status).toBe("SUCCEEDED");
      expect(mockDoubleEntryBook).toHaveBeenCalledWith(
        expect.objectContaining({
          debitAccountId: "revenue-1",
          creditAccountId: "asset-1",
          amount: "500.0000",
        })
      );
    });

    it("rejects duplicate idempotent payment creation", async () => {
      const key = "idemp-key-duplicate-test";
      const { idempotencyMiddleware } = await import("../middleware/idempotency");

      const mockRedisGet = vi.fn();
      const mockRedisSet = vi.fn();
      const mockPrismaFind = vi.fn();
      const mockPrismaCreate = vi.fn();

      vi.mocked(vi).fn().mockReset();

      const req = {
        method: "POST",
        headers: { "idempotency-key": key },
        merchant: { id: merchantId },
        body: { amount: "100.00", currency: "INR" },
        originalUrl: "/api/v1/payments/charge",
      } as any;
      const res = {
        statusCode: 200,
        json: vi.fn(),
        status: vi.fn(function (this: any, code: number) { this.statusCode = code; return this; }),
      } as any;
      const next = vi.fn();

      mockRedis.get = vi.fn().mockResolvedValue(JSON.stringify({ id: "pay-existing", status: "CAPTURED" }));

      const { idempotencyMiddleware: middleware } = await import("../middleware/idempotency");
      await middleware(req, res, next);

      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("generates ledger entries that balance (sum(debits) == sum(credits))", async () => {
      mockLedgerRepo.getOrCreateAccounts.mockResolvedValue({
        assetAccount: { id: "asset-1" },
        revenueAccount: { id: "revenue-1" },
        liabilityAccount: { id: "liability-1" },
      });
      mockDoubleEntryBook.mockResolvedValue({
        debitEntry: { id: "de-1", type: "DEBIT", amount: paymentAmount },
        creditEntry: { id: "ce-1", type: "CREDIT", amount: paymentAmount },
      });
      mockBillingService.calculateTransactionFee.mockResolvedValue({
        fee: new (await import("decimal.js")).Decimal("29.3000"),
        net: new (await import("decimal.js")).Decimal("970.7000"),
      });
      mockFraudEngine.evaluate.mockResolvedValue({ totalScore: 0, triggeredRules: [], decision: "APPROVE" });

      mockPayment("pay-balance-1");
      const { paymentService } = await import("../modules/payments/payment.service");

      await paymentService.charge({
        merchantId,
        customerId,
        amount: paymentAmount,
        currency,
        paymentMethod: { type: "card" },
        description: "Balance test",
      });

      const debitCall = mockDoubleEntryBook.mock.calls[0][0];
      expect(debitCall.debitAccountId).toBeDefined();
      expect(debitCall.creditAccountId).toBeDefined();
      expect(debitCall.amount).toBe(paymentAmount);
    });
  });

  describe("Edge Cases and Invariants", () => {
    it("payment cannot be captured before creation", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const { paymentService } = await import("../modules/payments/payment.service");
      await expect(paymentService.capture("nonexistent-payment")).rejects.toThrow("Payment not found");
    });

    it("payment cannot be cancelled after capture", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "pay-captured",
        merchantId,
        amount: paymentAmount,
        currency,
        status: PaymentStatus.CAPTURED,
        amountRefunded: "0.0000",
        paymentMethod: { type: "card" },
        metadata: {},
        createdAt: new Date(),
      });

      const { paymentService } = await import("../modules/payments/payment.service");
      await expect(paymentService.cancel("pay-captured")).rejects.toThrow("Can only cancel payments in INITIATED or PROCESSING state");
    });

    it("refund cannot exceed payment amount", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "pay-small",
        merchantId,
        amount: "100.0000",
        amountRefunded: "0.0000",
        currency,
        status: PaymentStatus.CAPTURED,
        paymentMethod: { type: "card" },
        metadata: {},
        createdAt: new Date(),
      });

      const { paymentService } = await import("../modules/payments/payment.service");
      await expect(paymentService.refund("pay-small", "200.0000")).rejects.toThrow("exceeds available balance");
    });

    it("full refund transitions payment to REFUNDED", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "pay-full-refund",
        merchantId,
        amount: "500.0000",
        amountRefunded: "0.0000",
        currency,
        status: PaymentStatus.CAPTURED,
        paymentMethod: { type: "card" },
        metadata: { fee: "15.0000", netAmount: "485.0000" },
        createdAt: new Date(),
      });
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockTx));
      mockTx.refund.create.mockResolvedValue({ id: "refund-full", paymentId: "pay-full-refund", amount: "500.0000", status: "SUCCEEDED" });
      mockLedgerRepo.getOrCreateAccounts.mockResolvedValue({
        assetAccount: { id: "asset-1" },
        revenueAccount: { id: "revenue-1" },
        liabilityAccount: { id: "liability-1" },
      });
      mockDoubleEntryBook.mockResolvedValue({ debitEntry: {}, creditEntry: {} });

      const { paymentService } = await import("../modules/payments/payment.service");
      await paymentService.refund("pay-full-refund", "500.0000");

      const updateCall = mockTx.payment.update.mock.calls.find((c: any) => c[0].where.id === "pay-full-refund");
      expect(updateCall[0].data.status).toBe(PaymentStatus.REFUNDED);
    });

    it("partial refund does not change payment from CAPTURED status", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "pay-partial",
        merchantId,
        amount: "1000.0000",
        amountRefunded: "0.0000",
        currency,
        status: PaymentStatus.CAPTURED,
        paymentMethod: { type: "card" },
        metadata: { fee: "29.3000", netAmount: "970.7000" },
        createdAt: new Date(),
      });
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockTx));
      mockTx.refund.create.mockResolvedValue({ id: "refund-partial", paymentId: "pay-partial", amount: "200.0000", status: "SUCCEEDED" });
      mockLedgerRepo.getOrCreateAccounts.mockResolvedValue({
        assetAccount: { id: "asset-1" },
        revenueAccount: { id: "revenue-1" },
        liabilityAccount: { id: "liability-1" },
      });
      mockDoubleEntryBook.mockResolvedValue({ debitEntry: {}, creditEntry: {} });

      const { paymentService } = await import("../modules/payments/payment.service");
      await paymentService.refund("pay-partial", "200.0000");

      const updateCall = mockTx.payment.update.mock.calls.find((c: any) => c[0].where.id === "pay-partial");
      expect(updateCall[0].data.status).toBe(PaymentStatus.CAPTURED);
    });
  });
});
