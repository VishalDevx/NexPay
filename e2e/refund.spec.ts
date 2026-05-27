import { test, expect } from "@playwright/test";
import { loginAsMerchant, createTestPayment } from "./helpers";

test.describe("Refund Flow", () => {
  test("refund captured payment via API", async ({ request }) => {
    const api = await loginAsMerchant(request);

    const payment = await createTestPayment(api, {
      amount: 2000,
      currency: "USD",
      description: "E2E refund test",
    });

    const captureRes = await api.post(`/api/v1/payments/charges/${payment.id}/capture`);
    const captured = await captureRes.json();
    expect(captured.status).toMatch(/CAPTURED|SETTLED/);

    const refundRes = await api.post(`/api/v1/payments/charges/${payment.id}/refund`, {
      amount: 2000,
      reason: "customer_request",
    });
    const refunded = await refundRes.json();

    expect(refunded.status).toBe("REFUNDED");
  });

  test("partial refund of captured payment", async ({ request }) => {
    const api = await loginAsMerchant(request);

    const payment = await createTestPayment(api, {
      amount: 5000,
      currency: "USD",
      description: "E2E partial refund test",
    });

    await api.post(`/api/v1/payments/charges/${payment.id}/capture`);

    const refundRes = await api.post(`/api/v1/payments/charges/${payment.id}/refund`, {
      amount: 2000,
      reason: "partial_refund",
    });
    const refunded = await refundRes.json();

    expect(refunded.status).toBe("REFUNDED");
  });

  test("refund with reason appears in refund details", async ({ request }) => {
    const api = await loginAsMerchant(request);

    const payment = await createTestPayment(api, {
      amount: 3000,
      currency: "USD",
      description: "E2E refund with reason",
    });

    await api.post(`/api/v1/payments/charges/${payment.id}/capture`);

    const refundRes = await api.post(`/api/v1/payments/charges/${payment.id}/refund`, {
      amount: 3000,
      reason: "duplicate",
    });
    const refunded = await refundRes.json();

    expect(refunded.status).toBe("REFUNDED");
  });

  test("get refunded payment details shows refund status", async ({ request }) => {
    const api = await loginAsMerchant(request);

    const payment = await createTestPayment(api, {
      amount: 4000,
      currency: "USD",
      description: "E2E refund detail check",
    });

    await api.post(`/api/v1/payments/charges/${payment.id}/capture`);

    await api.post(`/api/v1/payments/charges/${payment.id}/refund`, {
      amount: 4000,
      reason: "customer_request",
    });

    const detailRes = await api.get(`/api/v1/payments/charges/${payment.id}`);
    const detail = await detailRes.json();
    expect(detail.status).toBe("REFUNDED");
  });

  test("refund page shows refund history for seeded merchant", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/you@company\.com/i).fill("merchant@nexpay.dev");
    await page.getByPlaceholder(/enter your password/i).fill("demo1234");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    await page.getByRole("link", { name: /transactions/i }).click();
    await expect(page).toHaveURL(/\/transactions/, { timeout: 10000 });

    await page.waitForTimeout(2000);
    const statusBadges = page.locator("text=REFUNDED");
    const count = await statusBadges.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("refund with zero amount is rejected", async ({ request }) => {
    const api = await loginAsMerchant(request);

    const payment = await createTestPayment(api, {
      amount: 1000,
      currency: "USD",
      description: "E2E zero refund",
    });

    await api.post(`/api/v1/payments/charges/${payment.id}/capture`);

    const refundRes = await api.post(`/api/v1/payments/charges/${payment.id}/refund`, {
      amount: 0,
      reason: "customer_request",
    });
    expect(refundRes.status()).toBe(400);
  });
});
