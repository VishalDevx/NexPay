import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, name, phone, metadata } = req.body;

    const existing = await prisma.customer.findUnique({
      where: { merchantId_email: { merchantId: req.merchant!.id, email } },
    });
    if (existing) return res.status(200).json(existing);

    const customer = await prisma.customer.create({
      data: { merchantId: req.merchant!.id, email, name, phone, metadata },
    });

    res.status(201).json(customer);
  } catch (err: any) {
    res.status(422).json({ error: "customer_creation_failed", message: err.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  const customers = await prisma.customer.findMany({
    where: { merchantId: req.merchant!.id },
    include: { _count: { select: { payments: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: customers });
});

router.get("/:id", async (req: Request, res: Response) => {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, merchantId: req.merchant!.id },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!customer) return res.status(404).json({ error: "not_found" });
  res.json(customer);
});

router.get("/:id/payments", async (req: Request, res: Response) => {
  const payments = await prisma.payment.findMany({
    where: { customerId: req.params.id, merchantId: req.merchant!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: payments });
});

export default router;
