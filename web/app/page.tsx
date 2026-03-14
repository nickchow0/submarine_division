// ─── Home Page ────────────────────────────────────────────────────────────────
// This is a SERVER Component. It runs at build time (or on the server)
// to fetch all photos from Sanity, then passes them to the Gallery
// client component which handles all the interactive stuff.
//
// Why split it this way?
//   - Data fetching belongs on the server (no API key exposed to browser)
//   - Interactivity (useState, event handlers) belongs on the client
//   - This pattern is called "lifting data up to the server"

import { sanityClient, ALL_PHOTOS_QUERY } from '@/lib/sanity'
import Gallery from '@/components/Gallery'
import type { Photo } from '@/types'

// Tell Next.js to revalidate this page every 60 seconds.
// New photos published in Sanity will appear within 1 minute without
// a full redeploy. Set to 0 for always-fresh, or false to never revalidate.
export const revalidate = 60

export default async function HomePage() {
  // This runs on the server — the Sanity client is safe to use here
  const photos: Photo[] = await sanityClient.fetch(ALL_PHOTOS_QUERY)

  return (
    // Gallery receives the full photo list and handles everything client-side
    <Gallery photos={photos} />
  )
}
