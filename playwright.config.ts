import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 1 : 1,
  reporter: CI ? [["github"], ["list"]] : [["list"], ["html", { outputFolder: "e2e-report" }]],
  timeout: 60000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: CI ? "retain-on-failure" : "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
});
