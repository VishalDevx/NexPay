import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.patch("/sub-merchants/:id/kyc", async (req: Request, res: Response) => {
  try {
    const { kycStatus, riskCategory } = req.body;
    const sub = await prisma.subMerchant.updateMany({
      where: { id: req.params.id, parentId: req.merchant!.id },
      data: { ...(kycStatus && { kycStatus }), ...(riskCategory && { riskCategory }) },
    });
    res.json({ updated: sub.count });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/split-transactions", async (req: Request, res: Response) => {
  try {
    const splits = await prisma.splitTransaction.findMany({
      where: { subMerchant: { parentId: req.merchant!.id } },
      include: { payment: { select: { id: true, amount: true, currency: true, status: true, createdAt: true } }, subMerchant: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: splits });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
