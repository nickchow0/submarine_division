// ─── Admin Photo List API ─────────────────────────────────────────────────────
// GET /api/admin/photos-list
// Returns all photos with the extra `imageRef` field needed for caption generation.

import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity'

// Admin query fetches ALL published photos regardless of visibility.
// Excludes drafts (ids starting with "drafts.") to avoid duplicates.
const ADMIN_PHOTOS_QUERY = `
  *[_type == "photo" && !(_id in path("drafts.**"))] | order(dateTaken desc) {
    _id,
    title,
    "tags": coalesce(tags, []),
    "aiCaption": coalesce(aiCaption, ""),
    "location": coalesce(location, null),
    "camera": coalesce(camera, null),
    "dateTaken": coalesce(dateTaken, null),
    "visible": coalesce(visible, true),
    "src": image.asset->url,
    "width": image.asset->metadata.dimensions.width,
    "height": image.asset->metadata.dimensions.height,
    "imageRef": image.asset._ref
  }
`

export async function GET() {
  try {
    const photos = await sanityClient.fetch(ADMIN_PHOTOS_QUERY)
    return NextResponse.json({ photos })
  } catch (err) {
    console.error('Admin photos fetch error:', err)
    return NextResponse.json({ photos: [], error: String(err) }, { status: 500 })
  }
}
