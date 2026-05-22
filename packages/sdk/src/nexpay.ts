import { NexPayConfig } from './types/common';
import { HttpClient } from './utils/http-client';
import { WebhookVerifier } from './utils/webhook-verifier';
import { ChargeResource } from './resources/charges';
import { CustomerResource } from './resources/customers';
import { RefundResource } from './resources/refunds';
import { PayoutResource } from './resources/payouts';
import { DisputeResource } from './resources/disputes';
import { WebhookResource } from './resources/webhooks';
import { InvoiceResource } from './resources/invoices';
import { MarketplaceResource } from './resources/marketplace';

export class NexPay {
  private http: HttpClient;

  static webhooks = new WebhookVerifier();

  charges: ChargeResource;
  customers: CustomerResource;
  refunds: RefundResource;
  payouts: PayoutResource;
  disputes: DisputeResource;
  webhooks: WebhookResource;
  invoices: InvoiceResource;
  marketplace: MarketplaceResource;

  constructor(config: NexPayConfig) {
    const baseURL =
      config.baseURL ||
      (config.environment === 'live'
        ? 'https://api.nexpay.com/api/v1'
        : 'http://localhost:3001/api/v1');

    const retryConfig = config.retryConfig
      ? {
          maxRetries: config.retryConfig.maxRetries ?? 3,
          baseDelay: config.retryConfig.baseDelay ?? 1000,
        }
      : undefined;

    this.http = new HttpClient(baseURL, config.apiKey, config.timeout, retryConfig);

    this.charges = new ChargeResource(this.http);
    this.customers = new CustomerResource(this.http);
    this.refunds = new RefundResource(this.http);
    this.payouts = new PayoutResource(this.http);
    this.disputes = new DisputeResource(this.http);
    this.webhooks = new WebhookResource(this.http);
    this.invoices = new InvoiceResource(this.http);
    this.marketplace = new MarketplaceResource(this.http);
  }
}
