import Fuse, { type IFuseOptions } from 'fuse.js'
import type { Photo } from '@/types'

// ─── Fuse.js search index configuration ──────────────────────────────────────
//
// Fuse.js does "fuzzy" searching — it tolerates typos and partial matches.
// threshold: 0.0 = exact match only, 1.0 = match anything
//            0.35 is a good balance: "hammerhed" finds "hammerhead"
//
// Weight controls how much each field influences ranking:
//   tags are weighted highest (3x) because YOU chose them deliberately.
//   title is next (2x).
//   aiCaption has lowest weight (1x) — it adds depth but shouldn't override
//   your manual classifications.

export const FUSE_OPTIONS: IFuseOptions<Photo> = {
  keys: [
    { name: 'tags',         weight: 3 },
    { name: 'title',        weight: 2 },
    { name: 'aiCaption',    weight: 1 },
    { name: 'location',     weight: 1 },
    // EXIF fields — useful for searching by gear or shoot date
    { name: 'camera',       weight: 1 },
    { name: 'lens',         weight: 1 },
    { name: 'focalLength',  weight: 0.5 },
    { name: 'aperture',     weight: 0.5 },
    { name: 'shutterSpeed', weight: 0.5 },
    { name: 'iso',          weight: 0.5 },
    { name: 'dateTaken',    weight: 0.5 },
  ],
  threshold: 0.35,
  includeScore: true,
  // minMatchCharLength prevents single-letter searches returning everything
  minMatchCharLength: 2,
}

// ─── Build index ──────────────────────────────────────────────────────────────
// Call this once when the component mounts. Fuse indexes the full photo array
// in memory — fast enough for thousands of photos, all in the browser.

export function buildSearchIndex(photos: Photo[]): Fuse<Photo> {
  return new Fuse(photos, FUSE_OPTIONS)
}

// ─── Search helper ────────────────────────────────────────────────────────────
// Returns photos matching the query, or the full list if query is empty.

export function searchPhotos(index: Fuse<Photo>, query: string): Photo[] {
  if (!query.trim()) return []
  return index.search(query).map((result) => result.item)
}
