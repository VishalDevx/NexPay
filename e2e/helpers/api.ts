import { APIRequestContext } from "@playwright/test";

const API_URL = process.env.E2E_API_URL || "http://localhost:3001";

export class ApiClient {
  private token: string | null = null;

  constructor(private request: APIRequestContext) {}

  setToken(token: string) {
    this.token = token;
  }

  async post(path: string, body?: Record<string, unknown>, opts?: { apiKey?: string }) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    if (opts?.apiKey) headers["x-api-key"] = opts.apiKey;
    return this.request.post(`${API_URL}${path}`, { headers, data: body });
  }

  async get(path: string, opts?: { apiKey?: string }) {
    const headers: Record<string, string> = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    if (opts?.apiKey) headers["x-api-key"] = opts.apiKey;
    return this.request.get(`${API_URL}${path}`, { headers });
  }
}

export const seededMerchant = {
  email: "merchant@nexpay.dev",
  password: "demo1234",
  name: "Acme Corp",
};

export const seededAdmin = {
  email: "admin@nexpay.dev",
  password: "demo1234",
  name: "NexPay Admin",
};

export async function loginAsMerchant(request: APIRequestContext) {
  const api = new ApiClient(request);
  const res = await api.post("/api/v1/merchants/auth/login", {
    email: seededMerchant.email,
    password: seededMerchant.password,
  });
  const data = await res.json();
  api.setToken(data.token);
  return api;
}

export async function createTestPayment(api: ApiClient, overrides?: Record<string, unknown>) {
  const res = await api.post("/api/v1/payments/charges", {
    amount: 5000,
    currency: "USD",
    customer_id: "e2e-test-customer",
    payment_method: "card",
    description: "E2E test payment",
    metadata: { source: "e2e-test" },
    ...overrides,
  });
  return res.json();
}
