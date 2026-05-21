import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { PayoutStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { env } from "../../config/env";

const payoutQueue = new Queue("payout-processing", {
  connection: { url: env.REDIS_URL },
});

export { payoutQueue };

const router = Router();

router.post("/payouts", async (req: Request, res: Response) => {
  try {
    const { amount, currency, scheduled_for } = req.body;

    const payout = await prisma.payout.create({
      data: {
        merchantId: req.merchant!.id,
        amount,
        currency: currency || "INR",
        status: PayoutStatus.PENDING,
        scheduledFor: scheduled_for ? new Date(scheduled_for) : undefined,
      },
    });

    await payoutQueue.add(
      "process-payout",
      { payoutId: payout.id },
      { delay: scheduled_for ? new Date(scheduled_for).getTime() - Date.now() : 0 }
    );

    res.status(201).json(payout);
  } catch (err: any) {
    res.status(422).json({ error: "payout_failed", message: err.message });
  }
});

router.get("/payouts", async (req: Request, res: Response) => {
  try {
    const payouts = await prisma.payout.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: payouts });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
