import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import { metrics } from "../metrics/metrics";

const router = Router();

function getMetricValue(name: string, tags?: Record<string, string>): number {
  const counters = metrics.getAllMetrics().counters;
  if (tags) {
    const tagStr = Object.entries(tags).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(",");
    return counters[`${name}{${tagStr}}`] || 0;
  }
  return counters[name] || 0;
}

router.get("/integrity", async (req: Request, res: Response) => {
  try {
    const [ledgerBalanced, walletDrift, pendingDeliveries, dlqCount, reconcileIssues, outboxPending, outboxFailed, jobFailures, webhookFailures, lastReconciliation, lastCronRuns] = await Promise.all([
      checkLedgerBalanced(),
      checkWalletDrift(),
      countPendingWebhooks(),
      countDLQ(),
      countReconciliationIssues(),
      countOutboxPending(),
      countOutboxFailed(),
      countFailedJobs(),
      countWebhookFailures(),
      getLastReconciliation(),
      getLastCronRuns(),
    ]);

    const paymentSuccessRate = getPaymentSuccessRate();

    res.json({
      status: ledgerBalanced.ok && walletDrift.ok ? "healthy" : "degraded",
      checks: {
        ledgerBalanced,
        walletDrift,
        pendingWebhookDeliveries: pendingDeliveries,
        dlqCount,
        reconciliationIssues: reconcileIssues,
        outboxLag: { ok: outboxPending.count < 100, pending: outboxPending.count, failed: outboxFailed.count },
        failedJobs: jobFailures,
        webhookFailures,
        paymentSuccessRate,
        lastReconciliation,
        lastCronRuns,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "integrity_check_failed", message: err.message });
  }
});

async function checkLedgerBalanced() {
  const accounts = await prisma.account.findMany({ select: { id: true, lastBalance: true, type: true } });
  const entries = await prisma.ledgerEntry.groupBy({
    by: ["accountId"],
    _sum: { amount: true },
  });

  const entryMap = new Map(entries.map(e => [e.accountId, e._sum.amount?.toNumber() || 0]));

  for (const account of accounts) {
    const expected = account.lastBalance.toNumber();
    const calculated = entryMap.get(account.id) || 0;
    if (Math.abs(expected - calculated) > 0.01) {
      return { ok: false, message: `Account ${account.id} balance mismatch: expected ${expected}, calculated ${calculated}`, accountId: account.id };
    }
  }

  return { ok: true, message: "All ledger balances match calculated entries", accountCount: accounts.length };
}

async function checkWalletDrift() {
  const wallets = await prisma.wallet.findMany({ select: { id: true, merchantId: true, currency: true, redisBalanceKey: true } });
  const drifts: { merchantId: string; currency: string; walletBalance: string; ledgerBalance: string; drift: string }[] = [];

  for (const wallet of wallets) {
    const walletBalance = await redis.get(wallet.redisBalanceKey);
    const lastTxn = await prisma.walletTxn.findFirst({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      select: { amount: true },
    });
    const ledgerBalance = lastTxn?.amount?.toString() || "0";
    const wb = parseFloat(walletBalance || "0");
    const lb = parseFloat(ledgerBalance);
    if (Math.abs(wb - lb) > 0.01) {
      drifts.push({ merchantId: wallet.merchantId, currency: wallet.currency, walletBalance: wb.toString(), ledgerBalance: lb.toString(), drift: (wb - lb).toString() });
    }
  }

  return { ok: drifts.length === 0, message: drifts.length === 0 ? "All wallet balances match ledger" : `${drifts.length} wallet(s) have drift`, drifts };
}

async function countPendingWebhooks() {
  const pending = await prisma.webhookDelivery.count({ where: { status: "PENDING" } });
  return { ok: pending < 50, pending, retrying: 0, total: pending };
}

async function countDLQ() {
  const dlq = await prisma.webhookDelivery.count({ where: { status: "DEAD_LETTER" } });
  return { ok: dlq < 10, count: dlq };
}

async function countReconciliationIssues() {
  const open = await prisma.reconciliationMatch.count({ where: { status: "OPEN" } });
  const escalated = await prisma.reconciliationMatch.count({ where: { status: "ESCALATED" } });
  return { ok: open + escalated < 5, open, escalated, total: open + escalated };
}

async function countOutboxPending() {
  const pending = await prisma.outboxEvent.count({ where: { status: "PENDING" } });
  return { count: pending, ok: pending < 100 };
}

async function countOutboxFailed() {
  const failed = await prisma.outboxEvent.count({ where: { status: "FAILED" } });
  return { count: failed, ok: failed < 10 };
}

async function countFailedJobs() {
  const failedPayouts = await prisma.payout.count({ where: { status: "FAILED" } });
  const failedDeliveries = await prisma.webhookDelivery.count({ where: { status: "DEAD_LETTER" } });
  return { ok: failedPayouts + failedDeliveries < 5, failedPayouts, failedDeliveries, total: failedPayouts + failedDeliveries };
}

async function countWebhookFailures() {
  const count = await prisma.webhookDelivery.count({ where: { status: { in: ["FAILED", "DEAD_LETTER"] } } });
  return { ok: count < 20, count };
}

function getPaymentSuccessRate() {
  const success = getMetricValue("payment_success_total");
  const failed = getMetricValue("payment_failure_total");
  const total = success + failed;
  return {
    ok: total === 0 || (success / total) > 0.8,
    success,
    failed,
    total,
    rate: total === 0 ? 1 : Math.round((success / total) * 100),
  };
}

async function getLastReconciliation() {
  const last = await prisma.reconciliationRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true, status: true } });
  return { ok: last?.status === "COMPLETED", lastRun: last?.startedAt?.toISOString() || null, status: last?.status || null };
}

async function getLastCronRuns() {
  const lastReconRun = await prisma.reconciliationRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } });
  return { reconciliation: lastReconRun?.startedAt?.toISOString() || "never" };
}

export default router;
