import { HttpClient } from '../utils/http-client';
import { WebhookEndpoint, WebhookDelivery } from '../types/webhooks';
import { ApiResponse } from '../types/common';

export interface CreateEndpointParams {
  url: string;
  events: string[];
}

export class WebhookResource {
  constructor(private http: HttpClient) {}

  createEndpoint(params: CreateEndpointParams): Promise<ApiResponse<WebhookEndpoint>> {
    return this.http.post('/merchants/webhooks', params);
  }

  listEndpoints(): Promise<ApiResponse<WebhookEndpoint[]>> {
    return this.http.get('/merchants/webhooks');
  }

  deleteEndpoint(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.http.delete(`/merchants/webhooks/${id}`);
  }

  listDeliveries(): Promise<ApiResponse<WebhookDelivery[]>> {
    return this.http.get('/merchants/webhooks/deliveries');
  }

  replayDelivery(id: string): Promise<ApiResponse<WebhookDelivery>> {
    return this.http.post(`/webhooks/deliveries/${id}/replay`);
  }
}
