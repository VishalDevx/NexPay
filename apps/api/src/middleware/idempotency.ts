import { Request, Response, NextFunction } from "express";
import { redis, isRedisConfigured } from "../config/redis";
import { prisma } from "../config/db";
import crypto from "crypto";

const IDEMPOTENCY_TTL = 86400;
const LOCK_TIMEOUT = 5000;

async function redisGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: string, ...args: any[]): Promise<unknown> {
  try {
    return await redis.set(key, value, ...args);
  } catch {
    return null;
  }
}

async function redisDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // Redis unavailable — ignore
  }
}

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PATCH"].includes(req.method)) return next();

  const key = req.headers["idempotency-key"] as string;
  if (!key) return next();

  const merchantId = req.merchant?.id;
  if (!merchantId) return next();

  const cacheKey = `idemp:${merchantId}:${key}`;
  const lockKey = `idemp:lock:${merchantId}:${key}`;

  const cached = await redisGet(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  const existingKey = await prisma.idempotencyKey.findUnique({
    where: { merchantId_key: { merchantId, key } },
  });

  if (existingKey && existingKey.expiresAt > new Date()) {
    await redisSet(cacheKey, JSON.stringify(existingKey.response), "EX", IDEMPOTENCY_TTL);
    return res.status(200).json(existingKey.response);
  }

  const lockAcquired = await redisSet(lockKey, "1", "PX", LOCK_TIMEOUT, "NX");
  // Lock not acquired: a concurrent request holds it — but only when Redis is
  // actually reachable. On serverless without Redis, fail open and proceed.
  if (lockAcquired !== "OK" && isRedisConfigured()) {
    return res.status(409).json({
      error: "conflict",
      message: "Request with this idempotency key is already being processed",
    });
  }

  const doubleCheck = await redisGet(cacheKey);
  if (doubleCheck) {
    await redisDel(lockKey);
    return res.status(200).json(JSON.parse(doubleCheck));
  }

  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ body: req.body, url: req.originalUrl }))
    .digest("hex");

  req.idempotencyKey = key;
  req.idempotencyKeyHash = requestHash;

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.idempotencyKey) {
      const data = {
        merchantId,
        key: req.idempotencyKey!,
        requestHash: req.idempotencyKeyHash!,
        response: body,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL * 1000),
      };

      prisma.idempotencyKey.create({ data }).catch((err) => {
        if (err.code !== "P2002") console.error("Idempotency save failed:", err);
      });

      redisSet(cacheKey, JSON.stringify(body), "EX", IDEMPOTENCY_TTL).catch(() => {});
    }

    redisDel(lockKey);

    return originalJson(body);
  };

  next();
}
