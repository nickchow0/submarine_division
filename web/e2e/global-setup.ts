// web/e2e/global-setup.ts
import { chromium, type FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  const password = process.env.SITE_PASSWORD

  if (!password) {
    throw new Error(
      'SITE_PASSWORD env var is required for E2E tests. ' +
      'Add it to web/.env.local (it is already in .gitignore).'
    )
  }

  const browser = await chromium.launch()
  const context = await browser.newContext()

  // POST /api/auth — sets the site_access=granted cookie server-side
  const response = await context.request.post(`${baseURL}/api/auth`, {
    data: { password },
  })

  if (!response.ok()) {
    throw new Error(
      `Authentication failed: POST /api/auth returned ${response.status()}. ` +
      'Check that SITE_PASSWORD is correct.'
    )
  }

  // Save cookies to storage state file for use by authenticated tests
  await context.storageState({ path: 'playwright/.auth/user.json' })
  await browser.close()
}

export default globalSetup
