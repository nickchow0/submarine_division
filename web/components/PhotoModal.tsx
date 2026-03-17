'use client'

// ─── PhotoModal ───────────────────────────────────────────────────────────────
// Full-screen photo overlay used by the Gallery component.
// The Gallery manages URL state via window.history.pushState — no Next.js
// navigation happens when this modal opens or closes, so the gallery page
// stays completely mounted in the background.
//
// Accepts callbacks so the parent controls open/close/navigate behaviour.

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Photo } from '@/types'

type Props = {
  photo: Photo
  prevId: string | null
  nextId: string | null
  onClose: () => void
  onNavigate: (id: string) => void
}

export default function PhotoModal({ photo, prevId, nextId, onClose, onNavigate }: Props) {
  // Keyboard nav: Escape closes, arrows step through photos
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')                   onClose()
      if (e.key === 'ArrowLeft'  && prevId)     onNavigate(prevId)
      if (e.key === 'ArrowRight' && nextId)     onNavigate(nextId)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onNavigate, prevId, nextId])

  return (
    // Backdrop — clicking outside the panel closes the modal
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative bg-slate-950 rounded-2xl overflow-hidden w-full max-w-5xl flex flex-col shadow-2xl"
        style={{ maxHeight: '90dvh' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
          <h2 className="text-slate-200 text-sm font-medium truncate pr-4">{photo.title}</h2>
          <div className="flex items-center gap-4 shrink-0">
            {/* Hard-link to the full dedicated page */}
            <Link
              href={`/photo/${photo._id}`}
              className="text-xs text-slate-500 hover:text-sky-400 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              Open full page ↗
            </Link>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Photo area ── */}
        <div
          className="relative bg-black flex items-center justify-center"
          style={{ minHeight: '40vh', maxHeight: '70dvh' }}
        >
          <Image
            src={`${photo.src}?w=2000&q=85&fm=jpg&auto=format`}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
            className="w-full h-full object-contain"
            style={{ maxHeight: '70dvh' }}
            placeholder={photo.blurDataURL ? 'blur' : 'empty'}
            blurDataURL={photo.blurDataURL ?? undefined}
            priority
            unoptimized
          />

          {/* Prev arrow */}
          {prevId && (
            <button
              onClick={() => onNavigate(prevId)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-slate-300 hover:text-white rounded-full p-2.5 transition-colors"
              aria-label="Previous photo"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          {/* Next arrow */}
          {nextId && (
            <button
              onClick={() => onNavigate(nextId)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-slate-300 hover:text-white rounded-full p-2.5 transition-colors"
              aria-label="Next photo"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Metadata ── */}
        <div className="px-5 py-4 border-t border-slate-800 shrink-0 space-y-2 overflow-y-auto">
          {photo.aiCaption && (
            <p className="text-slate-400 text-sm leading-relaxed">{photo.aiCaption}</p>
          )}

          {photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {photo.tags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            {photo.location && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {photo.location}
              </span>
            )}
            {photo.dateTaken && (
              <span>
                {new Date(photo.dateTaken).toLocaleDateString('en-GB', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            )}
            {photo.camera      && <span>{photo.camera}</span>}
            {photo.lens        && <span>{photo.lens}</span>}
            {photo.focalLength && <span>{photo.focalLength}</span>}
            {photo.aperture    && <span>{photo.aperture}</span>}
            {photo.shutterSpeed && <span>{photo.shutterSpeed}s</span>}
            {photo.iso         && <span>ISO {photo.iso}</span>}
          </div>
        </div>

      </div>
    </div>
  )
}
