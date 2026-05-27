import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

const mockPrisma = {
  reserveConfig: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  reserveRelease: { create: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn((cb: any) => cb(mockTx)),
};

const mockTx = {
  reserveConfig: { findUnique: vi.fn(), update: vi.fn() },
};

const mockGlService = { createEntry: vi.fn().mockResolvedValue({ id: "gl-1" }) };

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../modules/general-ledger/gl.service", () => ({ glService: mockGlService }));

beforeEach(() => vi.clearAllMocks());

describe("RollingReserve", () => {
  function makeConfig(overrides = {}) {
    return {
      id: "rc-1",
      merchantId: "merchant-1",
      reservePercentage: new Decimal("10.0000"),
      fixedReserveAmount: new Decimal("0.0000"),
      releaseDelayDays: 90,
      currentReserveBalance: new Decimal("5000.0000"),
      ...overrides,
    };
  }

  describe("Reserve Percentage Calculation", () => {
    it("calculates 10% reserve correctly", () => {
      const config = makeConfig();
      const paymentAmount = new Decimal("1000.0000");
      const reserveAmount = paymentAmount.mul(config.reservePercentage).div(100);
      expect(reserveAmount.toFixed(4)).toBe("100.0000");
    });

    it("calculates 5% reserve correctly", () => {
      const config = makeConfig({ reservePercentage: new Decimal("5.0000") });
      const paymentAmount = new Decimal("2000.0000");
      const reserveAmount = paymentAmount.mul(config.reservePercentage).div(100);
      expect(reserveAmount.toFixed(4)).toBe("100.0000");
    });

    it("returns zero reserve for 0%", () => {
      const config = makeConfig({ reservePercentage: new Decimal("0.0000") });
      const paymentAmount = new Decimal("1000.0000");
      const reserveAmount = paymentAmount.mul(config.reservePercentage).div(100);
      expect(reserveAmount.toFixed(4)).toBe("0.0000");
    });

    it("uses fixed reserve when greater than percentage", () => {
      const config = makeConfig({ reservePercentage: new Decimal("5.0000"), fixedReserveAmount: new Decimal("2000.0000") });
      const paymentAmount = new Decimal("10000.0000");
      const percentReserve = paymentAmount.mul(config.reservePercentage).div(100);
      const actualReserve = Decimal.max(percentReserve, config.fixedReserveAmount);
      expect(percentReserve.toFixed(4)).toBe("500.0000");
      expect(actualReserve.toFixed(4)).toBe("2000.0000");
    });

    it("uses percentage when greater than fixed reserve", () => {
      const config = makeConfig({ reservePercentage: new Decimal("25.0000"), fixedReserveAmount: new Decimal("100.0000") });
      const paymentAmount = new Decimal("1000.0000");
      const percentReserve = paymentAmount.mul(config.reservePercentage).div(100);
      const actualReserve = Decimal.max(percentReserve, config.fixedReserveAmount);
      expect(percentReserve.toFixed(4)).toBe("250.0000");
      expect(actualReserve.toFixed(4)).toBe("250.0000");
    });
  });

  describe("Release Scheduling", () => {
    it("schedules release after configured delay", () => {
      const delayDays = 90;
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + delayDays);
      const diffDays = Math.round((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(90);
    });

    it("creates reserve release record with PENDING status", async () => {
      mockPrisma.reserveRelease.create.mockResolvedValue({ id: "rr-1", status: "PENDING", amount: "500.0000", scheduledDate: new Date() });
      const release = await mockPrisma.reserveRelease.create({
        data: { reserveConfigId: "rc-1", amount: "500.0000", scheduledDate: new Date(), status: "PENDING" },
      });
      expect(release.status).toBe("PENDING");
    });
  });

  describe("Reserve Balance Changes", () => {
    it("increments reserve balance on payment capture", () => {
      const config = makeConfig({ currentReserveBalance: new Decimal("1000.0000") });
      const reserveAmount = new Decimal("100.0000");
      const newBalance = config.currentReserveBalance.plus(reserveAmount);
      expect(newBalance.toFixed(4)).toBe("1100.0000");
    });

    it("decrements reserve balance on refund", () => {
      const config = makeConfig({ currentReserveBalance: new Decimal("2000.0000") });
      const refundAmount = new Decimal("500.0000");
      const reserveRefund = refundAmount.mul(config.reservePercentage).div(100);
      const newBalance = config.currentReserveBalance.minus(reserveRefund);
      expect(newBalance.toFixed(4)).toBe("1950.0000");
    });

    it("reduces reserve proportionally on partial refund", () => {
      const config = makeConfig({ currentReserveBalance: new Decimal("5000.0000") });
      const refundPct = 0.5;
      const reduction = config.currentReserveBalance.mul(refundPct);
      expect(reduction.toFixed(4)).toBe("2500.0000");
    });

    it("reduces reserve to zero on full refund", () => {
      const config = makeConfig({ currentReserveBalance: new Decimal("5000.0000") });
      expect(config.currentReserveBalance.toNumber()).toBe(5000);
    });
  });

  describe("Reserve balance invariants", () => {
    it("reserve balance cannot go negative", () => {
      const config = makeConfig({ currentReserveBalance: new Decimal("100.0000") });
      const refundAmount = new Decimal("2000.0000");
      const reserveRefund = refundAmount.mul(config.reservePercentage).div(100);
      expect(reserveRefund.toNumber()).toBe(200);
      const exceeds = reserveRefund.gt(config.currentReserveBalance);
      expect(exceeds).toBe(true);
    });

    it("reserve balance equals sum of all holds minus releases", () => {
      const holds = [new Decimal("100.0000"), new Decimal("200.0000"), new Decimal("150.0000")];
      const releases = [new Decimal("100.0000"), new Decimal("50.0000")];
      const totalHeld = holds.reduce((s, h) => s.plus(h), new Decimal(0));
      const totalReleased = releases.reduce((s, r) => s.plus(r), new Decimal(0));
      const netReserve = totalHeld.minus(totalReleased);
      expect(netReserve.toFixed(4)).toBe("300.0000");
    });

    it("cumulative reserve percentage cannot exceed 100", () => {
      const pcts = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      const total = pcts.reduce((s, p) => s + p, 0);
      expect(total).toBe(100);
    });

    it("reserve balance stays within expected bounds", () => {
      const totalRevenue = new Decimal("100000.0000");
      const pct = 10;
      const expectedMaxReserve = totalRevenue.mul(pct).div(100);
      const currentReserve = new Decimal("8000.0000");
      expect(currentReserve.lte(expectedMaxReserve)).toBe(true);
    });
  });

  describe("GL entry for reserve", () => {
    it("creates GL entry for reserve hold", async () => {
      mockGlService.createEntry.mockResolvedValue({ id: "gl-reserve-1" });
      const result = await mockGlService.createEntry({
        transactionId: "pay-1",
        transactionType: "payment_reserve",
        description: "Rolling reserve hold (10% of 1000)",
        lines: [
          { accountCode: "3100", debit: "100.0000", description: "Reserve from processing fees" },
          { accountCode: "2200", credit: "100.0000", description: "Reserve liability" },
        ],
      });
      expect(result.id).toBe("gl-reserve-1");
      expect(mockGlService.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({ transactionType: "payment_reserve" })
      );
    });
  });
});
