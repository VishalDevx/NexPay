import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.get("/events", async (req: Request, res: Response) => {
  try {
    const events = await prisma.securityEvent.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ data: events });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.merchantSession.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { lastUsedAt: "desc" },
    });
    res.json({ data: sessions });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
