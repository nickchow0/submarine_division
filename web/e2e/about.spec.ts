// web/e2e/about.spec.ts
import { test, expect } from "@playwright/test";

test.describe("About page", () => {
  test("renders bio, gear, and contact sections", async ({ page }) => {
    await page.goto("/about");

    await expect(page.getByRole("heading", { name: /about me/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /gear/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /get in touch/i })).toBeVisible();
  });

  test("shows both photos", async ({ page }) => {
    await page.goto("/about");

    const images = page.locator("img");
    await expect(images.first()).toBeVisible({ timeout: 10_000 });
    expect(await images.count()).toBeGreaterThanOrEqual(2);
  });

  test("instagram and email links are present", async ({ page }) => {
    await page.goto("/about");

    const instagram = page.locator('a[href*="instagram.com"]');
    const email = page.locator('a[href^="mailto:"]');

    await expect(instagram).toBeVisible();
    await expect(email).toBeVisible();
  });
});
