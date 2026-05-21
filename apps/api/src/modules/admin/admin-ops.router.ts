import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.get("/support-queue", async (_req: Request, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { status: { notIn: ["CLOSED", "RESOLVED"] } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: { merchant: { select: { id: true, name: true, email: true } }, messages: { take: 1, orderBy: { createdAt: "desc" } } },
    });
    res.json({ data: tickets });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.patch("/support-tickets/:id/status", async (req: Request, res: Response) => {
  try {
    const { status, assignedTo } = req.body;
    const data: any = { status };
    if (assignedTo) data.assignedTo = assignedTo;
    if (status === "RESOLVED") data.resolvedAt = new Date();
    if (status === "CLOSED") data.closedAt = new Date();
    const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data });
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/support-tickets/:id/messages", async (req: Request, res: Response) => {
  try {
    const { content, isInternal } = req.body;
    const msg = await prisma.ticketMessage.create({
      data: { ticketId: req.params.id, content, authorType: "ADMIN", isInternal: isInternal || false },
    });
    await prisma.supportTicket.update({ where: { id: req.params.id }, data: { status: "PENDING_MERCHANT", updatedAt: new Date() } });
    res.status(201).json(msg);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/pending-kyc", async (_req: Request, res: Response) => {
  try {
    const merchants = await prisma.merchant.findMany({
      where: { kycStatus: { in: ["NOT_SUBMITTED", "PENDING"] } },
      select: { id: true, name: true, email: true, kycStatus: true, kycSubmittedAt: true, kycExpiryAt: true, businessType: true, riskCategory: true, riskScore: true, createdAt: true, uploads: { where: { category: "KYC" } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ data: merchants });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/pending-reviews", async (_req: Request, res: Response) => {
  try {
    const merchants = await prisma.merchant.findMany({
      where: { status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] } },
      select: { id: true, name: true, email: true, status: true, riskCategory: true, riskScore: true, businessType: true, expectedMonthlyVolume: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json({ data: merchants });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/merchants/:id/approve", async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const merchant = await prisma.merchant.update({
      where: { id: req.params.id },
      data: { status: "ACTIVE", approvedAt: new Date(), approvedBy: req.merchant?.id || "admin", rejectionReason: null },
    });
    await prisma.merchantApproval.create({
      data: { merchantId: req.params.id, action: "APPROVED", fromStatus: merchant.status, toStatus: "ACTIVE", reviewerId: req.merchant?.id || "admin", reason },
    });
    res.json(merchant);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/merchants/:id/reject", async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const merchant = await prisma.merchant.findUnique({ where: { id: req.params.id } });
    if (!merchant) return res.status(404).json({ error: "not_found" });
    const updated = await prisma.merchant.update({
      where: { id: req.params.id },
      data: { status: "REJECTED", rejectionReason: reason },
    });
    await prisma.merchantApproval.create({
      data: { merchantId: req.params.id, action: "REJECTED", fromStatus: merchant.status, toStatus: "REJECTED", reviewerId: req.merchant?.id || "admin", reason },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/activity-logs", async (req: Request, res: Response) => {
  try {
    const { action, resource, days } = req.query;
    const where: any = {};
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (days) where.createdAt = { gte: new Date(Date.now() - Number(days) * 86400000) };
    const logs = await prisma.adminActivityLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    res.json({ data: logs });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/activity-logs", async (req: Request, res: Response) => {
  try {
    const { action, resource, resourceId, details } = req.body;
    const log = await prisma.adminActivityLog.create({
      data: { adminId: req.merchant?.id || "admin", action, resource, resourceId, details, ip: req.ip },
    });
    res.status(201).json(log);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/payout-failures", async (_req: Request, res: Response) => {
  try {
    const payouts = await prisma.payout.findMany({
      where: { status: "FAILED" },
      include: { merchant: { select: { id: true, name: true, email: true } }, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: payouts });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/webhook-failures", async (_req: Request, res: Response) => {
  try {
    const failures = await prisma.webhookDelivery.findMany({
      where: { status: { in: ["FAILED", "DEAD_LETTER"] } },
      include: { endpoint: { select: { url: true, merchantId: true } }, payment: { select: { id: true, amount: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ data: failures });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
