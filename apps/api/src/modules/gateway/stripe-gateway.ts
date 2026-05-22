import { createHmac, timingSafeEqual } from "crypto";
import type {
  GatewayAdapter,
  GatewayConfig,
  CreateOrderInput,
  CreateOrderResult,
  CaptureInput,
  CaptureResult,
  RefundInput,
  RefundResult,
  VerifyWebhookInput,
} from "./gateway.types";

async function stripeRequest(
  method: string,
  path: string,
  config: GatewayConfig,
  body?: Record<string, any>,
): Promise<any> {
  const baseUrl = "https://api.stripe.com/v1";
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });

  if (!response.ok) {
    const errBody: any = await response.json().catch(() => ({}));
    const error = new Error(
      `Stripe API error: ${errBody?.error?.message || response.statusText}`,
    ) as Error & { status: number; code: string; stripeCode?: string };
    error.status = response.status;
    error.code = errBody?.error?.type || "stripe_error";
    error.stripeCode = errBody?.error?.code;
    throw error;
  }

  return response.json();
}

export class StripeGatewayAdapter implements GatewayAdapter {
  readonly provider = "stripe";
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const body: Record<string, any> = {
      amount: Math.round(input.amount * 100),
      currency: input.currency.toLowerCase(),
      description: input.description || `Payment ${input.paymentId}`,
      metadata: {
        merchantId: input.merchantId,
        paymentId: input.paymentId,
        integration: "nexpay",
        ...(input.metadata || {}),
      },
      capture_method: "manual",
    };

    if (input.customerEmail) {
      body.receipt_email = input.customerEmail;
    }

    const result = await stripeRequest("POST", "/payment_intents", this.config, body);

    return {
      gatewayOrderId: result.id,
      gatewayStatus: result.status,
      gatewayPayload: {
        id: result.id,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        client_secret: result.client_secret,
        next_action: result.next_action || null,
      },
    };
  }

  async capturePayment(input: CaptureInput): Promise<CaptureResult> {
    try {
      const result = await stripeRequest(
        "POST",
        `/payment_intents/${input.gatewayOrderId}/capture`,
        this.config,
        { amount_to_capture: Math.round(input.amount * 100) },
      );

      return {
        gatewayCaptureId: result.latest_charge || result.id,
        success: result.status === "succeeded" || result.status === "processing",
        gatewayResponse: result,
      };
    } catch (err: any) {
      if (err.stripeCode === "payment_intent_unexpected_state") {
        return {
          gatewayCaptureId: "",
          success: false,
          gatewayResponse: { error: err.message },
        };
      }
      throw err;
    }
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    const body: Record<string, any> = {
      payment_intent: input.gatewayPaymentId,
      amount: Math.round(input.amount * 100),
    };

    if (input.reason) {
      body.reason = input.reason === "fraudulent" ? "fraudulent" : "requested_by_customer";
    }

    const result = await stripeRequest("POST", "/refunds", this.config, body);

    return {
      gatewayRefundId: result.id,
      success: result.status === "succeeded" || result.status === "pending",
      gatewayResponse: result,
    };
  }

  verifyWebhook(input: VerifyWebhookInput): boolean {
    const secret = this.config.webhookSecret || "";
    if (!secret) return false;

    try {
      const parts = input.signature.split(",");
      const sigMap = new Map<string, string>();
      for (const part of parts) {
        const [k, v] = part.split("=");
        sigMap.set(k.trim(), v.trim());
      }

      const sigValue = sigMap.get("v1");
      if (!sigValue) return false;

      const expectedSignature = createHmac("sha256", secret)
        .update(input.payload)
        .digest("hex");

      const sigBuffer = Buffer.from(sigValue);
      const expectedBuffer = Buffer.from(expectedSignature);
      if (sigBuffer.length !== expectedBuffer.length) return false;
      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await stripeRequest("GET", "/balance", this.config);
      return true;
    } catch {
      return false;
    }
  }
}
