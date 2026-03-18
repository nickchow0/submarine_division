# Codebase Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the codebase for maintainability: split the 1,118-line AdminDashboard into focused components, extract shared hooks and a typed API client, consolidate type definitions, deduplicate map/Leaflet code, and clean up inline SVGs and GROQ queries.

**Architecture:** Layer-first — consolidate types and create the shared API client first so all subsequent component splits can build on a stable foundation. Hooks are extracted next, then components, then minor cleanup.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Sanity, Leaflet, Vitest

**Spec:** `docs/superpowers/specs/2026-03-18-codebase-refactor-design.md`

---

## Setup

### Task 0: Create feature branch

**Files:** none (git only)

- [ ] Create and switch to a new branch:

```bash
git checkout -b refactor/maintainability
```

- [ ] Verify tests pass on the clean branch:

```bash
npm test
```

Expected: all 36 tests pass

- [ ] Verify TypeScript is clean:

```bash
npx tsc --noEmit
```

Expected: no errors

---

## Phase 1: Types Consolidation

### Task 1: Add AdminPhoto, EditState to types/index.ts

**Files:**
- Modify: `types/index.ts`

- [ ] Add `AdminPhoto` and `EditState` to the end of `types/index.ts`:

```ts
// ─── Admin photo (used in AdminDashboard) ─────────────────────────────────────
// Same fields as Photo but intentionally omits blurDataURL (admin grid uses
// raw Sanity CDN URLs and never needs blur placeholders). Adds imageRef for
// caption generation and reupload operations.
export type AdminPhoto = {
  _id: string
  title: string
  tags: string[]
  aiCaption: string
  location: string | null
  camera: string | null
  dateTaken: string | null
  lens: string | null
  focalLength: string | null
  iso: string | null
  shutterSpeed: string | null
  aperture: string | null
  visible: boolean
  src: string
  width: number
  height: number
  imageRef: string
}

// ─── Admin edit form state ─────────────────────────────────────────────────────
// All fields are strings because they come from <input> elements.
// Null fields from AdminPhoto become empty strings here.
export type EditState = {
  title: string
  tags: string        // comma-separated string, split on save
  aiCaption: string
  location: string
  camera: string
  dateTaken: string
  lens: string
  focalLength: string
  iso: string
  shutterSpeed: string
  aperture: string
}
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add types/index.ts
git commit -m "types: add AdminPhoto and EditState"
```

---

### Task 2: Add AdminPin, PinForm, PhotoPickerItem to types/index.ts

**Files:**
- Modify: `types/index.ts`
- Modify: `app/admin/locations/page.tsx`

- [ ] Add these types to `types/index.ts` after `EditState`:

```ts
// ─── Admin map pin ────────────────────────────────────────────────────────────
// Includes resolved photos for display in the admin locations page.
export type AdminPin = {
  _id: string
  name: string
  description: string | null
  coordinates: { lat: number; lng: number }
  photoIds: string[]
  photos: {
    _id: string
    title: string
    src: string
    width: number
    height: number
    blurDataURL: string | null
  }[]
}

// ─── Pin form state ───────────────────────────────────────────────────────────
// lat/lng are strings because they come from <input> text fields.
// parseFloat() is called on save.
export type PinForm = {
  name: string
  description: string
  lat: string
  lng: string
  photoIds: string[]
}

// ─── Photo picker item ────────────────────────────────────────────────────────
// Minimal photo shape used in the locations page photo picker.
// Named PhotoPickerItem to avoid collision with the full AdminPhoto type.
export type PhotoPickerItem = {
  _id: string
  title: string
  src: string
}
```

- [ ] Update `app/admin/locations/page.tsx` — remove the local type definitions (lines 13–51) and replace the import:

Remove:
```ts
// ─── Types ────────────────────────────────────────────────────────────────────

type AdminPin = { ... }
type AdminPhoto = { ... }   // ← the minimal 3-field one
type PinForm = { ... }
const EMPTY_FORM: PinForm = { ... }
```

Add at top of file imports:
```ts
import type { AdminPin, PinForm, PhotoPickerItem } from '@/types'
```

Rename throughout the file: `AdminPhoto` → `PhotoPickerItem` (appears in the `photos` state and the `photos.map(...)` render).

Keep `EMPTY_FORM` constant in the file (it's not a type — it's a value).

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Run tests:

```bash
npm test
```

Expected: all pass

- [ ] Commit:

```bash
git add types/index.ts app/admin/locations/page.tsx
git commit -m "types: add AdminPin, PinForm, PhotoPickerItem; update locations page"
```

---

### Task 3: Add API request/response types to types/index.ts

**Files:**
- Modify: `types/index.ts`

- [ ] Add after `PhotoPickerItem`:

```ts
// ─── Admin API request / response types ──────────────────────────────────────

export type UpdatePhotoRequest = {
  id: string
  fields: {
    title?: string
    tags?: string[]
    aiCaption?: string
    location?: string | null
    camera?: string | null
    dateTaken?: string | null
    lens?: string | null
    focalLength?: string | null
    iso?: string | null
    shutterSpeed?: string | null
    aperture?: string | null
    visible?: boolean
  }
}

export type UpdateCaptionRequest = {
  photoId: string
  imageRef: string
}

export type BulkCaptionRequest = {
  photos: { _id: string; imageRef: string }[]
}

export type BulkCaptionResult = {
  id: string
  ok: boolean
  caption?: string
  error?: string
}

export type CreatePinRequest = {
  name: string
  description: string | null
  coordinates: { lat: number; lng: number }
  photoIds: string[]
}

export type UpdatePinRequest = CreatePinRequest & { id: string }

export type UpdateSettingRequest = {
  [key: string]: boolean
}

export type UploadPhotoResponse = {
  photo: AdminPhoto
}

// Returned by POST /api/admin/reupload — fields that change when an image is replaced
export type ReuploadPhotoUpdates = {
  src: string
  width: number
  height: number
  imageRef: string
  camera: string | null
  lens: string | null
  focalLength: string | null
  iso: string | null
  shutterSpeed: string | null
  aperture: string | null
  dateTaken: string | null
}

export type ReuploadPhotoResponse = {
  ok: boolean
  updates: ReuploadPhotoUpdates
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add types/index.ts
git commit -m "types: add API request/response types and ApiError"
```

---

### Task 4: Update AdminDashboard to import types from types/index.ts

**Files:**
- Modify: `components/AdminDashboard.tsx`

