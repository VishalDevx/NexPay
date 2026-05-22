import { randomUUID } from "crypto";
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

export class MockGatewayAdapter implements GatewayAdapter {
  readonly provider = "mock";
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  private async simulateLatency(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    await this.simulateLatency();
    return {
      gatewayOrderId: `mock_order_${randomUUID().slice(0, 8)}`,
      gatewayStatus: "created",
      gatewayPayload: {
        id: `mock_order_${randomUUID().slice(0, 8)}`,
        amount: input.amount,
        currency: input.currency,
        status: "created",
        method: "mock",
        sandbox: this.config.sandbox,
      },
    };
  }

  async capturePayment(input: CaptureInput): Promise<CaptureResult> {
    await this.simulateLatency();
    return {
      gatewayCaptureId: `mock_capture_${randomUUID().slice(0, 8)}`,
      success: true,
      gatewayResponse: {
        id: `mock_capture_${randomUUID().slice(0, 8)}`,
        orderId: input.gatewayOrderId,
        amount: input.amount,
        status: "captured",
      },
    };
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    await this.simulateLatency();
    return {
      gatewayRefundId: `mock_refund_${randomUUID().slice(0, 8)}`,
      success: true,
      gatewayResponse: {
        id: `mock_refund_${randomUUID().slice(0, 8)}`,
        amount: input.amount,
        status: "refunded",
        reason: input.reason || null,
      },
    };
  }

  verifyWebhook(_input: VerifyWebhookInput): boolean {
    return true;
  }

  async healthCheck(): Promise<boolean> {
    await this.simulateLatency();
    return true;
  }
}
