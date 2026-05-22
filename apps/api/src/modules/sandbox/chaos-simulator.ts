import { randomUUID } from "crypto";
import { redis } from "../../config/redis";

export interface ChaosContext {
  paymentId: string;
  amount: number;
  currency: string;
  merchantId: string;
  paymentMethod: string;
  timestamp: Date;
}

export type ChaosEffect =
  | { type: "provider_timeout"; delayMs: number }
  | { type: "provider_500"; errorMessage: string }
  | { type: "duplicate_webhook"; count: number }
  | { type: "delayed_webhook"; delayMs: number }
  | { type: "payout_stuck"; durationHours: number }
  | { type: "bank_mismatch"; expectedAmount: number; actualAmount: number }
  | { type: "ledger_imbalance"; difference: number }
  | { type: "redis_unavailable" }
  | { type: "worker_crash" }
  | { type: "none" };

export interface ChaosRule {
  name: string;
  description: string;
  probability: number;
  enabled: boolean;
  effect: (context: ChaosContext) => ChaosEffect;
}

export interface ChaosEvent {
  id: string;
  rule: string;
  effect: ChaosEffect;
  context: ChaosContext;
  timestamp: Date;
}

const RULES_KEY_PREFIX = "sandbox:chaos:rules";
const HISTORY_KEY_PREFIX = "sandbox:chaos:history";
const HISTORY_MAX = 200;

const defaultRules: (ChaosRule & { enabled: boolean })[] = [
  {
    name: "provider_timeout",
    description: "Simulate provider gateway timeout (15s delay)",
    probability: 0.05,
    enabled: true,
    effect: () => ({ type: "provider_timeout" as const, delayMs: 15000 }),
  },
  {
    name: "provider_500",
    description: "Simulate provider returning 500 Internal Server Error",
    probability: 0.05,
    enabled: true,
    effect: () => ({ type: "provider_500" as const, errorMessage: "Internal Server Error" }),
  },
  {
    name: "duplicate_webhook",
    description: "Send the webhook notification twice",
    probability: 0.1,
    enabled: true,
    effect: () => ({ type: "duplicate_webhook" as const, count: 2 }),
  },
  {
    name: "delayed_webhook",
    description: "Delay webhook delivery by 5-30 seconds",
    probability: 0.1,
    enabled: true,
    effect: () => {
      const delayMs = 5000 + Math.floor(Math.random() * 25000);
      return { type: "delayed_webhook" as const, delayMs };
    },
  },
  {
    name: "payout_stuck",
    description: "Payout gets stuck in processing for hours",
    probability: 0.03,
    enabled: true,
    effect: () => ({
      type: "payout_stuck" as const,
      durationHours: 2 + Math.floor(Math.random() * 22),
    }),
  },
  {
    name: "bank_mismatch",
    description: "Settlement amount doesn't match expected amount",
    probability: 0.05,
    enabled: true,
    effect: (ctx: ChaosContext) => {
      const diff = Math.round(ctx.amount * (0.01 + Math.random() * 0.05));
      return {
        type: "bank_mismatch" as const,
        expectedAmount: ctx.amount,
        actualAmount: ctx.amount - diff,
      };
    },
  },
  {
    name: "ledger_imbalance",
    description: "Ledger drifts by a small amount causing reconciliation failure",
    probability: 0.02,
    enabled: true,
    effect: (ctx: ChaosContext) => {
      const diff = Math.round(ctx.amount * (0.001 + Math.random() * 0.009));
      return {
        type: "ledger_imbalance" as const,
        difference: diff,
      };
    },
  },
  {
    name: "redis_unavailable",
    description: "Simulate Redis being temporarily unavailable",
    probability: 0.01,
    enabled: true,
    effect: () => ({ type: "redis_unavailable" as const }),
  },
  {
    name: "worker_crash",
    description: "Simulate async worker failure during processing",
    probability: 0.01,
    enabled: true,
    effect: () => ({ type: "worker_crash" as const }),
  },
];

function rulesKey(merchantId: string): string {
  return `${RULES_KEY_PREFIX}:${merchantId}`;
}

function historyKey(merchantId: string): string {
  return `${HISTORY_KEY_PREFIX}:${merchantId}`;
}

export async function getRules(merchantId: string): Promise<(ChaosRule & { enabled: boolean })[]> {
  const raw = await redis.get(rulesKey(merchantId));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return defaultRules.map((r) => ({ ...r }));
    }
  }
  return defaultRules.map((r) => ({ ...r }));
}

export async function updateRules(
  merchantId: string,
  updates: { name: string; enabled?: boolean; probability?: number }[],
): Promise<(ChaosRule & { enabled: boolean })[]> {
  const current = await getRules(merchantId);

  for (const update of updates) {
    const rule = current.find((r) => r.name === update.name);
    if (rule) {
      if (update.enabled !== undefined) rule.enabled = update.enabled;
      if (update.probability !== undefined) rule.probability = update.probability;
    }
  }

  await redis.set(rulesKey(merchantId), JSON.stringify(current));
  return current;
}

export async function evaluate(
  merchantId: string,
  context: ChaosContext,
): Promise<ChaosEffect> {
  const rules = await getRules(merchantId);

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const roll = Math.random();
    if (roll < rule.probability) {
      const effect = rule.effect(context);
      await addHistory(merchantId, { rule: rule.name, effect, context });
      return effect;
    }
  }

  return { type: "none" };
}

export async function addHistory(
  merchantId: string,
  entry: Omit<ChaosEvent, "id" | "timestamp">,
): Promise<void> {
  const event: ChaosEvent = {
    id: randomUUID().slice(0, 12),
    ...entry,
    timestamp: new Date(),
  };

  const key = historyKey(merchantId);
  await redis.lpush(key, JSON.stringify(event));
  await redis.ltrim(key, 0, HISTORY_MAX - 1);
}

export async function getHistory(
  merchantId: string,
  limit: number = 50,
): Promise<ChaosEvent[]> {
  const raw = await redis.lrange(historyKey(merchantId), 0, limit - 1);
  return raw.map((item) => JSON.parse(item));
}

export async function clearHistory(merchantId: string): Promise<void> {
  await redis.del(historyKey(merchantId));
}

export async function resetRules(merchantId: string): Promise<void> {
  await redis.del(rulesKey(merchantId));
}
