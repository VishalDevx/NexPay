import { Amount, Currency, IdempotencyKey, Metadata } from './common';

export type PaymentIntentStatus =
  | 'initiated'
  | 'processing'
  | 'authorized'
  | 'captured'
  | 'settled'
  | 'failed'
  | 'refunded'
  | 'disputed';

export interface PaymentIntentCreateParams {
  amount: Amount;
  currency: Currency;
  customerId?: string;
  paymentMethod?: string;
  description?: string;
  metadata?: Metadata;
  idempotencyKey?: IdempotencyKey;
}

export interface PaymentIntent {
  id: string;
  amount: Amount;
  currency: Currency;
  status: PaymentIntentStatus;
  customerId?: string;
  description?: string;
  metadata?: Metadata;
  createdAt: string;
  updatedAt: string;
}

export interface ChargeResponse {
  id: string;
  amount: Amount;
  currency: Currency;
  status: PaymentIntentStatus;
  paymentIntent?: PaymentIntent;
  createdAt: string;
}

export interface CaptureParams {
  amount?: Amount;
}

export interface CancelParams {
  reason?: string;
}

export interface RefundParams {
  amount?: Amount;
  reason?: string;
}
