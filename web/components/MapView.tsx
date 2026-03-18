'use client'

// ─── MapView ──────────────────────────────────────────────────────────────────
// Leaflet is imported dynamically inside useLeafletMap so it never runs during SSR
// (Leaflet accesses window/navigator at module-evaluation time, which throws in
// Node). This also eliminates the need for next/dynamic with ssr:false.

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { Marker } from 'leaflet'
import type { MapPin, Photo } from '@/types'
import PhotoModal from '@/components/PhotoModal'
import { useLeafletMap } from '@/lib/hooks/useLeafletMap'
import { createPinIcon } from '@/lib/mapUtils'
// Leaflet CSS is loaded globally via <link href="/leaflet.css"> in layout.tsx

// Coerce a pin photo to the full Photo shape PhotoModal expects.
// Fields not stored on the pin (tags, EXIF, etc.) default to empty/null —
// PhotoModal renders them all conditionally so nothing breaks.
type PinPhoto = MapPin['photos'][number]
function pinPhotoToFull(p: PinPhoto): Photo {
  return {
    _id:          p._id,
    title:        p.title,
    src:          p.src,
    width:        p.width,
    height:       p.height,
    blurDataURL:  p.blurDataURL,
    tags:         p.tags,
    aiCaption:    '',
    location:     p.location,
    camera:       p.camera,
    dateTaken:    p.dateTaken,
    lens:         p.lens,
    focalLength:  p.focalLength,
    iso:          p.iso,
    shutterSpeed: p.shutterSpeed,
    aperture:     p.aperture,
    visible:      true,
  }
}

export default function MapView({ pins }: { pins: MapPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef   = useRef<Map<string, Marker>>(new Map())
  const { map, isReady } = useLeafletMap(containerRef)
  const [selected, setSelected] = useState<MapPin | null>(null)
  // Photo currently open in the modal (with the pin's photo list for prev/next)
  const [modalPhoto, setModalPhoto]         = useState<Photo | null>(null)
  const [modalPinPhotos, setModalPinPhotos] = useState<PinPhoto[]>([])

  // ── Sync markers when pins / selection changes ────────────────────────────
  useEffect(() => {
    if (!isReady || !map) return

    // Leaflet is already loaded at this point (isReady guarantees it); re-import
    // hits the module cache synchronously on the next tick.
    import('leaflet').then(({ default: L }) => {
      // createPinIcon reads globalThis.L — make sure it's set before calling it
      ;(globalThis as unknown as { L: typeof L }).L = L

      // Remove stale markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()

      if (pins.length === 0) return

      pins.forEach(pin => {
        const isActive = selected?._id === pin._id
        // createPinIcon: active pin uses #38bdf8/opacity 1, inactive uses #0ea5e9/opacity 0.85
        const icon = createPinIcon(
          isActive ? '#38bdf8' : '#0ea5e9',
          isActive ? 1 : 0.85,
        )

        const marker = L.marker([pin.coordinates.lat, pin.coordinates.lng], { icon }).addTo(map)

        marker.on('click', () => {
          setSelected(prev => (prev?._id === pin._id ? null : pin))
        })

        markersRef.current.set(pin._id, marker)
      })

      // Fit bounds on first load (or re-fit when pins change)
      if (pins.length === 1) {
        map.setView([pins[0].coordinates.lat, pins[0].coordinates.lng], 8)
      } else if (pins.length > 1) {
        const bounds = L.latLngBounds(
          pins.map(p => [p.coordinates.lat, p.coordinates.lng] as [number, number])
        )
        map.fitBounds(bounds, { padding: [60, 60] })
      }
    })
  }, [isReady, map, pins, selected])

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openModal(pin: MapPin, photoId: string) {
    setModalPinPhotos(pin.photos)
    const p = pin.photos.find(ph => ph._id === photoId)
    if (p) setModalPhoto(pinPhotoToFull(p))
  }

  function navigateModal(id: string) {
    const p = modalPinPhotos.find(ph => ph._id === id)
    if (p) setModalPhoto(pinPhotoToFull(p))
  }

  const modalPrevId = modalPhoto
    ? (modalPinPhotos[modalPinPhotos.findIndex(p => p._id === modalPhoto._id) - 1]?._id ?? null)
    : null
  const modalNextId = modalPhoto
    ? (modalPinPhotos[modalPinPhotos.findIndex(p => p._id === modalPhoto._id) + 1]?._id ?? null)
    : null

  return (
    // position:absolute fills the nearest positioned ancestor regardless of
    // how the parent gets its height — more reliable than h-full in flex chains
    <div className="absolute inset-0 flex">
      {/* Map tile container */}
      <div ref={containerRef} className="flex-1" style={{ background: '#0f172a' }} />

      {/* Slide-in photo panel */}
      <div
        className={`
          absolute top-0 right-0 h-full z-[1000] bg-slate-950/95 backdrop-blur-sm
          border-l border-slate-800 overflow-y-auto transition-all duration-300 ease-in-out
          ${selected ? 'w-80 sm:w-96 opacity-100' : 'w-0 opacity-0 pointer-events-none'}
        `}
      >
        {selected && (
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-slate-100 font-medium">{selected.name}</h2>
                {selected.description && (
                  <p className="text-slate-500 text-sm mt-0.5">{selected.description}</p>
                )}
                <p className="text-slate-600 text-xs mt-1">
                  {selected.photos.length} photo{selected.photos.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 ml-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selected.photos.length === 0 ? (
              <p className="text-slate-600 text-sm italic">No photos tagged to this location yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {selected.photos.map(photo => (
                  <button
                    key={photo._id}
                    onClick={() => openModal(selected, photo._id)}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-slate-800 block"
                  >
                    <Image
                      src={photo.src}
                      alt={photo.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="150px"
                      placeholder={photo.blurDataURL ? 'blur' : 'empty'}
                      blurDataURL={photo.blurDataURL ?? undefined}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {pins.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <p className="text-slate-500 text-sm bg-slate-900/80 px-4 py-2 rounded-lg">
            No locations added yet
          </p>
        </div>
      )}

      {/* Photo modal — rendered above everything including the slide-in panel */}
      {modalPhoto && (
        <PhotoModal
          photo={modalPhoto}
          prevId={modalPrevId}
          nextId={modalNextId}
          onClose={() => setModalPhoto(null)}
          onNavigate={navigateModal}
        />
      )}
    </div>
  )
}
