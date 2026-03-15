// ─── Landing Page ─────────────────────────────────────────────────────────────
// Full-width hero carousel that cycles through photos, with a CTA to the gallery.

import Link from 'next/link'
import { sanityClient, ALL_PHOTOS_QUERY } from '@/lib/sanity'
import Carousel from '@/components/Carousel'
import type { Photo } from '@/types'

export const revalidate = 60

export default async function LandingPage() {
  const photos: Photo[] = await sanityClient.fetch(ALL_PHOTOS_QUERY)

  // Use up to 8 photos for the carousel
  const carouselPhotos = photos.slice(0, 8)

  return (
    <div>
      {/* Hero carousel */}
      <Carousel photos={carouselPhotos} />

    </div>
  )
}
