import { HttpClient } from '../utils/http-client';
import {
  PaymentIntent,
  PaymentIntentCreateParams,
  CaptureParams,
  CancelParams,
  RefundParams,
} from '../types/payments';
import { ApiResponse } from '../types/common';

export class PaymentIntentResource {
  constructor(private http: HttpClient) {}

  create(params: PaymentIntentCreateParams): Promise<ApiResponse<PaymentIntent>> {
    return this.http.post('/payment-intents', params, params.idempotencyKey);
  }

  retrieve(id: string): Promise<ApiResponse<PaymentIntent>> {
    return this.http.get(`/payment-intents/${id}`);
  }

  list(params?: Record<string, unknown>): Promise<ApiResponse<PaymentIntent[]>> {
    return this.http.get('/payment-intents', params);
  }

  capture(id: string, params?: CaptureParams): Promise<ApiResponse<PaymentIntent>> {
    return this.http.post(`/payment-intents/${id}/capture`, params);
  }

  cancel(id: string, params?: CancelParams): Promise<ApiResponse<PaymentIntent>> {
    return this.http.post(`/payment-intents/${id}/cancel`, params);
  }

  refund(id: string, params?: RefundParams): Promise<ApiResponse<PaymentIntent>> {
    return this.http.post(`/payment-intents/${id}/refund`, params);
  }
}
