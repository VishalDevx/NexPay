import { HttpClient } from '../utils/http-client';
import { Payout, PayoutCreateParams, PayoutListParams } from '../types/payouts';
import { ApiResponse } from '../types/common';

export class PayoutResource {
  constructor(private http: HttpClient) {}

  create(params: PayoutCreateParams): Promise<ApiResponse<Payout>> {
    return this.http.post('/payouts', params);
  }

  retrieve(id: string): Promise<ApiResponse<Payout>> {
    return this.http.get(`/payouts/${id}`);
  }

  list(params?: PayoutListParams): Promise<ApiResponse<Payout[]>> {
    return this.http.get('/payouts', params as Record<string, unknown>);
  }
}
