import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { KYCStatus, MerchantStatus, DisputeStatus } from "@prisma/client";
import { doubleEntryBook } from "../ledger/ledger.service";

const router = Router();

router.get("/merchants", async (req: Request, res: Response) => {
  const merchants = await prisma.merchant.findMany({
    select: { id: true, name: true, email: true, status: true, kycStatus: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: merchants });
});

router.patch("/merchants/:id/kyc", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const merchant = await prisma.merchant.update({
      where: { id: req.params.id },
      data: { kycStatus: status as KYCStatus },
    });
    res.json(merchant);
  } catch (err: any) {
    res.status(422).json({ error: "kyc_update_failed", message: err.message });
  }
});

router.patch("/merchants/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const merchant = await prisma.merchant.update({
      where: { id: req.params.id },
      data: { status: status as MerchantStatus },
    });
    res.json(merchant);
  } catch (err: any) {
    res.status(422).json({ error: "status_update_failed", message: err.message });
  }
});

router.get("/fraud-rules", async (req: Request, res: Response) => {
  const rules = await prisma.fraudRule.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: rules });
});

router.post("/fraud-rules", async (req: Request, res: Response) => {
  try {
    const rule = await prisma.fraudRule.create({ data: req.body });
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(422).json({ error: "rule_creation_failed", message: err.message });
  }
});

router.patch("/fraud-rules/:id", async (req: Request, res: Response) => {
  const rule = await prisma.fraudRule.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(rule);
});

router.get("/disputes", async (req: Request, res: Response) => {
  const disputes = await prisma.dispute.findMany({
    include: { payment: true, merchant: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: disputes });
});

router.post("/disputes/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { resolution } = req.body;
    const updated = await prisma.dispute.update({
      where: { id: req.params.id },
      data: {
        status: resolution === "merchant_won" ? DisputeStatus.RESOLVED_MERCHANT_WON : DisputeStatus.RESOLVED_MERCHANT_LOST,
        resolvedAt: new Date(),
        resolution,
      },
    });

    if (resolution === "merchant_lost") {
      const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } });
      if (dispute) {
        await prisma.payment.update({
          where: { id: dispute.paymentId },
          data: { status: "REFUNDED" },
        });
      }
    }

    res.json(updated);
  } catch (err: any) {
    res.status(422).json({ error: "resolution_failed", message: err.message });
  }
});

router.post("/ledger-adjustments", async (req: Request, res: Response) => {
  try {
    const { account_id, amount, type, reason } = req.body;

    const adjustment = await prisma.ledgerAdjustment.create({
      data: {
        requestedBy: req.merchant?.id || "admin",
        accountId: account_id,
        amount,
        type,
        reason,
        status: "PENDING",
      },
    });

    res.status(201).json(adjustment);
  } catch (err: any) {
    res.status(422).json({ error: "adjustment_failed", message: err.message });
  }
});

router.post("/ledger-adjustments/:id/approve", async (req: Request, res: Response) => {
  try {
    const adjustment = await prisma.ledgerAdjustment.findUnique({
      where: { id: req.params.id },
    });

    if (!adjustment) return res.status(404).json({ error: "not_found" });
    if (adjustment.status !== "PENDING") return res.status(409).json({ error: "already_processed" });

    await doubleEntryBook({
      debitAccountId: adjustment.type === "DEBIT" ? adjustment.accountId : "00000000-0000-0000-0000-000000000000",
      creditAccountId: adjustment.type === "CREDIT" ? adjustment.accountId : "00000000-0000-0000-0000-000000000000",
      paymentId: null,
      amount: adjustment.amount.toString(),
      currency: "USD",
      description: `Ledger adjustment: ${adjustment.reason}`,
    });

    const updated = await prisma.ledgerAdjustment.update({
      where: { id: req.params.id },
      data: { status: "APPROVED", approvedBy: req.merchant?.id || "admin" },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(422).json({ error: "approval_failed", message: err.message });
  }
});

router.get("/ledger-adjustments", async (req: Request, res: Response) => {
  const adjustments = await prisma.ledgerAdjustment.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ data: adjustments });
});

router.get("/health", async (req: Request, res: Response) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`.catch(() => false);
  res.json({
    status: "ok",
    database: !!dbOk,
    timestamp: new Date().toISOString(),
  });
});

import integrityRouter from "./integrity.router";
router.use(integrityRouter);

export default router;
