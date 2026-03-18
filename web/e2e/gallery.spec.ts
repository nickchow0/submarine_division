// web/e2e/gallery.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Gallery', () => {
  test('loads and shows at least one photo', async ({ page }) => {
    await page.goto('/gallery')
    // Wait for at least one photo image to appear
    const photos = page.locator('img[alt]').first()
    await expect(photos).toBeVisible({ timeout: 15_000 })
  })

  test('filters photos when a search query is typed', async ({ page }) => {
    await page.goto('/gallery')

    // Wait for photos to load
    await page.locator('img[alt]').first().waitFor({ timeout: 15_000 })
    const initialCount = await page.locator('img[alt]').count()

    // Type into the search box
    const searchInput = page.getByRole('textbox')
    await searchInput.fill('shark')

    // Wait for the debounce (150ms) + any re-render
    await page.waitForTimeout(300)

    // Either fewer photos shown, or the no-results message appeared
    const afterCount = await page.locator('img[alt]').count()
    const noResults = page.getByText(/no photos match/i)

    const filtered = afterCount < initialCount || (await noResults.isVisible())
    expect(filtered).toBe(true)
  })

  test('opens the photo modal when a photo is clicked', async ({ page }) => {
    await page.goto('/gallery')
    await page.locator('img[alt]').first().waitFor({ timeout: 15_000 })

    // Click the first photo card (the wrapping div, not the img itself)
    await page.locator('img[alt]').first().click()

    // Modal should be visible — identified by the close button
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible()
  })

  test('navigates to the next photo in the modal', async ({ page }) => {
    await page.goto('/gallery')

    // Wait for at least 2 photos — navigation requires a next photo to exist
    await page.locator('img[alt]').nth(1).waitFor({ timeout: 15_000 })

    // Open modal on the first photo
    await page.locator('img[alt]').first().click()
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible()

    // Get the current photo alt text
    const modalImg = page.locator('.fixed img').first()
    const firstAlt = await modalImg.getAttribute('alt')

    // Next button must be present and clickable (we confirmed ≥2 photos above)
    const nextButton = page.getByRole('button', { name: 'Next photo' })
    await expect(nextButton).toBeVisible()
    await nextButton.click()

    await expect(modalImg).not.toHaveAttribute('alt', firstAlt!)
  })

  test('closes the modal when Escape is pressed', async ({ page }) => {
    await page.goto('/gallery')
    await page.locator('img[alt]').first().waitFor({ timeout: 15_000 })

    // Open modal
    await page.locator('img[alt]').first().click()
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Modal should be gone
    await expect(page.getByRole('button', { name: 'Close' })).not.toBeVisible()
  })
})