- [ ] In `AdminDashboard.tsx`, update the import at the top:

Change:
```ts
import { type SiteSettings, DEFAULT_SETTINGS } from '@/types'
```

To:
```ts
import { type SiteSettings, DEFAULT_SETTINGS, type AdminPhoto, type EditState } from '@/types'
```

- [ ] Remove the local `AdminPhoto` type definition (lines 14–32) — it is now in `types/index.ts`.

- [ ] Remove the local `EditState` type definition (lines 34–46) — it is now in `types/index.ts`.

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Run tests:

```bash
npm test
```

Expected: all pass

- [ ] Commit:

```bash
git add components/AdminDashboard.tsx
git commit -m "refactor: import AdminPhoto and EditState from types/index.ts"
```

---

## Phase 2: Shared API Client & Map Utilities

### Task 5: Create lib/adminApi.ts and write tests

**Files:**
- Create: `lib/adminApi.ts`
- Create: `__tests__/lib/adminApi.test.ts`

- [ ] Write the failing tests first — create `__tests__/lib/adminApi.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('adminApi', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('updatePhoto', () => {
    it('sends PATCH to /api/admin/photos with id and fields', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const { updatePhoto } = await import('@/lib/adminApi')
      await updatePhoto('photo-123', { title: 'New Title' })
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'photo-123', fields: { title: 'New Title' } }),
      })
    })

    it('throws ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })
      const { updatePhoto } = await import('@/lib/adminApi')
      await expect(updatePhoto('photo-123', { title: 'x' })).rejects.toThrow('Server error')
    })
  })

  describe('toggleSetting', () => {
    it('sends PATCH to /api/admin/settings', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const { toggleSetting } = await import('@/lib/adminApi')
      await toggleSetting('showCaptions', true)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showCaptions: true }),
      })
    })
  })

  describe('deletePhoto', () => {
    it('sends DELETE to /api/admin/photos with id and imageRef', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const { deletePhoto } = await import('@/lib/adminApi')
      await deletePhoto('photo-123', 'image-abc')
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'photo-123', imageRef: 'image-abc' }),
      })
    })
  })
})
```

- [ ] Run tests to confirm they fail:

```bash
npm test -- adminApi
```

Expected: FAIL — `Cannot find module '@/lib/adminApi'`

- [ ] Create `lib/adminApi.ts`:

```ts
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

export async function deletePhoto(id: string, imageRef: string): Promise<void> {
  await apiFetch('/api/admin/photos', {
    method: 'DELETE',
    body: JSON.stringify({ id, imageRef }),
  })
}

export async function uploadPhoto(file: File): Promise<AdminPhoto> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
  })
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
  const res = await fetch('/api/admin/reupload', {
    method: 'POST',
    body: formData,
  })
  const data = await res.json().catch(() => ({})) as { ok?: boolean; updates?: ReuploadPhotoUpdates; error?: string }
  if (!res.ok || !data.updates) {
    throw new ApiError(res.status, data.error ?? `Reupload failed: ${res.status}`)
  }
  return data.updates
}

// ─── Caption operations ────────────────────────────────────────────────────────

export async function regenerateCaption(
  photoId: string,
  imageRef: string,
): Promise<string> {
  const data = await apiFetch('/api/admin/captions', {
    method: 'POST',
    body: JSON.stringify({ photoId, imageRef }),
  }) as { caption: string }
  return data.caption
}

// Triggers server-side bulk caption generation for all photos missing captions.
// Sends { all: true } — the server queries Sanity for missing captions itself.
export async function bulkRegenerateCaptions(): Promise<BulkCaptionResult[]> {
  const data = await apiFetch('/api/admin/captions', {
    method: 'POST',
    body: JSON.stringify({ all: true }),
  }) as { results: BulkCaptionResult[] }
  return data.results ?? []
}

export async function updateTags(
  ids: string[],
  tags: string[],
): Promise<void> {
  await apiFetch('/api/admin/photos', {
    method: 'PATCH',
    body: JSON.stringify({ ids, tags }),
  })
}

// ─── Settings ──────────────────────────────────────────────────────────────────

export async function toggleSetting(
  key: keyof SiteSettings,
  value: boolean,
): Promise<void> {
  await apiFetch('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify({ [key]: value }),
  })
}
```

- [ ] Run tests:

```bash
npm test -- adminApi
```

Expected: all pass

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add lib/adminApi.ts __tests__/lib/adminApi.test.ts
git commit -m "feat: add lib/adminApi.ts with typed API client"
```

---

### Task 6: Create lib/mapUtils.ts

**Files:**
- Create: `lib/mapUtils.ts`

Note: `mapUtils.ts` uses Leaflet types — Leaflet is a browser-only library so we can't unit-test this in Vitest (no DOM/window). It will be verified by TypeScript and manual inspection.

- [ ] Create `lib/mapUtils.ts`:

```ts
import type LType from 'leaflet'

// ─── Pin icon factory ──────────────────────────────────────────────────────────
// Creates a Leaflet DivIcon with the standard map pin SVG shape.
// Used by both MapView and AdminMapPicker.
//
// Accepts a Leaflet instance (L) rather than importing leaflet directly,
// because Leaflet is lazy-loaded in browser-only effects and cannot be
// imported at module level (it accesses window at evaluation time).

export function createPinIcon(
  L: typeof LType,
  color: string,
  opacity = 0.85,
): LType.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [12, 36],
    html: `<svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"
        fill="${color}" opacity="${opacity}"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
    </svg>`,
  })
}
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add lib/mapUtils.ts
git commit -m "feat: add lib/mapUtils.ts with createPinIcon"
```

---

## Phase 3: Custom Hooks

### Task 7: Create lib/hooks/useAdminSettings.ts

**Files:**
- Create: `lib/hooks/useAdminSettings.ts`

This is the simplest hook — good to start here to establish the hooks pattern.

- [ ] Create `lib/hooks/` directory and `useAdminSettings.ts`:

```ts
'use client'

