import { prisma } from "../../config/db";
import { PaymentStatus, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

const DECIMAL_PRECISION = 4;

async function runPaymentLedgerReconciliation(runId: string) {
  const rules = await prisma.reconciliationRule.findMany({
    where: { enabled: true, sourceType: "PAYMENT", targetType: "LEDGER" },
    orderBy: { priority: "asc" },
  });

  const payments = await prisma.payment.findMany({
    where: { status: { in: [PaymentStatus.CAPTURED, PaymentStatus.SETTLED, PaymentStatus.REFUNDED] } },
    select: { id: true, amount: true, currency: true, status: true, capturedAt: true, createdAt: true },
  });

  const journalLines = await prisma.journalLine.findMany({
    where: {
      entry: { status: "POSTED", transactionType: "PAYMENT" },
      account: { code: { in: ["1200", "2100"] } },
    },
    include: { entry: true },
  });

  const matches: Prisma.ReconciliationMatchCreateManyInput[] = [];
  const ledgerByPayment = new Map<string, Decimal>();
  for (const line of journalLines) {
    if (!line.entry.transactionId) continue;
    const existing = ledgerByPayment.get(line.entry.transactionId) || new Decimal(0);
    if (line.debit.gt(0) && line.accountCode === "1200") {
      ledgerByPayment.set(line.entry.transactionId, existing.plus(line.debit));
    }
  }

  const matchedIds = new Set<string>();
  for (const payment of payments) {
    const ledgerAmount = ledgerByPayment.get(payment.id);
    if (!ledgerAmount) {
      matches.push({
        runId, matchType: "MISSING", sourceType: "PAYMENT", sourceId: payment.id,
        targetType: "LEDGER", expectedAmount: payment.amount, actualAmount: new Decimal(0),
        difference: payment.amount, currency: payment.currency,
        description: "Payment found in system but no ledger entry exists",
        status: "OPEN",
      });
      continue;
    }
    matchedIds.add(payment.id);

    const netLedger = ledgerAmount.abs();
    const diff = new Decimal(payment.amount.toString()).minus(netLedger).abs();

    if (diff.equals(0)) {
      matches.push({
        runId, matchType: "MATCHED", sourceType: "PAYMENT", sourceId: payment.id,
        targetType: "LEDGER", expectedAmount: payment.amount, actualAmount: netLedger,
        difference: new Decimal(0), currency: payment.currency,
        description: "Payment matches ledger entry exactly",
        status: "RESOLVED", resolvedAt: new Date(),
      });
    } else if (diff.lte(0.01)) {
      matches.push({
        runId, matchType: "DRIFTED", sourceType: "PAYMENT", sourceId: payment.id,
        targetType: "LEDGER", expectedAmount: payment.amount, actualAmount: netLedger,
        difference: diff, currency: payment.currency,
        description: `Amount drift: expected ${payment.amount}, ledger ${netLedger}`,
        status: "OPEN",
      });
    } else {
      matches.push({
        runId, matchType: "DRIFTED", sourceType: "PAYMENT", sourceId: payment.id,
        targetType: "LEDGER", expectedAmount: payment.amount, actualAmount: netLedger,
        difference: diff, currency: payment.currency,
        description: `Significant amount mismatch: expected ${payment.amount}, ledger ${netLedger}`,
        status: "ESCALATED",
      });
    }
  }

  for (const [paymentId, ledgerAmount] of ledgerByPayment.entries()) {
    if (matchedIds.has(paymentId)) continue;
    const netLedger = ledgerAmount.abs();
    matches.push({
      runId, matchType: "ORPHAN", sourceType: "LEDGER", sourceId: paymentId,
      targetType: "PAYMENT", expectedAmount: netLedger, actualAmount: new Decimal(0),
      difference: netLedger, currency: "USD",
      description: "Ledger entry exists but no matching payment record",
      status: "OPEN",
    });
  }

  if (matches.length > 0) {
    await prisma.reconciliationMatch.createMany({ data: matches });
  }

  const matched = matches.filter((m) => m.matchType === "MATCHED").length;
  const drifted = matches.filter((m) => m.matchType === "DRIFTED").length;
  const missing = matches.filter((m) => m.matchType === "MISSING").length;
  const orphan = matches.filter((m) => m.matchType === "ORPHAN").length;

  await prisma.reconciliationRun.update({
    where: { id: runId },
    data: {
      status: "COMPLETED", completedAt: new Date(),
      totalSource: payments.length, totalTarget: journalLines.length,
      matchedCount: matched, driftedCount: drifted,
      missingCount: missing, orphanCount: orphan,
      summary: { totalPayments: payments.length, totalLedgerLines: journalLines.length },
    },
  });

  return { matched, drifted, missing, orphan, total: matches.length };
}

async function runSettlementReconciliation(runId: string) {
  const batches = await prisma.settlementBatch.findMany({
    where: { status: { notIn: ["RECONCILED"] } },
    include: { items: true },
  });

  const matches: Prisma.ReconciliationMatchCreateManyInput[] = [];

  for (const batch of batches) {
    let matchedCount = 0;
    for (const item of batch.items) {
      const payment = item.paymentId
        ? await prisma.payment.findUnique({ where: { id: item.paymentId } })
        : null;

      if (payment && new Decimal(payment.amount.toString()).equals(new Decimal(item.amount.toString()))) {
        await prisma.settlementBatchItem.update({
          where: { id: item.id },
          data: { status: "MATCHED", matchedAt: new Date() },
        });
        matches.push({
          runId, matchType: "MATCHED",
          sourceType: "SETTLEMENT", sourceId: item.id,
          targetType: "PAYMENT", targetId: payment.id,
          expectedAmount: item.amount, actualAmount: payment.amount,
          difference: new Decimal(0), currency: item.currency,
          description: "Settlement item matches payment",
          status: "RESOLVED", resolvedAt: new Date(),
        });
        matchedCount++;
      } else {
        matches.push({
          runId, matchType: "DRIFTED",
          sourceType: "SETTLEMENT", sourceId: item.id,
          targetType: "PAYMENT", targetId: payment?.id || null,
          expectedAmount: item.amount,
          actualAmount: payment ? payment.amount : new Decimal(0),
          difference: payment
            ? new Decimal(item.amount.toString()).minus(new Decimal(payment.amount.toString())).abs()
            : item.amount,
          currency: item.currency,
          description: payment ? "Amount mismatch" : "No matching payment",
          status: payment ? "ESCALATED" : "OPEN",
        });
      }
    }

    const allMatched = matchedCount === batch.items.length;
    await prisma.settlementBatch.update({
      where: { id: batch.id },
      data: {
        matchedCount,
        status: allMatched ? "RECONCILED" : matchedCount > 0 ? "PARTIAL" : "PENDING",
        reconciledAt: allMatched ? new Date() : undefined,
      },
    });
  }

  if (matches.length > 0) {
    await prisma.reconciliationMatch.createMany({ data: matches });
  }

  const matched = matches.filter((m) => m.matchType === "MATCHED").length;
  const drifted = matches.filter((m) => m.matchType === "DRIFTED").length;

  await prisma.reconciliationRun.update({
    where: { id: runId },
    data: {
      status: "COMPLETED", completedAt: new Date(),
      totalSource: matches.length,
      matchedCount: matched, driftedCount: drifted,
    },
  });

  return { matched, drifted, total: matches.length };
}

async function resolveMatch(matchId: string, resolution: string, resolvedBy: string) {
  const match = await prisma.reconciliationMatch.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Match not found");

  return prisma.reconciliationMatch.update({
    where: { id: matchId },
    data: { status: "RESOLVED", resolution, resolvedAt: new Date(), resolvedBy },
  });
}

async function importSettlementBatch(data: {
  reference: string;
  description?: string;
  totalAmount: number | string;
  currency?: string;
  items: { paymentId?: string; amount: number | string; reference?: string; description?: string }[];
}) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.settlementBatch.create({
      data: {
        reference: data.reference,
        description: data.description,
        totalAmount: new Decimal(data.totalAmount).toFixed(DECIMAL_PRECISION),
        currency: data.currency || "USD",
        itemCount: data.items.length,
        items: {
          create: data.items.map((item) => ({
            paymentId: item.paymentId || null,
            amount: new Decimal(item.amount).toFixed(DECIMAL_PRECISION),
            currency: data.currency || "USD",
            reference: item.reference || null,
            description: item.description || null,
          })),
        },
      },
      include: { items: true },
    });
    return batch;
  });
}

