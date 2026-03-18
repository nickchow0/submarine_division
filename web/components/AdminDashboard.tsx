'use client'

// ─── Admin Dashboard (client component) ───────────────────────────────────────
// Receives the initial photo list from the server component (admin/page.tsx),
// then handles all interactive features client-side: visibility toggle, inline
// editing, caption regeneration, bulk caption generation, and feature flags.

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import { type SiteSettings, DEFAULT_SETTINGS } from '@/types'

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

export default function AdminDashboard({
  initialPhotos,
  initialSettings = DEFAULT_SETTINGS,
}: {
  initialPhotos: AdminPhoto[]
  initialSettings?: SiteSettings
}) {
  const [photos, setPhotos]               = useState<AdminPhoto[]>(initialPhotos)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editState, setEditState]         = useState<EditState | null>(null)
  const [saving, setSaving]               = useState(false)
  const [captionIds, setCaptionIds]       = useState<Set<string>>(new Set())
  const [bulkRunning, setBulkRunning]     = useState(false)
  const [bulkDone, setBulkDone]           = useState<number | null>(null)
  const [feedback, setFeedback]           = useState<{ id: string; msg: string; detail?: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [reuploadingId, setReuploadingId] = useState<string | null>(null)
  const reuploadInputRef = useRef<HTMLInputElement>(null)
  const [errorModal, setErrorModal] = useState<{ msg: string; detail: string } | null>(null)

  // Reset spinner if user cancels the file picker without selecting a file
  useEffect(() => {
    const input = reuploadInputRef.current
    if (!input) return
    const handleCancel = () => setReuploadingId(null)
    input.addEventListener('cancel', handleCancel)
    return () => input.removeEventListener('cancel', handleCancel)
  }, [])

  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [bulkTagging, setBulkTagging]   = useState(false)
  const [imageLoading, setImageLoading] = useState(false)

  // ── Feature flags (experiments) ───────────────────────────────────────────
  const [settings, setSettings]         = useState<SiteSettings>(initialSettings)
  const [settingsSaving, setSettingsSaving] = useState<keyof SiteSettings | null>(null)
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null)

  async function toggleSetting(key: keyof SiteSettings) {
    const newVal = !settings[key]
    setSettings(prev => ({ ...prev, [key]: newVal }))
    setSettingsSaving(key)

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newVal }),
      })
      if (!res.ok) throw new Error('request failed')
      setSettingsFeedback(`Saved`)
      setTimeout(() => setSettingsFeedback(null), 2000)
    } catch {
      // Revert on failure
      setSettings(prev => ({ ...prev, [key]: !newVal }))
      setSettingsFeedback('Save failed')
      setTimeout(() => setSettingsFeedback(null), 3000)
    } finally {
      setSettingsSaving(null)
    }
  }

  // ── Sort & filter ──────────────────────────────────────────────────────────
  type SortKey = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'
  const [sortBy,           setSortBy]           = useState<SortKey>('date-desc')
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'visible' | 'hidden'>('all')
  const [filterCaption,    setFilterCaption]    = useState<'all' | 'missing'>('all')
  const [filterTag,        setFilterTag]        = useState('')

  const visiblePhotos = useMemo(() => {
    let list = [...photos]

    // Filter
    if (filterVisibility === 'visible') list = list.filter(p => p.visible)
    if (filterVisibility === 'hidden')  list = list.filter(p => !p.visible)
    if (filterCaption    === 'missing') list = list.filter(p => !p.aiCaption)
    if (filterTag.trim()) {
      const q = filterTag.trim().toLowerCase()
      list = list.filter(p => p.tags.some(t => t.toLowerCase().includes(q)))
    }

    // Sort — hidden photos always sink to the end
    list.sort((a, b) => {
      if (a.visible !== b.visible) return a.visible ? -1 : 1
      if (sortBy === 'date-desc') return (b.dateTaken ?? '').localeCompare(a.dateTaken ?? '')
      if (sortBy === 'date-asc')  return (a.dateTaken ?? '').localeCompare(b.dateTaken ?? '')
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title)
      if (sortBy === 'title-desc')return b.title.localeCompare(a.title)
      return 0
    })

    return list
  }, [photos, sortBy, filterVisibility, filterCaption, filterTag])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalPhotos  = photos.length
  const hiddenPhotos = photos.filter(p => !p.visible).length
  const missingCap   = photos.filter(p => !p.aiCaption).length
  const uniqueTags   = new Set(photos.flatMap(p => p.tags)).size
  const hasCaptions  = totalPhotos - missingCap

  // ── Edit helpers ──────────────────────────────────────────────────────────
  function startEdit(photo: AdminPhoto) {
    setImageLoading(true)
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
    const handler = (e: KeyboardEvent) => {
      if (!editingId) return
      const tag = (e.target as HTMLElement).tagName

      // Enter from any field except textarea triggers save
      if (e.key === 'Enter' && tag !== 'TEXTAREA') {
        e.preventDefault()
        const photo = visiblePhotos.find(p => p._id === editingId)
        if (photo && !saving) saveEdit(photo)
        return
      }

      // Don't steal arrow/escape keys while the user is typing in an input/textarea
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Escape') {
        cancelEdit()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const idx = visiblePhotos.findIndex(p => p._id === editingId)
        const next = e.key === 'ArrowLeft' ? visiblePhotos[idx - 1] : visiblePhotos[idx + 1]
        if (next) startEdit(next)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingId, visiblePhotos, saving])

  async function saveEdit(photo: AdminPhoto) {
    if (!editState) return
    setSaving(true)
    const res = await fetch('/api/admin/photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: photo._id,
        fields: {
          title:       editState.title.trim(),
          tags:        editState.tags.split(',').map(t => t.trim()).filter(Boolean),
          aiCaption:   editState.aiCaption.trim(),
          location:    editState.location.trim()    || null,
          camera:      editState.camera.trim()      || null,
          dateTaken:   editState.dateTaken.trim()   || null,
          lens:        editState.lens.trim()        || null,
          focalLength: editState.focalLength.trim() || null,
          iso:         editState.iso.trim()         || null,
          shutterSpeed: editState.shutterSpeed.trim() || null,
          aperture:    editState.aperture.trim()    || null,
        },
      }),
    })

    if (res.ok) {
      setPhotos(prev => prev.map(p =>
        p._id !== photo._id ? p : {
          ...p,
          title:       editState.title.trim(),
          tags:        editState.tags.split(',').map(t => t.trim()).filter(Boolean),
          aiCaption:   editState.aiCaption.trim(),
          location:    editState.location.trim()    || null,
          camera:      editState.camera.trim()      || null,
          dateTaken:   editState.dateTaken.trim()   || null,
          lens:        editState.lens.trim()        || null,
          focalLength: editState.focalLength.trim() || null,
          iso:         editState.iso.trim()         || null,
          shutterSpeed: editState.shutterSpeed.trim() || null,
          aperture:    editState.aperture.trim()    || null,
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
      const detail = [data.error, data.stack].filter(Boolean).join('\n\n')
      setFeedback({ id: photo._id, msg: 'Failed — check console', detail: detail || undefined })
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

    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setPhotos(prev => prev.filter(p => p._id !== photo._id))
    } else {
      const detail = [data.error, data.stack].filter(Boolean).join('\n\n')
      setFeedback({ id: photo._id, msg: 'Delete failed', detail: detail || undefined })
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
        // Auto-generate caption unless the experiment flag is disabled
        if (settings.autoGenerateCaptions) {
          regenerateCaption(data.photo)
        }
      } else {
        const detail = [data.error, data.stack].filter(Boolean).join('\n\n')
        setFeedback({ id: 'upload', msg: `Failed to upload ${list[i].name}`, detail: detail || undefined })
        setTimeout(() => setFeedback(null), 5000)
      }

      setUploadProgress({ done: i + 1, total: list.length })
    }

    setUploadProgress(null)
    // Reset file input so the same files can be re-selected if needed
    if (uploadInputRef.current) uploadInputRef.current.value = ''
  }

  // ── Reupload (replace image on existing photo) ────────────────────────────
  async function handleReupload(file: File, photoId: string) {
    setReuploadingId(photoId)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('id', photoId)

    const res  = await fetch('/api/admin/reupload', { method: 'POST', body: formData })
    const data = await res.json().catch(() => ({}))

    if (res.ok && data.updates) {
      setPhotos(prev => prev.map(p => p._id === photoId ? { ...p, ...data.updates } : p))
      setFeedback({ id: photoId, msg: 'Reuploaded successfully' })
    } else {
      const detail = [data.error, data.stack].filter(Boolean).join('\n\n')
      setFeedback({ id: photoId, msg: data.error ?? 'Reupload failed', detail: detail || undefined })
    }
    setTimeout(() => setFeedback(null), 4000)
    setReuploadingId(null)
    if (reuploadInputRef.current) reuploadInputRef.current.value = ''
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

        {/* Hidden file input — bulk upload */}
        <input
          ref={uploadInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => { if (e.target.files?.length) handleUpload(e.target.files) }}
        />

        {/* Hidden file input — per-photo reupload */}
        <input
          ref={reuploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file && reuploadingId) handleReupload(file, reuploadingId)
          }}
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
          <span className="flex items-center gap-1.5 text-sm text-red-400">
            <span>{feedback.msg}</span>
            {feedback.detail && (
              <button
                onClick={() => setErrorModal({ msg: feedback.msg, detail: feedback.detail! })}
                className="underline hover:text-red-300 transition-colors"
              >
                Details
              </button>
            )}
          </span>
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

      {/* ── Sort & filter bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500"
        >
          <option value="date-desc">Date ↓ newest</option>
          <option value="date-asc">Date ↑ oldest</option>
          <option value="title-asc">Title A → Z</option>
          <option value="title-desc">Title Z → A</option>
        </select>

        {/* Visibility filter */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700 text-sm">
          {(['all', 'visible', 'hidden'] as const).map(v => (
            <button
              key={v}
              onClick={() => setFilterVisibility(v)}
              className={`px-3 py-1.5 capitalize transition-colors ${filterVisibility === v ? 'bg-slate-600 text-slate-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Caption filter */}
        <button
          onClick={() => setFilterCaption(f => f === 'all' ? 'missing' : 'all')}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${filterCaption === 'missing' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
        >
          No caption
        </button>

        {/* Tag search */}
        <input
          value={filterTag}
          onChange={e => setFilterTag(e.target.value)}
          placeholder="Filter by tag…"
          className="text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500 w-36"
        />

        {/* Result count */}
        <span className="text-xs text-slate-600 ml-1">
          {visiblePhotos.length}{visiblePhotos.length !== photos.length ? ` / ${photos.length}` : ''} photo{visiblePhotos.length !== 1 ? 's' : ''}
        </span>
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
      {visiblePhotos.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          {photos.length === 0 ? 'No photos found in Sanity.' : 'No photos match the current filters.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visiblePhotos.map(photo => (
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
                  <span className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 bg-sky-500/20 backdrop-blur-sm text-sky-400 text-xs px-2 py-1 rounded">
                    <span>{feedback.msg}</span>
                    {feedback.detail && (
                      <button
                        onClick={e => { e.stopPropagation(); setErrorModal({ msg: feedback.msg, detail: feedback.detail! }) }}
                        className="underline hover:text-sky-300 transition-colors shrink-0"
                      >
                        Details
                      </button>
                    )}
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
                    onClick={() => { setReuploadingId(photo._id); reuploadInputRef.current?.click() }}
                    disabled={reuploadingId === photo._id}
                    title="Replace image file"
                    className="text-slate-500 hover:text-sky-400 disabled:opacity-40 transition-colors"
                  >
                    {reuploadingId === photo._id ? (
                      <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
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

      {/* ── Experiments / feature flags ───────────────────────────────────── */}
      <div className="mt-16 border-t border-slate-800 pt-10">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-slate-300 text-sm font-semibold uppercase tracking-widest">Experiments</h3>
          {settingsFeedback && (
            <span className="text-xs text-sky-400">{settingsFeedback}</span>
          )}
        </div>
        <p className="text-slate-600 text-xs mb-6">Feature flags that control behaviour across the public site. Changes take effect immediately.</p>

        <div className="space-y-3">
          {(
            [
              {
                key: 'showLocations' as const,
                label: 'Show Locations page',
                description: 'Shows the dive-site map in the navigation and at /locations.',
              },
              {
                key: 'showCaptions' as const,
                label: 'Show captions',
                description: 'Displays AI-generated captions in gallery cards, the photo modal, and the photo page.',
              },
              {
                key: 'autoGenerateCaptions' as const,
                label: 'Auto-generate captions on upload',
                description: 'Automatically generates an AI caption for each photo when it is uploaded.',
              },
              {
                key: 'requirePassword' as const,
                label: 'Require site password',
                description: 'When OFF, the site is publicly accessible without a password. Visitors skip the password page entirely.',
                dangerOff: true,
              },
              {
                key: 'maintenanceMode' as const,
                label: 'Maintenance mode',
                description: 'Replaces the public site with a "coming soon" screen. Admin access is unaffected.',
                danger: true,
              },
            ] as Array<{ key: keyof SiteSettings; label: string; description: string; danger?: boolean; dangerOff?: boolean }>
          ).map(({ key, label, description, danger, dangerOff }) => {
            const on = settings[key]
            const saving = settingsSaving === key
            // danger = amber when ON (e.g. maintenance mode)
            // dangerOff = amber when OFF (e.g. require password)
            const isWarning = (danger && on) || (dangerOff && !on)
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-4 bg-slate-900 border rounded-xl px-5 py-4 transition-colors ${
                  isWarning ? 'border-amber-500/40' : 'border-slate-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isWarning ? 'text-amber-400' : 'text-slate-200'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => toggleSetting(key)}
                  disabled={saving}
                  title={on ? 'Turn off' : 'Turn on'}
                  className={`relative shrink-0 inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    on
                      ? danger ? 'bg-amber-500' : 'bg-sky-500'
                      : dangerOff ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
                  {saving && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    </span>
                  )}
                </button>

                {/* Status label */}
                <span className={`text-xs font-medium w-6 shrink-0 ${on ? (danger ? 'text-amber-400' : 'text-sky-400') : (dangerOff ? 'text-amber-400' : 'text-slate-600')}`}>
                  {on ? 'ON' : 'OFF'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Error detail modal ───────────────────────────────────────────── */}
      {errorModal && (
        <div
          className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setErrorModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <p className="text-red-400 text-sm font-medium">{errorModal.msg}</p>
              <button
                onClick={() => setErrorModal(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Stack trace */}
            <pre className="px-6 py-5 text-[11px] leading-relaxed text-slate-300 font-mono overflow-auto max-h-[60vh] whitespace-pre-wrap break-all">
              {errorModal.detail}
            </pre>
          </div>
        </div>
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {editingPhoto && editState && (
        <div
          className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={cancelEdit}
        >
          {/* Prev arrow (outside modal, on the left) */}
          {(() => { const idx = visiblePhotos.findIndex(p => p._id === editingPhoto._id); return idx > 0 ? (
            <button
              onClick={e => { e.stopPropagation(); startEdit(visiblePhotos[idx - 1]) }}
              className="absolute left-4 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-slate-300 hover:text-white rounded-full p-2.5 transition-colors z-[9999]"
              title="Previous photo (←)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          ) : null })()}

          {/* Next arrow (outside modal, on the right) */}
          {(() => { const idx = visiblePhotos.findIndex(p => p._id === editingPhoto._id); return idx < visiblePhotos.length - 1 ? (
            <button
              onClick={e => { e.stopPropagation(); startEdit(visiblePhotos[idx + 1]) }}
              className="absolute right-4 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-slate-300 hover:text-white rounded-full p-2.5 transition-colors z-[9999]"
              title="Next photo (→)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : null })()}

          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Photo + close button */}
            <div className="relative bg-slate-950">
              <Image
                key={editingPhoto._id}
                src={`${editingPhoto.src}?w=1400&q=75&fm=jpg&auto=format`}
                alt={editingPhoto.title}
                width={editingPhoto.width}
                height={editingPhoto.height}
                className={`w-full h-auto max-h-[60vh] object-contain block transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                unoptimized
                onLoad={() => setImageLoading(false)}
              />
              {/* Spinner shown while image loads */}
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center min-h-[200px]">
                  <span className="w-8 h-8 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
                </div>
              )}
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
            <div className={`px-6 pt-4 pb-3 border-b border-slate-800 transition-opacity duration-150 ${imageLoading ? 'opacity-40' : 'opacity-100'}`}>
              <p className="text-slate-200 text-sm font-medium truncate">{editingPhoto.title}</p>
            </div>

            {/* Form */}
            <div className={`px-6 py-4 space-y-3 transition-opacity duration-150 ${imageLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
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
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Lens</label>
                  <input value={editState.lens} onChange={e => setEditState({ ...editState, lens: e.target.value })} placeholder="e.g. Sigma 15mm f/2.8 Fisheye" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Focal length</label>
                  <input value={editState.focalLength} onChange={e => setEditState({ ...editState, focalLength: e.target.value })} placeholder="e.g. 15mm" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">ISO</label>
                  <input value={editState.iso} onChange={e => setEditState({ ...editState, iso: e.target.value })} placeholder="e.g. 800" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Shutter speed</label>
                  <input value={editState.shutterSpeed} onChange={e => setEditState({ ...editState, shutterSpeed: e.target.value })} placeholder="e.g. 1/250" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Aperture</label>
                  <input value={editState.aperture} onChange={e => setEditState({ ...editState, aperture: e.target.value })} placeholder="e.g. f/2.8" className={inputCls} />
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
            <div className="flex items-center justify-between gap-2 px-6 pb-5">
              {/* Left: reupload */}
              <button
                onClick={() => { setReuploadingId(editingPhoto._id); reuploadInputRef.current?.click() }}
                disabled={reuploadingId === editingPhoto._id}
                title="Replace image file"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-400 disabled:opacity-40 transition-colors px-2 py-2"
              >
                {reuploadingId === editingPhoto._id ? (
                  <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                )}
                {reuploadingId === editingPhoto._id ? 'Uploading…' : 'Replace image'}
              </button>

              {/* Right: cancel + save */}
              <div className="flex items-center gap-2">
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
        </div>
      )}
    </div>
  )
}
