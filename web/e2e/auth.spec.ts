// web/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

// Override storageState — this test must be unauthenticated
test.use({ storageState: undefined })

test('redirects to /password when not authenticated', async ({ page }) => {
  await page.goto('/gallery')
  await expect(page).toHaveURL('/password')
  await expect(page.getByText('Enter the password to continue')).toBeVisible()
})
