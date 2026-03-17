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
  token: process.env.SANITY_READ_TOKEN,  // required for private datasets
  useCdn: false,  // token-authenticated requests can't use the CDN
})

// A second client with write access — used only server-side in API routes.
// Falls back to the read token if no dedicated write token is set; this works
// as long as the token was created with Editor (not Viewer) permissions.
export const sanityWriteClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN ?? process.env.SANITY_READ_TOKEN,
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

// visible != false means photos where visible is true OR the field doesn't exist
// yet — so existing photos without the field set still appear by default.
export const ALL_PHOTOS_QUERY = `
  *[_type == "photo" && !(_id in path("drafts.**")) && visible != false] | order(dateTaken desc) {
    _id,
    title,
    "tags": coalesce(tags, []),
    "aiCaption": coalesce(aiCaption, ""),
    "location": coalesce(location, null),
    "camera": coalesce(camera, null),
    "dateTaken": coalesce(dateTaken, null),
    "lens": coalesce(lens, null),
    "focalLength": coalesce(focalLength, null),
    "iso": coalesce(iso, null),
    "shutterSpeed": coalesce(shutterSpeed, null),
    "aperture": coalesce(aperture, null),
    "visible": coalesce(visible, true),
    "src": image.asset->url,
    "width": image.asset->metadata.dimensions.width,
    "height": image.asset->metadata.dimensions.height,
    "blurDataURL": image.asset->metadata.lqip
  }
`
// lqip = Low Quality Image Placeholder — Sanity generates a tiny base64
// blurred version of every image automatically. Next.js uses it while
// the full image loads (the blur-up effect).

// ─── Single photo query ─────────────────────────────────────────────────────
// Fetches one photo by its Sanity _id. Used by the /photo/[id] detail page.
export const PHOTO_BY_ID_QUERY = `
  *[_type == "photo" && _id == $id][0] {
    _id,
    title,
    "tags": coalesce(tags, []),
    "aiCaption": coalesce(aiCaption, ""),
    "location": coalesce(location, null),
    "camera": coalesce(camera, null),
    "dateTaken": coalesce(dateTaken, null),
    "lens": coalesce(lens, null),
    "focalLength": coalesce(focalLength, null),
    "iso": coalesce(iso, null),
    "shutterSpeed": coalesce(shutterSpeed, null),
    "aperture": coalesce(aperture, null),
    "visible": coalesce(visible, true),
    "src": image.asset->url,
    "width": image.asset->metadata.dimensions.width,
    "height": image.asset->metadata.dimensions.height,
    "blurDataURL": image.asset->metadata.lqip
  }
`

// ─── Map pins query ──────────────────────────────────────────────────────────
// Fetches all map pin documents with their referenced photos expanded.
export const ALL_MAP_PINS_QUERY = `
  *[_type == "mapPin"] | order(name asc) {
    _id,
    name,
    "description": coalesce(description, null),
    coordinates,
    "photos": photos[]->{
      _id,
      title,
      "src": image.asset->url,
      "width": image.asset->metadata.dimensions.width,
      "height": image.asset->metadata.dimensions.height,
      "blurDataURL": image.asset->metadata.lqip
    }
  }
`

// ─── Site settings query ─────────────────────────────────────────────────────
// Fetches the singleton siteSettings document. coalesce(..., true/false) means
// the flag is on/off by default even before the document is first created.
export const SITE_SETTINGS_QUERY = `
  *[_type == "siteSettings" && _id == "siteSettings"][0] {
    "showLocations":   coalesce(showLocations,   true),
    "maintenanceMode": coalesce(maintenanceMode, false)
  }
`

// ─── All photo IDs query ────────────────────────────────────────────────────
// Returns just the _id of every visible photo in display order (newest first).
// Used to determine prev/next navigation on the detail page.
export const ALL_PHOTO_IDS_QUERY = `
  *[_type == "photo" && !(_id in path("drafts.**")) && visible != false] | order(dateTaken desc) { _id }
`
