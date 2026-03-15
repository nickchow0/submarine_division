'use client'

import dynamic from 'next/dynamic'
import type { MapPin } from '@/types'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
      Loading map…
    </div>
  ),
})

export default function MapViewWrapper({ pins }: { pins: MapPin[] }) {
  return <MapView pins={pins} />
}
