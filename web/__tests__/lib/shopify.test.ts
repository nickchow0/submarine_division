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
