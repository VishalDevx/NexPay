import { Router, Request, Response } from "express";
import { glService } from "./gl.service";

const router = Router();

router.get("/accounts", async (_req: Request, res: Response) => {
  try {
    const { prisma } = await import("../../config/db");
    const accounts = await prisma.chartAccount.findMany({
      orderBy: { code: "asc" },
      include: { children: { orderBy: { code: "asc" } } },
    });
    res.json({ data: accounts });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/accounts/:code", async (req: Request, res: Response) => {
  try {
    const { prisma } = await import("../../config/db");
    const account = await prisma.chartAccount.findUnique({
      where: { code: req.params.code },
      include: { parent: true, children: { orderBy: { code: "asc" } } },
    });
    if (!account) return res.status(404).json({ error: "not_found" });
    const balance = await glService.getAccountBalance(req.params.code);
    res.json({ ...account, balance: balance.toFixed(2) });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/journal", async (req: Request, res: Response) => {
  try {
    const { transactionType, transactionId, accountCode, status, limit, offset } = req.query;
    const result = await glService.listEntries({
      transactionType: transactionType as string,
      transactionId: transactionId as string,
      accountCode: accountCode as string,
      status: status as any,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/journal/:id", async (req: Request, res: Response) => {
  try {
    const entry = await glService.getEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: "not_found" });
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/journal", async (req: Request, res: Response) => {
  try {
    const { transactionId, transactionType, description, reference, lines } = req.body;
    if (!lines || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ error: "validation_error", message: "At least 2 journal lines required" });
    }
    const entry = await glService.createEntry({
      transactionId,
      transactionType,
      description,
      reference,
      lines,
      createdById: (req as any).merchant?.id || req.headers["x-admin-id"] as string,
    });
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ error: "ledger_error", message: err.message });
  }
});

router.post("/journal/:id/reverse", async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "validation_error", message: "reason is required" });
    const reversal = await glService.reverseEntry(req.params.id, reason, (req as any).merchant?.id);
    res.status(201).json(reversal);
  } catch (err: any) {
    res.status(400).json({ error: "ledger_error", message: err.message });
  }
});

router.get("/trial-balance", async (req: Request, res: Response) => {
  try {
    const { asOf } = req.query;
    const result = await glService.getTrialBalance(asOf ? new Date(asOf as string) : undefined);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/income-statement", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "validation_error", message: "from and to query params required" });
    }
    const result = await glService.getIncomeStatement(new Date(from as string), new Date(to as string));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/transactions/:type/:id", async (req: Request, res: Response) => {
  try {
    const entries = await glService.getTransactionLedger(req.params.type, req.params.id);
    res.json({ data: entries });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
