import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { DisputeStatus, PaymentStatus } from "@prisma/client";

const router = Router();

router.post("/disputes", async (req: Request, res: Response) => {
  try {
    const { payment_id, reason, amount } = req.body;

    const payment = await prisma.payment.findUnique({ where: { id: payment_id } });
    if (!payment) return res.status(404).json({ error: "payment_not_found" });
    if (payment.merchantId !== req.merchant!.id) return res.status(403).json({ error: "forbidden" });

    const dispute = await prisma.dispute.create({
      data: {
        paymentId: payment_id,
        merchantId: req.merchant!.id,
        reason,
        amount,
        status: DisputeStatus.RAISED,
      },
    });

    await prisma.payment.update({
      where: { id: payment_id },
      data: { status: PaymentStatus.DISPUTED },
    });

    res.status(201).json(dispute);
  } catch (err: any) {
    res.status(422).json({ error: "dispute_failed", message: err.message });
  }
});

router.post("/disputes/:id/evidence", async (req: Request, res: Response) => {
  try {
    const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } });
    if (!dispute) return res.status(404).json({ error: "dispute_not_found" });

    const updated = await prisma.dispute.update({
      where: { id: req.params.id },
      data: {
        evidence: req.body.evidence,
        status: DisputeStatus.EVIDENCE_SUBMITTED,
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(422).json({ error: "evidence_failed", message: err.message });
  }
});

router.get("/disputes", async (req: Request, res: Response) => {
  try {
    const disputes = await prisma.dispute.findMany({
      where: { merchantId: req.merchant!.id },
      include: { payment: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: disputes });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
