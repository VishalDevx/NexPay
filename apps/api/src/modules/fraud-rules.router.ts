import { Router, Request, Response } from "express";
import { prisma } from "../config/db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const rules = await prisma.fraudRule.findMany({
      where: { enabled: true },
      select: { id: true, name: true, action: true, enabled: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: rules });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
