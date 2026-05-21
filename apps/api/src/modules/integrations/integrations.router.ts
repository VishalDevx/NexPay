import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import { randomUUID } from "crypto";

const router = Router();

const INTEGRATION_CATALOG = [
  { id: "shopify", name: "Shopify", category: "E-commerce", description: "Sync orders and payments from Shopify", docUrl: "https://shopify.dev/docs" },
  { id: "woocommerce", name: "WooCommerce", category: "E-commerce", description: "Integrate with WooCommerce stores", docUrl: "https://woocommerce.com/document" },
  { id: "magento", name: "Magento", category: "E-commerce", description: "Connect Adobe Commerce / Magento stores", docUrl: "https://devdocs.magento.com" },
  { id: "prestashop", name: "PrestaShop", category: "E-commerce", description: "PrestaShop payment integration", docUrl: "https://devdocs.prestashop.com" },
  { id: "quickbooks", name: "QuickBooks", category: "Accounting", description: "Sync transactions to QuickBooks", docUrl: "https://developer.intuit.com" },
  { id: "xero", name: "Xero", category: "Accounting", description: "Connect with Xero accounting", docUrl: "https://developer.xero.com" },
  { id: "zoho-books", name: "Zoho Books", category: "Accounting", description: "Zoho Books integration", docUrl: "https://www.zoho.com/books/api" },
  { id: "tally", name: "Tally", category: "Accounting", description: "Export data to Tally ERP", docUrl: "https://tallysolutions.com" },
  { id: "zapier", name: "Zapier", category: "Automation", description: "Connect with 5000+ apps via Zapier", docUrl: "https://developer.zapier.com" },
  { id: "make-dot-com", name: "Make", category: "Automation", description: "Automate workflows with Make", docUrl: "https://www.make.com/en/api-docs" },
  { id: "bigquery", name: "BigQuery", category: "Data", description: "Export data to Google BigQuery", docUrl: "https://cloud.google.com/bigquery/docs" },
  { id: "snowflake", name: "Snowflake", category: "Data", description: "Export data to Snowflake", docUrl: "https://docs.snowflake.com" },
  { id: "google-sheets", name: "Google Sheets", category: "Data", description: "Sync data to Google Sheets", docUrl: "https://developers.google.com/sheets" },
  { id: "s3", name: "Amazon S3", category: "Data", description: "Store exports in Amazon S3", docUrl: "https://docs.aws.amazon.com/s3" },
  { id: "gcs", name: "Google Cloud Storage", category: "Data", description: "Store exports in GCS", docUrl: "https://cloud.google.com/storage/docs" },
];

router.get("/", async (req: Request, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: { settingsJson: true },
    });

    const integrations = (merchant?.settingsJson as any)?.integrations || {};

    const data = INTEGRATION_CATALOG.map((integration) => ({
      ...integration,
      status: integrations[integration.id]?.connected ? "connected" as const : "available" as const,
      connectedAt: integrations[integration.id]?.connectedAt || null,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/:id/connect", async (req: Request, res: Response) => {
  try {
    const { apiKey, apiSecret, config } = req.body;
    const integrationId = req.params.id;

    const integration = INTEGRATION_CATALOG.find((i) => i.id === integrationId);
    if (!integration) {
      return res.status(404).json({ error: "integration_not_found" });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: { settingsJson: true },
    });

    const settingsJson = (merchant?.settingsJson as any) || {};
    const integrations = settingsJson.integrations || {};

    integrations[integrationId] = {
      connected: true,
      connectedAt: new Date().toISOString(),
      apiKey: apiKey || null,
      apiSecret: apiSecret || null,
      config: config || null,
    };

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { settingsJson: { ...settingsJson, integrations } },
    });

    res.json({ connected: true, id: integrationId, name: integration.name });
  } catch (err: any) {
    res.status(422).json({ error: "connect_failed", message: err.message });
  }
});

router.post("/:id/disconnect", async (req: Request, res: Response) => {
  try {
    const integrationId = req.params.id;

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant!.id },
      select: { settingsJson: true },
    });

    const settingsJson = (merchant?.settingsJson as any) || {};
    const integrations = settingsJson.integrations || {};

    delete integrations[integrationId];

    await prisma.merchant.update({
      where: { id: req.merchant!.id },
      data: { settingsJson: { ...settingsJson, integrations } },
    });

    res.json({ disconnected: true });
  } catch (err: any) {
    res.status(422).json({ error: "disconnect_failed", message: err.message });
  }
});

export default router;
