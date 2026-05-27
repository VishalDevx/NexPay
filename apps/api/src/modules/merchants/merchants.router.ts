import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { webhookService } from "../webhooks/webhook.service";
import { authMiddleware } from "../../middleware/auth";
import { metrics } from "../metrics/metrics";
import crypto from "crypto";

const router = Router();
const authRouter = Router();
authRouter.use(authMiddleware);

function generateToken(merchantId: string): string {
  return jwt.sign({ merchantId }, env.JWT_SECRET, { expiresIn: "7d" });
}

// --- Registration ---
router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, country, businessType } = req.body;

    const existing = await prisma.merchant.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "email_exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const merchant = await prisma.merchant.create({
      data: {
        name,
        email,
        passwordHash,
        country: country || null,
        businessType: businessType || null,
        status: "DRAFT",
      },
    });

    const token = generateToken(merchant.id);

    res.status(201).json({
      merchant: { id: merchant.id, name: merchant.name, email, country, businessType },
      token,
    });
  } catch (err: any) {
    res.status(422).json({ error: "registration_failed", message: err.message });
  }
});

// --- Email OTP send ---
router.post("/auth/send-otp", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const merchant = await prisma.merchant.findUnique({ where: { email } });
    if (!merchant) return res.status(404).json({ error: "merchant_not_found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        passwordResetToken: otpHash,
        passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    console.log(`[OTP] ${email}: ${otp}`);

    res.json({ status: "otp_sent", message: "OTP sent to email" });
  } catch (err: any) {
    res.status(500).json({ error: "otp_failed", message: err.message });
  }
});

// --- Verify email OTP ---
router.post("/auth/verify-otp", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const merchant = await prisma.merchant.findUnique({ where: { email } });
    if (!merchant) return res.status(404).json({ error: "merchant_not_found" });

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const bypassAccepted = env.BYPASS_OTP && otp === "000000";

    if (
      !bypassAccepted &&
      (!merchant.passwordResetToken ||
        merchant.passwordResetToken !== otpHash ||
        !merchant.passwordResetExpires ||
        merchant.passwordResetExpires < new Date())
    ) {
      return res.status(400).json({ error: "invalid_or_expired_otp" });
    }

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        emailVerified: true,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    res.json({ status: "verified" });
  } catch (err: any) {
    res.status(500).json({ error: "verification_failed", message: err.message });
  }
});

// --- Login ---
router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const merchant = await prisma.merchant.findUnique({ where: { email } });
    if (!merchant) return res.status(401).json({ error: "invalid_credentials" });

    const valid = await bcrypt.compare(password, merchant.passwordHash);
    if (!valid) return res.status(401).json({ error: "invalid_credentials" });

    const token = generateToken(merchant.id);

    res.json({
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email,
        country: merchant.country,
        businessType: merchant.businessType,
        kycStatus: merchant.kycStatus,
        status: merchant.status,
        totpEnabled: merchant.totpEnabled,
        smsMfaEnabled: merchant.smsMfaEnabled,
      },
      token,
      mfaRequired: merchant.totpEnabled || merchant.smsMfaEnabled,
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// --- Verify TOTP (MFA second step) ---
router.post("/auth/verify-totp", async (req: Request, res: Response) => {
  try {
    const { email, token: totpToken } = req.body;
    const merchant = await prisma.merchant.findUnique({ where: { email } });
    if (!merchant || !merchant.totpSecret) {
      return res.status(401).json({ error: "mfa_not_configured" });
    }

    const { authenticator } = require("otplib");
    const isValid = authenticator.verify({ token: totpToken, secret: merchant.totpSecret });

    if (!isValid) return res.status(401).json({ error: "invalid_totp" });

    const jwtToken = generateToken(merchant.id);
    res.json({ token: jwtToken, merchant: { id: merchant.id, name: merchant.name, email: merchant.email } });
  } catch (err: any) {
    res.status(500).json({ error: "totp_verification_failed", message: err.message });
  }
});

// --- Setup TOTP ---
authRouter.post("/mfa/totp/setup", async (req: Request, res: Response) => {
  try {
    const { authenticator } = require("otplib");
    const secret = authenticator.generateSecret();
    const uri = authenticator.keyuri(req.merchant!.email, "NexPay", secret);

    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex")
    );

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: {
        totpSecret: secret,
        backupCodes: backupCodes,
      },
    });

    res.json({ secret, uri, backupCodes });
  } catch (err: any) {
    res.status(500).json({ error: "totp_setup_failed", message: err.message });
  }
});

