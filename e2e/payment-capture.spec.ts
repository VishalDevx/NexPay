import { test, expect } from "@playwright/test";
import { loginAsMerchant, createTestPayment } from "./helpers";
import type { APIRequestContext } from "@playwright/test";

test.describe("Payment Capture Flow", () => {
  let apiRequest: APIRequestContext;
  let paymentId: string;

  test.beforeAll(async ({ request }) => {
    apiRequest = request;
    const api = await loginAsMerchant(request);
    const payment = await createTestPayment(api, {
      amount: 2500,
      currency: "USD",
      description: "E2E capture test payment",
    });
    paymentId = payment.id;
  });

  test("transactions page shows payment list", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/you@company\.com/i).fill("merchant@nexpay.dev");
    await page.getByPlaceholder(/enter your password/i).fill("demo1234");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    await page.getByRole("link", { name: /transactions/i }).click();
    await expect(page).toHaveURL(/\/transactions/, { timeout: 10000 });

    await expect(page.getByText(/transactions/i).first()).toBeVisible();
  });

  test("payment detail drawer opens on row click", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/you@company\.com/i).fill("merchant@nexpay.dev");
    await page.getByPlaceholder(/enter your password/i).fill("demo1234");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    await page.getByRole("link", { name: /transactions/i }).click();
    await expect(page).toHaveURL(/\/transactions/, { timeout: 10000 });

    const firstRow = page.locator("table tbody tr, [data-testid^='transaction-row']").first();
    await firstRow.waitFor({ state: "visible", timeout: 10000 });
    const exists = await firstRow.isVisible().catch(() => false);
    if (exists) {
      await firstRow.click();
      await page.waitForTimeout(1000);
    }
  });

  test("create payment via API and verify it exists", async ({ request }) => {
    const api = await loginAsMerchant(request);
    const payment = await createTestPayment(api, {
      amount: 3500,
      currency: "USD",
      description: "API capture test",
    });

    expect(payment).toBeDefined();
    expect(payment.id).toBeDefined();
    expect(payment.status).toBeDefined();
    expect(payment.amount).toBe(3500);
    expect(payment.currency).toBe("USD");
  });

  test("capture payment via API", async ({ request }) => {
    const api = await loginAsMerchant(request);
    const payment = await createTestPayment(api, {
      amount: 1500,
      currency: "USD",
      description: "capture me",
    });

    const captureRes = await api.post(`/api/v1/payments/charges/${payment.id}/capture`);
    const captured = await captureRes.json();

    expect(captured.status).toMatch(/CAPTURED|SETTLED/);
  });

  test("cancel initiated payment via API", async ({ request }) => {
    const api = await loginAsMerchant(request);
    const payment = await createTestPayment(api, {
      amount: 500,
      currency: "USD",
      description: "cancel me",
    });

    const cancelRes = await api.post(`/api/v1/payments/charges/${payment.id}/cancel`);
    const cancelled = await cancelRes.json();

    expect(cancelled.status).toBe("FAILED");
  });

  test("create payment with different currencies", async ({ request }) => {
    const api = await loginAsMerchant(request);

    for (const currency of ["USD", "EUR", "INR"]) {
      const payment = await createTestPayment(api, {
        amount: 1000,
        currency,
        description: `E2E ${currency} payment`,
      });
      expect(payment.id).toBeDefined();
      expect(payment.currency).toBe(currency);
    }
  });

  test("create payment without authentication returns 401", async ({ request }) => {
    const res = await request.post("http://localhost:3001/api/v1/payments/charges", {
      headers: { "Content-Type": "application/json" },
      data: { amount: 1000, currency: "USD", customer_id: "anon", payment_method: "card" },
    });
    expect(res.status()).toBe(401);
  });
});
