import { prisma } from "../../config/db";
import { JournalStatus, AccountType, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

const DECIMAL_PRECISION = 4;

function validateBalancedLines(lines: { accountCode: string; debit?: Decimal | number | string; credit?: Decimal | number | string }[]): { accountCode: string; debit: Decimal; credit: Decimal }[] {
  if (lines.length < 2) {
    throw new Error("Journal entry must have at least 2 lines");
  }
  const processed = lines.map((l) => ({
    accountCode: l.accountCode,
    debit: new Decimal(l.debit || 0).toDecimalPlaces(DECIMAL_PRECISION, Decimal.ROUND_HALF_UP),
    credit: new Decimal(l.credit || 0).toDecimalPlaces(DECIMAL_PRECISION, Decimal.ROUND_HALF_UP),
  }));
  const totalDebit = processed.reduce((s, l) => s.plus(l.debit), new Decimal(0));
  const totalCredit = processed.reduce((s, l) => s.plus(l.credit), new Decimal(0));
  if (!totalDebit.equals(totalCredit)) {
    throw new Error(`Debit/Credit mismatch: debits=${totalDebit} credits=${totalCredit}`);
  }
  if (totalDebit.isZero()) {
    throw new Error("Journal entry amount must be greater than zero");
  }
  const hasNonZero = processed.some((l) => l.debit.gt(0) || l.credit.gt(0));
  if (!hasNonZero) {
    throw new Error("At least one line must have a non-zero amount");
  }
  return processed;
}

export const glService = {
  async createEntry(params: {
    transactionId?: string;
    transactionType?: string;
    description?: string;
    reference?: string;
    lines: { accountCode: string; debit?: Decimal | number | string; credit?: Decimal | number | string; description?: string }[];
    createdById?: string;
  }) {
    const processedLines = validateBalancedLines(params.lines);

    return prisma.$transaction(async (tx) => {
      for (const line of processedLines) {
        const account = await tx.chartAccount.findUnique({ where: { code: line.accountCode } });
        if (!account) {
          throw new Error(`Account not found: ${line.accountCode}`);
        }
        if (!account.isActive) {
          throw new Error(`Account is inactive: ${line.accountCode} (${account.name})`);
        }
      }

      const entry = await tx.journalEntry.create({
        data: {
          transactionId: params.transactionId,
          transactionType: params.transactionType,
          description: params.description,
          reference: params.reference,
          entryDate: new Date(),
          status: JournalStatus.POSTED,
          createdById: params.createdById,
          lines: {
            create: processedLines.map((l) => ({
              accountCode: l.accountCode,
              debit: l.debit.toFixed(DECIMAL_PRECISION),
              credit: l.credit.toFixed(DECIMAL_PRECISION),
              currency: "USD",
              description: l.description || params.description,
            })),
          },
        },
        include: { lines: { include: { account: true } } },
      });

      return entry;
    });
  },

  async reverseEntry(entryId: string, reason: string, createdById?: string) {
    return prisma.$transaction(async (tx) => {
      const original = await tx.journalEntry.findUnique({
        where: { id: entryId },
        include: { lines: true },
      });
      if (!original) throw new Error("Journal entry not found");
      if (original.status === JournalStatus.REVERSED) throw new Error("Entry already reversed");
      if (original.reversalOfId) throw new Error("Cannot reverse a reversal entry");

      const reversalLines = original.lines.map((l) => ({
        accountCode: l.accountCode,
        debit: l.credit,
        credit: l.debit,
        description: `Reversal: ${l.description || original.description || entryId}`,
      }));

      const reversal = await tx.journalEntry.create({
        data: {
          transactionId: original.transactionId,
          transactionType: original.transactionType,
          description: `Reversal: ${original.description || entryId}`,
          reference: original.reference,
          entryDate: new Date(),
          status: JournalStatus.POSTED,
          createdById,
          reversalOfId: entryId,
          reversalReason: reason,
          lines: {
            create: reversalLines.map((l) => ({
              accountCode: l.accountCode,
              debit: new Decimal(l.debit).toFixed(DECIMAL_PRECISION),
              credit: new Decimal(l.credit).toFixed(DECIMAL_PRECISION),
              currency: "USD",
              description: l.description,
            })),
          },
        },
        include: { lines: { include: { account: true } } },
      });

      await tx.journalEntry.update({
        where: { id: entryId },
        data: { status: JournalStatus.REVERSED },
      });

      return reversal;
    });
  },

  async getEntry(entryId: string) {
    return prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: {
        lines: { include: { account: true }, orderBy: { createdAt: "asc" } },
        reversalOf: { include: { lines: { include: { account: true } } } },
      },
    });
  },

  async listEntries(params: {
    transactionType?: string;
    transactionId?: string;
    accountCode?: string;
    status?: JournalStatus;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (params.transactionType) where.transactionType = params.transactionType;
    if (params.transactionId) where.transactionId = params.transactionId;
    if (params.status) where.status = params.status;
    if (params.fromDate || params.toDate) {
      where.entryDate = {};
      if (params.fromDate) where.entryDate.gte = params.fromDate;
      if (params.toDate) where.entryDate.lte = params.toDate;
    }
    if (params.accountCode) {
      where.lines = { some: { accountCode: params.accountCode } };
    }
    const [data, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: { lines: { include: { account: true }, orderBy: { createdAt: "asc" } } },
        orderBy: { entryDate: "desc" },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      prisma.journalEntry.count({ where }),
    ]);
    return { data, total };
  },

  async getAccountBalance(accountCode: string, asOf?: Date): Promise<Decimal> {
    const where: any = { lines: { some: { accountCode } }, status: JournalStatus.POSTED };
    if (asOf) where.entryDate = { lte: asOf };

    const entries = await prisma.journalLine.findMany({
      where: { accountCode, entry: { status: JournalStatus.POSTED, ...(asOf ? { entryDate: { lte: asOf } } : {}) } },
    });

    const totalDebit = entries.reduce((s, l) => s.plus(l.debit), new Decimal(0));
    const totalCredit = entries.reduce((s, l) => s.plus(l.credit), new Decimal(0));

    const account = await prisma.chartAccount.findUnique({ where: { code: accountCode } });
    if (!account) throw new Error(`Account not found: ${accountCode}`);

    if ([AccountType.ASSET, AccountType.EXPENSE].includes(account.type as any)) {
      return totalDebit.minus(totalCredit);
    }
    return totalCredit.minus(totalDebit);
  },

  async getTrialBalance(asOf?: Date) {
    const accounts = await prisma.chartAccount.findMany({ where: { isActive: true } });
    const lines = await prisma.journalLine.findMany({
      where: { entry: { status: JournalStatus.POSTED, ...(asOf ? { entryDate: { lte: asOf } } : {}) } },
      include: { account: true },
    });

    const balances: Record<string, { account: typeof accounts[0]; debit: Decimal; credit: Decimal }> = {};
    for (const acc of accounts) {
      balances[acc.code] = { account: acc, debit: new Decimal(0), credit: new Decimal(0) };
    }
    for (const line of lines) {
      if (!balances[line.accountCode]) continue;
      balances[line.accountCode].debit = balances[line.accountCode].debit.plus(line.debit);
      balances[line.accountCode].credit = balances[line.accountCode].credit.plus(line.credit);
    }

    const rows = Object.values(balances).map((b) => {
      const type = b.account.type;
      const isDebitNormal = type === "ASSET" || type === "EXPENSE";
      const balance = isDebitNormal ? b.debit.minus(b.credit) : b.credit.minus(b.debit);
      return {
        code: b.account.code,
        name: b.account.name,
        type: b.account.type,
        category: b.account.category,
        totalDebit: b.debit.toFixed(2),
        totalCredit: b.credit.toFixed(2),
        balance: balance.toFixed(2),
        isDebitBalance: isDebitNormal ? balance.gte(0) : balance.lt(0),
      };
    });

    const totalDebit = rows.reduce((s, r) => s.plus(r.totalDebit), new Decimal(0));
    const totalCredit = rows.reduce((s, r) => s.plus(r.totalCredit), new Decimal(0));

    return { rows, totalDebit: totalDebit.toFixed(2), totalCredit: totalCredit.toFixed(2), asOf: asOf || new Date() };
  },

  async getTransactionLedger(transactionType: string, transactionId: string) {
    const entries = await prisma.journalEntry.findMany({
      where: { transactionType, transactionId },
      include: { lines: { include: { account: true }, orderBy: { createdAt: "asc" } } },
      orderBy: { entryDate: "asc" },
    });
    return entries;
  },

  async getIncomeStatement(fromDate: Date, toDate: Date) {
    const where = { entry: { status: JournalStatus.POSTED as const, entryDate: { gte: fromDate, lte: toDate } } };
    const revenueLines = await prisma.journalLine.findMany({
      where: { ...where, account: { type: "REVENUE" as any } },
      include: { account: true },
    });
    const expenseLines = await prisma.journalLine.findMany({
      where: { ...where, account: { type: "EXPENSE" as any } },
      include: { account: true },
    });

    const revenue = revenueLines.reduce((s, l) => s.plus(l.credit).minus(l.debit), new Decimal(0));
    const expenses = expenseLines.reduce((s, l) => s.plus(l.debit).minus(l.credit), new Decimal(0));
    const netIncome = revenue.minus(expenses);

    return {
      revenue: revenue.toFixed(2),
      expenses: expenses.toFixed(2),
      netIncome: netIncome.toFixed(2),
      fromDate,
      toDate,
    };
  },
};
