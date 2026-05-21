import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { webhookService } from "../webhooks/webhook.service";
import { authMiddleware } from "../../middleware/auth";

const router = Router();
const authRouter = Router();
authRouter.use(authMiddleware);

router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.merchant.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "email_exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const merchant = await prisma.merchant.create({
      data: { name, email, passwordHash },
    });

    const token = jwt.sign({ merchantId: merchant.id }, env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ merchant: { id: merchant.id, name: merchant.name, email }, token });
  } catch (err: any) {
    res.status(422).json({ error: "registration_failed", message: err.message });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const merchant = await prisma.merchant.findUnique({ where: { email } });
    if (!merchant) return res.status(401).json({ error: "invalid_credentials" });

    const valid = await bcrypt.compare(password, merchant.passwordHash);
    if (!valid) return res.status(401).json({ error: "invalid_credentials" });

    const token = jwt.sign({ merchantId: merchant.id }, env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ merchant: { id: merchant.id, name: merchant.name, email }, token });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

authRouter.get("/profile", async (req: Request, res: Response) => {
  res.json(req.merchant);
});

authRouter.post("/api-keys", async (req: Request, res: Response) => {
  try {
    const { env: keyEnv } = req.body;
    const prefix = `nex_${keyEnv === "TEST" ? "test" : "live"}_`;
    const rawKey = prefix + require("crypto").randomBytes(24).toString("hex");
    const keyHash = require("crypto").createHash("sha256").update(rawKey).digest("hex");

    const apiKey = await prisma.apiKey.create({
      data: {
        merchantId: req.merchant!.id,
        keyHash,
        prefix,
        env: keyEnv || "LIVE",
        scopes: ["charges:write", "charges:read"],
      },
    });

    res.status(201).json({ apiKey: { id: apiKey.id, prefix: apiKey.prefix, env: apiKey.env, key: rawKey } });
  } catch (err: any) {
    res.status(422).json({ error: "api_key_creation_failed", message: err.message });
  }
});

authRouter.get("/api-keys", async (req: Request, res: Response) => {
  const keys = await prisma.apiKey.findMany({
    where: { merchantId: req.merchant!.id },
    select: { id: true, prefix: true, env: true, createdAt: true, revokedAt: true },
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
    const secretHash = require("crypto").createHash("sha256").update(secret).digest("hex");

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

  const { webhookQueue } = require("../webhooks/webhook.service");

  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: { status: "PENDING", attempts: 0, nextRetryAt: new Date() },
  });

  await webhookQueue.add(
    `webhook:replay:${delivery.id}`,
    { deliveryId: delivery.id, endpointId: delivery.endpointId, payload: delivery.payload, secretHash: delivery.endpoint.secretHash },
    { jobId: `replay:${delivery.id}`, attempts: 5, backoff: { type: "exponential", delay: 1000 } }
  );

  res.json({ status: "replayed", deliveryId: delivery.id });
});

router.use(authRouter);

export default router;
