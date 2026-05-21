import crypto from "crypto";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import { Queue } from "bullmq";
import { env } from "../../config/env";

const WEBHOOK_QUEUE = "webhook-delivery";

export const webhookQueue = new Queue(WEBHOOK_QUEUE, {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 86400 },
  },
});

export const webhookService = {
  generateSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  },

  signPayload(payload: any, secret: string): string {
    return crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");
  },

  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expected = this.signPayload(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  },

  async deliver(event: string, paymentId: string, merchantId: string) {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { merchantId, enabled: true },
    });

    for (const endpoint of endpoints) {
      const events = endpoint.events as string[];
      if (!events.includes(event) && !events.includes("*")) continue;

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment) continue;

      const payload = { event, data: payment, timestamp: new Date().toISOString() };

      const delivery = await prisma.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          paymentId,
          payload,
          status: "PENDING",
          maxRetries: 5,
        },
      });

      await webhookQueue.add(
        `webhook:${delivery.id}`,
        { deliveryId: delivery.id, endpointId: endpoint.id, payload, secretHash: endpoint.secretHash },
        { jobId: delivery.id }
      );
    }
  },
};
