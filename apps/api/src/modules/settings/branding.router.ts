import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: { settingsJson: true, brandingJson: true, baseCurrency: true },
    });
    if (!merchant) return res.status(404).json({ error: "not_found" });

    const branding = merchant.brandingJson || {
      logo: null,
      brandColor: "#6C5CE7",
      font: "Inter",
    };

    const settings = merchant.settingsJson || {
      currency: merchant.baseCurrency,
      dateFormat: "DD/MM/YYYY",
      language: "en",
      numberFormat: "1,234.56",
    };

    res.json({ branding, settings });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.put("/branding", async (req: Request, res: Response) => {
  try {
    const { logo, brandColor, font } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: { brandingJson: true },
    });

    const current = (merchant?.brandingJson || {}) as Record<string, any>;
    const branding = {
      ...current,
      ...(logo !== undefined && { logo }),
      ...(brandColor !== undefined && { brandColor }),
      ...(font !== undefined && { font }),
    };

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { brandingJson: branding },
    });

    res.json({ updated: true, branding });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

router.put("/settings", async (req: Request, res: Response) => {
  try {
    const { currency, dateFormat, language, numberFormat } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: { settingsJson: true, baseCurrency: true },
    });

    const current = (merchant?.settingsJson || {}) as Record<string, any>;
    const settings = {
      ...current,
      ...(currency !== undefined && { currency }),
      ...(dateFormat !== undefined && { dateFormat }),
      ...(language !== undefined && { language }),
      ...(numberFormat !== undefined && { numberFormat }),
    };

    const updateData: Record<string, any> = { settingsJson: settings };
    if (currency !== undefined) {
      updateData.baseCurrency = currency;
    }

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: updateData,
    });

    res.json({ updated: true, settings });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

router.put("/fees", async (req: Request, res: Response) => {
  try {
    const { mdr, fixedFee, internationalMarkup } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: { settingsJson: true },
    });

    const current = (merchant?.settingsJson || {}) as Record<string, any>;
    const settings = {
      ...current,
      fees: {
        ...((current.fees || {}) as Record<string, any>),
        ...(mdr !== undefined && { mdr }),
        ...(fixedFee !== undefined && { fixedFee }),
        ...(internationalMarkup !== undefined && { internationalMarkup }),
      },
    };

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { settingsJson: settings },
    });

    res.json({ updated: true, fees: settings.fees });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

router.put("/checkout", async (req: Request, res: Response) => {
  try {
    const { paymentMethodOrder, preFill, saveCard, redirectUrls } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: { settingsJson: true },
    });

    const current = (merchant?.settingsJson || {}) as Record<string, any>;
    const settings = {
      ...current,
      checkout: {
        ...((current.checkout || {}) as Record<string, any>),
        ...(paymentMethodOrder !== undefined && { paymentMethodOrder }),
        ...(preFill !== undefined && { preFill }),
        ...(saveCard !== undefined && { saveCard }),
        ...(redirectUrls !== undefined && { redirectUrls }),
      },
    };

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { settingsJson: settings },
    });

    res.json({ updated: true, config: settings.checkout });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

router.put("/customer-notifications", async (req: Request, res: Response) => {
  try {
    const { emailEvents, smsEvents, customCopy } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: { settingsJson: true },
    });

    const current = (merchant?.settingsJson || {}) as Record<string, any>;
    const settings = {
      ...current,
      customerNotifications: {
        ...((current.customerNotifications || {}) as Record<string, any>),
        ...(emailEvents !== undefined && { emailEvents }),
        ...(smsEvents !== undefined && { smsEvents }),
        ...(customCopy !== undefined && { customCopy }),
      },
    };

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { settingsJson: settings },
    });

    res.json({ updated: true, config: settings.customerNotifications });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

export default router;
