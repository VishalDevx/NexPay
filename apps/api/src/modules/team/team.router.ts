import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";

const router = Router();

const VALID_ROLES = ["OWNER", "ADMIN", "DEVELOPER", "FINANCE", "READ_ONLY"];

router.get("/", async (req: Request, res: Response) => {
  try {
    const members = await prisma.teamMember.findMany({
      where: { merchantId: req.merchant!.id },
      select: { id: true, email: true, name: true, role: true, status: true, invitedAt: true, lastLoginAt: true },
    });
    res.json({ data: members });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/invite", async (req: Request, res: Response) => {
  try {
    const { email, name, role } = req.body;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: "invalid_role",
        message: `Role must be one of: ${VALID_ROLES.join(", ")}`,
      });
    }

    const existing = await prisma.teamMember.findUnique({
      where: { merchantId_email: { merchantId: req.merchant!.id, email } },
    });
    if (existing) return res.status(409).json({ error: "member_exists" });

    const member = await prisma.teamMember.create({
      data: {
        merchantId: req.merchant!.id,
        email,
        name: name || null,
        role,
        status: "INVITED",
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    console.log(`[Invite] Sent invitation to ${email} for merchant ${req.merchant!.id}`);

    res.status(201).json({
      id: member.id,
      email: member.email,
      role: member.role,
      expiresAt: member.expiresAt,
      message: "Invitation sent",
    });
  } catch (err: any) {
    res.status(422).json({ error: "invite_failed", message: err.message });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { role } = req.body;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: "invalid_role",
        message: `Role must be one of: ${VALID_ROLES.join(", ")}`,
      });
    }

    const member = await prisma.teamMember.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: "not_found" });
    if (member.role === "OWNER") return res.status(403).json({ error: "cannot_change_owner" });

    await prisma.teamMember.update({
      where: { id: req.params.id },
      data: { role },
    });

    res.json({ updated: true });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const member = await prisma.teamMember.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: "not_found" });

    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchant!.id } });
    if (member.email === merchant?.email) return res.status(403).json({ error: "cannot_remove_self" });

    await prisma.teamMember.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(422).json({ error: "remove_failed", message: err.message });
  }
});

router.post("/:id/resend-invite", async (req: Request, res: Response) => {
  try {
    const member = await prisma.teamMember.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: "not_found" });

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await prisma.teamMember.update({
      where: { id: req.params.id },
      data: { expiresAt },
    });

    console.log(`[Invite] Re-sent invitation to ${member.email} for merchant ${req.merchant!.id}`);

    res.json({ sent: true, expiresAt });
  } catch (err: any) {
    res.status(422).json({ error: "resend_failed", message: err.message });
  }
});

export default router;
