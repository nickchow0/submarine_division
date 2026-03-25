'use client'

import { useEffect, useRef, useState } from 'react'

const FONTS = [
  // ── Sans-serif ──────────────────────────────────────────────────────────────
  {
    name: 'Inter (current)',
    family: 'Inter',
    googleFamily: 'Inter:wght@300;400;500',
    stack: '"Inter", system-ui, sans-serif',
    serif: false,
  },
  {
    name: 'Raleway',
    family: 'Raleway',
    googleFamily: 'Raleway:ital,wght@0,300;0,400;0,500;1,300',
    stack: '"Raleway", sans-serif',
    serif: false,
  },
  {
    name: 'Josefin Sans',
    family: 'Josefin Sans',
    googleFamily: 'Josefin+Sans:ital,wght@0,300;0,400;1,300',
    stack: '"Josefin Sans", sans-serif',
    serif: false,
  },
  {
    name: 'Jost',
    family: 'Jost',
    googleFamily: 'Jost:ital,wght@0,300;0,400;0,500;1,300',
    stack: '"Jost", sans-serif',
    serif: false,
  },
  {
    name: 'Outfit',
    family: 'Outfit',
    googleFamily: 'Outfit:wght@300;400;500',
    stack: '"Outfit", sans-serif',
    serif: false,
  },
  {
    name: 'Work Sans',
    family: 'Work Sans',
    googleFamily: 'Work+Sans:ital,wght@0,300;0,400;0,500;1,300',
    stack: '"Work Sans", sans-serif',
    serif: false,
  },
  {
    name: 'Nunito',
    family: 'Nunito',
    googleFamily: 'Nunito:ital,wght@0,300;0,400;0,500;1,300',
    stack: '"Nunito", sans-serif',
    serif: false,
  },
  // ── Serif ───────────────────────────────────────────────────────────────────
  {
    name: 'EB Garamond',
    family: 'EB Garamond',
    googleFamily: 'EB+Garamond:ital,wght@0,400;0,500;1,400',
    stack: '"EB Garamond", Garamond, serif',
    serif: true,
  },
  {
    name: 'Cormorant Garamond',
    family: 'Cormorant Garamond',
    googleFamily: 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400',
    stack: '"Cormorant Garamond", serif',
    serif: true,
  },
  {
    name: 'Playfair Display',
    family: 'Playfair Display',
    googleFamily: 'Playfair+Display:ital,wght@0,400;0,500;1,400',
    stack: '"Playfair Display", serif',
    serif: true,
  },
  {
    name: 'Lora',
    family: 'Lora',
    googleFamily: 'Lora:ital,wght@0,400;0,500;1,400',
    stack: '"Lora", serif',
    serif: true,
  },
  {
    name: 'Libre Baskerville',
    family: 'Libre Baskerville',
    googleFamily: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',
    stack: '"Libre Baskerville", serif',
    serif: true,
  },
  {
    name: 'Source Serif 4',
    family: 'Source Serif 4',
    googleFamily: 'Source+Serif+4:ital,wght@0,300;0,400;0,600;1,400',
    stack: '"Source Serif 4", serif',
    serif: true,
  },
  {
    name: 'DM Serif Display',
    family: 'DM Serif Display',
    googleFamily: 'DM+Serif+Display:ital@0;1',
    stack: '"DM Serif Display", serif',
    serif: true,
  },
  {
    name: 'Spectral',
    family: 'Spectral',
    googleFamily: 'Spectral:ital,wght@0,300;0,400;0,600;1,400',
    stack: '"Spectral", serif',
    serif: true,
  },
  {
    name: 'Crimson Text',
    family: 'Crimson Text',
    googleFamily: 'Crimson+Text:ital,wght@0,400;0,600;1,400',
    stack: '"Crimson Text", serif',
    serif: true,
  },
  {
    name: 'Merriweather',
    family: 'Merriweather',
    googleFamily: 'Merriweather:ital,wght@0,300;0,400;1,300',
    stack: '"Merriweather", serif',
    serif: true,
  },
  {
    name: 'Vollkorn',
    family: 'Vollkorn',
    googleFamily: 'Vollkorn:ital,wght@0,400;0,500;1,400',
    stack: '"Vollkorn", serif',
    serif: true,
  },
  {
    name: 'Cardo',
    family: 'Cardo',
    googleFamily: 'Cardo:ital,wght@0,400;0,700;1,400',
    stack: '"Cardo", serif',
    serif: true,
  },
  {
    name: 'Cinzel',
    family: 'Cinzel',
    googleFamily: 'Cinzel:wght@400;500;600',
    stack: '"Cinzel", serif',
    serif: true,
  },
  {
    name: 'Gilda Display',
    family: 'Gilda Display',
    googleFamily: 'Gilda+Display',
    stack: '"Gilda Display", serif',
    serif: true,
  },
  {
    name: 'Frank Ruhl Libre',
    family: 'Frank Ruhl Libre',
    googleFamily: 'Frank+Ruhl+Libre:wght@300;400;500',
    stack: '"Frank Ruhl Libre", serif',
    serif: true,
  },
  {
    name: 'Bitter',
    family: 'Bitter',
    googleFamily: 'Bitter:ital,wght@0,300;0,400;0,500;1,400',
    stack: '"Bitter", serif',
    serif: true,
  },
  {
    name: 'PT Serif',
    family: 'PT Serif',
    googleFamily: 'PT+Serif:ital,wght@0,400;0,700;1,400',
    stack: '"PT Serif", serif',
    serif: true,
  },
  {
    name: 'Josefin Slab',
    family: 'Josefin Slab',
    googleFamily: 'Josefin+Slab:ital,wght@0,300;0,400;1,300',
    stack: '"Josefin Slab", serif',
    serif: true,
  },
  {
    name: 'Zilla Slab',
    family: 'Zilla Slab',
    googleFamily: 'Zilla+Slab:ital,wght@0,300;0,400;0,500;1,400',
    stack: '"Zilla Slab", serif',
    serif: true,
  },
]

export default function FontPreviewer() {
  const [open, setOpen] = useState(false)
  const loadedRef = useRef<Set<string>>(new Set())

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
          <p className="section-description mb-8">All fonts rendered side-by-side. Click a card to copy the CSS font-family value.</p>
          <div className="grid grid-cols-2 gap-3">
            {FONTS.map(font => (
              <FontCard key={font.name} font={font} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FontCard({ font }: { font: typeof FONTS[number] }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(font.stack)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="w-full text-left bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl px-6 py-5 transition-colors group"
    >
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <span className="text-slate-500 text-xs font-sans">{font.name}</span>
        <span className="text-xs font-sans text-slate-700 group-hover:text-slate-500 transition-colors shrink-0">
          {copied ? <span className="text-sky-400">copied</span> : 'click to copy'}
        </span>
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
