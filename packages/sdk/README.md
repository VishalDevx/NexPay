# NexPay TypeScript SDK

Payment infrastructure for modern businesses.

## Installation

```bash
npm install @nexpay/sdk
```

## Quick Start

```typescript
import NexPay from '@nexpay/sdk';

const nexpay = new NexPay({
  apiKey: 'sk_test_...',
  environment: 'sandbox',
});

// Create a charge
const charge = await nexpay.charges.create({
  amount: 1000,
  currency: 'INR',
  description: 'Test payment',
});

console.log(charge.data.id);
```

## Usage

### Creating a Payment Intent

```typescript
const payment = await nexpay.charges.create({
  amount: 2500,
  currency: 'USD',
  customerId: 'cus_123',
  description: 'Order #1234',
  metadata: {
    order_id: '1234',
  },
  idempotencyKey: 'unique-key-123',
});
```

### Handling Webhooks

```typescript
import { NexPay } from '@nexpay/sdk';

// Verify and construct a webhook event
const payload = request.body; // raw string body
const signature = request.headers['x-webhook-signature'];
const secret = 'whsec_...';

try {
  const event = NexPay.webhooks.constructEvent(payload, signature, secret);
  console.log('Webhook verified:', event.type);
} catch (err) {
  console.error('Webhook verification failed:', err);
}
```

### Error Handling

```typescript
import {
  NexPayAuthenticationError,
  NexPayPaymentError,
  NexPayValidationError,
  NexPayRateLimitError,
  NexPayApiError,
} from '@nexpay/sdk';

try {
  await nexpay.charges.create({ amount: 100, currency: 'INR' });
} catch (error) {
  if (error instanceof NexPayAuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof NexPayValidationError) {
    console.error('Invalid parameters:', error.details);
  } else if (error instanceof NexPayRateLimitError) {
    console.error('Rate limited - retry later');
  } else if (error instanceof NexPayPaymentError) {
    console.error('Payment failed:', error.message);
  } else if (error instanceof NexPayApiError) {
    console.error('API error:', error.message);
  }
}
```

### TypeScript Usage

```typescript
import NexPay, {
  Currency,
  PaymentIntent,
  Customer,
  ChargeResponse,
} from '@nexpay/sdk';

const nexpay = new NexPay({ apiKey: 'sk_test_...' });

const charge: ChargeResponse = await nexpay.charges.retrieve('ch_123');
```

## Configuration

| Option        | Type                 | Default                       | Description                        |
|---------------|----------------------|-------------------------------|------------------------------------|
| apiKey        | `string`             | (required)                    | Your NexPay API key                |
| environment   | `'sandbox' \| 'live'` | `'sandbox'`                   | API environment                    |
| baseURL       | `string`             | `http://localhost:3001/api/v1` | Custom base URL                    |
| timeout       | `number`             | `30000`                       | Request timeout in ms              |
| retryConfig   | `RetryConfig`        | `{ maxRetries: 3, baseDelay: 1000 }` | Retry configuration     |

## API Reference

### Charges

| Method         | Endpoint                              | Description           |
|----------------|---------------------------------------|-----------------------|
| `create`       | `POST /payments/charges`              | Create a charge       |
| `retrieve`     | `GET /payments/charges/:id`           | Retrieve a charge     |
| `list`         | `GET /payments/charges`               | List charges          |
| `capture`      | `POST /payments/charges/:id/capture`  | Capture a charge      |
| `cancel`       | `POST /payments/charges/:id/cancel`   | Cancel a charge       |
| `refund`       | `POST /payments/charges/:id/refund`   | Refund a charge       |

### Customers

| Method     | Endpoint                   | Description          |
|------------|----------------------------|----------------------|
| `create`   | `POST /customers`          | Create a customer    |
| `retrieve` | `GET /customers/:id`       | Retrieve a customer  |
| `update`   | `PATCH /customers/:id`     | Update a customer    |
| `list`     | `GET /customers`           | List customers       |
| `delete`   | `DELETE /customers/:id`    | Delete a customer    |

### Payouts

| Method     | Endpoint             | Description       |
|------------|----------------------|-------------------|
| `create`   | `POST /payouts`      | Create a payout   |
| `retrieve` | `GET /payouts/:id`   | Retrieve a payout |
| `list`     | `GET /payouts`       | List payouts      |

### Disputes

| Method          | Endpoint                           | Description              |
|-----------------|------------------------------------|--------------------------|
| `retrieve`      | `GET /disputes/:id`                | Retrieve a dispute       |
| `list`          | `GET /disputes`                    | List disputes            |
| `submitEvidence`| `POST /disputes/:id/evidence`      | Submit evidence          |

### Webhooks

| Method           | Endpoint                                  | Description              |
|------------------|-------------------------------------------|--------------------------|
| `createEndpoint` | `POST /merchants/webhooks`                | Create webhook endpoint  |
| `listEndpoints`  | `GET /merchants/webhooks`                 | List webhook endpoints   |
| `deleteEndpoint` | `DELETE /merchants/webhooks/:id`          | Delete webhook endpoint  |
| `listDeliveries` | `GET /merchants/webhooks/deliveries`      | List webhook deliveries  |
| `replayDelivery` | `POST /webhooks/deliveries/:id/replay`    | Replay webhook delivery  |

### Invoices

| Method   | Endpoint                   | Description       |
|----------|----------------------------|-------------------|
| `create` | `POST /invoices`           | Create an invoice |
| `list`   | `GET /invoices`            | List invoices     |
| `send`   | `POST /invoices/:id/send`  | Send an invoice   |
| `void`   | `POST /invoices/:id/void`  | Void an invoice   |

### Marketplace

| Method             | Endpoint                   | Description               |
|--------------------|----------------------------|---------------------------|
| `createSubMerchant`| `POST /marketplace`        | Create a sub merchant     |
| `listSubMerchants` | `GET /marketplace`         | List sub merchants        |
| `createSplit`      | `POST /marketplace/split`  | Create a split transaction|

## Documentation

For full API documentation, visit [docs.nexpay.com](https://docs.nexpay.com).
