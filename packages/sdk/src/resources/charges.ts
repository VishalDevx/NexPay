import { HttpClient } from '../utils/http-client';
import {
  ChargeResponse,
  PaymentIntentCreateParams,
  CaptureParams,
  RefundParams,
} from '../types/payments';
import { ApiResponse } from '../types/common';

export class ChargeResource {
  constructor(private http: HttpClient) {}

  create(params: PaymentIntentCreateParams): Promise<ApiResponse<ChargeResponse>> {
    return this.http.post('/payments/charges', params, params.idempotencyKey);
  }

  retrieve(id: string): Promise<ApiResponse<ChargeResponse>> {
    return this.http.get(`/payments/charges/${id}`);
  }

  list(params?: Record<string, unknown>): Promise<ApiResponse<ChargeResponse[]>> {
    return this.http.get('/payments/charges', params);
  }

  capture(id: string, params?: CaptureParams): Promise<ApiResponse<ChargeResponse>> {
    return this.http.post(`/payments/charges/${id}/capture`, params);
  }

  cancel(id: string): Promise<ApiResponse<ChargeResponse>> {
    return this.http.post(`/payments/charges/${id}/cancel`);
  }

  refund(id: string, params?: RefundParams): Promise<ApiResponse<ChargeResponse>> {
    return this.http.post(`/payments/charges/${id}/refund`, params);
  }
}
