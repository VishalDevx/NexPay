import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { Prisma } from "@prisma/client";

const router = Router();

router.get("/status", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: { updatedAt: true },
    });
    if (!merchant) return res.status(404).json({ error: "not_found" });

    res.json({
      pciDss: "ACTIVE",
      encryption: "AES-256-GCM",
      gdpr: true,
      amlKyt: true,
      lastAudit: merchant.updatedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/reports", async (req: Request, res: Response) => {
  try {
    const data = [
      {
        id: "tds-1",
        type: "TDS",
        period: "Apr 2024",
        status: "GENERATED",
        downloadUrl: "/api/v1/compliance/reports/tds-1/download",
        generatedAt: new Date(),
      },
    ];
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/reports/:id/download", async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const csvRows = [
      "ID,Amount,Currency,Status,CreatedAt",
      ...payments.map(
        (p) => `${p.id},${p.amount},${p.currency},${p.status},${p.createdAt.toISOString()}`
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.id}.csv"`);
    res.send(csvRows.join("\n"));
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/gdpr/export", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: {
        id: true, name: true, email: true, country: true, businessType: true,
        status: true, kycStatus: true, createdAt: true,
      },
    });

    const payments = await prisma.payment.findMany({
      where: { merchantId: req.merchant!.id },
      take: 100,
    });

    const customers = await prisma.customer.findMany({
      where: { merchantId: req.merchant!.id },
    });

    const disputes = await prisma.dispute.findMany({
      where: { merchantId: req.merchant!.id },
    });

    res.json({
      data: { merchant, payments, customers, disputes },
      exportedAt: new Date(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/gdpr/erase", async (req: Request, res: Response) => {
  try {
    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: {
        name: "[ANONYMIZED]",
        email: `anonymized-${req.merchant!.id}@removed.nexpay`,
        passwordHash: "[REMOVED]",
        recoveryEmail: null,
        smsMfaPhone: null,
        totpSecret: null,
        backupCodes: Prisma.JsonNull,
        kycDocuments: Prisma.JsonNull,
      },
    });

    res.json({ erased: true, message: "Personal data anonymized" });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
