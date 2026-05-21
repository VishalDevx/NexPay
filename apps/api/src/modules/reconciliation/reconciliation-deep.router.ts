import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.get("/runs", async (_req: Request, res: Response) => {
  try {
    const runs = await prisma.reconciliationRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 });
    res.json({ data: runs });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/daily-balances", async (req: Request, res: Response) => {
  try {
    const { days } = req.query;
    const since = new Date(Date.now() - (Number(days) || 30) * 86400000);
    const balances = await prisma.dailyBalance.findMany({
      where: { merchantId: req.merchant!.id, date: { gte: since } },
      orderBy: { date: "desc" },
    });
    res.json({ data: balances });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/unreconciled", async (req: Request, res: Response) => {
  try {
    const adjustments = await prisma.ledgerAdjustment.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: adjustments });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
