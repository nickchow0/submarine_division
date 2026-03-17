# GA4 Analytics Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Analytics 4 to the SubmarineDivision website to track page views and photo engagement events.

**Architecture:** Inject the GA4 script in `layout.tsx` via `next/script`. A new `Analytics` client component uses `usePathname` to fire `page_view` on every soft navigation. A `trackEvent` utility in `lib/analytics.ts` provides a safe, typed wrapper around `window.gtag`. Custom events are added to `PhotoModal`, `PhotoPageClient`, and `Gallery` via `useEffect` hooks.

**Tech Stack:** Next.js 15 App Router, TypeScript, Google Analytics 4 (gtag.js)

**Spec:** `docs/superpowers/specs/2026-03-17-ga4-analytics-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `web/lib/analytics.ts` | **Create** | `trackEvent` helper — typed wrapper around `window.gtag`, no-ops if unavailable |
| `web/components/Analytics.tsx` | **Create** | Client component — fires `page_view` on `usePathname` changes |
| `web/app/layout.tsx` | **Modify** | Add GA4 `<Script>` tags and render `<Analytics />` |
| `web/components/PhotoModal.tsx` | **Modify** | Fire `photo_view` on every `photo` prop change |
| `web/components/PhotoPageClient.tsx` | **Modify** | Fire `photo_view` on mount (direct link visits) |
| `web/components/Gallery.tsx` | **Modify** | Fire `gallery_search` (debounced) and `tag_filter` events |
| `web/.env.local` | **Modify** | Add `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` |

---

## Task 1: Create `lib/analytics.ts`

**Files:**
- Create: `web/lib/analytics.ts`

This module declares the global `gtag` function (TypeScript needs it) and exports a `trackEvent` helper that no-ops safely during SSR or when GA is blocked.

- [ ] **Step 1: Create the file**

```typescript
// web/lib/analytics.ts

// Declare the global gtag function injected by the GA4 script tag.
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetIdOrAction: string | Date,
      params?: Record<string, unknown>
    ) => void
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', eventName, params)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add web/lib/analytics.ts
git commit -m "feat: add trackEvent analytics helper"
```

---

## Task 2: Create `components/Analytics.tsx` (SPA page view tracking)

**Files:**
- Create: `web/components/Analytics.tsx`

GA4 only fires a page view on initial hard load. This component watches `usePathname` and fires `page_view` on every subsequent App Router navigation. It renders nothing — pure side-effect.

Note: The `nativePush` calls in `Gallery.tsx` bypass Next.js routing entirely, so `usePathname` will NOT fire for those URL changes. That's correct — `photo_view` events handle gallery modal tracking separately.

- [ ] **Step 1: Create the file**

```tsx
// web/components/Analytics.tsx
'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

