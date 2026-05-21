import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";
import { prisma } from "../config/db";
import crypto from "crypto";

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PATCH"].includes(req.method)) return next();

  const key = req.headers["idempotency-key"] as string;
  if (!key) return next();

  const merchantId = req.merchant?.id;
  if (!merchantId) return next();

  const cacheKey = `idempotency:${merchantId}:${key}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    const existing = JSON.parse(cached);
    return res.status(200).json(existing);
  }

  const existingKey = await prisma.idempotencyKey.findUnique({
    where: { merchantId_key: { merchantId, key } },
  });

  if (existingKey && existingKey.expiresAt > new Date()) {
    await redis.set(cacheKey, JSON.stringify(existingKey.response), "EX", 86400);
    return res.status(200).json(existingKey.response);
  }

  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ body: req.body, url: req.originalUrl }))
    .digest("hex");

  req.idempotencyKey = key;
  req.idempotencyKeyHash = requestHash;
  req.idempotencyCachedResponse = null;

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.idempotencyKey) {
      const expiresAt = new Date(Date.now() + 86400000);
      prisma.idempotencyKey
        .create({
          data: {
            merchantId,
            key: req.idempotencyKey!,
            requestHash: req.idempotencyKeyHash!,
            response: body,
            expiresAt,
          },
        })
        .catch((err) => console.error("Idempotency save failed:", err));

      redis
        .set(
          `idempotency:${merchantId}:${req.idempotencyKey}`,
          JSON.stringify(body),
          "EX",
          86400
        )
        .catch((err) => console.error("Redis idempotency set failed:", err));
    }
    return originalJson(body);
  };

  next();
}
