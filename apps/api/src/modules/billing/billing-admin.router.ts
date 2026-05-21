import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { runBilling } from "../../workers/billing.worker";

const router = Router();

router.get("/subscriptions", async (_req: Request, res: Response) => {
  try {
    const subs = await prisma.subscription.findMany({
      include: { plan: true, merchant: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: subs });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/invoices", async (req: Request, res: Response) => {
  try {
    const { status, limit, offset } = req.query;
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      prisma.billingInvoice.findMany({
        where,
        include: { subscription: { include: { merchant: { select: { id: true, name: true, email: true } } } } },
        orderBy: { createdAt: "desc" },
        take: Number(limit) || 50,
        skip: Number(offset) || 0,
      }),
      prisma.billingInvoice.count({ where }),
    ]);
    res.json({ data, total });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/plans", async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.merchantPlan.findMany({ orderBy: { monthlyPrice: "asc" } });
    res.json({ data: plans });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/plans", async (req: Request, res: Response) => {
  try {
    const plan = await prisma.merchantPlan.create({ data: req.body });
    res.status(201).json(plan);
  } catch (err: any) {
    res.status(400).json({ error: "create_failed", message: err.message });
  }
});

router.patch("/plans/:id", async (req: Request, res: Response) => {
  try {
    const plan = await prisma.merchantPlan.update({ where: { id: req.params.id }, data: req.body });
    res.json(plan);
  } catch (err: any) {
    res.status(400).json({ error: "update_failed", message: err.message });
  }
});

router.post("/invoices/generate", async (_req: Request, res: Response) => {
  try {
    const invoices = await runBilling();
    res.json({ generated: invoices.length, invoices });
  } catch (err: any) {
    res.status(500).json({ error: "generation_failed", message: err.message });
  }
});

export default router;
