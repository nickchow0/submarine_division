'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

export default function Analytics() {
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    trackEvent('page_view', { page_path: pathname })
  }, [pathname])

  return null
}
