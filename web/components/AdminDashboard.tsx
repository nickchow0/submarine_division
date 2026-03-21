"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { type AdminPhoto, type SiteSettings } from "@/types";
import { usePhotoManagement } from "@/lib/hooks/usePhotoManagement";
import { useCaptionGeneration } from "@/lib/hooks/useCaptionGeneration";
import { useAdminSettings } from "@/lib/hooks/useAdminSettings";
import { reuploadPhoto, updateTags } from "@/lib/adminApi";
import UploadZone, {
  type UploadZoneHandle,
} from "@/components/admin/UploadZone";
import BulkOperations from "@/components/admin/BulkOperations";
import PhotoTable from "@/components/admin/PhotoTable";
import PhotoEditModal from "@/components/admin/PhotoEditModal";
import SettingsPanel from "@/components/admin/SettingsPanel";

type Props = {
  initialPhotos: AdminPhoto[];
  initialSettings?: SiteSettings;
};

export default function AdminDashboard({
  initialPhotos,
  initialSettings,
}: Props) {
  const uploadZoneRef = useRef<UploadZoneHandle>(null);

  const photos = usePhotoManagement(initialPhotos);
  const captions = useCaptionGeneration();
  const settings = useAdminSettings(initialSettings);

  // ── Upload: upload each file, then optionally auto-generate caption ────────

  async function handleUpload(file: File) {
    const photo = await photos.uploadPhoto(file);
    if (settings.settings.autoGenerateCaptions) {
      await captions.regenerateCaption(photo._id, photo.imageRef, (caption) =>
        photos.updateCaptionForPhoto(photo._id, caption),
      );
    }
  }

  // ── Reupload: replace image on an existing photo ───────────────────────────

  async function handleReupload(id: string, file: File) {
    try {
      const updates = await reuploadPhoto(id, file);
      photos.applyReuploadUpdates(id, updates);
      photos.setFeedback({ id, msg: "Reuploaded successfully" });
    } catch (err) {
      const detail = err instanceof Error ? err.message : undefined;
      photos.setFeedback({ id, msg: "Reupload failed", detail });
    } finally {
      photos.setReuploadingId(null);
      setTimeout(() => photos.setFeedback(null), 4000);
    }
  }

  // ── Reupload trigger: set id then open the OS file picker ─────────────────

  function handleReuploadTrigger(id: string) {
    photos.setReuploadingId(id);
    uploadZoneRef.current?.openReuploadPicker();
  }

  // ── Caption regeneration (single photo) ───────────────────────────────────

  function handleRegenerateCaption(id: string, imageRef: string) {
    captions.regenerateCaption(id, imageRef, (caption) =>
      photos.updateCaptionForPhoto(id, caption),
    );
  }

  // ── Bulk caption regeneration (selected photos) ───────────────────────────

  function handleBulkCaptions() {
    const selected = photos.photos.filter((p) => photos.selectedIds.has(p._id));
    captions.bulkRegenerate(selected, (id, caption) =>
      photos.updateCaptionForPhoto(id, caption),
    );
  }

  // ── Bulk tag addition (selected photos) ───────────────────────────────────

  async function handleBulkTags(newTags: string[]) {
    const ids = Array.from(photos.selectedIds);
    const mergedTagsById: Record<string, string[]> = {};
    for (const id of ids) {
      const photo = photos.photos.find((p) => p._id === id);
      if (photo) mergedTagsById[id] = [...new Set([...photo.tags, ...newTags])];
    }
    await Promise.all(
      ids.map((id) => updateTags([id], mergedTagsById[id] ?? newTags)),
    );
    photos.setPhotos((prev) =>
      prev.map((p) =>
        mergedTagsById[p._id] ? { ...p, tags: mergedTagsById[p._id] } : p,
      ),
    );
    photos.clearSelection();
  }

  // ── Edit modal: find current photo and editing state ──────────────────────

  const [imageLoading, setImageLoading] = useState(false);

  const editingPhoto = photos.editingId
    ? (photos.photos.find((p) => p._id === photos.editingId) ?? null)
    : null;

  const visiblePhotos = photos.photos;
  const editingIdx = editingPhoto
    ? visiblePhotos.findIndex((p) => p._id === editingPhoto._id)
    : -1;
  const prevPhoto = editingIdx > 0 ? visiblePhotos[editingIdx - 1] : null;
  const nextPhoto =
    editingIdx < visiblePhotos.length - 1
      ? visiblePhotos[editingIdx + 1]
      : null;

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
          <a
            href="/admin/locations"
            className="text-sm text-slate-400 hover:text-sky-400 transition-colors"
          >
            Locations
          </a>
          <button
            onClick={async () => {
              await fetch("/api/admin/auth/logout", { method: "POST" });
              window.location.href = "/";
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
            Array.from(files).forEach((file) => handleUpload(file));
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
        onEdit={(photo) => {
          setImageLoading(true);
          photos.startEdit(photo);
        }}
        onDelete={(id) => {
          const photo = photos.photos.find((p) => p._id === id);
          if (photo) photos.deletePhoto(id, photo.imageRef);
        }}
        onToggleVisibility={photos.toggleVisibility}
        onReupload={handleReuploadTrigger}
        onRegenerateCaption={handleRegenerateCaption}
        captionIds={captions.captionIds}
        feedback={photos.feedback}
        confirmDeleteId={photos.confirmDeleteId}
        setConfirmDeleteId={(id) =>
          id === null ? photos.cancelDelete() : photos.confirmDelete(id)
        }
        deletingId={photos.deletingId}
        reuploadingId={photos.reuploadingId}
      />

      {/* Edit modal */}
      {editingPhoto && photos.editState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={photos.cancelEdit}
        >
          {/* Prev arrow */}
          {prevPhoto && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageLoading(true);
                photos.startEdit(prevPhoto);
              }}
              className="absolute left-4 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-slate-300 hover:text-white rounded-full p-2.5 transition-colors z-10"
              title="Previous photo (←)"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>
          )}

          {/* Next arrow */}
          {nextPhoto && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageLoading(true);
                photos.startEdit(nextPhoto);
              }}
              className="absolute right-4 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-slate-300 hover:text-white rounded-full p-2.5 transition-colors z-10"
              title="Next photo (→)"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          )}

          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photo preview */}
            <div className="relative bg-slate-950">
              <Image
                key={editingPhoto._id}
                src={`${editingPhoto.src}?w=1400&q=75&fm=jpg&auto=format`}
                alt={editingPhoto.title}
                width={editingPhoto.width}
                height={editingPhoto.height}
                className={`w-full h-auto max-h-[60vh] object-contain block transition-opacity duration-200 ${imageLoading ? "opacity-0" : "opacity-100"}`}
                unoptimized
                onLoad={() => setImageLoading(false)}
              />
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center min-h-[200px]">
                  <span className="w-8 h-8 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
                </div>
              )}
              <button
                onClick={photos.cancelEdit}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-slate-300 hover:text-white rounded-full p-1.5 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Title bar */}
            <div
              className={`px-6 pt-4 pb-3 border-b border-slate-800 transition-opacity duration-150 ${imageLoading ? "opacity-40" : "opacity-100"}`}
            >
              <p className="text-slate-200 text-sm font-medium truncate">
                {editingPhoto.title}
              </p>
            </div>

            <PhotoEditModal
              editingId={photos.editingId}
              editState={photos.editState}
              saving={photos.saving}
              onEditStateChange={(field, val) =>
                photos.setEditState((prev) =>
                  prev ? { ...prev, [field]: val } : prev,
                )
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
            <h3 className="text-red-400 text-sm font-semibold mb-2">
              Caption generation error
            </h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {captions.errorModal}
            </p>
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
  );
}
