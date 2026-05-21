import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import { EntryType, WalletTxnType } from "@prisma/client";
import Decimal from "decimal.js";

export const walletService = {
  async getOrCreateWallet(merchantId: string, currency: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { merchantId_currency: { merchantId, currency } },
    });

    if (!wallet) {
      const redisBalanceKey = `wallet:${merchantId}:${currency}`;
      wallet = await prisma.wallet.create({
        data: { merchantId, currency, redisBalanceKey },
      });
      await redis.set(redisBalanceKey, "0");
    }

    return wallet;
  },

  async getBalance(walletId: string): Promise<string> {
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    const balance = await redis.get(wallet.redisBalanceKey);
    return balance || "0";
  },

  async load(merchantId: string, currency: string, amount: string) {
    const parsed = new Decimal(amount);
    if (parsed.isNegative()) throw new Error("Cannot load negative amount");

    const wallet = await this.getOrCreateWallet(merchantId, currency);

    return prisma.$transaction(async (tx) => {
      const txn = await tx.walletTxn.create({
        data: {
          walletId: wallet.id,
          type: WalletTxnType.LOAD,
          amount: parsed.toFixed(4),
          refType: "manual_load",
        },
      });

      await redis.incrbyfloat(wallet.redisBalanceKey, parsed.toFixed(4));

      return txn;
    });
  },

  async withdraw(merchantId: string, currency: string, amount: string) {
    const parsed = new Decimal(amount);
    if (parsed.isNegative()) throw new Error("Cannot withdraw negative amount");

    const wallet = await this.getOrCreateWallet(merchantId, currency);
    const currentBalance = new Decimal((await redis.get(wallet.redisBalanceKey)) || "0");

    if (parsed.gt(currentBalance)) {
      throw new Error("Insufficient wallet balance");
    }

    return prisma.$transaction(async (tx) => {
      const txn = await tx.walletTxn.create({
        data: {
          walletId: wallet.id,
          type: WalletTxnType.WITHDRAW,
          amount: parsed.negated().toFixed(4),
          refType: "manual_withdraw",
        },
      });

      await redis.decrbyfloat(wallet.redisBalanceKey, parsed.toFixed(4));

      return txn;
    });
  },
};
