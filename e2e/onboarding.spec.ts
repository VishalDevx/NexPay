import { test, expect } from "@playwright/test";
import { seededMerchant } from "./helpers";

test.describe("Merchant Onboarding", () => {
  test("registration form shows all required fields", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByPlaceholder(/acme inc/i)).toBeVisible();
    await expect(page.getByPlaceholder(/you@company\.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/min\. 8 characters/i)).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeVisible();
    await expect(page.getByText(/terms of service/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("registration form validates required fields", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("registration with new merchant leads to OTP verification", async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@test.nexpay.dev`;

    await page.goto("/register");

    await page.getByPlaceholder(/acme inc/i).fill("E2E Test Merchant");
    await page.getByPlaceholder(/you@company\.com/i).fill(uniqueEmail);
    await page.locator('input[placeholder="Min. 8 characters"]').fill("TestPass123!");

    const confirmInputs = page.locator('input[type="password"]');
    await confirmInputs.nth(1).fill("TestPass123!");

    await page.getByRole("combobox").first().selectOption("US");
    await page.getByRole("combobox").nth(1).selectOption("individual");
    await page.getByRole("checkbox").check();

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/verify your email/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(uniqueEmail)).toBeVisible();
  });

  test("complete registration with OTP bypass", async ({ page }) => {
    const uniqueEmail = `e2e-complete-${Date.now()}@test.nexpay.dev`;

    await page.goto("/register");

    await page.getByPlaceholder(/acme inc/i).fill("Complete E2E Merchant");
    await page.getByPlaceholder(/you@company\.com/i).fill(uniqueEmail);
    await page.locator('input[placeholder="Min. 8 characters"]').fill("TestPass123!");

    const confirmInputs = page.locator('input[type="password"]');
    await confirmInputs.nth(1).fill("TestPass123!");

    await page.getByRole("combobox").first().selectOption("US");
    await page.getByRole("combobox").nth(1).selectOption("individual");
    await page.getByRole("checkbox").check();

    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/verify your email/i)).toBeVisible({ timeout: 10000 });

    for (let i = 0; i < 6; i++) {
      await page.locator(`#otp-${i}`).fill("0");
    }

    await page.getByRole("button", { name: /verify email/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test("login with seeded merchant credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder(/you@company\.com/i).fill(seededMerchant.email);
    await page.getByPlaceholder(/enter your password/i).fill(seededMerchant.password);

    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText(/acme corp/i)).toBeVisible({ timeout: 10000 });
  });

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder(/you@company\.com/i).fill(seededMerchant.email);
    await page.getByPlaceholder(/enter your password/i).fill("wrongpassword123");

    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10000 });
  });

  test("dashboard loads with merchant name and key metrics", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder(/you@company\.com/i).fill(seededMerchant.email);
    await page.getByPlaceholder(/enter your password/i).fill(seededMerchant.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    await expect(page.getByText(/total revenue/i).or(page.getByText(/successful/i))).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/wallet/i).or(page.getByText(/balance/i))).toBeVisible({ timeout: 5000 });
  });

  test("navigation sidebar is accessible after login", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder(/you@company\.com/i).fill(seededMerchant.email);
    await page.getByPlaceholder(/enter your password/i).fill(seededMerchant.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const transactionsLink = page.getByRole("link", { name: /transactions/i });
    await expect(transactionsLink).toBeVisible({ timeout: 5000 });
  });
});
