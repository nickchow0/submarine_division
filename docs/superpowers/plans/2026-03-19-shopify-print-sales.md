# Shopify Print Sales Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every Sanity photo to a Shopify product so visitors can buy prints directly from the photo detail page and gallery modal, with automatic sync on publish and manual fallback in the admin panel.

**Architecture:** A server-side Shopify helper (`web/lib/shopify.ts`) centralises all Shopify Admin API calls. A Sanity webhook (`POST /api/webhooks/sanity`) creates/updates Shopify products on publish. The admin panel extends with a sync badge, per-photo sync button, "Sync All Unsynced", and a feature toggle to gate the buy button on the public site. A `BuyPrintButton` client component (loaded with `ssr: false`) renders the Shopify Buy Button SDK in the photo detail page and gallery modal — only when the `enablePrintSales` setting is ON.

**Tech Stack:** Next.js 15 App Router, Sanity (GROQ + write client), Shopify Admin REST API (2024-01), `@shopify/buy-button-js` (browser-only), Vitest for unit tests.

---

## Pre-flight checklist (do before writing any code)

These are external setup steps with no code equivalent. Complete them before Task 3 onwards.

- [ ] Create Shopify store, install Printful app, configure print templates
- [ ] Generate Shopify Admin API token with `write_products` scope
- [ ] Generate Shopify Storefront API token with `unauthenticated_read_product_listings` + `unauthenticated_write_checkouts` scopes only
- [ ] Add to `.env.local`:
  ```
  SHOPIFY_ADMIN_API_TOKEN=shpat_...
  NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
  NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=...
  ```
- [ ] Add the same three variables to Vercel project settings

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `studio/schemaTypes/photoType.ts` | Modify | Add `shopifyProductId` field |
| `studio/schemaTypes/siteSettingsType.ts` | Modify | Add `enablePrintSales` field |
| `web/types/index.ts` | Modify | Add `shopifyProductId` to `Photo`/`AdminPhoto`; add `enablePrintSales` to `SiteSettings` |
| `web/lib/sanity.ts` | Modify | Add `shopifyProductId` to `PHOTO_PROJECTION`; add `enablePrintSales` to `SITE_SETTINGS_QUERY` |
| `web/app/admin/page.tsx` | Modify | Add `shopifyProductId` to `ADMIN_PHOTOS_QUERY` |
| `web/components/admin/SettingsPanel.tsx` | Modify | Add `enablePrintSales` toggle entry |
| `web/app/gallery/page.tsx` | Modify | Extract `enablePrintSales` and pass to `Gallery` |
| `web/components/Gallery.tsx` | Modify | Accept and forward `showBuyButton` prop to `PhotoModal` |
| `web/components/PhotoModal.tsx` | Modify | Accept `showBuyButton` prop and gate `BuyPrintButton` on it |
| `web/middleware.ts` | Modify | Bypass `/api/webhooks` and `/api/generate-caption` |
| `web/lib/shopify.ts` | **Create** | Shopify Admin API helper |
| `web/app/api/webhooks/sanity/route.ts` | **Create** | Sanity publish webhook handler |
| `web/app/api/admin/sync-shopify/route.ts` | **Create** | Manual sync trigger |
| `web/app/api/admin/photos/route.ts` | Modify | Archive Shopify product before Sanity delete |
| `web/lib/adminApi.ts` | Modify | Update `deletePhoto` signature |
| `web/lib/hooks/usePhotoManagement.ts` | Modify | Pass `shopifyProductId` to `deletePhoto` |
| `web/components/AdminDashboard.tsx` | Modify | Wire sync callbacks + updated delete handler |
| `web/components/admin/PhotoTable.tsx` | Modify | Add sync status badge + per-photo sync button |
| `web/components/admin/BulkOperations.tsx` | Modify | Add "Sync All Unsynced" with progress |
| `web/components/BuyPrintButton.tsx` | **Create** | Shopify Buy Button SDK wrapper |
| `web/app/photo/[id]/page.tsx` | Modify | Render `BuyPrintButton` below EXIF |
| `web/components/PhotoModal.tsx` | Modify | Render `BuyPrintButton` in metadata strip |
| `web/__tests__/middleware.test.ts` | Modify | Add bypass tests |
| `web/__tests__/lib/shopify.test.ts` | **Create** | Unit tests for shopify helper |
| `web/__tests__/api/webhooks-sanity.test.ts` | **Create** | Unit tests for webhook handler |
| `web/__tests__/api/admin/sync-shopify.test.ts` | **Create** | Unit tests for sync-shopify route |
| `web/__tests__/lib/adminApi.test.ts` | Modify | Extend `deletePhoto` test for `shopifyProductId` |

---

## Task 1: Schema + TypeScript types + GROQ queries

**Files:**
- Modify: `studio/schemaTypes/photoType.ts`
- Modify: `web/types/index.ts`
- Modify: `web/lib/sanity.ts`
- Modify: `web/app/admin/page.tsx`

These are structural changes with no testable logic. After this task, TypeScript will know about `shopifyProductId` everywhere.

- [ ] **Step 1: Add `shopifyProductId` field to Sanity photo schema**

  In `studio/schemaTypes/photoType.ts`, add after the `visible` field (before the closing of the `fields` array):

  ```typescript
  defineField({
    name: 'shopifyProductId',
    title: 'Shopify Product ID',
    type: 'string',
    readOnly: true,
    description: 'Set automatically when the photo is synced to Shopify. Do not edit manually.',
  }),
  ```

- [ ] **Step 2: Add `shopifyProductId` to `Photo` type in `web/types/index.ts`**

  In the `Photo` type, add after the `visible` line:

  ```typescript
  shopifyProductId: string | null
  ```

- [ ] **Step 3: Add `shopifyProductId` to `AdminPhoto` type in `web/types/index.ts`**

  In the `AdminPhoto` type, add after the `visible` line:

  ```typescript
  shopifyProductId: string | null
  ```

- [ ] **Step 4: Add `shopifyProductId` to `PHOTO_PROJECTION` in `web/lib/sanity.ts`**

  In the `PHOTO_PROJECTION` string, add after the `"blurDataURL"` line:

  ```groq
  "shopifyProductId": coalesce(shopifyProductId, null),
  ```

  The full updated projection ends with:
  ```
  "blurDataURL": image.asset->metadata.lqip,
  "shopifyProductId": coalesce(shopifyProductId, null)
  ```

- [ ] **Step 5: Add `shopifyProductId` to `ADMIN_PHOTOS_QUERY` in `web/app/admin/page.tsx`**

  The admin page has its own query (not `PHOTO_PROJECTION`). Add after `"imageRef": image.asset._ref`:

  ```groq
  "shopifyProductId": coalesce(shopifyProductId, null)
  ```

