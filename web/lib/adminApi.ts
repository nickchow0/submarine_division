import type {
  AdminPhoto,
  BulkCaptionResult,
  SiteSettings,
  UpdatePhotoRequest,
  ReuploadPhotoUpdates,
} from '@/types'
import { ApiError } from '@/types'

// ─── Internal fetch helper ─────────────────────────────────────────────────────
// All admin API calls go through here. Sets Content-Type, parses error bodies,
// and throws ApiError with the server's message on non-ok responses.

async function apiFetch(
  url: string,
  options: RequestInit,
): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    try {
      const body = await res.json() as { error?: string }
      if (body.error) message = body.error
    } catch { /* ignore parse errors */ }
    throw new ApiError(res.status, message)
  }

  try {
    return await res.json()
  } catch {
    return null
  }
}

// ─── Photo operations ──────────────────────────────────────────────────────────

export async function updatePhoto(
  id: string,
  fields: UpdatePhotoRequest['fields'],
): Promise<void> {
  await apiFetch('/api/admin/photos', {
    method: 'PATCH',
    body: JSON.stringify({ id, fields }),
  })
}

export async function deletePhoto(
  id: string,
  imageRef: string,
  shopifyProductId: string | null,
): Promise<void> {
  await apiFetch('/api/admin/photos', {
    method: 'DELETE',
    body: JSON.stringify({ id, imageRef, shopifyProductId }),
  })
}

export async function uploadPhoto(file: File): Promise<AdminPhoto> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
  if (!res.ok) {
    let message = `Upload failed: ${res.status}`
    try {
      const body = await res.json() as { error?: string }
      if (body.error) message = body.error
    } catch { /* ignore */ }
    throw new ApiError(res.status, message)
  }
  const data = await res.json() as { photo: AdminPhoto }
  return data.photo
}

export async function reuploadPhoto(id: string, file: File): Promise<ReuploadPhotoUpdates> {
  const formData = new FormData()
  formData.append('id', id)
  formData.append('file', file)
  const res = await fetch('/api/admin/reupload', { method: 'POST', body: formData })
  if (!res.ok) {
    let message = `Reupload failed: ${res.status}`
    try {
      const body = await res.json() as { error?: string }
      if (body.error) message = body.error
    } catch { /* ignore */ }
    throw new ApiError(res.status, message)
  }
  const data = await res.json() as { ok: boolean; updates: ReuploadPhotoUpdates }
  return data.updates
}

export async function regenerateCaption(id: string, imageRef: string): Promise<string> {
  const data = await apiFetch('/api/admin/captions', {
    method: 'POST',
    body: JSON.stringify({ photoId: id, imageRef }),
  }) as { caption: string }
  return data.caption
}

export async function bulkRegenerateCaptions(
  photos: { _id: string; imageRef: string }[],
): Promise<BulkCaptionResult[]> {
  const data = await apiFetch('/api/admin/captions/bulk', {
    method: 'POST',
    body: JSON.stringify({ photos }),
  }) as { results: BulkCaptionResult[] }
  return data.results
}

export async function updateTags(ids: string[], tags: string[]): Promise<void> {
  await apiFetch('/api/admin/photos/bulk-tags', {
    method: 'PATCH',
    body: JSON.stringify({ ids, tags }),
  })
}

// ─── Settings operations ───────────────────────────────────────────────────────

export async function toggleSetting(
  key: keyof SiteSettings,
  value: boolean,
): Promise<void> {
  await apiFetch('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify({ [key]: value }),
  })
}
