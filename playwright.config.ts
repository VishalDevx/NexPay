import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"], ["html", { outputFolder: "e2e-report" }]],
  timeout: 60000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "npm run dev -w @nexpay/api",
          port: 3001,
          timeout: 30000,
          reuseExistingServer: true,
          env: {
            NODE_ENV: "development",
            BYPASS_OTP: "true",
          },
        },
      ],
});
