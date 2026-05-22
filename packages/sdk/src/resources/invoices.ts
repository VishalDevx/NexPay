import { HttpClient } from '../utils/http-client';
import { Invoice, InvoiceCreateParams, InvoiceListParams } from '../types/invoices';
import { ApiResponse } from '../types/common';

export class InvoiceResource {
  constructor(private http: HttpClient) {}

  create(params: InvoiceCreateParams): Promise<ApiResponse<Invoice>> {
    return this.http.post('/invoices', params);
  }

  list(params?: InvoiceListParams): Promise<ApiResponse<Invoice[]>> {
    return this.http.get('/invoices', params as Record<string, unknown>);
  }

  send(id: string): Promise<ApiResponse<Invoice>> {
    return this.http.post(`/invoices/${id}/send`);
  }

  void(id: string): Promise<ApiResponse<Invoice>> {
    return this.http.post(`/invoices/${id}/void`);
  }
}
