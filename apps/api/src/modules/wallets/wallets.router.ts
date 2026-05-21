import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { walletService } from "./wallets.service";

const router = Router();

router.get("/balance", async (req: Request, res: Response) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { merchantId: req.merchant!.id },
    });

    const balances = await Promise.all(
      wallets.map(async (w) => ({
        currency: w.currency,
        balance: await walletService.getBalance(w.id),
      }))
    );

    res.json({ data: balances });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.post("/load", async (req: Request, res: Response) => {
  try {
    const { currency, amount } = req.body;
    const txn = await walletService.load(req.merchant!.id, currency, amount);
    res.status(201).json(txn);
  } catch (err: any) {
    res.status(422).json({ error: "load_failed", message: err.message });
  }
});

router.post("/withdraw", async (req: Request, res: Response) => {
  try {
    const { currency, amount } = req.body;
    const txn = await walletService.withdraw(req.merchant!.id, currency, amount);
    res.json(txn);
  } catch (err: any) {
    res.status(422).json({ error: "withdraw_failed", message: err.message });
  }
});

export default router;
