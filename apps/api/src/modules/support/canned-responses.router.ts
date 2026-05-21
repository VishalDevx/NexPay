import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const responses = await prisma.cannedResponse.findMany({ where: { active: true }, orderBy: { title: "asc" } });
    res.json({ data: responses });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) return res.status(400).json({ error: "validation_error", message: "title and content are required" });
    const response = await prisma.cannedResponse.create({ data: { title, content, category } });
    res.status(201).json(response);
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.cannedResponse.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ status: "deleted" });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
