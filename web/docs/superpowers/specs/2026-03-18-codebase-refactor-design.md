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
4. `CAROUSEL_PHOTOS_QUERY`, `ALL_PHOTOS_QUERY`, and `PHOTO_BY_ID_QUERY` duplicate identical field projections
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
- `AdminPhoto` — a flat type that adds `imageRef: string` to the photo fields. Does NOT extend `Photo` directly because `AdminPhoto` intentionally omits `blurDataURL` (admin grid uses raw Sanity CDN URLs, never blur placeholders). Define as a flat type sharing the common fields.
- `EditState` — admin inline edit form shape

**Move from `app/admin/locations/page.tsx`:**
- `AdminPin` — map pin with full photo array
- `PinForm` — form state for creating/editing pins. Note: `lat` and `lng` are `string` (not `number`) because these are text input values before parsing. This is intentional and the type must stay as strings.

**Naming collision:** `app/admin/locations/page.tsx` has its own minimal 3-field `AdminPhoto` (`_id`, `title`, `src`) used for the photo picker — this is a different type from the dashboard's `AdminPhoto`. Rename the locations-page version to `PhotoPickerItem` before moving types to avoid the collision.

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

**Keep `pinPhotoToFull()` in `MapView.tsx`:**
The `PinPhoto` shape (from `MapPin['photos']`) lacks `aiCaption` and `visible`, which `PhotoModal` requires as non-optional fields. The adapter exists to synthesize these with defaults (`''` and `true`). It cannot be eliminated without also adding those fields to `ALL_MAP_PINS_QUERY`. Keep the adapter for now; it is small and self-contained.

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
- Sort/filter state: `sortBy` (`SortKey`), `filterVisibility`, `filterCaption`, `filterTag`
- `visiblePhotos` (derived via `useMemo` from photos + filter/sort state)

**Actions:**
- `startEdit(photo)`, `saveEdit()`, `cancelEdit()`
- `deletePhoto(id)`, `confirmDelete(id)`, `cancelDelete()`
- `toggleVisibility(id)`
- `reuploadPhoto(id, file)`, `cancelReupload()` ← see note below
- `toggleSelectId(id)`, `clearSelection()`
- Sort/filter setters

**Reupload cancel handling:** The hidden file input for reupload attaches a `cancel` event listener (to reset `reuploadingId` when the OS file picker is dismissed). This must be wired via a `cancelReupload()` action returned from the hook. The `UploadZone` component calls `onReuploadCancel` which maps to `cancelReupload()`. Missing this causes a permanent spinner if the user dismisses the OS picker.

### New file: `lib/hooks/useCaptionGeneration.ts`

Caption generation is async and long-running — owns its state separately.

**State:** `captionIds`, `bulkRunning`, `bulkDone`, `uploadProgress`, `errorModal`

**Actions:** `regenerateCaption(id: string, imageRef: string)`, `bulkRegenerate(photos)`, `dismissError()`

### New file: `lib/hooks/useAdminSettings.ts`

**State:** `settings`, `settingsSaving`, `settingsFeedback`

**Actions:** `toggleSetting(key)`

### Cross-hook interaction: auto-caption after upload

After `uploadPhoto` succeeds in `usePhotoManagement`, if `settings.autoGenerateCaptions` is true, the dashboard must call `captions.regenerateCaption(photo._id, photo.imageRef)`. Since `usePhotoManagement` does not own the settings state, `AdminDashboard` coordinates this: it calls `photos.uploadPhoto(file)` and then conditionally calls `captions.regenerateCaption(...)` based on `settings.settings.autoGenerateCaptions`. This cross-hook wiring lives in `AdminDashboard`, not inside either hook.

### New file: `lib/hooks/useLeafletMap.ts`

Extracts ~40 lines of Leaflet initialization shared between both map components.

```ts
useLeafletMap(containerRef: RefObject<HTMLDivElement>, options?: { onReady?: () => void }): { map: L.Map | null, isReady: boolean }
```

