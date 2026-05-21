import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.get("/config", async (req: Request, res: Response) => {
  try {
    let config = await prisma.reserveConfig.findUnique({ where: { merchantId: req.merchant!.id }, include: { releases: { orderBy: { scheduledDate: "asc" } } } });
    if (!config) {
      config = await prisma.reserveConfig.create({ data: { merchantId: req.merchant!.id }, include: { releases: true } });
    }
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.patch("/config", async (req: Request, res: Response) => {
  try {
    const { reservePercentage, fixedReserveAmount, releaseDelayDays } = req.body;
    const config = await prisma.reserveConfig.upsert({
      where: { merchantId: req.merchant!.id },
      update: { ...(reservePercentage !== undefined && { reservePercentage }), ...(fixedReserveAmount !== undefined && { fixedReserveAmount }), ...(releaseDelayDays !== undefined && { releaseDelayDays }) },
      create: { merchantId: req.merchant!.id },
    });
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/hold", async (req: Request, res: Response) => {
  try {
    const { amount, reason } = req.body;
    const config = await prisma.reserveConfig.findUnique({ where: { merchantId: req.merchant!.id } });
    if (!config) return res.status(404).json({ error: "no_config" });
    const updated = await prisma.reserveConfig.update({
      where: { merchantId: req.merchant!.id },
      data: { manualHold: true, manualHoldAmount: amount, manualHoldReason: reason, currentReserveBalance: { increment: amount } },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/release", async (req: Request, res: Response) => {
  try {
    const config = await prisma.reserveConfig.findUnique({ where: { merchantId: req.merchant!.id } });
    if (!config) return res.status(404).json({ error: "no_config" });
    const release = await prisma.reserveRelease.create({
      data: { configId: config.id, amount: config.currentReserveBalance, scheduledDate: new Date(Date.now() + config.releaseDelayDays * 86400000) },
    });
    await prisma.reserveConfig.update({ where: { merchantId: req.merchant!.id }, data: { currentReserveBalance: 0 } });
    res.status(201).json(release);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
