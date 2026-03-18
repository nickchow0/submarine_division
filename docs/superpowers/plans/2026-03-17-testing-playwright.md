# Testing — Plan 2: Playwright E2E Tests + GitHub Actions CI

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Playwright end-to-end tests covering key user flows and a GitHub Actions CI workflow that runs both Vitest and Playwright on every push.

**Architecture:** Playwright starts `next dev` automatically via `webServer` config. A `globalSetup` script POSTs to `POST /api/auth` with `SITE_PASSWORD` to set the `site_access` cookie, saving the storage state for all authenticated tests. The password gate test opts out of storage state. GitHub Actions runs Vitest first, then Playwright (gated on Vitest passing).

**Tech Stack:** Playwright (Chromium only), GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-17-testing-design.md`

**Prerequisite:** Plan 1 (Vitest) must be complete — `npm run test` must pass before starting this plan.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `web/package.json` | **Modify** | Add `test:e2e` and `test:e2e:ui` scripts |
| `web/playwright.config.ts` | **Create** | Playwright config: webServer, storageState, Chromium only |
| `web/e2e/global-setup.ts` | **Create** | Authenticates via POST /api/auth, saves storage state |
| `web/e2e/auth.spec.ts` | **Create** | Password gate test (unauthenticated) |
| `web/e2e/gallery.spec.ts` | **Create** | Gallery load, search, modal open/navigate/close |
| `web/e2e/photo.spec.ts` | **Create** | Direct photo page + about page |
| `web/playwright/.auth/` | **Create (gitignore)** | Directory for saved auth state (not committed) |
| `.github/workflows/test.yml` | **Create** | CI: unit tests then E2E tests |
| `.gitignore` (root) | **Modify** | Ignore `web/playwright/.auth/` and `web/playwright-report/` |

---

## Task 1: Install Playwright and configure

**Files:**
- Modify: `web/package.json`
- Create: `web/playwright.config.ts`
- Create: `web/e2e/global-setup.ts`

- [ ] **Step 1: Install Playwright**

```bash
cd web && npm install -D @playwright/test
npx playwright install chromium
```

Expected: Playwright installed, Chromium browser downloaded.

- [ ] **Step 2: Add `.auth` directory and update `.gitignore`**

Create the auth state directory:

```bash
mkdir -p web/playwright/.auth
echo "playwright/.auth/" >> web/.gitignore
echo "playwright-report/" >> web/.gitignore
echo "test-results/" >> web/.gitignore
```

- [ ] **Step 3: Create `web/e2e/global-setup.ts`**

This runs once before all tests. It POSTs to `/api/auth` with the site password and saves the resulting cookie as storage state.

```typescript
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
```

- [ ] **Step 4: Create `web/playwright.config.ts`**

```typescript
// web/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',

  // All authenticated tests use saved storage state by default.
  // Individual tests can override this with `storageState: undefined`.
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'playwright/.auth/user.json',
    // Capture traces and screenshots on failure for debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Automatically start next dev before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  // Fail fast in CI — no retries locally
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Serial execution — dev server is single-threaded
})
```

- [ ] **Step 5: Add scripts to `web/package.json`**

Add to the `"scripts"` section:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 6: Verify setup (no test files yet)**

```bash
cd web && npm run test:e2e
```

Expected: `No tests found` or similar — no crash, no auth error. If you see `SITE_PASSWORD env var is required`, add the password to `web/.env.local`.

- [ ] **Step 7: Commit**

```bash
git add web/playwright.config.ts web/e2e/global-setup.ts web/package.json web/package-lock.json web/.gitignore
git commit -m "feat(test): set up Playwright with globalSetup auth and webServer config"
```

---

## Task 2: Password gate test (unauthenticated)

**Files:**
- Create: `web/e2e/auth.spec.ts`

This test explicitly opts out of storage state so it hits the middleware without a cookie.

- [ ] **Step 1: Create the test file**

```typescript
// web/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

// Override storageState — this test must be unauthenticated
test.use({ storageState: undefined })

