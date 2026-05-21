import { Router, Request, Response } from "express";
import { paymentService } from "./payment.service";
import { paymentRepo } from "./payment.repo";

const router = Router();

router.post("/charges", async (req: Request, res: Response) => {
  try {
    const { amount, currency, payment_method, metadata, description } = req.body;

    if (!amount || !payment_method) {
      return res.status(400).json({ error: "missing_fields", message: "amount and payment_method required" });
    }

    const payment = await paymentService.charge({
      merchantId: req.merchant!.id,
      amount,
      currency: currency || "INR",
      paymentMethod: payment_method,
      metadata,
      description,
      idempotencyKey: req.idempotencyKey,
      idempotencyKeyHash: req.idempotencyKeyHash,
      isSandbox: req.isSandbox,
      sandboxScenario: req.sandboxScenario,
    });

    res.status(201).json({ id: payment?.id, status: payment?.status, amount: payment?.amount, currency: payment?.currency });
  } catch (err: any) {
    console.error("Charge error:", err);
    res.status(422).json({ error: "charge_failed", message: err.message });
  }
});

router.post("/charges/:id/capture", async (req: Request, res: Response) => {
  try {
    const payment = await paymentService.capture(req.params.id);
    res.json({ id: payment.id, status: payment.status });
  } catch (err: any) {
    res.status(422).json({ error: "capture_failed", message: err.message });
  }
});

router.post("/charges/:id/refund", async (req: Request, res: Response) => {
  try {
    const payment = await paymentService.refund(req.params.id, req.body.reason);
    res.json({ id: payment.id, status: payment.status });
  } catch (err: any) {
    res.status(422).json({ error: "refund_failed", message: err.message });
  }
});

router.get("/charges/:id", async (req: Request, res: Response) => {
  try {
    const payment = await paymentRepo.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: "not_found" });
    res.json(payment);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/charges", async (req: Request, res: Response) => {
  try {
    const { status, limit, offset } = req.query;
    const payments = await paymentRepo.findByMerchant(req.merchant!.id, {
      status: status as any,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    });
    res.json({ data: payments, total: payments.length });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
