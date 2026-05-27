import { env } from "../../config/env";
import { redis } from "../../config/redis";

interface FXRate {
  base: string;
  rates: Record<string, number>;
  date: string;
}

const CACHE_TTL = 3600;

async function fetchRates(base: string = "USD"): Promise<FXRate> {
  const cacheKey = `fx:rates:${base}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as FXRate;

  const response = await fetch(`${env.FX_API_URL}?base=${base}`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) throw new Error(`FX API error: ${response.status}`);

  const data = await response.json() as FXRate;
  await redis.set(cacheKey, JSON.stringify(data), "EX", CACHE_TTL);
  return data;
}

export async function convertAmount(amount: string, from: string, to: string): Promise<string> {
  if (from === to) return amount;

  const rates = await fetchRates(from);
  const rate = rates.rates[to.toUpperCase()];
  if (!rate) throw new Error(`No rate for ${from} -> ${to}`);

  const result = parseFloat(amount) * rate;
  return result.toFixed(4);
}

export async function getFXRate(from: string, to: string): Promise<number> {
  const rates = await fetchRates(from);
  return rates.rates[to.toUpperCase()] || 0;
}
