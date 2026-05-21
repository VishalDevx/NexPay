import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";

const router = Router();

const DEFAULT_EVENTS = [
  "payment.success",
  "payment.failed",
  "payout.completed",
  "dispute.raised",
  "dispute.resolved",
  "settlement.completed",
  "kyc.updated",
  "invoice.sent",
  "invoice.paid",
  "invoice.overdue",
];

const DEFAULT_CHANNELS = ["email", "sms", "webhook"];

router.get("/", async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchant!.id;

    let prefs = await prisma.notificationPreference.findMany({
      where: { merchantId },
    });

    if (prefs.length === 0) {
      const defaults = [];
      for (const channel of DEFAULT_CHANNELS) {
        for (const event of DEFAULT_EVENTS) {
          defaults.push({ merchantId, channel, event, enabled: true });
        }
      }
      await prisma.notificationPreference.createMany({ data: defaults });
      prefs = await prisma.notificationPreference.findMany({ where: { merchantId } });
    }

    const data = prefs.map((p) => ({
      channel: p.channel,
      event: p.event,
      enabled: p.enabled,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.put("/", async (req: Request, res: Response) => {
  try {
    const { preferences } = req.body;

    if (!Array.isArray(preferences)) {
      return res.status(400).json({ error: "invalid_body", message: "preferences array required" });
    }

    for (const pref of preferences) {
      await prisma.notificationPreference.upsert({
        where: {
          merchantId_channel_event: {
            merchantId: req.merchant!.id,
            channel: pref.channel,
            event: pref.event,
          },
        },
        create: {
          merchantId: req.merchant!.id,
          channel: pref.channel,
          event: pref.event,
          enabled: pref.enabled,
        },
        update: {
          enabled: pref.enabled,
        },
      });
    }

    res.json({ updated: true });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

router.put("/slack", async (req: Request, res: Response) => {
  try {
    const { webhookUrl, channel } = req.body;

    if (!webhookUrl || !webhookUrl.startsWith("https://")) {
      return res.status(400).json({ error: "invalid_url", message: "valid https webhook URL required" });
    }

    const merchantId = req.merchant!.id;

    await prisma.notificationPreference.upsert({
      where: {
        merchantId_channel_event: {
          merchantId,
          channel: "slack",
          event: "all",
        },
      },
      create: {
        merchantId,
        channel: "slack",
        event: "all",
        enabled: true,
        slackWebhook: webhookUrl,
        slackChannel: channel || null,
      },
      update: {
        slackWebhook: webhookUrl,
        slackChannel: channel || null,
        enabled: true,
      },
    });

    res.json({ configured: true });
  } catch (err: any) {
    res.status(422).json({ error: "slack_config_failed", message: err.message });
  }
});

router.delete("/slack", async (req: Request, res: Response) => {
  try {
    await prisma.notificationPreference.deleteMany({
      where: { merchantId: req.merchant!.id, channel: "slack" },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(422).json({ error: "delete_failed", message: err.message });
  }
});

export default router;
