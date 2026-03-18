// web/__tests__/lib/sanityImageLoader.test.ts
import { describe, it, expect } from 'vitest'
import sanityLoader from '@/lib/sanityImageLoader'

const BASE_SRC = 'https://cdn.sanity.io/images/abc123/production/photo.jpg'

function paramsOf(url: string) {
  return new URL(url).searchParams
}

describe('sanityImageLoader', () => {
  it('returns a URL containing the Sanity CDN domain', () => {
    const url = sanityLoader({ src: BASE_SRC, width: 800, quality: 80 })
    expect(url).toContain('cdn.sanity.io')
  })

  it('sets the w parameter to the requested width', () => {
    const url = sanityLoader({ src: BASE_SRC, width: 800, quality: 80 })
    expect(paramsOf(url).get('w')).toBe('800')
  })

  it('defaults q to 85 when quality is not provided', () => {
    // ImageLoaderProps types quality as number, but Next.js may omit it
    const url = sanityLoader({ src: BASE_SRC, width: 800, quality: undefined as unknown as number })
    expect(paramsOf(url).get('q')).toBe('85')
  })

  it('sets q to the provided quality value', () => {
    const url = sanityLoader({ src: BASE_SRC, width: 800, quality: 60 })
    expect(paramsOf(url).get('q')).toBe('60')
  })

  it('caps width at 2000px when a larger value is provided', () => {
    const url = sanityLoader({ src: BASE_SRC, width: 3000, quality: 80 })
    expect(paramsOf(url).get('w')).toBe('2000')
  })
})
