// web/__tests__/lib/search.test.ts
import { describe, it, expect } from 'vitest'
import { buildSearchIndex, searchPhotos } from '@/lib/search'
import type { Photo } from '@/types'

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    _id: 'photo-1',
    title: 'Test Photo',
    tags: [],
    aiCaption: '',
    location: null,
    camera: null,
    dateTaken: null,
    lens: null,
    focalLength: null,
    iso: null,
    shutterSpeed: null,
    aperture: null,
    visible: true,
    src: 'https://cdn.sanity.io/images/abc/production/test.jpg',
    width: 1200,
    height: 800,
    blurDataURL: null,
    ...overrides,
  }
}

const PHOTOS: Photo[] = [
  makePhoto({ _id: '1', title: 'Hammerhead Shark', tags: ['shark', 'pelagic'] }),
  makePhoto({ _id: '2', title: 'Manta Ray', tags: ['ray', 'pelagic'] }),
  makePhoto({ _id: '3', title: 'Coral Garden', tags: ['coral', 'reef'] }),
]

describe('buildSearchIndex', () => {
  it('returns an index that finds photos by title', () => {
    const index = buildSearchIndex(PHOTOS)
    const results = index.search('hammerhead')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item._id).toBe('1')
  })
})

describe('searchPhotos', () => {
  const index = buildSearchIndex(PHOTOS)

  it('returns matching photos for a query', () => {
    const results = searchPhotos(index, 'hammerhead')
    expect(results).toHaveLength(1)
    expect(results[0]._id).toBe('1')
  })

  it('returns [] for a query with no matches', () => {
    const results = searchPhotos(index, 'zzznomatch')
    expect(results).toEqual([])
  })

  it('returns [] for an empty string', () => {
    const results = searchPhotos(index, '')
    expect(results).toEqual([])
  })

  it('returns [] for a whitespace-only string', () => {
    const results = searchPhotos(index, '   ')
    expect(results).toEqual([])
  })

  it('is case-insensitive', () => {
    const results = searchPhotos(index, 'HAMMERHEAD')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]._id).toBe('1')
  })

  it('matches on tags', () => {
    const results = searchPhotos(index, 'coral')
    expect(results.length).toBeGreaterThan(0)
    expect(results.find((p) => p._id === '3')).toBeDefined()
  })
})
