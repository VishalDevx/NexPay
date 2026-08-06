import cron from "node-cron";
import { env } from "./config/env";
import { prisma } from "./config/db";
import { logger } from "./config/logger";

import { webhookWorker } from "./workers/webhook.worker";
import { payoutWorker } from "./workers/payout.worker";
import { runReconciliation } from "./workers/reconciliation.worker";
import { runFraudUnblock } from "./workers/fraud-unblock.worker";
import { runBilling } from "./workers/billing.worker";
import { outboxWorker } from "./workers/outbox.worker";

import { createApp } from "./app";

const app = createApp();

cron.schedule("0 2 * * *", () => {
  logger.info("Starting daily reconciliation");
  runReconciliation().catch((err) => logger.error({ err }, "Reconciliation cron failed"));
});

cron.schedule("*/30 * * * *", () => {
  logger.info("Running fraud unblock cleanup");
  runFraudUnblock().catch((err) => logger.error({ err }, "Fraud unblock cron failed"));
});

cron.schedule("0 3 1 * *", () => {
  logger.info("Starting monthly billing invoicing");
  runBilling().catch((err) => logger.error({ err }, "Billing cron failed"));
});

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "NexPay API started");
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down gracefully");
  await webhookWorker.close();
  await payoutWorker.close();
  outboxWorker.stop();
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully");
  await webhookWorker.close();
  await payoutWorker.close();
  outboxWorker.stop();
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

export default app;
