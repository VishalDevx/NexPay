import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.merchant.upsert({
    where: { email: "admin@nexpay.com" },
    update: {},
    create: {
      name: "NexPay Admin",
      email: "admin@nexpay.com",
      passwordHash,
      status: "ACTIVE",
      kycStatus: "VERIFIED",
      baseCurrency: "USD",
    },
  });

  const testMerchant = await prisma.merchant.upsert({
    where: { email: "merchant@test.com" },
    update: {},
    create: {
      name: "Test Merchant",
      email: "merchant@test.com",
      passwordHash,
      status: "ACTIVE",
      kycStatus: "VERIFIED",
      baseCurrency: "INR",
    },
  });

  console.log("Seeded merchants:", admin.id, testMerchant.id);

  const rules = [
    { name: "Velocity Check", condition: { type: "velocity", limit: 5, window: 60 }, action: "REVIEW", scoreWeight: 30 },
    { name: "Geo Anomaly", condition: { type: "geo_anomaly" }, action: "REVIEW", scoreWeight: 25 },
    { name: "Amount Deviation", condition: { type: "amount_deviation", multiplier: 3 }, action: "REVIEW", scoreWeight: 20 },
    { name: "Device Fingerprint", condition: { type: "device_mismatch" }, action: "REVIEW", scoreWeight: 25 },
    { name: "New Account", condition: { type: "new_account", maxAgeHours: 1 }, action: "REVIEW", scoreWeight: 15 },
    { name: "High Risk Currency", condition: { type: "high_risk_currency", currencies: ["BTC", "ETH", "USDT"] }, action: "DECLINE", scoreWeight: 10 },
  ];

  for (const rule of rules) {
    await prisma.fraudRule.upsert({
      where: { name: rule.name },
      update: {},
      create: { ...rule, enabled: true },
    });
  }

  console.log("Seeded fraud rules");

  const plans = [
    { name: "Starter", tier: "STARTER" as const, description: "Best for early-stage startups", monthlyPrice: 0, transactionFee: 2.9, fixedFee: 0.30, internationalMarkup: 1.5, maxMonthlyVolume: 10000, maxApiCalls: 10000, teamMembers: 2, features: ["Basic dashboard", "Email support", "Standard webhooks", "API access"] },
    { name: "Growth", tier: "GROWTH" as const, description: "For scaling businesses", monthlyPrice: 99, transactionFee: 2.5, fixedFee: 0.25, internationalMarkup: 1.0, maxMonthlyVolume: 100000, maxApiCalls: 100000, teamMembers: 10, features: ["Advanced analytics", "Priority support", "Custom webhooks", "Team management", "Fraud detection"] },
    { name: "Business", tier: "BUSINESS" as const, description: "For established companies", monthlyPrice: 499, transactionFee: 2.0, fixedFee: 0.20, internationalMarkup: 0.75, maxMonthlyVolume: 1000000, maxApiCalls: 1000000, teamMembers: 25, features: ["All Growth features", "Dedicated support", "SLA guarantee", "Multi-currency", "Marketplace ready", "Custom reporting"] },
    { name: "Enterprise", tier: "ENTERPRISE" as const, description: "For high-volume platforms", monthlyPrice: 0, transactionFee: 1.5, fixedFee: 0.10, internationalMarkup: 0.5, maxMonthlyVolume: null, maxApiCalls: null, teamMembers: null, features: ["All Business features", "24/7 phone support", "Custom contract", "On-premise option", "SSO/SAML", "Dedicated infra", "Account manager"] },
  ];

  for (const plan of plans) {
    await prisma.merchantPlan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }

  console.log("Seeded merchant plans");

  const sub = await prisma.subscription.upsert({
    where: { merchantId: testMerchant.id },
    update: {},
    create: { merchantId: testMerchant.id, planId: (await prisma.merchantPlan.findFirst({ where: { tier: "GROWTH" } }))!.id, currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
  });

  console.log("Seeded subscription");

  await prisma.supportTicket.create({
    data: {
      merchantId: testMerchant.id,
      subject: "Settlement delay on transaction TXN-001",
      category: "SETTLEMENT_DELAYED",
      priority: "HIGH",
      status: "OPEN",
      messages: { create: { content: "Hi, my settlement from last week hasn't arrived yet. Can you check?", authorType: "MERCHANT", authorId: testMerchant.id } },
    },
  });

  await prisma.supportTicket.create({
    data: {
      merchantId: testMerchant.id,
      subject: "Webhook not firing for successful payments",
      category: "WEBHOOK_ISSUE",
      priority: "URGENT",
      status: "PENDING_INTERNAL",
      messages: { create: { content: "Webhooks stopped working after our last API key rotation.", authorType: "MERCHANT", authorId: testMerchant.id } },
    },
  });

  console.log("Seeded support tickets");

  await prisma.reserveConfig.create({
    data: { merchantId: testMerchant.id, reservePercentage: 10, releaseDelayDays: 90 },
  });

  console.log("Seeded reserve config");

  await prisma.securityEvent.create({
    data: { merchantId: testMerchant.id, type: "LOGIN_SUCCESS", severity: "INFO", details: { ip: "192.168.1.1", browser: "Chrome 120" } },
  });

  await prisma.securityEvent.create({
    data: { merchantId: testMerchant.id, type: "API_KEY_CREATED", severity: "INFO", details: { keyPrefix: "nex_live_" } },
  });

  console.log("Seeded security events");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
