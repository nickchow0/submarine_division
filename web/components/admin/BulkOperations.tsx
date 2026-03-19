'use client'

import { useState } from 'react'
import { type AdminPhoto } from '@/types'

export interface BulkOperationsProps {
  selectedIds: Set<string>
  photos: AdminPhoto[]
  bulkRunning: boolean
  bulkDone: boolean
  uploadProgress: string | null
  onBulkTags: (tags: string[]) => void
  onBulkCaptions: () => void
  onClearSelection: () => void
  onSyncAll: () => void
  syncAllRunning: boolean
  syncAllProgress: { current: number; total: number } | null
}

export default function BulkOperations({
  selectedIds,
  photos,
  bulkRunning,
  bulkDone,
  uploadProgress,
  onBulkTags,
  onBulkCaptions,
  onClearSelection,
  onSyncAll,
  syncAllRunning,
  syncAllProgress,
}: BulkOperationsProps) {
  const [bulkTagInput, setBulkTagInput] = useState('')

  const handleBulkAddTags = () => {
    const newTags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean)
    if (newTags.length) {
      onBulkTags(newTags)
      setBulkTagInput('')
    }
  }

  const unsyncedCount = photos.filter(p => !p.shopifyProductId).length
  if (selectedIds.size === 0 && unsyncedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 bg-slate-900 border border-sky-500/30 rounded-xl px-4 py-3">
      {unsyncedCount > 0 && (
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onSyncAll}
            disabled={syncAllRunning}
            className="text-sm bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-400 border border-emerald-500/30 rounded-lg px-4 py-1.5 transition-colors shrink-0 flex items-center gap-2"
          >
            {syncAllRunning ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                {syncAllProgress ? `Syncing ${syncAllProgress.current} / ${syncAllProgress.total}…` : 'Starting…'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Sync all unsynced ({unsyncedCount})
              </>
            )}
          </button>
        </div>
      )}
      {selectedIds.size > 0 && (
        <>
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
            disabled={bulkRunning || !bulkTagInput.trim()}
            className="text-sm bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-medium rounded-lg px-4 py-1.5 transition-colors shrink-0"
          >
            Add tags
          </button>
          <button
            onClick={onBulkCaptions}
            disabled={bulkRunning}
            className="text-sm bg-sky-500/10 hover:bg-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-sky-400 border border-sky-500/30 rounded-lg px-4 py-1.5 transition-colors shrink-0 flex items-center gap-2"
          >
            {bulkRunning ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                Regenerating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Regenerate captions
              </>
            )}
          </button>
          {bulkDone !== null && (
            <span className="text-sm text-sky-400">✓ {bulkDone} captions generated</span>
          )}
          <button
            onClick={onClearSelection}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors shrink-0"
          >
            Clear selection
          </button>
        </>
      )}
    </div>
  )
}
