import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import { randomUUID } from "crypto";
import * as chaos from "./chaos-simulator";
import { webhookService } from "../webhooks/webhook.service";

const router = Router();

router.post("/events", async (req: Request, res: Response) => {
  try {
    const { event, paymentId, amount } = req.body;

    if (!event) {
      return res.status(400).json({ error: "missing_event", message: "event is required" });
    }

    const validEvents = ["dispute_raised", "chargeback", "payout_failure"];
    if (!validEvents.includes(event)) {
      return res.status(400).json({ error: "invalid_event", message: `event must be one of: ${validEvents.join(", ")}` });
    }

    let targetPaymentId = paymentId;

    if (!targetPaymentId) {
      const sandboxPayment = await prisma.payment.create({
        data: {
          merchantId: req.merchant!.id,
          amount: amount || 1000,
          currency: "INR",
          status: "CAPTURED",
          metadata: { sandbox: true, simulated: true },
        },
      });
      targetPaymentId = sandboxPayment.id;
    }

    let result: any = {};

    if (event === "dispute_raised") {
      const dispute = await prisma.dispute.create({
        data: {
          paymentId: targetPaymentId,
          merchantId: req.merchant!.id,
          reason: "Simulated dispute for sandbox testing",
          amount: amount || 1000,
          status: "RAISED",
        },
      });

      await prisma.payment.update({
        where: { id: targetPaymentId },
        data: { status: "DISPUTED" },
      });

      result = { disputeId: dispute.id, status: dispute.status };
    }

    if (event === "chargeback") {
      const dispute = await prisma.dispute.create({
        data: {
          paymentId: targetPaymentId,
          merchantId: req.merchant!.id,
          reason: "Simulated chargeback for sandbox testing",
          amount: amount || 1000,
          status: "RESOLVED_MERCHANT_LOST",
        },
      });

      await prisma.payment.update({
        where: { id: targetPaymentId },
        data: { status: "REFUNDED" },
      });

      result = { disputeId: dispute.id, status: "chargeback_completed" };
    }

    if (event === "payout_failure") {
      const payout = await prisma.payout.create({
        data: {
          merchantId: req.merchant!.id,
          amount: amount || 5000,
          currency: "INR",
          status: "FAILED",
          bankRef: "sandbox-simulated",
        },
      });

      result = { payoutId: payout.id, status: payout.status };
    }

    res.json({ simulated: true, event, paymentId: targetPaymentId, result });
  } catch (err: any) {
    res.status(422).json({ error: "simulation_failed", message: err.message });
  }
});

const SAMPLE_PAYLOADS: Record<string, any> = {
  "payment.captured": {
    amount: 2500,
    currency: "USD",
    status: "CAPTURED",
    customer: { email: "test@example.com", name: "Test Customer" },
    paymentMethod: "card",
  },
  "payment.failed": {
    amount: 1500,
    currency: "USD",
    status: "FAILED",
    failureReason: "insufficient_funds",
    customer: { email: "test@example.com" },
  },
  "payment.refunded": {
    amount: 2500,
    currency: "USD",
    status: "REFUNDED",
    refundAmount: 2500,
    refundReason: "customer_request",
    customer: { email: "test@example.com" },
  },
  "dispute.created": {
    amount: 2500,
    currency: "USD",
    disputeReason: "fraudulent",
    customer: { email: "test@example.com" },
  },
  "dispute.resolved": {
    amount: 2500,
    currency: "USD",
    disputeStatus: "RESOLVED_MERCHANT_LOST",
    customer: { email: "test@example.com" },
  },
  "payout.paid": {
    amount: 50000,
    currency: "USD",
    status: "COMPLETED",
    bankReference: "SANDBOX-REF-001",
  },
  "payout.failed": {
    amount: 50000,
    currency: "USD",
    status: "FAILED",
    failureReason: "bank_account_invalid",
  },
};

