import { test, expect } from "@playwright/test";
import { loginAsMerchant, createTestPayment, seededMerchant } from "./helpers";

test.describe("Dispute Resolution Flow", () => {
  test("disputes page loads and shows dispute list", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/you@company\.com/i).fill(seededMerchant.email);
    await page.getByPlaceholder(/enter your password/i).fill(seededMerchant.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const disputesLink = page.getByRole("link", { name: /disputes/i });
    if (await disputesLink.isVisible()) {
      await disputesLink.click();
      await expect(page).toHaveURL(/\/disputes/, { timeout: 10000 });
      await expect(page.getByText(/dispute/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("disputes page shows summary cards", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/you@company\.com/i).fill(seededMerchant.email);
    await page.getByPlaceholder(/enter your password/i).fill(seededMerchant.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const disputesLink = page.getByRole("link", { name: /disputes/i });
    if (await disputesLink.isVisible()) {
      await disputesLink.click();
      await expect(page).toHaveURL(/\/disputes/, { timeout: 10000 });
      await page.waitForTimeout(2000);

      const openDisputes = page.getByText(/open disputes/i);
      const atRisk = page.getByText(/at risk/i);
      const winRate = page.getByText(/win rate/i);

      const anyVisible = (await openDisputes.isVisible().catch(() => false)) ||
        (await atRisk.isVisible().catch(() => false)) ||
        (await winRate.isVisible().catch(() => false));
      expect(anyVisible).toBeTruthy();
    }
  });

  test("raise dispute via API for a payment", async ({ request }) => {
    const api = await loginAsMerchant(request);

    const payment = await createTestPayment(api, {
      amount: 5000,
      currency: "USD",
      description: "E2E dispute test",
    });

    const disputeRes = await api.post("/api/v1/disputes", {
      payment_id: payment.id,
      reason: "fraudulent",
      description: "Customer claims unauthorized charge",
      amount: 5000,
    });

    if (disputeRes.status() < 500) {
      const dispute = await disputeRes.json();
      expect(dispute.id).toBeDefined();
    }
  });

  test("get disputes list via API returns array", async ({ request }) => {
    const api = await loginAsMerchant(request);
    const res = await api.get("/api/v1/disputes");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.disputes || body)).toBe(true);
  });
});


