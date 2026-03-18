# Testing Strategy — Design Spec

**Date:** 2026-03-17
**Project:** SubmarineDivision website (Next.js 15 App Router + Sanity CMS)
**Goal:** Add a comprehensive test suite covering regressions, user flow confidence, and production monitoring

---

## Overview

Three-layer testing strategy:

1. **Unit tests (Vitest)** — pure logic in `lib/`
2. **Component tests (Vitest + React Testing Library)** — interactive client components
3. **End-to-end tests (Playwright)** — key user flows against a live dev server
4. **Production monitoring (UptimeRobot)** — uptime alerts, no code changes needed

CI: GitHub Actions workflow runs unit tests first, then E2E tests (gated on unit tests passing), blocking Vercel deploys on failure.

---

## Tech Stack

- **Vitest** — unit and component test runner (TypeScript/ESM native, fast)
- **@testing-library/react** — component testing utilities
- **@testing-library/user-event** — simulates real user interactions
- **@testing-library/jest-dom** — custom DOM matchers
- **jsdom** — simulated browser environment for component tests
- **Playwright** — end-to-end browser automation
- **UptimeRobot** (free tier) — production uptime monitoring

---

## Layer 1: Unit Tests

**Location:** `web/__tests__/lib/`

Tests pure functions in `lib/` that have no external dependencies.

### `lib/search.ts`

All tests use `buildSearchIndex(photos)` — never `new Fuse(photos)` directly — so that `FUSE_OPTIONS` (threshold, weights, `minMatchCharLength`) are exercised consistently with production.

| Test | Description |
|---|---|
| `buildSearchIndex` returns a usable index | Assert `typeof index.search === 'function'` (avoids cross-module `instanceof` fragility) |
| `searchPhotos` returns matching photos | Query matching a known title returns that photo |
| `searchPhotos` returns `[]` for no match | Unmatched query returns empty array |
| `searchPhotos` returns `[]` for empty string | The function itself short-circuits: `if (!query.trim()) return []` |
| `searchPhotos` returns `[]` for whitespace-only input | `"   "` hits the same `.trim()` branch and returns `[]` |
| `searchPhotos` is case-insensitive | Uppercase query matches lowercase title (Fuse.js built-in, smoke test) |
| `searchPhotos` matches on tags | Tag-based query returns photos with that tag |

### `lib/analytics.ts`

| Test | Description |
|---|---|
| `trackEvent` no-ops when `window` is undefined | SSR guard: called in Node environment, throws nothing |
| `trackEvent` no-ops when `gtag` is not a function | Guard: `window` exists but `gtag` absent, no error |
| `trackEvent` calls `window.gtag` with correct args | Happy path: verifies event name and params are passed through |

### `lib/sanityImageLoader.ts`

The loader always includes a `q` parameter — it defaults to `85` when quality is not supplied. It also caps width at `2000` via `Math.min(width, 2000)`.

| Test | Description |
|---|---|
| Builds a URL containing the Sanity CDN domain | Output URL contains the expected CDN base |
| Includes `w` (width) parameter | Width param appears in the URL |
| `q` defaults to `85` when quality not provided | Calling without a quality arg produces `q=85` |
| `q` equals the supplied quality value | Passing `quality: 60` produces `q=60` |
| Caps width at 2000px | Supplying `width: 3000` produces `w=2000`, not `w=3000` |

---

## Layer 2: Component Tests

**Location:** `web/__tests__/components/`

Tests client components in a jsdom environment using React Testing Library. Components receive all data via props — no Sanity calls involved.

### Implementation notes

**`SearchBar` debounce:** `SearchBar` debounces `onSearch` by 150ms. All tests that assert the callback was called must use `vi.useFakeTimers()` and advance by 150ms (`vi.advanceTimersByTime(150)`) before asserting. Restore real timers in `afterEach`.

**`Gallery` search debounce:** `Gallery` renders `SearchBar` as a child. Typing into the gallery search input also requires 150ms of fake timer advancement before `query` state updates and photo filtering occurs.

**`Gallery` history mock:** `Gallery` calls `Object.getPrototypeOf(window.history).pushState` (the History prototype, not the instance). Mock with `vi.spyOn(Object.getPrototypeOf(window.history), 'pushState')` in test setup. The pushState call itself is not asserted — it is intentionally covered by E2E tests only.

**Analytics in jsdom:** `trackEvent` calls in components will silently no-op in jsdom (`window.gtag` is undefined). This is expected — no mocking needed.

### `SearchBar`

| Test | Description |
|---|---|
| Renders a text input | Input element is present in the DOM |
| Calls `onSearch` after debounce when user types | Type into input, advance fake timers 150ms, assert callback called with typed value |
| Shows result count when provided | Result/total count text is visible |

