import Redis from "ioredis";
import { env } from "./env";

export const isRedisConfigured = (): boolean => {
  return !!env.REDIS_URL && !env.REDIS_URL.startsWith("redis://localhost");
};

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  connectTimeout: 2000,
  enableReadyCheck: false,
  retryStrategy: (times) => (times > 3 ? null : Math.min(times * 50, 500)),
});

redis.on("error", (err) => {
  // Noisy on serverless when Redis is absent; keep it quiet but visible once.
  console.error("Redis error:", err.message);
});
