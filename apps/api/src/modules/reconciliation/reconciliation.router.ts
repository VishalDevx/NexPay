import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import { randomUUID } from "crypto";

const router = Router();

router.get("/ledger", async (req: Request, res: Response) => {
  try {
    const { accountType, startDate, endDate, limit, offset } = req.query;

    const accounts = await prisma.account.findMany({
      where: {
        merchantId: req.merchant!.id,
        ...(accountType ? { type: accountType as any } : {}),
      },
    });

    const accountIds = accounts.map((a) => a.id);

    const where: any = {
      accountId: { in: accountIds },
    };

    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate as string) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };
    }

    const take = Math.min(Number(limit) || 50, 200);
    const skip = Number(offset) || 0;

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        include: { account: true },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    res.json({
      data: entries.map((e) => ({
        id: e.id,
        account: {
          type: e.account.type,
          name: e.account.name,
          currency: e.account.currency,
        },
        type: e.type,
        amount: e.amount,
        balanceAfter: e.balanceAfter,
        description: e.description,
        createdAt: e.createdAt,
      })),
      total,
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/report", async (req: Request, res: Response) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { merchantId: req.merchant!.id },
    });

    const accounts = await prisma.account.findMany({
      where: { merchantId: req.merchant!.id },
      include: {
        ledgerEntries: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const report = await Promise.all(
      wallets.map(async (wallet) => {
        const walletBalance = parseFloat(await redis.get(wallet.redisBalanceKey) || "0");
        const matchedAccount = accounts.find((a) => a.currency === wallet.currency);
        const ledgerBalance = parseFloat(matchedAccount?.ledgerEntries[0]?.balanceAfter?.toString() || "0");
        const drift = walletBalance - ledgerBalance;

        return {
          currency: wallet.currency,
          walletBalance,
          ledgerBalance,
          drift,
          status: Math.abs(drift) < 0.01 ? "MATCHED" : "DRIFTED",
        };
      })
    );

    res.json({ report, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/report/correct", async (req: Request, res: Response) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { merchantId: req.merchant!.id },
    });

    const accounts = await prisma.account.findMany({
      where: { merchantId: req.merchant!.id },
      include: {
        ledgerEntries: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const corrected: { currency: string; driftAmount: number; newLedgerBalance: number }[] = [];

    for (const wallet of wallets) {
      const walletBalance = parseFloat(await redis.get(wallet.redisBalanceKey) || "0");
      const matchedAccount = accounts.find((a) => a.currency === wallet.currency);
      if (!matchedAccount) continue;

      const ledgerBalance = parseFloat(matchedAccount.ledgerEntries[0]?.balanceAfter?.toString() || "0");
      const drift = walletBalance - ledgerBalance;

      if (Math.abs(drift) < 0.01) continue;

      if (drift > 0) {
        await prisma.ledgerEntry.create({
          data: {
            accountId: matchedAccount.id,
            paymentId: null,
            type: "CREDIT",
            amount: Math.abs(drift).toFixed(4),
            currency: wallet.currency,
            balanceAfter: walletBalance.toFixed(4),
            description: `Reconciliation correction: wallet ${wallet.currency} drift ${drift.toFixed(4)}`,
          },
        });
        await prisma.account.update({
          where: { id: matchedAccount.id },
          data: { lastBalance: walletBalance.toFixed(4) },
        });
      } else {
        await prisma.ledgerEntry.create({
          data: {
            accountId: matchedAccount.id,
            paymentId: null,
            type: "DEBIT",
            amount: Math.abs(drift).toFixed(4),
            currency: wallet.currency,
            balanceAfter: walletBalance.toFixed(4),
            description: `Reconciliation correction: wallet ${wallet.currency} drift ${drift.toFixed(4)}`,
          },
        });
        await prisma.account.update({
          where: { id: matchedAccount.id },
          data: { lastBalance: walletBalance.toFixed(4) },
        });
      }

      corrected.push({
        currency: wallet.currency,
        driftAmount: drift,
        newLedgerBalance: walletBalance,
      });
    }

    res.json({ corrected, status: "CORRECTED" });
  } catch (err: any) {
    res.status(422).json({ error: "correction_failed", message: err.message });
  }
});

router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const reconciliationLastRun = await redis.get("cron:reconciliation:lastRun");
    const fraudUnblockLastRun = await redis.get("cron:fraud-unblock:lastRun");
    const webhookRetryLastRun = await redis.get("cron:webhook-retry:lastRun");

    const now = Date.now();

    res.json({
      data: [
        {
          name: "reconciliation",
          type: "cron",
          schedule: "0 2 * * *",
          lastRun: reconciliationLastRun || null,
          nextRun: new Date(now + 86400000).toISOString(),
          health: "healthy",
        },
        {
          name: "fraud-unblock",
          type: "cron",
          schedule: "*/30 * * * *",
          lastRun: fraudUnblockLastRun || null,
          nextRun: new Date(now + 1800000).toISOString(),
          health: "healthy",
        },
        {
          name: "webhook-retry",
          type: "cron",
          schedule: "*/5 * * * *",
          lastRun: webhookRetryLastRun || null,
          nextRun: new Date(now + 300000).toISOString(),
          health: "healthy",
        },
      ],
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/alerts", async (req: Request, res: Response) => {
  try {
    const adjustments = await prisma.ledgerAdjustment.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const failedWebhooks = await prisma.webhookDelivery.findMany({
      where: { status: "FAILED" },
      include: { endpoint: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const alerts = [
      ...adjustments.map((a) => ({
        id: a.id,
        type: "ledger_adjustment",
        severity: "warning" as const,
        message: `Ledger adjustment ${a.type} of ${a.amount} on account ${a.accountId}: ${a.reason}`,
        status: a.status,
        createdAt: a.createdAt,
      })),
      ...failedWebhooks.map((w) => ({
        id: w.id,
        type: "webhook_failure",
        severity: "critical" as const,
        message: `Webhook delivery failed to ${w.endpoint.url} after ${w.attempts} attempts`,
        status: w.status,
        createdAt: w.createdAt,
      })),
    ];

    alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ data: alerts });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
