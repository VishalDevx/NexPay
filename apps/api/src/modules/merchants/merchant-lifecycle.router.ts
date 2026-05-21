import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.get("/profile", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: {
        id: true, name: true, email: true, status: true, riskCategory: true,
        baseCurrency: true, country: true, businessType: true, mccCode: true,
        expectedMonthlyVolume: true, averageTicketSize: true, websiteUrl: true,
        refundPolicyUrl: true, termsUrl: true, businessDescription: true,
        incorporationDate: true, taxId: true, kycStatus: true, riskScore: true,
        rejectionReason: true, approvedAt: true, createdAt: true, updatedAt: true,
        kycSubmittedAt: true, kycExpiryAt: true,
      },
    });
    if (!merchant) return res.status(404).json({ error: "not_found" });
    res.json(merchant);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/business-profile", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: {
        mccCode: true, expectedMonthlyVolume: true, averageTicketSize: true,
        websiteUrl: true, refundPolicyUrl: true, termsUrl: true,
        businessDescription: true, incorporationDate: true, taxId: true,
      },
    });
    if (!merchant) return res.status(404).json({ error: "not_found" });
    res.json(merchant);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.put("/business-profile", async (req: Request, res: Response) => {
  try {
    const { mccCode, expectedMonthlyVolume, averageTicketSize, websiteUrl, refundPolicyUrl, termsUrl, businessDescription, incorporationDate, taxId } = req.body;
    const merchant = await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: {
        ...(mccCode !== undefined && { mccCode }),
        ...(expectedMonthlyVolume !== undefined && { expectedMonthlyVolume }),
        ...(averageTicketSize !== undefined && { averageTicketSize }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(refundPolicyUrl !== undefined && { refundPolicyUrl }),
        ...(termsUrl !== undefined && { termsUrl }),
        ...(businessDescription !== undefined && { businessDescription }),
        ...(incorporationDate !== undefined && { incorporationDate: new Date(incorporationDate) }),
        ...(taxId !== undefined && { taxId }),
      },
    });
    res.json(merchant);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/approval-history", async (req: Request, res: Response) => {
  try {
    const history = await prisma.merchantApproval.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: history });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/compliance-notes", async (req: Request, res: Response) => {
  try {
    const notes = await prisma.complianceNote.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: notes });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/compliance-notes", async (req: Request, res: Response) => {
  try {
    const { content, category } = req.body;
    if (!content) return res.status(400).json({ error: "validation_error", message: "content is required" });
    const note = await prisma.complianceNote.create({
      data: { merchantId: req.merchant!.id, content, category: category || "GENERAL" },
    });
    res.status(201).json(note);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/onboarding-status", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: {
        status: true, kycStatus: true, kycSubmittedAt: true, riskCategory: true,
        riskScore: true, businessType: true, mccCode: true, websiteUrl: true,
        bankAccounts: { take: 1 }, uploads: { where: { category: "KYC" }, take: 1 },
      },
    });
    if (!merchant) return res.status(404).json({ error: "not_found" });
    const steps = {
      business_profile: !!(merchant.businessType || merchant.mccCode),
      documents: merchant.uploads.length > 0,
      bank_account: merchant.bankAccounts.length > 0,
    };
    res.json({ status: merchant.status, kycStatus: merchant.kycStatus, riskCategory: merchant.riskCategory, riskScore: merchant.riskScore, steps, allComplete: Object.values(steps).every(Boolean) });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
