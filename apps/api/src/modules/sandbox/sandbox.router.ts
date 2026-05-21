import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import { randomUUID } from "crypto";

const router = Router();

router.post("/events", async (req: Request, res: Response) => {
  try {
    const { event, paymentId, amount } = req.body;

    if (!event) {
      return res.status(400).json({ error: "missing_event", message: "event is required" });
    }

    const validEvents = ["dispute_raised", "chargeback", "payout_failure"];
    if (!validEvents.includes(event)) {
      return res.status(400).json({ error: "invalid_event", message: `event must be one of: ${validEvents.join(", ")}` });
    }

    let targetPaymentId = paymentId;

    if (!targetPaymentId) {
      const sandboxPayment = await prisma.payment.create({
        data: {
          merchantId: req.merchant!.id,
          amount: amount || 1000,
          currency: "INR",
          status: "CAPTURED",
          metadata: { sandbox: true, simulated: true },
        },
      });
      targetPaymentId = sandboxPayment.id;
    }

    let result: any = {};

    if (event === "dispute_raised") {
      const dispute = await prisma.dispute.create({
        data: {
          paymentId: targetPaymentId,
          merchantId: req.merchant!.id,
          reason: "Simulated dispute for sandbox testing",
          amount: amount || 1000,
          status: "RAISED",
        },
      });

      await prisma.payment.update({
        where: { id: targetPaymentId },
        data: { status: "DISPUTED" },
      });

      result = { disputeId: dispute.id, status: dispute.status };
    }

    if (event === "chargeback") {
      const dispute = await prisma.dispute.create({
        data: {
          paymentId: targetPaymentId,
          merchantId: req.merchant!.id,
          reason: "Simulated chargeback for sandbox testing",
          amount: amount || 1000,
          status: "RESOLVED_MERCHANT_LOST",
        },
      });

      await prisma.payment.update({
        where: { id: targetPaymentId },
        data: { status: "REFUNDED" },
      });

      result = { disputeId: dispute.id, status: "chargeback_completed" };
    }

    if (event === "payout_failure") {
      const payout = await prisma.payout.create({
        data: {
          merchantId: req.merchant!.id,
          amount: amount || 5000,
          currency: "INR",
          status: "FAILED",
          metadata: { sandbox: true, simulated: true, failureReason: "Simulated payout failure" },
        },
      });

      result = { payoutId: payout.id, status: payout.status };
    }

    res.json({ simulated: true, event, paymentId: targetPaymentId, result });
  } catch (err: any) {
    res.status(422).json({ error: "simulation_failed", message: err.message });
  }
});

router.delete("/reset", async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;

    const sandboxPayments = await prisma.payment.findMany({
      where: { merchantId, metadata: { path: ["sandbox"], equals: true } },
      select: { id: true },
    });

    const paymentIds = sandboxPayments.map((p) => p.id);

    await prisma.dispute.deleteMany({ where: { merchantId, paymentId: { in: paymentIds } } });
    await prisma.paymentEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.ledgerEntry.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.fraudEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.webhookDelivery.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.payoutItem.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });

    const sandboxPayouts = await prisma.payout.findMany({
      where: { merchantId, metadata: { path: ["sandbox"], equals: true } },
      select: { id: true },
    });
    const payoutIds = sandboxPayouts.map((p) => p.id);
    await prisma.payoutItem.deleteMany({ where: { payoutId: { in: payoutIds } } });
    await prisma.payout.deleteMany({ where: { id: { in: payoutIds } } });

    const sandboxKeys = await redis.keys(`sandbox:${merchantId}:*`);
    if (sandboxKeys.length > 0) {
      await redis.del(...sandboxKeys);
    }

    res.json({ reset: true, message: "Sandbox environment has been reset" });
  } catch (err: any) {
    res.status(500).json({ error: "reset_failed", message: err.message });
  }
});

export default router;
