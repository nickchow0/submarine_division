'use client'

import { useState, useEffect, type RefObject } from 'react'
import type L from 'leaflet'

interface UseLeafletMapOptions {
  onReady?: () => void
}

export function useLeafletMap(
  containerRef: RefObject<HTMLDivElement | null>,
  options?: UseLeafletMapOptions,
) {
  const [map, setMap] = useState<L.Map | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    import('leaflet').then(({ default: L }) => {
      if (cancelled || !containerRef.current) return

      const leafletMap = L.map(containerRef.current, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(leafletMap)

      // Force correct size after DOM settles
      requestAnimationFrame(() => {
        leafletMap.invalidateSize()
        setMap(leafletMap)
        setIsReady(true)
        options?.onReady?.()
      })
    })

    return () => {
      cancelled = true
      // Do NOT call setIsReady(false) — causes React StrictMode errors
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { map, isReady }
}
