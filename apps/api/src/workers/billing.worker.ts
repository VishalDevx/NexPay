import { prisma } from "../config/db";
import { billingService } from "../modules/billing/billing.service";

export async function runBilling() {
  console.log("[Billing] Starting monthly subscription invoicing...");
  const invoices = await billingService.generateAllSubscriptionInvoices();
  console.log(`[Billing] Generated ${invoices.length} subscription invoices`);
  return invoices;
}

export async function cancelSubscription(merchantId: string) {
  const sub = await prisma.subscription.findUnique({ where: { merchantId } });
  if (!sub) throw new Error("No active subscription found");
  if (sub.status === "CANCELED") throw new Error("Subscription already canceled");

  const updated = await prisma.subscription.update({
    where: { merchantId },
    data: { status: "CANCELED", canceledAt: new Date() },
  });
  return updated;
}
