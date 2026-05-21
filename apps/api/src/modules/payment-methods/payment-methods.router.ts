import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";

const router = Router();

const ALL_METHODS = [
  { id: "upi", name: "UPI" },
  { id: "netbanking", name: "Net Banking" },
  { id: "emi", name: "EMI" },
  { id: "wallets", name: "Wallets" },
  { id: "threeds", name: "3DS" },
  { id: "payment_links", name: "Payment Links" },
  { id: "hosted_page", name: "Hosted Page" },
  { id: "subscriptions", name: "Subscriptions" },
];

const VALID_IDS = ALL_METHODS.map((m) => m.id);

function getDefaultMethods() {
  return ALL_METHODS.map((m) => ({
    id: m.id,
    name: m.name,
    enabled: true,
    config: {},
  }));
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
    });

    const settings = (merchant?.settingsJson as any) || {};
    const paymentMethods = settings.paymentMethods || getDefaultMethods();

    res.json({ data: paymentMethods });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!VALID_IDS.includes(id)) {
      return res.status(400).json({ error: "invalid_method", message: `method must be one of: ${VALID_IDS.join(", ")}` });
    }

    const { enabled, config } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
    });

    const settings = (merchant?.settingsJson as any) || {};
    const methods: any[] = settings.paymentMethods || getDefaultMethods();

    const idx = methods.findIndex((m: any) => m.id === id);
    if (idx === -1) {
      methods.push({ id, name: id, enabled: true, config: {} });
    }

    const updatedMethods = methods.map((m: any) => {
      if (m.id === id) {
        return {
          ...m,
          ...(enabled !== undefined && { enabled }),
          ...(config !== undefined && { config }),
        };
      }
      return m;
    });

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: {
        settingsJson: {
          ...settings,
          paymentMethods: updatedMethods,
        },
      },
    });

    res.json({ updated: true });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

export default router;
