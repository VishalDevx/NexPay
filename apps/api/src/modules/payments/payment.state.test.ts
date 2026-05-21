import { describe, it, expect } from "vitest";
import { validateTransition, getAllowedTransitions, isTerminal, isSuccess } from "./payment.state";

describe("PaymentStateMachine", () => {
  it("allows INITIATED -> PROCESSING", () => {
    expect(validateTransition("INITIATED" as any, "PROCESSING" as any)).toBe(true);
  });

  it("allows PROCESSING -> AUTHORIZED", () => {
    expect(validateTransition("PROCESSING" as any, "AUTHORIZED" as any)).toBe(true);
  });

  it("allows AUTHORIZED -> CAPTURED", () => {
    expect(validateTransition("AUTHORIZED" as any, "CAPTURED" as any)).toBe(true);
  });

  it("allows CAPTURED -> SETTLED", () => {
    expect(validateTransition("CAPTURED" as any, "SETTLED" as any)).toBe(true);
  });

  it("rejects CAPTURED -> AUTHORIZED (backwards)", () => {
    expect(validateTransition("CAPTURED" as any, "AUTHORIZED" as any)).toBe(false);
  });

  it("rejects FAILED -> CAPTURED (terminal)", () => {
    expect(validateTransition("FAILED" as any, "CAPTURED" as any)).toBe(false);
  });

  it("allows CAPTURED -> DISPUTED", () => {
    expect(validateTransition("CAPTURED" as any, "DISPUTED" as any)).toBe(true);
  });

  it("allows CAPTURED -> REFUNDED", () => {
    expect(validateTransition("CAPTURED" as any, "REFUNDED" as any)).toBe(true);
  });

  it("isTerminal returns true for FAILED", () => {
    expect(isTerminal("FAILED" as any)).toBe(true);
  });

  it("isSuccess returns true for CAPTURED", () => {
    expect(isSuccess("CAPTURED" as any)).toBe(true);
  });

  it("getAllowedTransitions returns correct transitions for AUTHORIZED", () => {
    const allowed = getAllowedTransitions("AUTHORIZED" as any);
    expect(allowed).toContain("CAPTURED");
    expect(allowed).toContain("FAILED");
    expect(allowed).toContain("REFUNDED");
    expect(allowed).not.toContain("SETTLED");
  });
});
