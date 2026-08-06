const API = process.env.NEXT_PUBLIC_API_URL;

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nexpay_admin_token");
}

export function setAdminToken(token: string) {
  localStorage.setItem("nexpay_admin_token", token);
}

export function clearAdminToken() {
  localStorage.removeItem("nexpay_admin_token");
}

export async function adminFetch<T = unknown>(
  path: string,
  opts?: RequestInit & { token?: string | null }
): Promise<T> {
  const token = opts?.token ?? getAdminToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      "x-api-key": token || "",
      ...(opts?.headers as Record<string, string>),
    },
  });
  return res.json();
}

export const defaultHealth = {
  api: "healthy",
  database: "healthy",
  redis: "healthy",
  bullmq: [
    { queue: "webhook-delivery", depth: 0 },
    { queue: "payout-processing", depth: 0 },
    { queue: "reconciliation", depth: 0 },
  ],
  redisMetrics: { memory: "-", hitRate: "-", connections: 0 },
  db: { connections: 0, poolSize: 20, activeQueries: 0 },
  latency: { p50: "-", p95: "-", p99: "-" },
  errorRate: "-",
  lastReconciliation: new Date().toISOString(),
};
