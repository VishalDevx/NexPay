import { PaymentStatus } from "@prisma/client";

type TransitionMap = Record<PaymentStatus, PaymentStatus[]>;

const VALID_TRANSITIONS: TransitionMap = {
  INITIATED: ["PROCESSING", "FAILED"],
  PROCESSING: ["AUTHORIZED", "FAILED"],
  AUTHORIZED: ["CAPTURED", "FAILED", "REFUNDED"],
  CAPTURED: ["SETTLED", "REFUNDED", "DISPUTED"],
  SETTLED: ["REFUNDED", "DISPUTED"],
  FAILED: [],
  REFUNDED: [],
  DISPUTED: ["REFUNDED"],
};

export function validateTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedTransitions(status: PaymentStatus): PaymentStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

export function isTerminal(status: PaymentStatus): boolean {
  return ([PaymentStatus.FAILED, PaymentStatus.REFUNDED] as PaymentStatus[]).includes(status);
}

export function isSuccess(status: PaymentStatus): boolean {
  return ([PaymentStatus.CAPTURED, PaymentStatus.SETTLED] as PaymentStatus[]).includes(status);
}

export { PaymentStatus };
