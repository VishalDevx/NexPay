import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import crypto from "crypto";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) {
    return res.status(401).json({ error: "missing_api_key", message: "x-api-key header required" });
  }

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const key = await prisma.apiKey.findUnique({ where: { keyHash }, include: { merchant: true } });

  if (!key || key.revokedAt) {
    return res.status(401).json({ error: "invalid_api_key", message: "API key is invalid or revoked" });
  }

  if (key.merchant.status !== "ACTIVE") {
    return res.status(403).json({ error: "merchant_inactive", message: "Merchant account is not active" });
  }

  req.merchant = key.merchant;
  req.apiKeyEnv = key.env;
  req.apiKeyScopes = key.scopes as string[];
  next();
}
