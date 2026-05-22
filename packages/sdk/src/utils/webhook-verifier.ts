import { createHmac, timingSafeEqual } from 'crypto';
import { WebhookEvent } from '../types/webhooks';

export class WebhookVerifier {
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return false;
    }
  }

  constructEvent(payload: string, signature: string, secret: string): WebhookEvent {
    if (!this.verifySignature(payload, signature, secret)) {
      throw new Error('Webhook signature verification failed');
    }

    const parsed = JSON.parse(payload);

    return {
      id: parsed.id,
      type: parsed.type,
      data: parsed.data,
      created: parsed.created,
    };
  }
}