export default function Analytics() {
  const pathname = usePathname()

  useEffect(() => {
    trackEvent('page_view', { page_path: pathname })
  }, [pathname])

  return null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add web/components/Analytics.tsx
git commit -m "feat: add Analytics component for SPA page view tracking"
```

---

## Task 3: Add GA4 script and `<Analytics />` to `layout.tsx`

**Files:**
- Modify: `web/app/layout.tsx`

Add the two GA4 `<Script>` tags inside `<head>` and render `<Analytics />` inside `<body>`. The measurement ID comes from `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` — if it's missing (e.g. local dev without the env var), the scripts simply don't load.

- [ ] **Step 1: Add the env var to `.env.local`**

Open `web/.env.local` and add:

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your real Measurement ID from the GA4 dashboard (Admin → Data Streams → your stream → Measurement ID).

- [ ] **Step 2: Modify `layout.tsx`**

Add the import at the top of the file (alongside existing imports):

```typescript
import Script from 'next/script'
import Analytics from '@/components/Analytics'
```

Inside `<head>`, after the existing `<link>` tags, add:

```tsx
{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
  <>
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
    <Script id="ga4-init" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
      `}
    </Script>
  </>
)}
```

Inside `<body>`, just before `<ImageProtection />` (or anywhere near the top of body), add:

```tsx
<Analytics />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Smoke-test locally**

```bash
cd web && npm run dev
```

Open the browser. Open DevTools → Network tab, filter by "gtag" or "googletagmanager". Navigate between pages (/gallery, /about). Confirm the gtag requests fire. You don't need GA4 to be receiving data — just verify the script loads and network calls go out.

- [ ] **Step 5: Commit**

```bash
git add web/app/layout.tsx
git commit -m "feat: inject GA4 script and Analytics component into layout"
```

---

## Task 4: Fire `photo_view` from `PhotoModal.tsx`

**Files:**
- Modify: `web/components/PhotoModal.tsx`

The modal receives a `photo` prop and already has a keyboard handler `useEffect`. Add another `useEffect` that fires `photo_view` whenever `photo` changes — this covers both the initial open and next/prev navigation within the modal.

- [ ] **Step 1: Add the import**

At the top of `web/components/PhotoModal.tsx`, add alongside the existing `useEffect` import:

```typescript
import { trackEvent } from '@/lib/analytics'
```

- [ ] **Step 2: Add the `useEffect`**

Inside the `PhotoModal` component, after the keyboard handler `useEffect` (around line 36), add:

```typescript
useEffect(() => {
  trackEvent('photo_view', {
    photo_id: photo._id,
    photo_title: photo.title,
    location: photo.location ?? null,
  })
}, [photo])
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add web/components/PhotoModal.tsx
git commit -m "feat: fire photo_view event from gallery modal"
```

---

## Task 5: Fire `photo_view` from `PhotoPageClient.tsx`

**Files:**
- Modify: `web/components/PhotoPageClient.tsx`

For users who land directly on `/photo/[id]` (shared link, hard refresh), the modal never mounts. `PhotoPageClient` is the client component that wraps the photo detail page. Add a `useEffect` on mount to fire the event.

- [ ] **Step 1: Add the import**

At the top of `web/components/PhotoPageClient.tsx`, add:

```typescript
import { trackEvent } from '@/lib/analytics'
```

- [ ] **Step 2: Add the `useEffect`**

Inside `PhotoPageClient`, after the keyboard handler `useEffect`, add:

```typescript
// Fires only on mount — the prop never changes while this component is
// mounted (navigating to a new /photo/[id] causes a full remount).
useEffect(() => {
  trackEvent('photo_view', {
    photo_id: photo._id,
    photo_title: photo.title,
    location: photo.location ?? null,
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add web/components/PhotoPageClient.tsx
git commit -m "feat: fire photo_view event on direct photo page visits"
```

---

## Task 6: Fire `gallery_search` and `tag_filter` from `Gallery.tsx`

**Files:**
- Modify: `web/components/Gallery.tsx`

Two new `useEffect` hooks added to the `Gallery` component:

1. **`gallery_search`** — fires 500ms after the user stops typing, only when the query is non-empty. Uses a debounce pattern with cleanup to avoid stale state updates on unmount.
2. **`tag_filter`** — fires when `activeTag` becomes non-null (a tag was selected).

- [ ] **Step 1: Add the import**

At the top of `web/components/Gallery.tsx`, add:

```typescript
import { trackEvent } from '@/lib/analytics'
```

- [ ] **Step 2: Add the `gallery_search` effect**

Inside the `Gallery` component, after the `handleTagClick` callback (around line 126), add:

```typescript
// Fire gallery_search 500ms after the user stops typing.
// Only [query] is in the dep array so the debounce resets only when the
// query changes — not when the result count shifts. visiblePhotos.length is
// captured inside the closure and will be current when the timer fires.
useEffect(() => {
  const trimmed = query.trim()
  if (!trimmed) return
  const timer = setTimeout(() => {
    trackEvent('gallery_search', {
      search_term: trimmed,
      result_count: visiblePhotos.length,
    })
  }, 500)
  return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [query])
```

- [ ] **Step 3: Add the `tag_filter` effect**

Immediately after the `gallery_search` effect, add:

```typescript
// Fire tag_filter when a tag is selected
useEffect(() => {
  if (!activeTag) return
  trackEvent('tag_filter', { tag_name: activeTag })
}, [activeTag])
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add web/components/Gallery.tsx
git commit -m "feat: fire gallery_search and tag_filter analytics events"
```

---

## Task 7: Verify end-to-end in GA4

This is a manual verification task — no code changes.

- [ ] **Step 1: Open GA4 DebugView**

In the GA4 dashboard, go to **Admin → DebugView**. This shows events in real time from devices in debug mode.

- [ ] **Step 2: Enable debug mode locally**

Add `?debug=1` to the GA4 script URL, or use the [GA4 Debugger Chrome extension](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna).

Alternatively, temporarily replace `gtag('config', ...)` with `gtag('config', ..., { debug_mode: true })` in `layout.tsx`.

- [ ] **Step 3: Exercise the app**

With the site running locally (`npm run dev`):
- Navigate between pages → confirm `page_view` events appear in DebugView
- Open a photo in the gallery modal → confirm `photo_view`
- Navigate to next/prev in the modal → confirm `photo_view` fires again
- Visit a photo directly at `/photo/[id]` → confirm `photo_view`
- Type a search query → confirm `gallery_search` fires after 500ms
- Click a tag → confirm `tag_filter`

- [ ] **Step 4: Remove debug mode** (if you added it to the script URL)

Revert any debug-mode changes to `layout.tsx`.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -p
git commit -m "chore: clean up debug mode from GA4 config"
```
