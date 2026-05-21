import { Worker } from "bullmq";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { verifySignature } from "../modules/webhooks/webhook.signer";

export const webhookWorker = new Worker(
  "webhook-delivery",
  async (job) => {
    const { deliveryId, endpointId, payload, secretHash } = job.data;

    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!endpoint || !endpoint.enabled) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: "FAILED", attempts: job.attemptsMade + 1 },
      });
      return;
    }

    const signature = require("crypto")
      .createHmac("sha256", secretHash)
      .update(JSON.stringify(payload))
      .digest("hex");

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-NexPay-Signature": signature,
          "X-NexPay-Event": payload.event,
          "User-Agent": "NexPay-Webhook/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: "DELIVERED",
            attempts: job.attemptsMade + 1,
            deliveredAt: new Date(),
            nextRetryAt: null,
          },
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err: any) {
      const attempts = job.attemptsMade + 1;
      const maxRetries = 5;

      if (attempts >= maxRetries) {
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: "DEAD_LETTER",
            attempts,
            nextRetryAt: null,
          },
        });
      } else {
        const delays = [1, 4, 16, 64, 256];
        const nextDelay = delays[Math.min(attempts - 1, delays.length - 1)];

        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            attempts,
            nextRetryAt: new Date(Date.now() + nextDelay * 1000),
          },
        });

        throw err;
      }
    }
  },
  {
    connection: { url: env.REDIS_URL },
    concurrency: 10,
    maxStalledCount: 3,
  }
);

webhookWorker.on("failed", (job, err) => {
  console.error(`Webhook delivery ${job?.id} failed:`, err.message);
});
