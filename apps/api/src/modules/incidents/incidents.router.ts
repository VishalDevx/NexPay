import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: "desc" },
      include: { updates: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    res.json({ data: incidents });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/active", async (_req: Request, res: Response) => {
  try {
    const incidents = await prisma.incident.findMany({
      where: { status: { notIn: ["CLOSED", "RESOLVED", "POSTMORTEM"] } },
      orderBy: { severity: "asc" },
    });
    res.json({ data: incidents });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, description, severity, affectedServices } = req.body;
    const incident = await prisma.incident.create({
      data: { title, description: description || "", severity: severity || "SEV3", affectedServices: affectedServices || [] },
    });
    res.status(201).json(incident);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status, message } = req.body;
    const data: any = { status };
    if (status === "MITIGATING") data.mitigatedAt = new Date();
    if (status === "RESOLVED") data.resolvedAt = new Date();
    const incident = await prisma.incident.update({ where: { id: req.params.id }, data });
    if (message) {
      await prisma.incidentUpdate.create({ data: { incidentId: incident.id, message, status } });
    }
    res.json(incident);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/:id/updates", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const incident = await prisma.incident.findUnique({ where: { id: req.params.id } });
    if (!incident) return res.status(404).json({ error: "not_found" });
    const update = await prisma.incidentUpdate.create({ data: { incidentId: incident.id, message, status: incident.status } });
    res.status(201).json(update);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/:id/postmortem", async (req: Request, res: Response) => {
  try {
    const { rootCause, impact } = req.body;
    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: { rootCause, impact, status: "POSTMORTEM" },
    });
    res.json(incident);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
