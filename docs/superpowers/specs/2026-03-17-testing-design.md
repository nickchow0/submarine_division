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

CI: GitHub Actions workflow runs unit + E2E tests on every push, blocking Vercel deploys on failure.

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

| Test | Description |
|---|---|
| `buildSearchIndex` returns a Fuse instance | Smoke test that the index builds without error |
| `searchPhotos` returns matching photos | Query matching a known title returns that photo |
| `searchPhotos` returns empty array for no match | Query with no results returns `[]` |
| `searchPhotos` is case-insensitive | Uppercase query matches lowercase title |
| `searchPhotos` matches on tags | Tag-based query returns photos with that tag |

### `lib/analytics.ts`

| Test | Description |
|---|---|
| `trackEvent` no-ops when `window` is undefined | SSR guard: called in Node environment, throws nothing |
| `trackEvent` no-ops when `gtag` is not a function | Guard: `window` exists but `gtag` absent, no error |
| `trackEvent` calls `window.gtag` with correct args | Happy path: verifies event name and params are passed through |

### `lib/sanityImageLoader.ts`

| Test | Description |
|---|---|
| Builds a URL with correct base | Output contains the Sanity CDN domain |
| Includes `w` (width) parameter | Width param appears in the URL |
| Includes `q` (quality) parameter when provided | Quality param appears when specified |

---

## Layer 2: Component Tests

**Location:** `web/__tests__/components/`

Tests client components in a jsdom environment using React Testing Library. Sanity and external API calls are not involved — components receive all data via props.

### `SearchBar`

| Test | Description |
|---|---|
| Renders a text input | Input element is present in the DOM |
| Calls `onSearch` when user types | Typing triggers the callback with the typed value |
| Shows result count when provided | Result/total count text is visible |

### `TagFilter`

| Test | Description |
|---|---|
| Renders all provided tags | Each tag name appears as a button |
| Calls `onTagClick` with tag name when clicked | Clicking a tag fires the callback |
| Applies active styling to the selected tag | Active tag has a distinct visual state |
| Renders nothing when no tags provided | Empty tags array produces no buttons |

### `Gallery`

| Test | Description |
|---|---|
| Renders all photos initially | All photo titles/images are present |
| Filters photos by search query | Searching reduces visible photos to matches |
| Shows "no results" message when nothing matches | Empty state message appears for unmatched query |
| Filters photos by tag | Clicking a tag filters the visible photos |
| Clearing filters restores all photos | Reset brings back the full photo list |

---

## Layer 3: End-to-End Tests

**Location:** `web/e2e/`

Tests run against a live `next dev` server (Playwright starts it automatically via `webServer` config). Tests run headlessly in CI and can be run headed locally for debugging.

### Test flows

| Flow | Steps | Assertion |
|---|---|---|
| Gallery loads | Navigate to `/gallery` | Photo grid is visible with at least one photo |
| Search filters photos | Navigate to `/gallery`, type a search term | Fewer photos visible than initial count |
| Open photo modal | Click a photo thumbnail | Modal overlay appears with the photo |
| Modal navigation | Open modal, click next arrow | A different photo is displayed |
| Close modal | Open modal, press Escape | Modal is dismissed, gallery is visible |
| Direct photo page | Navigate to `/photo/[id]` directly | Photo and metadata are rendered |
| About page loads | Navigate to `/about` | Page renders without errors |
| Password gate | Navigate to `/gallery` without auth cookie | Redirected to password entry page |

### Configuration

- `playwright.config.ts` at `web/playwright.config.ts`
- `webServer` config starts `next dev` on port 3000 before tests run
- Screenshots and traces captured on failure
- Tests run in Chromium only (no multi-browser — personal project, not worth the overhead)

---

## Layer 4: Production Monitoring

**Tool:** UptimeRobot (free tier)
**Setup:** Manual — create account, add HTTP monitor for the production Vercel URL, set email alert contact
**Check interval:** Every 5 minutes
**No code changes required**

---

## CI: GitHub Actions

**File:** `.github/workflows/test.yml`

Triggers on every push to `main` and on pull requests.

```
Jobs:
  unit-tests:
    - Install dependencies
    - Run: npm run test (Vitest)

  e2e-tests:
    - Install dependencies
    - Install Playwright browsers
    - Run: npm run test:e2e (Playwright)
    - Upload traces/screenshots on failure
```

Both jobs must pass before Vercel deploys. Vercel's GitHub integration respects failing checks.

---

## npm Scripts

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
