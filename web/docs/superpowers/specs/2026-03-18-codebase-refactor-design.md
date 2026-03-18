# Codebase Refactor Design

**Date:** 2026-03-18
**Branch:** separate from `main`
**Approach:** Layer-first (foundation → API client → hooks → components → cleanup)

---

## Problem

The codebase has accumulated several maintainability issues:

1. `AdminDashboard.tsx` is 1,118 lines handling photo CRUD, uploads, bulk operations, and settings in one place with 20+ `useState` calls and 8 scattered `fetch` calls each with their own error handling
2. `MapView.tsx` and `AdminMapPicker.tsx` duplicate ~40 lines of Leaflet initialization and their pin icon implementations
3. `AdminPhoto`, `EditState`, `AdminPin`, and `PinForm` are defined inside components rather than in `types/index.ts`
4. `CAROUSEL_PHOTOS_QUERY` and `ALL_PHOTOS_QUERY` duplicate identical field projections
5. Navigation SVG icons are inlined repeatedly across `PhotoModal`, `Carousel`, and `MapView`

---

## Approach

Layer-first: build the stable foundation before touching components. Splitting `AdminDashboard` before the shared API client exists would leave 5 components each still doing their own scattered `fetch` calls.

**Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5**

---

## Phase 1: Types Consolidation

**Goal:** Make `types/index.ts` the single source of truth for all shapes.

### Changes to `types/index.ts`

**Move from `AdminDashboard.tsx`:**
- `AdminPhoto` — extends `Photo` with `imageRef: string`
- `EditState` — admin inline edit form shape

**Move from `app/admin/locations/page.tsx`:**
- `AdminPin` — map pin with full photo array
- `PinForm` — form state for creating/editing pins

**Add API request/response types:**
```ts
UpdatePhotoRequest
UpdateCaptionRequest
BulkCaptionRequest
BulkCaptionResult
CreatePinRequest
UpdatePinRequest
UpdateSettingRequest
UploadPhotoResponse
ApiError
```

**Remove `PinPhoto` from `MapView.tsx`:**
Replace with `Pick<Photo, '_id' | 'title' | 'src' | 'width' | 'height' | 'blurDataURL'>` — eliminates the `pinPhotoToFull()` adapter since `Photo` already contains all required fields.

---

## Phase 2: Shared API Client & Map Utilities

### New file: `lib/adminApi.ts`

Replaces 8 scattered `fetch` calls in `AdminDashboard`. All functions share one internal `apiFetch` helper that sets `Content-Type`, parses errors, and throws a typed `ApiError`.

```ts
updatePhoto(id: string, fields: UpdatePhotoRequest): Promise<void>
deletePhoto(id: string): Promise<void>
uploadPhoto(file: File): Promise<AdminPhoto>
reuploadPhoto(id: string, file: File): Promise<void>
regenerateCaption(id: string, imageRef: string): Promise<string>
bulkRegenerateCaptions(photos: AdminPhoto[]): Promise<BulkCaptionResult[]>
updateTags(ids: string[], tags: string[]): Promise<void>
toggleSetting(key: keyof SiteSettings, value: boolean): Promise<void>
```

### New file: `lib/mapUtils.ts`

Extracts duplicated pin icon logic from `MapView.tsx` (`makePinIcon`) and `AdminMapPicker.tsx` (`pinIcon`):

```ts
createPinIcon(color: string, opacity?: number): L.DivIcon
```

---

## Phase 3: Custom Hooks

### New file: `lib/hooks/usePhotoManagement.ts`

Owns all photo state and operations. Extracted from `AdminDashboard`.

**State:**
- `photos`, `editingId`, `editState`, `saving`, `feedback`
- `confirmDeleteId`, `deletingId`, `reuploadingId`
- `selectedIds`, `imageLoading`

**Actions:**
- `startEdit(photo)`, `saveEdit()`, `cancelEdit()`
- `deletePhoto(id)`, `confirmDelete(id)`, `cancelDelete()`
- `toggleVisibility(id)`
- `reuploadPhoto(id, file)`
- `toggleSelectId(id)`, `clearSelection()`

### New file: `lib/hooks/useCaptionGeneration.ts`

Caption generation is async and long-running — owns its state separately.

**State:** `captionIds`, `bulkRunning`, `bulkDone`, `uploadProgress`, `errorModal`

**Actions:** `regenerateCaption(id, ref)`, `bulkRegenerate(photos)`, `dismissError()`

### New file: `lib/hooks/useAdminSettings.ts`