Handles: lazy `import('leaflet')`, tile layer setup, `invalidateSize()` workaround, cleanup on unmount.

**Does NOT handle map event listeners** (click, marker events, etc.) — these remain the responsibility of each consuming component, attached after `isReady` is `true`.

**`AdminMapPicker`-specific setup** (broken webpack default icon fix: `delete L.Icon.Default.prototype._getIconUrl` + `L.Icon.Default.mergeOptions(...)`) stays inside `AdminMapPicker` rather than in the shared hook, since it is only relevant for marker-based maps.

---

## Phase 4: AdminDashboard Split

**Goal:** Reduce `AdminDashboard.tsx` from 1,118 lines to ~150 lines.

### New file: `components/admin/PhotoTable.tsx`

Sortable, filterable photo list. Receives `photos`, `sortBy`, `filterVisibility`, `filterCaption`, `filterTag`, sort/filter setters, `onEdit`, `onDelete`, `onToggleVisibility`, `selectedIds`, `onSelectId`.

Includes `StatCard` (currently inline in `AdminDashboard`) — the stats row lives at the top of this component.

### New file: `components/admin/PhotoEditModal.tsx`

Inline edit form (title, tags, caption, visibility). Props: `editState`, `onSave`, `onCancel`. No fetch logic — delegates upward via callbacks.

### New file: `components/admin/BulkOperations.tsx`

Bulk tag assignment + caption regeneration UI. Props: `selectedIds`, `photos`, `bulkRunning`, `bulkDone`, `onBulkTags`, `onBulkCaptions`.

### New file: `components/admin/UploadZone.tsx`

File upload + reupload UI and progress indicator. Props: `uploadProgress`, `reuploadingId`, `onUpload`, `onReupload`, `onReuploadCancel`.

The hidden `<input type="file" ref={reuploadInputRef}>` lives here. Its `onChange` fires `onReupload(file, reuploadingId)`. A `cancel` event listener on the input fires `onReuploadCancel()` to reset state when the OS picker is dismissed.

### New file: `components/admin/SettingsPanel.tsx`

Feature flags UI (~50 lines from bottom of current `AdminDashboard`). Props: `settings`, `settingsSaving`, `settingsFeedback`, `onToggle`.

### Resulting `AdminDashboard.tsx` (~150 lines)

```tsx
export default function AdminDashboard({ initialPhotos, initialSettings }) {
  const photos   = usePhotoManagement(initialPhotos)
  const captions = useCaptionGeneration()
  const settings = useAdminSettings(initialSettings)

  // Cross-hook: trigger auto-caption after upload
  async function handleUpload(file: File) {
    const photo = await photos.uploadPhoto(file)
    if (settings.settings.autoGenerateCaptions) {
      await captions.regenerateCaption(photo._id, photo.imageRef)
    }
  }

  return (
    <>
      <UploadZone
        onUpload={handleUpload}
        onReupload={photos.reuploadPhoto}
        onReuploadCancel={photos.cancelReupload}
        reuploadingId={photos.reuploadingId}
        uploadProgress={captions.uploadProgress}
      />
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

All three photo queries (`ALL_PHOTOS_QUERY`, `CAROUSEL_PHOTOS_QUERY`, `PHOTO_BY_ID_QUERY`) share identical field projections. Extract to a shared constant:

```ts
const PHOTO_PROJECTION = `{
  _id, title,
  "tags": coalesce(tags, []),
  "aiCaption": coalesce(aiCaption, ""),
  // ... all shared fields
}`

export const ALL_PHOTOS_QUERY      = `*[...] | order(...) ${PHOTO_PROJECTION}`
export const CAROUSEL_PHOTOS_QUERY = `*[...] | order(...) [0...8] ${PHOTO_PROJECTION}`
export const PHOTO_BY_ID_QUERY     = `*[... && _id == $id][0] ${PHOTO_PROJECTION}`
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
- Reupload cancel handling preserved (no permanent spinner on picker dismiss)
- Auto-caption after upload wired correctly in `AdminDashboard`
- All existing tests pass
- TypeScript compiles with no errors
