'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  uploadProgress: { done: number; total: number } | null
  reuploadingId: string | null
  onUpload: (files: FileList) => void
  onReupload: (id: string, file: File) => void
  onReuploadCancel: () => void
}

export type UploadZoneHandle = {
  openReuploadPicker: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

const UploadZone = forwardRef<UploadZoneHandle, Props>(function UploadZone(
  { uploadProgress, reuploadingId, onUpload, onReupload, onReuploadCancel },
  ref,
) {
  const uploadInputRef   = useRef<HTMLInputElement>(null)
  const reuploadInputRef = useRef<HTMLInputElement>(null)

  // Expose openReuploadPicker so AdminDashboard can trigger the picker
  // after setting reuploadingId in the hook.
  useImperativeHandle(ref, () => ({
    openReuploadPicker: () => reuploadInputRef.current?.click(),
  }))

  // Attach cancel listener — resets reuploadingId when OS file picker is dismissed
  useEffect(() => {
    const input = reuploadInputRef.current
    if (!input) return
    const handleCancel = () => onReuploadCancel()
    input.addEventListener('cancel', handleCancel)
    return () => input.removeEventListener('cancel', handleCancel)
  }, [onReuploadCancel])

  return (
    <>
      {/* Hidden file input — bulk upload */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={e => { if (e.target.files?.length) onUpload(e.target.files) }}
      />

      {/* Hidden file input — per-photo reupload */}
      <input
        ref={reuploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file && reuploadingId) onReupload(reuploadingId, file)
          // Reset so the same file can be re-selected
          if (reuploadInputRef.current) reuploadInputRef.current.value = ''
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
    </>
  )
})

export default UploadZone
