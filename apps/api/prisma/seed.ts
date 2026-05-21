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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
