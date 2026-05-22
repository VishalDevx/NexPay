import { PrismaClient, PaymentStatus, AccountType, EntryType, PayoutStatus, DisputeStatus, WebhookStatus, IncidentSeverity, IncidentStatus, TicketPriority, TicketStatus, TicketCategory, KYCStatus, MerchantStatus, PlanTier, SplitType, RiskCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

function randomDate(daysBack: number): Date {
  const now = Date.now();
  const past = now - daysBack * 86400000;
  return new Date(past + Math.random() * (now - past));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateApiKeyHash(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function formatAmount(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PASSWORD = "demo1234";

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
  "Krishna", "Ishaan", "Ananya", "Diya", "Myra", "Sara", "Aisha", "Kavya",
  "Riya", "Sana", "Priya", "Neha", "Rohan", "Amit", "Deepak", "Rajesh",
  "Suresh", "Vikram", "Akash", "Manish", "Nitin", "Pradeep", "Sunil",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Nair",
  "Menon", "Iyer", "Joshi", "Deshmukh", "Shah", "Mehta", "Agarwal", "Kapoor",
  "Malhotra", "Chopra", "Bhatt", "Pandey", "Mishra", "Dubey", "Tiwari", "Yadav",
];

const INDIAN_BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank", "Yes Bank", "IDFC First Bank", "IndusInd Bank"];

const UPI_HANDLES = ["@paytm", "@googlepay", "@phonepe", "@amazonpay", "@cred", "@bhimupi"];

const INDIAN_CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune", "Jaipur", "Lucknow"];

const TICKET_SUBJECTS: Array<{ subject: string; category: TicketCategory }> = [
  { subject: "Settlement delayed for last week's transactions", category: "SETTLEMENT_DELAYED" },
  { subject: "Webhook not firing for successful payments", category: "WEBHOOK_ISSUE" },
  { subject: "Refund not processed for customer transaction", category: "REFUND_ISSUE" },
  { subject: "KYC documents not updating after resubmission", category: "KYC_ISSUE" },
  { subject: "Payment failure rate higher than usual", category: "PAYMENT_FAILED" },
  { subject: "Dispute raised on merchant transaction", category: "DISPUTE_ISSUE" },
  { subject: "Unable to login to dashboard", category: "TECHNICAL" },
  { subject: "Invoice discrepancy in monthly billing", category: "BILLING" },
];

const INCIDENT_TITLES = [
  "Payment Gateway Latency Spike",
  "UPI Transaction Processing Delay",
  "Database Replication Lag",
  "Webhook Delivery Backlog",
  "Redis Cache Outage",
];

const COMPLIANCE_CATEGORIES = ["GENERAL", "KYC", "AML", "SANCTIONS", "REGULATORY"];

const WEBHOOK_EVENTS = ["payment.captured", "payment.failed", "payment.refunded", "payment.disputed", "settlement.completed", "payout.completed"];

async function main() {
  console.log("\n🚀 Starting NexPay demo seed...\n");

  const startTime = Date.now();

  // ─── Clean existing data ───────────────────────────────────────────────
  console.log("🧹 Cleaning existing demo data...");

  const demoEmails = [
    "admin@nexpay.dev",
    "merchant@nexpay.dev",
    "techstore@nexpay.dev",
    "freshfoods@nexpay.dev",
    "developer@nexpay.dev",
  ];

  const existingMerchants = await prisma.merchant.findMany({
    where: { email: { in: demoEmails } },
    select: { id: true, email: true },
  });
  const existingIds = existingMerchants.map((m) => m.id);

  if (existingIds.length > 0) {
    await prisma.ticketMessage.deleteMany({ where: { ticket: { merchantId: { in: existingIds } } } });
    await prisma.supportTicket.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.fraudEvent.deleteMany({ where: { payment: { merchantId: { in: existingIds } } } });
    await prisma.paymentEvent.deleteMany({ where: { payment: { merchantId: { in: existingIds } } } });
    await prisma.ledgerEntry.deleteMany({ where: { account: { merchantId: { in: existingIds } } } });
    await prisma.webhookDelivery.deleteMany({ where: { endpoint: { merchantId: { in: existingIds } } } });
    await prisma.webhookEndpoint.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.walletTxn.deleteMany({ where: { wallet: { merchantId: { in: existingIds } } } });
    await prisma.wallet.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.splitTransaction.deleteMany({ where: { payment: { merchantId: { in: existingIds } } } });
    await prisma.splitTransaction.deleteMany({ where: { subMerchant: { parentId: { in: existingIds } } } });
    await prisma.subMerchant.deleteMany({ where: { parentId: { in: existingIds } } });
    await prisma.payoutItem.deleteMany({ where: { payout: { merchantId: { in: existingIds } } } });
    await prisma.payout.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.settlementBatchItem.deleteMany({ where: { payment: { merchantId: { in: existingIds } } } });
    await prisma.settlementBatchItem.deleteMany();
    await prisma.settlementBatch.deleteMany();
    await prisma.refund.deleteMany({ where: { payment: { merchantId: { in: existingIds } } } });
    await prisma.dispute.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.complianceNote.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.reserveRelease.deleteMany({ where: { config: { merchantId: { in: existingIds } } } });
    await prisma.reserveConfig.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.feeSchedule.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.billingInvoice.deleteMany({ where: { subscription: { merchantId: { in: existingIds } } } });
    await prisma.subscription.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.teamMember.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.merchantSession.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.merchantApproval.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.idempotencyKey.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.dailyBalance.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.securityEvent.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.notificationPreference.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.upload.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.invoice.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.bankAccount.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.apiKey.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.customer.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.payment.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.account.deleteMany({ where: { merchantId: { in: existingIds } } });
    await prisma.merchant.deleteMany({ where: { id: { in: existingIds } } });
  }

  await prisma.adminActivityLog.deleteMany();
  await prisma.incidentUpdate.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.reconciliationMatch.deleteMany();
  await prisma.reconciliationRun.deleteMany();

  console.log(`   Cleaned ${existingIds.length} existing merchants and related data\n`);

  // ─── Seed reference data ─────────────────────────────────────────────
  console.log("📋 Seeding reference data...");

  const plans = [
    {
      name: "Starter",
      tier: PlanTier.STARTER,
      description: "Best for early-stage startups exploring digital payments",
      monthlyPrice: 0,
      transactionFee: 2.9,
      fixedFee: 0.3,
      internationalMarkup: 1.5,
      maxMonthlyVolume: 100000,
      maxApiCalls: 10000,
      teamMembers: 2,
      features: ["Basic dashboard", "Email support", "Standard webhooks", "API access", "UPI payments"],
    },
    {
      name: "Growth",
      tier: PlanTier.GROWTH,
      description: "For scaling businesses with growing transaction volumes",
      monthlyPrice: 999,
      transactionFee: 2.5,
      fixedFee: 0.2,
      internationalMarkup: 1.0,
      maxMonthlyVolume: 1000000,
      maxApiCalls: 100000,
      teamMembers: 5,
      features: ["Advanced analytics", "Priority support", "Custom webhooks", "Team management", "Fraud detection", "Multiple payment methods"],
    },
    {
      name: "Business",
      tier: PlanTier.BUSINESS,
      description: "For established companies with high transaction volumes",
      monthlyPrice: 4999,
      transactionFee: 2.0,
      fixedFee: 0.1,
      internationalMarkup: 0.75,
      maxMonthlyVolume: 5000000,
      maxApiCalls: 1000000,
      teamMembers: 15,
      features: ["All Growth features", "Dedicated support", "SLA guarantee", "Multi-currency", "Marketplace ready", "Custom reporting", "Bulk payouts"],
    },
    {
      name: "Enterprise",
      tier: PlanTier.ENTERPRISE,
      description: "For high-volume platforms requiring custom solutions",
      monthlyPrice: 0,
      transactionFee: 1.5,
      fixedFee: 0.05,
      internationalMarkup: 0.5,
      maxMonthlyVolume: null,
      maxApiCalls: null,
      teamMembers: null,
      features: ["All Business features", "24/7 phone support", "Custom contract", "On-premise option", "SSO/SAML", "Dedicated infra", "Account manager", "Volume discounts"],
    },
  ];

  for (const plan of plans) {
    await prisma.merchantPlan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
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

  for (const acc of chartAccounts) {
    await prisma.chartAccount.upsert({
      where: { code: acc.code },
      update: { name: acc.name, type: acc.type, category: acc.category, parentCode: acc.parentCode },
      create: { code: acc.code, name: acc.name, type: acc.type, category: acc.category, currency: "INR", parentCode: acc.parentCode, isActive: true },
    });
  }
  console.log("   ✅ Chart of accounts");

  const fraudRules = [
    { name: "Velocity Check", condition: { type: "velocity", limit: 5, window: 60 }, action: "REVIEW", scoreWeight: 30 },
    { name: "Geo Anomaly", condition: { type: "geo_anomaly" }, action: "REVIEW", scoreWeight: 25 },
    { name: "Amount Deviation", condition: { type: "amount_deviation", multiplier: 3 }, action: "REVIEW", scoreWeight: 20 },
    { name: "Device Fingerprint", condition: { type: "device_mismatch" }, action: "REVIEW", scoreWeight: 25 },
    { name: "New Account", condition: { type: "new_account", maxAgeHours: 1 }, action: "REVIEW", scoreWeight: 15 },
    { name: "High Risk Currency", condition: { type: "high_risk_currency", currencies: ["BTC", "ETH", "USDT"] }, action: "DECLINE", scoreWeight: 10 },
  ];

  for (const rule of fraudRules) {
    await prisma.fraudRule.upsert({
      where: { name: rule.name },
      update: {},
      create: { ...rule, enabled: true },
    });
  }
  console.log("   ✅ Fraud rules");

  const recRules = [
    { name: "Payment-Ledger Exact Match", matchType: "EXACT", sourceType: "PAYMENT", targetType: "LEDGER", amountTolerance: 0, dateWindowHours: 24, priority: 1 },
    { name: "Payment-Ledger Tolerance Match", matchType: "TOLERANCE", sourceType: "PAYMENT", targetType: "LEDGER", amountTolerance: 0.01, dateWindowHours: 48, priority: 2 },
    { name: "Settlement-Settlement Batch Match", matchType: "EXACT", sourceType: "SETTLEMENT", targetType: "SETTLEMENT", amountTolerance: 0, dateWindowHours: 72, priority: 1 },
    { name: "Payout-Bank Statement Match", matchType: "TOLERANCE", sourceType: "PAYOUT", targetType: "BANK", amountTolerance: 0.01, dateWindowHours: 168, priority: 1 },
  ];

  for (const rule of recRules) {
    await prisma.reconciliationRule.upsert({
      where: { name: rule.name },
      update: {},
      create: { ...rule, description: rule.name, enabled: true },
    });
  }
  console.log("   ✅ Reconciliation rules\n");

  // ─── Seed merchants ───────────────────────────────────────────────────
  console.log("🏪 Seeding merchants...");

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const merchantConfigs = [
    {
      name: "NexPay Admin",
      email: "admin@nexpay.dev",
      status: MerchantStatus.APPROVED,
      kycStatus: KYCStatus.VERIFIED,
      businessType: "FINANCIAL_SERVICES",
      mccCode: "6012",
      expectedMonthlyVolume: 10000000,
      averageTicketSize: 5000,
      websiteUrl: "https://nexpay.dev",
      riskCategory: RiskCategory.LOW,
      businessDescription: "Platform admin account for NexPay payment processing platform",
      incorporationDate: new Date("2020-01-15"),
      taxId: "AAACN1234E",
      emailVerified: true,
      country: "IN",
      refundPolicyUrl: "https://nexpay.dev/refund",
      termsUrl: "https://nexpay.dev/terms",
      payoutSchedule: { frequency: "DAILY", day: null },
      settingsJson: { autoSettle: true, holdPeriod: 0, notifyOnPayment: true },
      brandingJson: { primaryColor: "#6366f1", logoUrl: null },
    },
    {
      name: "Acme Corp",
      email: "merchant@nexpay.dev",
      status: MerchantStatus.APPROVED,
      kycStatus: KYCStatus.VERIFIED,
      businessType: "TECHNOLOGY",
      mccCode: "5734",
      expectedMonthlyVolume: 5000000,
      averageTicketSize: 2500,
      websiteUrl: "https://acmecorp.in",
      riskCategory: RiskCategory.LOW,
      businessDescription: "Leading e-commerce platform for consumer electronics and gadgets",
      incorporationDate: new Date("2019-06-01"),
      taxId: "AABCK5678F",
      emailVerified: true,
      country: "IN",
      refundPolicyUrl: "https://acmecorp.in/refund",
      termsUrl: "https://acmecorp.in/terms",
      payoutSchedule: { frequency: "DAILY", day: null },
      settingsJson: { autoSettle: true, holdPeriod: 0, notifyOnPayment: true },
      brandingJson: { primaryColor: "#2563eb", logoUrl: null },
    },
    {
      name: "TechStore India",
      email: "techstore@nexpay.dev",
      status: MerchantStatus.APPROVED,
      kycStatus: KYCStatus.VERIFIED,
      businessType: "ECOMMERCE",
      mccCode: "5734",
      expectedMonthlyVolume: 8000000,
      averageTicketSize: 15000,
      websiteUrl: "https://techstore.in",
      riskCategory: RiskCategory.LOW,
      businessDescription: "Premium electronics and gadgets retailer with pan-India delivery",
      incorporationDate: new Date("2018-03-20"),
      taxId: "AACCT9012G",
      emailVerified: true,
      country: "IN",
      refundPolicyUrl: "https://techstore.in/refund",
      termsUrl: "https://techstore.in/terms",
      payoutSchedule: { frequency: "DAILY", day: null },
      settingsJson: { autoSettle: true, holdPeriod: 1, notifyOnPayment: true },
      brandingJson: { primaryColor: "#059669", logoUrl: null },
    },
    {
      name: "FreshFoods",
      email: "freshfoods@nexpay.dev",
      status: MerchantStatus.APPROVED,
      kycStatus: KYCStatus.VERIFIED,
      businessType: "FOOD_AND_BEVERAGE",
      mccCode: "5812",
      expectedMonthlyVolume: 2000000,
      averageTicketSize: 500,
      websiteUrl: "https://freshfoods.in",
      riskCategory: RiskCategory.LOW,
      businessDescription: "Farm-to-table fresh food delivery service in Bangalore and Mumbai",
      incorporationDate: new Date("2021-11-01"),
      taxId: "AAFFH3456K",
      emailVerified: true,
      country: "IN",
      refundPolicyUrl: "https://freshfoods.in/refund",
      termsUrl: "https://freshfoods.in/terms",
      payoutSchedule: { frequency: "TWICE_WEEKLY", day: null },
      settingsJson: { autoSettle: true, holdPeriod: 2, notifyOnPayment: true },
      brandingJson: { primaryColor: "#dc2626", logoUrl: null },
    },
    {
      name: "DevSandbox",
      email: "developer@nexpay.dev",
      status: MerchantStatus.ACTIVE,
      kycStatus: KYCStatus.VERIFIED,
      businessType: "TECHNOLOGY",
      mccCode: "7372",
      expectedMonthlyVolume: 100000000,
      averageTicketSize: 10000,
      websiteUrl: "https://devsandbox.io",
      riskCategory: RiskCategory.LOW,
      businessDescription: "Sandbox environment for API testing and development",
      incorporationDate: new Date("2022-01-01"),
      taxId: "AADSB7890P",
      emailVerified: true,
      country: "IN",
      refundPolicyUrl: null,
      termsUrl: null,
      payoutSchedule: { frequency: "WEEKLY", day: 1 },
      settingsJson: { autoSettle: false, holdPeriod: 0, notifyOnPayment: false, sandbox: true },
      brandingJson: { primaryColor: "#8b5cf6", logoUrl: null },
    },
  ];

  const createdMerchants: Array<{ id: string; email: string; name: string }> = [];
  const merchantPlanMap = new Map<string, PlanTier>();

  for (const cfg of merchantConfigs) {
    const merchant = await prisma.merchant.upsert({
      where: { email: cfg.email },
      update: {},
      create: {
        name: cfg.name,
        email: cfg.email,
        passwordHash,
        status: cfg.status,
        kycStatus: cfg.kycStatus,
        businessType: cfg.businessType,
        mccCode: cfg.mccCode,
        expectedMonthlyVolume: cfg.expectedMonthlyVolume,
        averageTicketSize: cfg.averageTicketSize,
        websiteUrl: cfg.websiteUrl,
        riskCategory: cfg.riskCategory,
        businessDescription: cfg.businessDescription,
        incorporationDate: cfg.incorporationDate,
        taxId: cfg.taxId,
        emailVerified: cfg.emailVerified,
        country: cfg.country,
        refundPolicyUrl: cfg.refundPolicyUrl,
        termsUrl: cfg.termsUrl,
        payoutSchedule: cfg.payoutSchedule,
        settingsJson: cfg.settingsJson,
        brandingJson: cfg.brandingJson,
        baseCurrency: "INR",
        approvedAt: new Date(),
        kycSubmittedAt: new Date("2024-01-15"),
      },
    });

    const planTier = (() => {
      switch (cfg.email) {
        case "admin@nexpay.dev": return PlanTier.GROWTH;
        case "merchant@nexpay.dev": return PlanTier.GROWTH;
        case "techstore@nexpay.dev": return PlanTier.BUSINESS;
        case "freshfoods@nexpay.dev": return PlanTier.STARTER;
        case "developer@nexpay.dev": return PlanTier.ENTERPRISE;
        default: return PlanTier.STARTER;
      }
    })();
    merchantPlanMap.set(merchant.id, planTier);
    createdMerchants.push({ id: merchant.id, email: merchant.email, name: merchant.name });
    console.log(`   ✅ ${cfg.name} (${cfg.email})`);
  }

  // ─── Seed merchant-related data ───────────────────────────────────────
  console.log("\n🔧 Setting up merchant integrations...");

  for (const merchant of createdMerchants) {
    const isAdmin = merchant.email === "admin@nexpay.dev";
    const isDev = merchant.email === "developer@nexpay.dev";

    // API keys
    const liveKeyPrefix = "nex_live_";
    const testKeyPrefix = "nex_test_";
    const liveRawKey = liveKeyPrefix + crypto.randomBytes(24).toString("hex");
    const testRawKey = testKeyPrefix + crypto.randomBytes(24).toString("hex");

    await prisma.apiKey.createMany({
      data: [
        {
          merchantId: merchant.id,
          keyHash: generateApiKeyHash(liveRawKey),
          prefix: liveKeyPrefix,
          env: "LIVE",
          scopes: ["charges:write", "charges:read", "refunds:write", "customers:read"],
        },
        {
          merchantId: merchant.id,
          keyHash: generateApiKeyHash(testRawKey),
          prefix: testKeyPrefix,
          env: "TEST",
          scopes: ["charges:write", "charges:read", "refunds:write", "customers:read"],
        },
      ],
    });

    // Bank account
    const bankName = randomElement(INDIAN_BANKS);
    const ifscCode =
      bankName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase() + "000" + randomInt(1000, 9999);

    await prisma.bankAccount.create({
      data: {
        merchantId: merchant.id,
        accountNumber: String(randomInt(10000000000, 99999999999)),
        ifsc: ifscCode,
        bankName,
        accountHolder: merchant.name + " Pvt Ltd",
        isPrimary: true,
        verified: true,
      },
    });

    // Wallet
    const wallet = await prisma.wallet.create({
      data: {
        merchantId: merchant.id,
        currency: "INR",
        redisBalanceKey: `wallet:${merchant.id}:INR`,
      },
    });

    // Wallet transactions (initial load)
    const initialBalance = isAdmin ? 1000000 : isDev ? 500000 : randomInt(100000, 500000);
    await prisma.walletTxn.create({
      data: {
        walletId: wallet.id,
        type: "LOAD",
        amount: initialBalance,
        refId: "INITIAL_SEED",
        refType: "SYSTEM",
        createdAt: new Date(Date.now() - 90 * 86400000),
      },
    });

    // Accounts (ASSET, LIABILITY, REVENUE)
    const assetAccount = await prisma.account.create({
      data: {
        merchantId: merchant.id,
        type: AccountType.ASSET,
        currency: "INR",
        name: "Settlement Holding",
        lastBalance: 0,
      },
    });

    const liabilityAccount = await prisma.account.create({
      data: {
        merchantId: merchant.id,
        type: AccountType.LIABILITY,
        currency: "INR",
        name: "Merchant Payable",
        lastBalance: 0,
      },
    });

    const revenueAccount = await prisma.account.create({
      data: {
        merchantId: merchant.id,
        type: AccountType.REVENUE,
        currency: "INR",
        name: "Processing Fees",
        lastBalance: 0,
      },
    });

    // Fee schedule
    const merchantPlanTier = merchantPlanMap.get(merchant.id) || PlanTier.STARTER;
    const plan = await prisma.merchantPlan.findFirstOrThrow({ where: { tier: merchantPlanTier } });
    await prisma.feeSchedule.upsert({
      where: { merchantId: merchant.id },
      update: {},
      create: {
        merchantId: merchant.id,
        mdr: Number(plan.transactionFee),
        fixedFee: Number(plan.fixedFee),
        internationalMarkup: Number(plan.internationalMarkup),
        payoutFee: 0,
        refundFee: 0,
        chargebackFee: 15,
        upiMdr: 0,
        upiFixedFee: 0,
        planTier: merchantPlanTier,
      },
    });

    // Subscription
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await prisma.subscription.upsert({
      where: { merchantId: merchant.id },
      update: {},
      create: {
        merchantId: merchant.id,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    });

    // Billing invoice for this month
    if (Number(plan.monthlyPrice) > 0) {
      const sub = await prisma.subscription.findFirstOrThrow({ where: { merchantId: merchant.id } });
      const invoiceNumber = `INV-${merchant.name.substring(0, 3).toUpperCase()}-${Date.now()}`;
      const taxAmount = Number(plan.monthlyPrice) * 0.18;
      await prisma.billingInvoice.create({
        data: {
          subscriptionId: sub.id,
          invoiceNumber,
          amount: Number(plan.monthlyPrice),
          taxAmount,
          total: Number(plan.monthlyPrice) + taxAmount,
          currency: "INR",
          status: "PAID",
          periodStart: new Date(),
          periodEnd: periodEnd,
          paidAt: new Date(),
          paidVia: "BANK_TRANSFER",
        },
      });
    }

    // Webhook endpoint
    const webhookSecret = crypto.randomBytes(32).toString("hex");
    const webhookSecretHash = crypto.createHash("sha256").update(webhookSecret).digest("hex");
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        merchantId: merchant.id,
        url: `https://webhook.example.com/${merchant.name.toLowerCase().replace(/\s+/g, "-")}/hook`,
        events: WEBHOOK_EVENTS,
        secretHash: webhookSecretHash,
        enabled: true,
      },
    });

    // Reserve config
    await prisma.reserveConfig.upsert({
      where: { merchantId: merchant.id },
      update: {},
      create: {
        merchantId: merchant.id,
        reservePercentage: 10,
        fixedReserveAmount: 0,
        releaseDelayDays: 90,
        riskBasedIncrease: false,
        manualHold: false,
        currentReserveBalance: 0,
      },
    });

    // Team members
    const teamRoles = ["ADMIN", "DEVELOPER", "ANALYST", "VIEWER"];
    const memberCount = isAdmin ? 3 : randomInt(2, 3);
    for (let i = 1; i <= memberCount; i++) {
      const memberName = `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`;
      const memberEmail = `team${i}.${merchant.name.toLowerCase().replace(/\s+/g, "")}@example.com`;
      await prisma.teamMember.upsert({
        where: { merchantId_email: { merchantId: merchant.id, email: memberEmail } },
        update: {},
        create: {
          merchantId: merchant.id,
          email: memberEmail,
          name: memberName,
          role: randomElement(teamRoles),
          status: "ACTIVE",
          invitedAt: randomDate(60),
          lastLoginAt: randomDate(7),
        },
      });
    }

    // Notification preferences
    const channels = ["email", "slack", "sms"];
    const events = ["payment.succeeded", "payment.failed", "payout.completed", "dispute.raised", "settlement.delayed"];
    for (const channel of channels) {
      for (const event of events.slice(0, 3)) {
        await prisma.notificationPreference.upsert({
          where: { merchantId_channel_event: { merchantId: merchant.id, channel, event } },
          update: {},
          create: {
            merchantId: merchant.id,
            channel,
            event,
            enabled: true,
            slackWebhook: channel === "slack" ? `https://hooks.slack.com/services/T0${randomInt(10000, 99999)}` : null,
            slackChannel: channel === "slack" ? "#payments" : null,
          },
        });
      }
    }
  }

  // Store accounts map by merchant for later use
  const merchantAccounts = new Map<string, { asset: string; liability: string; revenue: string }>();
  for (const m of createdMerchants) {
    const accounts = await prisma.account.findMany({ where: { merchantId: m.id } });
    merchantAccounts.set(m.id, {
      asset: accounts.find((a) => a.type === AccountType.ASSET)!.id,
      liability: accounts.find((a) => a.type === AccountType.LIABILITY)!.id,
      revenue: accounts.find((a) => a.type === AccountType.REVENUE)!.id,
    });
  }

  console.log("   ✅ API keys, wallets, accounts, subscriptions, webhooks, team, notifications\n");

  // ─── Seed customers ───────────────────────────────────────────────────
  console.log("👥 Seeding customers...");

  const customerRecords: Array<{ id: string; merchantId: string }> = [];
  const totalCustomers = 25;

  for (let i = 0; i < totalCustomers; i++) {
    const merchantIdx = i % createdMerchants.length;
    const merchant = createdMerchants[merchantIdx];
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const email = `customer${i}.${firstName.toLowerCase()}@example.com`;
    const phone = `+91${randomInt(7000000000, 9999999999)}`;

    const customer = await prisma.customer.upsert({
      where: { merchantId_email: { merchantId: merchant.id, email } },
      update: {},
      create: {
        merchantId: merchant.id,
        email,
        name,
        phone,
        metadata: {
          city: randomElement(INDIAN_CITIES),
          signupDate: randomDate(365).toISOString(),
          preferredPayment: randomElement(["card", "upi", "netbanking"]),
        },
      },
    });
    customerRecords.push({ id: customer.id, merchantId: customer.merchantId });
  }
  console.log(`   ✅ ${totalCustomers} customers created`);

  // ─── Seed payments ─────────────────────────────────────────────────────
  console.log("\n💳 Seeding payments...");

  const MERCHANT_PAYMENT_WEIGHTS = [5, 35, 30, 20, 10]; // admin gets few, acme/techstore/freshfoods/dev
  const TOTAL_PAYMENTS = 510;

  const paymentMethodTypes = [
    { type: "card", provider: "visa", last4: () => String(randomInt(1000, 9999)) },
    { type: "card", provider: "mastercard", last4: () => String(randomInt(1000, 9999)) },
    { type: "upi", vpa: () => `${randomElement(FIRST_NAMES).toLowerCase()}${randomElement(UPI_HANDLES)}` },
    { type: "upi", vpa: () => `pay${randomInt(10000, 99999)}${randomElement(UPI_HANDLES)}` },
    { type: "netbanking", bank: () => randomElement(INDIAN_BANKS) },
  ];

  const paymentStatusWeights: Array<{ status: PaymentStatus; weight: number; events: Array<{ from: PaymentStatus; to: PaymentStatus }> }> = [
    {
      status: PaymentStatus.SETTLED,
      weight: 30,
      events: [
        { from: PaymentStatus.INITIATED, to: PaymentStatus.PROCESSING },
        { from: PaymentStatus.PROCESSING, to: PaymentStatus.AUTHORIZED },
        { from: PaymentStatus.AUTHORIZED, to: PaymentStatus.CAPTURED },
        { from: PaymentStatus.CAPTURED, to: PaymentStatus.SETTLED },
      ],
    },
    {
      status: PaymentStatus.CAPTURED,
      weight: 40,
      events: [
        { from: PaymentStatus.INITIATED, to: PaymentStatus.PROCESSING },
        { from: PaymentStatus.PROCESSING, to: PaymentStatus.AUTHORIZED },
        { from: PaymentStatus.AUTHORIZED, to: PaymentStatus.CAPTURED },
      ],
    },
    {
      status: PaymentStatus.FAILED,
      weight: 10,
      events: [
        { from: PaymentStatus.INITIATED, to: PaymentStatus.PROCESSING },
        { from: PaymentStatus.PROCESSING, to: PaymentStatus.FAILED },
      ],
    },
    {
      status: PaymentStatus.REFUNDED,
      weight: 5,
      events: [
        { from: PaymentStatus.INITIATED, to: PaymentStatus.PROCESSING },
        { from: PaymentStatus.PROCESSING, to: PaymentStatus.AUTHORIZED },
        { from: PaymentStatus.AUTHORIZED, to: PaymentStatus.CAPTURED },
        { from: PaymentStatus.CAPTURED, to: PaymentStatus.REFUNDED },
      ],
    },
    {
      status: PaymentStatus.DISPUTED,
      weight: 5,
      events: [
        { from: PaymentStatus.INITIATED, to: PaymentStatus.PROCESSING },
        { from: PaymentStatus.PROCESSING, to: PaymentStatus.AUTHORIZED },
        { from: PaymentStatus.AUTHORIZED, to: PaymentStatus.CAPTURED },
        { from: PaymentStatus.CAPTURED, to: PaymentStatus.DISPUTED },
      ],
    },
    {
      status: PaymentStatus.PROCESSING,
      weight: 5,
      events: [
        { from: PaymentStatus.INITIATED, to: PaymentStatus.PROCESSING },
      ],
    },
    {
      status: PaymentStatus.AUTHORIZED,
      weight: 5,
      events: [
        { from: PaymentStatus.INITIATED, to: PaymentStatus.PROCESSING },
        { from: PaymentStatus.PROCESSING, to: PaymentStatus.AUTHORIZED },
      ],
    },
  ];

  // Build weighted status picker
  const statusPicker: PaymentStatus[] = [];
  for (const sw of paymentStatusWeights) {
    for (let i = 0; i < sw.weight; i++) {
      statusPicker.push(sw.status);
    }
  }

  const paymentIds: string[] = [];
  const paymentEventData: Array<{
    id: string;
    paymentId: string;
    fromStatus: PaymentStatus;
    toStatus: PaymentStatus;
    actor: string;
    reason?: string;
    createdAt: Date;
  }> = [];
  const ledgerEntryData: Array<{
    id: string;
    accountId: string;
    paymentId: string;
    type: EntryType;
    amount: number;
    currency: string;
    balanceAfter: number;
    description?: string;
    createdAt: Date;
  }> = [];
  const refundData: Array<{
    id: string;
    paymentId: string;
    amount: number;
    reason: string;
    createdAt: Date;
  }> = [];
  const disputeData: Array<{
    id: string;
    paymentId: string;
    merchantId: string;
    reason: string;
    status: DisputeStatus;
    amount: number;
    evidence: any;
    createdAt: Date;
    resolvedAt?: Date;
    resolution?: string;
  }> = [];
  const fraudEventData: Array<{
    id: string;
    paymentId: string;
    ruleName: string;
    triggered: boolean;
    score: number;
    reason: string;
    details: any;
    createdAt: Date;
  }> = [];
  const webhookDeliveryData: Array<{
    id: string;
    endpointId: string;
    paymentId: string;
    payload: any;
    status: WebhookStatus;
    attempts: number;
    maxRetries: number;
    nextRetryAt?: Date;
    deliveredAt?: Date;
    createdAt: Date;
  }> = [];

  // Fetch webhook endpoints for merchants
  const webhookEndpoints = await prisma.webhookEndpoint.findMany({
    where: { merchantId: { in: createdMerchants.map((m) => m.id) } },
    select: { id: true, merchantId: true },
  });
  const endpointByMerchant = new Map(webhookEndpoints.map((e) => [e.merchantId, e.id]));

  // Track balances for proper ledger accounting
  const accountBalances = new Map<string, number>();
  for (const m of createdMerchants) {
    const accts = merchantAccounts.get(m.id)!;
    accountBalances.set(accts.asset, 0);
    accountBalances.set(accts.liability, 0);
    accountBalances.set(accts.revenue, 0);
  }

  let paymentCount = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < TOTAL_PAYMENTS; i++) {
    // Pick merchant based on weights
    const merchantIdx = (() => {
      const r = Math.random() * 100;
      let cumulative = 0;
      for (let j = 0; j < MERCHANT_PAYMENT_WEIGHTS.length; j++) {
        cumulative += MERCHANT_PAYMENT_WEIGHTS[j];
        if (r <= cumulative) return j;
      }
      return 1;
    })();

    const merchant = createdMerchants[merchantIdx];
    const status = statusPicker[randomInt(0, statusPicker.length - 1)];
    const statusConfig = paymentStatusWeights.find((sw) => sw.status === status)!;
    const amount = randomAmount(100, 50000);
    const pmtMethod = randomElement(paymentMethodTypes);
    const paymentMethod = {
      type: pmtMethod.type,
      ...(pmtMethod.type === "card"
        ? { provider: pmtMethod.provider, last4: pmtMethod.last4() }
        : pmtMethod.type === "upi"
          ? { vpa: pmtMethod.vpa() }
          : { bank: (pmtMethod as any).bank() }),
    };

    const paymentDate = randomDate(90);
    const customerIdx = Math.floor(Math.random() * customerRecords.length);
    const customer = customerRecords[customerIdx];

    const paymentId = uuidv4();
    paymentIds.push(paymentId);

    const feeAmount = Math.round(amount * 0.025 * 100) / 100;
    const netAmount = Math.round((amount - feeAmount) * 100) / 100;

    const feeSchedule = await prisma.feeSchedule.findUnique({ where: { merchantId: merchant.id } });

    // Create payment events
    for (const evt of statusConfig.events) {
      const eventDate = new Date(paymentDate.getTime() + statusConfig.events.indexOf(evt) * 5000);
      paymentEventData.push({
        id: uuidv4(),
        paymentId,
        fromStatus: evt.from,
        toStatus: evt.to,
        actor: "SYSTEM",
        reason: evt.to === PaymentStatus.FAILED ? "Card declined by issuer" : undefined,
        createdAt: eventDate,
      });
    }

    // Create ledger entries
    const accts = merchantAccounts.get(merchant.id)!;

    if (status === PaymentStatus.CAPTURED || status === PaymentStatus.SETTLED || status === PaymentStatus.REFUNDED || status === PaymentStatus.DISPUTED) {
      // Debit asset (settlement holding)
      const assetBal = (accountBalances.get(accts.asset) || 0) + amount;
      accountBalances.set(accts.asset, assetBal);
      ledgerEntryData.push({
        id: uuidv4(),
        accountId: accts.asset,
        paymentId,
        type: EntryType.DEBIT,
        amount,
        currency: "INR",
        balanceAfter: Math.round(assetBal * 100) / 100,
        description: `Payment received - ${merchant.name}`,
        createdAt: paymentDate,
      });

      // Credit liability (merchant payable)
      const liabBal = (accountBalances.get(accts.liability) || 0) + netAmount;
      accountBalances.set(accts.liability, liabBal);
      ledgerEntryData.push({
        id: uuidv4(),
        accountId: accts.liability,
        paymentId,
        type: EntryType.CREDIT,
        amount: netAmount,
        currency: "INR",
        balanceAfter: Math.round(liabBal * 100) / 100,
        description: `Merchant settlement for payment`,
        createdAt: paymentDate,
      });

      // Credit revenue (processing fees)
      const revBal = (accountBalances.get(accts.revenue) || 0) + feeAmount;
      accountBalances.set(accts.revenue, revBal);
      ledgerEntryData.push({
        id: uuidv4(),
        accountId: accts.revenue,
        paymentId,
        type: EntryType.CREDIT,
        amount: feeAmount,
        currency: "INR",
        balanceAfter: Math.round(revBal * 100) / 100,
        description: `Processing fee (2.5%)`,
        createdAt: paymentDate,
      });
    } else if (status === PaymentStatus.AUTHORIZED) {
      // For authorized but not captured, we still do provisional entries
      const assetBal = (accountBalances.get(accts.asset) || 0) + amount;
      accountBalances.set(accts.asset, assetBal);
      ledgerEntryData.push({
        id: uuidv4(),
        accountId: accts.asset,
        paymentId,
        type: EntryType.DEBIT,
        amount,
        currency: "INR",
        balanceAfter: Math.round(assetBal * 100) / 100,
        description: `Payment authorized - ${merchant.name}`,
        createdAt: paymentDate,
      });
      const liabBal = (accountBalances.get(accts.liability) || 0) + amount;
      accountBalances.set(accts.liability, liabBal);
      ledgerEntryData.push({
        id: uuidv4(),
        accountId: accts.liability,
        paymentId,
        type: EntryType.CREDIT,
        amount,
        currency: "INR",
        balanceAfter: Math.round(liabBal * 100) / 100,
        description: `Authorization hold`,
        createdAt: paymentDate,
      });
    }

    // Handle refunds
    if (status === PaymentStatus.REFUNDED) {
      refundData.push({
        id: uuidv4(),
        paymentId,
        amount: amount,
        reason: randomElement(["Customer requested refund", "Item out of stock", "Duplicate transaction", "Product defective", "Order cancelled"]),
        createdAt: new Date(paymentDate.getTime() + 86400000 * randomInt(1, 7)),
      });
    }

    // Handle disputes
    if (status === PaymentStatus.DISPUTED) {
      const disputeReasons = ["fraudulent", "duplicate", "product_not_received", "not_as_described", "credit_not_processed"];
      const disputeStatuses: DisputeStatus[] = [
        DisputeStatus.RAISED,
        DisputeStatus.EVIDENCE_SUBMITTED,
        DisputeStatus.UNDER_REVIEW,
        DisputeStatus.RESOLVED_MERCHANT_WON,
        DisputeStatus.RESOLVED_MERCHANT_LOST,
      ];
      const disputeStatus = randomElement(disputeStatuses);
      const isResolved = disputeStatus.includes("RESOLVED");

      disputeData.push({
        id: uuidv4(),
        paymentId,
        merchantId: merchant.id,
        reason: randomElement(disputeReasons),
        status: disputeStatus,
        amount,
        evidence: {
          documents: ["receipt.pdf", "shipping_proof.png"],
          description: "Customer claims unauthorized transaction",
          submittedAt: new Date(paymentDate.getTime() + 86400000 * randomInt(3, 10)).toISOString(),
        },
        createdAt: new Date(paymentDate.getTime() + 86400000 * randomInt(5, 15)),
        resolvedAt: isResolved ? new Date(paymentDate.getTime() + 86400000 * randomInt(20, 40)) : undefined,
        resolution: isResolved
          ? disputeStatus === DisputeStatus.RESOLVED_MERCHANT_WON
            ? "Merchant won - valid transaction with proof of delivery"
            : "Merchant lost - insufficient evidence provided"
          : undefined,
      });
    }

    // Fraud events (for ~5% of payments)
    if (Math.random() < 0.05) {
      const fraudRulesList = ["Velocity Check", "Geo Anomaly", "Amount Deviation", "Device Fingerprint"];
      fraudEventData.push({
        id: uuidv4(),
        paymentId,
        ruleName: randomElement(fraudRulesList),
        triggered: true,
        score: Math.round(Math.random() * 85 + 10),
        reason: "Suspicious transaction pattern detected",
        details: {
          ip: `103.${randomInt(10, 200)}.${randomInt(10, 200)}.${randomInt(10, 200)}`,
          deviceId: `DEV-${randomInt(10000, 99999)}`,
          riskIndicators: ["new_device", "geo_mismatch"],
        },
        createdAt: paymentDate,
      });
    }

    // Webhook deliveries (for captured/settled/refunded/failed)
    const endpointId = endpointByMerchant.get(merchant.id);
    if (endpointId && (status === PaymentStatus.CAPTURED || status === PaymentStatus.SETTLED || status === PaymentStatus.FAILED || status === PaymentStatus.REFUNDED)) {
      const webhookStatuses: WebhookStatus[] = [WebhookStatus.DELIVERED, WebhookStatus.DELIVERED, WebhookStatus.DELIVERED, WebhookStatus.FAILED, WebhookStatus.PENDING, WebhookStatus.DEAD_LETTER];
      const whStatus = randomElement(webhookStatuses);
      const attempts = whStatus === WebhookStatus.DELIVERED ? 1 : whStatus === WebhookStatus.DEAD_LETTER ? 5 : randomInt(1, 3);
      const isDelivered = whStatus === WebhookStatus.DELIVERED;

      webhookDeliveryData.push({
        id: uuidv4(),
        endpointId,
        paymentId,
        payload: {
          event: `payment.${status.toLowerCase()}`,
          paymentId,
          amount,
          currency: "INR",
          status,
          merchantId: merchant.id,
          timestamp: paymentDate.toISOString(),
        },
        status: whStatus,
        attempts,
        maxRetries: 5,
        nextRetryAt: !isDelivered && attempts < 5 ? new Date(Date.now() + 60000) : undefined,
        deliveredAt: isDelivered ? new Date(paymentDate.getTime() + 1000) : undefined,
        createdAt: paymentDate,
      });
    }
  }

  // Batch insert payments
  for (let i = 0; i < paymentIds.length; i += BATCH_SIZE) {
    const batch = paymentIds.slice(i, i + BATCH_SIZE);
    const statuses = batch.map((id) => {
      const idx = paymentIds.indexOf(id);
      const merchant = createdMerchants[(() => {
        let cum = 0;
        for (let j = 0; j < MERCHANT_PAYMENT_WEIGHTS.length; j++) {
          cum += MERCHANT_PAYMENT_WEIGHTS[j];
          if (idx / TOTAL_PAYMENTS * 100 <= cum) return j;
        }
        return 1;
      })()];
      const randIdx = randomInt(0, statusPicker.length - 1);
      const s = statusPicker[randIdx];
      const pmtDate = randomDate(90);
      const customer = customerRecords[Math.floor(Math.random() * customerRecords.length)];
      const amount = randomAmount(100, 50000);
      const pm = randomElement(paymentMethodTypes);
      const pmMethod = {
        type: pm.type,
        ...(pm.type === "card"
          ? { provider: pm.provider, last4: pm.last4() }
          : pm.type === "upi"
            ? { vpa: pm.vpa() }
            : { bank: (pm as any).bank() }),
      };
      const hasIdempotency = Math.random() < 0.1;

      return {
        id,
        merchantId: merchant.id,
        customerId: customer.id,
        amount,
        amountRefunded: s === PaymentStatus.REFUNDED ? amount : 0,
        currency: "INR",
        status: s,
        idempotencyKey: hasIdempotency ? `idemp-${crypto.randomBytes(8).toString("hex")}` : null,
        paymentMethod: pmMethod,
        metadata: {
          source: randomElement(["web", "mobile", "api", "pos"]),
          ip: `103.${randomInt(10, 200)}.${randomInt(10, 200)}.${randomInt(10, 200)}`,
          userAgent: "Mozilla/5.0",
        },
        fraudScore: null,
        description: `Payment for ${randomElement(["Order #" + randomInt(1000, 9999), "Invoice INV-" + randomInt(10000, 99999), "Subscription renewal", "Product purchase", "Service payment"])}`,
        capturedAt: s === PaymentStatus.CAPTURED || s === PaymentStatus.SETTLED || s === PaymentStatus.DISPUTED ? pmtDate : null,
        settledAt: s === PaymentStatus.SETTLED ? new Date(pmtDate.getTime() + 86400000 * 2) : null,
        createdAt: pmtDate,
        updatedAt: pmtDate,
      };
    });

    await prisma.payment.createMany({ data: statuses });
    paymentCount += batch.length;
  }
  console.log(`   ✅ ${paymentCount} payments created`);

  // Batch insert payment events
  await prisma.paymentEvent.createMany({ data: paymentEventData });
  console.log(`   ✅ ${paymentEventData.length} payment events created`);

  // Batch insert ledger entries
  await prisma.ledgerEntry.createMany({ data: ledgerEntryData });
  console.log(`   ✅ ${ledgerEntryData.length} ledger entries created`);

  // Batch insert refunds
  if (refundData.length > 0) {
    await prisma.refund.createMany({ data: refundData });
    console.log(`   ✅ ${refundData.length} refunds created`);
  }

  // Batch insert disputes
  if (disputeData.length > 0) {
    // Need to create disputes with proper status enum
    for (const d of disputeData) {
      await prisma.dispute.create({ data: d });
    }
    console.log(`   ✅ ${disputeData.length} disputes created`);
  }

  // Batch insert fraud events
  if (fraudEventData.length > 0) {
    await prisma.fraudEvent.createMany({ data: fraudEventData });
    console.log(`   ✅ ${fraudEventData.length} fraud events created`);
  }

  // Batch insert webhook deliveries
  if (webhookDeliveryData.length > 0) {
    await prisma.webhookDelivery.createMany({ data: webhookDeliveryData });
    console.log(`   ✅ ${webhookDeliveryData.length} webhook deliveries created`);
  }

  // Update account balances
  for (const [accountId, balance] of accountBalances) {
    await prisma.account.update({
      where: { id: accountId },
      data: { lastBalance: Math.round(balance * 100) / 100 },
    });
  }
  console.log("   ✅ Account balances updated");

  // ─── Seed Support Tickets ─────────────────────────────────────────────
  console.log("\n🎫 Seeding support tickets...");

  const ticketMessageData: Array<{
    id: string;
    ticketId: string;
    authorId: string;
    authorType: string;
    content: string;
    createdAt: Date;
  }> = [];
  const admin = createdMerchants[0];

  for (let i = 0; i < 8; i++) {
    const merchant = createdMerchants[randomInt(0, createdMerchants.length - 1)];
    const ticketSubject = randomElement(TICKET_SUBJECTS);
    const priorities: TicketPriority[] = [TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.URGENT];
    const statuses: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.PENDING_MERCHANT, TicketStatus.PENDING_INTERNAL, TicketStatus.RESOLVED, TicketStatus.CLOSED];

    const ticket = await prisma.supportTicket.create({
      data: {
        merchantId: merchant.id,
        subject: ticketSubject.subject,
        category: ticketSubject.category,
        priority: randomElement(priorities),
        status: randomElement(statuses),
        assignedTo: Math.random() < 0.5 ? admin.id : null,
        slaDeadline: new Date(Date.now() + 86400000 * 2),
        createdAt: randomDate(30),
      },
    });

    // Add 1-3 messages per ticket
    const msgCount = randomInt(1, 3);
    for (let m = 0; m < msgCount; m++) {
      ticketMessageData.push({
        id: uuidv4(),
        ticketId: ticket.id,
        authorId: m === 0 ? merchant.id : admin.id,
        authorType: m === 0 ? "MERCHANT" : "ADMIN",
        content: m === 0
          ? `I'm facing an issue with ${ticketSubject.subject.toLowerCase()}. Can you please look into this?`
          : `Thank you for reporting. Our team is investigating this issue and will get back to you shortly.`,
        createdAt: new Date(ticket.createdAt.getTime() + m * 3600000),
      });
    }
  }
  await prisma.ticketMessage.createMany({ data: ticketMessageData });
  console.log("   ✅ 8 support tickets created");

  // ─── Seed Incidents ────────────────────────────────────────────────────
  console.log("🚨 Seeding incidents...");

  const incidentData = [
    {
      title: "Payment Gateway Latency Spike",
      description: "Increased latency observed on payment gateway API responses affecting transaction processing times.",
      severity: IncidentSeverity.SEV2,
      status: IncidentStatus.RESOLVED,
      affectedServices: ["payment-gateway", "api"],
      detectedAt: randomDate(45),
      acknowledgedAt: randomDate(44),
      mitigatedAt: randomDate(43),
      resolvedAt: randomDate(42),
      rootCause: "Database connection pool exhaustion due to traffic spike",
      impact: "15% of transactions experienced >2s latency for 30 minutes",
    },
    {
      title: "UPI Transaction Processing Delay",
      description: "UPI transactions are taking longer than usual to process due to NPCI gateway issues.",
      severity: IncidentSeverity.SEV2,
      status: IncidentStatus.RESOLVED,
      affectedServices: ["upi-gateway", "payments"],
      detectedAt: randomDate(30),
      acknowledgedAt: randomDate(29),
      mitigatedAt: randomDate(28),
      resolvedAt: randomDate(27),
      rootCause: "External dependency - NPCI gateway slowdown",
      impact: "UPI transactions delayed by 5-10 minutes for 2 hours",
    },
    {
      title: "Database Replication Lag",
      description: "Read replica lag exceeded threshold causing stale data in dashboard.",
      severity: IncidentSeverity.SEV3,
      status: IncidentStatus.RESOLVED,
      affectedServices: ["database", "dashboard"],
      detectedAt: randomDate(20),
      acknowledgedAt: randomDate(19),
      mitigatedAt: randomDate(19),
      resolvedAt: randomDate(18),
      rootCause: "High write load on primary due to batch settlement processing",
      impact: "Dashboard showed stale data for approximately 45 minutes",
    },
    {
      title: "Webhook Delivery Backlog",
      description: "Webhook delivery queue has accumulated a backlog of undelivered events.",
      severity: IncidentSeverity.SEV3,
      status: IncidentStatus.MITIGATING,
      affectedServices: ["webhooks", "notifications"],
      detectedAt: randomDate(5),
      acknowledgedAt: randomDate(5),
      mitigatedAt: randomDate(4),
      rootCause: "Downstream endpoint failures causing excessive retries",
      impact: "Approximately 2,000 webhook deliveries delayed",
    },
    {
      title: "Redis Cache Outage",
      description: "Redis cluster experienced connectivity issues affecting rate limiting and session data.",
      severity: IncidentSeverity.SEV1,
      status: IncidentStatus.INVESTIGATING,
      affectedServices: ["redis", "api", "rate-limiter"],
      detectedAt: randomDate(1),
    },
  ];

  const incidentUpdateData: Array<{
    id: string;
    incidentId: string;
    message: string;
    status: string;
    createdBy: string;
    createdAt: Date;
  }> = [];

  for (const inc of incidentData) {
    const incident = await prisma.incident.create({
      data: {
        title: inc.title,
        description: inc.description,
        severity: inc.severity,
        status: inc.status,
        affectedServices: inc.affectedServices,
        detectedAt: inc.detectedAt,
        acknowledgedAt: inc.acknowledgedAt,
        mitigatedAt: inc.mitigatedAt,
        resolvedAt: inc.resolvedAt,
        rootCause: inc.rootCause,
        impact: inc.impact,
        createdAt: inc.detectedAt,
      },
    });

    // Add 1-3 updates per incident
    const updates = [
      { message: "Incident detected. Initial investigation underway.", status: "DETECTED" },
      { message: "Engineering team has been alerted and is investigating.", status: "INVESTIGATING" },
      { message: "Root cause identified. Mitigation in progress.", status: "MITIGATING" },
    ];

    const updatesToAdd = randomInt(1, 3);
    for (let u = 0; u < updatesToAdd; u++) {
      const updateDate = new Date(inc.detectedAt.getTime() + u * 3600000 * 2);
      incidentUpdateData.push({
        id: uuidv4(),
        incidentId: incident.id,
        message: updates[u].message,
        status: updates[u].status,
        createdBy: "admin@nexpay.dev",
        createdAt: updateDate,
      });
    }
  }

  await prisma.incidentUpdate.createMany({ data: incidentUpdateData });
  console.log("   ✅ 5 incidents created");

  // ─── Seed Payouts ─────────────────────────────────────────────────────
  console.log("💰 Seeding payouts...");

  const payoutStatuses: PayoutStatus[] = [
    PayoutStatus.PENDING,
    PayoutStatus.PROCESSING,
    PayoutStatus.COMPLETED,
    PayoutStatus.COMPLETED,
    PayoutStatus.COMPLETED,
    PayoutStatus.FAILED,
    PayoutStatus.CANCELLED,
  ];

  for (let i = 0; i < 7; i++) {
    const merchant = createdMerchants[randomInt(0, createdMerchants.length - 1)];
    const status = randomElement(payoutStatuses);
    const payoutAmount = randomAmount(5000, 200000);
    const payoutDate = randomDate(30);

    // Find settled payments for this merchant to link
    const settledPayments = await prisma.payment.findMany({
      where: { merchantId: merchant.id, status: PaymentStatus.SETTLED },
      take: randomInt(2, 5),
      orderBy: { createdAt: "desc" },
    });

    if (settledPayments.length === 0) continue;

    const bankRef = status === PayoutStatus.COMPLETED ? `BANKREF${randomInt(100000000, 999999999)}` : null;

    const payout = await prisma.payout.create({
      data: {
        merchantId: merchant.id,
        amount: payoutAmount,
        currency: "INR",
        status,
        scheduledFor: status === PayoutStatus.PENDING ? new Date(Date.now() + 86400000) : payoutDate,
        bankRef,
        completedAt: status === PayoutStatus.COMPLETED ? new Date(payoutDate.getTime() + 86400000) : null,
        createdAt: payoutDate,
      },
    });

    // Create payout items
    let allocatedAmount = 0;
    for (const pmt of settledPayments) {
      if (allocatedAmount >= payoutAmount) break;
      const itemAmount = Math.min(Number(pmt.amount), payoutAmount - allocatedAmount);
      const fee = Math.round(itemAmount * 0.025 * 100) / 100;
      const reserve = Math.round(itemAmount * 0.1 * 100) / 100;
      const net = Math.round((itemAmount - fee - reserve) * 100) / 100;

      await prisma.payoutItem.create({
        data: {
          payoutId: payout.id,
          paymentId: pmt.id,
          amount: itemAmount,
          fee,
          reserve,
          netAmount: net,
        },
      });
      allocatedAmount += itemAmount;
    }
  }
  console.log("   ✅ 7 payouts created");

  // ─── Seed Invoices ────────────────────────────────────────────────────
  console.log("📄 Seeding invoices...");

  const invoiceStatuses = ["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED"];

  for (let i = 0; i < 7; i++) {
    const merchant = createdMerchants[randomInt(0, createdMerchants.length - 1)];
    const customer = customerRecords.find((c) => c.merchantId === merchant.id);
    if (!customer) continue;

    const customerInfo = await prisma.customer.findUnique({ where: { id: customer.id } });
    const status = randomElement(invoiceStatuses);
    const subtotal = randomAmount(1000, 50000);
    const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const total = subtotal + taxAmount;
    const invoiceDate = randomDate(60);

    await prisma.invoice.create({
      data: {
        merchantId: merchant.id,
        invoiceNumber: `INV-${merchant.name.substring(0, 3).toUpperCase()}-${String(1000 + i).padStart(4, "0")}`,
        customerName: customerInfo?.name || "Unknown Customer",
        customerEmail: customerInfo?.email,
        customerGstin: `27AABCU${String(5000 + i)}3${randomInt(1, 9)}Z${randomInt(1, 5)}`,
        status,
        subtotal,
        taxAmount,
        total,
        currency: "INR",
        dueDate: new Date(invoiceDate.getTime() + 86400000 * 15),
        issuedDate: invoiceDate,
        paidAt: status === "PAID" ? new Date(invoiceDate.getTime() + 86400000 * randomInt(1, 10)) : null,
        notes: "Thank you for your business!",
        lineItems: [
          { description: "Product A", quantity: randomInt(1, 5), unitPrice: subtotal / randomInt(1, 5), amount: subtotal * 0.6 },
          { description: "Service B", quantity: 1, unitPrice: subtotal * 0.4, amount: subtotal * 0.4 },
        ],
        createdAt: invoiceDate,
      },
    });
  }
  console.log("   ✅ 7 invoices created");

  // ─── Seed Settlement Batches ───────────────────────────────────────────
  console.log("📊 Seeding settlement batches...");

  for (let i = 0; i < 4; i++) {
    const merchant = createdMerchants[randomInt(0, createdMerchants.length - 1)];
    const batchDate = randomDate(30);
    const settledPayments = await prisma.payment.findMany({
      where: { merchantId: merchant.id, status: { in: [PaymentStatus.SETTLED, PaymentStatus.CAPTURED] } },
      take: randomInt(5, 15),
      orderBy: { createdAt: "desc" },
    });

    if (settledPayments.length === 0) continue;

    const totalAmount = settledPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const ref = `STL-${merchant.name.substring(0, 3).toUpperCase()}-${batchDate.getTime().toString(36).toUpperCase()}`;

    const batch = await prisma.settlementBatch.create({
      data: {
        reference: ref,
        description: `Settlement batch for ${merchant.name} - ${batchDate.toLocaleDateString()}`,
        totalAmount: Math.round(totalAmount * 100) / 100,
        currency: "INR",
        itemCount: settledPayments.length,
        matchedCount: randomInt(0, settledPayments.length),
        status: randomElement(["PENDING", "RECONCILED", "PARTIAL", "DISPUTED"]),
        importedAt: batchDate,
        reconciledAt: Math.random() < 0.5 ? new Date(batchDate.getTime() + 86400000 * 2) : null,
        createdAt: batchDate,
      },
    });

    for (const pmt of settledPayments) {
      await prisma.settlementBatchItem.create({
        data: {
          batchId: batch.id,
          paymentId: pmt.id,
          amount: Number(pmt.amount),
          currency: "INR",
          reference: `PMT-${pmt.id.substring(0, 8)}`,
          status: randomElement(["PENDING", "MATCHED", "UNMATCHED"]),
          createdAt: batchDate,
        },
      });
    }
  }
  console.log("   ✅ 4 settlement batches created");

  // ─── Seed Sub-Merchants ────────────────────────────────────────────────
  console.log("🏢 Seeding sub-merchants...");

  const parentMerchant = createdMerchants.find((m) => merchantPlanMap.get(m.id) === PlanTier.BUSINESS) || createdMerchants[2];
  const subMerchantNames = ["GadgetZone", "ElectroWorld", "MobileHub"];

  for (const name of subMerchantNames) {
    const sm = await prisma.subMerchant.create({
      data: {
        parentId: parentMerchant.id,
        name,
        email: `${name.toLowerCase()}@marketplace.in`,
        commissionPct: randomInt(5, 15),
        status: "ACTIVE",
        kycStatus: KYCStatus.VERIFIED,
        riskCategory: RiskCategory.LOW,
        riskScore: randomInt(5, 30),
        apiKeyPrefix: `nex_sub_${name.substring(0, 3).toLowerCase()}_`,
        gmv: randomAmount(50000, 500000),
      },
    });

    // Create split transactions for some of the parent's payments
    const parentPayments = await prisma.payment.findMany({
      where: { merchantId: parentMerchant.id, status: PaymentStatus.SETTLED },
      take: randomInt(2, 4),
      orderBy: { createdAt: "desc" },
    });

    for (const pmt of parentPayments) {
      const splitAmount = Math.round(Number(pmt.amount) * (Number(sm.commissionPct) / 100) * 100) / 100;
      await prisma.splitTransaction.create({
        data: {
          paymentId: pmt.id,
          subMerchantId: sm.id,
          splitType: SplitType.PERCENTAGE,
          splitValue: sm.commissionPct,
          amount: splitAmount,
          status: "RELEASED",
          releasedAt: new Date(),
          createdAt: pmt.createdAt,
        },
      });
    }
  }
  console.log("   ✅ 3 sub-merchants created");

  // ─── Seed Compliance Notes ─────────────────────────────────────────────
  console.log("📋 Seeding compliance notes...");

  for (let i = 0; i < 4; i++) {
    const merchant = createdMerchants[randomInt(0, createdMerchants.length - 1)];
    const categories = ["GENERAL", "KYC", "AML", "REGULATORY"];
    const notes = [
      "KYC documents verified manually - all required documents are in order.",
      "Merchant reported suspicious transaction - flagged for AML review.",
      "Quarterly compliance review completed. No issues found.",
      "Updated merchant risk profile from MEDIUM to LOW based on 6-month transaction history.",
      "Annual audit scheduled for next month. All documentation requested.",
      "Merchant's bank account verification pending - awaiting bank statement.",
      "Sanctions screening completed - no matches found.",
    ];

    await prisma.complianceNote.create({
      data: {
        merchantId: merchant.id,
        authorId: admin.id,
        content: randomElement(notes),
        category: randomElement(categories),
        pinned: Math.random() < 0.3,
        createdAt: randomDate(60),
      },
    });
  }
  console.log("   ✅ 4 compliance notes created");

  // ─── Seed Reconciliation Runs ──────────────────────────────────────────
  console.log("🔄 Seeding reconciliation runs...");

  for (let i = 0; i < 3; i++) {
    const runDate = randomDate(14);
    const totalSource = randomInt(50, 200);
    const matchedCount = randomInt(40, totalSource - 10);

    const run = await prisma.reconciliationRun.create({
      data: {
        runType: "DAILY",
        status: "COMPLETED",
        startedAt: runDate,
        completedAt: new Date(runDate.getTime() + 3600000),
        totalSource,
        totalTarget: totalSource,
        matchedCount,
        driftedCount: randomInt(0, 5),
        missingCount: randomInt(0, 5),
        duplicateCount: randomInt(0, 3),
        orphanCount: randomInt(0, 3),
        autoCorrected: randomInt(0, 2),
        errors: null,
        summary: {
          matchRate: `${Math.round((matchedCount / totalSource) * 100)}%`,
          totalChecked: totalSource,
          totalAmount: randomAmount(500000, 5000000),
        },
      },
    });

    // Add some matches
    const matchTypes = ["MATCHED", "MATCHED", "MATCHED", "MATCHED", "DRIFTED", "MISSING", "DUPLICATE"];
    const matchCount = randomInt(5, 10);
    for (let m = 0; m < matchCount; m++) {
      const mt = randomElement(matchTypes);
      await prisma.reconciliationMatch.create({
        data: {
          runId: run.id,
          matchType: mt,
          sourceType: "PAYMENT",
          sourceId: uuidv4(),
          targetType: "LEDGER",
          targetId: mt === "MATCHED" ? uuidv4() : null,
          expectedAmount: randomAmount(100, 5000),
          actualAmount: mt === "DRIFTED" ? randomAmount(100, 5000) : null,
          difference: mt === "DRIFTED" ? randomAmount(0.01, 1) : 0,
          currency: "INR",
          description: `Match ${m + 1} for reconciliation run ${i + 1}`,
          status: mt === "MATCHED" ? "RESOLVED" : "OPEN",
          createdAt: runDate,
        },
      });
    }
  }
  console.log("   ✅ 3 reconciliation runs created");

  // ─── Seed Admin Activity Logs ──────────────────────────────────────────
  console.log("📝 Seeding admin activity logs...");

  const adminActions = [
    { action: "MERCHANT_APPROVED", resource: "merchant" },
    { action: "KYC_VERIFIED", resource: "merchant" },
    { action: "MERCHANT_SUSPENDED", resource: "merchant" },
    { action: "DISPUTE_RESOLVED", resource: "dispute" },
    { action: "PAYOUT_RELEASED", resource: "payout" },
    { action: "SETTLEMENT_TRIGGERED", resource: "settlement" },
    { action: "FEE_SCHEDULE_UPDATED", resource: "fee_schedule" },
    { action: "REFUND_PROCESSED", resource: "refund" },
    { action: "WEBHOOK_REPLAYED", resource: "webhook" },
    { action: "API_KEY_REVOKED", resource: "api_key" },
  ];

  const activityLogData: Array<{
    id: string;
    adminId: string;
    action: string;
    resource: string;
    resourceId: string;
    details: any;
    ip: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < 25; i++) {
    const action = randomElement(adminActions);
    const targetMerchant = randomElement(createdMerchants);
    activityLogData.push({
      id: uuidv4(),
      adminId: admin.id,
      action: action.action,
      resource: action.resource,
      resourceId: uuidv4(),
      details: {
        merchantId: targetMerchant.id,
        merchantName: targetMerchant.name,
        description: `${action.action} for ${targetMerchant.name}`,
      },
      ip: `10.0.${randomInt(1, 255)}.${randomInt(1, 255)}`,
      createdAt: randomDate(14),
    });
  }

  await prisma.adminActivityLog.createMany({ data: activityLogData });
  console.log("   ✅ 25 admin activity logs created");

  // ─── Seed Security Events ─────────────────────────────────────────────
  console.log("🔒 Seeding security events...");

  const securityEventTypes = [
    { type: "LOGIN_SUCCESS", severity: "INFO" },
    { type: "LOGIN_FAILED", severity: "WARNING" },
    { type: "API_KEY_CREATED", severity: "INFO" },
    { type: "API_KEY_REVOKED", severity: "INFO" },
    { type: "PASSWORD_CHANGED", severity: "INFO" },
    { type: "MFA_ENABLED", severity: "INFO" },
    { type: "BRUTE_FORCE_ATTEMPT", severity: "CRITICAL" },
    { type: "SUSPICIOUS_IP", severity: "WARNING" },
    { type: "ACCOUNT_LOCKED", severity: "HIGH" },
    { type: "EMAIL_CHANGED", severity: "HIGH" },
  ];

  const securityEventData: Array<{
    id: string;
    merchantId: string;
    type: string;
    severity: string;
    details: any;
    ip: string;
    userAgent: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < 12; i++) {
    const merchant = randomElement(createdMerchants);
    const evt = randomElement(securityEventTypes);
    securityEventData.push({
      id: uuidv4(),
      merchantId: merchant.id,
      type: evt.type,
      severity: evt.severity,
      details: {
        browser: randomElement(["Chrome 120", "Firefox 121", "Safari 17", "Edge 120", "Mobile Safari"]),
        os: randomElement(["Windows 11", "macOS 14", "Ubuntu 22.04", "iOS 17", "Android 14"]),
        location: randomElement(INDIAN_CITIES),
      },
      ip: `103.${randomInt(10, 200)}.${randomInt(10, 200)}.${randomInt(10, 200)}`,
      userAgent: "Mozilla/5.0",
      createdAt: randomDate(60),
    });
  }

  await prisma.securityEvent.createMany({ data: securityEventData });
  console.log("   ✅ 12 security events created");

  // ─── Seed Daily Balances ──────────────────────────────────────────────
  console.log("📈 Seeding daily balances...");

  const today = new Date();
  const dailyBalanceData: Array<{
    id: string;
    merchantId: string;
    currency: string;
    date: Date;
    openingBalance: number;
    closingBalance: number;
    totalCredits: number;
    totalDebits: number;
    paymentCount: number;
    settlementCount: number;
    createdAt: Date;
  }> = [];

  for (const merchant of createdMerchants) {
    let balance = randomInt(50000, 500000);

    for (let day = 30; day >= 0; day--) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);

      const credits = Math.round(Math.random() * 50000 * 100) / 100;
      const debits = Math.round(Math.random() * 30000 * 100) / 100;
      const openingBalance = balance;
      balance = Math.round((balance + credits - debits) * 100) / 100;

      dailyBalanceData.push({
        id: uuidv4(),
        merchantId: merchant.id,
        currency: "INR",
        date,
        openingBalance,
        closingBalance: balance,
        totalCredits: credits,
        totalDebits: debits,
        paymentCount: randomInt(10, 100),
        settlementCount: randomInt(1, 5),
        createdAt: new Date(),
      });
    }
  }

  // Batch insert daily balances (batch of 50 to avoid issues)
  for (let i = 0; i < dailyBalanceData.length; i += BATCH_SIZE) {
    const batch = dailyBalanceData.slice(i, i + BATCH_SIZE);
    await prisma.dailyBalance.createMany({ data: batch });
  }
  console.log(`   ✅ ${dailyBalanceData.length} daily balance records created`);

  // ─── Update merchant approval history ─────────────────────────────────
  console.log("📜 Seeding approval history...");

  for (const merchant of createdMerchants) {
    await prisma.merchantApproval.create({
      data: {
        merchantId: merchant.id,
        action: "REGISTERED",
        fromStatus: MerchantStatus.DRAFT,
        toStatus: MerchantStatus.SUBMITTED,
        reviewerId: admin.id,
        createdAt: new Date(Date.now() - 90 * 86400000),
      },
    });

    await prisma.merchantApproval.create({
      data: {
        merchantId: merchant.id,
        action: "KYC_VERIFIED",
        fromStatus: MerchantStatus.SUBMITTED,
        toStatus: MerchantStatus.APPROVED,
        reviewerId: admin.id,
        notes: "All KYC documents verified successfully",
        createdAt: new Date(Date.now() - 85 * 86400000),
      },
    });

    if (merchant.email === "developer@nexpay.dev") {
      await prisma.merchantApproval.create({
        data: {
          merchantId: merchant.id,
          action: "ACTIVATED",
          fromStatus: MerchantStatus.APPROVED,
          toStatus: MerchantStatus.ACTIVE,
          reviewerId: admin.id,
          notes: "Sandbox merchant activated for API testing",
          createdAt: new Date(Date.now() - 80 * 86400000),
        },
      });
    }
  }
  console.log("   ✅ Approval history created");

  // ─── Final summary ────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${"═".repeat(50)}`);
  console.log("  ✅ NEXPAY DEMO SEED COMPLETE");
  console.log(`  ⏱️  ${elapsed}s`);
  console.log(`${"═".repeat(50)}`);

  console.log("\n  📊 Summary:");
  console.log(`  • ${createdMerchants.length} merchants`);
  console.log(`  • ${totalCustomers} customers`);
  console.log(`  • ${paymentCount} payments`);
  console.log(`  • ${paymentEventData.length} payment events`);
  console.log(`  • ${ledgerEntryData.length} ledger entries`);
  console.log(`  • ${refundData.length} refunds`);
  console.log(`  • ${disputeData.length} disputes`);
  console.log(`  • ${fraudEventData.length} fraud events`);
  console.log(`  • ${webhookDeliveryData.length} webhook deliveries`);
  console.log(`  • ${dailyBalanceData.length} daily balance records`);

  console.log(`\n${"═".repeat(50)}`);
  console.log("╔══════════════════════════════════════╗");
  console.log("║         NexPay Demo Credentials      ║");
  console.log("╠══════════════════════════════════════╣");
  console.log("║ Admin:     admin@nexpay.dev          ║");
  console.log("║ Merchant:  merchant@nexpay.dev       ║");
  console.log("║ TechStore: techstore@nexpay.dev      ║");
  console.log("║ FreshFoods:freshfoods@nexpay.dev     ║");
  console.log("║ Developer: developer@nexpay.dev      ║");
  console.log("║                                      ║");
  console.log("║ Password:  demo1234 (all accounts)   ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`${"═".repeat(50)}\n`);
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
