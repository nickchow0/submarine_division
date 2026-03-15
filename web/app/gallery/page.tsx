// ─── Gallery Page ─────────────────────────────────────────────────────────────
// This is a SERVER Component. It runs at build time (or on the server)
// to fetch all photos from Sanity, then passes them to the Gallery
// client component which handles all the interactive stuff.

import { sanityClient, ALL_PHOTOS_QUERY } from '@/lib/sanity'
import Gallery from '@/components/Gallery'
import type { Photo } from '@/types'

// Tell Next.js to revalidate this page every 60 seconds.
export const revalidate = 60

export default async function GalleryPage() {
  const photos: Photo[] = await sanityClient.fetch(ALL_PHOTOS_QUERY)

  return (
    <Gallery photos={photos} />
  )
}
