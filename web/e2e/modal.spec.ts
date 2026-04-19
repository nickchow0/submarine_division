// web/e2e/modal.spec.ts
// Tests for modal behaviour: URL sync, keyboard navigation, close button.
import { test, expect } from "@playwright/test";

test.describe("Modal URL sync", () => {
  test("URL updates to /photo/[id] when a photo is opened", async ({
    page,
  }) => {
    await page.goto("/portfolio");
    await page.locator("img[alt]").first().waitFor({ timeout: 15_000 });

    await page.locator("img[alt]").first().click();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

    expect(page.url()).toMatch(/\/photo\/.+/);
  });

  test("URL restores to /portfolio when modal is closed", async ({ page }) => {
    await page.goto("/portfolio");
    await page.locator("img[alt]").first().waitFor({ timeout: 15_000 });

    await page.locator("img[alt]").first().click();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(
      page.getByRole("button", { name: "Close" }),
    ).not.toBeVisible();

    expect(page.url()).toMatch(/\/portfolio$/);
  });

  test("browser back closes the modal and restores /portfolio", async ({
    page,
  }) => {
    await page.goto("/portfolio");
    await page.locator("img[alt]").first().waitFor({ timeout: 15_000 });

    await page.locator("img[alt]").first().click();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    expect(page.url()).toMatch(/\/photo\/.+/);

    await page.goBack();
    await expect(
      page.getByRole("button", { name: "Close" }),
    ).not.toBeVisible();
    expect(page.url()).toMatch(/\/portfolio$/);
  });
});

test.describe("Modal keyboard navigation", () => {
  test("ArrowRight navigates to the next photo", async ({ page }) => {
    await page.goto("/portfolio");
    await page.locator("img[alt]").nth(1).waitFor({ timeout: 15_000 });

    await page.locator("img[alt]").first().click();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

    const firstUrl = page.url();

    await page.keyboard.press("ArrowRight");

    // URL should change to a different /photo/[id]
    await expect(page).toHaveURL(/\/photo\/.+/);
    expect(page.url()).not.toBe(firstUrl);
  });

  test("ArrowLeft navigates to the previous photo", async ({ page }) => {
    await page.goto("/portfolio");
    await page.locator("img[alt]").nth(1).waitFor({ timeout: 15_000 });

    // Open the second photo so there is a previous one
    await page.locator("img[alt]").nth(1).click();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/photo\/.+/);
    const afterNextUrl = page.url();

    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(/\/photo\/.+/);
    expect(page.url()).not.toBe(afterNextUrl);
  });
});

test.describe("Modal close button", () => {
  test("closes the modal when the close button is clicked", async ({
    page,
  }) => {
    await page.goto("/portfolio");
    await page.locator("img[alt]").first().waitFor({ timeout: 15_000 });

    await page.locator("img[alt]").first().click();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(
      page.getByRole("button", { name: "Close" }),
    ).not.toBeVisible();
  });
});
