import { HttpClient } from '../utils/http-client';
import { Refund, RefundListParams } from '../types/refunds';
import { ApiResponse } from '../types/common';

export class RefundResource {
  constructor(private http: HttpClient) {}

  list(params?: RefundListParams): Promise<ApiResponse<Refund[]>> {
    return this.http.get('/refunds', params as Record<string, unknown>);
  }
}