router.post("/trigger-webhook", async (req: Request, res: Response) => {
  try {
    const { eventType, payload } = req.body;
    const merchantId = req.merchant!.id;

    if (!eventType) {
      return res.status(400).json({ error: "missing_event_type", message: "eventType is required" });
    }

    const validEvents = [
      "payment.captured", "payment.failed", "payment.refunded",
      "dispute.created", "dispute.resolved",
      "payout.paid", "payout.failed",
    ];
    if (!validEvents.includes(eventType)) {
      return res.status(400).json({
        error: "invalid_event_type",
        message: `eventType must be one of: ${validEvents.join(", ")}`,
      });
    }

    const samplePayload = SAMPLE_PAYLOADS[eventType] || {};
    const webhookPayload = payload || samplePayload;

    const sandboxPayment = await prisma.payment.create({
      data: {
        merchantId,
        amount: webhookPayload.amount || 1000,
        currency: webhookPayload.currency || "USD",
        status: "CAPTURED",
        metadata: { sandbox: true, simulated: true, eventType },
      },
    });

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { merchantId, enabled: true },
    });

    const deliveries: any[] = [];
    const errors: string[] = [];

    for (const endpoint of endpoints) {
      const events = endpoint.events as string[];
      if (!events.includes(eventType) && !events.includes("*")) {
        errors.push(`Endpoint ${endpoint.id}: does not listen to ${eventType}`);
        continue;
      }

      const deliveryPayload = { event: eventType, data: webhookPayload, timestamp: new Date().toISOString() };

      const delivery = await prisma.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          paymentId: sandboxPayment.id,
          payload: deliveryPayload,
          status: "PENDING",
          maxRetries: 5,
        },
      });

      const { webhookQueue } = await import("../webhooks/webhook.service");
      await webhookQueue.add(
        `webhook:sandbox:${delivery.id}`,
        { deliveryId: delivery.id, endpointId: endpoint.id, payload: deliveryPayload, secretHash: endpoint.secretHash },
        { jobId: `sandbox:${delivery.id}`, attempts: 1 }
      );

      deliveries.push({
        deliveryId: delivery.id,
        endpointId: endpoint.id,
        endpointUrl: endpoint.url,
        status: "PENDING",
      });
    }

    const timing = { startTime: new Date().toISOString() };

    let deliveryResult: any;
    if (deliveries.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const updated = await prisma.webhookDelivery.findMany({
        where: { id: { in: deliveries.map((d) => d.deliveryId) } },
      });
      deliveryResult = updated.map((d) => ({
        id: d.id,
        status: d.status,
        attempts: d.attempts,
        httpStatus: (d.payload as any)?.httpStatus || null,
      }));
    }

    res.json({
      simulated: true,
      eventType,
      paymentId: sandboxPayment.id,
      endpointCount: endpoints.length,
      matchedEndpoints: deliveries.length,
      deliveries: deliveryResult || deliveries,
      timing: { ...timing, endTime: new Date().toISOString() },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    res.status(422).json({ error: "webhook_trigger_failed", message: err.message });
  }
});

router.delete("/reset", async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;

    const sandboxPayments = await prisma.payment.findMany({
      where: { merchantId, metadata: { path: ["sandbox"], equals: true } },
      select: { id: true },
    });

    const paymentIds = sandboxPayments.map((p) => p.id);

    await prisma.dispute.deleteMany({ where: { merchantId, paymentId: { in: paymentIds } } });
    await prisma.paymentEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.ledgerEntry.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.fraudEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.webhookDelivery.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.payoutItem.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });

    const sandboxPayouts = await prisma.payout.findMany({
      where: { merchantId, bankRef: "sandbox-simulated" },
      select: { id: true },
    });
    const payoutIds = sandboxPayouts.map((p) => p.id);
    await prisma.payoutItem.deleteMany({ where: { payoutId: { in: payoutIds } } });
    await prisma.payout.deleteMany({ where: { id: { in: payoutIds } } });

    const sandboxKeys = await redis.keys(`sandbox:${merchantId}:*`);
    if (sandboxKeys.length > 0) {
      await redis.del(...sandboxKeys);
    }

    res.json({ reset: true, message: "Sandbox environment has been reset" });
  } catch (err: any) {
    res.status(500).json({ error: "reset_failed", message: err.message });
  }
});

router.get("/test-cards", (_req: Request, res: Response) => {
  const cards = [
    { number: "4111111111111111", scheme: "visa", scenario: "success", label: "Payment succeeds" },
    { number: "4000000000000002", scheme: "visa", scenario: "decline", label: "Card declined" },
    { number: "4000000000003220", scheme: "visa", scenario: "3ds_required", label: "3D Secure required" },
    { number: "4100000000000019", scheme: "visa", scenario: "fraud", label: "Fraud auto-decline" },
    { number: "4000002500003155", scheme: "visa", scenario: "insufficient_funds", label: "Insufficient balance" },
    { number: "4000000000000119", scheme: "visa", scenario: "lost_card", label: "Card reported lost" },
    { number: "4242424242424242", scheme: "visa", scenario: "success", label: "Standard success card" },
    { number: "success@upi", scheme: "upi", scenario: "success", label: "UPI payment succeeds" },
    { number: "fail@upi", scheme: "upi", scenario: "decline", label: "UPI payment fails" },
  ];
  res.json({ data: cards });
});

