// web/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import path from "path";

// Load .env.local so SITE_PASSWORD and Sanity vars are available to
// globalSetup and the test process (Next.js loads this automatically
// for the dev server, but Playwright runs outside of Next.js).
config({ path: path.resolve(__dirname, ".env.local") });

// CI fallbacks — .env.local won't exist in GitHub Actions.
// REQUIRE_PASSWORD=true ensures the auth redirect test works.
// SITE_PASSWORD just needs to match what global-setup POSTs to /api/auth.
process.env.REQUIRE_PASSWORD ??= "true";
process.env.SITE_PASSWORD ??= "e2e-test-password";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",

  // All authenticated tests use saved storage state by default.
  // Individual tests can override this with `storageState: undefined`.
  use: {
    baseURL: "http://localhost:3001",
    storageState: "playwright/.auth/user.json",
    // Capture traces and screenshots on failure for debugging
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Automatically start next dev before running tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  // Fail fast in CI — no retries locally
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Serial execution — dev server is single-threaded
});
