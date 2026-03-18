// ─── Admin Photo Reupload API ─────────────────────────────────────────────────
// POST /api/admin/reupload  (multipart/form-data, fields: "file", "id")
//
// Replaces the image on an existing photo document:
// 1. Uploads the new image binary to Sanity's asset store
// 2. Patches the existing photo document with the new asset reference + fresh EXIF
// 3. Preserves title, tags, aiCaption, location and all other metadata fields
// 4. Returns the updated AdminPhoto shape so the client can update local state

import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity'
import { parseExif } from '@/lib/exif'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const id   = formData.get('id')  as string | null

    if (!file || !file.size) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 })
    }
    if (!id) {
      return NextResponse.json({ ok: false, error: 'No photo id provided' }, { status: 400 })
    }

    // ── Read buffer once for EXIF parsing and upload ──────────────────────────
    const buf  = Buffer.from(await file.arrayBuffer())
    const exif = parseExif(buf)

    // ── Upload new image to Sanity asset store ────────────────────────────────
    const asset = await sanityWriteClient.assets.upload('image', buf, {
      filename: file.name,
      contentType: file.type || 'image/jpeg',
    })

    // ── Patch the existing photo document ────────────────────────────────────
    // Replaces the image reference and all EXIF fields.
    // Title, tags, aiCaption, location, visible are intentionally left untouched.
    await sanityWriteClient
      .patch(id)
      .set({
        image: {
          _type: 'image',
          asset: { _type: 'reference', _ref: asset._id },
        },
        camera:       exif.camera       ?? null,
        lens:         exif.lens         ?? null,
        focalLength:  exif.focalLength  ?? null,
        iso:          exif.iso          ?? null,
        shutterSpeed: exif.shutterSpeed ?? null,
        aperture:     exif.aperture     ?? null,
        dateTaken:    exif.dateTaken    ?? null,
      })
      .commit()

    return NextResponse.json({
      ok: true,
      updates: {
        src:          asset.url,
        width:        (asset as any).metadata?.dimensions?.width  ?? 0,
        height:       (asset as any).metadata?.dimensions?.height ?? 0,
        imageRef:     asset._id,
        camera:       exif.camera       ?? null,
        lens:         exif.lens         ?? null,
        focalLength:  exif.focalLength  ?? null,
        iso:          exif.iso          ?? null,
        shutterSpeed: exif.shutterSpeed ?? null,
        aperture:     exif.aperture     ?? null,
        dateTaken:    exif.dateTaken    ?? null,
      },
    })
  } catch (err) {
    console.error('Photo reupload error:', err)
    return NextResponse.json({ ok: false, error: String(err), stack: err instanceof Error ? err.stack : undefined }, { status: 500 })
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