// --- Enable TOTP ---
authRouter.post("/mfa/totp/enable", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchant!.id } });

    if (!merchant?.totpSecret) return res.status(400).json({ error: "totp_not_setup" });

    const { authenticator } = require("otplib");
    const isValid = authenticator.verify({ token, secret: merchant.totpSecret });

    if (!isValid) return res.status(400).json({ error: "invalid_token" });

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { totpEnabled: true },
    });

    res.json({ status: "totp_enabled" });
  } catch (err: any) {
    res.status(500).json({ error: "enable_failed", message: err.message });
  }
});

// --- Disable TOTP ---
authRouter.post("/mfa/totp/disable", async (req: Request, res: Response) => {
  try {
    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { totpSecret: null, totpEnabled: false, backupCodes: undefined },
    });
    res.json({ status: "totp_disabled" });
  } catch (err: any) {
    res.status(500).json({ error: "disable_failed", message: err.message });
  }
});

// --- Verify backup code ---
router.post("/auth/verify-backup-code", async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    const merchant = await prisma.merchant.findUnique({ where: { email } });
    if (!merchant || !merchant.backupCodes) return res.status(401).json({ error: "invalid" });

    const codes = merchant.backupCodes as string[];
    const idx = codes.indexOf(code);
    if (idx === -1) return res.status(401).json({ error: "invalid_backup_code" });

    codes.splice(idx, 1);
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { backupCodes: codes },
    });

    const token = generateToken(merchant.id);
    res.json({ token, merchant: { id: merchant.id, name: merchant.name, email: merchant.email } });
  } catch (err: any) {
    res.status(500).json({ error: "backup_code_failed", message: err.message });
  }
});

// --- Password reset request ---
router.post("/auth/password-reset-request", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const merchant = await prisma.merchant.findUnique({ where: { email } });
    if (!merchant) return res.json({ status: "ok" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        passwordResetToken: resetHash,
        passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    console.log(`[Password Reset] ${email}: ${resetToken}`);

    res.json({ status: "ok" });
  } catch (err: any) {
    res.status(500).json({ error: "reset_failed", message: err.message });
  }
});

// --- Password reset confirm ---
router.post("/auth/password-reset-confirm", async (req: Request, res: Response) => {
  try {
    const { email, token, password } = req.body;

    const merchant = await prisma.merchant.findUnique({ where: { email } });
    if (!merchant) return res.status(400).json({ error: "invalid_request" });

    const resetHash = crypto.createHash("sha256").update(token).digest("hex");

    if (
      !merchant.passwordResetToken ||
      merchant.passwordResetToken !== resetHash ||
      !merchant.passwordResetExpires ||
      merchant.passwordResetExpires < new Date()
    ) {
      return res.status(400).json({ error: "invalid_or_expired_token" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await prisma.apiKey.updateMany({
      where: { merchantId: merchant.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    res.json({ status: "password_reset_complete" });
  } catch (err: any) {
    res.status(500).json({ error: "reset_failed", message: err.message });
  }
});

// --- SMS MFA setup (simulated) ---
authRouter.post("/mfa/sms/setup", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { smsMfaPhone: phone, smsMfaEnabled: true },
    });
    res.json({ status: "sms_mfa_setup", phone });
  } catch (err: any) {
    res.status(500).json({ error: "sms_setup_failed", message: err.message });
  }
});

authRouter.get("/me", async (req: Request, res: Response) => {
// @ts-ignore - same as /profile below
  const merchant = await prisma.merchant.findUnique({
    where: { id: req.merchant!.id },
    select: {
      id: true, name: true, email: true, country: true, businessType: true,
      kycStatus: true, status: true, totpEnabled: true, smsMfaEnabled: true,
      smsMfaPhone: true, recoveryEmail: true, emailVerified: true, baseCurrency: true,
      createdAt: true,
    },
  });
  res.json({ merchant });
});

authRouter.patch("/me", async (req: Request, res: Response) => {
  try {
    const allowedFields = ["name", "country", "businessType", "recoveryEmail", "baseCurrency", "payoutSchedule", "settingsJson", "brandingJson"];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "no_fields", message: "No valid fields to update" });
    }
    const merchant = await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: updates,
    });
    res.json({ updated: true, merchant });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

