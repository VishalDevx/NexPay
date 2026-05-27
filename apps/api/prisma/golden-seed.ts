import { PrismaClient, PaymentStatus, AccountType, EntryType, DisputeStatus, KYCStatus, MerchantStatus, PlanTier, RiskCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();
const PASSWORD = "demo1234";

const MERCHANT_EMAIL = "merchant@nexpay.dev";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function main() {
  const startTime = Date.now();

  console.log("\n" + "═".repeat(56));
  console.log("  NexPay Golden Demo Seed");
  console.log("  Complete, deterministic money flow for Acme Corp");
  console.log("═".repeat(56) + "\n");

  // ── 1. Clean existing data for Acme Corp ───────────────────────────────
  console.log("1. Cleaning existing Acme Corp data...");

  const existing = await prisma.merchant.findUnique({ where: { email: MERCHANT_EMAIL }, select: { id: true } });
  if (existing) {
    const mid = existing.id;
    const tables = [
      prisma.ticketMessage.deleteMany({ where: { ticket: { merchantId: mid } } }),
      prisma.supportTicket.deleteMany({ where: { merchantId: mid } }),
      prisma.fraudEvent.deleteMany({ where: { payment: { merchantId: mid } } }),
      prisma.paymentEvent.deleteMany({ where: { payment: { merchantId: mid } } }),
      prisma.ledgerEntry.deleteMany({ where: { account: { merchantId: mid } } }),
      prisma.webhookDelivery.deleteMany({ where: { endpoint: { merchantId: mid } } }),
      prisma.webhookEndpoint.deleteMany({ where: { merchantId: mid } }),
      prisma.walletTxn.deleteMany({ where: { wallet: { merchantId: mid } } }),
      prisma.wallet.deleteMany({ where: { merchantId: mid } }),
      prisma.splitTransaction.deleteMany({ where: { payment: { merchantId: mid } } }),
      prisma.payoutItem.deleteMany({ where: { payout: { merchantId: mid } } }),
      prisma.payout.deleteMany({ where: { merchantId: mid } }),
      prisma.settlementBatchItem.deleteMany({ where: { payment: { merchantId: mid } } }),
      prisma.refund.deleteMany({ where: { payment: { merchantId: mid } } }),
      prisma.dispute.deleteMany({ where: { merchantId: mid } }),
      prisma.complianceNote.deleteMany({ where: { merchantId: mid } }),
      prisma.reserveRelease.deleteMany({ where: { config: { merchantId: mid } } }),
      prisma.reserveConfig.deleteMany({ where: { merchantId: mid } }),
      prisma.feeSchedule.deleteMany({ where: { merchantId: mid } }),
      prisma.billingInvoice.deleteMany({ where: { subscription: { merchantId: mid } } }),
      prisma.subscription.deleteMany({ where: { merchantId: mid } }),
      prisma.teamMember.deleteMany({ where: { merchantId: mid } }),
      prisma.merchantSession.deleteMany({ where: { merchantId: mid } }),
      prisma.merchantApproval.deleteMany({ where: { merchantId: mid } }),
      prisma.idempotencyKey.deleteMany({ where: { merchantId: mid } }),
      prisma.dailyBalance.deleteMany({ where: { merchantId: mid } }),
      prisma.securityEvent.deleteMany({ where: { merchantId: mid } }),
      prisma.notificationPreference.deleteMany({ where: { merchantId: mid } }),
      prisma.upload.deleteMany({ where: { merchantId: mid } }),
      prisma.invoice.deleteMany({ where: { merchantId: mid } }),
      prisma.bankAccount.deleteMany({ where: { merchantId: mid } }),
      prisma.apiKey.deleteMany({ where: { merchantId: mid } }),
      prisma.customer.deleteMany({ where: { merchantId: mid } }),
      prisma.payment.deleteMany({ where: { merchantId: mid } }),
      prisma.account.deleteMany({ where: { merchantId: mid } }),
      prisma.merchant.deleteMany({ where: { id: mid } }),
    ];
    await prisma.$transaction(tables);
    console.log("   Cleaned existing merchant and all related data");
  } else {
    console.log("   No existing data to clean");
  }

  // ── 2. Ensure reference data exists ────────────────────────────────────
  console.log("\n2. Ensuring reference data...");

  const plans = [
    { name: "Starter", tier: PlanTier.STARTER, monthlyPrice: 0, transactionFee: 2.9, fixedFee: 0.3, internationalMarkup: 1.5, maxMonthlyVolume: 100000, maxApiCalls: 10000, teamMembers: 2, description: "Best for early-stage startups", features: ["Basic dashboard", "Email support", "API access"] },
    { name: "Growth", tier: PlanTier.GROWTH, monthlyPrice: 999, transactionFee: 2.5, fixedFee: 0.2, internationalMarkup: 1.0, maxMonthlyVolume: 1000000, maxApiCalls: 100000, teamMembers: 5, description: "For scaling businesses", features: ["Advanced analytics", "Priority support", "Fraud detection"] },
    { name: "Business", tier: PlanTier.BUSINESS, monthlyPrice: 4999, transactionFee: 2.0, fixedFee: 0.1, internationalMarkup: 0.75, maxMonthlyVolume: 5000000, maxApiCalls: 1000000, teamMembers: 15, description: "For established companies", features: ["Dedicated support", "Multi-currency", "Bulk payouts"] },
    { name: "Enterprise", tier: PlanTier.ENTERPRISE, monthlyPrice: 0, transactionFee: 1.5, fixedFee: 0.05, internationalMarkup: 0.5, maxMonthlyVolume: null, maxApiCalls: null, teamMembers: null, description: "For high-volume platforms", features: ["24/7 support", "Custom contract", "SSO/SAML"] },
  ];
  for (const p of plans) {
    await prisma.merchantPlan.upsert({ where: { name: p.name }, update: {}, create: p });
  }
  console.log("   ✅ Merchant plans");

  const chartAccounts = [
    { code: "1000", name: "Assets", type: AccountType.ASSET, category: "ROOT", parentCode: null },
    { code: "1100", name: "Cash & Bank", type: AccountType.ASSET, category: "CURRENT_ASSET", parentCode: "1000" },
    { code: "1200", name: "Settlement Holding", type: AccountType.ASSET, category: "CURRENT_ASSET", parentCode: "1000" },
    { code: "1300", name: "Reserve Fund", type: AccountType.ASSET, category: "CURRENT_ASSET", parentCode: "1000" },
    { code: "1400", name: "Accounts Receivable", type: AccountType.ASSET, category: "CURRENT_ASSET", parentCode: "1000" },
    { code: "2000", name: "Liabilities", type: AccountType.LIABILITY, category: "ROOT", parentCode: null },
    { code: "2100", name: "Merchant Payable", type: AccountType.LIABILITY, category: "CURRENT_LIABILITY", parentCode: "2000" },
    { code: "2200", name: "Reserve Liability", type: AccountType.LIABILITY, category: "CURRENT_LIABILITY", parentCode: "2000" },
    { code: "2300", name: "Unsettled Funds", type: AccountType.LIABILITY, category: "CURRENT_LIABILITY", parentCode: "2000" },
    { code: "2400", name: "Platform Fee Payable", type: AccountType.LIABILITY, category: "CURRENT_LIABILITY", parentCode: "2000" },
    { code: "3000", name: "Revenue", type: AccountType.REVENUE, category: "ROOT", parentCode: null },
    { code: "3100", name: "Processing Fees", type: AccountType.REVENUE, category: "OPERATING_REVENUE", parentCode: "3000" },
    { code: "3200", name: "Platform Subscription", type: AccountType.REVENUE, category: "OPERATING_REVENUE", parentCode: "3000" },
    { code: "3300", name: "Chargeback Fees", type: AccountType.REVENUE, category: "OPERATING_REVENUE", parentCode: "3000" },
    { code: "3400", name: "International Markup", type: AccountType.REVENUE, category: "OPERATING_REVENUE", parentCode: "3000" },
    { code: "4000", name: "Expenses", type: AccountType.EXPENSE, category: "ROOT", parentCode: null },
    { code: "4100", name: "Gateway Charges", type: AccountType.EXPENSE, category: "OPERATING_EXPENSE", parentCode: "4000" },
    { code: "4200", name: "Bank Charges", type: AccountType.EXPENSE, category: "OPERATING_EXPENSE", parentCode: "4000" },
    { code: "4300", name: "Refund Loss", type: AccountType.EXPENSE, category: "OPERATING_EXPENSE", parentCode: "4000" },
    { code: "4400", name: "Chargeback Loss", type: AccountType.EXPENSE, category: "OPERATING_EXPENSE", parentCode: "4000" },
    { code: "5000", name: "Equity", type: AccountType.EQUITY, category: "ROOT", parentCode: null },
    { code: "5100", name: "Retained Earnings", type: AccountType.EQUITY, category: "OWNERS_EQUITY", parentCode: "5000" },
  ];
  for (const a of chartAccounts) {
    await prisma.chartAccount.upsert({ where: { code: a.code }, update: {}, create: { ...a, currency: "USD", isActive: true } });
  }
  console.log("   ✅ Chart of accounts");

  const fraudRules = [
    { name: "Velocity Check", condition: { type: "velocity", limit: 5, window: 60 }, action: "REVIEW", scoreWeight: 30 },
    { name: "Geo Anomaly", condition: { type: "geo_anomaly" }, action: "REVIEW", scoreWeight: 25 },
    { name: "Amount Deviation", condition: { type: "amount_deviation", multiplier: 3 }, action: "REVIEW", scoreWeight: 20 },
    { name: "New Account", condition: { type: "new_account", maxAgeHours: 1 }, action: "REVIEW", scoreWeight: 15 },
    { name: "High Risk Currency", condition: { type: "high_risk_currency", currencies: ["BTC", "ETH", "USDT"] }, action: "DECLINE", scoreWeight: 10 },
  ];
  for (const r of fraudRules) {
    await prisma.fraudRule.upsert({ where: { name: r.name }, update: {}, create: { ...r, enabled: true } });
  }
  console.log("   ✅ Fraud rules");

  const recRules = [
    { name: "Payment-Ledger Exact Match", matchType: "EXACT", sourceType: "PAYMENT", targetType: "LEDGER", amountTolerance: 0, dateWindowHours: 24, priority: 1 },
    { name: "Payment-Ledger Tolerance Match", matchType: "TOLERANCE", sourceType: "PAYMENT", targetType: "LEDGER", amountTolerance: 0.01, dateWindowHours: 48, priority: 2 },
  ];
  for (const r of recRules) {
    await prisma.reconciliationRule.upsert({ where: { name: r.name }, update: {}, create: { ...r, description: r.name, enabled: true } });
  }
  console.log("   ✅ Reconciliation rules\n");

  // ── 3. Create Acme Corp merchant ────────────────────────────────────────
  console.log("3. Creating Acme Corp merchant...");

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const merchant = await prisma.merchant.create({
    data: {
      name: "Acme Corp",
      email: MERCHANT_EMAIL,
      passwordHash,
      status: MerchantStatus.APPROVED,
      kycStatus: KYCStatus.VERIFIED,
      businessType: "TECHNOLOGY",
      mccCode: "5734",
      expectedMonthlyVolume: 5000000,
      averageTicketSize: 2500,
      websiteUrl: "https://acmecorp.in",
      riskCategory: RiskCategory.LOW,
      businessDescription: "Leading e-commerce platform for consumer electronics",
      incorporationDate: new Date("2019-06-01"),
      taxId: "AABCK5678F",
      emailVerified: true,
      country: "US",
      baseCurrency: "USD",
      payoutSchedule: { frequency: "DAILY", day: null },
      settingsJson: { autoSettle: true, holdPeriod: 0, notifyOnPayment: true },
      brandingJson: { primaryColor: "#2563eb", logoUrl: null },
      approvedAt: new Date(),
      kycSubmittedAt: new Date("2024-01-15"),
    },
  });
  console.log(`   ✅ Merchant ID: ${merchant.id}`);

  await prisma.merchantApproval.createMany({
    data: [
      { merchantId: merchant.id, action: "REGISTERED", fromStatus: MerchantStatus.DRAFT, toStatus: MerchantStatus.SUBMITTED, reviewerId: merchant.id, createdAt: new Date(Date.now() - 86400000) },
      { merchantId: merchant.id, action: "KYC_VERIFIED", fromStatus: MerchantStatus.SUBMITTED, toStatus: MerchantStatus.APPROVED, reviewerId: merchant.id, notes: "All KYC documents verified", createdAt: new Date(Date.now() - 86400000 * 0.5) },
    ],
  });

  // Assign Growth plan
  const growthPlan = await prisma.merchantPlan.findFirstOrThrow({ where: { tier: PlanTier.GROWTH } });
  await prisma.subscription.create({
    data: { merchantId: merchant.id, planId: growthPlan.id, status: "ACTIVE", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
  });

  // API keys
  const liveKey = "nex_live_" + crypto.randomBytes(24).toString("hex");
  const testKey = "nex_test_" + crypto.randomBytes(24).toString("hex");
  await prisma.apiKey.createMany({
    data: [
      { merchantId: merchant.id, keyHash: sha256(liveKey), prefix: "nex_live_", env: "LIVE", scopes: ["charges:write", "charges:read", "refunds:write", "customers:read"] },
      { merchantId: merchant.id, keyHash: sha256(testKey), prefix: "nex_test_", env: "TEST", scopes: ["charges:write", "charges:read", "refunds:write", "customers:read"] },
    ],
  });

  // Bank account
  const bank = await prisma.bankAccount.create({
    data: { merchantId: merchant.id, accountNumber: "12345678901", ifsc: "HDFC0001234", bankName: "HDFC Bank", accountHolder: "Acme Corp Pvt Ltd", isPrimary: true, verified: true },
  });

  // Wallet — USD
  const wallet = await prisma.wallet.create({
    data: { merchantId: merchant.id, currency: "USD", redisBalanceKey: `wallet:${merchant.id}:USD` },
  });
  await prisma.walletTxn.create({
    data: { walletId: wallet.id, type: "LOAD", amount: 50000, refId: "INITIAL_SEED", refType: "SYSTEM", createdAt: new Date(Date.now() - 90 * 86400000) },
  });

  // Merchant accounts (ledger)
  const assetAccount = await prisma.account.create({ data: { merchantId: merchant.id, type: AccountType.ASSET, currency: "USD", name: "Settlement Holding", lastBalance: 0 } });
  const liabilityAccount = await prisma.account.create({ data: { merchantId: merchant.id, type: AccountType.LIABILITY, currency: "USD", name: "Merchant Payable", lastBalance: 0 } });
  const revenueAccount = await prisma.account.create({ data: { merchantId: merchant.id, type: AccountType.REVENUE, currency: "USD", name: "Processing Fees", lastBalance: 0 } });

  // Fee schedule
  await prisma.feeSchedule.create({
    data: { merchantId: merchant.id, mdr: 2.9, fixedFee: 0.3, internationalMarkup: 1.0, payoutFee: 0, refundFee: 0, chargebackFee: 15, upiMdr: 0, upiFixedFee: 0, planTier: PlanTier.GROWTH },
  });

  // Reserve config (10% rolling reserve)
  await prisma.reserveConfig.create({
    data: { merchantId: merchant.id, reservePercentage: 10, fixedReserveAmount: 0, releaseDelayDays: 90, riskBasedIncrease: false, manualHold: false, currentReserveBalance: 0 },
  });

  // Webhook endpoint
  const webhookSecret = crypto.randomBytes(32).toString("hex");
  const endpoint = await prisma.webhookEndpoint.create({
    data: { merchantId: merchant.id, url: "https://webhook.example.com/acme-corp/hook", events: ["payment.captured", "payment.failed", "payment.refunded", "payment.disputed", "settlement.completed"], secretHash: sha256(webhookSecret), enabled: true },
  });

  // ── 4. Create customers ────────────────────────────────────────────────
  console.log("\n4. Creating customers...");

  const customers = await Promise.all([
    prisma.customer.create({ data: { merchantId: merchant.id, email: "alice@example.com", name: "Alice Johnson", phone: "+12025551234", metadata: { city: "San Francisco", signupDate: "2024-06-15", preferredPayment: "card" } } }),
    prisma.customer.create({ data: { merchantId: merchant.id, email: "bob@example.com", name: "Bob Smith", phone: "+12025555678", metadata: { city: "New York", signupDate: "2024-08-01", preferredPayment: "card" } } }),
  ]);
  console.log(`   ✅ ${customers.length} customers`);

  // ── 5. Payments — Complete money flow ──────────────────────────────────
  console.log("\n5. Creating payments...\n");

  const NOW = Date.now();
  const paymentMetas: Array<{
    label: string; amount: number; currency: string; customerId: string; description: string; status: PaymentStatus;
    fraudScore?: number; refundAmount?: number; refundReason?: string;
    dispute?: { reason: string; status: DisputeStatus; resolution?: string };
  }> = [
    { label: "Payment #1", amount: 100.00, currency: "USD", customerId: customers[0].id, description: "Acme T-Shirt - Size M", status: PaymentStatus.SETTLED },
    { label: "Payment #2", amount: 250.00, currency: "USD", customerId: customers[0].id, description: "Wireless Headphones", status: PaymentStatus.SETTLED },
    { label: "Payment #3", amount: 500.00, currency: "USD", customerId: customers[1].id, description: "Mechanical Keyboard", status: PaymentStatus.REFUNDED, refundAmount: 150.00, refundReason: "partial_refund" },
    { label: "Payment #4", amount: 75.00, currency: "USD", customerId: customers[1].id, description: "USB-C Hub", status: PaymentStatus.DISPUTED, dispute: { reason: "fraudulent", status: DisputeStatus.RESOLVED, resolution: "merchant_win" } },
    { label: "Payment #5", amount: 1000.00, currency: "USD", customerId: customers[0].id, description: "Monitor 27-inch 4K", status: PaymentStatus.SETTLED },
  ];

  const createdPayments: Array<{ id: string; label: string; amount: number; netAmount: number; status: PaymentStatus }> = [];
  const ledgerEntries: Array<{ accountId: string; paymentId: string; type: EntryType; amount: number; currency: string; balanceAfter: number; description: string; createdAt: Date }> = [];
  const outboxEvents: Array<{ eventType: string; aggregateType: string; aggregateId: string; payload: any; createdAt: Date }> = [];
  const webhookDeliveries: Array<{ endpointId: string; paymentId: string; payload: any; status: string; attempts: number; maxRetries: number; createdAt: Date }> = [];

  let assetBalance = 0;
  let liabilityBalance = 0;
  let revenueBalance = 0;
  let totalProcessed = 0;
  let totalFees = 0;
  let totalRefunded = 0;

  for (let i = 0; i < paymentMetas.length; i++) {
    const pm = paymentMetas[i];
    const daysAgo = (paymentMetas.length - i) * 7;
    const createdAt = new Date(NOW - daysAgo * 86400000);
    const paymentId = uuidv4();

    const feeAmount = parseFloat((pm.amount * 0.029 + 0.30).toFixed(2));
    const netAmount = parseFloat((pm.amount - feeAmount).toFixed(2));
    totalFees += feeAmount;

    const statusEvents: Array<{ fromStatus: PaymentStatus; toStatus: PaymentStatus; actor: string; createdAt: Date }> = [];

    if (pm.status === PaymentStatus.SETTLED || pm.status === PaymentStatus.REFUNDED || pm.status === PaymentStatus.DISPUTED) {
      statusEvents.push(
        { fromStatus: PaymentStatus.INITIATED, toStatus: PaymentStatus.PROCESSING, actor: "SYSTEM", createdAt: new Date(createdAt.getTime() + 1000) },
        { fromStatus: PaymentStatus.PROCESSING, toStatus: PaymentStatus.AUTHORIZED, actor: "SYSTEM", createdAt: new Date(createdAt.getTime() + 3000) },
        { fromStatus: PaymentStatus.AUTHORIZED, toStatus: PaymentStatus.CAPTURED, actor: "SYSTEM", createdAt: new Date(createdAt.getTime() + 5000) },
      );
    }

    let settledAt: Date | undefined;
    if (pm.status === PaymentStatus.SETTLED) {
      settledAt = new Date(createdAt.getTime() + 10000);
      statusEvents.push(
        { fromStatus: PaymentStatus.CAPTURED, toStatus: PaymentStatus.SETTLED, actor: "SYSTEM", createdAt: settledAt },
      );
    }

    if (pm.status === PaymentStatus.REFUNDED) {
      settledAt = new Date(createdAt.getTime() + 10000);
      statusEvents.push(
        { fromStatus: PaymentStatus.CAPTURED, toStatus: PaymentStatus.SETTLED, actor: "SYSTEM", createdAt: settledAt },
        { fromStatus: PaymentStatus.SETTLED, toStatus: PaymentStatus.REFUNDED, actor: "SYSTEM", createdAt: new Date(createdAt.getTime() + 20000) },
      );
    }

    if (pm.status === PaymentStatus.DISPUTED) {
      settledAt = new Date(createdAt.getTime() + 10000);
      statusEvents.push(
        { fromStatus: PaymentStatus.CAPTURED, toStatus: PaymentStatus.SETTLED, actor: "SYSTEM", createdAt: settledAt },
        { fromStatus: PaymentStatus.SETTLED, toStatus: PaymentStatus.DISPUTED, actor: "SYSTEM", createdAt: new Date(createdAt.getTime() + 86400000 * 3) },
      );
    }

    const capturedOrSettled = pm.status === PaymentStatus.SETTLED || pm.status === PaymentStatus.REFUNDED || pm.status === PaymentStatus.DISPUTED;

    // Create payment
    await prisma.payment.create({
      data: {
        id: paymentId,
        merchantId: merchant.id,
        customerId: pm.customerId,
        amount: pm.amount,
        amountRefunded: pm.refundAmount || 0,
        currency: pm.currency,
        status: pm.status,
        paymentMethod: { type: "card", provider: "visa", last4: "4242" },
        metadata: { source: "golden-seed", label: pm.label },
        fraudScore: pm.fraudScore || null,
        description: pm.description,
        capturedAt: capturedOrSettled ? new Date(createdAt.getTime() + 5000) : undefined,
        settledAt: settledAt,
        createdAt: createdAt,
      },
    });

    // Create events
    for (const evt of statusEvents) {
      await prisma.paymentEvent.create({ data: { paymentId, ...evt } });
    }

    // Ledger entries (double-entry)
    // Debit: Settlement Holding (asset increases)
    // Credit: Merchant Payable (liability increases) = amount - fees
    // Credit: Processing Fees (revenue increases) = fees
    if (capturedOrSettled) {
      assetBalance += pm.amount;
      ledgerEntries.push({
        accountId: assetAccount.id,
        paymentId,
        type: EntryType.DEBIT,
        amount: pm.amount,
        currency: pm.currency,
        balanceAfter: parseFloat(assetBalance.toFixed(2)),
        description: `Payment received: ${pm.description}`,
        createdAt: new Date(createdAt.getTime() + 5000),
      });

      liabilityBalance += netAmount;
      ledgerEntries.push({
        accountId: liabilityAccount.id,
        paymentId,
        type: EntryType.CREDIT,
        amount: netAmount,
        currency: pm.currency,
        balanceAfter: parseFloat(liabilityBalance.toFixed(2)),
        description: `Merchant payable: ${pm.description}`,
        createdAt: new Date(createdAt.getTime() + 5000),
      });

      revenueBalance += feeAmount;
      ledgerEntries.push({
        accountId: revenueAccount.id,
        paymentId,
        type: EntryType.CREDIT,
        amount: feeAmount,
        currency: pm.currency,
        balanceAfter: parseFloat(revenueBalance.toFixed(2)),
        description: `Processing fee: ${pm.description}`,
        createdAt: new Date(createdAt.getTime() + 5000),
      });

      totalProcessed += pm.amount;
    }

    // Outbox events + webhook deliveries
    const outboxPayload = { paymentId, amount: pm.amount, currency: pm.currency, status: pm.status, merchantId: merchant.id };
    outboxEvents.push({ eventType: `payment.${pm.status.toLowerCase()}`, aggregateType: "payment", aggregateId: paymentId, payload: outboxPayload, createdAt: new Date(createdAt.getTime() + 15000) });
    webhookDeliveries.push({ endpointId: endpoint.id, paymentId, payload: outboxPayload, status: "PENDING", attempts: 0, maxRetries: 5, createdAt: new Date(createdAt.getTime() + 15000) });

    createdPayments.push({ id: paymentId, label: pm.label, amount: pm.amount, netAmount, status: pm.status });

    // Refund (for payment #3)
    if (pm.refundAmount) {
      const refundPct = pm.refundAmount / pm.amount;
      const refundFee = parseFloat((pm.refundAmount * 0.029 + 0.30).toFixed(2));
      totalRefunded += pm.refundAmount;

      const refund = await prisma.refund.create({
        data: { paymentId, amount: pm.refundAmount, reason: pm.refundReason, status: "SUCCEEDED", createdAt: new Date(createdAt.getTime() + 30000) },
      });

      // Reverse ledger: credit asset, debit liability
      assetBalance -= pm.refundAmount;
      ledgerEntries.push({
        accountId: assetAccount.id,
        paymentId,
        type: EntryType.CREDIT,
        amount: pm.refundAmount,
        currency: pm.currency,
        balanceAfter: parseFloat(assetBalance.toFixed(2)),
        description: `Refund reversal: ${pm.description}`,
        createdAt: new Date(createdAt.getTime() + 30000),
      });

      const refundNet = parseFloat((pm.refundAmount - refundFee).toFixed(2));
      liabilityBalance -= refundNet;
      ledgerEntries.push({
        accountId: liabilityAccount.id,
        paymentId,
        type: EntryType.DEBIT,
        amount: refundNet,
        currency: pm.currency,
        balanceAfter: parseFloat(liabilityBalance.toFixed(2)),
        description: `Refund deduction: ${pm.description}`,
        createdAt: new Date(createdAt.getTime() + 30000),
      });

      outboxEvents.push({ eventType: "payment.refunded", aggregateType: "payment", aggregateId: paymentId, payload: { paymentId, refundId: refund.id, amount: pm.refundAmount }, createdAt: new Date(createdAt.getTime() + 30000) });
    }

    // Dispute (for payment #4)
    if (pm.dispute) {
      const dispute = await prisma.dispute.create({
        data: { paymentId, merchantId: merchant.id, reason: pm.dispute.reason, status: pm.dispute.status, amount: pm.amount, evidence: { description: "Customer claims unauthorized transaction", files: [] }, createdAt: new Date(createdAt.getTime() + 86400000 * 3), resolvedAt: pm.dispute.status === DisputeStatus.RESOLVED ? new Date(createdAt.getTime() + 86400000 * 10) : undefined, resolution: pm.dispute.resolution },
      });
      outboxEvents.push({ eventType: "payment.disputed", aggregateType: "payment", aggregateId: paymentId, payload: { paymentId, disputeId: dispute.id, reason: pm.dispute.reason }, createdAt: new Date(createdAt.getTime() + 86400000 * 3) });
    }

    console.log(`   ${pm.label.padEnd(14)} $${String(pm.amount).padStart(6)} → ${pm.status.padEnd(10)} ${pm.description}`);
  }

  // Write ledger entries
  for (const entry of ledgerEntries) {
    await prisma.ledgerEntry.create({ data: entry });
  }

  // Write outbox events
  for (const evt of outboxEvents) {
    await prisma.outboxEvent.create({ data: evt });
  }

  // Write webhook deliveries
  for (const d of webhookDeliveries) {
    await prisma.webhookDelivery.create({ data: d });
  }

  // Write wallet transactions
  const walletAmount = totalProcessed - totalRefunded;
  await prisma.walletTxn.create({
    data: { walletId: wallet.id, type: "SETTLEMENT", amount: walletAmount, refId: `GOLDEN_SEED_${Date.now()}`, refType: "PAYMENT", createdAt: new Date() },
  });
  await prisma.wallet.update({ where: { id: wallet.id }, data: { lastReconciledAt: new Date() } });

  // Update account balances
  await prisma.account.update({ where: { id: assetAccount.id }, data: { lastBalance: assetBalance } });
  await prisma.account.update({ where: { id: liabilityAccount.id }, data: { lastBalance: liabilityBalance } });
  await prisma.account.update({ where: { id: revenueAccount.id }, data: { lastBalance: revenueBalance } });

  console.log(`\n   ✅ ${createdPayments.length} payments created`);
  console.log(`   ✅ ${ledgerEntries.length} ledger entries created`);
  console.log(`   ✅ ${outboxEvents.length} outbox events created`);
  console.log(`   ✅ ${webhookDeliveries.length} webhook deliveries created`);
  console.log(`   ✅ Wallet credited: $${walletAmount.toFixed(2)}`);

  // ── 6. Settlement batch + Reconciliation ──────────────────────────────
  console.log("\n6. Creating settlement and reconciliation data...");

  const settlementBatch = await prisma.settlementBatch.create({
    data: { reference: `STL-${Date.now()}`, description: "Golden demo weekly settlement", totalAmount: totalProcessed, currency: "USD", itemCount: createdPayments.length, matchedCount: createdPayments.length, status: "RECONCILED", importedAt: new Date(), reconciledAt: new Date() },
  });

  for (const p of createdPayments) {
    await prisma.settlementBatchItem.create({
      data: { batchId: settlementBatch.id, paymentId: p.id, amount: p.amount, currency: "USD", reference: `PAY-${p.id.substring(0, 8)}`, status: "MATCHED", matchedAt: new Date() },
    });
  }

  // Daily balances (31 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let runningBalance = 50000;
  for (let day = 30; day >= 0; day--) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    const credits = day < 7 ? totalProcessed : 0;
    const debits = 0;
    const opening = runningBalance;
    runningBalance = parseFloat((runningBalance + credits - debits).toFixed(2));
    await prisma.dailyBalance.create({
      data: { merchantId: merchant.id, currency: "USD", date, openingBalance: opening, closingBalance: runningBalance, totalCredits: credits, totalDebits: debits, paymentCount: day < 7 ? createdPayments.length : 0, settlementCount: day % 7 === 0 ? 1 : 0 },
    });
  }

  const reconciliationRun = await prisma.reconciliationRun.create({
    data: { runType: "DAILY", status: "COMPLETED", startedAt: new Date(), completedAt: new Date(), totalSource: createdPayments.length, totalTarget: ledgerEntries.length, matchedCount: createdPayments.length, driftedCount: 0, missingCount: 0, duplicateCount: 0, orphanCount: 0, autoCorrected: 0 },
  });

  for (const p of createdPayments) {
    await prisma.reconciliationMatch.create({
      data: { runId: reconciliationRun.id, matchType: "MATCHED", sourceType: "PAYMENT", sourceId: p.id, targetType: "LEDGER", expectedAmount: p.amount, actualAmount: p.amount, difference: 0, currency: "USD", description: `Payment ${p.label} reconciled with ledger`, status: "RESOLVED", resolvedAt: new Date() },
    });
  }

  console.log(`   ✅ Settlement batch: $${totalProcessed}`);
  console.log(`   ✅ Reconciliation run: ${createdPayments.length} matches`);
  console.log(`   ✅ 31 daily balance records\n`);

  // ── 7. Summary ─────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("═".repeat(56));
  console.log("  Golden Demo Seed Complete");
  console.log("═".repeat(56));
  console.log(`  Time: ${elapsed}s\n`);

  console.log("  Money Flow Summary:");
  console.log(`  ${"─".repeat(40)}`);
  console.log(`  Total payments processed:  $${totalProcessed.toFixed(2)}`);
  console.log(`  Total fees collected:      $${totalFees.toFixed(2)}`);
  console.log(`  Total refunded:            $${totalRefunded.toFixed(2)}`);
  console.log(`  Net merchant payable:      $${(totalProcessed - totalFees - totalRefunded).toFixed(2)}`);
  console.log(`  ${"─".repeat(40)}`);
  console.log(`  Ledger asset balance:      $${assetBalance.toFixed(2)}`);
  console.log(`  Ledger liability balance:  $${liabilityBalance.toFixed(2)}`);
  console.log(`  Ledger revenue balance:    $${revenueBalance.toFixed(2)}`);
  console.log(`  Wallet balance:            $${walletAmount.toFixed(2)}`);
  console.log(`  ${"─".repeat(40)}`);
  console.log(`  Payments:                  ${createdPayments.length}`);
  console.log(`  Ledger entries:            ${ledgerEntries.length}`);
  console.log(`  Outbox events:             ${outboxEvents.length}`);
  console.log(`  Webhook deliveries:        ${webhookDeliveries.length}`);
  console.log(`  Refunds:                   1`);
  console.log(`  Disputes:                  1`);
  console.log(`  Settlement batch items:    ${createdPayments.length}`);
  console.log(`  Reconciliation matches:    ${createdPayments.length}`);
  console.log(`  Daily balances:            31\n`);

  console.log("  Merchant API Keys:");
  console.log(`  Live: ${liveKey}`);
  console.log(`  Test: ${testKey}\n`);

  console.log("  Login: merchant@nexpay.dev / demo1234\n");
  console.log("═".repeat(56) + "\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Golden seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
