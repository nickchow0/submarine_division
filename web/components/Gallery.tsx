'use client'

// ─── Gallery ──────────────────────────────────────────────────────────────────
// The main interactive component. Receives the full photo list from the server
// (page.tsx), then handles search, tag filtering, and lightbox client-side.
//
// This is a Client Component ('use client') because it uses:
//   - useState (search query, active tag, selected photo)
//   - useMemo   (building the Fuse search index, deriving visible photos)
//   - Event handlers (typing, clicking)

import { useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Fuse from 'fuse.js'
import type { Photo } from '@/types'
import { buildSearchIndex, searchPhotos } from '@/lib/search'
import SearchBar from './SearchBar'
import TagFilter from './TagFilter'
import Lightbox from './Lightbox'

type Props = {
  photos: Photo[]
}

export default function Gallery({ photos }: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [query, setQuery]           = useState('')
  const [activeTag, setActiveTag]   = useState<string | null>(null)
  const [selected, setSelected]     = useState<Photo | null>(null)

  // ── Search index ───────────────────────────────────────────────────────────
  // useMemo ensures we only rebuild the Fuse index when the photos array changes
  // (i.e. on initial load), not on every render.
  const fuseIndex = useMemo<Fuse<Photo>>(() => buildSearchIndex(photos), [photos])

  // ── All unique tags (for the filter bar) ──────────────────────────────────
  const allTags = useMemo(
    () => [...new Set(photos.flatMap((p) => p.tags))].sort(),
    [photos]
  )

  // ── Derived: visible photos after search + tag filter ─────────────────────
  const visiblePhotos = useMemo(() => {
    // Start with search results, or all photos if no query
    let results = query.trim() ? searchPhotos(fuseIndex, query) : photos

    // Then apply tag filter on top
    if (activeTag) {
      results = results.filter((p) => p.tags.includes(activeTag))
    }

    return results
  }, [query, activeTag, fuseIndex, photos])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    setActiveTag(null)  // clear tag filter when user types a new search
  }, [])

  const handleTagClick = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag))  // toggle
    setQuery('')        // clear text search when a tag is clicked
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Search + filters */}
      <div className="sticky top-0 z-10 bg-ocean-950/90 backdrop-blur-sm py-4 space-y-3 border-b border-ocean-700">
        <SearchBar
          onSearch={handleSearch}
          resultCount={visiblePhotos.length}
          totalCount={photos.length}
        />
        <TagFilter
          tags={allTags}
          activeTag={activeTag}
          onTagClick={handleTagClick}
        />
      </div>

      {/* Masonry grid */}
      {visiblePhotos.length > 0 ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 p-4 max-w-7xl mx-auto">
          {visiblePhotos.map((photo) => (
            <PhotoCard
              key={photo._id}
              photo={photo}
              onClick={() => setSelected(photo)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-slate-500">
          <p className="text-lg">No photos match your search.</p>
          <button
            onClick={() => { setQuery(''); setActiveTag(null) }}
            className="mt-3 text-sky-500 hover:text-sky-400 text-sm underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Lightbox */}
      <Lightbox photo={selected} onClose={() => setSelected(null)} />
    </>
  )
}

// ── PhotoCard ─────────────────────────────────────────────────────────────────
// Extracted as a separate component so React can re-render cards individually
// instead of the whole grid when something changes.

type CardProps = { photo: Photo; onClick: () => void }

function PhotoCard({ photo, onClick }: CardProps) {
  return (
    <div
      className="break-inside-avoid mb-3 group cursor-pointer"
      onClick={onClick}
    >
      <Link href={`/photo/${photo._id}`} className="block">
        <div className="rounded-lg overflow-hidden bg-ocean-800 border border-ocean-700 transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-2xl">
          {/* Photo */}
          <div className="relative overflow-hidden">
            <Image
              src={photo.src}
              alt={photo.title}
              width={photo.width}
              height={photo.height}
              className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
              placeholder={photo.blurDataURL ? 'blur' : 'empty'}
              blurDataURL={photo.blurDataURL ?? undefined}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
            />
          </div>

          {/* Card body */}
          <div className="p-3">
            <p className="text-xs text-slate-500 mb-2 line-clamp-2">{photo.aiCaption}</p>
            <div className="flex flex-wrap gap-1">
              {photo.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400"
                >
                  {tag}
                </span>
              ))}
              {photo.tags.length > 4 && (
                <span className="text-xs text-slate-600">+{photo.tags.length - 4}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
