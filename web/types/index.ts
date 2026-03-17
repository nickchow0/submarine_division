// ─── Core photo type used throughout the app ──────────────────────────────────
// This mirrors the shape returned by the Sanity GROQ query in app/page.tsx

export type Photo = {
  _id: string
  title: string
  tags: string[]
  aiCaption: string
  location: string | null
  camera: string | null
  dateTaken: string | null   // ISO date string e.g. "2024-11-03"
  lens: string | null
  focalLength: string | null
  iso: string | null
  shutterSpeed: string | null
  aperture: string | null
  visible: boolean           // false = hidden from gallery (default true)

  // Image fields projected from the Sanity asset
  src: string                // Full CDN URL from Sanity
  width: number
  height: number
  blurDataURL: string | null // Base64 low-quality placeholder for <Image>
}

// ─── Shape of the raw Sanity document (before projection) ────────────────────
export type SanityPhotoDocument = {
  _id: string
  _type: 'photo'
  title: string
  tags?: string[]
  aiCaption?: string
  location?: string
  camera?: string
  dateTaken?: string
  image: {
    asset: {
      _ref: string
      _type: 'reference'
    }
  }
}

// ─── Map pin ──────────────────────────────────────────────────────────────────
export type MapPin = {
  _id: string
  name: string
  description: string | null
  coordinates: { lat: number; lng: number }
  photos: {
    _id: string
    title: string
    src: string
    width: number
    height: number
    blurDataURL: string | null
  }[]
}

// ─── Site-wide feature flags ──────────────────────────────────────────────────
export type SiteSettings = {
  showLocations:  boolean   // show map/locations page in nav
  maintenanceMode: boolean  // replace public site with maintenance page
}

export const DEFAULT_SETTINGS: SiteSettings = {
  showLocations:  true,
  maintenanceMode: false,
}

// ─── Sanity webhook payload ───────────────────────────────────────────────────
export type SanityWebhookPayload = {
  _id: string
  _type: string
  image?: SanityPhotoDocument['image']
}
