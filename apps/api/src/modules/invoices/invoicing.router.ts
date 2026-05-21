import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import crypto from "crypto";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, sortBy, sortOrder } = req.query;
    const where: any = { merchantId: req.merchant!.id };
    if (status) where.status = status;

    const orderField = (sortBy as string) || "createdAt";
    const orderDir = sortOrder === "asc" ? "asc" : "desc";

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { [orderField]: orderDir },
    });

    const data = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      status: inv.status,
      total: Number(inv.total),
      currency: inv.currency,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { customerName, customerEmail, customerGstin, lineItems, taxRate, dueDate, notes } = req.body;

    if (!customerName || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: "missing_fields", message: "customerName and lineItems required" });
    }

    const subtotal = lineItems.reduce((sum: number, item: any) => {
      return sum + Number(item.quantity) * Number(item.unitPrice);
    }, 0);

    const tax = Number(taxRate) || 0;
    const taxAmount = subtotal * (tax / 100);
    const total = subtotal + taxAmount;

    const count = await prisma.invoice.count();
    const now = new Date();
    const yymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const invoiceNumber = `INV-${yymm}-${String(count + 1).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        merchantId: req.merchant!.id,
        invoiceNumber,
        customerName,
        customerEmail: customerEmail || null,
        customerGstin: customerGstin || null,
        lineItems,
        subtotal,
        taxAmount,
        total,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        status: "DRAFT",
      },
    });

    res.status(201).json({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: Number(invoice.total),
      status: invoice.status,
    });
  } catch (err: any) {
    res.status(422).json({ error: "invoice_creation_failed", message: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (!invoice) return res.status(404).json({ error: "not_found" });

    if (invoice.status === "DRAFT") {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "SENT" },
      });
    }

    const result = await prisma.invoice.findUnique({ where: { id: invoice.id } });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (!invoice) return res.status(404).json({ error: "not_found" });
    if (invoice.status !== "DRAFT") return res.status(400).json({ error: "cannot_update", message: "only DRAFT invoices can be updated" });

    const { customerName, customerEmail, customerGstin, lineItems, taxRate, dueDate, notes } = req.body;

    let subtotal = invoice.subtotal;
    let taxAmount = invoice.taxAmount;
    let total = invoice.total;

    if (lineItems && Array.isArray(lineItems)) {
      subtotal = lineItems.reduce((sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
      const tax = Number(taxRate) || 0;
      taxAmount = subtotal * (tax / 100);
      total = subtotal + taxAmount;
    }

    await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        ...(customerName !== undefined && { customerName }),
        ...(customerEmail !== undefined && { customerEmail }),
        ...(customerGstin !== undefined && { customerGstin }),
        ...(lineItems !== undefined && { lineItems, subtotal, taxAmount, total }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json({ updated: true });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

router.post("/:id/send", async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (!invoice) return res.status(404).json({ error: "not_found" });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "SENT", issuedDate: new Date() },
    });

    res.json({ sent: true });
  } catch (err: any) {
    res.status(422).json({ error: "send_failed", message: err.message });
  }
});

router.post("/:id/pay", async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (!invoice) return res.status(404).json({ error: "not_found" });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    res.json({ paid: true });
  } catch (err: any) {
    res.status(422).json({ error: "pay_failed", message: err.message });
  }
});

router.post("/:id/cancel", async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (!invoice) return res.status(404).json({ error: "not_found" });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "CANCELLED" },
    });

    res.json({ cancelled: true });
  } catch (err: any) {
    res.status(422).json({ error: "cancel_failed", message: err.message });
  }
});

router.get("/recurring", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
    });

    const settings = (merchant?.settingsJson as any) || {};
    res.json({ data: settings.recurringInvoices || [] });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/recurring", async (req: Request, res: Response) => {
  try {
    const { customerName, customerEmail, lineItems, frequency, taxRate } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
    });

    const settings = (merchant?.settingsJson as any) || {};
    const recurringList: any[] = settings.recurringInvoices || [];

    const template = {
      id: crypto.randomUUID(),
      customerName,
      customerEmail,
      lineItems,
      frequency,
      taxRate: taxRate || 0,
      createdAt: new Date().toISOString(),
    };

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: {
        settingsJson: {
          ...settings,
          recurringInvoices: [...recurringList, template],
        },
      },
    });

    res.status(201).json({ id: template.id, frequency: template.frequency });
  } catch (err: any) {
    res.status(422).json({ error: "recurring_creation_failed", message: err.message });
  }
});

router.delete("/recurring/:id", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
    });

    const settings = (merchant?.settingsJson as any) || {};
    const recurringList: any[] = settings.recurringInvoices || [];
    const filtered = recurringList.filter((r: any) => r.id !== req.params.id);

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: {
        settingsJson: {
          ...settings,
          recurringInvoices: filtered,
        },
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(422).json({ error: "delete_failed", message: err.message });
  }
});

router.get("/tax", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
    });

    const settings = (merchant?.settingsJson as any) || {};
    const taxConfig = settings.tax || {};

    res.json({
      gstin: taxConfig.gstin || null,
      hsnCode: taxConfig.hsnCode || null,
      gstRate: taxConfig.gstRate || 18,
      tdsRate: taxConfig.tdsRate || 0,
      tdsSection: taxConfig.tdsSection || "194H",
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.put("/tax", async (req: Request, res: Response) => {
  try {
    const { gstin, hsnCode, gstRate, tdsRate, tdsSection } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
    });

    const settings = (merchant?.settingsJson as any) || {};
    const currentTax = settings.tax || {};

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: {
        settingsJson: {
          ...settings,
          tax: {
            ...currentTax,
            ...(gstin !== undefined && { gstin }),
            ...(hsnCode !== undefined && { hsnCode }),
            ...(gstRate !== undefined && { gstRate }),
            ...(tdsRate !== undefined && { tdsRate }),
            ...(tdsSection !== undefined && { tdsSection }),
          },
        },
      },
    });

    res.json({ updated: true });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

export default router;
