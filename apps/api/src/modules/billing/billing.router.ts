import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { cancelSubscription } from "../../workers/billing.worker";

const router = Router();

router.get("/plan", async (req: Request, res: Response) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { merchantId: req.merchant!.id }, include: { plan: true } });
    if (!sub) {
      const defaultPlan = await prisma.merchantPlan.findFirst({ where: { tier: "STARTER" } });
      return res.json({ subscription: null, availablePlans: await prisma.merchantPlan.findMany({ where: { active: true } }) });
    }
    res.json({ subscription: sub, availablePlans: await prisma.merchantPlan.findMany({ where: { active: true } }) });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/subscribe", async (req: Request, res: Response) => {
  try {
    const { planId } = req.body;
    const plan = await prisma.merchantPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: "plan_not_found" });
    const existing = await prisma.subscription.findUnique({ where: { merchantId: req.merchant!.id } });
    if (existing) {
      const updated = await prisma.subscription.update({
        where: { merchantId: req.merchant!.id },
        data: { planId, status: "ACTIVE", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
        include: { plan: true },
      });
      return res.json(updated);
    }
    const sub = await prisma.subscription.create({
      data: { merchantId: req.merchant!.id, planId, currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
      include: { plan: true },
    });
    res.status(201).json(sub);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/cancel", async (req: Request, res: Response) => {
  try {
    const result = await cancelSubscription(req.merchant!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: "cancel_failed", message: err.message });
  }
});

router.get("/fee-schedule", async (req: Request, res: Response) => {
  try {
    let feeSchedule = await prisma.feeSchedule.findUnique({ where: { merchantId: req.merchant!.id } });
    if (!feeSchedule) {
      feeSchedule = await prisma.feeSchedule.create({ data: { merchantId: req.merchant!.id } });
    }
    res.json(feeSchedule);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.patch("/fee-schedule", async (req: Request, res: Response) => {
  try {
    const { mdr, fixedFee, internationalMarkup, payoutFee, refundFee, chargebackFee, upiMdr, upiFixedFee } = req.body;
    const feeSchedule = await prisma.feeSchedule.upsert({
      where: { merchantId: req.merchant!.id },
      update: { ...(mdr !== undefined && { mdr }), ...(fixedFee !== undefined && { fixedFee }), ...(internationalMarkup !== undefined && { internationalMarkup }), ...(payoutFee !== undefined && { payoutFee }), ...(refundFee !== undefined && { refundFee }), ...(chargebackFee !== undefined && { chargebackFee }), ...(upiMdr !== undefined && { upiMdr }), ...(upiFixedFee !== undefined && { upiFixedFee }) },
      create: { merchantId: req.merchant!.id },
    });
    res.json(feeSchedule);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/invoices", async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.billingInvoice.findMany({
      where: { subscription: { merchantId: req.merchant!.id } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: invoices });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
