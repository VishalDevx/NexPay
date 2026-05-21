import { prisma } from "../../config/db";
import { EntryType } from "@prisma/client";
import Decimal from "decimal.js";

interface LedgerEntryInput {
  accountId: string;
  paymentId: string | null;
  type: EntryType;
  amount: string;
  currency: string;
  description: string | null;
}

const DECIMAL_PRECISION = 4;

export async function createLedgerEntry(data: LedgerEntryInput) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.account.findUniqueOrThrow({
      where: { id: data.accountId },
    });

    const parsedAmount = new Decimal(data.amount).toDecimalPlaces(DECIMAL_PRECISION, Decimal.ROUND_HALF_UP);
    const currentBalance = new Decimal(account.lastBalance || "0");

    const balanceAfter =
      data.type === EntryType.DEBIT
        ? currentBalance.plus(parsedAmount)
        : currentBalance.minus(parsedAmount);

    if (balanceAfter.isNegative()) {
      throw new Error(`Insufficient balance in account ${data.accountId}: ${currentBalance} < ${parsedAmount}`);
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
    const debitEntry = await tx.ledgerEntry.create({
      data: {
        accountId: debitAccountId,
        paymentId,
        type: EntryType.DEBIT,
        amount,
        currency,
        balanceAfter: "0",
        description: `DEBIT: ${description}`,
      },
    });

    const creditEntry = await tx.ledgerEntry.create({
      data: {
        accountId: creditAccountId,
        paymentId,
        type: EntryType.CREDIT,
        amount,
        currency,
        balanceAfter: "0",
        description: `CREDIT: ${description}`,
      },
    });

    return { debitEntry, creditEntry };
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
