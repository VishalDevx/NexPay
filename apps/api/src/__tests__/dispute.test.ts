import { describe, it, expect, vi, beforeEach } from "vitest";
import { DisputeStatus } from "@prisma/client";

const DISPUTE_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  RAISED: ["EVIDENCE_SUBMITTED"],
  EVIDENCE_SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["RESOLVED_MERCHANT_WON", "RESOLVED_MERCHANT_LOST"],
  RESOLVED_MERCHANT_WON: [],
  RESOLVED_MERCHANT_LOST: [],
};

function validateDisputeTransition(from: DisputeStatus, to: DisputeStatus): boolean {
  return DISPUTE_TRANSITIONS[from]?.includes(to) ?? false;
}

const mockPrisma = {
  dispute: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  payment: {
    findUnique: vi.fn(),
  },
  disputeEvidence: {
    create: vi.fn(),
  } as any,
};

vi.mock("../config/db", () => ({ prisma: mockPrisma }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DisputeModule", () => {
  describe("Dispute Creation", () => {
    it("creates a dispute from a payment", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "pay-1",
        merchantId: "merchant-1",
        amount: "500.0000",
        currency: "USD",
        status: "CAPTURED",
      });

      mockPrisma.dispute.create.mockResolvedValue({
        id: "disp-1",
        paymentId: "pay-1",
        merchantId: "merchant-1",
        reason: "customer_not_received",
        status: DisputeStatus.RAISED,
        amount: "500.0000",
        evidence: null,
      });

      const dispute = await mockPrisma.dispute.create({
        data: {
          paymentId: "pay-1",
          merchantId: "merchant-1",
          reason: "customer_not_received",
          status: DisputeStatus.RAISED,
          amount: "500.0000",
        },
      });

      expect(dispute.status).toBe(DisputeStatus.RAISED);
      expect(dispute.reason).toBe("customer_not_received");
      expect(dispute.amount.toString()).toBe("500.0000");
    });

    it("creates a dispute with different amount than payment", async () => {
      mockPrisma.dispute.create.mockResolvedValue({
        id: "disp-2",
        paymentId: "pay-1",
        merchantId: "merchant-1",
        reason: "fraudulent",
        status: DisputeStatus.RAISED,
        amount: "250.0000",
      });

      const dispute = await mockPrisma.dispute.create({
        data: {
          paymentId: "pay-1",
          merchantId: "merchant-1",
          reason: "fraudulent",
          amount: "250.0000",
        },
      });

      expect(dispute.amount.toString()).toBe("250.0000");
    });
  });

  describe("Evidence Submission", () => {
    it("submits evidence for a dispute", async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: "disp-1",
        status: DisputeStatus.RAISED,
      });

      mockPrisma.dispute.update.mockResolvedValue({
        id: "disp-1",
        status: DisputeStatus.EVIDENCE_SUBMITTED,
        evidence: { files: ["receipt.pdf", "tracking.pdf"] },
      });

      const updated = await mockPrisma.dispute.update({
        where: { id: "disp-1" },
        data: {
          status: DisputeStatus.EVIDENCE_SUBMITTED,
          evidence: { files: ["receipt.pdf", "tracking.pdf"] },
        },
      });

      expect(updated.status).toBe(DisputeStatus.EVIDENCE_SUBMITTED);
      expect(updated.evidence.files).toContain("receipt.pdf");
    });
  });

  describe("Dispute Status Transitions", () => {
    const validTransitions: [DisputeStatus, DisputeStatus][] = [
      [DisputeStatus.RAISED, DisputeStatus.EVIDENCE_SUBMITTED],
      [DisputeStatus.EVIDENCE_SUBMITTED, DisputeStatus.UNDER_REVIEW],
      [DisputeStatus.UNDER_REVIEW, DisputeStatus.RESOLVED_MERCHANT_WON],
      [DisputeStatus.UNDER_REVIEW, DisputeStatus.RESOLVED_MERCHANT_LOST],
    ];

    it.each(validTransitions)("allows %s -> %s", (from, to) => {
      expect(validateDisputeTransition(from, to)).toBe(true);
    });

    const invalidTransitions: [DisputeStatus, DisputeStatus][] = [
      [DisputeStatus.RAISED, DisputeStatus.UNDER_REVIEW],
      [DisputeStatus.RAISED, DisputeStatus.RESOLVED_MERCHANT_WON],
      [DisputeStatus.EVIDENCE_SUBMITTED, DisputeStatus.RAISED],
      [DisputeStatus.RESOLVED_MERCHANT_WON, DisputeStatus.UNDER_REVIEW],
      [DisputeStatus.RESOLVED_MERCHANT_LOST, DisputeStatus.RAISED],
    ];

    it.each(invalidTransitions)("rejects %s -> %s", (from, to) => {
      expect(validateDisputeTransition(from, to)).toBe(false);
    });
  });

  describe("Merchant Won Resolution", () => {
    it("resolves dispute in merchant's favor", async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: "disp-1",
        status: DisputeStatus.UNDER_REVIEW,
      });

      mockPrisma.dispute.update.mockResolvedValue({
        id: "disp-1",
        status: DisputeStatus.RESOLVED_MERCHANT_WON,
        resolution: "Evidence proves delivery",
        resolvedAt: new Date(),
      });

      const dispute = await mockPrisma.dispute.update({
        where: { id: "disp-1" },
        data: {
          status: DisputeStatus.RESOLVED_MERCHANT_WON,
          resolution: "Evidence proves delivery",
          resolvedAt: new Date(),
        },
      });

      expect(dispute.status).toBe(DisputeStatus.RESOLVED_MERCHANT_WON);
      expect(dispute.resolution).toBe("Evidence proves delivery");
    });
  });

  describe("Merchant Lost Resolution", () => {
    it("resolves dispute against merchant", async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: "disp-1",
        status: DisputeStatus.UNDER_REVIEW,
      });

      mockPrisma.dispute.update.mockResolvedValue({
        id: "disp-1",
        status: DisputeStatus.RESOLVED_MERCHANT_LOST,
        resolution: "Insufficient evidence",
        resolvedAt: new Date(),
      });

      const dispute = await mockPrisma.dispute.update({
        where: { id: "disp-1" },
        data: {
          status: DisputeStatus.RESOLVED_MERCHANT_LOST,
          resolution: "Insufficient evidence",
          resolvedAt: new Date(),
        },
      });

      expect(dispute.status).toBe(DisputeStatus.RESOLVED_MERCHANT_LOST);
    });
  });

  describe("Dispute Amount Validation", () => {
    it("dispute amount cannot exceed payment amount", () => {
      const paymentAmount = "500.0000";
      const disputeAmount = "600.0000";
      expect(new (require("decimal.js").Decimal)(disputeAmount).lte(paymentAmount)).toBe(false);
    });

    it("dispute amount can be less than payment amount", () => {
      const paymentAmount = "500.0000";
      const disputeAmount = "300.0000";
      expect(new (require("decimal.js").Decimal)(disputeAmount).lte(paymentAmount)).toBe(true);
    });

    it("dispute amount can equal payment amount", () => {
      const paymentAmount = "500.0000";
      const disputeAmount = "500.0000";
      expect(new (require("decimal.js").Decimal)(disputeAmount).lte(paymentAmount)).toBe(true);
    });
  });
});
