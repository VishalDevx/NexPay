import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { paymentService } from "../payments/payment.service";
import { PaymentLinkStatus, PaymentStatus } from "@prisma/client";

export function generateLinkSlug(): string {
  return `link_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const DECIMAL_PRECISION = 4;

export const paymentLinksRouter = Router();

paymentLinksRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { amount, currency, description, expires_at, metadata } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "missing_fields", message: "amount required" });
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "invalid_amount", message: "amount must be a positive number" });
    }

    let slug = generateLinkSlug();
    let attempts = 0;
    while ((await prisma.paymentLink.findUnique({ where: { slug } })) && attempts < 5) {
      slug = generateLinkSlug();
      attempts += 1;
    }

    const link = await prisma.paymentLink.create({
      data: {
        merchantId: req.merchant!.id,
        slug,
        amount: parsedAmount.toFixed(DECIMAL_PRECISION),
        currency: currency || req.merchant!.baseCurrency || "INR",
        description: description || null,
        status: PaymentLinkStatus.ACTIVE,
        expiresAt: expires_at ? new Date(expires_at) : null,
        metadata: metadata || null,
      },
    });

    res.status(201).json(link);
  } catch (err: any) {
    console.error("Create payment link error:", err);
    res.status(422).json({ error: "payment_link_create_failed", message: err.message });
  }
});

paymentLinksRouter.get("/", async (req: Request, res: Response) => {
  try {
    const links = await prisma.paymentLink.findMany({
      where: { merchantId: req.merchant!.id },
      include: { payment: true },
      orderBy: { createdAt: "desc" },
      take: Number(req.query.limit) || 50,
      skip: Number(req.query.offset) || 0,
    });
    res.json({ data: links, total: links.length });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

paymentLinksRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const link = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
      include: { payment: true },
    });
    if (!link) return res.status(404).json({ error: "not_found", message: "Payment link not found" });
    res.json(link);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

paymentLinksRouter.post("/:id/deactivate", async (req: Request, res: Response) => {
  try {
    const link = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });
    if (!link) return res.status(404).json({ error: "not_found", message: "Payment link not found" });

    const updated = await prisma.paymentLink.update({
      where: { id: link.id },
      data: { status: PaymentLinkStatus.INACTIVE },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

paymentLinksRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const link = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });
    if (!link) return res.status(404).json({ error: "not_found", message: "Payment link not found" });

    await prisma.paymentLink.delete({ where: { id: link.id } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export const paymentLinksPublicRouter = Router();

type PublicLinkResult = { error: string; status: number } | { link: any };

async function resolvePublicLink(slug: string): Promise<PublicLinkResult> {
  const link = await prisma.paymentLink.findUnique({
    where: { slug },
    include: { merchant: true },
  });
  if (!link) return { error: "not_found", status: 404 };
  if (link.status === PaymentLinkStatus.INACTIVE) return { error: "link_inactive", status: 403 };
  if (link.status === PaymentLinkStatus.COMPLETED) return { error: "link_already_paid", status: 410 };
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
    return { error: "link_expired", status: 410 };
  }
  return { link };
}

paymentLinksPublicRouter.get("/public/:slug", async (req: Request, res: Response) => {
  const result = await resolvePublicLink(req.params.slug);
  if ("error" in result) {
    return res.status(result.status).json({ error: result.error, message: "Payment link unavailable" });
  }
  res.json({
    slug: result.link!.slug,
    amount: result.link!.amount,
    currency: result.link!.currency,
    description: result.link!.description,
    merchantName: result.link!.merchant.name,
    createdAt: result.link!.createdAt,
  });
});

paymentLinksPublicRouter.post("/public/:slug/pay", async (req: Request, res: Response) => {
  try {
    const result = await resolvePublicLink(req.params.slug);
    if ("error" in result) {
      return res.status(result.status).json({ error: result.error, message: "Payment link unavailable" });
    }
    const link = result.link!;

    const { email, name, card, billing_address, metadata } = req.body;
    if (!card || !card.number || !card.exp_month || !card.exp_year || !card.cvc) {
      return res.status(400).json({ error: "missing_card", message: "card details required" });
    }

    let customerId: string | undefined;
    if (email) {
      const existing = await prisma.customer.findUnique({
        where: { merchantId_email: { merchantId: link.merchantId, email } },
      });
      const customer = existing ?? (await prisma.customer.create({
        data: { merchantId: link.merchantId, email, name: name || null },
      }));
      customerId = customer.id;
    }

    const payment = await paymentService.charge({
      merchantId: link.merchantId,
      customerId,
      amount: link.amount.toFixed(DECIMAL_PRECISION),
      currency: link.currency,
      paymentMethod: { type: "card", card, billing_address },
      metadata: { ...(metadata || {}), payment_link_slug: link.slug },
      description: link.description || `Payment to ${link.merchant.name}`,
    });

    if (payment?.status === PaymentStatus.CAPTURED || payment?.status === PaymentStatus.SETTLED) {
      await prisma.paymentLink.update({
        where: { id: link.id },
        data: { status: PaymentLinkStatus.COMPLETED, paymentId: payment.id },
      });
    }

    res.status(201).json({
      payment: { id: payment?.id, status: payment?.status, amount: payment?.amount, currency: payment?.currency },
      link_status: payment?.status === PaymentStatus.CAPTURED || payment?.status === PaymentStatus.SETTLED ? "COMPLETED" : "PENDING",
    });
  } catch (err: any) {
    console.error("Pay payment link error:", err);
    res.status(422).json({ error: "payment_failed", message: err.message });
  }
});

export default paymentLinksRouter;
