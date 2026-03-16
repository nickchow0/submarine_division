// ─── Admin Photo Upload API ───────────────────────────────────────────────────
// POST /api/admin/upload  (multipart/form-data, field "file")
//
// 1. Uploads the image binary to Sanity's asset store
// 2. Creates a new `photo` document referencing that asset
// 3. Returns the full AdminPhoto shape so the client can add it to local state
//    without a page reload. Caption generation is handled client-side afterwards.

import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity'

// Allow up to 60 seconds — large files take time to transfer to Sanity
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || !file.size) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 })
    }

    // ── Upload directly to Sanity asset store ────────────────────────────────
    // Pass the Blob/File directly instead of converting to a Buffer first —
    // avoids creating two copies of the file in memory (important for large files).
    const asset = await sanityWriteClient.assets.upload('image', file, {
      filename: file.name,
      contentType: file.type || 'image/jpeg',
    })

    // ── Derive a human-readable title from the filename ──────────────────────
    const title = file.name
      .replace(/\.[^/.]+$/, '')          // strip extension
      .replace(/[-_]+/g, ' ')            // hyphens / underscores → spaces
      .replace(/\b\w/g, c => c.toUpperCase()) // Title Case

    // ── Create the photo document ────────────────────────────────────────────
    const doc = await sanityWriteClient.create({
      _type: 'photo',
      title,
      image: {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
      },
      visible: true,
      tags: [],
      aiCaption: '',
    })

    // ── Return AdminPhoto shape ───────────────────────────────────────────────
    return NextResponse.json({
      ok: true,
      photo: {
        _id:       doc._id,
        title,
        tags:      [],
        aiCaption: '',
        location:  null,
        camera:    null,
        dateTaken: null,
        visible:   true,
        src:       asset.url,
        width:     (asset as any).metadata?.dimensions?.width  ?? 0,
        height:    (asset as any).metadata?.dimensions?.height ?? 0,
        imageRef:  asset._id,
      },
    })
  } catch (err) {
    console.error('Photo upload error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
