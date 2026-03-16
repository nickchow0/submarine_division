// ─── Admin Page (server component) ───────────────────────────────────────────
// Fetches all photos directly from Sanity (same pattern as the gallery page),
// then passes them as a prop to the interactive AdminDashboard client component.
// This avoids a client-side fetch to an API route, which was unreliable.

import { sanityClient } from '@/lib/sanity'
import AdminDashboard, { type AdminPhoto } from '@/components/AdminDashboard'

const ADMIN_PHOTOS_QUERY = `
  *[_type == "photo" && !(_id in path("drafts.**"))] | order(dateTaken desc) {
    _id,
    title,
    "tags": coalesce(tags, []),
    "aiCaption": coalesce(aiCaption, ""),
    "location": coalesce(location, null),
    "camera": coalesce(camera, null),
    "dateTaken": coalesce(dateTaken, null),
    "visible": coalesce(visible, true),
    "src": image.asset->url,
    "width": image.asset->metadata.dimensions.width,
    "height": image.asset->metadata.dimensions.height,
    "imageRef": image.asset._ref
  }
`

export default async function AdminPage() {
  const photos: AdminPhoto[] = await sanityClient.fetch(ADMIN_PHOTOS_QUERY)
  return <AdminDashboard initialPhotos={photos} />
}
