import { Router, Request, Response } from "express";

export interface StatusComponent {
  id: string;
  name: string;
  status: "operational" | "degraded" | "major_outage" | "maintenance";
  uptime: number;
  description: string;
}

export interface StatusHistoryEntry {
  date: string;
  uptime: number;
}

interface IncidentUpdate {
  id: string;
  message: string;
  status: string;
  createdAt: string;
}

interface PublicIncident {
  id: string;
  title: string;
  description: string;
  severity: "SEV1" | "SEV2" | "SEV3";
  status: string;
  affectedServices: string[];
  createdAt: string;
  resolvedAt: string | null;
  updates: IncidentUpdate[];
}

const components: StatusComponent[] = [
  { id: "api", name: "API", status: "operational", uptime: 99.99, description: "REST API and GraphQL endpoint" },
  { id: "checkout", name: "Checkout", status: "operational", uptime: 99.97, description: "Hosted checkout and payment form" },
  { id: "dashboard", name: "Dashboard", status: "operational", uptime: 99.95, description: "Merchant and admin dashboards" },
  { id: "webhooks", name: "Webhooks", status: "operational", uptime: 99.99, description: "Webhook delivery system" },
  { id: "payouts", name: "Payouts", status: "operational", uptime: 99.93, description: "Automated payout processing" },
  { id: "settlements", name: "Settlements", status: "operational", uptime: 99.98, description: "Settlement and reconciliation" },
  { id: "sandbox", name: "Sandbox", status: "operational", uptime: 100.0, description: "Test environment" },
];

const mockIncidents: PublicIncident[] = [
  {
    id: "inc_001",
    title: "Elevated API Latency",
    description: "Some API endpoints experienced increased latency due to database connection pool exhaustion.",
    severity: "SEV2",
    status: "RESOLVED",
    affectedServices: ["api", "dashboard"],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 7 * 86400000 + 7200000).toISOString(),
    updates: [
      {
        id: "upd_001",
        message: "We are investigating reports of elevated latency on API endpoints.",
        status: "INVESTIGATING",
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: "upd_002",
        message: "Identified the root cause — database connection pool exhaustion. Scaling up connections.",
        status: "MITIGATING",
        createdAt: new Date(Date.now() - 7 * 86400000 + 3600000).toISOString(),
      },
      {
        id: "upd_003",
        message: "Connection pool scaled. Latency returning to normal. Monitoring closely.",
        status: "RESOLVED",
        createdAt: new Date(Date.now() - 7 * 86400000 + 7200000).toISOString(),
      },
    ],
  },
  {
    id: "inc_002",
    title: "Webhook Delivery Delays",
    description: "Webhook delivery queue backed up due to a downstream provider issue.",
    severity: "SEV3",
    status: "RESOLVED",
    affectedServices: ["webhooks"],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 14 * 86400000 + 5400000).toISOString(),
    updates: [
      {
        id: "upd_004",
        message: "Webhook deliveries are delayed. Investigating downstream provider.",
        status: "INVESTIGATING",
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        id: "upd_005",
        message: "Downstream provider has resolved their issue. Draining the webhook queue.",
        status: "MITIGATING",
        createdAt: new Date(Date.now() - 14 * 86400000 + 3600000).toISOString(),
      },
      {
        id: "upd_006",
        message: "All webhooks delivered. System back to normal.",
        status: "RESOLVED",
        createdAt: new Date(Date.now() - 14 * 86400000 + 5400000).toISOString(),
      },
    ],
  },
  {
    id: "inc_003",
    title: "Scheduled Maintenance — Database Upgrade",
    description: "Planned maintenance to upgrade the primary database cluster.",
    severity: "SEV3",
    status: "RESOLVED",
    affectedServices: ["api", "dashboard"],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 30 * 86400000 + 7200000).toISOString(),
    updates: [
      {
        id: "upd_007",
        message: "Scheduled maintenance window opened. Performing database upgrade.",
        status: "MAINTENANCE",
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: "upd_008",
        message: "Database upgrade completed successfully. All systems operational.",
        status: "RESOLVED",
        createdAt: new Date(Date.now() - 30 * 86400000 + 7200000).toISOString(),
      },
    ],
  },
];

function generateUptimeHistory(days: number): StatusHistoryEntry[] {
  const entries: StatusHistoryEntry[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    entries.push({
      date: date.toISOString().split("T")[0],
      uptime: Math.round((99.5 + Math.random() * 0.5) * 100) / 100,
    });
  }
  return entries;
}

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const allOperational = components.every((c) => c.status === "operational");
  const hasDegraded = components.some((c) => c.status === "degraded");
  const hasOutage = components.some((c) => c.status === "major_outage");
  const activeIncidents = mockIncidents.filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED");

  let overall: string;
  if (hasOutage) overall = "major_outage";
  else if (hasDegraded) overall = "degraded";
  else if (allOperational) overall = "operational";
  else overall = "maintenance";

  res.json({
    status: overall,
    message: allOperational ? "All Systems Operational" : "Some systems experiencing issues",
    lastChecked: new Date().toISOString(),
    components,
    activeIncidents: activeIncidents.map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      status: i.status,
      affectedServices: i.affectedServices,
      createdAt: i.createdAt,
    })),
  });
});

router.get("/components", (_req: Request, res: Response) => {
  res.json({ data: components });
});

router.get("/incidents", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const publicIncidents = mockIncidents.filter((i) => i.status !== "CLOSED" || true);
  const start = (page - 1) * limit;
  const paged = publicIncidents.slice(start, start + limit);
  res.json({
    data: paged.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      severity: i.severity,
      status: i.status,
      affectedServices: i.affectedServices,
      createdAt: i.createdAt,
      resolvedAt: i.resolvedAt,
      updates: i.updates,
    })),
    pagination: { page, limit, total: publicIncidents.length, totalPages: Math.ceil(publicIncidents.length / limit) },
  });
});

router.get("/incidents/:id", (req: Request, res: Response) => {
  const incident = mockIncidents.find((i) => i.id === req.params.id);
  if (!incident) return res.status(404).json({ error: "not_found" });
  res.json(incident);
});

router.get("/uptime", (req: Request, res: Response) => {
  const period = (req.query.period as string) || "30d";
  const days = parseInt(period) || 30;
  const history = generateUptimeHistory(Math.min(days, 90));
  res.json({ period, history });
});

router.get("/history", (_req: Request, res: Response) => {
  const resolved = mockIncidents.filter((i) => i.status === "RESOLVED");
  res.json({
    data: resolved.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      severity: i.severity,
      status: i.status,
      affectedServices: i.affectedServices,
      createdAt: i.createdAt,
      resolvedAt: i.resolvedAt,
    })),
  });
});

export default router;
