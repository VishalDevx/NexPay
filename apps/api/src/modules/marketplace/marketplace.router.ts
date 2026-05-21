import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import crypto from "crypto";

const router = Router();

router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;

    const subMerchants = await prisma.subMerchant.findMany({
      where: { parentId: merchantId },
    });

    const totalGmv = subMerchants.reduce((sum, s) => sum + Number(s.gmv), 0);
    const activeSellers = subMerchants.filter((s) => s.status === "ACTIVE").length;
    const totalCommission = subMerchants.reduce((sum, s) => sum + Number(s.commissionPct), 0);

    const sorted = [...subMerchants].sort((a, b) => Number(b.gmv) - Number(a.gmv));
    const topSeller = sorted.length > 0 ? { name: sorted[0].name, gmv: Number(sorted[0].gmv) } : null;

    res.json({
      gmv: totalGmv,
      commission: totalCommission,
      activeSellers,
      topSeller,
      sellerCount: subMerchants.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/sub-merchants", async (req: Request, res: Response) => {
  try {
    const subMerchants = await prisma.subMerchant.findMany({
      where: { parentId: req.merchant!.id },
      orderBy: { createdAt: "desc" },
    });

    const data = subMerchants.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      commissionPct: Number(s.commissionPct),
      status: s.status,
      gmv: Number(s.gmv),
      apiKeyPrefix: s.apiKeyPrefix,
      createdAt: s.createdAt,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/sub-merchants", async (req: Request, res: Response) => {
  try {
    const { name, email, commissionPct } = req.body;

    if (commissionPct < 0 || commissionPct > 100) {
      return res.status(400).json({ error: "invalid_commission", message: "commissionPct must be between 0 and 100" });
    }

    const prefix = "nex_sub_";
    const rawKey = prefix + crypto.randomBytes(24).toString("hex");

    const subMerchant = await prisma.subMerchant.create({
      data: {
        parentId: req.merchant!.id,
        name,
        email,
        commissionPct,
        apiKeyPrefix: prefix,
      },
    });

    res.status(201).json({
      id: subMerchant.id,
      name: subMerchant.name,
      email: subMerchant.email,
      commissionPct: Number(subMerchant.commissionPct),
      apiKeyPrefix: subMerchant.apiKeyPrefix,
    });
  } catch (err: any) {
    res.status(422).json({ error: "sub_merchant_creation_failed", message: err.message });
  }
});

router.patch("/sub-merchants/:id", async (req: Request, res: Response) => {
  try {
    const existing = await prisma.subMerchant.findFirst({
      where: { id: req.params.id, parentId: req.merchant!.id },
    });

    if (!existing) return res.status(404).json({ error: "not_found" });

    const { name, email, commissionPct, status } = req.body;

    await prisma.subMerchant.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(commissionPct !== undefined && { commissionPct }),
        ...(status !== undefined && { status }),
      },
    });

    res.json({ updated: true });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

router.post("/split-rules", async (req: Request, res: Response) => {
  try {
    const { subMerchantId, percentage, description } = req.body;

    if (percentage < 1 || percentage > 100) {
      return res.status(400).json({ error: "invalid_percentage", message: "percentage must be between 1 and 100" });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
    });

    const settings = (merchant?.settingsJson as any) || {};
    const existingSplits: any[] = settings.splits || [];

    const totalExisting = existingSplits.reduce((sum: number, s: any) => sum + Number(s.percentage), 0);
    if (totalExisting + Number(percentage) > 100) {
      return res.status(400).json({ error: "exceeds_100", message: "total split percentage cannot exceed 100%" });
    }

    const newRule = {
      id: crypto.randomUUID(),
      subMerchantId,
      percentage: Number(percentage),
      description,
    };

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: {
        settingsJson: {
          ...settings,
          splits: [...existingSplits, newRule],
        },
      },
    });

    res.status(201).json({ id: newRule.id, percentage: newRule.percentage, description: newRule.description });
  } catch (err: any) {
    res.status(422).json({ error: "split_rule_failed", message: err.message });
  }
});

router.get("/split-rules", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
    });

    const settings = (merchant?.settingsJson as any) || {};
    res.json({ data: settings.splits || [] });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.delete("/split-rules/:id", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
    });

    const settings = (merchant?.settingsJson as any) || {};
    const splits: any[] = settings.splits || [];
    const filtered = splits.filter((s: any) => s.id !== req.params.id);

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: {
        settingsJson: {
          ...settings,
          splits: filtered,
        },
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(422).json({ error: "delete_failed", message: err.message });
  }
});

export default router;
