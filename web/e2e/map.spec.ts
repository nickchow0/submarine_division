// web/e2e/map.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Map page", () => {
  test("loads and renders the map container", async ({ page }) => {
    await page.goto("/map");

    // Leaflet renders a div with class "leaflet-container"
    const map = page.locator(".leaflet-container");
    await expect(map).toBeVisible({ timeout: 15_000 });
  });

  test("clicking a map pin opens the location panel", async ({ page }) => {
    await page.goto("/map");
    await page.locator(".leaflet-container").waitFor({ timeout: 15_000 });

    // If there are no pins the panel won't appear — skip gracefully
    const pins = page.locator(".leaflet-marker-icon");
    const pinCount = await pins.count();
    if (pinCount === 0) return;

    // force:true bypasses SVG path elements inside the marker that intercept pointer events
    await pins.first().click({ force: true });

    // The slide-in panel shows a heading with the pin name
    const panel = page.locator("h2").first();
    await expect(panel).toBeVisible({ timeout: 5_000 });
  });

  test("closing the location panel hides it", async ({ page }) => {
    await page.goto("/map");
    await page.locator(".leaflet-container").waitFor({ timeout: 15_000 });

    const pins = page.locator(".leaflet-marker-icon");
    if ((await pins.count()) === 0) return;

    // force:true bypasses SVG path elements inside the marker that intercept pointer events
    await pins.first().click({ force: true });
    await expect(page.locator("h2").first()).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /close/i }).click();
    await expect(page.locator("h2").first()).not.toBeVisible();
  });
});
