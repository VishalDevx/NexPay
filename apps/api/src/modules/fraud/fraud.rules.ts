import { redis } from "../../config/redis";
import { prisma } from "../../config/db";
import Decimal from "decimal.js";
import crypto from "crypto";

interface FraudRuleDefinition {
  id: string;
  name: string;
  enabled: boolean;
  scoreWeight: number;
  reason: string;
  evaluate: (input: any) => Promise<boolean>;
}

const VELOCITY_WINDOW_MS = 60000;
const VELOCITY_LIMIT = 5;
const AMOUNT_DEVIATION_MULTIPLIER = 3;

export const fraudRules: FraudRuleDefinition[] = [
  {
    id: "velocity_check",
    name: "Transaction Velocity Check",
    enabled: true,
    scoreWeight: 30,
    reason: "High transaction velocity",
    async evaluate(input) {
      const key = `fraud:velocity:${input.merchantId}:${Math.floor(Date.now() / VELOCITY_WINDOW_MS)}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, Math.ceil(VELOCITY_WINDOW_MS / 1000));
      return count > VELOCITY_LIMIT;
    },
  },
  {
    id: "geo_anomaly",
    name: "Geographic Anomaly",
    enabled: true,
    scoreWeight: 25,
    reason: "Transaction from unusual location",
    async evaluate(input) {
      const lastPayment = await prisma.payment.findFirst({
        where: { merchantId: input.merchantId, status: "CAPTURED" },
        orderBy: { createdAt: "desc" },
        select: { paymentMethod: true },
      });

      if (!lastPayment || !lastPayment.paymentMethod) return false;

      const currentCountry = input.paymentMethod?.billing_address?.country;
      const lastCountry = (lastPayment.paymentMethod as any)?.billing_address?.country;

      return currentCountry && lastCountry && currentCountry !== lastCountry;
    },
  },
  {
    id: "amount_deviation",
    name: "Amount Deviation from Average",
    enabled: true,
    scoreWeight: 20,
    reason: "Transaction amount significantly above user average",
    async evaluate(input) {
      const payments = await prisma.payment.findMany({
        where: { merchantId: input.merchantId, status: "CAPTURED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { amount: true },
      });

      if (payments.length < 3) return false;

      const amounts = payments.map((p) => new Decimal(p.amount.toString()));
      const avg = amounts.reduce((a, b) => a.plus(b), new Decimal(0)).div(amounts.length);
      const currentAmount = new Decimal(input.amount);

      return currentAmount.gt(avg.times(AMOUNT_DEVIATION_MULTIPLIER));
    },
  },
  {
    id: "device_fingerprint_mismatch",
    name: "Device Fingerprint Mismatch",
    enabled: true,
    scoreWeight: 25,
    reason: "Device fingerprint does not match known devices",
    async evaluate(input) {
      const deviceFingerprint = input.metadata?.device_fingerprint;
      if (!deviceFingerprint) return false;

      const key = `fraud:devices:${input.merchantId}`;
      const knownDevices = await redis.smembers(key);

      if (knownDevices.length === 0) {
        await redis.sadd(key, deviceFingerprint);
        return false;
      }

      return !knownDevices.includes(deviceFingerprint);
    },
  },
  {
    id: "new_account",
    name: "New Account Transaction",
    enabled: true,
    scoreWeight: 15,
    reason: "Transaction on recently created account",
    async evaluate(input) {
      const merchant = await prisma.merchant.findUnique({
        where: { id: input.merchantId },
        select: { createdAt: true },
      });

      if (!merchant) return false;
      const accountAge = Date.now() - merchant.createdAt.getTime();
      const ONE_HOUR = 3600000;
      return accountAge < ONE_HOUR;
    },
  },
  {
    id: "high_risk_currency",
    name: "High Risk Currency",
    enabled: true,
    scoreWeight: 10,
    reason: "Transaction in high-risk currency",
    async evaluate(input) {
      const highRiskCurrencies = ["BTC", "ETH", "USDT"];
      return highRiskCurrencies.includes(input.currency?.toUpperCase());
    },
  },
];

export async function getEnabledRules() {
  return fraudRules.filter((r) => r.enabled);
}
