import { prisma } from "../../config/db";
import { PaymentStatus } from "@prisma/client";
import { paymentRepo } from "./payment.repo";
import { doubleEntryBook } from "../ledger/ledger.service";
import { ledgerRepo } from "../ledger/ledger.repo";
import { fraudEngine } from "../fraud/fraud.engine";
import Decimal from "decimal.js";

const DECIMAL_PRECISION = 4;

export const paymentService = {
  async charge(input: {
    merchantId: string;
    customerId?: string;
    amount: string;
    currency: string;
    paymentMethod: any;
    metadata?: any;
    description?: string;
    idempotencyKey?: string;
    idempotencyKeyHash?: string;
    isSandbox?: boolean;
    sandboxScenario?: { status: string; fraudScore: number };
  }) {
    const payment = await paymentRepo.create({
      merchantId: input.merchantId,
      customerId: input.customerId,
      amount: input.amount,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      metadata: input.metadata,
      description: input.description,
      idempotencyKey: input.idempotencyKey,
    });

    await paymentRepo.transition({
      paymentId: payment.id,
      toStatus: PaymentStatus.PROCESSING,
      actor: "system",
      reason: "Processing payment",
    });

    if (input.isSandbox && input.sandboxScenario) {
      const scenario = input.sandboxScenario;
      if (scenario.fraudScore > 0) {
        await prisma.fraudEvent.create({
          data: {
            paymentId: payment.id,
            triggered: true,
            score: scenario.fraudScore,
            reason: "Sandbox test scenario",
            details: { scenario: "test_card" },
          },
        });
        await prisma.payment.update({
          where: { id: payment.id },
          data: { fraudScore: scenario.fraudScore },
        });
      }

      if (scenario.status === "FAILED") {
        return paymentRepo.transition({
          paymentId: payment.id,
          toStatus: PaymentStatus.FAILED,
          actor: "system",
          reason: "Sandbox test card decline",
        });
      }

      await paymentRepo.transition({
        paymentId: payment.id,
        toStatus: PaymentStatus.AUTHORIZED,
        actor: "system",
        reason: "Sandbox authorization",
      });

      await paymentRepo.transition({
        paymentId: payment.id,
        toStatus: PaymentStatus.CAPTURED,
        actor: "system",
        reason: "Sandbox capture",
      });

      const accounts = await ledgerRepo.getOrCreateAccounts(input.merchantId, input.currency);
      await doubleEntryBook({
        debitAccountId: accounts.assetAccount.id,
        creditAccountId: accounts.revenueAccount.id,
        paymentId: payment.id,
        amount: input.amount,
        currency: input.currency,
        description: `Payment charge: ${input.description || payment.id}`,
      });

      return paymentRepo.findById(payment.id);
    }

    const fraudResult = await fraudEngine.evaluate({
      paymentId: payment.id,
      merchantId: input.merchantId,
      amount: input.amount,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      metadata: input.metadata,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { fraudScore: fraudResult.totalScore },
    });

    if (fraudResult.totalScore >= 80) {
      await paymentRepo.transition({
        paymentId: payment.id,
        toStatus: PaymentStatus.FAILED,
        actor: "fraud_engine",
        reason: `Fraud score ${fraudResult.totalScore} exceeds threshold`,
      });
      return paymentRepo.findById(payment.id);
    }

    await paymentRepo.transition({
      paymentId: payment.id,
      toStatus: PaymentStatus.AUTHORIZED,
      actor: "system",
      reason: "Payment authorized",
    });

    await paymentRepo.transition({
      paymentId: payment.id,
      toStatus: PaymentStatus.CAPTURED,
      actor: "system",
      reason: "Payment captured",
    });

    const accounts = await ledgerRepo.getOrCreateAccounts(input.merchantId, input.currency);
    await doubleEntryBook({
      debitAccountId: accounts.assetAccount.id,
      creditAccountId: accounts.revenueAccount.id,
      paymentId: payment.id,
      amount: input.amount,
      currency: input.currency,
      description: `Payment charge: ${input.description || payment.id}`,
    });

    return paymentRepo.findById(payment.id);
  },

  async capture(paymentId: string, actor: string = "merchant") {
    const payment = await paymentRepo.findById(paymentId);
    if (!payment) throw new Error("Payment not found");

    const updated = await paymentRepo.transition({
      paymentId,
      toStatus: PaymentStatus.CAPTURED,
      actor,
      reason: "Manual capture",
    });

    const accounts = await ledgerRepo.getOrCreateAccounts(payment.merchantId, payment.currency);
    await doubleEntryBook({
      debitAccountId: accounts.assetAccount.id,
      creditAccountId: accounts.revenueAccount.id,
      paymentId: payment.id,
      amount: payment.amount.toFixed(DECIMAL_PRECISION),
      currency: payment.currency,
      description: `Payment capture: ${payment.id}`,
    });

    return updated;
  },

  async cancel(paymentId: string, reason?: string) {
    const payment = await paymentRepo.findById(paymentId);
    if (!payment) throw new Error("Payment not found");

    if (![PaymentStatus.INITIATED, PaymentStatus.PROCESSING].includes(payment.status)) {
      throw new Error("Can only cancel payments in INITIATED or PROCESSING state");
    }

    return paymentRepo.transition({
      paymentId,
      toStatus: PaymentStatus.FAILED,
      actor: "merchant",
      reason: reason || "Cancelled by merchant",
    });
  },

  async refund(paymentId: string, amount?: string, reason?: string) {
    const payment = await paymentRepo.findById(paymentId);
    if (!payment) throw new Error("Payment not found");

    if (![PaymentStatus.CAPTURED, PaymentStatus.SETTLED].includes(payment.status)) {
      throw new Error("Can only refund captured or settled payments");
    }

    const refundAmount = amount ? new Decimal(amount) : new Decimal(payment.amount.toString());
    const alreadyRefunded = new Decimal(payment.amountRefunded?.toString() || "0");
    const available = new Decimal(payment.amount.toString()).minus(alreadyRefunded);

    if (refundAmount.gt(available)) {
      throw new Error(
        `Refund amount ${refundAmount} exceeds available balance ${available}`
      );
    }

    return prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          paymentId,
          amount: refundAmount.toFixed(DECIMAL_PRECISION),
          reason: reason || null,
          status: "SUCCEEDED",
        },
      });

      const newRefunded = alreadyRefunded.plus(refundAmount);
      const isFullRefund = newRefunded.gte(new Decimal(payment.amount.toString()));

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          amountRefunded: newRefunded.toFixed(DECIMAL_PRECISION),
          status: isFullRefund ? PaymentStatus.REFUNDED : payment.status,
        },
      });

      if (isFullRefund) {
        await tx.paymentEvent.create({
          data: {
            paymentId,
            fromStatus: payment.status,
            toStatus: PaymentStatus.REFUNDED,
            actor: "merchant",
            reason: reason || "Full refund",
          },
        });
      }

      const accounts = await ledgerRepo.getOrCreateAccounts(payment.merchantId, payment.currency);
      await doubleEntryBook({
        debitAccountId: accounts.revenueAccount.id,
        creditAccountId: accounts.assetAccount.id,
        paymentId: payment.id,
        amount: refundAmount.toFixed(DECIMAL_PRECISION),
        currency: payment.currency,
        description: `Refund: ${reason || payment.id}`,
      });

      return refund;
    });
  },
};