**State:** `settings`, `settingsSaving`, `settingsFeedback`

**Actions:** `toggleSetting(key)`

### New file: `lib/hooks/useLeafletMap.ts`

Extracts ~40 lines of near-identical Leaflet initialization from both map components.

```ts
useLeafletMap(containerRef: RefObject<HTMLDivElement>, options: LeafletMapOptions): { map: L.Map | null, isReady: boolean }
```

Handles: lazy `import('leaflet')`, tile layer setup, `invalidateSize()` workaround, cleanup on unmount.

---

## Phase 4: AdminDashboard Split

**Goal:** Reduce `AdminDashboard.tsx` from 1,118 lines to ~150 lines.

### New file: `components/admin/PhotoTable.tsx`

Sortable, filterable photo list. Props: `photos`, `onEdit`, `onDelete`, `onToggleVisibility`, `selectedIds`, `onSelectId`.

### New file: `components/admin/PhotoEditModal.tsx`

Inline edit form (title, tags, caption, visibility). Props: `editState`, `onSave`, `onCancel`. No fetch logic — delegates upward via callbacks.

### New file: `components/admin/BulkOperations.tsx`

Bulk tag assignment + caption regeneration UI. Props: `selectedIds`, `photos`, `bulkRunning`, `bulkDone`, `onBulkTags`, `onBulkCaptions`.

### New file: `components/admin/UploadZone.tsx`

File upload + reupload UI and progress indicator. Props: `uploadProgress`, `reuploadingId`, `onUpload`, `onReupload`.

### New file: `components/admin/SettingsPanel.tsx`

Feature flags UI (~50 lines from bottom of current `AdminDashboard`). Props: `settings`, `settingsSaving`, `settingsFeedback`, `onToggle`.

### Resulting `AdminDashboard.tsx` (~150 lines)

```tsx
export default function AdminDashboard({ initialPhotos, initialSettings }) {
  const photos   = usePhotoManagement(initialPhotos)
  const captions = useCaptionGeneration()
  const settings = useAdminSettings(initialSettings)

  return (
    <>
      <UploadZone ... />
      <BulkOperations ... />
      <PhotoTable ... />
      <PhotoEditModal ... />
      <SettingsPanel ... />
    </>
  )
}
```

---

## Phase 5: Icons & GROQ Cleanup

### New file: `components/icons/index.tsx`

```ts
ChevronLeftIcon({ className?: string }): JSX.Element
ChevronRightIcon({ className?: string }): JSX.Element
XIcon({ className?: string }): JSX.Element
```

Replaces ~60 lines of inline SVG across `PhotoModal`, `Carousel`, and `MapView`.

### GROQ deduplication in `lib/sanity.ts`

```ts
const PHOTO_PROJECTION = `{
  _id, title,
  "tags": coalesce(tags, []),
  "aiCaption": coalesce(aiCaption, ""),
  // ... all shared fields
}`

export const ALL_PHOTOS_QUERY      = `*[...] | order(...) ${PHOTO_PROJECTION}`
export const CAROUSEL_PHOTOS_QUERY = `*[...] | order(...) [0...8] ${PHOTO_PROJECTION}`
```

---

## File Change Summary

| Action | File |
|--------|------|
| Expand | `types/index.ts` |
| New | `lib/adminApi.ts` |
| New | `lib/mapUtils.ts` |
| New | `lib/hooks/usePhotoManagement.ts` |
| New | `lib/hooks/useCaptionGeneration.ts` |
| New | `lib/hooks/useAdminSettings.ts` |
| New | `lib/hooks/useLeafletMap.ts` |
| New | `components/admin/PhotoTable.tsx` |
| New | `components/admin/PhotoEditModal.tsx` |
| New | `components/admin/BulkOperations.tsx` |
| New | `components/admin/UploadZone.tsx` |
| New | `components/admin/SettingsPanel.tsx` |
| New | `components/icons/index.tsx` |
| Shrink | `components/AdminDashboard.tsx` |
| Simplify | `components/MapView.tsx` |
| Simplify | `components/AdminMapPicker.tsx` |
| Simplify | `lib/sanity.ts` |

---

## Success Criteria

- `AdminDashboard.tsx` reduces from 1,118 to ~150 lines
- No local type definitions remain in components (all in `types/index.ts`)
- `MapView.tsx` and `AdminMapPicker.tsx` both use `useLeafletMap` and `createPinIcon`
- All admin API calls go through `lib/adminApi.ts`
- All existing tests pass
- TypeScript compiles with no errors
