export interface GatewayConfig {
  apiKey: string;
  secretKey: string;
  webhookSecret?: string;
  sandbox: boolean;
}

export interface CreateOrderInput {
  amount: number;
  currency: string;
  merchantId: string;
  paymentId: string;
  description?: string;
  customerEmail?: string;
  customerPhone?: string;
  metadata?: Record<string, string>;
}

export interface CreateOrderResult {
  gatewayOrderId: string;
  gatewayStatus: string;
  gatewayPayload?: Record<string, any>;
}

export interface CaptureInput {
  gatewayOrderId: string;
  amount: number;
}

export interface CaptureResult {
  gatewayCaptureId: string;
  success: boolean;
  gatewayResponse?: Record<string, any>;
}

export interface RefundInput {
  gatewayPaymentId: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  gatewayRefundId: string;
  success: boolean;
  gatewayResponse?: Record<string, any>;
}

export interface VerifyWebhookInput {
  payload: string;
  signature: string;
}

export interface GatewayAdapter {
  readonly provider: string;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  capturePayment(input: CaptureInput): Promise<CaptureResult>;
  refundPayment(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(input: VerifyWebhookInput): boolean;
  healthCheck(): Promise<boolean>;
}
