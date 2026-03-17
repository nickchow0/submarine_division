// ─── Sanity Image Loader ──────────────────────────────────────────────────────
// Custom Next.js image loader that maps { src, width, quality } to a
// Sanity CDN URL with the appropriate resize parameters.
//
// Registered globally via `images.loaderFile` in next.config.ts so it applies
// to every <Image> without needing to pass a `loader` prop (which would fail
// in Server Components because functions can't cross the server→client boundary).
//
// Next.js will automatically generate a srcset for each entry in its
// deviceSizes array (640, 750, 828, 1080, 1200, 1920…) and the browser
// picks the best one based on the `sizes` prop.

import type { ImageLoaderProps } from 'next/image'

// Default export is required when the file is used as `images.loaderFile`.
export default function sanityLoader({ src, width, quality }: ImageLoaderProps): string {
  // photo.src is a clean Sanity CDN URL — strip any existing params first
  // so we never end up with duplicate ?w= values.
  const url = new URL(src)
  url.searchParams.set('w',    String(width))
  url.searchParams.set('q',    String(quality ?? 85))
  url.searchParams.set('auto', 'format')   // Sanity picks webp/avif based on Accept header
  url.searchParams.set('fit',  'max')      // never upscale past the original resolution
  return url.toString()
}
