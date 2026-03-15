'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Photo } from '@/types'

type Props = {
  photo: Photo
  prevId: string | null
  nextId: string | null
  children: React.ReactNode
}

export default function PhotoPageClient({ photo, prevId, nextId, children }: Props) {
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prevId) {
        router.push(`/photo/${prevId}`)
      } else if (e.key === 'ArrowRight' && nextId) {
        router.push(`/photo/${nextId}`)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prevId, nextId, router])

  return <>{children}</>
}