async function getReconciliationReport(runId?: string) {
  if (runId) {
    return prisma.reconciliationRun.findUnique({
      where: { id: runId },
      include: { matches: { orderBy: { createdAt: "desc" } } },
    });
  }
  const runs = await prisma.reconciliationRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { matches: { take: 5, orderBy: { createdAt: "desc" } } },
  });
  return runs;
}

async function getSettlementBatchSummary() {
  const batches = await prisma.settlementBatch.findMany({
    orderBy: { importedAt: "desc" },
    take: 20,
    include: { _count: { select: { items: true } } },
  });
  const totals = await prisma.settlementBatch.aggregate({
    _sum: { totalAmount: true, matchedCount: true },
    _count: true,
  });
  return { batches, totalAmount: totals._sum.totalAmount, totalBatches: totals._count };
}

export const reconciliationService = {
  async startRun(runType: string = "DAILY") {
    const run = await prisma.reconciliationRun.create({
      data: { runType, status: "RUNNING" },
    });

    try {
      if (runType === "PAYMENT_LEDGER") {
        return { run, result: await runPaymentLedgerReconciliation(run.id) };
      }
      if (runType === "SETTLEMENT") {
        return { run, result: await runSettlementReconciliation(run.id) };
      }

      const payLedger = await runPaymentLedgerReconciliation(run.id);
      const settlementRec = await runSettlementReconciliation(run.id);

      return {
        run: await prisma.reconciliationRun.findUnique({ where: { id: run.id } }),
        result: { paymentLedger: payLedger, settlement: settlementRec },
      };
    } catch (err: any) {
      await prisma.reconciliationRun.update({
        where: { id: run.id },
        data: { status: "FAILED", errors: { message: err.message } },
      });
      throw err;
    }
  },

  resolveMatch,
  importSettlementBatch,
  getReconciliationReport,
  getSettlementBatchSummary,
};
