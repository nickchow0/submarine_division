'use client'

// ─── TagFilter ────────────────────────────────────────────────────────────────
// Renders a row of clickable tag pills. Clicking a tag filters the gallery
// to photos with that tag. Clicking the active tag deselects it.

type Props = {
  tags: string[]
  activeTag: string | null
  onTagClick: (tag: string) => void
}

export default function TagFilter({ tags, activeTag, onTagClick }: Props) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto px-4">
      {tags.map((tag) => {
        const isActive = tag === activeTag
        return (
          <button
            key={tag}
            onClick={() => onTagClick(tag)}
            className={`
              px-4 py-1.5 rounded-full text-sm border transition-all
              ${isActive
                ? 'bg-sky-500 border-sky-500 text-white'
                : 'bg-transparent border-ocean-700 text-slate-400 hover:border-sky-500 hover:text-sky-400'
              }
            `}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}
