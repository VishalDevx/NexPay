import { Worker } from "bullmq";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { PayoutStatus, PaymentStatus } from "@prisma/client";
import { glService } from "../modules/general-ledger/gl.service";
import Decimal from "decimal.js";

export const payoutWorker = new Worker(
  "payout-processing",
  async (job) => {
    const { payoutId } = job.data;

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: { merchant: true },
    });

    if (!payout || payout.status !== PayoutStatus.PENDING) return;

    await prisma.payout.update({
      where: { id: payoutId },
      data: { status: PayoutStatus.PROCESSING },
    });

    const settledPayments = await prisma.payment.findMany({
      where: {
        merchantId: payout.merchantId,
        currency: payout.currency,
        status: PaymentStatus.SETTLED,
        settledAt: { lte: payout.scheduledFor || new Date() },
      },
    });

    const payoutItems = await Promise.all(
      settledPayments.map((p) =>
        prisma.payoutItem.create({
          data: {
            payoutId,
            paymentId: p.id,
            amount: p.amount,
            netAmount: p.amount,
          },
        })
      )
    );

    const totalAmount = payoutItems.reduce(
      (sum, item) => sum.plus(new Decimal(item.amount.toString())),
      new Decimal(0)
    );

    if (totalAmount.lt(new Decimal(payout.amount.toString()))) {
      await prisma.payout.update({
        where: { id: payoutId },
        data: { status: PayoutStatus.FAILED },
      });
      throw new Error(`Insufficient settled funds: ${totalAmount} < ${payout.amount}`);
    }

    const bankRef = `NEX${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.COMPLETED,
        bankRef,
        completedAt: new Date(),
      },
    });

    await glService.createEntry({
      transactionId: payoutId,
      transactionType: "payout",
      description: `Payout completed: ${bankRef}`,
      lines: [
        { accountCode: "2100", debit: payout.amount.toFixed(4), description: "Merchant payable reduction" },
        { accountCode: "1100", credit: payout.amount.toFixed(4), description: "Cash disbursement" },
      ],
    }).catch((err) => console.error("GL entry failed (non-blocking):", err.message));
  },
  {
    connection: { url: env.REDIS_URL },
    concurrency: 5,
  }
);