- [ ] **Step 6: Run TypeScript check to confirm no type errors**

  ```bash
  cd web && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 7: Deploy schema to Sanity cloud**

  ```bash
  cd studio && npx sanity@latest schema deploy
  ```

  Expected: "Schema deployed successfully."

- [ ] **Step 8: Commit**

  ```bash
  git add studio/schemaTypes/photoType.ts web/types/index.ts web/lib/sanity.ts web/app/admin/page.tsx
  git commit -m "feat: add shopifyProductId to Sanity schema, TypeScript types, and GROQ projections"
  ```

---

## Task 1.5: enablePrintSales feature toggle

**Files:**
- Modify: `studio/schemaTypes/siteSettingsType.ts`
- Modify: `web/types/index.ts`
- Modify: `web/lib/sanity.ts`
- Modify: `web/components/admin/SettingsPanel.tsx`
- Modify: `web/app/gallery/page.tsx`
- Modify: `web/components/Gallery.tsx`
- Modify: `web/components/PhotoModal.tsx`

The toggle controls whether the buy button renders on the public site. Admin sync functionality is always visible regardless of this setting — you still need to sync photos to Shopify before enabling the toggle.

**Data flow:** Sanity `siteSettings.enablePrintSales` → fetched on server → passed as `showBuyButton` prop to `Gallery` → forwarded to `PhotoModal`. The photo detail page checks it directly since it already fetches settings. Default is `false` so the feature is invisible until deliberately turned on.

- [ ] **Step 1: Add `enablePrintSales` field to `studio/schemaTypes/siteSettingsType.ts`**

  Add after `maintenanceMode`:

  ```typescript
  defineField({
    name: 'enablePrintSales',
    title: 'Enable print sales',
    description: 'Shows the "Buy Print" button on photo pages and the gallery modal. Requires photos to be synced to Shopify first.',
    type: 'boolean',
    initialValue: false,
  }),
  ```

- [ ] **Step 2: Add `enablePrintSales` to `SiteSettings` type and `DEFAULT_SETTINGS` in `web/types/index.ts`**

  In `SiteSettings`, add:
  ```typescript
  enablePrintSales: boolean   // show buy print button on photo pages and gallery modal
  ```

  In `DEFAULT_SETTINGS`, add:
  ```typescript
  enablePrintSales: false,
  ```

- [ ] **Step 3: Add `enablePrintSales` to `SITE_SETTINGS_QUERY` in `web/lib/sanity.ts`**

  In the `SITE_SETTINGS_QUERY` string, add:
  ```groq
  "enablePrintSales": coalesce(enablePrintSales, false)
  ```

- [ ] **Step 4: Add the toggle to `web/components/admin/SettingsPanel.tsx`**

  In the settings array, add a new entry after the `autoGenerateCaptions` entry:

  ```typescript
  {
    key: 'enablePrintSales' as const,
    label: 'Enable print sales',
    description: 'Shows the "Buy Print" button on photo pages and the gallery modal. Only photos synced to Shopify will show the button.',
  },
  ```

- [ ] **Step 5: Add `showBuyButton` prop to `web/components/Gallery.tsx`**

  In the component's props interface, add:
  ```typescript
  showBuyButton?: boolean
  ```

  In the `Gallery` function signature, add `showBuyButton = false` to the destructured props.

  Pass it through to `<PhotoModal>`:
  ```tsx
  <PhotoModal
    ...existing props...
    showBuyButton={showBuyButton}
  />
  ```

- [ ] **Step 6: Add `showBuyButton` prop to `web/components/PhotoModal.tsx`**

  In the `Props` type, add:
  ```typescript
  showBuyButton?: boolean
  ```

  In the function signature, add `showBuyButton = false` to the destructured props.

  The buy button rendering in Task 10 will use this prop to gate display.

- [ ] **Step 7: Extract `enablePrintSales` in `web/app/gallery/page.tsx`**

  Change the settings destructure from:
  ```typescript
  const { showCaptions } = settings ?? DEFAULT_SETTINGS
  ```
  to:
  ```typescript
  const { showCaptions, enablePrintSales } = settings ?? DEFAULT_SETTINGS
  ```

  Pass it to `<Gallery>`:
  ```tsx
  <Gallery photos={shuffled} showCaptions={showCaptions} showBuyButton={enablePrintSales} />
  ```

- [ ] **Step 8: Deploy schema to Sanity cloud**

  ```bash
  cd studio && npx sanity@latest schema deploy
  ```

- [ ] **Step 9: Run TypeScript check**

  ```bash
  cd web && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 10: Commit**

  ```bash
  git add studio/schemaTypes/siteSettingsType.ts web/types/index.ts web/lib/sanity.ts web/components/admin/SettingsPanel.tsx web/app/gallery/page.tsx web/components/Gallery.tsx web/components/PhotoModal.tsx
  git commit -m "feat: add enablePrintSales feature toggle to admin settings"
  ```

---

## Task 2: Middleware bypass for webhooks and generate-caption

**Files:**
- Modify: `web/middleware.ts`
- Modify: `web/__tests__/middleware.test.ts`

The Sanity webhook endpoint and the generate-caption endpoint are currently blocked by the site password gate. This fixes both in one change.

- [ ] **Step 1: Write the failing tests first**

  In `web/__tests__/middleware.test.ts`, add two new tests inside `describe('middleware – requirePassword bypass')` after the existing tests:

  ```typescript
  it('allows /api/webhooks/* through without a cookie', async () => {
    mockSanityFetch(true)
    const { middleware } = await import('@/middleware')
    const response = await middleware(makeRequest('/api/webhooks/sanity'))
    expect(response.headers.get('location')).toBeNull()
  })

  it('allows /api/generate-caption through without a cookie', async () => {
    mockSanityFetch(true)
    const { middleware } = await import('@/middleware')
    const response = await middleware(makeRequest('/api/generate-caption'))
    expect(response.headers.get('location')).toBeNull()
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  cd web && npx vitest run __tests__/middleware.test.ts
  ```

  Expected: the two new tests FAIL with `Expected: null, Received: "http://localhost:3000/password"`.

