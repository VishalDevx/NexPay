import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";

import { authMiddleware } from "./middleware/auth";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { sandboxMiddleware } from "./middleware/sandbox";
import { requestIdMiddleware } from "./middleware/request-id";

import paymentRouter from "./modules/payments/payment.router";
import customerRouter from "./modules/payments/customers.router";
import walletRouter from "./modules/wallets/wallets.router";
import disputeRouter from "./modules/disputes/disputes.router";
import payoutRouter from "./modules/payouts/payouts.router";
import merchantRouter from "./modules/merchants/merchants.router";
import merchantLifecycleRouter from "./modules/merchants/merchant-lifecycle.router";
import adminRouter from "./modules/admin/admin.router";
import analyticsRouter from "./modules/analytics/analytics.router";
import bankAccountsRouter from "./modules/bank-accounts.router";
import fraudRulesRouter from "./modules/fraud-rules.router";
import teamRouter from "./modules/team/team.router";
import sessionsRouter from "./modules/team/sessions.router";
import brandingRouter from "./modules/settings/branding.router";
import complianceRouter from "./modules/compliance/compliance.router";
import marketplaceRouter from "./modules/marketplace/marketplace.router";
import invoicingRouter from "./modules/invoices/invoicing.router";
import notificationsRouter from "./modules/notifications/notifications.router";
import paymentMethodsRouter from "./modules/payment-methods/payment-methods.router";
import uploadsRouter from "./modules/uploads/uploads.router";
import reconciliationRouter from "./modules/reconciliation/reconciliation.router";
import integrationsRouter from "./modules/integrations/integrations.router";
import gatewayRouter from "./modules/gateway/gateway.router";
import sandboxRouter from "./modules/sandbox/sandbox.router";
import supportRouter from "./modules/support/support.router";
import cannedResponsesRouter from "./modules/support/canned-responses.router";
import reserveRouter from "./modules/reserve/reserve.router";
import billingRouter from "./modules/billing/billing.router";
import reconciliationDeepRouter from "./modules/reconciliation/reconciliation-deep.router";
import securityRouter from "./modules/security/security.router";
import marketplaceDeepRouter from "./modules/marketplace/marketplace-deep.router";
import adminOpsRouter from "./modules/admin/admin-ops.router";
import incidentsRouter from "./modules/incidents/incidents.router";
import glRouter from "./modules/general-ledger/gl.router";
import billingAdminRouter from "./modules/billing/billing-admin.router";
import statusRouter from "./modules/status/status.router";
import openapiRouter from "./modules/openapi/openapi.router";

import { metricsMiddleware } from "./middleware/metrics";
import { metrics } from "./modules/metrics/metrics";
import metricsRouter from "./modules/metrics/metrics.router";
import outboxRouter from "./modules/outbox/outbox.router";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestIdMiddleware);
  app.use(pinoHttp({ logger }));

  if (!process.env.VERCEL) {
    app.use(rateLimitMiddleware);
  }
  app.use(metricsMiddleware);

  app.get("/metrics", (_req, res) => {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(metrics.toPrometheus());
  });

  app.get("/api/v1/health", (_req, res) => {
    res.json({ status: "ok", service: "nexpay-api", version: "1.0.0" });
  });

  app.use("/api/v1/merchants", merchantRouter);

  app.use("/api/v1/admin/ops", adminOpsRouter);
  app.use("/api/v1/admin/billing", billingAdminRouter);
  app.use("/api/v1/incidents", incidentsRouter);

  app.use("/api/v1/status", statusRouter);

  app.use("/api/v1", openapiRouter);

  app.use(authMiddleware);
  app.use(idempotencyMiddleware);
  app.use(sandboxMiddleware);

  app.use("/api/v1/gl", glRouter);
  app.use("/api/v1", metricsRouter);
  app.use("/api/v1", outboxRouter);

  app.use("/api/v1/merchants/lifecycle", merchantLifecycleRouter);
  app.use("/api/v1/support/tickets", supportRouter);
  app.use("/api/v1/support/canned-responses", cannedResponsesRouter);
  app.use("/api/v1/reserve", reserveRouter);
  app.use("/api/v1/billing", billingRouter);
  app.use("/api/v1/reconciliation-deep", reconciliationDeepRouter);
  app.use("/api/v1/security", securityRouter);
  app.use("/api/v1/marketplace-deep", marketplaceDeepRouter);

  app.use("/api/v1/payments", paymentRouter);
  app.use("/api/v1/customers", customerRouter);
  app.use("/api/v1/wallets", walletRouter);
  app.use("/api/v1/disputes", disputeRouter);
  app.use("/api/v1/payouts", payoutRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/analytics", analyticsRouter);
  app.use("/api/v1/bank-accounts", bankAccountsRouter);
  app.use("/api/v1/fraud-rules", fraudRulesRouter);
  app.use("/api/v1/team", teamRouter);
  app.use("/api/v1/sessions", sessionsRouter);
  app.use("/api/v1/settings", brandingRouter);
  app.use("/api/v1/compliance", complianceRouter);
  app.use("/api/v1/marketplace", marketplaceRouter);
  app.use("/api/v1/invoices", invoicingRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/payment-methods", paymentMethodsRouter);
  app.use("/api/v1/uploads", uploadsRouter);
  app.use("/api/v1/reconciliation", reconciliationRouter);
  app.use("/api/v1/gateway", gatewayRouter);
  app.use("/api/v1/integrations", integrationsRouter);
  app.use("/api/v1/sandbox", sandboxRouter);

  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err, requestId: req.requestId }, "Unhandled error");
    res.status(500).json({ error: "internal_server_error", message: "An unexpected error occurred" });
  });

  return app;
}

export default createApp;
