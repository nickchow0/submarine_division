'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
// leaflet/dist/leaflet.css is imported in globals.css

// Minimal type — only the fields the map picker needs
export type PinBase = {
  _id: string
  name: string
  coordinates: { lat: number; lng: number }
}

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    iconAnchor: [12, 36],
    html: `<svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"
        fill="${color}" opacity="0.85"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
    </svg>`,
  })
}

const existingIcon = pinIcon('#0ea5e9') // sky blue
const pendingIcon  = pinIcon('#f59e0b') // amber = unsaved

type Props = {
  pins: PinBase[]
  pendingCoords: { lat: number; lng: number } | null
  onMapClick: (lat: number, lng: number) => void
  onPinClick: (pin: PinBase) => void
}

export default function AdminMapPicker({ pins, pendingCoords, onMapClick, onPinClick }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<L.Map | null>(null)
  const markersRef     = useRef<Map<string, L.Marker>>(new Map())
  const pendingRef     = useRef<L.Marker | null>(null)

  // Store callbacks in refs so effects don't need them as dependencies
  const onMapClickRef  = useRef(onMapClick)
  const onPinClickRef  = useRef(onPinClick)
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])
  useEffect(() => { onPinClickRef.current = onPinClick }, [onPinClick])

  // ── Initialize map once ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { center: [20, 0], zoom: 2 })
    mapRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current(e.latlng.lat, e.latlng.lng)
    })

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
      pendingRef.current = null
    }
  }, [])

  // ── Sync existing pin markers ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()

    pins.forEach(pin => {
      const marker = L.marker([pin.coordinates.lat, pin.coordinates.lng], { icon: existingIcon }).addTo(map)
      marker.on('click', (e: L.LeafletMouseEvent) => {
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
  }, [pins])

  // ── Sync pending (unsaved) pin marker ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    pendingRef.current?.remove()
    pendingRef.current = null

    if (!pendingCoords) return

    const marker = L.marker([pendingCoords.lat, pendingCoords.lng], {
      icon: pendingIcon,
      draggable: true,
    }).addTo(map)

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng()
      onMapClickRef.current(lat, lng)
    })

    pendingRef.current = marker
  }, [pendingCoords])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#0f172a', cursor: 'crosshair' }}
    />
  )
}
