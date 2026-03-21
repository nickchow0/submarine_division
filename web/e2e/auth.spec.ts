// web/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

// Override storageState with an empty object — this test must be unauthenticated.
// storageState: undefined does NOT clear the project-level default in Playwright 1.58;
// passing an empty state object is the correct way to opt out of pre-populated cookies.
test.use({ storageState: { cookies: [], origins: [] } });

test("redirects to /password when not authenticated", async ({ page }) => {
  await page.goto("/gallery");
  await expect(page).toHaveURL("/password");
  await expect(page.getByText("Enter the password to continue")).toBeVisible();
});
