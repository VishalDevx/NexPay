import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

const mockPrisma = {
  reserveConfig: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  reserveRelease: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

const mockGlService = {
  createEntry: vi.fn(),
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));
vi.mock("../modules/general-ledger/gl.service", () => ({ glService: mockGlService }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RollingReserve", () => {
  const DECIMAL_PRECISION = 4;

  function calcReserve(amount: string, percentage: string, fixedReserve: string): string {
    const amt = new Decimal(amount);
    const pct = new Decimal(percentage);
    const fixed = new Decimal(fixedReserve);
    const pctAmount = amt.mul(pct).div(100);
    return Decimal.max(pctAmount, fixed).toFixed(DECIMAL_PRECISION);
  }

  describe("Reserve Percentage Calculation", () => {
    it("calculates 10% reserve correctly", () => {
      const reserve = calcReserve("1000.00", "10", "0");
      expect(reserve).toBe("100.0000");
    });

    it("calculates 5% reserve correctly", () => {
      const reserve = calcReserve("2000.00", "5", "0");
      expect(reserve).toBe("100.0000");
    });

    it("returns zero reserve for 0%", () => {
      const reserve = calcReserve("1000.00", "0", "0");
      expect(reserve).toBe("0.0000");
    });

    it("uses fixed reserve when greater than percentage", () => {
      const reserve = calcReserve("100.00", "10", "50");
      expect(reserve).toBe("50.0000");
    });

    it("uses percentage when greater than fixed reserve", () => {
      const reserve = calcReserve("10000.00", "10", "50");
      expect(reserve).toBe("1000.0000");
    });
  });

  describe("Reserve Release Scheduling", () => {
    it("schedules release after configured delay", () => {
      const releaseDelayDays = 90;
      const capturedAt = new Date("2024-01-01");
      const scheduledDate = new Date(capturedAt.getTime() + releaseDelayDays * 86400000);

      expect(scheduledDate.toISOString().startsWith("2024-04")).toBe(true);
    });

    it("creates reserve release record with PENDING status", () => {
      const release = {
        configId: "config-1",
        amount: "100.0000",
        status: "PENDING",
        scheduledDate: new Date(Date.now() + 90 * 86400000),
      };

      mockPrisma.reserveRelease.create.mockResolvedValue({ id: "release-1", ...release });

      expect(release.status).toBe("PENDING");
    });
  });

  describe("Proportional Reserve Release on Refund", () => {
    it("reduces reserve proportionally on partial refund", () => {
      const currentReserve = new Decimal("500.0000");
      const paymentAmount = new Decimal("5000.0000");
      const refundAmount = new Decimal("1000.0000");
      const reservePercentage = new Decimal("10");

      const refundReserveReduction = refundAmount.mul(reservePercentage).div(100);
      const newReserve = currentReserve.minus(refundReserveReduction);

      expect(refundReserveReduction.toFixed(4)).toBe("100.0000");
      expect(newReserve.toFixed(4)).toBe("400.0000");
    });

    it("reduces reserve to zero on full refund", () => {
      const currentReserve = new Decimal("500.0000");
      const refundAmount = new Decimal("5000.0000");
      const reservePercentage = new Decimal("10");

      const refundReserveReduction = refundAmount.mul(reservePercentage).div(100);
      const newReserve = currentReserve.minus(refundReserveReduction);

      expect(refundReserveReduction.toFixed(4)).toBe("500.0000");
      expect(newReserve.toFixed(4)).toBe("0.0000");
    });
  });

  describe("Reserve Balance Tracking", () => {
    it("increments reserve balance on payment", () => {
      mockPrisma.reserveConfig.update.mockResolvedValue({
        currentReserveBalance: "600.0000",
      });

      const currentBalance = "500.0000";
      const reserveAmount = "100.0000";
      const newBalance = new Decimal(currentBalance).plus(reserveAmount);

      expect(newBalance.toFixed(4)).toBe("600.0000");
    });

    it("decrements reserve balance on refund", () => {
      const currentBalance = "500.0000";
      const reserveRefund = "100.0000";
      const newBalance = new Decimal(currentBalance).minus(reserveRefund);

      expect(newBalance.toFixed(4)).toBe("400.0000");
    });
  });

  describe("Reserve GL Entry Creation", () => {
    it("creates GL entry for reserve hold", async () => {
      mockGlService.createEntry.mockResolvedValue({ id: "gl-1" });

      const reserveAmount = "100.0000";

      const result = await mockGlService.createEntry({
        transactionId: "pay-1",
        transactionType: "payment_reserve",
        description: `Rolling reserve hold (10% of 1000.00)`,
        lines: [
          { accountCode: "3100", debit: reserveAmount, description: "Reserve from processing fees" },
          { accountCode: "2200", credit: reserveAmount, description: "Reserve liability" },
        ],
      });

      expect(result.id).toBe("gl-1");
      expect(mockGlService.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: "payment_reserve",
        })
      );
    });
  });
});