### `TagFilter`

| Test | Description |
|---|---|
| Renders all provided tags | Each tag name appears as a button |
| Calls `onTagClick` with tag name when clicked | Clicking a tag fires the callback |
| Applies active styling to the selected tag | Active tag has a distinct visual state |
| Returns null when no tags provided | Empty tags array: component returns `null`, container is empty |

### `Gallery`

| Test | Description |
|---|---|
| Renders all photos initially | All photo alt texts are present |
| Filters photos by search query | Type query + advance fake timers 150ms → only matching photos visible |
| Shows "no results" message when nothing matches | Empty state message appears for unmatched query |
| Filters photos by tag | Clicking a tag reduces visible photos to those with that tag |
| Clearing filters restores all photos | Clicking "Clear filters" restores the full photo list |

---

## Layer 3: End-to-End Tests

**Location:** `web/e2e/`

Tests run against a live `next dev` server (Playwright starts it automatically via `webServer` config). Tests run headlessly in CI and can be run headed locally for debugging.

### Authentication strategy

The site is password-protected via middleware (cookie: `site_access=granted`). E2E tests authenticate via a Playwright `globalSetup` file that POSTs directly to `POST /api/auth` with `{ password: process.env.SITE_PASSWORD }`. This sets the `site_access` cookie, which is saved to a storage state file (`playwright/.auth/user.json`). All authenticated tests load this storage state via `storageState` in `playwright.config.ts`.

The password gate test explicitly opts out of storage state so it hits the middleware unauthenticated.

### Test flows

| Flow | Auth | Steps | Assertion |
|---|---|---|---|
| Password gate | None | Navigate to `/gallery` | Redirected to `/password` |
| Gallery loads | Authenticated | Navigate to `/gallery` | Photo grid visible with ≥1 photo |
| Search filters photos | Authenticated | Type a search term | Fewer photos visible than initial count |
| Open photo modal | Authenticated | Click a photo thumbnail | Modal overlay appears with the photo |
| Modal navigation | Authenticated | Open modal, click next arrow | A different photo is displayed |
| Close modal | Authenticated | Open modal, press Escape | Modal dismissed, gallery visible |
| Direct photo page | Authenticated | Navigate to `/photo/[id]` directly | Photo and metadata rendered |
| About page loads | Authenticated | Navigate to `/about` | Page renders without errors |

### Configuration

- `playwright.config.ts` at `web/playwright.config.ts`
- `globalSetup` at `web/e2e/global-setup.ts` — POSTs to `/api/auth`, saves `playwright/.auth/user.json`
- `webServer` config starts `next dev` on port 3000 before tests run
- `storageState: 'playwright/.auth/user.json'` set as default in config; password gate test overrides with `storageState: undefined`
- Screenshots and traces captured on failure
- Tests run in Chromium only (no multi-browser — personal project)

---

## Layer 4: Production Monitoring

**Tool:** UptimeRobot (free tier)
**Setup:** Manual — create account, add HTTP monitor for the production Vercel URL, set email alert contact
**Check interval:** Every 5 minutes
**No code changes required**

---

## CI: GitHub Actions

**File:** `.github/workflows/test.yml`

Triggers on every push to `main` and on pull requests. All steps run from `web/` (`working-directory: web`). `e2e-tests` declares `needs: unit-tests` so it only runs when unit tests pass — avoids wasting CI minutes starting a dev server when logic is already broken.

```
Jobs:
  unit-tests:
    working-directory: web
    steps:
      - Install dependencies (npm ci)
      - Run: npm run test

  e2e-tests:
    needs: unit-tests
    working-directory: web
    steps:
      - Install dependencies (npm ci)
      - Install Playwright browsers (npx playwright install --with-deps chromium)
      - Run: npm run test:e2e
      - Upload traces/screenshots as artifacts on failure
```

Both jobs must pass before Vercel deploys. Vercel's GitHub integration respects failing checks.

---

## npm Scripts

Added to `web/package.json`:

| Script | Command | Description |
|---|---|---|
| `test` | `vitest run` | Run unit + component tests once |
| `test:watch` | `vitest` | Watch mode for development |
| `test:e2e` | `playwright test` | Run E2E tests |
| `test:e2e:ui` | `playwright test --ui` | Playwright UI mode for debugging |

---

## Out of Scope

- Map page E2E tests (Leaflet requires complex browser setup)
- Admin dashboard tests (password-protected, Sanity-dependent)
- API route integration tests (low risk, covered by E2E)
- Multi-browser E2E (personal project, Chromium-only is sufficient)
- Visual regression testing (screenshot diffing)
