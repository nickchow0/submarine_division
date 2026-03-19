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
