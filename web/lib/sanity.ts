import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

// ─── Sanity client ────────────────────────────────────────────────────────────
// useCdn: true  → fast cached reads  (use in the frontend / page.tsx)
// useCdn: false → live uncached reads (use in API routes that write data)

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',  // pin to a date so the API never changes under you
  useCdn: true,
})

// A second client with write access — used only server-side in API routes
export const sanityWriteClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,  // never exposed to the browser
  useCdn: false,
})

// ─── Image URL builder ────────────────────────────────────────────────────────
// Use this to build optimised image URLs from Sanity asset references.
//
// Usage:
//   urlFor(photo.image).width(800).quality(80).format('webp').url()
//
// Sanity resizes and converts on-the-fly on their CDN — no local processing needed.

const builder = imageUrlBuilder(sanityClient)

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

// ─── GROQ query ───────────────────────────────────────────────────────────────
// GROQ is Sanity's query language. It looks a bit like GraphQL but simpler.
// This fetches all photos, newest first, with the fields our app needs.
//
// The -> operator follows a reference:
//   image.asset->url   means "follow the asset reference and give me its url"
//
// The @ symbol refers to the current document being iterated.

export const ALL_PHOTOS_QUERY = `
  *[_type == "photo"] | order(dateTaken desc) {
    _id,
    title,
    "tags": coalesce(tags, []),
    "aiCaption": coalesce(aiCaption, ""),
    "location": coalesce(location, null),
    "camera": coalesce(camera, null),
    "dateTaken": coalesce(dateTaken, null),
    "src": image.asset->url,
    "width": image.asset->metadata.dimensions.width,
    "height": image.asset->metadata.dimensions.height,
    "blurDataURL": image.asset->metadata.lqip
  }
`
// lqip = Low Quality Image Placeholder — Sanity generates a tiny base64
// blurred version of every image automatically. Next.js uses it while
// the full image loads (the blur-up effect).
