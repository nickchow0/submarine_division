// ─── Sanity Image Loader ──────────────────────────────────────────────────────
// Custom Next.js image loader that maps { src, width, quality } to a
// Sanity CDN URL with the appropriate resize parameters.
//
// Usage:
//   import { sanityLoader } from '@/lib/sanityImageLoader'
//   <Image loader={sanityLoader} src={photo.src} sizes="..." ... />
//
// Next.js will automatically generate a srcset for each entry in its
// deviceSizes array (640, 750, 828, 1080, 1200, 1920…) and the browser
// picks the best one based on the `sizes` prop.

import type { ImageLoader } from 'next/image'

export const sanityLoader: ImageLoader = ({ src, width, quality }) => {
  // photo.src is a clean Sanity CDN URL — strip any existing params first
  // so we never end up with duplicate ?w= values.
  const url = new URL(src)
  url.searchParams.set('w',    String(width))
  url.searchParams.set('q',    String(quality ?? 85))
  url.searchParams.set('auto', 'format')   // Sanity picks webp/avif based on Accept header
  url.searchParams.set('fit',  'max')      // never upscale past the original resolution
  return url.toString()
}