test('redirects to /password when not authenticated', async ({ page }) => {
  await page.goto('/gallery')
  await expect(page).toHaveURL('/password')
  await expect(page.getByText('Enter the password to continue')).toBeVisible()
})
```

- [ ] **Step 2: Run the test**

```bash
cd web && npm run test:e2e -- e2e/auth.spec.ts
```

Expected: `1 passed`.

- [ ] **Step 3: Commit**

```bash
git add web/e2e/auth.spec.ts
git commit -m "test(e2e): add password gate test"
```

---

## Task 3: Gallery E2E tests

**Files:**
- Create: `web/e2e/gallery.spec.ts`

These tests run with the authenticated storage state (default). The gallery page loads photos from Sanity — the E2E tests run against `next dev` which connects to the real Sanity dataset, so photos must exist for tests to pass.

- [ ] **Step 1: Create the test file**

```typescript
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

    const secondAlt = await modalImg.getAttribute('alt')
    expect(secondAlt).not.toBe(firstAlt)
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
```

- [ ] **Step 2: Run the tests**

```bash
cd web && npm run test:e2e -- e2e/gallery.spec.ts
```

Expected: `5 passed`. If photos aren't loading, verify the Sanity dataset has photos and `NEXT_PUBLIC_SANITY_PROJECT_ID` is set in `.env.local`.

- [ ] **Step 3: Commit**

```bash
git add web/e2e/gallery.spec.ts
git commit -m "test(e2e): add gallery flow tests"
```

---

## Task 4: Photo page and About page E2E tests

**Files:**
- Create: `web/e2e/photo.spec.ts`

The direct photo page test needs a real photo `_id` from Sanity. Rather than hardcoding an ID, the test navigates to the gallery first, clicks a photo to find its ID from the URL, then navigates directly to that URL.

- [ ] **Step 1: Create the test file**

```typescript
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
```

- [ ] **Step 2: Run the tests**

```bash
cd web && npm run test:e2e -- e2e/photo.spec.ts
```

Expected: `2 passed`.

- [ ] **Step 3: Run the full E2E suite**

```bash
cd web && npm run test:e2e
```

Expected: all tests pass (`8 passed` across all spec files).

- [ ] **Step 4: Commit**

```bash
git add web/e2e/photo.spec.ts
git commit -m "test(e2e): add photo page and about page tests"
```

---

## Task 5: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/test.yml`

The workflow runs in the `web/` subdirectory. `e2e-tests` declares `needs: unit-tests` to avoid spinning up a dev server when unit tests are already failing. The `SITE_PASSWORD` secret must be added in the GitHub repository settings (Settings → Secrets and variables → Actions).

- [ ] **Step 1: Create `.github/workflows/` directory if needed**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/test.yml`**

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    name: Unit + Component Tests (Vitest)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run Vitest
        run: npm run test

  e2e-tests:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: unit-tests
    defaults:
      run:
        working-directory: web

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Playwright tests
        run: npm run test:e2e
        env:
          CI: true
          SITE_PASSWORD: ${{ secrets.SITE_PASSWORD }}
          NEXT_PUBLIC_SANITY_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_SANITY_PROJECT_ID }}
          NEXT_PUBLIC_SANITY_DATASET: ${{ secrets.NEXT_PUBLIC_SANITY_DATASET }}

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: web/playwright-report/
          retention-days: 7

      - name: Upload Playwright traces on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: web/test-results/
          retention-days: 7
```

- [ ] **Step 3: Add GitHub Secrets**

In GitHub → repository → Settings → Secrets and variables → Actions, add:

- `SITE_PASSWORD` — the site password from your `.env.local`
- `NEXT_PUBLIC_SANITY_PROJECT_ID` — from your `.env.local`
- `NEXT_PUBLIC_SANITY_DATASET` — from your `.env.local` (likely `production`)

These are needed so the E2E tests can authenticate and load real photos.

- [ ] **Step 4: Commit and push**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add GitHub Actions workflow for Vitest and Playwright"
git push
```

- [ ] **Step 5: Verify CI passes**

Open the repository on GitHub → Actions tab. You should see the `Tests` workflow running. Both jobs should go green. If `e2e-tests` fails, check the uploaded Playwright report artifact for traces/screenshots.
