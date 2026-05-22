import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
  sadd: vi.fn(),
  smembers: vi.fn(),
};

const mockPrisma = {
  payment: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  merchant: {
    findUnique: vi.fn(),
  },
  fraudEvent: {
    create: vi.fn(),
  },
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../config/redis", () => ({ redis: mockRedis }));

const { fraudEngine } = await import("../modules/fraud/fraud.engine");

beforeEach(() => {
  vi.clearAllMocks();
});

function makeInput(overrides = {}) {
  return {
    paymentId: "pay-1",
    merchantId: "merchant-1",
    amount: "1000.00",
    currency: "USD",
    paymentMethod: { billing_address: { country: "US" } },
    metadata: { device_fingerprint: "device-abc" },
    ...overrides,
  };
}

describe("FraudEngine", () => {
  describe("Transaction Velocity Check", () => {
    it("triggers when more than 5 transactions in 60s window", async () => {
      mockRedis.incr.mockResolvedValue(6);
      mockRedis.expire.mockResolvedValue(true);

      const result = await fraudEngine.evaluate(makeInput());
      const velocityRule = result.triggeredRules.find((r) => r.ruleId === "velocity_check");
      expect(velocityRule).toBeDefined();
      expect(velocityRule!.triggered).toBe(true);
      expect(velocityRule!.score).toBe(30);
    });

    it("does not trigger when under the velocity limit", async () => {
      mockRedis.incr.mockResolvedValue(3);
      mockRedis.expire.mockResolvedValue(true);

      const result = await fraudEngine.evaluate(makeInput());
      const velocityRule = result.triggeredRules.find((r) => r.ruleId === "velocity_check");
      expect(velocityRule).toBeUndefined();
    });
  });

  describe("Geographic Anomaly", () => {
    it("triggers when country differs from last payment", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        paymentMethod: { billing_address: { country: "IN" } },
      });

      const result = await fraudEngine.evaluate(makeInput());
      const geoRule = result.triggeredRules.find((r) => r.ruleId === "geo_anomaly");
      expect(geoRule).toBeDefined();
      expect(geoRule!.triggered).toBe(true);
      expect(geoRule!.reason).toBe("Transaction from unusual location");
    });

    it("does not trigger when country matches last payment", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        paymentMethod: { billing_address: { country: "US" } },
      });

      const result = await fraudEngine.evaluate(makeInput());
      const geoRule = result.triggeredRules.find((r) => r.ruleId === "geo_anomaly");
      expect(geoRule).toBeUndefined();
    });
  });

  describe("Amount Deviation", () => {
    it("triggers when amount > 3x average of last 20 payments", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          amount: "100.00",
        }))
      );

      const result = await fraudEngine.evaluate(makeInput({ amount: "5000.00" }));
      const amountRule = result.triggeredRules.find((r) => r.ruleId === "amount_deviation");
      expect(amountRule).toBeDefined();
      expect(amountRule!.triggered).toBe(true);
    });

    it("does not trigger when fewer than 3 previous payments", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 2 }, (_, i) => ({
          amount: "100.00",
        }))
      );

      const result = await fraudEngine.evaluate(makeInput({ amount: "5000.00" }));
      const amountRule = result.triggeredRules.find((r) => r.ruleId === "amount_deviation");
      expect(amountRule).toBeUndefined();
    });
  });

  describe("Device Fingerprint Mismatch", () => {
    it("triggers when device fingerprint is unknown", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockRedis.smembers.mockResolvedValue(["device-xyz", "device-123"]);
      mockPrisma.payment.findFirst.mockResolvedValue({ paymentMethod: null });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({ amount: "100.00" }))
      );

      const result = await fraudEngine.evaluate(makeInput());
      const deviceRule = result.triggeredRules.find((r) => r.ruleId === "device_fingerprint_mismatch");
      expect(deviceRule).toBeDefined();
      expect(deviceRule!.triggered).toBe(true);
    });

    it("does not trigger when device fingerprint is known", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockRedis.smembers.mockResolvedValue(["device-abc"]);
      mockPrisma.payment.findFirst.mockResolvedValue({ paymentMethod: null });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({ amount: "100.00" }))
      );

      const result = await fraudEngine.evaluate(makeInput());
      const deviceRule = result.triggeredRules.find((r) => r.ruleId === "device_fingerprint_mismatch");
      expect(deviceRule).toBeUndefined();
    });
  });

  describe("New Account Transaction", () => {
    it("triggers for account less than 1 hour old", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.merchant.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 300000),
      });
      mockPrisma.payment.findFirst.mockResolvedValue({ paymentMethod: null });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({ amount: "100.00" }))
      );

      const result = await fraudEngine.evaluate(makeInput());
      const accountRule = result.triggeredRules.find((r) => r.ruleId === "new_account");
      expect(accountRule).toBeDefined();
      expect(accountRule!.triggered).toBe(true);
    });

    it("does not trigger for accounts older than 1 hour", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.merchant.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 7200000),
      });
      mockPrisma.payment.findFirst.mockResolvedValue({ paymentMethod: { billing_address: { country: "US" } } });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({ amount: "100.00" }))
      );
      mockRedis.smembers.mockResolvedValue(["device-abc"]);

      const result = await fraudEngine.evaluate(makeInput());
      const accountRule = result.triggeredRules.find((r) => r.ruleId === "new_account");
      expect(accountRule).toBeUndefined();
    });
  });

  describe("High Risk Currency", () => {
    it.each(["BTC", "ETH", "USDT"])("triggers for %s currency", async (currency) => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({ paymentMethod: null });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({ amount: "100.00" }))
      );

      const result = await fraudEngine.evaluate(makeInput({ currency }));
      const currencyRule = result.triggeredRules.find((r) => r.ruleId === "high_risk_currency");
      expect(currencyRule).toBeDefined();
      expect(currencyRule!.triggered).toBe(true);
    });

    it("does not trigger for fiat currencies", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({ paymentMethod: { billing_address: { country: "US" } } });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({ amount: "100.00" }))
      );
      mockRedis.smembers.mockResolvedValue(["device-abc"]);
      mockPrisma.merchant.findUnique.mockResolvedValue({ createdAt: new Date(Date.now() - 7200000) });

      const result = await fraudEngine.evaluate(makeInput({ currency: "USD" }));
      const currencyRule = result.triggeredRules.find((r) => r.ruleId === "high_risk_currency");
      expect(currencyRule).toBeUndefined();
    });
  });

  describe("Score Accumulation and Decision", () => {
    it("returns APPROVE when total score < 50", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({ paymentMethod: { billing_address: { country: "US" } } });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({ amount: "100.00" }))
      );
      mockRedis.smembers.mockResolvedValue(["device-abc"]);
      mockPrisma.merchant.findUnique.mockResolvedValue({ createdAt: new Date(Date.now() - 7200000) });

      const result = await fraudEngine.evaluate(makeInput({ currency: "USD" }));
      expect(result.totalScore).toBeLessThan(50);
      expect(result.decision).toBe("APPROVE");
    });

    it("returns REVIEW when score >= 50 and < 80", async () => {
      mockRedis.incr.mockResolvedValue(6);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        paymentMethod: { billing_address: { country: "IN" } },
      });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({ amount: "100.00" }))
      );

      const result = await fraudEngine.evaluate(makeInput({ amount: "5000.00" }));
      expect(result.totalScore).toBeGreaterThanOrEqual(50);
      expect(result.decision).toBe("REVIEW");
    });

    it("returns DECLINE when score >= 80", async () => {
      mockRedis.incr.mockResolvedValue(6);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        paymentMethod: { billing_address: { country: "IN" } },
      });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({ amount: "100.00" }))
      );
      mockRedis.smembers.mockResolvedValue(["device-xyz", "device-789"]);
      mockPrisma.merchant.findUnique.mockResolvedValue({ createdAt: new Date(Date.now() - 300000) });

      const result = await fraudEngine.evaluate(
        makeInput({ amount: "5000.00", currency: "BTC" })
      );
      expect(result.totalScore).toBeGreaterThanOrEqual(80);
      expect(result.decision).toBe("DECLINE");
    });
  });

  describe("Fraud Event Logging", () => {
    it("logs fraud event for each triggered rule", async () => {
      mockRedis.incr.mockResolvedValue(6);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        paymentMethod: { billing_address: { country: "IN" } },
      });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({ amount: "100.00" }))
      );

      await fraudEngine.evaluate(makeInput());

      expect(mockPrisma.fraudEvent.create).toHaveBeenCalled();
      const eventData = mockPrisma.fraudEvent.create.mock.calls[0][0].data;
      expect(eventData.paymentId).toBe("pay-1");
      expect(eventData.triggered).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("handles missing metadata gracefully", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({ paymentMethod: null });
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({ amount: "100.00" }))
      );

      const result = await fraudEngine.evaluate(makeInput({ metadata: {} }));
      expect(result.totalScore).toBe(0);
      expect(result.decision).toBe("APPROVE");
    });

    it("handles missing paymentMethod", async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({ amount: "100.00" }))
      );

      const result = await fraudEngine.evaluate(
        makeInput({ paymentMethod: undefined, amount: "50.00", currency: "EUR" })
      );
      expect(result.decision).toBe("APPROVE");
    });
  });
});
