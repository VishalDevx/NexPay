import { Router, Request, Response } from "express";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";

const router = Router();

router.get("/revenue", async (req: Request, res: Response) => {
  try {
    const { period, startDate, endDate } = req.query;
    const where: any = {
      merchantId: req.merchant!.id,
      status: "SETTLED",
    };
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    const payments = await prisma.payment.findMany({ where, orderBy: { createdAt: "asc" } });

    const fmt = period === "weekly" ? "week" : period === "monthly" ? "month" : "day";
    const grouped: Record<string, { revenue: number; count: number; amounts: number[] }> = {};

    for (const p of payments) {
      const d = new Date(p.createdAt);
      const key =
        fmt === "week"
          ? `${d.getFullYear()}-W${Math.ceil((d.getDate() + (d.getDay() + 1) - 1) / 7)}`
          : fmt === "month"
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
            : d.toISOString().slice(0, 10);

      if (!grouped[key]) grouped[key] = { revenue: 0, count: 0, amounts: [] };
      grouped[key].revenue += Number(p.amount);
      grouped[key].count += 1;
      grouped[key].amounts.push(Number(p.amount));
    }

    const data = Object.entries(grouped).map(([date, g]) => ({
      date,
      revenue: g.revenue,
      count: g.count,
      avgTicket: g.count > 0 ? Math.round((g.revenue / g.count) * 100) / 100 : 0,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/funnel", async (req: Request, res: Response) => {
  try {
    const stages = ["INITIATED", "PROCESSING", "AUTHORIZED", "CAPTURED", "SETTLED"];
    const payments = await prisma.payment.findMany({
      where: { merchantId: req.merchant!.id },
      select: { status: true },
    });

    const counts: Record<string, number> = {};
    for (const p of payments) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }

    const data = stages.map((stage, i) => {
      const count = counts[stage] || 0;
      const prevCount = i > 0 ? counts[stages[i - 1]] || 0 : count;
      const dropOff = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;
      return { stage, count, dropOff: Math.round(dropOff * 100) / 100 };
    });

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/latency", async (_req: Request, res: Response) => {
  try {
    const keys = await redis.keys("latency:*");
    const data: { endpoint: string; p50: number; p95: number; p99: number; count: number }[] = [];

    for (const key of keys) {
      const endpoint = key.replace("latency:", "");
      const values = (await redis.lrange(key, 0, -1)).map(Number);
      if (values.length === 0) continue;

      values.sort((a, b) => a - b);
      const len = values.length;
      data.push({
        endpoint,
        p50: values[Math.floor(len * 0.5)],
        p95: values[Math.floor(len * 0.95)],
        p99: values[Math.floor(len * 0.99)],
        count: len,
      });
    }

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/failure-reasons", async (req: Request, res: Response) => {
  try {
    const failed = await prisma.payment.findMany({
      where: { merchantId: req.merchant!.id, status: "FAILED" },
      select: { description: true },
    });

    const reasons: Record<string, number> = {};
    for (const p of failed) {
      const reason = p.description || "unknown";
      reasons[reason] = (reasons[reason] || 0) + 1;
    }

    const total = failed.length;
    const data = Object.entries(reasons).map(([reason, count]) => ({
      reason,
      count,
      percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/retry-analytics", async (req: Request, res: Response) => {
  try {
    const events = await prisma.paymentEvent.findMany({
      where: { payment: { merchantId: req.merchant!.id } },
      orderBy: { createdAt: "asc" },
    });

    const retries: Record<number, { success: number; fail: number }> = {};
    const seen = new Set<string>();

    for (const ev of events) {
      if (ev.fromStatus === "FAILED" && ev.toStatus !== "FAILED") {
        const key = ev.paymentId;
        if (!seen.has(key)) {
          seen.add(key);
        }
        const attempt = seen.size;
        if (!retries[attempt]) retries[attempt] = { success: 0, fail: 0 };
        retries[attempt].success += 1;
      } else if (ev.toStatus === "FAILED") {
        seen.delete(ev.paymentId);
      }
    }

    const data = Object.entries(retries).map(([attempt, vals]) => ({
      attempt: Number(attempt),
      successCount: vals.success,
      failCount: vals.fail,
      successRate: vals.success + vals.fail > 0
        ? Math.round((vals.success / (vals.success + vals.fail)) * 10000) / 100
        : 0,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/chargeback-rate", async (req: Request, res: Response) => {
  try {
    const disputes = await prisma.dispute.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { createdAt: "asc" },
    });

    const payments = await prisma.payment.findMany({
      where: { merchantId: req.merchant!.id },
      select: { createdAt: true },
    });

    const monthly: Record<string, { disputes: number; total: number }> = {};

    for (const d of disputes) {
      const key = d.createdAt.toISOString().slice(0, 7);
      if (!monthly[key]) monthly[key] = { disputes: 0, total: 0 };
      monthly[key].disputes += 1;
    }

    for (const p of payments) {
      const key = p.createdAt.toISOString().slice(0, 7);
      if (!monthly[key]) monthly[key] = { disputes: 0, total: 0 };
      monthly[key].total += 1;
    }

    const data = Object.entries(monthly).map(([month, vals]) => ({
      month,
      totalTransactions: vals.total,
      disputes: vals.disputes,
      rate: vals.total > 0 ? Math.round((vals.disputes / vals.total) * 10000) / 100 : 0,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/geo", async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { merchantId: req.merchant!.id },
      select: { metadata: true, amount: true },
    });

    const geo: Record<string, { count: number; volume: number }> = {};

    for (const p of payments) {
      const meta = p.metadata as any;
      const country = meta?.country || "unknown";
      if (!geo[country]) geo[country] = { count: 0, volume: 0 };
      geo[country].count += 1;
      geo[country].volume += Number(p.amount);
    }

    const data = Object.entries(geo).map(([country, vals]) => ({
      country,
      count: vals.count,
      volume: vals.volume,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/devices", async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { merchantId: req.merchant!.id },
      select: { metadata: true, status: true },
    });

    const devices: Record<string, { count: number; failures: number }> = {};

    for (const p of payments) {
      const meta = p.metadata as any;
      const deviceType = meta?.device || meta?.deviceType || "unknown";
      if (!devices[deviceType]) devices[deviceType] = { count: 0, failures: 0 };
      devices[deviceType].count += 1;
      if (p.status === "FAILED") devices[deviceType].failures += 1;
    }

    const data = Object.entries(devices).map(([deviceType, vals]) => ({
      deviceType,
      count: vals.count,
      failureRate: vals.count > 0 ? Math.round((vals.failures / vals.count) * 10000) / 100 : 0,
    }));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/cohorts", async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { merchantId: req.merchant!.id },
      include: { payments: { select: { amount: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    });

    const cohorts: Record<string, Record<string, { revenue: number; customers: Set<string> }>> = {};

    for (const c of customers) {
      const cohort = c.createdAt.toISOString().slice(0, 7);

      for (const p of c.payments) {
        const period = p.createdAt.toISOString().slice(0, 7);
        if (!cohorts[cohort]) cohorts[cohort] = {};
        if (!cohorts[cohort][period]) cohorts[cohort][period] = { revenue: 0, customers: new Set() };
        cohorts[cohort][period].revenue += Number(p.amount);
        cohorts[cohort][period].customers.add(c.id);
      }
    }

    const data: { cohort: string; period: string; revenue: number; customers: number }[] = [];
    for (const [cohort, periods] of Object.entries(cohorts)) {
      for (const [period, vals] of Object.entries(periods)) {
        data.push({ cohort, period, revenue: vals.revenue, customers: vals.customers.size });
      }
    }

    data.sort((a, b) => a.cohort.localeCompare(b.cohort) || a.period.localeCompare(b.period));

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

router.get("/mrr", async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { merchantId: req.merchant!.id, status: "SETTLED" },
      select: { amount: true, createdAt: true, metadata: true },
    });

    const monthly: Record<string, number> = {};
    for (const p of payments) {
      const key = p.createdAt.toISOString().slice(0, 7);
      monthly[key] = (monthly[key] || 0) + Number(p.amount);
    }

    const months = Object.keys(monthly).sort();
    const currentMonth = months[months.length - 1] || new Date().toISOString().slice(0, 7);
    const prevMonth = months[months.length - 2] || currentMonth;

    const mrr = monthly[currentMonth] || 0;
    const prevMrr = monthly[prevMonth] || 0;
    const growth = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0;

    res.json({
      mrr,
      arr: mrr * 12,
      growth: Math.round(growth * 100) / 100,
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
