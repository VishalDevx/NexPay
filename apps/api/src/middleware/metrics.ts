import { Request, Response, NextFunction } from "express";
import { metrics } from "../modules/metrics/metrics";
import { v4 as uuidv4 } from "uuid";

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.headers["x-request-id"]) {
    req.headers["x-request-id"] = uuidv4();
  }

  const start = Date.now();
  const chunks: Buffer[] = [];
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    if (body && typeof body === "object") {
      const serialized = JSON.stringify(body);
      chunks.push(Buffer.from(serialized));
    }
    return originalJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const method = req.method;
    const path = req.route?.path || req.path;
    const statusCode = String(res.statusCode);

    metrics.incrementCounter("api_requests_total", { method, path, status_code: statusCode });
    metrics.observeHistogram("api_request_duration_ms", duration, { method, path });

    const h = metrics.getHistogram(`api_request_duration_ms{method=${method},path=${path}`);
    if (h.count > 0) {
      metrics.setGauge("api_latency_p50", h.p50);
      metrics.setGauge("api_latency_p95", h.p95);
      metrics.setGauge("api_latency_p99", h.p99);
    }

    metrics.setGauge("error_rate", calculateErrorRate());

    const merchantId = (req as any).merchant?.id;
    if (merchantId) {
      let responseBody: any = undefined;
      if (chunks.length > 0) {
        try {
          responseBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {}
      }
      metrics.recordApiLog({
        id: (req.headers["x-request-id"] as string) || uuidv4(),
        merchantId,
        method,
        path,
        status: res.statusCode,
        duration,
        requestBody: (req as any).body,
        responseBody,
        timestamp: new Date(),
      });
    }
  });

  next();
}

function calculateErrorRate(): number {
  const total = metrics.getCounter("api_requests_total");
  if (total === 0) return 0;

  let errors = 0;
  const allCounters = metrics.getAllMetrics().counters;
  for (const [k, v] of Object.entries(allCounters)) {
    if (k.startsWith("api_requests_total") && k.includes("status_code=5")) {
      errors += v;
    }
  }

  return Math.round((errors / total) * 10000) / 100;
}
