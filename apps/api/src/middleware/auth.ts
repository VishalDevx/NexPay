import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import crypto from "crypto";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string;
  const authHeader = req.headers["authorization"] as string;

  if (!apiKey && !authHeader) {
    return res.status(401).json({ error: "missing_auth", message: "x-api-key or Authorization header required" });
  }

  if (apiKey) {
    if (apiKey.startsWith("nex_")) {
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
      const key = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { merchant: true },
      });

      if (!key || key.revokedAt) {
        return res.status(401).json({ error: "invalid_api_key", message: "API key is invalid or revoked" });
      }

      if (key.merchant.status !== "ACTIVE") {
        return res.status(403).json({ error: "merchant_inactive", message: "Merchant account is not active" });
      }

      req.merchant = key.merchant;
      req.apiKeyEnv = key.env;
      req.apiKeyScopes = key.scopes as string[];
      return next();
    }

    try {
      const decoded = jwt.verify(apiKey, env.JWT_SECRET) as { merchantId: string };
      const merchant = await prisma.merchant.findUnique({ where: { id: decoded.merchantId } });
      if (!merchant) {
        return res.status(401).json({ error: "invalid_token", message: "Merchant not found" });
      }
      req.merchant = merchant;
      req.apiKeyEnv = "LIVE";
      req.apiKeyScopes = ["*"];
      return next();
    } catch (err) {
      return res.status(401).json({ error: "invalid_token", message: "Invalid or expired token" });
    }
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { merchantId: string };
      const merchant = await prisma.merchant.findUnique({ where: { id: decoded.merchantId } });
      if (!merchant) {
        return res.status(401).json({ error: "invalid_token", message: "Merchant not found" });
      }
      req.merchant = merchant;
      req.apiKeyEnv = "LIVE";
      req.apiKeyScopes = ["*"];
      return next();
    } catch (err) {
      return res.status(401).json({ error: "invalid_token", message: "Invalid or expired token" });
    }
  }

  next();
}