import { useState } from 'react'
import type { SiteSettings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { toggleSetting as apiToggleSetting } from '@/lib/adminApi'

export function useAdminSettings(initialSettings: SiteSettings = DEFAULT_SETTINGS) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings)
  const [settingsSaving, setSettingsSaving] = useState<keyof SiteSettings | null>(null)
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null)

  async function toggleSetting(key: keyof SiteSettings) {
    const newVal = !settings[key]
    setSettings(s => ({ ...s, [key]: newVal }))
    setSettingsSaving(key)
    setSettingsFeedback(null)
    try {
      await apiToggleSetting(key, newVal as boolean)
      setSettingsFeedback('Saved')
    } catch {
      // Revert on failure
      setSettings(s => ({ ...s, [key]: !newVal }))
      setSettingsFeedback('Save failed')
    } finally {
      setSettingsSaving(null)
      setTimeout(() => setSettingsFeedback(null), 2000)
    }
  }

  return { settings, settingsSaving, settingsFeedback, toggleSetting }
}
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add lib/hooks/useAdminSettings.ts
git commit -m "feat: add useAdminSettings hook"
```

---

### Task 8: Create lib/hooks/useCaptionGeneration.ts

**Files:**
- Create: `lib/hooks/useCaptionGeneration.ts`

- [ ] Create `lib/hooks/useCaptionGeneration.ts`:

```ts
'use client'

import { useState } from 'react'
import type { AdminPhoto, BulkCaptionResult } from '@/types'
import {
  regenerateCaption as apiRegenerateCaption,
  bulkRegenerateCaptions as apiBulkRegenerate,
} from '@/lib/adminApi'
import type { BulkCaptionResult } from '@/types'

type ErrorModal = { msg: string; detail: string }

