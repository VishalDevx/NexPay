import { prisma } from "../../config/db";
import { EntryType, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

const DECIMAL_PRECISION = 4;

async function acquireAdvisoryLock(tx: Prisma.TransactionClient, accountIds: string[]) {
  const sortedIds = [...accountIds].sort();
  for (const id of sortedIds) {
    const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    await (tx as any).$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${hash})`);
  }
}

export async function doubleEntryBook({
  debitAccountId,
  creditAccountId,
  paymentId,
  amount,
  currency,
  description,
}: {
  debitAccountId: string;
  creditAccountId: string;
  paymentId: string | null;
  amount: string;
  currency: string;
  description: string;
}) {
  return prisma.$transaction(async (tx) => {
    await acquireAdvisoryLock(tx, [debitAccountId, creditAccountId]);

    const [debitAccount, creditAccount] = await Promise.all([
      tx.account.findUniqueOrThrow({ where: { id: debitAccountId } }),
      tx.account.findUniqueOrThrow({ where: { id: creditAccountId } }),
    ]);

    const parsedAmount = new Decimal(amount).toDecimalPlaces(DECIMAL_PRECISION, Decimal.ROUND_HALF_UP);
    const debitBalance = new Decimal(debitAccount.lastBalance.toString());
    const creditBalance = new Decimal(creditAccount.lastBalance.toString());

    const isAssetDebit = debitAccount.type === "ASSET";
    const isRevenueCredit = creditAccount.type === "REVENUE" || creditAccount.type === "LIABILITY";

    const newDebitBalance = isAssetDebit
      ? debitBalance.plus(parsedAmount)
      : debitBalance.minus(parsedAmount);

    const newCreditBalance = isRevenueCredit
      ? creditBalance.plus(parsedAmount)
      : creditBalance.minus(parsedAmount);

    if (newDebitBalance.isNegative() || newCreditBalance.isNegative()) {
      throw new Error(
        `Insufficient balance: debit=${debitBalance} -> ${newDebitBalance}, credit=${creditBalance} -> ${newCreditBalance}`
      );
    }

    const [debitEntry, creditEntry] = await Promise.all([
      tx.ledgerEntry.create({
        data: {
          accountId: debitAccountId,
          paymentId,
          type: EntryType.DEBIT,
          amount: parsedAmount.toFixed(DECIMAL_PRECISION),
          currency,
          balanceAfter: newDebitBalance.toFixed(DECIMAL_PRECISION),
          description: `DEBIT: ${description}`,
        },
      }),
      tx.ledgerEntry.create({
        data: {
          accountId: creditAccountId,
          paymentId,
          type: EntryType.CREDIT,
          amount: parsedAmount.toFixed(DECIMAL_PRECISION),
          currency,
          balanceAfter: newCreditBalance.toFixed(DECIMAL_PRECISION),
          description: `CREDIT: ${description}`,
        },
      }),
    ]);

    await Promise.all([
      tx.account.update({
        where: { id: debitAccountId },
        data: { lastBalance: newDebitBalance.toFixed(DECIMAL_PRECISION) },
      }),
      tx.account.update({
        where: { id: creditAccountId },
        data: { lastBalance: newCreditBalance.toFixed(DECIMAL_PRECISION) },
      }),
    ]);

    return { debitEntry, creditEntry };
  });
}

export async function createLedgerEntry(data: {
  accountId: string;
  paymentId: string | null;
  type: EntryType;
  amount: string;
  currency: string;
  description: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    await acquireAdvisoryLock(tx, [data.accountId]);

    const account = await tx.account.findUniqueOrThrow({ where: { id: data.accountId } });

    const parsedAmount = new Decimal(data.amount).toDecimalPlaces(DECIMAL_PRECISION, Decimal.ROUND_HALF_UP);
    const currentBalance = new Decimal(account.lastBalance.toString());

    const isAsset = account.type === "ASSET";
    const balanceAfter = (data.type === EntryType.DEBIT) === isAsset
      ? currentBalance.plus(parsedAmount)
      : currentBalance.minus(parsedAmount);

    if (balanceAfter.isNegative()) {
      throw new Error(
        `Insufficient balance in account ${data.accountId}: ${currentBalance} < ${parsedAmount}`
      );
    }

    const entry = await tx.ledgerEntry.create({
      data: {
        accountId: data.accountId,
        paymentId: data.paymentId,
        type: data.type,
        amount: parsedAmount.toFixed(DECIMAL_PRECISION),
        currency: data.currency,
        balanceAfter: balanceAfter.toFixed(DECIMAL_PRECISION),
        description: data.description,
      },
    });

    await tx.account.update({
      where: { id: data.accountId },
      data: { lastBalance: balanceAfter.toFixed(DECIMAL_PRECISION) },
    });

    return entry;
  });
}

export async function getAccountBalance(accountId: string): Promise<Decimal> {
  const lastEntry = await prisma.ledgerEntry.findFirst({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfter: true },
  });
  return new Decimal(lastEntry?.balanceAfter || "0");
}

export { EntryType };
