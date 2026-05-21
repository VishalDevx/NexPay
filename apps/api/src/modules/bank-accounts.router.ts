import { Router, Request, Response } from "express";
import { prisma } from "../config/db";
import crypto from "crypto";

const router = Router();

function maskAccountNumber(acc: string): string {
  return acc.length > 4 ? "XXXX" + acc.slice(-4) : acc;
}

function validateIfsc(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const { accountNumber, ifsc, accountHolder } = req.body;

    if (!accountNumber || !ifsc) {
      return res.status(400).json({ error: "missing_fields", message: "accountNumber and ifsc required" });
    }

    if (!validateIfsc(ifsc)) {
      return res.status(400).json({ error: "invalid_ifsc", message: "IFSC must be 4 letters + 7 characters (e.g. HDFC0001234)" });
    }

    const verificationRef = crypto.randomInt(100, 999).toString();

    const bankAccount = await prisma.bankAccount.create({
      data: {
        merchantId: req.merchant!.id,
        accountNumber,
        ifsc,
        accountHolder: accountHolder || null,
        verified: false,
        verificationRef,
      },
    });

    res.status(201).json({
      id: bankAccount.id,
      ifsc: bankAccount.ifsc,
      accountHolder: bankAccount.accountHolder,
      verificationRef,
      message: "Bank account added. Verify by providing the two deposit amounts.",
    });
  } catch (err: any) {
    res.status(422).json({ error: "bank_account_failed", message: err.message });
  }
});

router.post("/:id/verify", async (req: Request, res: Response) => {
  try {
    const { amount1, amount2 } = req.body;

    if (!amount1 || !amount2) {
      return res.status(400).json({ error: "missing_fields", message: "amount1 and amount2 required" });
    }

    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (!bankAccount) {
      return res.status(404).json({ error: "not_found", message: "Bank account not found" });
    }

    if (bankAccount.verified) {
      return res.status(409).json({ error: "already_verified", message: "Bank account is already verified" });
    }

    const ref = bankAccount.verificationRef || "";
    const expected1 = parseInt(ref[0] + ref[1], 10);
    const expected2 = parseInt(ref[1] + ref[2], 10);

    if (Number(amount1) !== expected1 || Number(amount2) !== expected2) {
      return res.status(400).json({ error: "verification_failed", message: "Deposit amounts do not match" });
    }

    const updated = await prisma.bankAccount.update({
      where: { id: req.params.id },
      data: { verified: true, verificationRef: null },
    });

    res.json({
      verified: true,
      bankName: updated.bankName || "Unknown",
      accountHolder: updated.accountHolder || "Unknown",
    });
  } catch (err: any) {
    res.status(422).json({ error: "verification_failed", message: err.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { createdAt: "desc" },
    });

    const data = accounts.map((a) => ({
      id: a.id,
      accountNumber: maskAccountNumber(a.accountNumber),
      ifsc: a.ifsc,
      bankName: a.bankName,
      isPrimary: a.isPrimary,
      verified: a.verified,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.patch("/:id/primary", async (req: Request, res: Response) => {
  try {
    const account = await prisma.bankAccount.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (!account) {
      return res.status(404).json({ error: "not_found", message: "Bank account not found" });
    }

    await prisma.$transaction([
      prisma.bankAccount.updateMany({
        where: { merchantId: req.merchant!.id, isPrimary: true },
        data: { isPrimary: false },
      }),
      prisma.bankAccount.update({
        where: { id: req.params.id },
        data: { isPrimary: true },
      }),
    ]);

    res.json({ success: true });
  } catch (err: any) {
    res.status(422).json({ error: "update_failed", message: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const account = await prisma.bankAccount.findFirst({
      where: { id: req.params.id, merchantId: req.merchant!.id },
    });

    if (!account) {
      return res.status(404).json({ error: "not_found", message: "Bank account not found" });
    }

    if (account.isPrimary) {
      const primaryCount = await prisma.bankAccount.count({
        where: { merchantId: req.merchant!.id, isPrimary: true },
      });

      if (primaryCount <= 1) {
        return res.status(409).json({ error: "cannot_remove_primary", message: "Cannot remove the only primary bank account" });
      }
    }

    await prisma.bankAccount.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (err: any) {
    res.status(422).json({ error: "delete_failed", message: err.message });
  }
});

export default router;