authRouter.get("/profile", async (req: Request, res: Response) => {
  const merchant = await prisma.merchant.findUnique({
    where: { id: req.merchant!.id },
    select: {
      id: true, name: true, email: true, country: true, businessType: true,
      kycStatus: true, status: true, totpEnabled: true, smsMfaEnabled: true,
      smsMfaPhone: true, recoveryEmail: true, emailVerified: true, baseCurrency: true,
      createdAt: true,
    },
  });
  res.json(merchant);
});

authRouter.post("/api-keys", async (req: Request, res: Response) => {
  try {
    const { env: keyEnv, scopes } = req.body;
    const prefix = `nex_${keyEnv === "TEST" ? "test" : "live"}_`;
    const rawKey = prefix + crypto.randomBytes(24).toString("hex");
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const apiKey = await prisma.apiKey.create({
      data: {
        merchantId: req.merchant!.id,
        keyHash,
        prefix,
        env: keyEnv || "LIVE",
        scopes: scopes || ["charges:write", "charges:read"],
      },
    });

    res.status(201).json({ apiKey: { id: apiKey.id, prefix: apiKey.prefix, env: apiKey.env, key: rawKey, scopes: apiKey.scopes } });
  } catch (err: any) {
    res.status(422).json({ error: "api_key_creation_failed", message: err.message });
  }
});

authRouter.get("/api-keys", async (req: Request, res: Response) => {
  const keys = await prisma.apiKey.findMany({
    where: { merchantId: req.merchant!.id },
    select: { id: true, prefix: true, env: true, createdAt: true, revokedAt: true, scopes: true },
  });
  res.json({ data: keys });
});

authRouter.delete("/api-keys/:id", async (req: Request, res: Response) => {
  await prisma.apiKey.update({
    where: { id: req.params.id },
    data: { revokedAt: new Date() },
  });
  res.json({ status: "revoked" });
});

authRouter.post("/webhooks", async (req: Request, res: Response) => {
  try {
    const { url, events } = req.body;
    const secret = webhookService.generateSecret();
    const secretHash = crypto.createHash("sha256").update(secret).digest("hex");

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        merchantId: req.merchant!.id,
        url,
        events,
        secretHash,
      },
    });

    res.status(201).json({
      endpoint: { id: endpoint.id, url: endpoint.url, events: endpoint.events, secret },
    });
  } catch (err: any) {
    res.status(422).json({ error: "webhook_creation_failed", message: err.message });
  }
});

authRouter.get("/webhooks", async (req: Request, res: Response) => {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { merchantId: req.merchant!.id },
    select: { id: true, url: true, events: true, enabled: true, createdAt: true },
  });
  res.json({ data: endpoints });
});

authRouter.delete("/webhooks/:id", async (req: Request, res: Response) => {
  await prisma.webhookEndpoint.deleteMany({
    where: { id: req.params.id, merchantId: req.merchant!.id },
  });
  res.json({ status: "deleted" });
});

authRouter.get("/webhooks/deliveries", async (req: Request, res: Response) => {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { endpoint: { merchantId: req.merchant!.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ data: deliveries });
});

authRouter.post("/webhooks/deliveries/:id/replay", async (req: Request, res: Response) => {
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id: req.params.id, endpoint: { merchantId: req.merchant!.id } },
    include: { endpoint: true },
  });

  if (!delivery) return res.status(404).json({ error: "not_found" });

  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: { status: "PENDING", attempts: 0, nextRetryAt: new Date() },
  });

  const { webhookQueue } = await import("../webhooks/webhook.service");

  await webhookQueue.add(
    `webhook:replay:${delivery.id}`,
    { deliveryId: delivery.id, endpointId: delivery.endpointId, payload: delivery.payload, secretHash: delivery.endpoint.secretHash },
    { jobId: `replay:${delivery.id}`, attempts: 5, backoff: { type: "exponential", delay: 1000 } }
  );

  res.json({ status: "replayed", deliveryId: delivery.id });
});

