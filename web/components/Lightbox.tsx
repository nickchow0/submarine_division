'use client'

// ─── Lightbox ─────────────────────────────────────────────────────────────────
// Full-screen overlay that shows a photo with its metadata.
// Closes on Escape key, backdrop click, or the × button.

import { useEffect } from 'react'
import Image from 'next/image'
import type { Photo } from '@/types'

type Props = {
  photo: Photo | null
  onClose: () => void
}

export default function Lightbox({ photo, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    if (!photo) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [photo, onClose])

  if (!photo) return null

  return (
    // Backdrop — clicking outside the panel closes it
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Panel — stop click propagation so clicking the image doesn't close */}
      <div
        className="relative max-w-5xl w-full flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-slate-400 hover:text-white transition-colors text-3xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Photo */}
        <div className="relative w-full max-h-[75vh]">
          <Image
            src={photo.src}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
            className="w-full h-auto max-h-[75vh] object-contain rounded-lg"
            placeholder={photo.blurDataURL ? 'blur' : 'empty'}
            blurDataURL={photo.blurDataURL ?? undefined}
            priority
            unoptimized
          />
        </div>

        {/* Metadata */}
        <div className="text-center max-w-2xl">
          <h2 className="text-xl font-semibold text-slate-100 mb-1">{photo.title}</h2>
          <p className="text-slate-400 text-sm mb-3">{photo.aiCaption}</p>

          {/* Tags */}
          {photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mb-3">
              {photo.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* EXIF-style info row */}
          <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-500">
            {photo.location && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {photo.location}
              </span>
            )}
            {photo.camera && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                {photo.camera}
              </span>
            )}
            {photo.dateTaken && (
              <span>{new Date(photo.dateTaken).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
