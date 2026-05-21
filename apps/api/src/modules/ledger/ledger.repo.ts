import { prisma } from "../../config/db";
import { EntryType, AccountType } from "@prisma/client";

export const ledgerRepo = {
  async getOrCreateAccounts(merchantId: string, currency: string) {
    const assetAccount = await prisma.account.upsert({
      where: { merchantId_type_currency: { merchantId, type: AccountType.ASSET, currency } },
      update: {},
      create: { merchantId, type: AccountType.ASSET, currency, name: `${currency} Asset Account` },
    });

    const revenueAccount = await prisma.account.upsert({
      where: { merchantId_type_currency: { merchantId, type: AccountType.REVENUE, currency } },
      update: {},
      create: { merchantId, type: AccountType.REVENUE, currency, name: `${currency} Revenue Account` },
    });

    const liabilityAccount = await prisma.account.upsert({
      where: { merchantId_type_currency: { merchantId, type: AccountType.LIABILITY, currency } },
      update: {},
      create: { merchantId, type: AccountType.LIABILITY, currency, name: `${currency} Liability Account` },
    });

    return { assetAccount, revenueAccount, liabilityAccount };
  },

  async getEntriesByPayment(paymentId: string) {
    return prisma.ledgerEntry.findMany({
      where: { paymentId },
      include: { account: true },
      orderBy: { createdAt: "asc" },
    });
  },

  async getBalanceSheet(merchantId: string) {
    const accounts = await prisma.account.findMany({
      where: { merchantId },
      include: {
        ledgerEntries: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      currency: a.currency,
      balance: a.ledgerEntries[0]?.balanceAfter || "0",
    }));
  },
};
