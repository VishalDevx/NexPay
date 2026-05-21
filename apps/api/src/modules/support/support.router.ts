import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, priority } = req.query;
    const where: any = { merchantId: req.merchant!.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const tickets = await prisma.supportTicket.findMany({
      where, orderBy: { updatedAt: "desc" },
      include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
    });
    res.json({ data: tickets });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket) return res.status(404).json({ error: "not_found" });
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { subject, category, priority, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: "validation_error", message: "subject and message are required" });
    const ticket = await prisma.supportTicket.create({
      data: {
        merchantId: req.merchant!.id, subject, category: category || "GENERAL", priority: priority || "MEDIUM",
        messages: { create: { content: message, authorType: "MERCHANT", authorId: req.merchant!.id } },
      },
      include: { messages: true },
    });
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/:id/messages", async (req: Request, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });
    if (!ticket) return res.status(404).json({ error: "not_found" });
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "validation_error", message: "content is required" });
    const msg = await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, content, authorType: "MERCHANT", authorId: req.merchant!.id },
    });
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "PENDING_INTERNAL", updatedAt: new Date() } });
    res.status(201).json(msg);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/:id/close", async (req: Request, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });
    if (!ticket) return res.status(404).json({ error: "not_found" });
    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id }, data: { status: "CLOSED", closedAt: new Date() },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
