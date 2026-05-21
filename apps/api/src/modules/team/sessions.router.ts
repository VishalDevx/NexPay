import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.merchantSession.findMany({
      where: {
        merchantId: req.merchant!.id,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, token: true, deviceInfo: true, ip: true, lastUsedAt: true, createdAt: true },
    });

    const authHeader = req.headers.authorization;
    let currentToken: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      currentToken = authHeader.slice(7);
    }

    const data = sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ip: s.ip,
      isCurrent: currentToken ? s.token === currentToken : false,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.merchantSession.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(422).json({ error: "revoke_failed", message: err.message });
  }
});

router.delete("/", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let currentToken: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      currentToken = authHeader.slice(7);
    }

    const result = await prisma.merchantSession.deleteMany({
      where: {
        merchantId: req.merchant!.id,
        ...(currentToken ? { token: { not: currentToken } } : {}),
      },
    });

    res.json({ revoked: result.count });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
