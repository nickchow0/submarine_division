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

// ─── Sanity webhook payload ───────────────────────────────────────────────────
export type SanityWebhookPayload = {
  _id: string
  _type: string
  image?: SanityPhotoDocument['image']
}
