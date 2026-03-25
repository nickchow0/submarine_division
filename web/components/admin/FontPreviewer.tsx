'use client'

import { useEffect, useRef, useState } from 'react'
import { FONT_SESSION_KEY } from '@/components/FontSessionApplier'
import { FONTS, type FontOption } from '@/lib/fonts'

export default function FontPreviewer() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<FontOption | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null)
  const loadedRef = useRef<Set<string>>(new Set())

  // On mount: restore any session selection
  useEffect(() => {
    const saved = sessionStorage.getItem(FONT_SESSION_KEY)
    if (saved) {
      const font = FONTS.find(f => f.stack === saved) ?? null
      setSelected(font)
    }
  }, [])

  // Inject all Google Fonts <link> tags when expanded
  useEffect(() => {
    if (!open) return
    FONTS.forEach(({ googleFamily }) => {
      if (loadedRef.current.has(googleFamily)) return
      loadedRef.current.add(googleFamily)
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${googleFamily}&display=swap`
      document.head.appendChild(link)
    })
  }, [open])

  function handleSelect(font: FontOption | null) {
    setSelected(font)
    if (font) {
      sessionStorage.setItem(FONT_SESSION_KEY, font.stack)
      document.body.style.fontFamily = font.stack
    } else {
      sessionStorage.removeItem(FONT_SESSION_KEY)
      document.body.style.fontFamily = ''
    }
  }

  async function handleApply() {
    setApplying(true)
    setApplyFeedback(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyFont: selected?.family ?? null }),
      })
      if (!res.ok) throw new Error('Failed')
      setApplyFeedback(selected ? `${selected.family} applied` : 'Reset to default')
    } catch {
      setApplyFeedback('Error saving')
    } finally {
      setApplying(false)
      setTimeout(() => setApplyFeedback(null), 3000)
    }
  }

  return (
    <div className="mt-10 border-t border-slate-800 pt-10">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full group mb-1"
      >
        <h3 className="section-label">Font Preview</h3>
        <svg
          className={`w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <>
          <p className="section-description mb-4">Select a font to preview it live across the page.</p>

          {/* Dropdown + actions */}
          <div className="flex items-center gap-3 mb-6">
            <select
              value={selected?.name ?? ''}
              onChange={e => handleSelect(FONTS.find(f => f.name === e.target.value) ?? null)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
            >
              <option value="">— current font —</option>
              {FONTS.map(f => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>

            <button
              onClick={handleApply}
              disabled={applying}
              className="text-sm bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-medium rounded-lg px-3 py-2 transition-colors"
            >
              {applying ? 'Saving…' : 'Apply to site'}
            </button>

            {selected && (
              <button
                onClick={() => handleSelect(null)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Reset
              </button>
            )}

            {applyFeedback && (
              <span className="text-xs text-sky-400 ml-auto">{applyFeedback}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FONTS.map(font => (
              <FontCard key={font.name} font={font} isSelected={selected?.name === font.name} onSelect={handleSelect} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FontCard({ font, isSelected, onSelect }: { font: FontOption; isSelected: boolean; onSelect: (f: FontOption) => void }) {
  return (
    <button
      onClick={() => onSelect(font)}
      className={`w-full text-left bg-slate-900 border rounded-xl px-6 py-5 transition-colors group ${isSelected ? 'border-sky-500' : 'border-slate-800 hover:border-slate-600'}`}
    >
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <span className="text-slate-500 text-xs font-sans">{font.name}</span>
      </div>
      <p className="font-title text-sky-400 text-2xl font-normal leading-snug">
        SubmarineDivision
      </p>
      <p
        className="text-slate-300 text-sm leading-relaxed mt-2"
        style={{ fontFamily: font.stack }}
      >
        Underwater photography from dive sites around the world — from the coral reefs of the Indo-Pacific to the kelp forests of the Pacific Coast.
      </p>
      <p
        className="text-slate-500 text-xs leading-relaxed mt-1"
        style={{ fontFamily: font.stack }}
      >
        A juvenile clownfish sheltering in a sea anemone, Komodo, Indonesia.
      </p>
    </button>
  )
}
