import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";
import { prisma } from "../config/db";
import crypto from "crypto";

const IDEMPOTENCY_TTL = 86400;
const LOCK_TIMEOUT = 5000;

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PATCH"].includes(req.method)) return next();

  const key = req.headers["idempotency-key"] as string;
  if (!key) return next();

  const merchantId = req.merchant?.id;
  if (!merchantId) return next();

  const cacheKey = `idemp:${merchantId}:${key}`;
  const lockKey = `idemp:lock:${merchantId}:${key}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  const existingKey = await prisma.idempotencyKey.findUnique({
    where: { merchantId_key: { merchantId, key } },
  });

  if (existingKey && existingKey.expiresAt > new Date()) {
    await redis.set(cacheKey, JSON.stringify(existingKey.response), "EX", IDEMPOTENCY_TTL);
    return res.status(200).json(existingKey.response);
  }

  const lockAcquired = await redis.set(lockKey, "1", "PX", LOCK_TIMEOUT, "NX");
  if (!lockAcquired) {
    return res.status(409).json({
      error: "conflict",
      message: "Request with this idempotency key is already being processed",
    });
  }

  const doubleCheck = await redis.get(cacheKey);
  if (doubleCheck) {
    await redis.del(lockKey);
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

      redis
        .set(cacheKey, JSON.stringify(body), "EX", IDEMPOTENCY_TTL)
        .catch(() => {});
    }

    redis.del(lockKey).catch(() => {});

    return originalJson(body);
  };

  next();
}
