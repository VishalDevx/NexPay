import { Router, Request, Response } from "express";
import { gatewayRegistry } from "./gateway-registry";
import { MockGatewayAdapter } from "./mock-gateway";
import { RazorpayGatewayAdapter } from "./razorpay-gateway";
import { StripeGatewayAdapter } from "./stripe-gateway";
import { prisma } from "../../config/db";

const router = Router();

function getConfigForProvider(
  provider: string,
  merchantId: string,
): Promise<{ apiKey: string; secretKey: string; webhookSecret?: string } | null> {
  return prisma.merchant
    .findUnique({ where: { id: merchantId }, select: { settingsJson: true } })
    .then((merchant) => {
      const settings = (merchant?.settingsJson as any) || {};
      const gatewayConfig = settings.gateways?.[provider];
      if (!gatewayConfig?.apiKey || !gatewayConfig?.secretKey) return null;
      return {
        apiKey: gatewayConfig.apiKey,
        secretKey: gatewayConfig.secretKey,
        webhookSecret: gatewayConfig.webhookSecret,
      };
    });
}

gatewayRegistry.register(new MockGatewayAdapter({ apiKey: "mock", secretKey: "mock", sandbox: true }));

router.get("/providers", async (_req: Request, res: Response) => {
  const adapters = gatewayRegistry.getAll();
  const providers = adapters.map((a) => ({
    provider: a.provider,
    available: true,
  }));
  res.json({ data: providers });
});

router.post("/process", async (req: Request, res: Response) => {
  try {
    const { provider, action, ...data } = req.body;

    if (!provider || !action) {
      return res.status(400).json({
        error: "validation_error",
        message: "provider and action are required",
      });
    }

    const validActions = ["create_order", "capture", "refund"];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: "validation_error",
        message: `action must be one of: ${validActions.join(", ")}`,
      });
    }

    const adapter = gatewayRegistry.get(provider);
    if (!adapter) {
      return res.status(404).json({
        error: "provider_not_found",
        message: `Gateway provider '${provider}' not found`,
      });
    }

    let result: any;

    if (action === "create_order") {
      if (!data.amount || !data.currency) {
        return res.status(400).json({
          error: "validation_error",
          message: "amount and currency are required for create_order",
        });
      }
      result = await adapter.createOrder({
        amount: data.amount,
        currency: data.currency,
        merchantId: req.merchant!.id,
        paymentId: data.paymentId || `pmt_${Date.now()}`,
        description: data.description,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        metadata: data.metadata,
      });
    } else if (action === "capture") {
      if (!data.gatewayOrderId || !data.amount) {
        return res.status(400).json({
          error: "validation_error",
          message: "gatewayOrderId and amount are required for capture",
        });
      }
      result = await adapter.capturePayment({
        gatewayOrderId: data.gatewayOrderId,
        amount: data.amount,
      });
    } else if (action === "refund") {
      if (!data.gatewayPaymentId || !data.amount) {
        return res.status(400).json({
          error: "validation_error",
          message: "gatewayPaymentId and amount are required for refund",
        });
      }
      result = await adapter.refundPayment({
        gatewayPaymentId: data.gatewayPaymentId,
        amount: data.amount,
        reason: data.reason,
      });
    }

    res.json({ provider, action, result });
  } catch (err: any) {
    res.status(502).json({
      error: "gateway_error",
      message: err.message,
      provider: req.body?.provider,
    });
  }
});

router.post("/:provider/webhook", async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const adapter = gatewayRegistry.get(provider);

    if (!adapter) {
      return res.status(404).json({
        error: "provider_not_found",
        message: `Gateway provider '${provider}' not found`,
      });
    }

    const rawBody = JSON.stringify(req.body);
    const signature =
      req.headers["x-razorpay-signature"] ||
      req.headers["stripe-signature"] ||
      "";

    const isValid = adapter.verifyWebhook({
      payload: rawBody,
      signature: signature as string,
    });

    if (!isValid) {
      return res.status(401).json({
        error: "invalid_webhook_signature",
        message: "Webhook signature verification failed",
      });
    }

    const eventType =
      req.body.event || req.body.type || "unknown";

    res.json({
      received: true,
      provider,
      event: eventType,
    });
  } catch (err: any) {
    res.status(500).json({
      error: "webhook_processing_error",
      message: err.message,
    });
  }
});

export default router;
