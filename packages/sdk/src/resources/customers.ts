import { HttpClient } from '../utils/http-client';
import {
  Customer,
  CustomerCreateParams,
  CustomerUpdateParams,
  CustomerListParams,
} from '../types/customers';
import { ApiResponse } from '../types/common';

export class CustomerResource {
  constructor(private http: HttpClient) {}

  create(params: CustomerCreateParams): Promise<ApiResponse<Customer>> {
    return this.http.post('/customers', params);
  }

  retrieve(id: string): Promise<ApiResponse<Customer>> {
    return this.http.get(`/customers/${id}`);
  }

  update(id: string, params: CustomerUpdateParams): Promise<ApiResponse<Customer>> {
    return this.http.patch(`/customers/${id}`, params);
  }

  list(params?: CustomerListParams): Promise<ApiResponse<Customer[]>> {
    return this.http.get('/customers', params as Record<string, unknown>);
  }

  delete(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.http.delete(`/customers/${id}`);
  }
}
