'use client'

// ─── SearchBar ────────────────────────────────────────────────────────────────
// A controlled input that calls onSearch whenever the user types.
// We debounce the callback so Fuse doesn't re-run on every single keystroke.

import { useCallback, useRef } from 'react'

type Props = {
  onSearch: (query: string) => void
  resultCount: number
  totalCount: number
}

export default function SearchBar({ onSearch, resultCount, totalCount }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce: wait 150ms after the user stops typing before running search
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onSearch(value), 150)
    },
    [onSearch]
  )

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Input */}
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>

        <input
          type="text"
          onChange={handleChange}
          placeholder="Search by keyword, species, location, technique…"
          className="
            w-full py-3 pl-12 pr-4 rounded-lg
            bg-slate-900 border border-slate-800
            text-slate-100 placeholder-slate-500
            focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25
            transition-colors text-base
          "
        />
      </div>

      {/* Result count */}
      <p className="text-center text-sm text-slate-500 mt-2">
        {resultCount} of {totalCount} photos
      </p>
    </div>
  )
}
