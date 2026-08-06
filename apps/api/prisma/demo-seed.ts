import { PrismaClient, MerchantStatus, KYCStatus, RiskCategory, PaymentLinkStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "demo1234";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const merchant = await prisma.merchant.upsert({
    where: { email: "merchant@nexpay.dev" },
    update: {
      name: "Acme Corp",
      status: MerchantStatus.APPROVED,
      kycStatus: KYCStatus.VERIFIED,
      businessType: "TECHNOLOGY",
      mccCode: "5734",
      expectedMonthlyVolume: 5000000,
      averageTicketSize: 2500,
      websiteUrl: "https://acmecorp.in",
      riskCategory: RiskCategory.LOW,
      emailVerified: true,
      country: "IN",
    },
    create: {
      name: "Acme Corp",
      email: "merchant@nexpay.dev",
      passwordHash,
      status: MerchantStatus.APPROVED,
      kycStatus: KYCStatus.VERIFIED,
      businessType: "TECHNOLOGY",
      mccCode: "5734",
      expectedMonthlyVolume: 5000000,
      averageTicketSize: 2500,
      websiteUrl: "https://acmecorp.in",
      riskCategory: RiskCategory.LOW,
      emailVerified: true,
      country: "IN",
    },
  });

  const demoLinks = [
    { slug: "demo-acme-pro-plan", amount: "2499.00", currency: "INR", description: "Acme Pro Plan (annual)" },
    { slug: "demo-acme-consulting", amount: "12000.00", currency: "INR", description: "Consulting retainer" },
    { slug: "demo-acme-donation", amount: "500.00", currency: "INR", description: "Community support donation" },
  ];

  for (const link of demoLinks) {
    await prisma.paymentLink.upsert({
      where: { slug: link.slug },
      update: {
        merchantId: merchant.id,
        amount: link.amount,
        currency: link.currency,
        description: link.description,
        status: PaymentLinkStatus.ACTIVE,
      },
      create: {
        merchantId: merchant.id,
        slug: link.slug,
        amount: link.amount,
        currency: link.currency,
        description: link.description,
        status: PaymentLinkStatus.ACTIVE,
      },
    });
  }

  const customer = await prisma.customer.upsert({
    where: { merchantId_email: { merchantId: merchant.id, email: "priya@example.com" } },
    update: { name: "Priya Sharma" },
    create: { merchantId: merchant.id, email: "priya@example.com", name: "Priya Sharma" },
  });

  console.log(`Seeded demo merchant "${merchant.name}" (${merchant.email})`);
  console.log(`Seeded ${demoLinks.length} payment links and customer ${customer.name}`);
}

main()
  .catch((err) => {
    console.error("Demo seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
