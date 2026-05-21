import express from "express";
import cors from "cors";
import helmet from "helmet";
import cron from "node-cron";
import { env } from "./config/env";
import { prisma } from "./config/db";

import { authMiddleware } from "./middleware/auth";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { sandboxMiddleware } from "./middleware/sandbox";

import paymentRouter from "./modules/payments/payment.router";
import customerRouter from "./modules/payments/customers.router";
import walletRouter from "./modules/wallets/wallets.router";
import disputeRouter from "./modules/disputes/disputes.router";
import payoutRouter from "./modules/payouts/payouts.router";
import merchantRouter from "./modules/merchants/merchants.router";
import adminRouter from "./modules/admin/admin.router";

import { webhookWorker } from "./workers/webhook.worker";
import { payoutWorker } from "./workers/payout.worker";
import { runReconciliation } from "./workers/reconciliation.worker";
import { runFraudUnblock } from "./workers/fraud-unblock.worker";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(rateLimitMiddleware);

app.use((req: any, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", service: "nexpay-api", version: "1.0.0" });
});

app.use("/api/v1/merchants", merchantRouter);

app.use(authMiddleware);
app.use(idempotencyMiddleware);
app.use(sandboxMiddleware);

app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/customers", customerRouter);
app.use("/api/v1/wallets", walletRouter);
app.use("/api/v1/disputes", disputeRouter);
app.use("/api/v1/payouts", payoutRouter);
app.use("/api/v1/admin", adminRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal_server_error", message: "An unexpected error occurred" });
});

cron.schedule("0 2 * * *", () => {
  console.log("[Cron] Starting daily reconciliation...");
  runReconciliation().catch(console.error);
});

cron.schedule("*/30 * * * *", () => {
  console.log("[Cron] Running fraud unblock cleanup...");
  runFraudUnblock().catch(console.error);
});

const server = app.listen(env.PORT, () => {
  console.log(`NexPay API running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await webhookWorker.close();
  await payoutWorker.close();
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await webhookWorker.close();
  await payoutWorker.close();
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

export default app;
