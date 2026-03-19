'use client'

import { useRef, useState } from 'react'
import { type AdminPhoto, type SiteSettings } from '@/types'
import { usePhotoManagement } from '@/lib/hooks/usePhotoManagement'
import { useCaptionGeneration } from '@/lib/hooks/useCaptionGeneration'
import { useAdminSettings } from '@/lib/hooks/useAdminSettings'
import { reuploadPhoto, updateTags } from '@/lib/adminApi'
import UploadZone, { type UploadZoneHandle } from '@/components/admin/UploadZone'
import BulkOperations from '@/components/admin/BulkOperations'
import PhotoTable from '@/components/admin/PhotoTable'
import PhotoEditModal from '@/components/admin/PhotoEditModal'
import SettingsPanel from '@/components/admin/SettingsPanel'

type Props = {
  initialPhotos: AdminPhoto[]
  initialSettings?: SiteSettings
}

export default function AdminDashboard({ initialPhotos, initialSettings }: Props) {
  const uploadZoneRef = useRef<UploadZoneHandle>(null)

  const photos   = usePhotoManagement(initialPhotos)
  const captions = useCaptionGeneration()
  const settings = useAdminSettings(initialSettings)

  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const [syncAllRunning, setSyncAllRunning] = useState(false)
  const [syncAllProgress, setSyncAllProgress] = useState<{ current: number; total: number } | null>(null)

  // ── Shopify sync (single photo) ────────────────────────────────────────────

  async function handleSync(id: string) {
    setSyncingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/admin/sync-shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: id }),
      })
      if (res.ok) {
        const { shopifyProductId } = await res.json() as { shopifyProductId: string }
        photos.setPhotos(prev => prev.map(p => p._id === id ? { ...p, shopifyProductId } : p))
      }
    } catch {
      // non-fatal
    } finally {
      setSyncingIds(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  // ── Shopify sync (all unsynced) ────────────────────────────────────────────

  async function handleSyncAll() {
    const unsynced = photos.photos.filter(p => !p.shopifyProductId)
    if (!unsynced.length) return
    setSyncAllRunning(true)
    setSyncAllProgress({ current: 0, total: unsynced.length })
    for (let i = 0; i < unsynced.length; i++) {
      const photo = unsynced[i]
      setSyncAllProgress({ current: i + 1, total: unsynced.length })
      try {
        const res = await fetch('/api/admin/sync-shopify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId: photo._id }),
        })
        if (res.ok) {
          const { shopifyProductId } = await res.json() as { shopifyProductId: string }
          photos.setPhotos(prev => prev.map(p => p._id === photo._id ? { ...p, shopifyProductId } : p))
        }
      } catch { /* continue */ }
    }
    setSyncAllRunning(false)
    setSyncAllProgress(null)
  }

  // ── Upload: upload each file, then optionally auto-generate caption ────────

  async function handleUpload(file: File) {
    const photo = await photos.uploadPhoto(file)
    if (settings.settings.autoGenerateCaptions) {
      await captions.regenerateCaption(
        photo._id,
        photo.imageRef,
        (caption) => photos.updateCaptionForPhoto(photo._id, caption),
      )
    }
  }

  // ── Reupload: replace image on an existing photo ───────────────────────────

  async function handleReupload(id: string, file: File) {
    try {
      const updates = await reuploadPhoto(id, file)
      photos.applyReuploadUpdates(id, updates)
      photos.setFeedback({ id, msg: 'Reuploaded successfully' })
    } catch (err) {
      const detail = err instanceof Error ? err.message : undefined
      photos.setFeedback({ id, msg: 'Reupload failed', detail })
    } finally {
      photos.setReuploadingId(null)
      setTimeout(() => photos.setFeedback(null), 4000)
    }
  }

  // ── Reupload trigger: set id then open the OS file picker ─────────────────

  function handleReuploadTrigger(id: string) {
    photos.setReuploadingId(id)
    uploadZoneRef.current?.openReuploadPicker()
  }

  // ── Caption regeneration (single photo) ───────────────────────────────────

  function handleRegenerateCaption(id: string, imageRef: string) {
    captions.regenerateCaption(
      id,
      imageRef,
      (caption) => photos.updateCaptionForPhoto(id, caption),
    )
  }

  // ── Bulk caption regeneration (selected photos) ───────────────────────────

  function handleBulkCaptions() {
    const selected = photos.photos.filter(p => photos.selectedIds.has(p._id))
    captions.bulkRegenerate(
      selected,
      (id, caption) => photos.updateCaptionForPhoto(id, caption),
    )
  }

  // ── Bulk tag addition (selected photos) ───────────────────────────────────

  async function handleBulkTags(newTags: string[]) {
    const ids = Array.from(photos.selectedIds)
    const mergedTagsById: Record<string, string[]> = {}
    for (const id of ids) {
      const photo = photos.photos.find(p => p._id === id)
      if (photo) mergedTagsById[id] = [...new Set([...photo.tags, ...newTags])]
    }
    await Promise.all(
      ids.map(id => updateTags([id], mergedTagsById[id] ?? newTags)),
    )
    photos.setPhotos(prev =>
      prev.map(p => (mergedTagsById[p._id] ? { ...p, tags: mergedTagsById[p._id] } : p)),
    )
    photos.clearSelection()
  }

  // ── Edit modal: find current photo and editing state ──────────────────────

  const editingPhoto = photos.editingId
    ? photos.photos.find(p => p._id === photos.editingId) ?? null
    : null

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2
            style={{ fontFamily: "'Italiana', serif" }}
            className="text-3xl text-sky-400 tracking-wider"
          >
            Admin
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">SubmarineDivision</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/admin/locations" className="text-sm text-slate-400 hover:text-sky-400 transition-colors">
            Locations
          </a>
          <button
            onClick={async () => {
              await fetch('/api/admin/auth/logout', { method: 'POST' })
              window.location.href = '/'
            }}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Toolbar: upload */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <UploadZone
          ref={uploadZoneRef}
          onUpload={(files) => {
            Array.from(files).forEach(file => handleUpload(file))
          }}
          onReupload={handleReupload}
          onReuploadCancel={photos.cancelReupload}
          reuploadingId={photos.reuploadingId}
          uploadProgress={captions.uploadProgress}
        />
      </div>

      {/* Bulk operations bar (visible when photos are selected) */}
      <BulkOperations
        selectedIds={photos.selectedIds}
        photos={photos.photos}
        bulkRunning={captions.bulkRunning}
        bulkDone={captions.bulkDone}
        uploadProgress={captions.uploadProgress}
        onBulkTags={handleBulkTags}
        onBulkCaptions={handleBulkCaptions}
        onClearSelection={photos.clearSelection}
        onSyncAll={handleSyncAll}
        syncAllRunning={syncAllRunning}
        syncAllProgress={syncAllProgress}
      />

      {/* Photo grid with stats and filters */}
      <PhotoTable
        photos={photos.visiblePhotos}
        allPhotos={photos.photos}
        sortBy={photos.sortBy}
        setSortBy={photos.setSortBy}
        filterVisibility={photos.filterVisibility}
        setFilterVisibility={photos.setFilterVisibility}
        filterCaption={photos.filterCaption}
        setFilterCaption={photos.setFilterCaption}
        filterTag={photos.filterTag}
        setFilterTag={photos.setFilterTag}
        selectedIds={photos.selectedIds}
        onSelectId={photos.toggleSelectId}
        onEdit={photos.startEdit}
        onDelete={(id) => {
          const photo = photos.photos.find(p => p._id === id)
          if (photo) photos.deletePhoto(id, photo.imageRef, photo.shopifyProductId ?? null)
        }}
        onToggleVisibility={photos.toggleVisibility}
        onReupload={handleReuploadTrigger}
        onRegenerateCaption={handleRegenerateCaption}
        captionIds={captions.captionIds}
        feedback={photos.feedback}
        confirmDeleteId={photos.confirmDeleteId}
        setConfirmDeleteId={(id) => id === null ? photos.cancelDelete() : photos.confirmDelete(id)}
        deletingId={photos.deletingId}
        reuploadingId={photos.reuploadingId}
        onSync={handleSync}
        syncingIds={syncingIds}
      />

      {/* Edit modal (rendered inline; PhotoEditModal returns null when no editingId) */}
      {editingPhoto && photos.editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-800">
              <h3 className="text-slate-200 text-sm font-semibold">Edit photo</h3>
              <button
                onClick={photos.cancelEdit}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <PhotoEditModal
              editingId={photos.editingId}
              editState={photos.editState}
              saving={photos.saving}
              onEditStateChange={(field, val) =>
                photos.setEditState(prev => prev ? { ...prev, [field]: val } : prev)
              }
              onSave={() => editingPhoto && photos.saveEdit(editingPhoto)}
              onCancel={photos.cancelEdit}
            />
          </div>
        </div>
      )}

      {/* Caption error modal */}
      {captions.errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-red-400 text-sm font-semibold mb-2">Caption generation error</h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">{captions.errorModal}</p>
            <button
              onClick={captions.dismissError}
              className="mt-4 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-4 py-2 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Settings / feature flags */}
      <SettingsPanel
        settings={settings.settings}
        settingsSaving={settings.settingsSaving ?? false}
        settingsFeedback={settings.settingsFeedback}
        onToggle={settings.toggleSetting}
      />
    </div>
  )
}
