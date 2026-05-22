export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  status: 'success' | 'failed' | 'pending';
  responseCode?: number;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created: string;
}

export interface WebhookPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created: string;
  signature: string;
}
