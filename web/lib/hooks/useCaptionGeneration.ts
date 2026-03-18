'use client'

import { useState, useCallback } from 'react'
import { type AdminPhoto } from '@/types'
import {
  regenerateCaption as apiRegenerateCaption,
  bulkRegenerateCaptions,
} from '@/lib/adminApi'

export function useCaptionGeneration() {
  const [captionIds, setCaptionIds]     = useState<Set<string>>(new Set())
  const [bulkRunning, setBulkRunning]   = useState(false)
  const [bulkDone, setBulkDone]         = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [errorModal, setErrorModal]     = useState<string | null>(null)

  const regenerateCaption = useCallback(async (
    id: string,
    imageRef: string,
    onSuccess: (caption: string) => void,
  ): Promise<void> => {
    setCaptionIds(prev => new Set(prev).add(id))
    try {
      const caption = await apiRegenerateCaption(id, imageRef)
      onSuccess(caption)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Caption generation failed'
      setErrorModal(msg)
    } finally {
      setCaptionIds(prev => {
        const s = new Set(prev)
        s.delete(id)
        return s
      })
    }
  }, [])

  const bulkRegenerate = useCallback(async (
    photos: AdminPhoto[],
    onUpdate: (id: string, caption: string) => void,
  ): Promise<void> => {
    setBulkRunning(true)
    setBulkDone(false)
    setUploadProgress(`0/${photos.length}`)

    try {
      const payload = photos.map(p => ({ _id: p._id, imageRef: p.imageRef }))
      const results = await bulkRegenerateCaptions(payload)

      let done = 0
      for (const result of results) {
        done++
        setUploadProgress(`${done}/${photos.length}`)
        if (result.ok && result.caption) {
          onUpdate(result.id, result.caption)
        }
      }

      setBulkDone(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bulk caption generation failed'
      setErrorModal(msg)
    } finally {
      setBulkRunning(false)
      setUploadProgress(null)
    }
  }, [])

  const dismissError = useCallback(() => {
    setErrorModal(null)
  }, [])

  return {
    captionIds,
    bulkRunning,
    bulkDone,
    uploadProgress,
    errorModal,
    regenerateCaption,
    bulkRegenerate,
    dismissError,
  }
}
