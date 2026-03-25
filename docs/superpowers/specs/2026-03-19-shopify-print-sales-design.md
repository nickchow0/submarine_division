# Shopify Print Sales Integration — Design Spec

**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Add print-on-demand sales to the portfolio site via a Shopify + Printful integration. Every photo in Sanity automatically gets a corresponding Shopify product. Visitors can purchase prints directly from the photo detail page and portfolio modal without leaving the site. Shopify handles checkout; Printful handles printing and shipping.

---

## Goals

- Every photo in Sanity is automatically available for purchase
- Buyers never visibly leave the site to complete a purchase
- Deleting a photo in Sanity archives the corresponding Shopify product
- No manual catalog maintenance required for new uploads
- Admin panel shows sync status and provides a manual fallback when webhooks fail

## Non-goals

- Custom checkout UI (Shopify's drawer handles this)
- Print size/price configuration in code (configured in Shopify + Printful dashboards)
- Inventory management (Printful handles on-demand fulfillment)
- Order management UI in the admin panel (handled in Shopify dashboard)

---

## Architecture

```
Photo published in Sanity
    → POST /api/webhooks/sanity
    → Re-fetch photo from Sanity to get current shopifyProductId
    → Shopify Admin API: upsert product using Sanity _id as handle
    → PATCH photo.shopifyProductId → Sanity

Photo deleted via admin panel
    → DELETE /api/admin/photos
    → Shopify Admin API: archive product (before Sanity delete)
    → Sanity: delete document + asset

Visitor on /photo/[id] or portfolio modal
    → shopifyProductId present on photo?
        yes → BuyPrintButton renders Shopify Buy Button SDK
              → buyer clicks → Shopify checkout drawer (iframe overlay)
              → Shopify order created → Printful fulfills automatically
        no  → button not rendered
```

**Note on delete handling:** Sanity delete webhooks do not include the document body — by the time the webhook fires, the document is gone and `shopifyProductId` is unavailable. Archive-on-delete is therefore handled in `DELETE /api/admin/photos` instead, which runs before Sanity deletion and has access to the full photo document. The Sanity webhook is configured for `create` and `update` events only, not `delete`.

---

## Data Model Changes

### Sanity — Photo schema

Add one new optional field to `studio/schemaTypes/photoType.ts`:

```typescript
defineField({
  name: 'shopifyProductId',
  title: 'Shopify Product ID',
  type: 'string',
  readOnly: true,
  description: 'Set automatically when the photo is synced to Shopify. Do not edit manually.',
})
```

### TypeScript types

Add `shopifyProductId: string | null` to both `Photo` and `AdminPhoto` in `web/types/index.ts`.

### Sanity GROQ — `PHOTO_PROJECTION`

Add to `PHOTO_PROJECTION` in `web/lib/sanity.ts` (used by `ALL_PHOTOS_QUERY`, `PHOTO_BY_ID_QUERY`, `CAROUSEL_PHOTOS_QUERY`, and the admin query in `app/admin/page.tsx`):

```groq
"shopifyProductId": coalesce(shopifyProductId, null),
```

Updating `PHOTO_PROJECTION` once propagates `shopifyProductId` to the portfolio, photo detail page, `PhotoModal`, and admin dashboard without separate query changes.

---

## New Environment Variables

| Variable | Visibility | Purpose |
|---|---|---|
| `SHOPIFY_ADMIN_API_TOKEN` | Server only | Create, update, archive Shopify products |
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` | Public | e.g. `yourstore.myshopify.com` — used by Buy Button SDK in browser |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` | Public | Storefront API token for Buy Button SDK |

`SANITY_WEBHOOK_SECRET` is already in the codebase and reused for webhook signature verification.

**On the public Storefront token:** Shopify Storefront tokens are designed to be browser-visible. Create this token with the minimum required scopes only: `unauthenticated_read_product_listings` and `unauthenticated_write_checkouts`. Do not use an Admin API token here.

---

## Middleware Change

`/api/webhooks/sanity` must be added to the middleware bypass list in `web/middleware.ts`. Without this, the site password gate will redirect Sanity's webhook POST to `/password` and no webhook will ever be processed on a password-protected site.

Note: the existing `/api/generate-caption` route has the same gap — it is also not currently bypassed. Both must be added to the bypass condition in the same change:

```typescript
// middleware.ts — add to the bypass condition
pathname.startsWith('/api/webhooks') ||
pathname.startsWith('/api/generate-caption') ||
```

---

## New API Routes

### `POST /api/webhooks/sanity`

Handles Sanity publish events for the `photo` type only. The Sanity webhook is configured for `create` and `update` events with `_type == "photo"`.

**Security:** Verifies the `sanity-webhook-signature` header using HMAC-SHA256 with `SANITY_WEBHOOK_SECRET`. Rejects requests with invalid signatures with 401.

**On publish (create or update):**

1. Re-fetch the full photo document from Sanity using the `_id` from the webhook payload. Do not trust the payload body for `shopifyProductId` — the payload is a snapshot and may not reflect state from a previous retry.

2. Upsert the Shopify product using the Sanity `_id` as the Shopify product `handle` (normalized: lowercase, non-alphanumeric characters replaced with hyphens). Using a deterministic handle prevents duplicate product creation: if the write-back to Sanity fails and the webhook retries, Shopify will return the existing product (handle conflict) rather than creating a second one. On a handle-conflict error from Shopify, search for the product by handle to retrieve its ID, then write that ID back to Sanity.

3. The upsert sets: title from `photo.title`, body HTML from `photo.aiCaption` (if present), tags from `photo.tags`, and featured image from the Sanity CDN URL.

4. Write the returned Shopify product ID back to Sanity via `PATCH photo.shopifyProductId`.

**Rate limiting:** If Shopify returns 429, return a 5xx from this handler so Sanity retries via its built-in retry mechanism. Do not treat 429 as a terminal failure.

---

### `DELETE /api/admin/photos` — extended

Extend the existing route at `web/app/api/admin/photos/route.ts` to archive the Shopify product before deleting from Sanity.

**Updated request body:** `{ id: string; imageRef: string; shopifyProductId: string | null }`

**Updated flow:**
1. If `shopifyProductId` is present: call Shopify Admin API to archive the product (`status: "archived"`). If this fails, log the error but continue — do not block deletion. An unarchived orphaned product is preferable to an orphaned Sanity document.
2. Delete the Sanity photo document.
3. Delete the Sanity image asset.

**Call chain update — three files must change together:**
- `web/app/api/admin/photos/route.ts` — add `shopifyProductId` to the parsed request body
- `web/lib/adminApi.ts` — update `deletePhoto(id: string, imageRef: string)` to `deletePhoto(id: string, imageRef: string, shopifyProductId: string | null)` and include it in the request body
- `web/lib/hooks/usePhotoManagement.ts` — update the `deletePhoto` callback to pass `shopifyProductId` from the photo object alongside `id` and `imageRef`

---

### `POST /api/admin/sync-shopify`

Manual sync trigger. Protected by admin cookie middleware.

**Request body:** `{ photoId: string }`

**Behaviour:** Fetches the photo document from Sanity, runs the same upsert logic as the webhook handler (steps 1–4 above). Returns `{ ok: true, shopifyProductId: string }` on success.

Used by the per-photo sync button and the bulk sync action in the admin panel.

---

## New Component: `BuyPrintButton`

**File:** `web/components/BuyPrintButton.tsx`

Client component. Loaded with `dynamic(() => import('./BuyPrintButton'), { ssr: false })` because `@shopify/buy-button-js` is browser-only.

**Props:**
```typescript
type Props = {
  shopifyProductId: string
}
```

**Behaviour:**
- On mount: initializes a Shopify Buy Button client with `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` and `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN`, fetches the product by ID, renders the buy button into a container div using `client.createComponent(ShopifyBuy.UI.components.buyButton, { ... })`.
- On click: the SDK opens its checkout drawer (iframe overlay).
- If the product fetch fails: renders nothing.
- Cleanup: the `useEffect` cleanup function must call `component.destroy()` on the created component instance before the component unmounts. This prevents orphaned SDK instances when the modal navigates between photos.

```typescript
useEffect(() => {
  let component: ShopifyBuy.Component | null = null
  // ... initialize and create component, assign to `component`
  return () => { component?.destroy() }
}, [shopifyProductId])
```

**Placement:**

`/photo/[id]` — below EXIF metadata block, when `photo.shopifyProductId` is present.

`PhotoModal` — in the modal footer alongside close/navigate controls, when `photo.shopifyProductId` is present.

---

## Admin Panel Changes

### Files

- `web/components/admin/PhotoTable.tsx` — sync status badge + per-photo sync button
- `web/components/admin/BulkOperations.tsx` — "Sync All Unsynced" bulk action

### Sync status badge

Each photo row in `PhotoTable` displays a small badge:

| State | Badge | Condition |
|---|---|---|
| Synced | `✓ synced` (green) | `shopifyProductId` is present |
| Not synced | `⚠ not synced` (amber) | `shopifyProductId` is null |
| Syncing | `⟳ syncing…` (muted) | sync in flight |

### Per-photo sync button

Visible on photos with `⚠ not synced`. Calls `POST /api/admin/sync-shopify`. On success, updates local state with the returned `shopifyProductId`.

### "Sync All Unsynced" bulk action

In `BulkOperations.tsx`. Calls `/api/admin/sync-shopify` sequentially (not in parallel) to respect Shopify API rate limits. Shows a progress counter: `Syncing 3 / 12…`.

---

## Out-of-Code Setup (done once in Shopify + Printful dashboards)

1. Create a Shopify store and enable the Storefront API. Generate a Storefront access token with `unauthenticated_read_product_listings` and `unauthenticated_write_checkouts` scopes only.
2. Generate a Shopify Admin API token with `write_products` scope only.
3. Install the Printful app in Shopify and connect your Printful account. Configure print product templates (sizes, finishes, prices) — these become the variants on every synced product.
4. Add the three new environment variables to Vercel and `.env.local`.
5. Configure a Sanity webhook pointing at `https://yoursite.com/api/webhooks/sanity`, scoped to `_type == "photo"`, firing on `create` and `update` events only (not delete), signed with `SANITY_WEBHOOK_SECRET`.

---

## Implementation Order

1. Add `shopifyProductId` to Sanity Photo schema and deploy to Sanity cloud
2. Complete out-of-code Shopify + Printful setup and generate API tokens
3. Add new environment variables to Vercel and `.env.local`
4. Update `PHOTO_PROJECTION` in `web/lib/sanity.ts` and `Photo`/`AdminPhoto` types in `web/types/index.ts`
5. Add webhook and generate-caption bypasses to `web/middleware.ts`
6. Build `POST /api/webhooks/sanity`
7. Configure the Sanity webhook in the Sanity dashboard to point at the new endpoint
8. Extend `DELETE /api/admin/photos`, `web/lib/adminApi.ts`, and `web/lib/hooks/usePhotoManagement.ts` to pass and use `shopifyProductId` for archive-on-delete
9. Build `POST /api/admin/sync-shopify`
10. Add sync status badge and per-photo sync button to `web/components/admin/PhotoTable.tsx`
11. Add "Sync All Unsynced" to `web/components/admin/BulkOperations.tsx`
12. Build `BuyPrintButton` component
13. Add buy button to `/photo/[id]` page
14. Add buy button to `PhotoModal`
15. Run "Sync All Unsynced" from admin panel to backfill existing photos

---

## Dependencies

One new npm package: `@shopify/buy-button-js` (browser-only, loaded dynamically).

No new infrastructure. The webhook handler follows the same pattern as `/api/generate-caption`. All admin routes follow the same pattern as existing `/api/admin/*` routes.
