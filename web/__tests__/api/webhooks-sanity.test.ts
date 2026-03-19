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
    } as never)
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
    } as never)
    vi.mocked(upsertShopifyProduct).mockResolvedValueOnce({ rateLimited: true })

    const body = { _id: 'photo-1', _type: 'photo' }
    const sig = makeSignature(JSON.stringify(body))
    const { POST } = await import('@/app/api/webhooks/sanity/route')
    const res = await POST(makeRequest(body, sig))

    expect(res.status).toBe(503)
  })
})
