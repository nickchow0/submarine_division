// ─── Admin Page (server component) ───────────────────────────────────────────
// Fetches all photos and site settings directly from Sanity, then passes them
// as props to the interactive AdminDashboard client component.

import { sanityClient } from '@/lib/sanity'
import { SITE_SETTINGS_QUERY } from '@/lib/sanity'
import AdminDashboard from '@/components/AdminDashboard'
import { DEFAULT_SETTINGS, type SiteSettings, type AdminPhoto } from '@/types'

const ADMIN_PHOTOS_QUERY = `
  *[_type == "photo" && !(_id in path("drafts.**"))] | order(dateTaken desc) {
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
    "imageRef": image.asset._ref
  }
`

export default async function AdminPage() {
  const [photos, settings] = await Promise.all([
    sanityClient.fetch<AdminPhoto[]>(ADMIN_PHOTOS_QUERY),
    sanityClient.fetch<SiteSettings | null>(SITE_SETTINGS_QUERY),
  ])
  return (
    <AdminDashboard
      initialPhotos={photos}
      initialSettings={settings ?? DEFAULT_SETTINGS}
    />
  )
}
