'use client'

// ─── Admin Dashboard (client component) ───────────────────────────────────────
// Receives the initial photo list from the server component (admin/page.tsx),
// then handles all interactive features client-side: visibility toggle, inline
// editing, caption regeneration, and bulk caption generation.

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────

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

type EditState = {
  title: string
  tags: string
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

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
      <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-light text-sky-400">{value}</p>
      {sub && <p className="text-slate-600 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ─── Shared input / label styles ──────────────────────────────────────────────
const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500'

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboard({ initialPhotos }: { initialPhotos: AdminPhoto[] }) {
  const [photos, setPhotos]               = useState<AdminPhoto[]>(initialPhotos)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editState, setEditState]         = useState<EditState | null>(null)
  const [saving, setSaving]               = useState(false)
  const [captionIds, setCaptionIds]       = useState<Set<string>>(new Set())
  const [bulkRunning, setBulkRunning]     = useState(false)
  const [bulkDone, setBulkDone]           = useState<number | null>(null)
  const [feedback, setFeedback]           = useState<{ id: string; msg: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [bulkTagging, setBulkTagging]   = useState(false)

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalPhotos  = photos.length
  const hiddenPhotos = photos.filter(p => !p.visible).length
  const missingCap   = photos.filter(p => !p.aiCaption).length
  const uniqueTags   = new Set(photos.flatMap(p => p.tags)).size
  const hasCaptions  = totalPhotos - missingCap

  // ── Edit helpers ──────────────────────────────────────────────────────────
  function startEdit(photo: AdminPhoto) {
    setEditingId(photo._id)
    setEditState({
      title:       photo.title,
      tags:        photo.tags.join(', '),
      aiCaption:   photo.aiCaption  ?? '',
      location:    photo.location   ?? '',
      camera:      photo.camera     ?? '',
      dateTaken:   photo.dateTaken  ?? '',
      lens:        photo.lens       ?? '',
      focalLength: photo.focalLength ?? '',
      iso:         photo.iso         ?? '',
      shutterSpeed: photo.shutterSpeed ?? '',
      aperture:    photo.aperture   ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState(null)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelEdit() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function saveEdit(photo: AdminPhoto) {
    if (!editState) return
    setSaving(true)
    const res = await fetch('/api/admin/photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: photo._id,
        fields: {
          title:     editState.title.trim(),
          tags:      editState.tags.split(',').map(t => t.trim()).filter(Boolean),
          aiCaption: editState.aiCaption.trim(),
          location:  editState.location.trim()  || null,
          camera:    editState.camera.trim()    || null,
          dateTaken: editState.dateTaken.trim() || null,
        },
      }),
    })

    if (res.ok) {
      setPhotos(prev => prev.map(p =>
        p._id !== photo._id ? p : {
          ...p,
          title:     editState.title.trim(),
          tags:      editState.tags.split(',').map(t => t.trim()).filter(Boolean),
          aiCaption: editState.aiCaption.trim(),
          location:  editState.location.trim()  || null,
          camera:    editState.camera.trim()    || null,
          dateTaken: editState.dateTaken.trim() || null,
        }
      ))
      setEditingId(null)
      setEditState(null)
    } else {
      alert('Save failed — check console')
    }
    setSaving(false)
  }

  // ── Visibility toggle ─────────────────────────────────────────────────────
  async function toggleVisibility(photo: AdminPhoto) {
    const newVisible = !photo.visible
    setPhotos(prev => prev.map(p => p._id === photo._id ? { ...p, visible: newVisible } : p))

    const res = await fetch('/api/admin/photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: photo._id, fields: { visible: newVisible } }),
    })

    if (!res.ok) {
      setPhotos(prev => prev.map(p => p._id === photo._id ? { ...p, visible: photo.visible } : p))
    }
  }

  // ── Caption helpers ───────────────────────────────────────────────────────
  async function regenerateCaption(photo: AdminPhoto) {
    setCaptionIds(prev => new Set(prev).add(photo._id))
    const res = await fetch('/api/admin/captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId: photo._id, imageRef: photo.imageRef }),
    })
    const data = await res.json()
    setCaptionIds(prev => { const s = new Set(prev); s.delete(photo._id); return s })

    if (res.ok && data.caption) {
      setPhotos(prev => prev.map(p =>
        p._id === photo._id ? { ...p, aiCaption: data.caption } : p
      ))
      setFeedback({ id: photo._id, msg: 'Caption updated' })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback({ id: photo._id, msg: 'Failed — check console' })
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const generateAllMissing = useCallback(async () => {
    setBulkRunning(true)
    setBulkDone(null)
    const res = await fetch('/api/admin/captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    const data = await res.json()
    setBulkRunning(false)

    if (res.ok) {
      const successful = (data.results ?? []).filter((r: { ok: boolean }) => r.ok)
      setBulkDone(successful.length)
      if (successful.length > 0) {
        const captionMap = new Map<string, string>(
          successful
            .filter((r: { caption?: string }) => r.caption)
            .map((r: { id: string; caption: string }) => [r.id, r.caption])
        )
        setPhotos(prev => prev.map(p =>
          captionMap.has(p._id) ? { ...p, aiCaption: captionMap.get(p._id)! } : p
        ))
      }
    }
  }, [])

  // ── Delete ────────────────────────────────────────────────────────────────
  async function deletePhoto(photo: AdminPhoto) {
    setDeletingId(photo._id)
    setConfirmDeleteId(null)

    const res = await fetch('/api/admin/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: photo._id, imageRef: photo.imageRef }),
    })

    if (res.ok) {
      setPhotos(prev => prev.filter(p => p._id !== photo._id))
    } else {
      setFeedback({ id: photo._id, msg: 'Delete failed' })
      setTimeout(() => setFeedback(null), 4000)
    }
    setDeletingId(null)
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleUpload(files: FileList) {
    if (!files.length) return
    const list = Array.from(files)
    setUploadProgress({ done: 0, total: list.length })

    for (let i = 0; i < list.length; i++) {
      const formData = new FormData()
      formData.append('file', list[i])

      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (res.ok && data.photo) {
        // Add to top of grid immediately
        setPhotos(prev => [data.photo, ...prev])
        // Then auto-generate caption in the background
        regenerateCaption(data.photo)
      } else {
        setFeedback({ id: 'upload', msg: `Failed to upload ${list[i].name}` })
        setTimeout(() => setFeedback(null), 5000)
      }

      setUploadProgress({ done: i + 1, total: list.length })
    }

    setUploadProgress(null)
    // Reset file input so the same files can be re-selected if needed
    if (uploadInputRef.current) uploadInputRef.current.value = ''
  }

  // ── Bulk tag ──────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleBulkAddTags() {
    const newTags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean)
    if (!newTags.length || !selectedIds.size) return
    setBulkTagging(true)

    await Promise.all(Array.from(selectedIds).map(async id => {
      const photo = photos.find(p => p._id === id)
      if (!photo) return
      const merged = [...new Set([...photo.tags, ...newTags])]
      const res = await fetch('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fields: { tags: merged } }),
      })
      if (res.ok) setPhotos(prev => prev.map(p => p._id === id ? { ...p, tags: merged } : p))
    }))

    setBulkTagging(false)
    setBulkTagInput('')
    setSelectedIds(new Set())
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  // ── Hover helpers ─────────────────────────────────────────────────────────
  // ── Edit modal photo lookup ────────────────────────────────────────────────
  const editingPhoto = editingId ? photos.find(p => p._id === editingId) ?? null : null

  // ── Render ────────────────────────────────────────────────────────────────
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
            onClick={logout}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total photos"  value={totalPhotos} sub={hiddenPhotos > 0 ? `${hiddenPhotos} hidden` : undefined} />
        <StatCard label="With captions" value={hasCaptions} sub={`${missingCap} missing`} />
        <StatCard label="Unique tags"   value={uniqueTags} />
        <StatCard label="Coverage"      value={totalPhotos ? `${Math.round(hasCaptions / totalPhotos * 100)}%` : '—'} sub="captioned" />
      </div>

      {/* Toolbar: upload + bulk captions */}
      <div className="flex flex-wrap items-center gap-3 mb-8">

        {/* Hidden file input */}
        <input
          ref={uploadInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => { if (e.target.files?.length) handleUpload(e.target.files) }}
        />

        {/* Upload button */}
        <button
          onClick={() => uploadInputRef.current?.click()}
          disabled={!!uploadProgress}
          className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700 rounded-lg px-4 py-2 transition-colors"
        >
          {uploadProgress ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              Uploading {uploadProgress.done}/{uploadProgress.total}…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload photos
            </>
          )}
        </button>

        {/* Upload error feedback */}
        {feedback?.id === 'upload' && (
          <span className="text-sm text-red-400">{feedback.msg}</span>
        )}

        {/* Bulk caption generation */}
        <button
          onClick={generateAllMissing}
          disabled={bulkRunning || missingCap === 0}
          className="flex items-center gap-2 text-sm bg-sky-500/10 hover:bg-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-sky-400 border border-sky-500/30 rounded-lg px-4 py-2 transition-colors"
        >
          {bulkRunning ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Generate {missingCap} missing caption{missingCap !== 1 ? 's' : ''}
            </>
          )}
        </button>
        {bulkDone !== null && (
          <span className="text-sm text-sky-400">✓ {bulkDone} captions generated</span>
        )}
      </div>

      {/* ── Bulk tag bar (visible when photos are selected) ───────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-slate-900 border border-sky-500/30 rounded-xl px-4 py-3">
          <span className="text-sm text-sky-400 font-medium shrink-0">
            {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <input
            value={bulkTagInput}
            onChange={e => setBulkTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleBulkAddTags() }}
            placeholder="Tags to add (comma-separated)"
            className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={handleBulkAddTags}
            disabled={bulkTagging || !bulkTagInput.trim()}
            className="text-sm bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-medium rounded-lg px-4 py-1.5 transition-colors shrink-0"
          >
            {bulkTagging ? 'Adding…' : 'Add tags'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors shrink-0"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ── Photo grid ────────────────────────────────────────────────────── */}
      {photos.length === 0 ? (
        <div className="text-center py-20 text-slate-500">No photos found in Sanity.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map(photo => (
            <div
              key={photo._id}
              onClick={() => startEdit(photo)}
              className={`bg-slate-900 border rounded-xl overflow-hidden flex flex-col transition-colors cursor-pointer hover:border-slate-600 ${
                selectedIds.has(photo._id)
                  ? 'border-sky-500 ring-1 ring-sky-500/50'
                  : photo.visible ? 'border-slate-800' : 'border-slate-700/50 opacity-60'
              }`}
            >
              {/* Image — object-contain so the full photo is always visible */}
              <div className="relative aspect-square bg-slate-950">
                <Image
                  src={`${photo.src}?w=800&fm=jpg`}
                  alt={photo.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1280px) 33vw, 400px"
                  unoptimized
                />
                {/* Selection checkbox */}
                <button
                  onClick={e => { e.stopPropagation(); toggleSelect(photo._id) }}
                  className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedIds.has(photo._id)
                      ? 'bg-sky-500 border-sky-500'
                      : 'bg-black/40 border-slate-400 hover:border-sky-400'
                  }`}
                >
                  {selectedIds.has(photo._id) && (
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
                {!photo.visible && (
                  <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-slate-400 text-xs px-1.5 py-0.5 rounded">
                    Hidden
                  </span>
                )}
                {feedback?.id === photo._id && (
                  <span className="absolute bottom-2 left-2 right-2 text-center bg-sky-500/20 backdrop-blur-sm text-sky-400 text-xs px-2 py-1 rounded">
                    {feedback.msg}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="px-3 pt-2.5 pb-1 flex-1">
                <p className="text-slate-200 text-sm font-medium truncate">{photo.title}</p>
                <p className="text-slate-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                  {photo.aiCaption || <span className="italic text-slate-600">No caption</span>}
                </p>
                {photo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {photo.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500/80">
                        {tag}
                      </span>
                    ))}
                    {photo.tags.length > 4 && (
                      <span className="text-xs text-slate-600">+{photo.tags.length - 4}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action bar — stop propagation so these don't open the edit modal */}
              <div onClick={e => e.stopPropagation()} className="border-t border-slate-800 mt-2 px-3 py-2 flex items-center justify-between">
                {/* Left: visibility + caption */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleVisibility(photo)}
                    title={photo.visible ? 'Hide from gallery' : 'Show in gallery'}
                    className={`transition-colors ${photo.visible ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-sky-400'}`}
                  >
                    {photo.visible ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => regenerateCaption(photo)}
                    disabled={captionIds.has(photo._id)}
                    title="Regenerate caption with AI"
                    className="text-slate-500 hover:text-sky-400 disabled:opacity-40 transition-colors"
                  >
                    {captionIds.has(photo._id) ? (
                      <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Right: edit + delete */}
                <div className="flex items-center gap-2">
                  {confirmDeleteId === photo._id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => deletePhoto(photo)}
                        disabled={!!deletingId}
                        title="Confirm delete"
                        className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-40"
                      >
                        {deletingId === photo._id ? (
                          <span className="inline-block w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : 'Delete?'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        title="Cancel"
                        className="text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(photo._id)}
                      title="Delete photo"
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {editingPhoto && editState && (
        <div
          className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={cancelEdit}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Photo + close button */}
            <div className="relative bg-slate-950">
              <Image
                src={editingPhoto.src}
                alt={editingPhoto.title}
                width={editingPhoto.width}
                height={editingPhoto.height}
                className="w-full h-auto max-h-[60vh] object-contain block"
                unoptimized
              />
              <button
                onClick={cancelEdit}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-slate-300 hover:text-white rounded-full p-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Title bar */}
            <div className="px-6 pt-4 pb-3 border-b border-slate-800">
              <p className="text-slate-200 text-sm font-medium truncate">{editingPhoto.title}</p>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Title</label>
                  <input value={editState.title} onChange={e => setEditState({ ...editState, title: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Tags (comma-separated)</label>
                  <input value={editState.tags} onChange={e => setEditState({ ...editState, tags: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Location</label>
                  <input value={editState.location} onChange={e => setEditState({ ...editState, location: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Camera</label>
                  <input value={editState.camera} onChange={e => setEditState({ ...editState, camera: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Date taken</label>
                  <input type="date" value={editState.dateTaken} onChange={e => setEditState({ ...editState, dateTaken: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Caption</label>
                <textarea
                  value={editState.aiCaption}
                  onChange={e => setEditState({ ...editState, aiCaption: e.target.value })}
                  rows={3}
                  placeholder="Write a caption, or use the ✦ button to generate one with AI"
                  className={`${inputCls} resize-y`}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 pb-5">
              <button onClick={cancelEdit} className="text-sm text-slate-500 hover:text-slate-300 transition-colors px-4 py-2">
                Cancel
              </button>
              <button
                onClick={() => saveEdit(editingPhoto)}
                disabled={saving}
                className="text-sm bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