- [ ] **Step 3: Add bypasses to middleware**

  In `web/middleware.ts`, in the `if` block that calls `return NextResponse.next()` at the top of the `middleware` function, add two new conditions. The full block becomes:

  ```typescript
  if (
    pathname === '/password' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/generate-caption') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  cd web && npx vitest run __tests__/middleware.test.ts
  ```

  Expected: all tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add web/middleware.ts web/__tests__/middleware.test.ts
  git commit -m "fix: bypass site password gate for /api/webhooks and /api/generate-caption"
  ```

---

## Task 3: Shopify Admin API helper

**Files:**
- Create: `web/lib/shopify.ts`
- Create: `web/__tests__/lib/shopify.test.ts`

This helper centralises all Shopify Admin API calls. Both the webhook handler (Task 4) and the sync route (Task 6) import from here.

- [ ] **Step 1: Write the failing tests**

  Create `web/__tests__/lib/shopify.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  const mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)

  // Set required env vars before importing the module
  vi.stubEnv('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN', 'test.myshopify.com')
  vi.stubEnv('SHOPIFY_ADMIN_API_TOKEN', 'test-token')

  describe('upsertShopifyProduct', () => {
    beforeEach(() => {
      mockFetch.mockReset()
    })

    it('creates a new product when none exists with that handle', async () => {
      // GET by handle returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ products: [] }),
      })
      // POST create returns new product
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ product: { id: 99001 } }),
      })

      const { upsertShopifyProduct } = await import('@/lib/shopify')
      const result = await upsertShopifyProduct({
        _id: 'abc-123',
        title: 'A Great Photo',
        aiCaption: 'A fish',
        tags: ['ocean'],
        src: 'https://cdn.sanity.io/img.jpg',
      })

      expect(result).toEqual({ shopifyProductId: '99001' })
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // First call should be GET by handle
      const [getUrl] = mockFetch.mock.calls[0]
      expect(getUrl).toContain('handle=abc-123')

      // Second call should be POST
      const [postUrl, postOpts] = mockFetch.mock.calls[1]
      expect(postOpts.method).toBe('POST')
      const body = JSON.parse(postOpts.body)
      expect(body.product.title).toBe('A Great Photo')
      expect(body.product.handle).toBe('abc-123')
    })

    it('updates existing product when handle already exists', async () => {
      // GET by handle returns existing product
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ products: [{ id: 88001 }] }),
      })
      // PUT update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ product: { id: 88001 } }),
      })

      const { upsertShopifyProduct } = await import('@/lib/shopify')
      const result = await upsertShopifyProduct({ _id: 'abc-123', title: 'Updated Title' })

      expect(result).toEqual({ shopifyProductId: '88001' })
      const [putUrl, putOpts] = mockFetch.mock.calls[1]
      expect(putUrl).toContain('/products/88001.json')
      expect(putOpts.method).toBe('PUT')
    })

    it('returns rateLimited when Shopify returns 429', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })

      const { upsertShopifyProduct } = await import('@/lib/shopify')
      const result = await upsertShopifyProduct({ _id: 'abc-123', title: 'Test' })

      expect(result).toEqual({ rateLimited: true })
    })

    it('normalises Sanity _id as Shopify handle (replaces non-alphanumeric with hyphens)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ products: [] }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ product: { id: 1 } }),
      })

      const { upsertShopifyProduct } = await import('@/lib/shopify')
      await upsertShopifyProduct({ _id: 'photo_ID.test', title: 'X' })

      const [getUrl] = mockFetch.mock.calls[0]
      expect(getUrl).toContain('handle=photo-id-test')
    })
  })

  describe('archiveShopifyProduct', () => {
    beforeEach(() => {
      mockFetch.mockReset()
    })

    it('sends PUT with status archived', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })

      const { archiveShopifyProduct } = await import('@/lib/shopify')
      await archiveShopifyProduct('99001')

      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/products/99001.json')
      expect(opts.method).toBe('PUT')
      const body = JSON.parse(opts.body)
      expect(body.product.status).toBe('archived')
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  cd web && npx vitest run __tests__/lib/shopify.test.ts
  ```

  Expected: all tests FAIL with "Cannot find module '@/lib/shopify'".

- [ ] **Step 3: Create `web/lib/shopify.ts`**

  ```typescript
  // ─── Shopify Admin API helper ─────────────────────────────────────────────────
  // Used server-side only (API routes). Never import in client components.
  //
  // Uses the Shopify Admin REST API 2024-01.
  // Rate-limit (429) is surfaced as a typed return value so callers can
  // propagate a 5xx and trigger Sanity's built-in webhook retry.

  const SHOPIFY_API_VERSION = '2024-01'

  function shopifyAdminUrl(path: string): string {
    const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
    return `https://${domain}/admin/api/${SHOPIFY_API_VERSION}${path}`
  }

  async function shopifyAdminFetch(
    path: string,
    options: RequestInit = {},
  ): Promise<{ data: unknown; status: number }> {
    const res = await fetch(shopifyAdminUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN!,
        ...options.headers,
      },
    })

    if (res.status === 429) return { data: null, status: 429 }

    let data: unknown = null
    if (res.ok) {
      try { data = await res.json() } catch { /* ignore */ }
    }
    return { data, status: res.status }
  }

  // Sanity _id is already URL-safe but may contain dots or underscores.
  // Shopify handles must be lowercase alphanumeric + hyphens only.
  function normalizeHandle(sanityId: string): string {
    return sanityId.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  }

  export type ShopifyPhotoInput = {
    _id: string
    title: string
    aiCaption?: string
    tags?: string[]
    src?: string
  }

  export type UpsertResult =
    | { shopifyProductId: string }
    | { rateLimited: true }
    | { error: string }

  export async function upsertShopifyProduct(photo: ShopifyPhotoInput): Promise<UpsertResult> {
    const handle = normalizeHandle(photo._id)

    // Check whether a product with this handle already exists
    const { data: existingData, status: getStatus } = await shopifyAdminFetch(
      `/products.json?handle=${handle}&limit=1&fields=id`,
    )
    if (getStatus === 429) return { rateLimited: true }

    const existing = (existingData as { products?: { id: number }[] })?.products?.[0]

    const productPayload: Record<string, unknown> = {
      title: photo.title,
      body_html: photo.aiCaption ?? '',
      handle,
      tags: photo.tags?.join(', ') ?? '',
      status: 'active',
    }
    if (photo.src) {
      productPayload.images = [{ src: photo.src }]
    }

    if (existing) {
      // Update existing — same handle, same Shopify product
      const { status } = await shopifyAdminFetch(`/products/${existing.id}.json`, {
        method: 'PUT',
        body: JSON.stringify({ product: productPayload }),
      })
      if (status === 429) return { rateLimited: true }
      return { shopifyProductId: String(existing.id) }
    } else {
      // Create new product
      const { data, status } = await shopifyAdminFetch('/products.json', {
        method: 'POST',
        body: JSON.stringify({ product: productPayload }),
      })
      if (status === 429) return { rateLimited: true }
      const id = (data as { product?: { id: number } })?.product?.id
      if (!id) return { error: 'No product ID in Shopify response' }
      return { shopifyProductId: String(id) }
    }
  }

  export async function archiveShopifyProduct(shopifyProductId: string): Promise<void> {
    await shopifyAdminFetch(`/products/${shopifyProductId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product: { status: 'archived' } }),
    })
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  cd web && npx vitest run __tests__/lib/shopify.test.ts
  ```

  Expected: all tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add web/lib/shopify.ts web/__tests__/lib/shopify.test.ts
  git commit -m "feat: add Shopify Admin API helper with upsert and archive"
  ```

---

## Task 4: POST /api/webhooks/sanity

**Files:**
- Create: `web/app/api/webhooks/sanity/route.ts`
- Create: `web/__tests__/api/webhooks-sanity.test.ts`

Handles Sanity `create` and `update` events for photos. Re-fetches the full photo from Sanity (not the webhook payload) for idempotency.

**Signature format:** Sanity signs webhooks with HMAC-SHA256. The `sanity-webhook-signature` header has the format `t={unix_timestamp},v1={base64-encoded-signature}`. The HMAC is computed over the string `{timestamp}.{raw_body}`.

- [ ] **Step 1: Write the failing tests**

  Create `web/__tests__/api/webhooks-sanity.test.ts`:

  ```typescript
  // @vitest-environment node
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { createHmac } from 'crypto'
  import { NextRequest } from 'next/server'

  const SECRET = 'test-webhook-secret'

  function makeSignature(body: string, timestamp = '1700000000'): string {
    const hash = createHmac('sha256', SECRET).update(`${timestamp}.${body}`).digest('base64')
    return `t=${timestamp},v1=${hash}`
  }

  function makeRequest(body: object, signature?: string): NextRequest {
    const bodyStr = JSON.stringify(body)
    return new NextRequest('http://localhost:3000/api/webhooks/sanity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature !== undefined ? { 'sanity-webhook-signature': signature } : {}),
      },
      body: bodyStr,
    })
  }

  const mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)
  vi.stubEnv('SANITY_WEBHOOK_SECRET', SECRET)
  vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'testproject')
  vi.stubEnv('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN', 'test.myshopify.com')
  vi.stubEnv('SHOPIFY_ADMIN_API_TOKEN', 'test-token')

  // Mock @/lib/sanity to avoid real client init
  vi.mock('@/lib/sanity', () => ({
    sanityWriteClient: {
      fetch: vi.fn(),
      patch: vi.fn(() => ({ set: vi.fn(() => ({ commit: vi.fn() })) })),
    },
  }))

  // Mock @/lib/shopify
  vi.mock('@/lib/shopify', () => ({
    upsertShopifyProduct: vi.fn(),
  }))

  describe('POST /api/webhooks/sanity', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('returns 401 when signature is missing', async () => {
      const body = { _id: 'photo-1', _type: 'photo' }
      const { POST } = await import('@/app/api/webhooks/sanity/route')
      const res = await POST(makeRequest(body, undefined))
      expect(res.status).toBe(401)
    })

    it('returns 401 when signature is invalid', async () => {
      const body = { _id: 'photo-1', _type: 'photo' }
      const { POST } = await import('@/app/api/webhooks/sanity/route')
      const res = await POST(makeRequest(body, 't=9999,v1=badsignature'))
      expect(res.status).toBe(401)
    })

    it('skips non-photo document types', async () => {
      const body = { _id: 'settings-1', _type: 'siteSettings' }
      const sig = makeSignature(JSON.stringify(body))
      const { POST } = await import('@/app/api/webhooks/sanity/route')
      const res = await POST(makeRequest(body, sig))
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.skipped).toBe(true)
    })

    it('upserts Shopify product and writes ID back to Sanity on valid photo event', async () => {
      const { sanityWriteClient } = await import('@/lib/sanity')
      const { upsertShopifyProduct } = await import('@/lib/shopify')

      const mockPatch = { set: vi.fn(() => ({ commit: vi.fn().mockResolvedValue({}) })) }
      vi.mocked(sanityWriteClient.fetch).mockResolvedValueOnce({
        _id: 'photo-1',
        title: 'Test Photo',
        aiCaption: 'A fish',
        tags: ['ocean'],
        src: 'https://cdn.sanity.io/img.jpg',
      })
      vi.mocked(sanityWriteClient.patch).mockReturnValueOnce(mockPatch as never)
      vi.mocked(upsertShopifyProduct).mockResolvedValueOnce({ shopifyProductId: '99001' })

      const body = { _id: 'photo-1', _type: 'photo' }
      const sig = makeSignature(JSON.stringify(body))
      const { POST } = await import('@/app/api/webhooks/sanity/route')
      const res = await POST(makeRequest(body, sig))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.shopifyProductId).toBe('99001')
      expect(upsertShopifyProduct).toHaveBeenCalledWith(expect.objectContaining({ _id: 'photo-1' }))
      expect(sanityWriteClient.patch).toHaveBeenCalledWith('photo-1')
    })

    it('returns 503 when Shopify is rate-limited so Sanity retries', async () => {
      const { sanityWriteClient } = await import('@/lib/sanity')
      const { upsertShopifyProduct } = await import('@/lib/shopify')

      vi.mocked(sanityWriteClient.fetch).mockResolvedValueOnce({
        _id: 'photo-1',
        title: 'Test Photo',
        aiCaption: '',
        tags: [],
        src: null,
      })
      vi.mocked(upsertShopifyProduct).mockResolvedValueOnce({ rateLimited: true })

      const body = { _id: 'photo-1', _type: 'photo' }
      const sig = makeSignature(JSON.stringify(body))
      const { POST } = await import('@/app/api/webhooks/sanity/route')
      const res = await POST(makeRequest(body, sig))

      expect(res.status).toBe(503)
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  cd web && npx vitest run __tests__/api/webhooks-sanity.test.ts
  ```

  Expected: all tests FAIL with "Cannot find module '@/app/api/webhooks/sanity/route'".

- [ ] **Step 3: Create the webhook route**

  First create the directory:
  ```bash
  mkdir -p web/app/api/webhooks/sanity
  ```

  Create `web/app/api/webhooks/sanity/route.ts`:

  ```typescript
  // ─── Sanity Webhook Handler ────────────────────────────────────────────────────
  // Handles photo publish events from Sanity (create + update only, not delete).
  // On each event: re-fetches the full photo, upserts the Shopify product,
  // writes the product ID back to Sanity.
  //
  // Security: verifies HMAC-SHA256 signature in sanity-webhook-signature header.
  // Rate limiting: returns 503 on Shopify 429 so Sanity's retry fires.
  //
  // Configure in Sanity: filter _type == "photo", events: create + update.

  import { NextRequest, NextResponse } from 'next/server'
  import { createHmac } from 'crypto'
  import { sanityWriteClient } from '@/lib/sanity'
  import { upsertShopifyProduct } from '@/lib/shopify'
  import type { SanityWebhookPayload } from '@/types'

  // ── Signature verification ──────────────────────────────────────────────────
  // Sanity format: t={unix_timestamp},v1={base64-hmac-sha256}
  // HMAC is over the string: "{timestamp}.{raw_body}"

  async function verifySignature(
    req: NextRequest,
  ): Promise<{ valid: boolean; body: string }> {
    const secret = process.env.SANITY_WEBHOOK_SECRET
    if (!secret) return { valid: false, body: '' }

    const body = await req.text()
    const signature = req.headers.get('sanity-webhook-signature')
    if (!signature) return { valid: false, body }

    const match = signature.match(/t=(\d+),v1=([^,]+)/)
    if (!match) return { valid: false, body }

    const [, timestamp, hash] = match
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('base64')

    return { valid: expected === hash, body }
  }

  export async function POST(req: NextRequest) {
    try {
      const { valid, body } = await verifySignature(req)
      if (!valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const payload = JSON.parse(body) as SanityWebhookPayload

      if (payload._type !== 'photo') {
        return NextResponse.json({ ok: true, skipped: true })
      }

      // Re-fetch the full photo — do not trust the payload, which may be stale
      // if this is a retry and a prior run already wrote shopifyProductId back.
      const photo = await sanityWriteClient.fetch<{
        _id: string
        title: string
        aiCaption: string
        tags: string[]
        src: string | null
      } | null>(
        `*[_type == "photo" && _id == $id][0] {
          _id,
          title,
          "aiCaption": coalesce(aiCaption, ""),
          "tags": coalesce(tags, []),
          "src": image.asset->url
        }`,
        { id: payload._id },
      )

      if (!photo) {
        return NextResponse.json({ ok: true, skipped: 'photo not found' })
      }

      const result = await upsertShopifyProduct({
        _id: photo._id,
        title: photo.title,
        aiCaption: photo.aiCaption,
        tags: photo.tags,
        src: photo.src ?? undefined,
      })

      if ('rateLimited' in result) {
        // Return 5xx so Sanity's retry mechanism fires
        return NextResponse.json({ error: 'Shopify rate limit — will retry' }, { status: 503 })
      }

      if ('error' in result) {
        console.error('Shopify upsert error:', result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      await sanityWriteClient
        .patch(photo._id)
        .set({ shopifyProductId: result.shopifyProductId })
        .commit()

      console.log(`✅ Shopify product synced for ${photo._id}: ${result.shopifyProductId}`)
      return NextResponse.json({ ok: true, shopifyProductId: result.shopifyProductId })
    } catch (err) {
      console.error('Sanity webhook error:', err)
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
    }
  }

  export function GET() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  cd web && npx vitest run __tests__/api/webhooks-sanity.test.ts
  ```

  Expected: all tests PASS.

- [ ] **Step 5: Configure the Sanity webhook in Sanity dashboard (manual step)**

  - URL: `https://yoursite.com/api/webhooks/sanity`
  - Filter: `_type == "photo"`
  - Trigger on: create + update (NOT delete)
  - Enable HTTPS secret: use the value of `SANITY_WEBHOOK_SECRET`

- [ ] **Step 6: Commit**

  ```bash
  git add web/app/api/webhooks/ web/__tests__/api/webhooks-sanity.test.ts
  git commit -m "feat: add POST /api/webhooks/sanity to sync photos to Shopify on publish"
  ```

---

## Task 5: Extend DELETE /api/admin/photos (three-file call chain)

**Files:**
- Modify: `web/app/api/admin/photos/route.ts`
- Modify: `web/lib/adminApi.ts`
- Modify: `web/lib/hooks/usePhotoManagement.ts`
- Modify: `web/components/AdminDashboard.tsx`
- Modify: `web/__tests__/lib/adminApi.test.ts`

All three files must change together — the route accepts the new field, the API client sends it, and the hook passes it through.

- [ ] **Step 1: Extend the `deletePhoto` test in `web/__tests__/lib/adminApi.test.ts`**

  Find the existing `deletePhoto` describe block and update the existing test + add a new one:

  ```typescript
  describe('deletePhoto', () => {
    it('sends DELETE to /api/admin/photos with id, imageRef, and shopifyProductId', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const { deletePhoto } = await import('@/lib/adminApi')
      await deletePhoto('photo-123', 'image-asset-ref', 'shopify-product-999')
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'photo-123', imageRef: 'image-asset-ref', shopifyProductId: 'shopify-product-999' }),
      })
    })

    it('sends null shopifyProductId when not synced', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const { deletePhoto } = await import('@/lib/adminApi')
      await deletePhoto('photo-123', 'image-asset-ref', null)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'photo-123', imageRef: 'image-asset-ref', shopifyProductId: null }),
      })
    })
  })
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  ```bash
  cd web && npx vitest run __tests__/lib/adminApi.test.ts
  ```

  Expected: the updated `deletePhoto` tests FAIL (wrong argument count or missing field in body).

- [ ] **Step 3: Update `deletePhoto` in `web/lib/adminApi.ts`**

  Replace the current `deletePhoto` function:

  ```typescript
  export async function deletePhoto(
    id: string,
    imageRef: string,
    shopifyProductId: string | null,
  ): Promise<void> {
    await apiFetch('/api/admin/photos', {
      method: 'DELETE',
      body: JSON.stringify({ id, imageRef, shopifyProductId }),
    })
  }
  ```

- [ ] **Step 4: Update the `DELETE` handler in `web/app/api/admin/photos/route.ts`**

  Replace the `DELETE` export. The new version archives the Shopify product first (if `shopifyProductId` is present), then proceeds with the existing Sanity deletion logic:

  ```typescript
  export async function DELETE(request: Request) {
    try {
      const { id, imageRef, shopifyProductId } = await request.json() as {
        id: string
        imageRef: string
        shopifyProductId: string | null
      }

      if (!id) {
        return NextResponse.json({ ok: false, error: 'Missing photo id' }, { status: 400 })
      }

      // Archive Shopify product before deleting from Sanity.
      // Failure here is non-fatal — an orphaned unarchived product is preferable
      // to an orphaned Sanity document.
      if (shopifyProductId) {
        try {
          const { archiveShopifyProduct } = await import('@/lib/shopify')
          await archiveShopifyProduct(shopifyProductId)
        } catch (err) {
          console.error('Failed to archive Shopify product — continuing with Sanity delete:', err)
        }
      }

      await removeAllReferences(id)
      await sanityWriteClient.delete(id)

      if (imageRef) {
        try {
          await sanityWriteClient.delete(imageRef)
        } catch {
          // Asset may be referenced elsewhere — not a fatal error
        }
      }

      return NextResponse.json({ ok: true })
    } catch (err) {
      console.error('Admin photo delete error:', err)
      return NextResponse.json({ ok: false, error: String(err), stack: err instanceof Error ? err.stack : undefined }, { status: 500 })
    }
  }
  ```

  Also add the import at the top of the file:
  ```typescript
  import { NextResponse } from 'next/server'
  import { sanityWriteClient } from '@/lib/sanity'
  // (archiveShopifyProduct imported dynamically inside handler above)
  ```

- [ ] **Step 5: Update `deletePhoto` in `web/lib/hooks/usePhotoManagement.ts`**

  In the `deletePhoto` callback, change the signature and call:

  ```typescript
  const deletePhoto = useCallback(async (id: string, imageRef: string, shopifyProductId: string | null) => {
    setDeletingId(id)
    setConfirmDeleteId(null)

    try {
      await apiDeletePhoto(id, imageRef, shopifyProductId)
      setPhotos(prev => prev.filter(p => p._id !== id))
    } catch (err) {
      const detail = err instanceof Error ? err.message : undefined
      setFeedback({ id, msg: 'Delete failed', detail })
      setTimeout(() => setFeedback(null), 4000)
    } finally {
      setDeletingId(null)
    }
  }, [])
  ```

  Also update the return value type — `deletePhoto` now takes three args:
  ```typescript
  // Delete actions
  deletePhoto,   // (id: string, imageRef: string, shopifyProductId: string | null) => Promise<void>
  ```

- [ ] **Step 6: Update the delete handler in `web/components/AdminDashboard.tsx`**

  Find the `onDelete` prop passed to `PhotoTable` and update it to pass `shopifyProductId`:

  ```typescript
  onDelete={(id) => {
    const photo = photos.photos.find(p => p._id === id)
    if (photo) photos.deletePhoto(id, photo.imageRef, photo.shopifyProductId ?? null)
  }}
  ```

- [ ] **Step 7: Run the adminApi tests to confirm they pass**

  ```bash
  cd web && npx vitest run __tests__/lib/adminApi.test.ts
  ```

  Expected: all tests PASS.

- [ ] **Step 8: Run TypeScript check**

  ```bash
  cd web && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 9: Commit**

  ```bash
  git add web/app/api/admin/photos/route.ts web/lib/adminApi.ts web/lib/hooks/usePhotoManagement.ts web/components/AdminDashboard.tsx web/__tests__/lib/adminApi.test.ts
  git commit -m "feat: archive Shopify product before photo deletion (three-file call chain)"
  ```

---

## Task 6: POST /api/admin/sync-shopify

**Files:**
- Create: `web/app/api/admin/sync-shopify/route.ts`
- Create: `web/__tests__/api/admin/sync-shopify.test.ts`

Manual sync trigger used by the per-photo sync button and "Sync All Unsynced". Protected by the admin cookie (middleware handles this automatically for all `/api/admin/*` routes).

- [ ] **Step 1: Write the failing tests**

  Create `web/__tests__/api/admin/sync-shopify.test.ts`:

  ```typescript
  // @vitest-environment node
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'testproject')
  vi.stubEnv('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN', 'test.myshopify.com')
  vi.stubEnv('SHOPIFY_ADMIN_API_TOKEN', 'test-token')

  vi.mock('@/lib/sanity', () => ({
    sanityWriteClient: {
      fetch: vi.fn(),
      patch: vi.fn(() => ({ set: vi.fn(() => ({ commit: vi.fn() })) })),
    },
  }))

  vi.mock('@/lib/shopify', () => ({
    upsertShopifyProduct: vi.fn(),
  }))

  describe('POST /api/admin/sync-shopify', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('returns 400 when photoId is missing', async () => {
      const { POST } = await import('@/app/api/admin/sync-shopify/route')
      const res = await POST(new Request('http://localhost/api/admin/sync-shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }))
      expect(res.status).toBe(400)
    })

    it('returns 404 when photo does not exist in Sanity', async () => {
      const { sanityWriteClient } = await import('@/lib/sanity')
      vi.mocked(sanityWriteClient.fetch).mockResolvedValueOnce(null)

      const { POST } = await import('@/app/api/admin/sync-shopify/route')
      const res = await POST(new Request('http://localhost/api/admin/sync-shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: 'missing-photo' }),
      }))
      expect(res.status).toBe(404)
    })

    it('returns shopifyProductId on success', async () => {
      const { sanityWriteClient } = await import('@/lib/sanity')
      const { upsertShopifyProduct } = await import('@/lib/shopify')

      const mockPatch = { set: vi.fn(() => ({ commit: vi.fn().mockResolvedValue({}) })) }
      vi.mocked(sanityWriteClient.fetch).mockResolvedValueOnce({
        _id: 'photo-1',
        title: 'Test',
        aiCaption: '',
        tags: [],
        src: null,
      })
      vi.mocked(sanityWriteClient.patch).mockReturnValueOnce(mockPatch as never)
      vi.mocked(upsertShopifyProduct).mockResolvedValueOnce({ shopifyProductId: '77001' })

      const { POST } = await import('@/app/api/admin/sync-shopify/route')
      const res = await POST(new Request('http://localhost/api/admin/sync-shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: 'photo-1' }),
      }))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.ok).toBe(true)
      expect(json.shopifyProductId).toBe('77001')
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  cd web && npx vitest run __tests__/api/admin/sync-shopify.test.ts
  ```

  Expected: all tests FAIL with "Cannot find module".

- [ ] **Step 3: Create the sync-shopify route**

  ```bash
  mkdir -p web/app/api/admin/sync-shopify
  ```

  Create `web/app/api/admin/sync-shopify/route.ts`:

  ```typescript
  // ─── Admin: Manual Shopify Sync ────────────────────────────────────────────────
  // POST /api/admin/sync-shopify — syncs a single photo to Shopify on demand.
  // Used by the per-photo sync button and "Sync All Unsynced" in the admin panel.
  // Protected by admin cookie middleware (same as all /api/admin/* routes).

  import { NextResponse } from 'next/server'
  import { sanityWriteClient } from '@/lib/sanity'
  import { upsertShopifyProduct } from '@/lib/shopify'

  export async function POST(request: Request) {
    try {
      const { photoId } = await request.json() as { photoId: string }

      if (!photoId) {
        return NextResponse.json({ ok: false, error: 'Missing photoId' }, { status: 400 })
      }

      const photo = await sanityWriteClient.fetch<{
        _id: string
        title: string
        aiCaption: string
        tags: string[]
        src: string | null
      } | null>(
        `*[_type == "photo" && _id == $id][0] {
          _id,
          title,
          "aiCaption": coalesce(aiCaption, ""),
          "tags": coalesce(tags, []),
          "src": image.asset->url
        }`,
        { id: photoId },
      )

      if (!photo) {
        return NextResponse.json({ ok: false, error: 'Photo not found' }, { status: 404 })
      }

      const result = await upsertShopifyProduct({
        _id: photo._id,
        title: photo.title,
        aiCaption: photo.aiCaption,
        tags: photo.tags,
        src: photo.src ?? undefined,
      })

      if ('rateLimited' in result) {
        return NextResponse.json({ ok: false, error: 'Shopify rate limit — try again shortly' }, { status: 429 })
      }

      if ('error' in result) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
      }

      await sanityWriteClient
        .patch(photo._id)
        .set({ shopifyProductId: result.shopifyProductId })
        .commit()

      return NextResponse.json({ ok: true, shopifyProductId: result.shopifyProductId })
    } catch (err) {
      console.error('Sync shopify error:', err)
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
    }
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  cd web && npx vitest run __tests__/api/admin/sync-shopify.test.ts
  ```

  Expected: all tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add web/app/api/admin/sync-shopify/ web/__tests__/api/admin/sync-shopify.test.ts
  git commit -m "feat: add POST /api/admin/sync-shopify for manual photo-to-Shopify sync"
  ```

---

## Task 7: Admin UI — sync status badge + bulk sync

**Files:**
- Modify: `web/components/admin/PhotoTable.tsx`
- Modify: `web/components/admin/BulkOperations.tsx`
- Modify: `web/components/AdminDashboard.tsx`

No unit tests for these UI components — verify manually by loading the admin panel.

### 7a: PhotoTable — sync badge + per-photo sync button

- [ ] **Step 1: Add new props to `PhotoTableProps` in `web/components/admin/PhotoTable.tsx`**

  In the `PhotoTableProps` interface, add after `reuploadingId`:

  ```typescript
  /** Shopify sync */
  onSync: (id: string) => void
  syncingIds: Set<string>
  ```

- [ ] **Step 2: Add the props to the destructured parameter list**

  In the `PhotoTable` function signature, add `onSync` and `syncingIds` to the destructured props.

- [ ] **Step 3: Add the sync badge and sync button to each photo card**

  In the photo card's "Info" section (after the tags block, before the action bar), add:

  ```tsx
  {/* Shopify sync status */}
  <div className="mt-2 flex items-center justify-between">
    {photo.shopifyProductId ? (
      <span className="text-xs text-emerald-500 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        synced
      </span>
    ) : (
      <span className="text-xs text-amber-500 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        not synced
      </span>
    )}
    {!photo.shopifyProductId && (
      <button
        onClick={e => { e.stopPropagation(); onSync(photo._id) }}
        disabled={syncingIds.has(photo._id)}
        title="Sync to Shopify"
        className="text-xs text-slate-500 hover:text-sky-400 disabled:opacity-40 transition-colors flex items-center gap-1"
      >
        {syncingIds.has(photo._id) ? (
          <span className="inline-block w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        )}
        Sync
      </button>
    )}
  </div>
  ```

### 7b: BulkOperations — "Sync All Unsynced" with progress

- [ ] **Step 1: Add new props to `BulkOperationsProps` in `web/components/admin/BulkOperations.tsx`**

  In the `BulkOperationsProps` interface, add:

  ```typescript
  onSyncAll: () => void
  syncAllRunning: boolean
  syncAllProgress: { current: number; total: number } | null
  ```

- [ ] **Step 2: Add the props to the destructured parameter list**

- [ ] **Step 3: Change the return logic to always render when there are unsynced photos**

  Replace the early return:
  ```tsx
  const unsyncedCount = photos.filter(p => !p.shopifyProductId).length

  if (selectedIds.size === 0 && unsyncedCount === 0) {
    return null
  }
  ```

- [ ] **Step 4: Add the "Sync All Unsynced" section to the rendered output**

  Inside the main `<div>`, add this section before the existing content (which is now only shown when `selectedIds.size > 0`):

  ```tsx
  {/* Sync all unsynced — always shown when there are unsynced photos */}
  {unsyncedCount > 0 && (
    <div className="flex items-center gap-3 w-full">
      <button
        onClick={onSyncAll}
        disabled={syncAllRunning}
        className="text-sm bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-400 border border-emerald-500/30 rounded-lg px-4 py-1.5 transition-colors shrink-0 flex items-center gap-2"
      >
        {syncAllRunning ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            {syncAllProgress
              ? `Syncing ${syncAllProgress.current} / ${syncAllProgress.total}…`
              : 'Starting…'}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Sync all unsynced ({unsyncedCount})
          </>
        )}
      </button>
    </div>
  )}

  {/* Existing selection-based bulk actions */}
  {selectedIds.size > 0 && (
    <>
      <span className="text-sm text-sky-400 font-medium shrink-0">
        {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''} selected
      </span>
      {/* ... rest of existing content ... */}
    </>
  )}
  ```

  Note: wrap all the existing content (photo count + tag input + buttons + clear) inside the `selectedIds.size > 0` block.

### 7c: AdminDashboard — wire up sync state and callbacks

- [ ] **Step 1: Add sync state to `web/components/AdminDashboard.tsx`**

  Add at the top of the component (after the existing state):

  ```typescript
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const [syncAllRunning, setSyncAllRunning] = useState(false)
  const [syncAllProgress, setSyncAllProgress] = useState<{ current: number; total: number } | null>(null)
  ```

  Also add `useState` to the import if not already there (it's already imported via `useRef`).

- [ ] **Step 2: Add `handleSync` function**

  ```typescript
  async function handleSync(id: string) {
    setSyncingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/admin/sync-shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: id }),
      })
      if (res.ok) {
        const { shopifyProductId } = await res.json() as { shopifyProductId: string }
        photos.setPhotos(prev => prev.map(p => p._id === id ? { ...p, shopifyProductId } : p))
      }
    } catch {
      // Sync failure is non-fatal — badge stays amber, user can retry
    } finally {
      setSyncingIds(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }
  ```

- [ ] **Step 3: Add `handleSyncAll` function**

  ```typescript
  async function handleSyncAll() {
    const unsynced = photos.photos.filter(p => !p.shopifyProductId)
    if (!unsynced.length) return

    setSyncAllRunning(true)
    setSyncAllProgress({ current: 0, total: unsynced.length })

    for (let i = 0; i < unsynced.length; i++) {
      const photo = unsynced[i]
      setSyncAllProgress({ current: i + 1, total: unsynced.length })
      try {
        const res = await fetch('/api/admin/sync-shopify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId: photo._id }),
        })
        if (res.ok) {
          const { shopifyProductId } = await res.json() as { shopifyProductId: string }
          photos.setPhotos(prev => prev.map(p => p._id === photo._id ? { ...p, shopifyProductId } : p))
        }
      } catch {
        // Continue on individual failures
      }
    }

    setSyncAllRunning(false)
    setSyncAllProgress(null)
  }
  ```

- [ ] **Step 4: Pass new props to `PhotoTable`**

  In the `<PhotoTable>` JSX, add:
  ```tsx
  onSync={handleSync}
  syncingIds={syncingIds}
  ```

- [ ] **Step 5: Pass new props to `BulkOperations`**

  In the `<BulkOperations>` JSX, add:
  ```tsx
  onSyncAll={handleSyncAll}
  syncAllRunning={syncAllRunning}
  syncAllProgress={syncAllProgress}
  ```

- [ ] **Step 6: Run TypeScript check**

  ```bash
  cd web && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 7: Smoke test in browser**

  Start the dev server and go to `/admin`. Verify:
  - Photos with no `shopifyProductId` show the amber "not synced" badge
  - The "Sync all unsynced (N)" button is visible
  - Clicking the per-photo sync button on a single photo calls `POST /api/admin/sync-shopify` (check Network tab)
  - A Shopify product appears in your Shopify admin after sync

- [ ] **Step 8: Commit**

  ```bash
  git add web/components/admin/PhotoTable.tsx web/components/admin/BulkOperations.tsx web/components/AdminDashboard.tsx
  git commit -m "feat: add Shopify sync status badge, per-photo sync, and Sync All Unsynced to admin panel"
  ```

---

## Task 8: BuyPrintButton component

**Files:**
- Create: `web/components/BuyPrintButton.tsx`

Browser-only. The Shopify Buy Button SDK is not SSR-compatible. Consuming files import with `dynamic(..., { ssr: false })`.

- [ ] **Step 1: Install the npm package**

  ```bash
  cd web && npm install @shopify/buy-button-js
  ```

  Expected: package added to `package.json` and `package-lock.json`.

- [ ] **Step 2: Create `web/components/BuyPrintButton.tsx`**

  ```typescript
  'use client'

  // ─── BuyPrintButton ──────────────────────────────────────────────────────────
  // Renders a Shopify Buy Button SDK component for a given product ID.
  // The SDK is browser-only — this file must be loaded with:
  //   dynamic(() => import('./BuyPrintButton'), { ssr: false })
  //
  // Cleanup: component.destroy() is called on unmount to prevent orphaned SDK
  // instances when the modal navigates between photos.

  import { useEffect, useRef } from 'react'

  type Props = {
    shopifyProductId: string
  }

  export default function BuyPrintButton({ shopifyProductId }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      let component: { destroy(): void } | null = null

      async function init() {
        // Dynamic import keeps this out of the server bundle
        const ShopifyBuy = (await import('@shopify/buy-button-js')).default

        const client = ShopifyBuy.buildClient({
          domain: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!,
          storefrontAccessToken: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN!,
        })

        const ui = ShopifyBuy.UI.init(client)

        component = ui.createComponent('product', {
          id: shopifyProductId,
          node: containerRef.current,
          options: {
            product: {
              buttonDestination: 'checkout',
              text: { button: 'Buy Print' },
            },
          },
        })
      }

      if (containerRef.current) {
        init().catch(console.error)
      }

      return () => {
        component?.destroy()
      }
    }, [shopifyProductId])

    return <div ref={containerRef} />
  }
  ```

- [ ] **Step 3: Run TypeScript check**

  ```bash
  cd web && npx tsc --noEmit
  ```

  Expected: no errors. If `@shopify/buy-button-js` has no types, install `@types/shopify-buy` or add a type shim as needed.

- [ ] **Step 4: Commit**

  ```bash
  git add web/components/BuyPrintButton.tsx web/package.json web/package-lock.json
  git commit -m "feat: add BuyPrintButton component (Shopify Buy Button SDK)"
  ```

---

## Task 9: Buy button on /photo/[id] page

**Files:**
- Modify: `web/app/photo/[id]/page.tsx`

The photo detail page is a server component that already fetches `SiteSettings`. Gate the buy button on both `enablePrintSales` setting AND `photo.shopifyProductId` being present.

- [ ] **Step 1: Add `dynamic` import at the top of `web/app/photo/[id]/page.tsx`**

  Add after the existing imports:

  ```typescript
  import dynamic from 'next/dynamic'

  const BuyPrintButton = dynamic(() => import('@/components/BuyPrintButton'), { ssr: false })
  ```

- [ ] **Step 2: Extract `enablePrintSales` from settings**

  Change the settings destructure from:
  ```typescript
  const { showCaptions } = settings ?? DEFAULT_SETTINGS
  ```
  to:
  ```typescript
  const { showCaptions, enablePrintSales } = settings ?? DEFAULT_SETTINGS
  ```

- [ ] **Step 3: Add the button below the EXIF metadata block**

  In the JSX, after the camera/lens block (the `{(photo.camera || ...)}` conditional), add:

  ```tsx
  {/* Buy print */}
  {enablePrintSales && photo.shopifyProductId && (
    <div className="pt-4 border-t border-slate-800">
      <BuyPrintButton shopifyProductId={photo.shopifyProductId} />
    </div>
  )}
  ```

- [ ] **Step 3: Run TypeScript check**

  ```bash
  cd web && npx tsc --noEmit
  ```

- [ ] **Step 4: Smoke test**

  Navigate to a `/photo/[id]` page for a photo that has been synced to Shopify. The buy button should appear below the EXIF block. Clicking it should open the Shopify checkout drawer. For unsynced photos, nothing should appear.

- [ ] **Step 5: Commit**

  ```bash
  git add web/app/photo/\[id\]/page.tsx
  git commit -m "feat: add BuyPrintButton to /photo/[id] page"
  ```

---

## Task 10: Buy button in PhotoModal

**Files:**
- Modify: `web/components/PhotoModal.tsx`

`PhotoModal` already received `showBuyButton` as a prop in Task 1.5. Gate the button on both `showBuyButton` AND `photo.shopifyProductId`.

- [ ] **Step 1: Add `dynamic` import at the top of `web/components/PhotoModal.tsx`**

  Add after the existing imports:

  ```typescript
  import dynamic from 'next/dynamic'

  const BuyPrintButton = dynamic(() => import('./BuyPrintButton'), { ssr: false })
  ```

- [ ] **Step 2: Add the button in the metadata strip**

  In the JSX, after the EXIF block (the `{hasExif && (...)}` conditional), add:

  ```tsx
  {/* Buy print */}
  {showBuyButton && photo.shopifyProductId && (
    <div className="pt-2.5 border-t border-slate-800">
      <BuyPrintButton shopifyProductId={photo.shopifyProductId} />
    </div>
  )}
  ```

- [ ] **Step 3: Run TypeScript check**

  ```bash
  cd web && npx tsc --noEmit
  ```

- [ ] **Step 4: Smoke test**

  Open the gallery, click a photo that is synced to Shopify. The buy button should appear in the modal footer. Navigate to the next photo — the SDK should reinitialise without errors (check browser console). Navigate back — no orphaned SDK instances.

- [ ] **Step 5: Commit**

  ```bash
  git add web/components/PhotoModal.tsx
  git commit -m "feat: add BuyPrintButton to PhotoModal"
  ```

---

## Task 11: Backfill existing photos

This is a one-time manual operation, not a code change.

- [ ] Go to `/admin` and click "Sync all unsynced (N)" in the admin panel
- [ ] Wait for the progress counter to reach `N / N`
- [ ] Verify the Shopify admin shows all expected products

---

## Final verification

- [ ] Run all unit tests and confirm no regressions:

  ```bash
  cd web && npx vitest run
  ```

  Expected: all tests PASS.

- [ ] Run TypeScript check across the whole project:

  ```bash
  cd web && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] Run e2e tests:

  ```bash
  cd web && npx playwright test
  ```

  Expected: all tests PASS.
