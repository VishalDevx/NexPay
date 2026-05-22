import { Router, Request, Response } from "express";
import { outboxService } from "./outbox.service";

const router = Router();

function isAdmin(req: Request): boolean {
  return !!(req as any).merchant?.id || !!(req as any).apiKeyScopes?.includes("admin");
}

router.get("/admin/outbox/pending", async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }

  try {
    const events = await outboxService.getPendingEvents();
    res.json({ data: events, count: events.length });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/admin/outbox/failed", async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }

  try {
    const events = await outboxService.getFailedEvents();
    res.json({ data: events, count: events.length });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/admin/outbox/:id/retry", async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }

  try {
    await outboxService.retryFailedEvent(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(422).json({ error: "retry_failed", message: err.message });
  }
});

router.post("/admin/outbox/process", async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }

  try {
    const processed = await outboxService.processOutbox();
    res.json({ success: true, processed });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
