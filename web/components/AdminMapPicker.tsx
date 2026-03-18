'use client'

import { useEffect, useRef } from 'react'
import type LType from 'leaflet'
import type { Marker } from 'leaflet'
import { useLeafletMap } from '@/lib/hooks/useLeafletMap'
import { createPinIcon } from '@/lib/mapUtils'

// Minimal type — only the fields the map picker needs
export type PinBase = {
  _id: string
  name: string
  coordinates: { lat: number; lng: number }
}

type Props = {
  pins: PinBase[]
  pendingCoords: { lat: number; lng: number } | null
  onMapClick: (lat: number, lng: number) => void
  onPinClick: (pin: PinBase) => void
}

export default function AdminMapPicker({ pins, pendingCoords, onMapClick, onPinClick }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const markersRef    = useRef<Map<string, Marker>>(new Map())
  const pendingRef    = useRef<Marker | null>(null)

  const { map, isReady } = useLeafletMap(containerRef)

  // Store callbacks in refs so effects don't need them as dependencies
  const onMapClickRef = useRef(onMapClick)
  const onPinClickRef = useRef(onPinClick)
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])
  useEffect(() => { onPinClickRef.current = onPinClick }, [onPinClick])

  // ── Sync existing pin markers ─────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !map) return

    import('leaflet').then(L => {
      const leafletL = L.default

      // Fix broken webpack default icon (specific to AdminMapPicker)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (leafletL.Icon.Default.prototype as any)._getIconUrl
      leafletL.Icon.Default.mergeOptions({
        iconUrl:       '/leaflet/marker-icon.png',
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        shadowUrl:     '/leaflet/marker-shadow.png',
      })

      map.on('click', (e: LType.LeafletMouseEvent) => {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng)
      })

      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()

      // Set globalThis.L before calling createPinIcon
      ;(globalThis as unknown as { L: typeof leafletL }).L = leafletL

      pins.forEach(pin => {
        const marker = leafletL.marker(
          [pin.coordinates.lat, pin.coordinates.lng],
          { icon: createPinIcon('#0ea5e9') }
        ).addTo(map)

        marker.on('click', (e: LType.LeafletMouseEvent) => {
          leafletL.DomEvent.stopPropagation(e)
          onPinClickRef.current(pin)
        })
        markersRef.current.set(pin._id, marker)
      })

      if (pins.length === 1) {
        map.setView([pins[0].coordinates.lat, pins[0].coordinates.lng], 6)
      } else if (pins.length > 1) {
        const bounds = leafletL.latLngBounds(pins.map(p => [p.coordinates.lat, p.coordinates.lng]))
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    })
  }, [isReady, map, pins])

  // ── Sync pending (unsaved) pin marker ────────────────────────────────────
  useEffect(() => {
    if (!isReady || !map) return

    import('leaflet').then(L => {
      const leafletL = L.default

      pendingRef.current?.remove()
      pendingRef.current = null

      if (!pendingCoords) return

      // Set globalThis.L before calling createPinIcon
      ;(globalThis as unknown as { L: typeof leafletL }).L = leafletL

      const marker = leafletL.marker([pendingCoords.lat, pendingCoords.lng], {
        icon: createPinIcon('#f59e0b'),
        draggable: true,
      }).addTo(map)

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng()
        onMapClickRef.current(lat, lng)
      })

      pendingRef.current = marker
    })
  }, [isReady, map, pendingCoords])

  return (
    <div className="absolute inset-0 flex">
      <div
        ref={containerRef}
        className="flex-1"
        style={{ background: '#0f172a', cursor: 'crosshair' }}
      />
    </div>
  )
}
