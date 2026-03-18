// web/e2e/photo.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Photo page', () => {
  test('renders the photo and metadata when visited directly', async ({ page }) => {
    // First, find a real photo ID by opening the gallery and clicking a photo
    await page.goto('/gallery')
    await page.locator('img[alt]').first().waitFor({ timeout: 15_000 })
    await page.locator('img[alt]').first().click()

    // The URL updates to /photo/[id] via History.prototype.pushState — Playwright's
    // waitForURL may not fire for native pushState changes, so wait for a DOM
    // signal instead: the modal close button confirming the modal is open.
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible({ timeout: 5_000 })
    const photoUrl = page.url()

    // Navigate directly (hard navigation) to the photo URL
    await page.goto(photoUrl)

    // Photo should be rendered with an image
    const photoImg = page.locator('main img, article img, .max-w-5xl img').first()
    await expect(photoImg).toBeVisible({ timeout: 10_000 })

    // Back to gallery link should be present
    await expect(page.getByText('Back to gallery')).toBeVisible()
  })
})

test.describe('About page', () => {
  test('renders without errors', async ({ page }) => {
    const response = await page.goto('/about')
    expect(response?.status()).toBeLessThan(400)
    // Page should have some content
    await expect(page.locator('body')).not.toBeEmpty()
  })
})
