// web/e2e/photo.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Photo page", () => {
  test("opens the modal over the portfolio when visited directly", async ({
    page,
  }) => {
    // First, find a real photo ID by opening the portfolio and clicking a photo
    await page.goto("/portfolio");
    await page.locator("img[alt]").first().waitFor({ timeout: 15_000 });
    await page.locator("img[alt]").first().click();

    // The URL updates to /photo/[id] via History.prototype.pushState — Playwright's
    // waitForURL may not fire for native pushState changes, so wait for a DOM
    // signal instead: the modal close button confirming the modal is open.
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible({
      timeout: 5_000,
    });
    const photoUrl = page.url();

    // Navigate directly (hard navigation) to the photo URL
    await page.goto(photoUrl);

    // The modal should open automatically with the photo visible
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible({
      timeout: 10_000,
    });

    // The portfolio grid should be rendered in the background
    await expect(page.locator("img[alt]").first()).toBeVisible();
  });
});

