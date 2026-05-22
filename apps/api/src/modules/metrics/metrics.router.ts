import { Router, Request, Response } from "express";
import { metrics } from "./metrics";

const router = Router();

function isAdmin(req: Request): boolean {
  return !!(req as any).merchant?.id || !!(req as any).apiKeyScopes?.includes("admin");
}

router.get("/metrics", (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }

  res.json(metrics.getAllMetrics());
});

router.get("/metrics/prometheus", (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(metrics.toPrometheus());
});

export default router;
