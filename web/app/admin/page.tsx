'use client'

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
// Features:
//   • Stats overview (total photos, missing captions, unique tags)
//   • Per-photo inline editing (title, tags, location, camera, dateTaken)
//   • Per-photo caption regeneration via Claude
//   • Bulk "generate all missing captions" action

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminPhoto = {
  _id: string
  title: string
  tags: string[]
  aiCaption: string
  location: string | null
  camera: string | null
  dateTaken: string | null
  src: string
  width: number
  height: number
  imageRef: string
}

type EditState = {
  title: string
  tags: string        // comma-separated string for the input
  location: string
  camera: string
  dateTaken: string
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [photos, setPhotos]             = useState<AdminPhoto[]>([])
  const [loading, setLoading]           = useState(true)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editState, setEditState]       = useState<EditState | null>(null)
  const [saving, setSaving]             = useState(false)
  const [captionIds, setCaptionIds]     = useState<Set<string>>(new Set()) // IDs currently regenerating
  const [bulkRunning, setBulkRunning]   = useState(false)
  const [bulkDone, setBulkDone]         = useState<number | null>(null)
  const [feedback, setFeedback]         = useState<{ id: string; msg: string } | null>(null)

  // ── Fetch photos ────────────────────────────────────────────────────────────
  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/photos-list')
    const data = await res.json()
    setPhotos(data.photos ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalPhotos   = photos.length
  const missingCap    = photos.filter(p => !p.aiCaption).length
  const uniqueTags    = new Set(photos.flatMap(p => p.tags)).size
  const hasCaptions   = totalPhotos - missingCap

  // ── Edit helpers ─────────────────────────────────────────────────────────────
  function startEdit(photo: AdminPhoto) {
    setEditingId(photo._id)
    setEditState({
      title:     photo.title,
      tags:      photo.tags.join(', '),
      location:  photo.location  ?? '',
      camera:    photo.camera    ?? '',
      dateTaken: photo.dateTaken ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState(null)
  }

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
          location:  editState.location.trim()  || null,
          camera:    editState.camera.trim()    || null,
          dateTaken: editState.dateTaken.trim() || null,
        },
      }),
    })

    if (res.ok) {
      // Optimistically update local state
      setPhotos(prev => prev.map(p =>
        p._id !== photo._id ? p : {
          ...p,
          title:     editState.title.trim(),
          tags:      editState.tags.split(',').map(t => t.trim()).filter(Boolean),
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

  // ── Caption helpers ──────────────────────────────────────────────────────────
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

  async function generateAllMissing() {
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
      setBulkDone(data.results?.filter((r: { ok: boolean }) => r.ok).length ?? 0)
      fetchPhotos() // refresh to show new captions
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────────
  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

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
        <button
          onClick={logout}
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard label="Total photos"   value={totalPhotos} />
          <StatCard label="With captions"  value={hasCaptions} sub={`${missingCap} missing`} />
          <StatCard label="Unique tags"    value={uniqueTags} />
          <StatCard label="Coverage"       value={totalPhotos ? `${Math.round(hasCaptions / totalPhotos * 100)}%` : '—'} sub="captioned" />
        </div>
      )}

      {/* Caption bulk action */}
      <div className="flex items-center gap-4 mb-8">
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

      {/* Photo list */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading photos…</div>
      ) : (
        <div className="space-y-3">
          {photos.map(photo => (
            <div
              key={photo._id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
            >
              <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-20 h-20 relative rounded-lg overflow-hidden bg-slate-800">
                  <Image
                    src={`${photo.src}?w=160&q=60`}
                    alt={photo.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>

                {/* Content */}
                {editingId === photo._id && editState ? (
                  /* ── Edit mode ── */
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Title</label>
                        <input
                          value={editState.title}
                          onChange={e => setEditState({ ...editState, title: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Tags (comma-separated)</label>
                        <input
                          value={editState.tags}
                          onChange={e => setEditState({ ...editState, tags: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Location</label>
                        <input
                          value={editState.location}
                          onChange={e => setEditState({ ...editState, location: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Camera</label>
                        <input
                          value={editState.camera}
                          onChange={e => setEditState({ ...editState, camera: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Date taken</label>
                        <input
                          type="date"
                          value={editState.dateTaken}
                          onChange={e => setEditState({ ...editState, dateTaken: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(photo)}
                        disabled={saving}
                        className="text-xs bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-medium rounded-lg px-3 py-1.5 transition-colors"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-slate-200 text-sm font-medium truncate">{photo.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">
                          {photo.aiCaption || <span className="text-slate-600 italic">No caption</span>}
                        </p>
                        {photo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {photo.tags.map(tag => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500/80">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Regenerate caption */}
                        <button
                          onClick={() => regenerateCaption(photo)}
                          disabled={captionIds.has(photo._id)}
                          title="Regenerate caption"
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
                        {/* Edit */}
                        <button
                          onClick={() => startEdit(photo)}
                          title="Edit metadata"
                          className="text-slate-500 hover:text-sky-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Inline feedback toast */}
                    {feedback?.id === photo._id && (
                      <p className="text-xs text-sky-400 mt-1">{feedback.msg}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
