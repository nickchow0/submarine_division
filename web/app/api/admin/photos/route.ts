// ─── Admin Photos API ─────────────────────────────────────────────────────────
// PATCH /api/admin/photos — update metadata for a single photo in Sanity.
// Only reachable after the admin cookie is set (middleware enforces this).

import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity'

export async function PATCH(request: Request) {
  try {
    const { id, fields } = await request.json() as {
      id: string
      fields: {
        title?: string
        tags?: string[]
        aiCaption?: string
        location?: string
        camera?: string
        dateTaken?: string
        visible?: boolean
      }
    }

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing photo id' }, { status: 400 })
    }

    // Only patch the fields that were actually sent
    const patch = sanityWriteClient.patch(id)

    const updates: Record<string, unknown> = {}
    if (fields.title      !== undefined) updates.title      = fields.title
    if (fields.tags       !== undefined) updates.tags       = fields.tags
    if (fields.aiCaption  !== undefined) updates.aiCaption  = fields.aiCaption
    if (fields.location   !== undefined) updates.location   = fields.location
    if (fields.camera     !== undefined) updates.camera     = fields.camera
    if (fields.dateTaken  !== undefined) updates.dateTaken  = fields.dateTaken
    if (fields.visible    !== undefined) updates.visible    = fields.visible

    await patch.set(updates).commit()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Admin photo update error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, imageRef } = await request.json() as { id: string; imageRef: string }

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing photo id' }, { status: 400 })
    }

    // Delete the photo document first
    await sanityWriteClient.delete(id)

    // Also delete the underlying image asset so it doesn't pile up in the media library.
    // image.asset._ref is the asset document's _id, so we can delete it directly.
    // If the asset is referenced by other documents this will fail silently — that's fine.
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
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