router.post("/simulate/provider-timeout", async (req: Request, res: Response) => {
  try {
    const { paymentId, amount, currency } = req.body;
    const context: chaos.ChaosContext = {
      paymentId: paymentId || `sim_${randomUUID().slice(0, 8)}`,
      amount: amount || 1000,
      currency: currency || "INR",
      merchantId: req.merchant!.id,
      paymentMethod: "card",
      timestamp: new Date(),
    };
    const effect = await chaos.evaluate(req.merchant!.id, context);
    res.json({ simulated: true, scenario: "provider_timeout", effect, context });
  } catch (err: any) {
    res.status(422).json({ error: "simulation_failed", message: err.message });
  }
});

router.post("/simulate/provider-error", async (req: Request, res: Response) => {
  try {
    const { paymentId, amount, currency } = req.body;
    const context: chaos.ChaosContext = {
      paymentId: paymentId || `sim_${randomUUID().slice(0, 8)}`,
      amount: amount || 1000,
      currency: currency || "INR",
      merchantId: req.merchant!.id,
      paymentMethod: "card",
      timestamp: new Date(),
    };
    const effect: chaos.ChaosEffect = {
      type: "provider_500",
      errorMessage: "Simulated provider 500 error",
    };
    await chaos.addHistory(req.merchant!.id, { rule: "manual_provider_error", effect, context });
    res.json({ simulated: true, scenario: "provider_500", effect, context });
  } catch (err: any) {
    res.status(422).json({ error: "simulation_failed", message: err.message });
  }
});

router.post("/simulate/webhook-delay", async (req: Request, res: Response) => {
  try {
    const { paymentId, delayMs } = req.body;
    const context: chaos.ChaosContext = {
      paymentId: paymentId || `sim_${randomUUID().slice(0, 8)}`,
      amount: 1000,
      currency: "INR",
      merchantId: req.merchant!.id,
      paymentMethod: "card",
      timestamp: new Date(),
    };
    const effect: chaos.ChaosEffect = {
      type: "delayed_webhook",
      delayMs: delayMs || 15000,
    };
    await chaos.addHistory(req.merchant!.id, { rule: "manual_webhook_delay", effect, context });
    res.json({ simulated: true, scenario: "webhook_delay", effect, context });
  } catch (err: any) {
    res.status(422).json({ error: "simulation_failed", message: err.message });
  }
});

router.get("/chaos/rules", async (req: Request, res: Response) => {
  try {
    const rules = await chaos.getRules(req.merchant!.id);
    res.json({ data: rules });
  } catch (err: any) {
    res.status(500).json({ error: "chaos_rules_error", message: err.message });
  }
});

router.post("/chaos/rules", async (req: Request, res: Response) => {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: "validation_error", message: "rules must be an array" });
    }
    const updated = await chaos.updateRules(req.merchant!.id, rules);
    res.json({ data: updated });
  } catch (err: any) {
    res.status(422).json({ error: "chaos_update_error", message: err.message });
  }
});

router.post("/chaos/trigger", async (req: Request, res: Response) => {
  try {
    const { scenario, paymentId, amount, currency } = req.body;
    const validScenarios = [
      "provider_timeout", "provider_500", "duplicate_webhook",
      "delayed_webhook", "payout_stuck", "bank_mismatch",
      "ledger_imbalance", "redis_unavailable", "worker_crash",
    ];
    if (!validScenarios.includes(scenario)) {
      return res.status(400).json({
        error: "invalid_scenario",
        message: `scenario must be one of: ${validScenarios.join(", ")}`,
      });
    }

    const context: chaos.ChaosContext = {
      paymentId: paymentId || `trigger_${randomUUID().slice(0, 8)}`,
      amount: amount || 1000,
      currency: currency || "INR",
      merchantId: req.merchant!.id,
      paymentMethod: "card",
      timestamp: new Date(),
    };

    const rules = await chaos.getRules(req.merchant!.id);
    const rule = rules.find((r) => r.name === scenario);
    let effect: chaos.ChaosEffect;
    if (rule) {
      effect = rule.effect(context);
    } else {
      effect = { type: "none" };
    }

    await chaos.addHistory(req.merchant!.id, { rule: scenario, effect, context });
    res.json({ triggered: true, scenario, effect, context });
  } catch (err: any) {
    res.status(422).json({ error: "chaos_trigger_error", message: err.message });
  }
});

router.get("/chaos/history", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await chaos.getHistory(req.merchant!.id, Math.min(limit, 200));
    res.json({ data: history });
  } catch (err: any) {
    res.status(500).json({ error: "chaos_history_error", message: err.message });
  }
});

router.delete("/chaos/history", async (req: Request, res: Response) => {
  try {
    await chaos.clearHistory(req.merchant!.id);
    res.json({ cleared: true });
  } catch (err: any) {
    res.status(500).json({ error: "chaos_clear_error", message: err.message });
  }
});

export default router;