authRouter.get("/api-logs", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const method = req.query.method as string;
    const statusCode = req.query.statusCode as string;
    const search = req.query.search as string;

    let logs = metrics.getApiLogs(req.merchant!.id, 1000, 0);

    if (method) logs = logs.filter((l) => l.method === method.toUpperCase());
    if (statusCode) logs = logs.filter((l) => String(l.status).startsWith(statusCode));
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) => l.id.toLowerCase().includes(q) || l.path.toLowerCase().includes(q)
      );
    }

    const total = logs.length;
    const page = logs.slice(offset, offset + limit);

    res.json({ data: page, total, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: "api_logs_failed", message: err.message });
  }
});

authRouter.patch("/webhooks/:id", async (req: Request, res: Response) => {
  try {
    const { url, events, enabled } = req.body;
    const updateData: Record<string, any> = {};
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (enabled !== undefined) updateData.enabled = enabled;

    const endpoint = await prisma.webhookEndpoint.updateMany({
      where: { id: req.params.id, merchantId: req.merchant!.id },
      data: updateData,
    });

    res.json({ updated: true, endpoint });
  } catch (err: any) {
    res.status(422).json({ error: "webhook_update_failed", message: err.message });
  }
});

authRouter.post("/webhooks/:id/rotate-secret", async (req: Request, res: Response) => {
  try {
    const secret = webhookService.generateSecret();
    const secretHash = crypto.createHash("sha256").update(secret).digest("hex");

    await prisma.webhookEndpoint.updateMany({
      where: { id: req.params.id, merchantId: req.merchant!.id },
      data: { secretHash },
    });

    res.json({ secret, message: "New signing secret generated. Previous secret is invalidated." });
  } catch (err: any) {
    res.status(422).json({ error: "secret_rotation_failed", message: err.message });
  }
});

authRouter.get("/webhooks/:id/secret", async (req: Request, res: Response) => {
  try {
    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });
    if (!endpoint) return res.status(404).json({ error: "not_found" });
    res.json({ secretHash: endpoint.secretHash });
  } catch (err: any) {
    res.status(500).json({ error: "get_secret_failed", message: err.message });
  }
});

authRouter.get("/webhooks/deliveries/:id", async (req: Request, res: Response) => {
  try {
    const delivery = await prisma.webhookDelivery.findFirst({
      where: { id: req.params.id, endpoint: { merchantId: req.merchant!.id } },
      include: { endpoint: { select: { url: true } } },
    });
    if (!delivery) return res.status(404).json({ error: "not_found" });
    res.json({ data: delivery });
  } catch (err: any) {
    res.status(500).json({ error: "delivery_fetch_failed", message: err.message });
  }
});

authRouter.post("/webhooks/deliveries/:id/retry", async (req: Request, res: Response) => {
  try {
    const delivery = await prisma.webhookDelivery.findFirst({
      where: { id: req.params.id, endpoint: { merchantId: req.merchant!.id } },
      include: { endpoint: true },
    });

    if (!delivery) return res.status(404).json({ error: "not_found" });
    if (delivery.status !== "FAILED") {
      return res.status(400).json({ error: "invalid_status", message: "Only failed deliveries can be retried" });
    }

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: "PENDING", attempts: 0, nextRetryAt: new Date() },
    });

    const { webhookQueue } = await import("../webhooks/webhook.service");
    await webhookQueue.add(
      `webhook:retry:${delivery.id}`,
      { deliveryId: delivery.id, endpointId: delivery.endpointId, payload: delivery.payload, secretHash: delivery.endpoint.secretHash },
      { jobId: `retry:${delivery.id}`, attempts: 5, backoff: { type: "exponential", delay: 1000 } }
    );

    res.json({ status: "retried", deliveryId: delivery.id });
  } catch (err: any) {
    res.status(500).json({ error: "retry_failed", message: err.message });
  }
});

router.use(authRouter);

export default router;
