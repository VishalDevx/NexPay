import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { reconciliationService } from "./reconciliation.service";

const router = Router();

router.post("/runs", async (req: Request, res: Response) => {
  try {
    const { runType } = req.body;
    const result = await reconciliationService.startRun(runType || "FULL");
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/runs", async (req: Request, res: Response) => {
  try {
    const runs = await reconciliationService.getReconciliationReport();
    res.json({ data: runs });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/runs/:id", async (req: Request, res: Response) => {
  try {
    const report = await reconciliationService.getReconciliationReport(req.params.id);
    if (!report) return res.status(404).json({ error: "not_found" });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/matches", async (req: Request, res: Response) => {
  try {
    const { runId, matchType, status, limit, offset } = req.query;
    const where: any = {};
    if (runId) where.runId = runId;
    if (matchType) where.matchType = matchType;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      prisma.reconciliationMatch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit ? parseInt(limit as string) : 100,
        skip: offset ? parseInt(offset as string) : 0,
      }),
      prisma.reconciliationMatch.count({ where }),
    ]);
    res.json({ data, total });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.patch("/matches/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { resolution } = req.body;
    if (!resolution) return res.status(400).json({ error: "validation_error", message: "resolution is required" });
    const match = await reconciliationService.resolveMatch(req.params.id, resolution, (req as any).merchant?.id || "admin");
    res.json(match);
  } catch (err: any) {
    res.status(400).json({ error: "reconciliation_error", message: err.message });
  }
});

router.get("/rules", async (_req: Request, res: Response) => {
  try {
    const rules = await prisma.reconciliationRule.findMany({ orderBy: { priority: "asc" } });
    res.json({ data: rules });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/settlement-batches", async (req: Request, res: Response) => {
  try {
    const { reference, description, totalAmount, currency, items } = req.body;
    if (!reference || !totalAmount || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "validation_error", message: "reference, totalAmount, and items are required" });
    }
    const batch = await reconciliationService.importSettlementBatch({ reference, description, totalAmount, currency, items });
    res.status(201).json(batch);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/settlement-batches", async (req: Request, res: Response) => {
  try {
    const summary = await reconciliationService.getSettlementBatchSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/settlement-batches/:id", async (req: Request, res: Response) => {
  try {
    const batch = await prisma.settlementBatch.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { createdAt: "desc" } } },
    });
    if (!batch) return res.status(404).json({ error: "not_found" });
    res.json(batch);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/summary", async (_req: Request, res: Response) => {
  try {
    const [openMatches, recentRuns, unmatchedBatches] = await Promise.all([
      prisma.reconciliationMatch.count({ where: { status: { in: ["OPEN", "ESCALATED"] } } }),
      prisma.reconciliationRun.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
      prisma.settlementBatch.count({ where: { status: { notIn: ["RECONCILED"] } } }),
    ]);
    res.json({ openMatches, recentRuns: recentRuns.length, unmatchedBatches, lastRun: recentRuns[0] || null });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
