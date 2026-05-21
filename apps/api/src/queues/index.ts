import { Queue } from "bullmq";
import { env } from "../config/env";

export const webhookQueue = new Queue("webhook-delivery", {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});

export const payoutQueue = new Queue("payout-processing", {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: { age: 86400 },
  },
});

export const reconciliationQueue = new Queue("reconciliation", {
  connection: { url: env.REDIS_URL },
});
