// ─── Map Page ─────────────────────────────────────────────────────────────────
// Server component — fetches all map pins from Sanity, passes to client map.

import { sanityClient, ALL_MAP_PINS_QUERY } from '@/lib/sanity'
import MapViewWrapper from '@/components/MapViewWrapper'
import type { MapPin } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Map — Submarine Division',
  description: 'Dive locations around the world',
}

export const revalidate = 60

export default async function MapPage() {
  const pins = await sanityClient.fetch<MapPin[]>(ALL_MAP_PINS_QUERY)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
      <MapViewWrapper pins={pins} />
    </div>
  )
}
