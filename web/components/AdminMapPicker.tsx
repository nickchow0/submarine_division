'use client'

import { useEffect, useRef, useState } from 'react'
import type LType from 'leaflet'
import type { Map as LeafletMap, Marker } from 'leaflet'

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
  const mapRef        = useRef<LeafletMap | null>(null)
  const LRef          = useRef<typeof LType | null>(null)
  const markersRef    = useRef<Map<string, Marker>>(new Map())
  const pendingRef    = useRef<Marker | null>(null)
  const [ready, setReady] = useState(false)

  // Store callbacks in refs so effects don't need them as dependencies
  const onMapClickRef = useRef(onMapClick)
  const onPinClickRef = useRef(onPinClick)
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])
  useEffect(() => { onPinClickRef.current = onPinClick }, [onPinClick])

  // ── Initialize map once (lazy import so layout is settled first) ──────────
  useEffect(() => {
    if (mapRef.current) return
    let cancelled = false

    import('leaflet').then(({ default: L }) => {
      if (cancelled || !containerRef.current || mapRef.current) return

      LRef.current = L

      // Fix default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       '/leaflet/marker-icon.png',
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        shadowUrl:     '/leaflet/marker-shadow.png',
      })

      const map = L.map(containerRef.current, { center: [20, 0], zoom: 2 })
      mapRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      map.on('click', (e: LType.LeafletMouseEvent) => {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng)
      })

      // Lazy import gives layout time to settle, but call invalidateSize for
      // any remaining off-by-one from the container's final paint.
      requestAnimationFrame(() => {
        map.invalidateSize()
        setReady(true)
      })
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      LRef.current = null
      markersRef.current.clear()
      pendingRef.current = null
    }
  }, [])

  // ── Sync existing pin markers ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const L   = LRef.current
    if (!map || !L || !ready) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()

    const pinIcon = (color: string) => L.divIcon({
      className: '',
      iconAnchor: [12, 36],
      html: `<svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"
          fill="${color}" opacity="0.85"/>
        <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
      </svg>`,
    })

    pins.forEach(pin => {
      const marker = L.marker(
        [pin.coordinates.lat, pin.coordinates.lng],
        { icon: pinIcon('#0ea5e9') }
      ).addTo(map)

      marker.on('click', (e: LType.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e)
        onPinClickRef.current(pin)
      })
      markersRef.current.set(pin._id, marker)
    })

    if (pins.length === 1) {
      map.setView([pins[0].coordinates.lat, pins[0].coordinates.lng], 6)
    } else if (pins.length > 1) {
      const bounds = L.latLngBounds(pins.map(p => [p.coordinates.lat, p.coordinates.lng]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [pins, ready])

  // ── Sync pending (unsaved) pin marker ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const L   = LRef.current
    if (!map || !L || !ready) return

    pendingRef.current?.remove()
    pendingRef.current = null

    if (!pendingCoords) return

    const pendingIcon = L.divIcon({
      className: '',
      iconAnchor: [12, 36],
      html: `<svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"
          fill="#f59e0b" opacity="0.85"/>
        <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
      </svg>`,
    })

    const marker = L.marker([pendingCoords.lat, pendingCoords.lng], {
      icon: pendingIcon,
      draggable: true,
    }).addTo(map)

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng()
      onMapClickRef.current(lat, lng)
    })

    pendingRef.current = marker
  }, [pendingCoords, ready])

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
