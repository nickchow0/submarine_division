# GA4 Analytics Integration — Design Spec

**Date:** 2026-03-17
**Project:** SubmarineDivision website (Next.js 15 App Router + Sanity CMS)
**Goal:** Add Google Analytics 4 to track traffic and photo engagement

---

## Overview

Integrate GA4 into the existing Next.js app to track:
1. Page views across all routes, including soft (SPA) navigations
2. Custom events for photo engagement (photo views, portfolio searches, tag filters)

No privacy constraints — third-party data collection is acceptable.

---

## Architecture

### Script Injection

Add GA4 script tags to `web/app/layout.tsx` using `next/script` with `strategy="afterInteractive"`. This defers loading until after hydration, avoiding any impact on LCP.

The GA4 Measurement ID is stored as `NEXT_PUBLIC_GA_MEASUREMENT_ID` in `.env.local` (and must be set in the production environment as well).

A thin utility module `web/lib/analytics.ts` exports a `trackEvent` helper that wraps `window.gtag('event', ...)` with a TypeScript-safe interface. It no-ops gracefully if `gtag` is not available (e.g. during SSR or if blocked by an ad blocker).

### Page View Tracking

GA4's `config` call fires a page view on the initial hard load. However, GA4 does **not** automatically detect subsequent Next.js App Router soft navigations (pushState transitions). To cover these, a new client component `web/components/Analytics.tsx` uses `usePathname` to watch for route changes and fires a `page_view` event via `gtag` whenever the pathname changes. This component is rendered inside `layout.tsx`.

### Custom Events

Four events tracked on top of page views:

| Event name | Fired from | Parameters |
|---|---|---|
| `photo_view` | `web/components/PhotoModal.tsx` — on open and on next/prev navigation | `photo_id: string`, `photo_title: string`, `location: string \| null` |
| `photo_view` | `web/components/PhotoPageClient.tsx` — on mount (direct link / hard nav to `/photo/[id]`) | `photo_id: string`, `photo_title: string`, `location: string \| null` |
| `gallery_search` | `web/components/Portfolio.tsx` — debounced 500ms after the user stops typing | `search_term: string`, `result_count: number` |
| `tag_filter` | `web/components/Portfolio.tsx` — when `activeTag` changes to a non-null value | `tag_name: string` |

#### Where events fire

- **`photo_view` (modal)**: `PhotoModal.tsx` already receives the current `photo` as a prop. Add a `useEffect` that fires on every `photo` change (both initial open and next/prev navigation within the modal).
- **`photo_view` (direct)**: `PhotoPageClient.tsx` is a client component that receives the full `photo` object as a prop. A `useEffect` on mount fires the event for users who land directly on `/photo/[id]` (e.g. via a shared link).
- **`gallery_search`**: `Portfolio.tsx` is a client component. Add a `useEffect` watching `query` + `visiblePhotos` with a 500ms debounce; fires when `query.trim()` is non-empty.
- **`tag_filter`**: `Portfolio.tsx` — add a `useEffect` watching `activeTag`; fires when it becomes non-null.

---

## Files Changed

| File | Change |
|---|---|
| `web/app/layout.tsx` | Add `next/script` GA4 snippet; render `<Analytics />` component |
| `web/lib/analytics.ts` | New — `trackEvent` helper |
| `web/components/Analytics.tsx` | New — client component that fires `page_view` on pathname changes |
| `web/components/PhotoPageClient.tsx` | Add `useEffect` for `photo_view` on mount |
| `web/components/PhotoModal.tsx` | Add `useEffect` for `photo_view` on photo change |
| `web/components/Portfolio.tsx` | Add `useEffect` hooks for `gallery_search` and `tag_filter` |
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