export function useCaptionGeneration() {
  // Set of photo IDs currently having captions regenerated (single)
  const [captionIds, setCaptionIds] = useState<Set<string>>(new Set())
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkDone, setBulkDone] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [errorModal, setErrorModal] = useState<ErrorModal | null>(null)

  async function regenerateCaption(
    photoId: string,
    imageRef: string,
    onSuccess: (caption: string) => void,
  ) {
    setCaptionIds(s => new Set(s).add(photoId))
    try {
      const caption = await apiRegenerateCaption(photoId, imageRef)
      onSuccess(caption)
    } catch (err) {
      setErrorModal({
        msg: 'Caption generation failed',
        detail: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setCaptionIds(s => {
        const next = new Set(s)
        next.delete(photoId)
        return next
      })
    }
  }

  // Triggers server-side bulk generation (POST { all: true }).
  // The server queries Sanity for all photos missing captions and generates them.
  // onPhotoComplete is called for each successfully captioned photo so the
  // caller can update local state incrementally.
  async function bulkRegenerate(
    onPhotoComplete: (id: string, caption: string) => void,
  ) {
    setBulkRunning(true)
    setBulkDone(null)
    try {
      const results = await apiBulkRegenerate()
      const successful = results.filter(r => r.ok && r.caption)
      successful.forEach(r => onPhotoComplete(r.id, r.caption!))
      setBulkDone(successful.length)
    } catch (err) {
      setErrorModal({
        msg: 'Bulk caption generation failed',
        detail: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setBulkRunning(false)
    }
  }

  function dismissError() {
    setErrorModal(null)
  }

  return {
    captionIds,
    bulkRunning,
    bulkDone,
    uploadProgress,
    errorModal,
    regenerateCaption,
    bulkRegenerate,
    dismissError,
  }
}
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add lib/hooks/useCaptionGeneration.ts
git commit -m "feat: add useCaptionGeneration hook"
```

---

### Task 9: Create lib/hooks/usePhotoManagement.ts

**Files:**
- Create: `lib/hooks/usePhotoManagement.ts`

This is the largest hook — it owns all photo CRUD state. Read `components/AdminDashboard.tsx` carefully before implementing to capture all state and action semantics exactly.

- [ ] Create `lib/hooks/usePhotoManagement.ts`:

```ts
'use client'

import { useState, useMemo, useCallback } from 'react'
import type { AdminPhoto, EditState } from '@/types'
import {
  updatePhoto,
  deletePhoto as apiDeletePhoto,
  uploadPhoto as apiUploadPhoto,
  reuploadPhoto as apiReuploadPhoto,
  updateTags,
} from '@/lib/adminApi'

export type SortKey = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'
export type FilterVisibility = 'all' | 'visible' | 'hidden'
export type FilterCaption = 'all' | 'missing'

function photoToEditState(photo: AdminPhoto): EditState {
  return {
    title:        photo.title,
    tags:         photo.tags.join(', '),
    aiCaption:    photo.aiCaption,
    location:     photo.location     ?? '',
    camera:       photo.camera       ?? '',
    dateTaken:    photo.dateTaken    ?? '',
    lens:         photo.lens         ?? '',
    focalLength:  photo.focalLength  ?? '',
    iso:          photo.iso          ?? '',
    shutterSpeed: photo.shutterSpeed ?? '',
    aperture:     photo.aperture     ?? '',
  }
}

export function usePhotoManagement(initialPhotos: AdminPhoto[]) {
  const [photos, setPhotos] = useState<AdminPhoto[]>(initialPhotos)

  // ── Edit ───────────────────────────────────────────────────────────────────
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editState, setEditState]   = useState<EditState | null>(null)
  const [saving, setSaving]         = useState(false)
  const [feedback, setFeedback]     = useState<{ id: string; msg: string; detail?: string } | null>(null)

  // ── Delete ─────────────────────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId]           = useState<string | null>(null)

  // ── Reupload ───────────────────────────────────────────────────────────────
  const [reuploadingId, setReuploadingId] = useState<string | null>(null)
  const [imageLoading, setImageLoading]   = useState(false)

  // ── Bulk selection ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── Sort / filter ──────────────────────────────────────────────────────────
  const [sortBy, setSortBy]                   = useState<SortKey>('date-desc')
  const [filterVisibility, setFilterVisibility] = useState<FilterVisibility>('all')
  const [filterCaption, setFilterCaption]       = useState<FilterCaption>('all')
  const [filterTag, setFilterTag]               = useState<string>('')

  // ── Derived: filtered + sorted photos ─────────────────────────────────────
  const visiblePhotos = useMemo(() => {
    let result = [...photos]

    if (filterVisibility === 'visible') result = result.filter(p => p.visible)
    if (filterVisibility === 'hidden')  result = result.filter(p => !p.visible)
    if (filterCaption === 'missing')    result = result.filter(p => !p.aiCaption)
    if (filterTag.trim()) {
      const q = filterTag.trim().toLowerCase()
      result = result.filter(p => p.tags.some(t => t.toLowerCase().includes(q)))
    }

    // Hidden photos always sink to the end, then apply the selected sort
    result.sort((a, b) => {
      if (a.visible !== b.visible) return a.visible ? -1 : 1
      if (sortBy === 'date-desc') return (b.dateTaken ?? '').localeCompare(a.dateTaken ?? '')
      if (sortBy === 'date-asc')  return (a.dateTaken ?? '').localeCompare(b.dateTaken ?? '')
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title)
      if (sortBy === 'title-desc') return b.title.localeCompare(a.title)
      return 0
    })

    return result
  }, [photos, filterVisibility, filterCaption, filterTag, sortBy])

  // ── Edit actions ───────────────────────────────────────────────────────────
  function startEdit(photo: AdminPhoto) {
    setEditingId(photo._id)
    setEditState(photoToEditState(photo))
    setFeedback(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState(null)
  }

  async function saveEdit() {
    if (!editingId || !editState) return
    setSaving(true)
    try {
      const tags = editState.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      await updatePhoto(editingId, {
        title:        editState.title,
        tags,
        aiCaption:    editState.aiCaption,
        location:     editState.location     || null,
        camera:       editState.camera       || null,
        dateTaken:    editState.dateTaken    || null,
        lens:         editState.lens         || null,
        focalLength:  editState.focalLength  || null,
        iso:          editState.iso          || null,
        shutterSpeed: editState.shutterSpeed || null,
        aperture:     editState.aperture     || null,
      })

      setPhotos(prev => prev.map(p =>
        p._id === editingId
          ? { ...p, ...editState, tags, location: editState.location || null,
              camera: editState.camera || null, dateTaken: editState.dateTaken || null,
              lens: editState.lens || null, focalLength: editState.focalLength || null,
              iso: editState.iso || null, shutterSpeed: editState.shutterSpeed || null,
              aperture: editState.aperture || null }
          : p
      ))
      setFeedback({ id: editingId, msg: 'Saved' })
      setEditingId(null)
      setEditState(null)
    } catch (err) {
      setFeedback({
        id: editingId,
        msg: 'Save failed',
        detail: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete actions ─────────────────────────────────────────────────────────
  function confirmDelete(id: string) {
    setConfirmDeleteId(id)
  }

  function cancelDelete() {
    setConfirmDeleteId(null)
  }

  async function deletePhoto(id: string) {
    const photo = photos.find(p => p._id === id)
    if (!photo) return
    setDeletingId(id)
    setConfirmDeleteId(null)
    try {
      await apiDeletePhoto(id, photo.imageRef)
      setPhotos(prev => prev.filter(p => p._id !== id))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err) {
      setFeedback({
        id,
        msg: 'Delete failed',
        detail: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setDeletingId(null)
    }
  }

  // ── Visibility toggle ──────────────────────────────────────────────────────
  async function toggleVisibility(id: string) {
    const photo = photos.find(p => p._id === id)
    if (!photo) return
    const newVisible = !photo.visible
    setPhotos(prev => prev.map(p => p._id === id ? { ...p, visible: newVisible } : p))
    try {
      await updatePhoto(id, { visible: newVisible })
    } catch {
      // Revert on failure
      setPhotos(prev => prev.map(p => p._id === id ? { ...p, visible: !newVisible } : p))
    }
  }

  // ── Upload / reupload ──────────────────────────────────────────────────────
  async function uploadPhoto(file: File): Promise<AdminPhoto> {
    const photo = await apiUploadPhoto(file)
    setPhotos(prev => [photo, ...prev])
    return photo
  }

  async function reuploadPhoto(id: string, file: File) {
    setReuploadingId(id)
    try {
      const updates = await apiReuploadPhoto(id, file)
      setPhotos(prev => prev.map(p => p._id === id ? { ...p, ...updates } : p))
      setFeedback({ id, msg: 'Reuploaded successfully' })
      setTimeout(() => setFeedback(null), 4000)
    } catch (err) {
      setFeedback({
        id,
        msg: err instanceof Error ? err.message : 'Reupload failed',
        detail: err instanceof Error ? err.message : String(err),
      })
      setTimeout(() => setFeedback(null), 4000)
    } finally {
      setReuploadingId(null)
    }
  }

  function cancelReupload() {
    setReuploadingId(null)
  }

  // ── Bulk selection ─────────────────────────────────────────────────────────
  function toggleSelectId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  // ── Caption update (called from AdminDashboard after caption generation) ───
  function updatePhotoCaption(id: string, caption: string) {
    setPhotos(prev => prev.map(p =>
      p._id === id ? { ...p, aiCaption: caption } : p
    ))
  }

  // ── Bulk tag update ────────────────────────────────────────────────────────
  async function bulkAddTags(
    ids: string[],
    tags: string[],
    onSuccess: () => void,
  ) {
    try {
      await updateTags(ids, tags)
      setPhotos(prev => prev.map(p =>
        ids.includes(p._id)
          ? { ...p, tags: [...new Set([...p.tags, ...tags])] }
          : p
      ))
      onSuccess()
    } catch (err) {
      setFeedback({
        id: 'bulk',
        msg: 'Bulk tag update failed',
        detail: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return {
    photos,
    visiblePhotos,
    editingId,
    editState,
    setEditState,
    saving,
    feedback,
    confirmDeleteId,
    deletingId,
    reuploadingId,
    imageLoading,
    selectedIds,
    sortBy, setSortBy,
    filterVisibility, setFilterVisibility,
    filterCaption, setFilterCaption,
    filterTag, setFilterTag,
    startEdit,
    cancelEdit,
    saveEdit,
    confirmDelete,
    cancelDelete,
    deletePhoto,
    toggleVisibility,
    uploadPhoto,
    reuploadPhoto,
    cancelReupload,
    toggleSelectId,
    clearSelection,
    updatePhotoCaption,
    bulkAddTags,
  }
}
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add lib/hooks/usePhotoManagement.ts
git commit -m "feat: add usePhotoManagement hook"
```

---

### Task 10: Create lib/hooks/useLeafletMap.ts

**Files:**
- Create: `lib/hooks/useLeafletMap.ts`

- [ ] Create `lib/hooks/useLeafletMap.ts`:

```ts
'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type LType from 'leaflet'

// ─── useLeafletMap ─────────────────────────────────────────────────────────────
// Handles the browser-only Leaflet initialization shared between MapView and
// AdminMapPicker: lazy import, tile layer setup, invalidateSize workaround,
// and cleanup on unmount.
//
// Does NOT handle map event listeners (click, marker events) — attach those
// in the consuming component after isReady is true.
//
// AdminMapPicker-specific setup (webpack icon fix) stays in AdminMapPicker
// because it is only relevant for marker-based maps.

export function useLeafletMap(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<LeafletMap | null>(null)
  const LRef   = useRef<typeof LType | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (mapRef.current) return  // StrictMode double-mount guard
    let cancelled = false

    import('leaflet').then(({ default: L }) => {
      if (cancelled || !containerRef.current || mapRef.current) return

      LRef.current = L

      const map = L.map(containerRef.current, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      // Force Leaflet to remeasure the container after the browser has painted.
      requestAnimationFrame(() => {
        map.invalidateSize()
        setIsReady(true)
      })
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      LRef.current = null
      // Do NOT call setIsReady(false) here — setting state after unmount
      // triggers a React warning in StrictMode.
    }
  }, [containerRef])

  return { mapRef, LRef, isReady }
}
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add lib/hooks/useLeafletMap.ts
git commit -m "feat: add useLeafletMap hook"
```

---

### Task 11: Update MapView to use useLeafletMap and createPinIcon

**Files:**
- Modify: `components/MapView.tsx`

- [ ] Update `components/MapView.tsx`:

1. Add imports:
```ts
import { useLeafletMap } from '@/lib/hooks/useLeafletMap'
import { createPinIcon } from '@/lib/mapUtils'
```

2. Replace the manual refs and `useState(false)` for ready, and the entire init `useEffect`, with the hook:

Remove:
```ts
const mapRef       = useRef<LeafletMap | null>(null)
const markersRef   = useRef<Map<string, Marker>>(new Map())
const LRef         = useRef<typeof LType | null>(null)
const [ready, setReady] = useState(false)
```
And the entire `// ── Initialize Leaflet + map` useEffect block.

Add after the other state:
```ts
const { mapRef, LRef, isReady: ready } = useLeafletMap(containerRef)
const markersRef = useRef<Map<string, Marker>>(new Map())
```

3. In the markers sync `useEffect` dependency array, `ready` is already referenced — no change needed there.

4. Replace `makePinIcon` inside the markers effect with `createPinIcon`:

Remove:
```ts
const makePinIcon = (active = false) =>
  L.divIcon({ ... })
```

Replace usage:
```ts
// Before:
icon: makePinIcon(selected?._id === pin._id),

// After:
icon: createPinIcon(
  L,
  selected?._id === pin._id ? '#38bdf8' : '#0ea5e9',
  selected?._id === pin._id ? 1 : 0.85,
),
```

Also update the cleanup in the markers effect (it currently calls `markersRef.current.clear()` — ensure this still happens on cleanup).

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add components/MapView.tsx
git commit -m "refactor: MapView uses useLeafletMap and createPinIcon"
```

---

### Task 12: Update AdminMapPicker to use useLeafletMap and createPinIcon

**Files:**
- Modify: `components/AdminMapPicker.tsx`

- [ ] Update `components/AdminMapPicker.tsx`:

1. Add imports:
```ts
import { useLeafletMap } from '@/lib/hooks/useLeafletMap'
import { createPinIcon } from '@/lib/mapUtils'
```

2. Replace manual refs and ready state, and the init `useEffect`:

Remove:
```ts
const mapRef        = useRef<LeafletMap | null>(null)
const LRef          = useRef<typeof LType | null>(null)
const [ready, setReady] = useState(false)
```
And the init `useEffect` block (lines ~36–82).

Add:
```ts
const { mapRef, LRef, isReady: ready } = useLeafletMap(containerRef)
```

3. The `AdminMapPicker`-specific setup (webpack icon fix + `map.on('click', ...)`) must be added in a new `useEffect` that runs after `isReady`:

```ts
// ── AdminMapPicker-specific setup (runs once after map is ready) ──────────
useEffect(() => {
  const map = mapRef.current
  const L   = LRef.current
  if (!map || !L || !ready) return

  // Fix default icon paths broken by webpack
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl:       '/leaflet/marker-icon.png',
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    shadowUrl:     '/leaflet/marker-shadow.png',
  })

  map.on('click', (e: LType.LeafletMouseEvent) => {
    onMapClickRef.current(e.latlng.lat, e.latlng.lng)
  })
}, [ready, mapRef, LRef])
```

4. Replace `pinIcon(color)` calls with `createPinIcon(L, color)` in the markers sync effect and the pending pin effect.

5. Remove the `pendingRef.current = null` cleanup from the init effect's cleanup function (it's now handled separately). Ensure the pendingRef is cleaned up in the pending pin effect.

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add components/AdminMapPicker.tsx
git commit -m "refactor: AdminMapPicker uses useLeafletMap and createPinIcon"
```

---

## Phase 4: AdminDashboard Split

### Task 13: Create components/admin/SettingsPanel.tsx

**Files:**
- Create: `components/admin/SettingsPanel.tsx`

Start with the simplest extraction to establish the `components/admin/` pattern.

- [ ] Read the bottom of `components/AdminDashboard.tsx` to find the settings UI section (search for `settingsSaving` or `Feature flags`).

- [ ] Create `components/admin/SettingsPanel.tsx` by moving the settings UI out of `AdminDashboard`:

```tsx
'use client'

import type { SiteSettings } from '@/types'

type Props = {
  settings: SiteSettings
  settingsSaving: keyof SiteSettings | null
  settingsFeedback: string | null
  onToggle: (key: keyof SiteSettings) => void
}

const SETTING_LABELS: Record<keyof SiteSettings, string> = {
  requirePassword:      'Require password to view site',
  showLocations:        'Show locations page',
  maintenanceMode:      'Maintenance mode',
  showCaptions:         'Show AI captions in gallery',
  autoGenerateCaptions: 'Auto-generate captions on upload',
}

export default function SettingsPanel({
  settings,
  settingsSaving,
  settingsFeedback,
  onToggle,
}: Props) {
  return (
    <section className="mt-10 border-t border-slate-800 pt-8">
      <h2 className="text-slate-400 text-xs uppercase tracking-widest mb-4">Site settings</h2>
      <div className="space-y-3 max-w-md">
        {(Object.keys(settings) as (keyof SiteSettings)[]).map(key => (
          <label key={key} className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-slate-300 text-sm">{SETTING_LABELS[key]}</span>
            <button
              onClick={() => onToggle(key)}
              disabled={settingsSaving === key}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings[key] ? 'bg-sky-500' : 'bg-slate-700'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings[key] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        ))}
        {settingsFeedback && (
          <p className="text-xs text-slate-500 mt-2">{settingsFeedback}</p>
        )}
      </div>
    </section>
  )
}
```

Note: The exact JSX for the settings toggles should match what is currently in `AdminDashboard.tsx`. Read the current implementation before writing the new component and copy its structure exactly.

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add components/admin/SettingsPanel.tsx
git commit -m "feat: add admin/SettingsPanel component"
```

---

### Task 14: Create components/admin/PhotoEditModal.tsx

**Files:**
- Create: `components/admin/PhotoEditModal.tsx`

- [ ] Read `components/AdminDashboard.tsx` lines 560–750 (search for the table row that renders when `editingId === photo._id`) to find the inline edit form. The form contains inputs for all 11 `EditState` fields and uses the `inputCls` constant (defined at line 61).

- [ ] Create `components/admin/PhotoEditModal.tsx` by moving that form JSX verbatim. Replace:
  - `setEditState(prev => ({ ...prev, title: e.target.value }))` → `onChange({ title: e.target.value })`
  - `saveEdit(photo)` → `onSave()`
  - `cancelEdit()` → `onCancel()`
  - Copy the `inputCls` constant locally or import it if extracted to a shared file.

```tsx
'use client'

import type { AdminPhoto, EditState } from '@/types'

type Props = {
  photo: AdminPhoto
  editState: EditState
  saving: boolean
  onChange: (patch: Partial<EditState>) => void
  onSave: () => void
  onCancel: () => void
}

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500'

export default function PhotoEditModal({
  photo,
  editState,
  saving,
  onChange,
  onSave,
  onCancel,
}: Props) {
  // Move the edit form JSX from AdminDashboard lines ~560–750 here verbatim,
  // substituting callbacks as described above.
}
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add components/admin/PhotoEditModal.tsx
git commit -m "feat: add admin/PhotoEditModal component"
```

---

### Task 15: Create components/admin/BulkOperations.tsx

**Files:**
- Create: `components/admin/BulkOperations.tsx`

- [ ] Read the bulk operations section of `AdminDashboard.tsx` (search for `bulkTagInput`, `handleBulkAddTags`, `bulkRegenerateCaption`).

- [ ] Create `components/admin/BulkOperations.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { AdminPhoto } from '@/types'

type Props = {
  selectedIds: Set<string>
  photos: AdminPhoto[]
  bulkRunning: boolean
  bulkDone: number | null
  uploadProgress: { done: number; total: number } | null
  onBulkTags: (ids: string[], tags: string[], onSuccess: () => void) => void
  onBulkCaptions: (photos: AdminPhoto[], onProgress: (done: number, total: number) => void, onPhotoComplete: (id: string, caption: string) => void) => void
  onClearSelection: () => void
}

export default function BulkOperations({
  selectedIds,
  photos,
  bulkRunning,
  bulkDone,
  uploadProgress,
  onBulkTags,
  onBulkCaptions,
  onClearSelection,
}: Props) {
  const [bulkTagInput, setBulkTagInput] = useState('')

  // Copy the exact JSX from AdminDashboard's bulk operations section.
}
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add components/admin/BulkOperations.tsx
git commit -m "feat: add admin/BulkOperations component"
```

---

### Task 16: Create components/admin/UploadZone.tsx

**Files:**
- Create: `components/admin/UploadZone.tsx`

- [ ] Read the upload section of `AdminDashboard.tsx` (search for `handleUpload`, `reuploadInputRef`, `uploadProgress`).

- [ ] Create `components/admin/UploadZone.tsx`. The reupload trigger flow works as follows:
  - `UploadZone` owns the hidden `<input type="file">` and exposes an `openReuploadPicker()` method via `useImperativeHandle`
  - `AdminDashboard` holds a ref to `UploadZone` and calls `uploadZoneRef.current?.openReuploadPicker()` after setting `reuploadingId` in the hook
  - The `cancel` event on the input calls `onReuploadCancel` to reset `reuploadingId` if the user dismisses the OS picker

```tsx
'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'

type Props = {
  uploadProgress: { done: number; total: number } | null
  reuploadingId: string | null
  onUpload: (files: FileList) => void
  onReupload: (id: string, file: File) => void
  onReuploadCancel: () => void
}

export type UploadZoneHandle = {
  openReuploadPicker: () => void
}

const UploadZone = forwardRef<UploadZoneHandle, Props>(function UploadZone(
  { uploadProgress, reuploadingId, onUpload, onReupload, onReuploadCancel },
  ref,
) {
  const reuploadInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef   = useRef<HTMLInputElement>(null)

  // Expose openReuploadPicker so AdminDashboard can trigger the picker
  // after setting reuploadingId in the hook.
  useImperativeHandle(ref, () => ({
    openReuploadPicker: () => reuploadInputRef.current?.click(),
  }))

  // Attach cancel listener — resets reuploadingId when OS file picker is dismissed
  useEffect(() => {
    const input = reuploadInputRef.current
    if (!input) return
    const handleCancel = () => onReuploadCancel()
    input.addEventListener('cancel', handleCancel)
    return () => input.removeEventListener('cancel', handleCancel)
  }, [onReuploadCancel])

  return (
    <>
      {/* Copy the upload UI from AdminDashboard (the visible drop zone / file input button) */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files?.length) onUpload(e.target.files) }}
      />

      {/* Hidden reupload input — triggered programmatically via openReuploadPicker() */}
      <input
        ref={reuploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file && reuploadingId) onReupload(reuploadingId, file)
          // Reset so the same file can be re-selected
          if (reuploadInputRef.current) reuploadInputRef.current.value = ''
        }}
      />

      {/* Copy upload progress UI and upload button from AdminDashboard */}
    </>
  )
})

export default UploadZone
```

In `AdminDashboard`, wire the reupload trigger:

```tsx
const uploadZoneRef = useRef<UploadZoneHandle>(null)

function handleTriggerReupload(id: string) {
  pm.setReuploadingId(id)         // expose setReuploadingId from usePhotoManagement
  uploadZoneRef.current?.openReuploadPicker()
}

// In JSX:
<UploadZone ref={uploadZoneRef} ... />
<PhotoTable ... onTriggerReupload={handleTriggerReupload} />
```

Also add `setReuploadingId` to the return value of `usePhotoManagement` so `AdminDashboard` can set it before calling `uploadZoneRef.current?.openReuploadPicker()`.

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add components/admin/UploadZone.tsx
git commit -m "feat: add admin/UploadZone component"
```

---

### Task 17: Create components/admin/PhotoTable.tsx

**Files:**
- Create: `components/admin/PhotoTable.tsx`

This is the largest sub-component — the sortable, filterable photo list with per-row actions.

- [ ] Read `components/AdminDashboard.tsx` lines 460–900 (search for `StatCard`, the sort/filter control bar, and `visiblePhotos.map(photo =>`) to locate the full table rendering section.

- [ ] Create `components/admin/PhotoTable.tsx`:

```tsx
'use client'

import Image from 'next/image'
import type { AdminPhoto, EditState } from '@/types'
import type { SortKey, FilterVisibility, FilterCaption } from '@/lib/hooks/usePhotoManagement'

type Props = {
  photos: AdminPhoto[]           // all photos (for stats)
  visiblePhotos: AdminPhoto[]    // filtered + sorted
  sortBy: SortKey
  filterVisibility: FilterVisibility
  filterCaption: FilterCaption
  filterTag: string
  onSortBy: (key: SortKey) => void
  onFilterVisibility: (v: FilterVisibility) => void
  onFilterCaption: (v: FilterCaption) => void
  onFilterTag: (v: string) => void
  editingId: string | null
  editState: EditState | null
  saving: boolean
  feedback: { id: string; msg: string } | null
  confirmDeleteId: string | null
  deletingId: string | null
  reuploadingId: string | null
  captionIds: Set<string>
  selectedIds: Set<string>
  onEdit: (photo: AdminPhoto) => void
  onEditChange: (patch: Partial<EditState>) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
  onDelete: (id: string) => void
  onToggleVisibility: (id: string) => void
  onToggleSelect: (id: string) => void
  onRegenerateCaption: (id: string, imageRef: string) => void
  onTriggerReupload: (id: string) => void
}

// StatCard stays here — it's only used in this component.
// Copy verbatim from AdminDashboard lines 50–58.
function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
      <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-light text-sky-400">{value}</p>
      {sub && <p className="text-slate-600 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function PhotoTable({ ... }: Props) {
  // Move the stats row (StatCard grid), sort/filter controls, and visiblePhotos.map(...)
  // from AdminDashboard lines ~460–900 here verbatim.
  // Replace direct state setters (setSortBy, setFilterVisibility, etc.) with the
  // onSortBy, onFilterVisibility, onFilterCaption, onFilterTag props.
  // Replace startEdit(photo) with onEdit(photo).
  // Replace confirmDelete(id) with onConfirmDelete(id).
  // Replace toggleVisibility(id) with onToggleVisibility(id).
  // Replace toggleSelect(id) with onToggleSelect(id).
  // Replace regenerateCaption(photo) with onRegenerateCaption(photo._id, photo.imageRef).
  // Replace setReuploadingId(id) + reuploadInputRef.current?.click() with onTriggerReupload(id).
}
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Commit:

```bash
git add components/admin/PhotoTable.tsx
git commit -m "feat: add admin/PhotoTable component"
```

---

### Task 18: Wire AdminDashboard with hooks and sub-components

**Files:**
- Modify: `components/AdminDashboard.tsx`

This is the final step of the split — replace all the inlined logic with the hooks and sub-components.

- [ ] Replace the contents of `AdminDashboard.tsx` with the orchestrating component. Keep the file's `'use client'` directive and imports. The result should be ~150 lines:

```tsx
'use client'

import { useRef } from 'react'
import type { SiteSettings, AdminPhoto } from '@/types'
import { usePhotoManagement } from '@/lib/hooks/usePhotoManagement'
import { useCaptionGeneration } from '@/lib/hooks/useCaptionGeneration'
import { useAdminSettings } from '@/lib/hooks/useAdminSettings'
import PhotoTable from '@/components/admin/PhotoTable'
import PhotoEditModal from '@/components/admin/PhotoEditModal'
import BulkOperations from '@/components/admin/BulkOperations'
import UploadZone from '@/components/admin/UploadZone'
import SettingsPanel from '@/components/admin/SettingsPanel'

type Props = {
  initialPhotos: AdminPhoto[]
  initialSettings?: SiteSettings   // optional — defaults to DEFAULT_SETTINGS in useAdminSettings
}

export default function AdminDashboard({ initialPhotos, initialSettings }: Props) {
  const pm = usePhotoManagement(initialPhotos)
  const cg = useCaptionGeneration()
  const as = useAdminSettings(initialSettings)

  // Cross-hook: auto-caption after upload
  async function handleUpload(file: File) {
    const photo = await pm.uploadPhoto(file)
    if (as.settings.autoGenerateCaptions) {
      await cg.regenerateCaption(photo._id, photo.imageRef, caption => {
        pm.updatePhotoCaption(photo._id, caption)
      })
    }
  }

  async function handleRegenerateCaption(id: string, imageRef: string) {
    await cg.regenerateCaption(id, imageRef, caption => {
      pm.updatePhotoCaption(id, caption)
    })
  }

  async function handleBulkCaptions() {
    await cg.bulkRegenerate((id, caption) => {
      pm.updatePhotoCaption(id, caption)
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <UploadZone
        uploadProgress={cg.uploadProgress}
        reuploadingId={pm.reuploadingId}
        onUpload={handleUpload}
        onReupload={pm.reuploadPhoto}
        onReuploadCancel={pm.cancelReupload}
      />

      <BulkOperations
        selectedIds={pm.selectedIds}
        photos={pm.photos}
        bulkRunning={cg.bulkRunning}
        bulkDone={cg.bulkDone}
        uploadProgress={cg.uploadProgress}
        onBulkTags={pm.bulkAddTags}
        onBulkCaptions={handleBulkCaptions}
        onClearSelection={pm.clearSelection}
      />

      <PhotoTable
        photos={pm.photos}
        visiblePhotos={pm.visiblePhotos}
        sortBy={pm.sortBy}
        filterVisibility={pm.filterVisibility}
        filterCaption={pm.filterCaption}
        filterTag={pm.filterTag}
        onSortBy={pm.setSortBy}
        onFilterVisibility={pm.setFilterVisibility}
        onFilterCaption={pm.setFilterCaption}
        onFilterTag={pm.setFilterTag}
        editingId={pm.editingId}
        editState={pm.editState}
        saving={pm.saving}
        feedback={pm.feedback}
        confirmDeleteId={pm.confirmDeleteId}
        deletingId={pm.deletingId}
        reuploadingId={pm.reuploadingId}
        captionIds={cg.captionIds}
        selectedIds={pm.selectedIds}
        onEdit={pm.startEdit}
        onEditChange={patch => pm.setEditState(s => s ? { ...s, ...patch } : s)}
        onSaveEdit={pm.saveEdit}
        onCancelEdit={pm.cancelEdit}
        onConfirmDelete={pm.confirmDelete}
        onCancelDelete={pm.cancelDelete}
        onDelete={pm.deletePhoto}
        onToggleVisibility={pm.toggleVisibility}
        onToggleSelect={pm.toggleSelectId}
        onRegenerateCaption={handleRegenerateCaption}
        onTriggerReupload={/* see UploadZone trigger approach */}
      />

      {pm.editingId && pm.editState && (
        <PhotoEditModal
          photo={pm.photos.find(p => p._id === pm.editingId)!}
          editState={pm.editState}
          saving={pm.saving}
          onChange={patch => pm.setEditState(s => s ? { ...s, ...patch } : s)}
          onSave={pm.saveEdit}
          onCancel={pm.cancelEdit}
        />
      )}

      {cg.errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md">
            <p className="text-slate-200 font-medium mb-2">{cg.errorModal.msg}</p>
            <p className="text-slate-500 text-sm mb-4">{cg.errorModal.detail}</p>
            <button onClick={cg.dismissError} className="text-sm text-sky-400 hover:text-sky-300">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <SettingsPanel
        settings={as.settings}
        settingsSaving={as.settingsSaving}
        settingsFeedback={as.settingsFeedback}
        onToggle={as.toggleSetting}
      />
    </div>
  )
}
```

Note: The `onTriggerReupload` wiring between `PhotoTable` row buttons and `UploadZone`'s hidden input is implemented as follows (see Task 16 for full details): `UploadZone` exposes `openReuploadPicker()` via `useImperativeHandle`. `AdminDashboard` holds a `uploadZoneRef` and `handleTriggerReupload` calls `pm.setReuploadingId(id)` then `uploadZoneRef.current?.openReuploadPicker()`. Pass `handleTriggerReupload` as `onTriggerReupload` to `PhotoTable`.

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Run tests:

```bash
npm test
```

Expected: all pass

- [ ] Verify line count has dropped significantly:

```bash
wc -l components/AdminDashboard.tsx
```

Expected: ~150 lines

- [ ] Commit:

```bash
git add components/AdminDashboard.tsx components/admin/
git commit -m "refactor: split AdminDashboard into focused components and hooks"
```

---

## Phase 5: Icons & GROQ Cleanup

### Task 19: Create components/icons/index.tsx

**Files:**
- Create: `components/icons/index.tsx`

- [ ] Read `components/PhotoModal.tsx` and `components/Carousel.tsx` to find the exact SVG paths for the chevron and X icons.

- [ ] Create `components/icons/index.tsx`:

```tsx
// ─── Shared icon components ───────────────────────────────────────────────────

type IconProps = { className?: string }

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

export function XIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
```

Note: Copy the exact SVG path data from the current inline icons rather than using the above as-is — they must be visually identical.

- [ ] Commit:

```bash
git add components/icons/index.tsx
git commit -m "feat: add shared icon components"
```

---

### Task 20: Replace inline SVGs in PhotoModal, Carousel, and MapView

**Files:**
- Modify: `components/PhotoModal.tsx`
- Modify: `components/Carousel.tsx`
- Modify: `components/MapView.tsx`

- [ ] In each file, add the import:

```ts
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from '@/components/icons'
```

- [ ] Replace each inline `<svg>` with the matching icon component, preserving all `className`, `aria-label`, and wrapper element attributes exactly.

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Run tests:

```bash
npm test
```

Expected: all pass

- [ ] Commit:

```bash
git add components/PhotoModal.tsx components/Carousel.tsx components/MapView.tsx
git commit -m "refactor: replace inline SVG icons with shared icon components"
```

---

### Task 21: Deduplicate GROQ queries in lib/sanity.ts

**Files:**
- Modify: `lib/sanity.ts`

- [ ] Read `lib/sanity.ts` and identify the three queries with identical projections: `ALL_PHOTOS_QUERY`, `CAROUSEL_PHOTOS_QUERY`, `PHOTO_BY_ID_QUERY`.

- [ ] Extract the shared projection. Add before the queries:

```ts
// ─── Shared photo projection ──────────────────────────────────────────────────
// Used by all three photo queries to avoid duplication.
const PHOTO_PROJECTION = `{
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
}`
```

- [ ] Update the three queries to use it:

```ts
export const CAROUSEL_PHOTOS_QUERY = `
  *[_type == "photo" && !(_id in path("drafts.**")) && visible != false] | order(dateTaken desc) [0...8] ${PHOTO_PROJECTION}
`

export const ALL_PHOTOS_QUERY = `
  *[_type == "photo" && !(_id in path("drafts.**")) && visible != false] | order(dateTaken desc) ${PHOTO_PROJECTION}
`

export const PHOTO_BY_ID_QUERY = `
  *[_type == "photo" && _id == $id][0] ${PHOTO_PROJECTION}
`
```

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Run tests:

```bash
npm test
```

Expected: all pass

- [ ] Commit:

```bash
git add lib/sanity.ts
git commit -m "refactor: extract shared PHOTO_PROJECTION constant in sanity.ts"
```

---

## Final Verification

### Task 22: Verify and clean up

**Files:** none (verification only)

- [ ] Run full test suite:

```bash
npm test
```

Expected: all 36 tests pass

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] Verify AdminDashboard line count:

```bash
wc -l components/AdminDashboard.tsx
```

Expected: ~150 lines (down from 1,118)

- [ ] Check no local type definitions remain in components:

```bash
grep -r "^type \|^export type " components/ --include="*.tsx" | grep -v "components/admin/" | grep -v "components/icons/"
```

Expected: only `PinBase` in `AdminMapPicker.tsx` (that type is specific to its public API and belongs there)

- [ ] Build to catch any runtime issues:

```bash
npm run build
```

Expected: build succeeds with no errors

- [ ] Commit any final fixes, then push the branch for review.
