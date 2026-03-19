// ─── Admin Photos API ─────────────────────────────────────────────────────────
// PATCH /api/admin/photos — update metadata for a single photo in Sanity.
// Only reachable after the admin cookie is set (middleware enforces this).

import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity'

// ─── Recursively find all paths in a document where a specific _ref appears ───
// Returns Sanity patch path strings, e.g. ["photos[_ref==\"id\"]", "hero._ref"]
// Array items that ARE the reference use the filter syntax so the whole element
// is removed; plain reference fields are returned as-is so the caller can unset them.
function findRefPaths(node: unknown, photoId: string, path = ''): string[] {
  if (!node || typeof node !== 'object') return []

  if (Array.isArray(node)) {
    const paths: string[] = []
    // Check if any element in the array is a direct reference to photoId
    const hasDirectRef = node.some(
      item => item && typeof item === 'object' && (item as Record<string, unknown>)._ref === photoId
    )
    if (hasDirectRef) {
      // Unset all matching elements in one expression
      paths.push(`${path}[_ref == "${photoId}"]`)
    }
    // Also recurse into non-reference array elements (e.g. arrays of objects)
    for (const item of node) {
      if (item && typeof item === 'object' && !('_ref' in (item as object))) {
        paths.push(...findRefPaths(item, photoId, path))
      }
    }
    return paths
  }

  const record = node as Record<string, unknown>

  // Direct reference field
  if (record._ref === photoId) return [path]

  // Recurse into object fields (skip Sanity metadata keys)
  const paths: string[] = []
  for (const [key, val] of Object.entries(record)) {
    if (key.startsWith('_')) continue
    const childPath = path ? `${path}.${key}` : key
    paths.push(...findRefPaths(val, photoId, childPath))
  }
  return paths
}

// ─── Remove all references to a photo across every document that holds one ────
async function removeAllReferences(photoId: string): Promise<void> {
  // Find every document (of any type) that references this photo
  const referencing = await sanityWriteClient.fetch<{ _id: string }[]>(
    `*[references($photoId) && !(_id in path("drafts.**"))]{ _id }`,
    { photoId }
  )

  await Promise.all(referencing.map(async ({ _id }) => {
    // Fetch the full document so we can walk its structure
    const doc = await sanityWriteClient.getDocument(_id)
    if (!doc) return

    const paths = findRefPaths(doc, photoId)
    if (!paths.length) return

    await sanityWriteClient.patch(_id).unset(paths).commit()
  }))
}

export async function PATCH(request: Request) {
  try {
    const { id, fields } = await request.json() as {
      id: string
      fields: {
        title?: string
        tags?: string[]
        aiCaption?: string
        location?: string | null
        camera?: string | null
        dateTaken?: string | null
        visible?: boolean
        lens?: string | null
        focalLength?: string | null
        iso?: string | null
        shutterSpeed?: string | null
        aperture?: string | null
      }
    }

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing photo id' }, { status: 400 })
    }

    // Only patch the fields that were actually sent
    const patch = sanityWriteClient.patch(id)

    const updates: Record<string, unknown> = {}
    if (fields.title       !== undefined) updates.title       = fields.title
    if (fields.tags        !== undefined) updates.tags        = fields.tags
    if (fields.aiCaption   !== undefined) updates.aiCaption   = fields.aiCaption
    if (fields.location    !== undefined) updates.location    = fields.location
    if (fields.camera      !== undefined) updates.camera      = fields.camera
    if (fields.dateTaken   !== undefined) updates.dateTaken   = fields.dateTaken
    if (fields.visible     !== undefined) updates.visible     = fields.visible
    if (fields.lens        !== undefined) updates.lens        = fields.lens
    if (fields.focalLength !== undefined) updates.focalLength = fields.focalLength
    if (fields.iso         !== undefined) updates.iso         = fields.iso
    if (fields.shutterSpeed !== undefined) updates.shutterSpeed = fields.shutterSpeed
    if (fields.aperture    !== undefined) updates.aperture    = fields.aperture

    await patch.set(updates).commit()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Admin photo update error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

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

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
