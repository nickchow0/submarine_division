'use client'

// Reads the font chosen in the admin Font Preview section from sessionStorage
// and applies it to document.body on every page load. This lets the user
// navigate the site and see how a candidate font looks without committing it.

import { useEffect } from 'react'

export const FONT_SESSION_KEY = 'preview_font_stack'

export default function FontSessionApplier() {
  useEffect(() => {
    const stack = sessionStorage.getItem(FONT_SESSION_KEY)
    if (stack) document.body.style.fontFamily = stack
  }, [])

  return null
}
