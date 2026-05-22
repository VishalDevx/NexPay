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

interface RazorpayApiError {
  status: number;
  error: { code: string; description: string };
}

async function razorpayRequest(
  method: string,
  path: string,
  config: GatewayConfig,
  body?: any,
): Promise<any> {
  const baseUrl = "https://api.razorpay.com/v1";
  const url = `${baseUrl}${path}`;
  const auth = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString("base64");

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const error = new Error(
      `Razorpay API error: ${errBody.error?.description || response.statusText}`,
    ) as Error & { status: number; code: string };
    error.status = response.status;
    error.code = errBody.error?.code || "razorpay_error";
    throw error;
  }

  return response.json();
}

export class RazorpayGatewayAdapter implements GatewayAdapter {
  readonly provider = "razorpay";
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const body: Record<string, any> = {
      amount: Math.round(input.amount * 100),
      currency: input.currency,
      receipt: input.paymentId,
      notes: {
        merchantId: input.merchantId,
        paymentId: input.paymentId,
        ...(input.metadata || {}),
      },
    };

    if (input.description) body.description = input.description;
    if (input.customerEmail) body.notes!.customerEmail = input.customerEmail;
    if (input.customerPhone) body.notes!.customerPhone = input.customerPhone;

    const result = await razorpayRequest("POST", "/orders", this.config, body);

    return {
      gatewayOrderId: result.id,
      gatewayStatus: result.status,
      gatewayPayload: result,
    };
  }

  async capturePayment(input: CaptureInput): Promise<CaptureResult> {
    try {
      const result = await razorpayRequest(
        "POST",
        `/payments/${input.gatewayOrderId}/capture`,
        this.config,
        { amount: Math.round(input.amount * 100) },
      );

      return {
        gatewayCaptureId: result.id || `capture_${input.gatewayOrderId}`,
        success: true,
        gatewayResponse: result,
      };
    } catch (err: any) {
      if (err.status === 400 && err.code === "BAD_REQUEST_ERROR") {
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
      amount: Math.round(input.amount * 100),
    };
    if (input.reason) body.notes = { reason: input.reason };

    const result = await razorpayRequest(
      "POST",
      `/payments/${input.gatewayPaymentId}/refund`,
      this.config,
      body,
    );

    return {
      gatewayRefundId: result.id,
      success: result.status === "processed" || result.status === "created",
      gatewayResponse: result,
    };
  }

  verifyWebhook(input: VerifyWebhookInput): boolean {
    const secret = this.config.webhookSecret || "";
    if (!secret) return false;

    const expectedSignature = createHmac("sha256", secret)
      .update(input.payload)
      .digest("hex");

    try {
      const sigBuffer = Buffer.from(input.signature);
      const expectedBuffer = Buffer.from(expectedSignature);
      if (sigBuffer.length !== expectedBuffer.length) return false;
      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await razorpayRequest("GET", "/payments?count=1", this.config);
      return true;
    } catch {
      return false;
    }
  }
}
