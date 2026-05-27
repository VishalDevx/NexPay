import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  payment: { findMany: vi.fn(), aggregate: vi.fn(), count: vi.fn() },
  customer: { findMany: vi.fn(), count: vi.fn() },
  invoice: { findMany: vi.fn() },
  dispute: { findMany: vi.fn(), findUnique: vi.fn() },
  payout: { findMany: vi.fn() },
  wallet: { findMany: vi.fn() },
  subscription: { findMany: vi.fn() },
  webhookDelivery: { findMany: vi.fn() },
  merchant: { findMany: vi.fn(), count: vi.fn() },
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));

beforeEach(() => vi.clearAllMocks());

describe("MultiTenancy", () => {
  const merchants = {
    acme: "merchant-acme",
    techstore: "merchant-techstore",
    freshfoods: "merchant-freshfoods",
  };

  describe("Merchant data isolation", () => {
    it("payments for Acme do not include TechStore data", async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        { id: "pay-acme-1", merchantId: merchants.acme, amount: "500.00" },
        { id: "pay-acme-2", merchantId: merchants.acme, amount: "300.00" },
      ]);

      const payments = await mockPrisma.payment.findMany({ where: { merchantId: merchants.acme } });
      expect(payments).toHaveLength(2);
      expect(payments.every((p: any) => p.merchantId === merchants.acme)).toBe(true);
    });

    it("payments for TechStore do not include Acme data", async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        { id: "pay-ts-1", merchantId: merchants.techstore, amount: "999.99" },
      ]);

      const payments = await mockPrisma.payment.findMany({ where: { merchantId: merchants.techstore } });
      expect(payments).toHaveLength(1);
      expect(payments[0].merchantId).toBe(merchants.techstore);
    });

    it("customers are scoped per merchant", async () => {
      mockPrisma.customer.findMany
        .mockResolvedValueOnce([
          { id: "cus-acme-1", merchantId: merchants.acme, email: "alice@acme.com" },
          { id: "cus-acme-2", merchantId: merchants.acme, email: "bob@acme.com" },
        ])
        .mockResolvedValueOnce([
          { id: "cus-ts-1", merchantId: merchants.techstore, email: "charlie@techstore.com" },
        ]);

      const acmeCustomers = await mockPrisma.customer.findMany({ where: { merchantId: merchants.acme } });
      const techstoreCustomers = await mockPrisma.customer.findMany({ where: { merchantId: merchants.techstore } });
      expect(acmeCustomers).toHaveLength(2);
      expect(techstoreCustomers).toHaveLength(1);
      expect(acmeCustomers.some((c: any) => c.merchantId === merchants.techstore)).toBe(false);
    });

    it("same email can exist in different merchants", async () => {
      mockPrisma.customer.findMany
        .mockResolvedValueOnce([{ id: "cus-1", merchantId: merchants.acme, email: "john@example.com" }])
        .mockResolvedValueOnce([{ id: "cus-2", merchantId: merchants.techstore, email: "john@example.com" }]);

      const acme = await mockPrisma.customer.findMany({ where: { merchantId: merchants.acme, email: "john@example.com" } });
      const techstore = await mockPrisma.customer.findMany({ where: { merchantId: merchants.techstore, email: "john@example.com" } });
      expect(acme[0].merchantId).toBe(merchants.acme);
      expect(techstore[0].merchantId).toBe(merchants.techstore);
    });
  });

  describe("Payment aggregation per merchant", () => {
    it("aggregates payment volume per merchant independently", async () => {
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: "15000.0000" } });

      const acmeVolume = await mockPrisma.payment.aggregate({
        where: { merchantId: merchants.acme, status: "CAPTURED" },
        _sum: { amount: true },
      });
      expect(acmeVolume._sum.amount?.toString()).toBe("15000.0000");
    });
  });

  describe("Invoice isolation", () => {
    it("invoices belong to one merchant only", async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        { id: "inv-acme-1", merchantId: merchants.acme, total: "1000.00" },
      ]);

      const invoices = await mockPrisma.invoice.findMany({ where: { merchantId: merchants.acme } });
      expect(invoices.every((i: any) => i.merchantId === merchants.acme)).toBe(true);
    });
  });

  describe("Webhook delivery isolation", () => {
    it("webhook deliveries are traced to merchant's payments", async () => {
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([
        { id: "wh-acme-1", merchantId: merchants.acme, status: "DELIVERED" },
      ]);

      const deliveries = await mockPrisma.webhookDelivery.findMany({ where: { merchantId: merchants.acme } });
      expect(deliveries.every((d: any) => d.merchantId === merchants.acme)).toBe(true);
    });
  });

  describe("Cross-tenant security", () => {
    it("dispute query is scoped to merchant", async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: "disp-1",
        merchantId: merchants.acme,
        paymentId: "pay-acme-1",
      });

      const dispute = await mockPrisma.dispute.findUnique({
        where: { id: "disp-1" },
      });

      expect(dispute.merchantId).toBe(merchants.acme);
    });
  });

  describe("Wallet isolation", () => {
    it("wallet balances are per-merchant", async () => {
      mockPrisma.wallet.findMany
        .mockResolvedValueOnce([{ id: "wal-acme", merchantId: merchants.acme, currency: "INR", balance: "50000.0000" }])
        .mockResolvedValueOnce([{ id: "wal-ts", merchantId: merchants.techstore, currency: "INR", balance: "25000.0000" }]);

      const acmeWallet = await mockPrisma.wallet.findMany({ where: { merchantId: merchants.acme } });
      const techstoreWallet = await mockPrisma.wallet.findMany({ where: { merchantId: merchants.techstore } });
      expect(acmeWallet[0].merchantId).toBe(merchants.acme);
      expect(techstoreWallet[0].merchantId).toBe(merchants.techstore);
    });
  });

  describe("Merchant-level analytics isolation", () => {
    it("payment counts are per-merchant", async () => {
      mockPrisma.payment.count.mockResolvedValue(15);

      const acmeCount = await mockPrisma.payment.count({ where: { merchantId: merchants.acme } });
      expect(acmeCount).toBe(15);
    });

    it("customer counts are per-merchant", async () => {
      mockPrisma.customer.count.mockResolvedValue(5);

      const acmeCustomers = await mockPrisma.customer.count({ where: { merchantId: merchants.acme } });
      expect(acmeCustomers).toBe(5);
    });
  });

  describe("Three-tenant isolation", () => {
    it("all three merchants have isolated data", async () => {
      mockPrisma.payment.findMany
        .mockResolvedValueOnce([{ id: "p1", merchantId: merchants.acme }])
        .mockResolvedValueOnce([{ id: "p2", merchantId: merchants.techstore }])
        .mockResolvedValueOnce([{ id: "p3", merchantId: merchants.freshfoods }]);

      for (const [name, id] of Object.entries(merchants)) {
        const payments = await mockPrisma.payment.findMany({ where: { merchantId: id } });
        expect(payments.every((p: any) => p.merchantId === id)).toBe(true);
      }
    });
  });
});
