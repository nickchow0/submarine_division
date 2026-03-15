'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { Photo } from '@/types'

type Props = {
  photos: Photo[]
  /** Time in ms between auto-advances (default 5000) */
  interval?: number
}

export default function Carousel({ photos, interval = 5000 }: Props) {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % photos.length)
  }, [photos.length])

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + photos.length) % photos.length)
  }, [photos.length])

  // Auto-advance
  useEffect(() => {
    if (isPaused || photos.length <= 1) return
    const timer = setInterval(next, interval)
    return () => clearInterval(timer)
  }, [isPaused, next, interval, photos.length])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev])

  if (photos.length === 0) return null

  const photo = photos[current]

  return (
    <div
      className="relative w-full h-[70vh] overflow-hidden bg-ocean-950 flex items-center justify-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Image */}
      <div className="relative w-full h-full transition-opacity duration-700">
        <Image
          key={photo._id}
          src={photo.src}
          alt={photo.title}
          fill
          className="object-contain"
          placeholder={photo.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={photo.blurDataURL ?? undefined}
          priority={current === 0}
          sizes="100vw"
        />
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        aria-label="Previous photo"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        aria-label="Next photo"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === current ? 'bg-sky-400' : 'bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Go to photo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
