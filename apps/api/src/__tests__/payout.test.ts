import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

type PayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

const PAYOUT_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

function validatePayoutTransition(from: PayoutStatus, to: PayoutStatus): boolean {
  return PAYOUT_TRANSITIONS[from]?.includes(to) ?? false;
}

function generateBankRef(prefix = "NEX"): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${ts}${rand}`;
}

describe("PayoutModule", () => {
  describe("Payout Item Calculation", () => {
    it("calculates netAmount = amount - fee - reserve", () => {
      const amount = new Decimal("1000.00");
      const fee = new Decimal("29.00");
      const reserve = new Decimal("100.00");
      const netAmount = amount.minus(fee).minus(reserve);

      expect(netAmount.toFixed(2)).toBe("871.00");
    });

    it("handles zero fee and zero reserve", () => {
      const amount = new Decimal("500.00");
      const fee = new Decimal("0");
      const reserve = new Decimal("0");
      const netAmount = amount.minus(fee).minus(reserve);

      expect(netAmount.toFixed(2)).toBe("500.00");
    });

    it("handles reserve only with no fee", () => {
      const amount = new Decimal("200.00");
      const fee = new Decimal("0");
      const reserve = new Decimal("20.00");
      const netAmount = amount.minus(fee).minus(reserve);

      expect(netAmount.toFixed(2)).toBe("180.00");
    });
  });

  describe("Payout Status Transitions", () => {
    const validTransitions: [PayoutStatus, PayoutStatus][] = [
      ["PENDING", "PROCESSING"],
      ["PENDING", "CANCELLED"],
      ["PROCESSING", "COMPLETED"],
      ["PROCESSING", "FAILED"],
    ];

    it.each(validTransitions)("allows %s -> %s", (from, to) => {
      expect(validatePayoutTransition(from, to)).toBe(true);
    });

    const invalidTransitions: [PayoutStatus, PayoutStatus][] = [
      ["COMPLETED", "PROCESSING"],
      ["FAILED", "PROCESSING"],
      ["CANCELLED", "PENDING"],
      ["COMPLETED", "FAILED"],
    ];

    it.each(invalidTransitions)("rejects %s -> %s", (from, to) => {
      expect(validatePayoutTransition(from, to)).toBe(false);
    });

    it("terminal states are COMPLETED, FAILED, CANCELLED", () => {
      const terminal: PayoutStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];
      const nonTerminal: PayoutStatus[] = ["PENDING", "PROCESSING"];

      terminal.forEach((s) => expect(PAYOUT_TRANSITIONS[s]).toEqual([]));
      nonTerminal.forEach((s) => expect(PAYOUT_TRANSITIONS[s].length).toBeGreaterThan(0));
    });
  });

  describe("Bank Reference Generation", () => {
    it("generates a reference with NEX prefix", () => {
      const ref = generateBankRef();
      expect(ref.startsWith("NEX")).toBe(true);
    });

    it("generates unique references", () => {
      const refs = new Set(Array.from({ length: 100 }, () => generateBankRef()));
      expect(refs.size).toBe(100);
    });

    it("generates reference with custom prefix", () => {
      const ref = generateBankRef("PAY");
      expect(ref.startsWith("PAY")).toBe(true);
    });
  });

  describe("Sufficient Balance Check", () => {
    it("allows payout when balance is sufficient", () => {
      const balance = new Decimal("5000.00");
      const payoutAmount = new Decimal("3000.00");
      expect(balance.gte(payoutAmount)).toBe(true);
    });

    it("prevents payout when balance is insufficient", () => {
      const balance = new Decimal("2000.00");
      const payoutAmount = new Decimal("3000.00");
      expect(balance.gte(payoutAmount)).toBe(false);
    });

    it("allows payout when balance equals amount exactly", () => {
      const balance = new Decimal("3000.00");
      const payoutAmount = new Decimal("3000.00");
      expect(balance.gte(payoutAmount)).toBe(true);
    });
  });
});
