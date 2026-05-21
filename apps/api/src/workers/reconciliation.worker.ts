import { prisma } from "../config/db";
import { redis } from "../config/redis";
import { reconciliationService } from "../modules/reconciliation/reconciliation.service";
import Decimal from "decimal.js";

export async function runReconciliation() {
  console.log("[Reconciliation] Starting nightly reconciliation...");

  const wallets = await prisma.wallet.findMany();

  for (const wallet of wallets) {
    try {
      const redisBalance = await redis.get(wallet.redisBalanceKey);
      const redisAmount = new Decimal(redisBalance || "0");

      const lastEntry = await prisma.ledgerEntry.findFirst({
        where: {
          account: {
            merchantId: wallet.merchantId,
            currency: wallet.currency,
          },
        },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });

      const ledgerBalance = new Decimal(lastEntry?.balanceAfter || "0");

      const drift = redisAmount.minus(ledgerBalance);

      if (!drift.isZero()) {
        const driftAbs = drift.abs();
        console.log(
          `[Reconciliation] Drift detected for wallet ${wallet.id}: Redis=${redisAmount} Ledger=${ledgerBalance} Drift=${drift}`
        );

        if (driftAbs.lt(1)) {
          await redis.set(wallet.redisBalanceKey, ledgerBalance.toFixed(4));
          console.log(`[Reconciliation] Auto-corrected minor drift for wallet ${wallet.id}`);
        } else {
          console.warn(
            `[Reconciliation] MAJOR drift flagged for wallet ${wallet.id}: ${driftAbs}`
          );
        }
      }

      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { lastReconciledAt: new Date() },
      });
    } catch (err) {
      console.error(`[Reconciliation] Error processing wallet ${wallet.id}:`, err);
    }
  }

  try {
    console.log("[Reconciliation] Running payment-ledger reconciliation...");
    const result = await reconciliationService.startRun("PAYMENT_LEDGER");
    console.log(`[Reconciliation] Payment-ledger done: ${JSON.stringify(result.result)}`);
  } catch (err) {
    console.error("[Reconciliation] Payment-ledger reconciliation failed:", err);
  }

  try {
    console.log("[Reconciliation] Running settlement reconciliation...");
    const result = await reconciliationService.startRun("SETTLEMENT");
    console.log(`[Reconciliation] Settlement reconciliation done: ${JSON.stringify(result.result)}`);
  } catch (err) {
    console.error("[Reconciliation] Settlement reconciliation failed:", err);
  }

  console.log("[Reconciliation] Completed");
}
