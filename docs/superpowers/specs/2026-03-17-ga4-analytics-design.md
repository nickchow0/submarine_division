# GA4 Analytics Integration — Design Spec

**Date:** 2026-03-17
**Project:** SubmarineDivision website (Next.js 15 App Router + Sanity CMS)
**Goal:** Add Google Analytics 4 to track traffic and photo engagement

---

## Overview

Integrate GA4 into the existing Next.js app to track:
1. Automatic page views across all routes
2. Custom events for photo engagement (photo views, gallery searches, tag filters)

No privacy constraints — third-party data collection is acceptable.

---

## Architecture

### Script Injection

Add GA4 script tags to `web/app/layout.tsx` using `next/script` with `strategy="afterInteractive"`. This defers loading until after hydration, avoiding any impact on LCP.

The GA4 Measurement ID is stored as `NEXT_PUBLIC_GA_MEASUREMENT_ID` in `.env.local` (and must be set in the production environment as well).

A thin utility module `web/lib/analytics.ts` exports a `trackEvent` helper that wraps `window.gtag('event', ...)` with a TypeScript-safe interface. It no-ops gracefully if `gtag` is not yet available (e.g. during SSR or if blocked).

### Automatic Page Views

GA4 tracks page views automatically via the `config` call in the script tag. No additional code is needed for route changes — Next.js App Router navigations trigger new page view events natively via the History API, which GA4 intercepts.

### Custom Events

Three events tracked on top of page views:

| Event name | Fired from | Parameters |
|---|---|---|
| `photo_view` | `web/app/photo/[id]/page.tsx` (server component renders `PhotoPageClient` which fires on mount) | `photo_id: string`, `photo_title: string`, `location: string \| null` |
| `gallery_search` | `web/components/Gallery.tsx` — debounced 500ms after the user stops typing | `search_term: string`, `result_count: number` |
| `tag_filter` | `web/components/Gallery.tsx` — when `activeTag` changes to a non-null value | `tag_name: string` |

#### Where events fire

- **`photo_view`**: `PhotoPageClient` is already a client component. A `useEffect` on mount calls `trackEvent('photo_view', { photo_id, photo_title, location })`.
- **`gallery_search`**: `Gallery.tsx` is already a client component. Add a `useEffect` that watches `query` with a 500ms debounce; fires when `query.trim()` is non-empty.
- **`tag_filter`**: `Gallery.tsx` — add a `useEffect` that watches `activeTag`; fires when it becomes non-null.

---

## Files Changed

| File | Change |
|---|---|
| `web/app/layout.tsx` | Add `next/script` GA4 snippet |
| `web/lib/analytics.ts` | New — `trackEvent` helper |
| `web/app/photo/[id]/PhotoPageClient` (or `web/components/PhotoPageClient.tsx`) | Add `useEffect` for `photo_view` |
| `web/components/Gallery.tsx` | Add `useEffect` hooks for `gallery_search` and `tag_filter` |
| `web/.env.local` | Add `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` |

---

## Environment Variables

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Must also be set in production deployment environment (e.g. Vercel project settings).

---

## Out of Scope

- Map page interaction tracking (can be added later)
- Admin page tracking (not useful)
- Any server-side event tracking via Measurement Protocol
