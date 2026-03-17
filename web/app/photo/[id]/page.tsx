// ─── Photo Detail Page ───────────────────────────────────────────────────────
// Dynamic route: /photo/[id]
// Fetches a single photo from Sanity by its _id and displays it full-size
// with all metadata. This is a Server Component — data fetching happens
// on the server, protected by the middleware password gate.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { sanityClient, PHOTO_BY_ID_QUERY, ALL_PHOTO_IDS_QUERY } from '@/lib/sanity'
import Image from 'next/image'
import PhotoPageClient from '@/components/PhotoPageClient'
import type { Photo } from '@/types'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ id: string }>
}

// Revalidate every 60 seconds, matching the gallery page
export const revalidate = 60

// Dynamic metadata for SEO / link previews
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const photo: Photo | null = await sanityClient.fetch(PHOTO_BY_ID_QUERY, { id })

  if (!photo) return { title: 'Photo not found' }

  return {
    title: `${photo.title} — Submarine Division`,
    description: photo.aiCaption || `Photo: ${photo.title}`,
  }
}

export default async function PhotoPage({ params }: Props) {
  const { id } = await params
  const [photo, allIds] = await Promise.all([
    sanityClient.fetch<Photo | null>(PHOTO_BY_ID_QUERY, { id }),
    sanityClient.fetch<{ _id: string }[]>(ALL_PHOTO_IDS_QUERY),
  ])

  if (!photo) notFound()

  // Find prev/next neighbours
  const currentIndex = allIds.findIndex((p) => p._id === id)
  const prevId = currentIndex > 0 ? allIds[currentIndex - 1]._id : null
  const nextId = currentIndex < allIds.length - 1 ? allIds[currentIndex + 1]._id : null

  return (
    <PhotoPageClient photo={photo} prevId={prevId} nextId={nextId}>
      <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Navigation bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to gallery
        </Link>

        <div className="flex items-center gap-3">
          {prevId ? (
            <Link
              href={`/photo/${prevId}`}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Prev
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 cursor-default">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Prev
            </span>
          )}
          {nextId ? (
            <Link
              href={`/photo/${nextId}`}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-400 transition-colors"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 cursor-default">
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Photo */}
      <Image
        src={photo.src}
        alt={photo.title}
        width={photo.width}
        height={photo.height}
        className="w-auto h-auto max-w-full max-h-[80vh] mx-auto block"
        placeholder={photo.blurDataURL ? 'blur' : 'empty'}
        blurDataURL={photo.blurDataURL ?? undefined}
        priority
        unoptimized
      />

      {/* Metadata */}
      <div className="mt-6 space-y-4">
        {photo.aiCaption && (
          <p className="text-slate-400">{photo.aiCaption}</p>
        )}

        {/* Tags */}
        {photo.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photo.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* EXIF-style info */}
        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
          {photo.location && (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {photo.location}
            </span>
          )}
          {photo.dateTaken && (
            <span>
              {new Date(photo.dateTaken).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Camera & lens details */}
        {(photo.camera || photo.lens || photo.focalLength || photo.iso || photo.shutterSpeed || photo.aperture) && (
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500 border-t border-slate-800 pt-4">
            {photo.camera && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                {photo.camera}
              </span>
            )}
            {photo.lens && <span>{photo.lens}</span>}
            {photo.focalLength && <span>{photo.focalLength}</span>}
            {photo.aperture && <span>{photo.aperture}</span>}
            {photo.shutterSpeed && <span>{photo.shutterSpeed}s</span>}
            {photo.iso && <span>ISO {photo.iso}</span>}
          </div>
        )}
      </div>
    </div>
    </PhotoPageClient>
  )
}
