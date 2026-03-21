"use client";

import { useState, useCallback, useMemo } from "react";
import {
  type AdminPhoto,
  type EditState,
  type ReuploadPhotoUpdates,
} from "@/types";
import {
  updatePhoto,
  deletePhoto as apiDeletePhoto,
  uploadPhoto as apiUploadPhoto,
} from "@/lib/adminApi";

// ─── Sort key ─────────────────────────────────────────────────────────────────
export type SortKey = "date-desc" | "date-asc" | "title-asc" | "title-desc";

// ─── Feedback shape ───────────────────────────────────────────────────────────
export type PhotoFeedback = { id: string; msg: string; detail?: string };

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePhotoManagement(initialPhotos: AdminPhoto[]) {
  // ── Core photo list ─────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<AdminPhoto[]>(initialPhotos);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Feedback (per-photo toasts / error banners) ─────────────────────────────
  const [feedback, setFeedback] = useState<PhotoFeedback | null>(null);

  // ── Delete state ────────────────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Reupload state ──────────────────────────────────────────────────────────
  const [reuploadingId, setReuploadingId] = useState<string | null>(null);

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // ── Sort / filter state ─────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortKey>("date-desc");
  const [filterVisibility, setFilterVisibility] = useState<
    "all" | "visible" | "hidden"
  >("all");
  const [filterCaption, setFilterCaption] = useState<"all" | "missing">("all");
  const [filterTag, setFilterTag] = useState("");

  // ── visiblePhotos (memoised) ────────────────────────────────────────────────
  const visiblePhotos = useMemo(() => {
    let list = [...photos];

    // Filter
    if (filterVisibility === "visible") list = list.filter((p) => p.visible);
    if (filterVisibility === "hidden") list = list.filter((p) => !p.visible);
    if (filterCaption === "missing") list = list.filter((p) => !p.aiCaption);
    if (filterTag.trim()) {
      const q = filterTag.trim().toLowerCase();
      list = list.filter((p) =>
        p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Sort — hidden photos always sink to the end
    list.sort((a, b) => {
      if (a.visible !== b.visible) return a.visible ? -1 : 1;
      if (sortBy === "date-desc")
        return (b.dateTaken ?? "").localeCompare(a.dateTaken ?? "");
      if (sortBy === "date-asc")
        return (a.dateTaken ?? "").localeCompare(b.dateTaken ?? "");
      if (sortBy === "title-asc") return a.title.localeCompare(b.title);
      if (sortBy === "title-desc") return b.title.localeCompare(a.title);
      return 0;
    });

    return list;
  }, [photos, sortBy, filterVisibility, filterCaption, filterTag]);

  // ── Edit actions ────────────────────────────────────────────────────────────

  const startEdit = useCallback((photo: AdminPhoto) => {
    setEditingId(photo._id);
    setEditState({
      title: photo.title,
      tags: photo.tags.join(", "),
      aiCaption: photo.aiCaption ?? "",
      location: photo.location ?? "",
      camera: photo.camera ?? "",
      dateTaken: photo.dateTaken ?? "",
      lens: photo.lens ?? "",
      focalLength: photo.focalLength ?? "",
      iso: photo.iso ?? "",
      shutterSpeed: photo.shutterSpeed ?? "",
      aperture: photo.aperture ?? "",
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditState(null);
  }, []);

  const saveEdit = useCallback(
    async (photo: AdminPhoto) => {
      if (!editState) return;
      setSaving(true);

      const fields = {
        title: editState.title.trim(),
        tags: editState.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        aiCaption: editState.aiCaption.trim(),
        location: editState.location.trim() || null,
        camera: editState.camera.trim() || null,
        dateTaken: editState.dateTaken.trim() || null,
        lens: editState.lens.trim() || null,
        focalLength: editState.focalLength.trim() || null,
        iso: editState.iso.trim() || null,
        shutterSpeed: editState.shutterSpeed.trim() || null,
        aperture: editState.aperture.trim() || null,
      };

      try {
        await updatePhoto(photo._id, fields);
        setPhotos((prev) =>
          prev.map((p) => (p._id !== photo._id ? p : { ...p, ...fields })),
        );
        setEditingId(null);
        setEditState(null);
      } catch {
        alert("Save failed — check console");
      } finally {
        setSaving(false);
      }
    },
    [editState],
  );

  // ── Delete actions ──────────────────────────────────────────────────────────

  const confirmDelete = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const cancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  const deletePhoto = useCallback(async (id: string, imageRef: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);

    try {
      await apiDeletePhoto(id, imageRef);
      setPhotos((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      const detail = err instanceof Error ? err.message : undefined;
      setFeedback({ id, msg: "Delete failed", detail });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setDeletingId(null);
    }
  }, []);

  // ── Visibility toggle ───────────────────────────────────────────────────────

  const toggleVisibility = useCallback(
    async (id: string) => {
      const photo = photos.find((p) => p._id === id);
      if (!photo) return;
      const newVisible = !photo.visible;

      // Optimistic update
      setPhotos((prev) =>
        prev.map((p) => (p._id === id ? { ...p, visible: newVisible } : p)),
      );

      try {
        await updatePhoto(id, { visible: newVisible });
      } catch {
        // Revert on failure
        setPhotos((prev) =>
          prev.map((p) =>
            p._id === id ? { ...p, visible: photo.visible } : p,
          ),
        );
      }
    },
    [photos],
  );

  // ── Upload ──────────────────────────────────────────────────────────────────
  // Returns the newly created AdminPhoto so the caller can wire auto-caption.

  const uploadPhoto = useCallback(async (file: File): Promise<AdminPhoto> => {
    const photo = await apiUploadPhoto(file);
    setPhotos((prev) => [photo, ...prev]);
    return photo;
  }, []);

  // ── Reupload (replace image on existing photo) ──────────────────────────────

  const applyReuploadUpdates = useCallback(
    (id: string, updates: ReuploadPhotoUpdates) => {
      setPhotos((prev) =>
        prev.map((p) => (p._id === id ? { ...p, ...updates } : p)),
      );
    },
    [],
  );

  const cancelReupload = useCallback(() => {
    setReuploadingId(null);
  }, []);

  // ── Caption update (called by useCaptionGeneration callbacks) ───────────────

  const updateCaptionForPhoto = useCallback((id: string, caption: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p._id === id ? { ...p, aiCaption: caption } : p)),
    );
  }, []);

  // ── Selection actions ───────────────────────────────────────────────────────

  const toggleSelectId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    // State
    photos,
    setPhotos,
    editingId,
    editState,
    setEditState,
    saving,
    feedback,
    setFeedback,
    confirmDeleteId,
    deletingId,
    reuploadingId,
    setReuploadingId,
    selectedIds,

    // Sort / filter
    sortBy,
    setSortBy,
    filterVisibility,
    setFilterVisibility,
    filterCaption,
    setFilterCaption,
    filterTag,
    setFilterTag,

    // Derived
    visiblePhotos,

    // Edit actions
    startEdit,
    saveEdit,
    cancelEdit,

    // Delete actions
    deletePhoto,
    confirmDelete,
    cancelDelete,

    // Visibility
    toggleVisibility,

    // Upload / reupload
    uploadPhoto,
    applyReuploadUpdates,
    cancelReupload,

    // Caption wiring
    updateCaptionForPhoto,

    // Selection
    toggleSelectId,
    clearSelection,
  };
}
