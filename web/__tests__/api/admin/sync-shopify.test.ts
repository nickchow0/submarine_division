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
    vi.mocked(sanityWriteClient.fetch).mockResolvedValueOnce(null as never)

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
    } as never)
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
