import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";

const WINDOW_MS = 60000;
const MAX_REQUESTS = 100;
const MAX_AUTH_FAILURES = 10;
const BLOCK_DURATION = 3600000;

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = req.merchant ? `ratelimit:key:${req.merchant.id}` : `ratelimit:ip:${ip}`;

  const blocked = await redis.get(`blocked:${ip}`);
  if (blocked) {
    const ttl = await redis.ttl(`blocked:${ip}`);
    return res.status(429).json({
      error: "rate_limited",
      message: `IP blocked for ${Math.ceil(ttl / 60)} more minutes`,
      retryAfter: ttl,
    });
  }

  const windowKey = `${key}:${Math.floor(Date.now() / WINDOW_MS)}`;
  const count = await redis.incr(windowKey);
  if (count === 1) await redis.expire(windowKey, Math.ceil(WINDOW_MS / 1000));

  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS - count));

  if (count > MAX_REQUESTS) {
    return res.status(429).json({
      error: "rate_limited",
      message: "Too many requests. Try again shortly.",
      retryAfter: Math.ceil(WINDOW_MS / 1000),
    });
  }

  next();
}

export async function trackAuthFailure(ip: string) {
  const key = `auth_failures:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, BLOCK_DURATION / 1000);

  if (count >= MAX_AUTH_FAILURES) {
    await redis.set(`blocked:${ip}`, "1", "EX", BLOCK_DURATION / 1000);
  }
}
