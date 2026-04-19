// web/e2e/tag-filter.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Tag filter", () => {
  test("clicking a tag filters the photo grid", async ({ page }) => {
    await page.goto("/portfolio");
    await page.locator("img[alt]").first().waitFor({ timeout: 15_000 });

    const initialCount = await page.locator("img[alt]").count();

    // Find any tag badge and click it
    const firstTag = page.locator(".tag-badge").first();
    // Skip if there are no tags (unlikely in real data but guards the test)
    const tagCount = await firstTag.count();
    if (tagCount === 0) return;

    const tagName = await firstTag.textContent();
    await firstTag.click();

    await page.waitForTimeout(300);

    const afterCount = await page.locator("img[alt]").count();
    const noResults = page.getByText(/no photos match/i);

    // Either fewer photos or no-results message
    const filtered =
      afterCount < initialCount || (await noResults.isVisible());
    expect(filtered).toBe(true);

    // The active tag label should appear somewhere on the page
    if (tagName) {
      await expect(page.getByText(tagName).first()).toBeVisible();
    }
  });

  test("clicking the active tag again clears the filter", async ({ page }) => {
    await page.goto("/portfolio");
    await page.locator("img[alt]").first().waitFor({ timeout: 15_000 });

    const initialCount = await page.locator("img[alt]").count();

    const firstTag = page.locator(".tag-badge").first();
    if ((await firstTag.count()) === 0) return;

    // Activate filter
    await firstTag.click();
    await page.waitForTimeout(300);

    // Deactivate by clicking the same tag again
    await firstTag.click();
    await page.waitForTimeout(300);

    const afterCount = await page.locator("img[alt]").count();
    expect(afterCount).toBe(initialCount);
  });
});
