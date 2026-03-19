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

    console.log(`Shopify product synced for ${photo._id}: ${result.shopifyProductId}`)
    return NextResponse.json({ ok: true, shopifyProductId: result.shopifyProductId })
  } catch (err) {
    console.error('Sanity webhook error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
