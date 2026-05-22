import { describe, it, expect } from "vitest";
import { validateTransition, getAllowedTransitions, isTerminal, isSuccess, PaymentStatus } from "../modules/payments/payment.state";

describe("PaymentStateMachine", () => {
  const validForward: [PaymentStatus, PaymentStatus][] = [
    [PaymentStatus.INITIATED, PaymentStatus.PROCESSING],
    [PaymentStatus.PROCESSING, PaymentStatus.AUTHORIZED],
    [PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED],
    [PaymentStatus.CAPTURED, PaymentStatus.SETTLED],
  ];

  it.each(validForward)("allows %s -> %s", (from, to) => {
    expect(validateTransition(from, to)).toBe(true);
  });

  const failureTransitions: [PaymentStatus, PaymentStatus][] = [
    [PaymentStatus.INITIATED, PaymentStatus.FAILED],
    [PaymentStatus.PROCESSING, PaymentStatus.FAILED],
    [PaymentStatus.AUTHORIZED, PaymentStatus.FAILED],
  ];

  it.each(failureTransitions)("allows %s -> FAILED", (from, to) => {
    expect(validateTransition(from, to)).toBe(true);
  });

  const refundTransitions: [PaymentStatus, PaymentStatus][] = [
    [PaymentStatus.AUTHORIZED, PaymentStatus.REFUNDED],
    [PaymentStatus.CAPTURED, PaymentStatus.REFUNDED],
    [PaymentStatus.SETTLED, PaymentStatus.REFUNDED],
  ];

  it.each(refundTransitions)("allows %s -> REFUNDED", (from, to) => {
    expect(validateTransition(from, to)).toBe(true);
  });

  const disputeTransitions: [PaymentStatus, PaymentStatus][] = [
    [PaymentStatus.CAPTURED, PaymentStatus.DISPUTED],
    [PaymentStatus.SETTLED, PaymentStatus.DISPUTED],
    [PaymentStatus.DISPUTED, PaymentStatus.REFUNDED],
  ];

  it.each(disputeTransitions)("allows %s -> %s", (from, to) => {
    expect(validateTransition(from, to)).toBe(true);
  });

  const invalidTransitions: [PaymentStatus, PaymentStatus][] = [
    [PaymentStatus.CAPTURED, PaymentStatus.INITIATED],
    [PaymentStatus.FAILED, PaymentStatus.CAPTURED],
    [PaymentStatus.REFUNDED, PaymentStatus.CAPTURED],
    [PaymentStatus.SETTLED, PaymentStatus.AUTHORIZED],
    [PaymentStatus.INITIATED, PaymentStatus.CAPTURED],
    [PaymentStatus.FAILED, PaymentStatus.PROCESSING],
    [PaymentStatus.REFUNDED, PaymentStatus.INITIATED],
    [PaymentStatus.DISPUTED, PaymentStatus.CAPTURED],
    [PaymentStatus.DISPUTED, PaymentStatus.SETTLED],
  ];

  it.each(invalidTransitions)("rejects %s -> %s (invalid)", (from, to) => {
    expect(validateTransition(from, to)).toBe(false);
  });

  it("isTerminal returns true for FAILED", () => {
    expect(isTerminal(PaymentStatus.FAILED)).toBe(true);
  });

  it("isTerminal returns true for REFUNDED", () => {
    expect(isTerminal(PaymentStatus.REFUNDED)).toBe(true);
  });

  it("isTerminal returns false for non-terminal states", () => {
    expect(isTerminal(PaymentStatus.INITIATED)).toBe(false);
    expect(isTerminal(PaymentStatus.PROCESSING)).toBe(false);
    expect(isTerminal(PaymentStatus.AUTHORIZED)).toBe(false);
    expect(isTerminal(PaymentStatus.CAPTURED)).toBe(false);
    expect(isTerminal(PaymentStatus.SETTLED)).toBe(false);
    expect(isTerminal(PaymentStatus.DISPUTED)).toBe(false);
  });

  it("isSuccess returns true for CAPTURED", () => {
    expect(isSuccess(PaymentStatus.CAPTURED)).toBe(true);
  });

  it("isSuccess returns true for SETTLED", () => {
    expect(isSuccess(PaymentStatus.SETTLED)).toBe(true);
  });

  it("isSuccess returns false for non-success states", () => {
    expect(isSuccess(PaymentStatus.INITIATED)).toBe(false);
    expect(isSuccess(PaymentStatus.PROCESSING)).toBe(false);
    expect(isSuccess(PaymentStatus.AUTHORIZED)).toBe(false);
    expect(isSuccess(PaymentStatus.FAILED)).toBe(false);
    expect(isSuccess(PaymentStatus.REFUNDED)).toBe(false);
    expect(isSuccess(PaymentStatus.DISPUTED)).toBe(false);
  });

  it("getAllowedTransitions for INITIATED returns PROCESSING and FAILED", () => {
    const allowed = getAllowedTransitions(PaymentStatus.INITIATED);
    expect(allowed).toEqual([PaymentStatus.PROCESSING, PaymentStatus.FAILED]);
  });

  it("getAllowedTransitions for AUTHORIZED returns CAPTURED, FAILED, REFUNDED", () => {
    const allowed = getAllowedTransitions(PaymentStatus.AUTHORIZED);
    expect(allowed).toContain(PaymentStatus.CAPTURED);
    expect(allowed).toContain(PaymentStatus.FAILED);
    expect(allowed).toContain(PaymentStatus.REFUNDED);
    expect(allowed).not.toContain(PaymentStatus.SETTLED);
  });

  it("getAllowedTransitions for FAILED returns empty", () => {
    expect(getAllowedTransitions(PaymentStatus.FAILED)).toEqual([]);
  });

  it("getAllowedTransitions for REFUNDED returns empty", () => {
    expect(getAllowedTransitions(PaymentStatus.REFUNDED)).toEqual([]);
  });

  it("getAllowedTransitions for CAPTURED returns SETTLED, REFUNDED, DISPUTED", () => {
    const allowed = getAllowedTransitions(PaymentStatus.CAPTURED);
    expect(allowed).toContain(PaymentStatus.SETTLED);
    expect(allowed).toContain(PaymentStatus.REFUNDED);
    expect(allowed).toContain(PaymentStatus.DISPUTED);
  });

  it("getAllowedTransitions for SETTLED returns REFUNDED, DISPUTED", () => {
    const allowed = getAllowedTransitions(PaymentStatus.SETTLED);
    expect(allowed).toContain(PaymentStatus.REFUNDED);
    expect(allowed).toContain(PaymentStatus.DISPUTED);
    expect(allowed).not.toContain(PaymentStatus.CAPTURED);
  });

  it("getAllowedTransitions for DISPUTED returns REFUNDED only", () => {
    const allowed = getAllowedTransitions(PaymentStatus.DISPUTED);
    expect(allowed).toEqual([PaymentStatus.REFUNDED]);
  });

  it("rejects transition from unknown state", () => {
    expect(validateTransition("UNKNOWN" as any, PaymentStatus.CAPTURED)).toBe(false);
  });
});
