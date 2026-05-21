import { prisma } from "../../config/db";
import { glService } from "../general-ledger/gl.service";
import Decimal from "decimal.js";

const DECIMAL_PRECISION = 4;

export const billingService = {
  async calculateTransactionFee(params: { merchantId: string; amount: string; currency: string }) {
    const feeSchedule = await prisma.feeSchedule.findUnique({ where: { merchantId: params.merchantId } });
    if (!feeSchedule) {
      const amount = new Decimal(params.amount);
      return { fee: new Decimal(0), net: amount, mdr: new Decimal(0), fixedFee: new Decimal(0) };
    }

    const amount = new Decimal(params.amount);
    const mdrAmount = amount.mul(feeSchedule.mdr).div(100);
    const fixedFee = new Decimal(feeSchedule.fixedFee);
    const fee = mdrAmount.plus(fixedFee).toDecimalPlaces(DECIMAL_PRECISION, Decimal.ROUND_HALF_UP);
    const net = amount.minus(fee);

    return { fee, net, mdr: mdrAmount, fixedFee };
  },

  async checkPlanLimits(merchantId: string, transactionAmount: string) {
    const sub = await prisma.subscription.findUnique({ where: { merchantId }, include: { plan: true } });
    if (!sub || sub.status !== "ACTIVE") {
      return { allowed: true, reason: null };
    }

    const plan = sub.plan;
    if (!plan.maxMonthlyVolume) return { allowed: true, reason: null };

    const periodStart = sub.currentPeriodStart;
    const periodVolume = await prisma.payment.aggregate({
      where: {
        merchantId,
        status: { in: ["CAPTURED", "SETTLED"] },
        capturedAt: { gte: periodStart },
      },
      _sum: { amount: true },
    });

    const currentVolume = new Decimal(periodVolume._sum.amount?.toString() || "0");
    const newVolume = currentVolume.plus(transactionAmount);
    const maxVolume = new Decimal(plan.maxMonthlyVolume.toString());

    if (newVolume.gt(maxVolume)) {
      return {
        allowed: false,
        reason: `Monthly volume ${newVolume.toFixed(2)} exceeds plan limit ${maxVolume.toFixed(2)}`,
      };
    }

    return { allowed: true, reason: null };
  },

  async generateSubscriptionInvoice(subscriptionId: string) {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, merchant: true },
    });
    if (!sub || sub.status !== "ACTIVE") return null;

    const lastInvoice = await prisma.billingInvoice.findFirst({
      where: { subscriptionId },
      orderBy: { periodEnd: "desc" },
    });

    const periodStart = lastInvoice ? lastInvoice.periodEnd : sub.currentPeriodStart;
    const periodEnd = new Date(periodStart.getTime() + 30 * 86400000);

    const invoiceNumber = `INV-${sub.merchantId.slice(0, 8).toUpperCase()}-${Date.now()}`;
    const monthlyPrice = sub.plan.monthlyPrice;

    const invoice = await prisma.billingInvoice.create({
      data: {
        subscriptionId,
        invoiceNumber,
        amount: monthlyPrice,
        taxAmount: new Decimal(0),
        total: monthlyPrice,
        currency: sub.merchant.baseCurrency || "USD",
        status: "PENDING",
        periodStart,
        periodEnd,
      },
    });

    if (monthlyPrice.gt(0)) {
      await glService.createEntry({
        transactionId: invoice.id,
        transactionType: "subscription",
        description: `Subscription invoice ${invoiceNumber} - ${sub.plan.name} plan`,
        lines: [
          { accountCode: "1400", debit: monthlyPrice.toFixed(DECIMAL_PRECISION), description: "Accounts receivable - subscription" },
          { accountCode: "3200", credit: monthlyPrice.toFixed(DECIMAL_PRECISION), description: "Platform subscription revenue" },
        ],
      }).catch((err) => console.error("GL invoice entry failed (non-blocking):", err.message));
    }

    return invoice;
  },

  async generateAllSubscriptionInvoices() {
    const subscriptions = await prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true },
    });

    const results = [];
    for (const sub of subscriptions) {
      const lastInvoice = await prisma.billingInvoice.findFirst({
        where: { subscriptionId: sub.id },
        orderBy: { periodEnd: "desc" },
      });

      if (lastInvoice && lastInvoice.periodEnd > new Date()) continue;

      const invoice = await this.generateSubscriptionInvoice(sub.id);
      if (invoice) results.push(invoice);
    }

    return results;
  },
};
